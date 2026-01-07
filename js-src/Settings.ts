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

import * as fs from "fs-extra";
import fetch from "node-fetch";

import type {
  TrustConfig,
  VerifyConfig,
  C2paSettingsConfig,
} from "./types.d.ts";

/**
 * Create a settings object with trust configuration.
 * @param trustConfig The trust configuration
 * @returns Settings object that can be passed to Reader/Builder
 */
export function createTrustSettings(
  trustConfig: TrustConfig,
): C2paSettingsConfig {
  return {
    trust: {
      verify_trust_list: trustConfig.verifyTrustList,
      user_anchors: trustConfig.userAnchors,
      trust_anchors: trustConfig.trustAnchors,
      trust_config: trustConfig.trustConfig,
      allowed_list: trustConfig.allowedList,
    },
  };
}

/**
 * Create a settings object with CAWG trust configuration.
 * @param trustConfig The CAWG trust configuration
 * @returns Settings object that can be passed to Reader/Builder
 */
export function createCawgTrustSettings(
  trustConfig: TrustConfig,
): C2paSettingsConfig {
  return {
    cawg_trust: {
      verify_trust_list: trustConfig.verifyTrustList,
      user_anchors: trustConfig.userAnchors,
      trust_anchors: trustConfig.trustAnchors,
      trust_config: trustConfig.trustConfig,
      allowed_list: trustConfig.allowedList,
    },
  };
}

/**
 * Create a settings object with verify configuration.
 * @param verifyConfig The verify configuration
 * @returns Settings object that can be passed to Reader/Builder
 */
export function createVerifySettings(
  verifyConfig: VerifyConfig,
): C2paSettingsConfig {
  return {
    verify: {
      verify_after_reading: verifyConfig.verifyAfterReading,
      verify_after_sign: verifyConfig.verifyAfterSign,
      verify_trust: verifyConfig.verifyTrust,
      verify_timestamp_trust: verifyConfig.verifyTimestampTrust,
      ocsp_fetch: verifyConfig.ocspFetch,
      remote_manifest_fetch: verifyConfig.remoteManifestFetch,
      skip_ingredient_conflict_resolution:
        verifyConfig.skipIngredientConflictResolution,
      strict_v1_validation: verifyConfig.strictV1Validation,
    },
  };
}

/**
 * Merge multiple settings objects into one.
 * Later settings override earlier ones.
 * @param settings Settings objects to merge
 * @returns Merged settings object
 */
export function mergeSettings(
  ...settings: C2paSettingsConfig[]
): C2paSettingsConfig {
  const merged: C2paSettingsConfig = {};

  for (const setting of settings) {
    if (setting.trust) {
      merged.trust = { ...merged.trust, ...setting.trust };
    }
    if (setting.cawg_trust) {
      merged.cawg_trust = { ...merged.cawg_trust, ...setting.cawg_trust };
    }
    if (setting.verify) {
      merged.verify = { ...merged.verify, ...setting.verify };
    }
    if (setting.builder) {
      merged.builder = { ...merged.builder, ...setting.builder };
    }
  }

  return merged;
}

/**
 * Convert a settings object to a JSON string.
 * @param settings The settings object
 * @returns JSON string representation
 */
export function settingsToJson(settings: C2paSettingsConfig): string {
  return JSON.stringify(settings);
}

/**
 * Load settings from a TOML or JSON file.
 * @param filePath The path to the settings file
 * @returns Settings as a string (TOML or JSON depending on file extension)
 */
export async function loadSettingsFromFile(filePath: string): Promise<string> {
  const content = await fs.readFile(filePath, "utf8");
  return content;
}

/**
 * Load settings from a URL.
 * @param url The URL to fetch the settings from
 * @returns Settings as a string
 */
export async function loadSettingsFromUrl(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `Failed to fetch settings from URL: ${res.status} ${res.statusText}`,
    );
  }
  return await res.text();
}
