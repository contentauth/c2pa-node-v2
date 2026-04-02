// Copyright 2024 Adobe. All rights reserved.
// This file is licensed to you under the Apache License,
// Version 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
// or the MIT license (http://opensource.org/licenses/MIT),
// at your option.

// Unless required by applicable law or agreed to in writing,
// this software is distributed on an "AS IS" BASIS, WITHOUT
// WARRANTIES OR REPRESENTATIONS OF ANY KIND, either express or
// implied. See the LICENSE-MIT and LICENSE-APACHE files for the
// specific language governing permissions and limitations under
// each license.

/* eslint-disable @typescript-eslint/no-non-null-assertion */

import type { Manifest } from "@contentauth/c2pa-types";
import * as fs from "fs-extra";
import * as crypto from "crypto";
import { encode, Tag } from "cbor2";

import type {
  JsCallbackSignerConfig,
  DestinationBufferAsset,
  SigningAlg,
  SignerPayload,
} from "./types.d.ts";

class TestSigner {
  private privateKey: crypto.KeyObject;

  constructor(privateKey: Buffer) {
    this.privateKey = crypto.createPrivateKey({
      key: privateKey,
      format: "pem",
    });
  }

  sign = async (bytes: Buffer): Promise<Buffer> => {
    const sign = crypto.createSign("SHA256");
    sign.update(bytes);
    sign.end();
    return sign.sign(this.privateKey);
  };

  signP1363 = async (bytes: Buffer): Promise<Buffer> => {
    const sign = crypto.createSign("SHA256");
    sign.update(bytes);
    sign.end();
    return sign.sign({ key: this.privateKey, dsaEncoding: "ieee-p1363" });
  };
}

/**
 * COSE_Sign1 credential holder for cawg.x509.cose identity assertions.
 *
 * The sig_type "cawg.x509.cose" requires the credential holder callback to
 * return a complete COSE_Sign1 envelope (RFC 9052), not a raw signature.
 *
 * Protocol:
 * 1. CBOR-encode the SignerPayload → detached payload
 * 2. Build protected header { 1: alg_id } as CBOR bstr
 * 3. Build Sig_structure = ["Signature1", protected, external_aad, payload]
 * 4. Sign CBOR(Sig_structure) with IEEE P1363 format (COSE requirement)
 * 5. Return CBOR(Tag(18, [protected, {}, nil, signature]))
 *
 * IMPORTANT: Use Uint8Array (not Buffer) for byte strings passed to cbor2's
 * encode(). Buffer causes cbor2 to unwrap CBOR content instead of encoding
 * it as a bstr, which produces "got map, expected bstr" errors in the
 * COSE parser.
 */
class CoseCawgSigner {
  private static readonly ES256_ALG_ID = -7;

  constructor(private signer: TestSigner) {}

  sign = async (payload: SignerPayload): Promise<Buffer> => {
    // CBOR-encode the SignerPayload (detached content)
    const payloadCbor = new Uint8Array(encode(payload));

    // Protected header: { 1: -7 } (alg = ES256) — must be Uint8Array for bstr
    const protectedBytes = new Uint8Array(
      encode(new Map([[1, CoseCawgSigner.ES256_ALG_ID]])),
    );

    // Sig_structure per RFC 9052 §4.4
    const sigStructure = [
      "Signature1",
      protectedBytes,
      new Uint8Array(0), // external_aad
      payloadCbor,
    ];
    const sigStructureCbor = Buffer.from(encode(sigStructure));

    // Sign with IEEE P1363 format (required by COSE ES256)
    const rawSignature = new Uint8Array(
      await this.signer.signP1363(sigStructureCbor),
    );

    // COSE_Sign1 = Tag(18, [protected, unprotected, payload(nil), signature])
    const coseSign1 = new Tag(18, [
      protectedBytes,
      new Map(),
      null,
      rawSignature,
    ]);
    return Buffer.from(encode(coseSign1));
  };
}

