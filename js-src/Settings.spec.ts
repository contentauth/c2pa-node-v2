// Copyright 2025 Adobe. All rights reserved.
// This file is licensed to you under the Apache License,
// Version 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
// or the MIT license (http://opensource.org/licenses/MIT),
// at your option.

import {
  createTrustSettings,
  createCawgTrustSettings,
  createVerifySettings,
  mergeSettings,
  settingsToJson,
} from "./Settings.js";
import type { TrustConfig, VerifyConfig, C2paSettingsConfig } from "./types.d.ts";

describe("Settings", () => {
  it("creates trust settings", () => {
    const trustConfig: TrustConfig = {
      verifyTrustList: true,
      userAnchors: "test",
      allowedList: "allowed",
    };

    const settings = createTrustSettings(trustConfig);
    expect(settings.trust).toBeDefined();
    expect(settings.trust?.verify_trust_list).toBe(true);
    expect(settings.trust?.user_anchors).toBe("test");
    expect(settings.trust?.allowed_list).toBe("allowed");
  });

  it("creates CAWG trust settings", () => {
    const trustConfig: TrustConfig = {
      verifyTrustList: false,
      trustAnchors: "anchors",
    };

    const settings = createCawgTrustSettings(trustConfig);
    expect(settings.cawg_trust).toBeDefined();
    expect(settings.cawg_trust?.verify_trust_list).toBe(false);
    expect(settings.cawg_trust?.trust_anchors).toBe("anchors");
  });

  it("creates verify settings", () => {
    const verifyConfig: VerifyConfig = {
      verifyAfterReading: true,
      verifyAfterSign: false,
      verifyTrust: true,
      verifyTimestampTrust: false,
      ocspFetch: true,
      remoteManifestFetch: false,
      skipIngredientConflictResolution: true,
      strictV1Validation: false,
    };

    const settings = createVerifySettings(verifyConfig);
    expect(settings.verify).toBeDefined();
    expect(settings.verify?.verify_after_reading).toBe(true);
    expect(settings.verify?.verify_after_sign).toBe(false);
    expect(settings.verify?.verify_trust).toBe(true);
    expect(settings.verify?.ocsp_fetch).toBe(true);
  });

  it("merges multiple settings", () => {
    const trustSettings = createTrustSettings({
      verifyTrustList: true,
      userAnchors: "test",
    });

    const verifySettings = createVerifySettings({
      verifyAfterReading: false,
      verifyAfterSign: true,
      verifyTrust: true,
      verifyTimestampTrust: true,
      ocspFetch: false,
      remoteManifestFetch: true,
      skipIngredientConflictResolution: false,
      strictV1Validation: false,
    });

    const merged = mergeSettings(trustSettings, verifySettings);
    expect(merged.trust).toBeDefined();
    expect(merged.verify).toBeDefined();
    expect(merged.trust?.verify_trust_list).toBe(true);
    expect(merged.verify?.verify_after_reading).toBe(false);
  });

  it("converts settings to JSON", () => {
    const settings = createVerifySettings({
      verifyAfterReading: true,
      verifyAfterSign: true,
      verifyTrust: false,
      verifyTimestampTrust: true,
      ocspFetch: false,
      remoteManifestFetch: true,
      skipIngredientConflictResolution: false,
      strictV1Validation: false,
    });

    const json = settingsToJson(settings);
    expect(json).toContain("verify");
    expect(json).toContain("verify_after_reading");

    // Should be parseable
    const parsed = JSON.parse(json);
    expect(parsed.verify.verify_after_reading).toBe(true);
  });

  it("merges settings with later values overriding earlier ones", () => {
    const settings1 = createVerifySettings({
      verifyAfterReading: true,
      verifyAfterSign: true,
      verifyTrust: false,
      verifyTimestampTrust: true,
      ocspFetch: false,
      remoteManifestFetch: true,
      skipIngredientConflictResolution: false,
      strictV1Validation: false,
    });

    const settings2: C2paSettingsConfig = {
      verify: {
        verify_trust: true, // Override this value
        ocsp_fetch: true, // Override this value
      },
    };

    const merged = mergeSettings(settings1, settings2);
    expect(merged.verify?.verify_after_reading).toBe(true); // from settings1
    expect(merged.verify?.verify_trust).toBe(true); // overridden by settings2
    expect(merged.verify?.ocsp_fetch).toBe(true); // overridden by settings2
  });
});
