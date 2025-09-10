// Copyright 2025 Adobe. All rights reserved.
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

import { Settings } from "./Settings";

describe("Settings", () => {
  let settings: Settings;

  beforeEach(() => {
    settings = new Settings();
  });

  afterEach(async () => {
    // Clear settings after each test
    await settings.clear();
  });

  describe("fromToml", () => {
    it("should load settings from TOML string", async () => {
      const tomlConfig = `
[trust]
user_anchors = "test_anchors"
verify_trust = true
`;

      await expect(settings.fromToml(tomlConfig)).resolves.not.toThrow();
    });

    it("should handle invalid TOML", async () => {
      const invalidToml = "invalid toml content";

      await expect(settings.fromToml(invalidToml)).rejects.toThrow();
    });
  });

  describe("setValue and getValue", () => {
    it("should set and get string values", async () => {
      await settings.setValue("test.key", "test_value");
      expect(settings.getValue("test.key")).toBe("test_value");
    });

    it("should set and get boolean values", async () => {
      await settings.setValue("test.boolean", true);
      expect(settings.getValue("test.boolean")).toBe(true);
    });

    it("should set and get number values", async () => {
      await settings.setValue("test.number", 42);
      expect(settings.getValue("test.number")).toBe(42);
    });

    it("should return undefined for non-existent keys", () => {
      expect(settings.getValue("non.existent")).toBeUndefined();
    });
  });

  describe("convenience methods", () => {
    it("should set trust anchors", async () => {
      const anchors = "-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----";
      await settings.setTrustAnchors(anchors);
      expect(settings.getValue("trust.trust_anchors")).toBe(anchors);
    });

    it("should set user anchors", async () => {
      const anchors = "-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----";
      await settings.setUserAnchors(anchors);
      expect(settings.getValue("trust.user_anchors")).toBe(anchors);
    });

    it("should set certificate list", async () => {
      const certificateList = "-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----";
      await settings.setCertificateList(certificateList);
      expect(settings.getValue("trust.certificate_list")).toBe(certificateList);
    });

    it("should set trust config", async () => {
      const config = "trust_config_content";
      await settings.setTrustConfig(config);
      expect(settings.getValue("trust.trust_config")).toBe(config);
    });

    it("should enable trust verification", async () => {
      await settings.enableTrustVerification();
      expect(settings.getValue("verify.verify_trust")).toBe(true);
    });

    it("should disable trust verification", async () => {
      await settings.disableTrustVerification();
      expect(settings.getValue("verify.verify_trust")).toBe(false);
    });
  });

  describe("toJson", () => {
    it("should return empty object when no settings", async () => {
      const json = await settings.toJson();
      expect(JSON.parse(json)).toEqual({});
    });

    it("should return settings as JSON", async () => {
      await settings.setValue("test.key", "test_value");
      const json = await settings.toJson();
      const parsed = JSON.parse(json);
      expect(parsed["test.key"]).toBe("test_value");
    });
  });

  describe("clear", () => {
    it("should clear all settings", async () => {
      await settings.setValue("test.key", "test_value");
      await settings.clear();
      
      const json = await settings.toJson();
      expect(JSON.parse(json)).toEqual({});
    });
  });

  describe("integration with Reader", () => {
    it("should configure trust settings for Reader", async () => {
      // Set up trust configuration
      await settings.setTrustAnchors("-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----");
      await settings.setCertificateList("-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----");
      await settings.enableTrustVerification();

      // Verify settings are set
      expect(settings.getValue("trust.trust_anchors")).toBeDefined();
      expect(settings.getValue("trust.certificate_list")).toBeDefined();
      expect(settings.getValue("verify.verify_trust")).toBe(true);
    });
  });
});