describe("IdentityAssertionBuilder", () => {
  const manifestDefinition: Manifest = {
    vendor: "test",
    claim_generator_info: [
      {
        name: "c2pa_test",
        version: "2.0.0",
      },
    ],
    claim_generator: "c2pa_test",
    title: "Test_Manifest",
    format: "image/jpeg",
    instance_id: "1234",
    thumbnail: { format: "image/jpeg", identifier: "thumbnail.jpg" },
    resources: { resources: {} },
    ingredients: [
      {
        title: "Test",
        format: "image/jpeg",
        instance_id: "12345",
        relationship: "componentOf",
        thumbnail: { format: "image/jpeg", identifier: "ingredient-thumb.jpg" },
        resources: { resources: {} },
      },
    ],
    assertions: [
      {
        label: "c2pa.actions.v2",
        data: {
          actions: [
            {
              action: "c2pa.created",
              parameters: {
                digitalSourceType:
                  "http://cv.iptc.org/newscodes/digitalsourcetype/digitalCapture",
              },
            },
          ],
        } as any,
        kind: "Json",
      },
      {
        label: "cawg.training-mining",
        data: {
          metadata: {
            "cawg.ai_inference": {
              use: "notAllowed",
            },
            "cawg.ai_generative_training": {
              use: "notAllowed",
            },
          },
        },
      },
    ],
  };

  it("should build an Identity Assertion Signer", async () => {
    const { CallbackSigner } = await import("./Signer");
    const { Reader } = await import("./Reader");
    const { Builder } = await import("./Builder");
    const {
      IdentityAssertionBuilder,
      IdentityAssertionSigner,
      CallbackCredentialHolder,
    } = await import("./IdentityAssertion");
    // Read certificate files once
    const c2paPrivateKey = await fs.readFile(
      "./tests/fixtures/certs/es256.pem",
    );
    const c2paPublicKey = await fs.readFile("./tests/fixtures/certs/es256.pub");

    // Create signer configurations — use directCoseHandling: false with P1363
    // signatures for the manifest signer
    const c2paConfig: JsCallbackSignerConfig = {
      alg: "es256" as SigningAlg,
      certs: [c2paPublicKey],
      reserveSize: 10000,
      tsaUrl: undefined,
      tsaHeaders: undefined,
      tsaBody: undefined,
      directCoseHandling: false,
    };

    // Create signers
    const c2paTestSigner = new TestSigner(c2paPrivateKey);
    const c2paSigner = CallbackSigner.newSigner(
      c2paConfig,
      c2paTestSigner.signP1363,
    );

    // COSE_Sign1 credential holder — returns a proper COSE envelope
    const coseSigner = new CoseCawgSigner(c2paTestSigner);
    const cawgSigner = CallbackCredentialHolder.newCallbackCredentialHolder(
      10000,
      "cawg.x509.cose",
      coseSigner.sign,
    );

    const source = {
      buffer: await fs.readFile("./tests/fixtures/CA.jpg"),
      mimeType: "image/jpeg",
    };
    const dest: DestinationBufferAsset = {
      buffer: null,
    };

    // Create the manifest builder
    const builder = Builder.withJson(manifestDefinition);

    // Add the required resources
    await builder.addResource("thumbnail.jpg", {
      mimeType: "image/jpeg",
      buffer: await fs.readFile("./tests/fixtures/thumbnail.jpg"),
    });
    await builder.addResource("ingredient-thumb.jpg", {
      mimeType: "image/jpeg",
      buffer: await fs.readFile("./tests/fixtures/thumbnail.jpg"),
    });

    // Create and configure the identity assertion
    const iaSigner = IdentityAssertionSigner.new(c2paSigner.getHandle());
    const iab =
      await IdentityAssertionBuilder.identityBuilderForCredentialHolder(
        cawgSigner,
      );
    iab.addReferencedAssertions(["cawg.training-mining"]);
    iaSigner.addIdentityAssertion(iab);

    // Sign the manifest (standard async flow)
    await builder.signAsync(iaSigner, source, dest);

    // Verify the manifest
    const reader = await Reader.fromAsset({
      buffer: dest.buffer! as Buffer,
      mimeType: "image/jpeg",
    });

    // Verify cawg.identity assertion is present
    const active = reader!.getActive() as any;
    const assertions: string[] =
      active?.assertions?.map((a: any) => a.label) ?? [];
    expect(assertions).toContain("cawg.identity");

    // Verify no integrity errors (trust warnings from self-signed certs are OK)
    const store = reader!.json() as any;
    const validationStatus: Array<{ code: string }> =
      store?.validation_status ?? [];
    const integrityErrors = validationStatus.filter(
      (s) =>
        !s.code.startsWith("signingCredential.") &&
        !s.code.startsWith("trust.") &&
        !s.code.startsWith("certificate."),
    );
    expect(integrityErrors).toHaveLength(0);
  });
});
