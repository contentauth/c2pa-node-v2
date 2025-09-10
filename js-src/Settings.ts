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

import * as neon from "./index.node";
import { SettingsInterface } from "./types";

/**
 * Settings API for configuring C2PA behavior
 */
export class Settings implements SettingsInterface {
  /**
   * Load settings from a TOML string
   * @param tomlStr TOML configuration string
   */
  async fromToml(tomlStr: string): Promise<void> {
    return neon.settingsFromToml(tomlStr);
  }

  /**
   * Load settings from a file
   * @param filePath Path to the settings file
   */
  async fromFile(filePath: string): Promise<void> {
    return neon.settingsFromFile(filePath);
  }

  /**
   * Load settings from a URL
   * @param url URL to fetch settings from
   */
  async fromUrl(url: string): Promise<void> {
    return neon.settingsFromUrl(url);
  }

  /**
   * Set a specific setting value
   * @param key Setting key (e.g., "trust.trust_anchors")
   * @param value Setting value
   */
  async setValue(key: string, value: string | boolean | number | null): Promise<void> {
    return neon.settingsSetValue(key, value);
  }

  /**
   * Get a specific setting value
   * @param key Setting key
   * @returns Setting value or undefined if not found
   */
  getValue(key: string): string | boolean | number | undefined {
    return neon.settingsGetValue(key);
  }

  /**
   * Get all settings as a JSON string
   */
  async toJson(): Promise<string> {
    return neon.settingsToJson();
  }

  /**
   * Clear all settings
   */
  async clear(): Promise<void> {
    return neon.settingsClear();
  }

  /**
   * Set trust anchors
   * @param anchors Trust anchors in PEM format
   */
  async setTrustAnchors(anchors: string): Promise<void> {
    return neon.settingsSetTrustAnchors(anchors);
  }

  /**
   * Set user trust anchors
   * @param anchors User trust anchors in PEM format
   */
  async setUserAnchors(anchors: string): Promise<void> {
    return neon.settingsSetUserAnchors(anchors);
  }

  /**
   * Set certificate list
   * @param certificateList Certificates in PEM format
   */
  async setCertificateList(certificateList: string): Promise<void> {
    return neon.settingsSetCertificateList(certificateList);
  }

  /**
   * Set trust configuration
   * @param config Trust configuration content
   */
  async setTrustConfig(config: string): Promise<void> {
    return neon.settingsSetTrustConfig(config);
  }

  /**
   * Enable trust verification
   */
  async enableTrustVerification(): Promise<void> {
    return neon.settingsEnableTrustVerification();
  }

  /**
   * Disable trust verification
   */
  async disableTrustVerification(): Promise<void> {
    return neon.settingsDisableTrustVerification();
  }
}
