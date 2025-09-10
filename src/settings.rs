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

// TODO: Remove this once Settings is a struct in c2pa-rs
use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::RwLock;
use std::fs;
use std::path::Path;
use url::Url;
use crate::error::Error;

/// Thread-local storage for settings
static SETTINGS: Lazy<RwLock<HashMap<String, serde_json::Value>>> = 
    Lazy::new(|| RwLock::new(HashMap::new()));

/// Settings configuration structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Settings {
    #[serde(rename = "trust")]
    pub trust: Option<TrustSettings>,
    #[serde(rename = "verify")]
    pub verify: Option<VerifySettings>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrustSettings {
    /// User-provided trust anchors (PEM format)
    #[serde(rename = "user_anchors")]
    pub user_anchors: Option<String>,
    /// System trust anchors (PEM format)
    #[serde(rename = "trust_anchors")]
    pub trust_anchors: Option<String>,
    /// Trust configuration file path or content
    #[serde(rename = "trust_config")]
    pub trust_config: Option<String>,
    /// Certificate list (PEM format)
    #[serde(rename = "certificate_list")]
    pub certificate_list: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VerifySettings {
    /// Verify manifests after reading
    #[serde(rename = "verify_after_reading")]
    pub verify_after_reading: Option<bool>,
    /// Verify trust lists
    #[serde(rename = "verify_trust")]
    pub verify_trust: Option<bool>,
    /// Check ingredient trust
    #[serde(rename = "check_ingredient_trust")]
    pub check_ingredient_trust: Option<bool>,
    /// Verify timestamp trust
    #[serde(rename = "verify_timestamp_trust")]
    pub verify_timestamp_trust: Option<bool>,
}

impl Default for TrustSettings {
    fn default() -> Self {
        Self {
            user_anchors: None,
            trust_anchors: None,
            trust_config: None,
            certificate_list: None,
        }
    }
}

impl Default for VerifySettings {
    fn default() -> Self {
        Self {
            verify_after_reading: Some(true),
            verify_trust: Some(false),
            check_ingredient_trust: Some(true),
            verify_timestamp_trust: Some(false),
        }
    }
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            trust: Some(TrustSettings::default()),
            verify: Some(VerifySettings::default()),
        }
    }
}

/// Settings API implementation
pub struct SettingsApi;

impl SettingsApi {
    /// Load settings from a TOML string
    pub fn from_toml(toml_str: &str) -> Result<(), Error> {
        let settings: Settings = toml::from_str(toml_str)
            .map_err(|e| Error::Signing(format!("Failed to parse TOML settings: {}", e)))?;
        
        Self::apply_settings(settings)?;
        Ok(())
    }

    /// Load settings from a file
    pub fn from_file<P: AsRef<Path>>(path: P) -> Result<(), Error> {
        let content = fs::read_to_string(path)
            .map_err(|e| Error::Signing(format!("Failed to read settings file: {}", e)))?;
        
        Self::from_toml(&content)
    }

    /// Load settings from a URL
    pub fn from_url(url_str: &str) -> Result<(), Error> {
        let url = Url::parse(url_str)
            .map_err(|e| Error::Signing(format!("Invalid URL: {}", e)))?;
        
        let response = reqwest::blocking::get(url)
            .map_err(|e| Error::Signing(format!("Failed to fetch settings from URL: {}", e)))?
            .text()
            .map_err(|e| Error::Signing(format!("Failed to read response: {}", e)))?;
        
        Self::from_toml(&response)
    }

    /// Set a specific setting value
    pub fn set_value<T: Serialize>(key: &str, value: T) -> Result<(), Error> {
        let json_value = serde_json::to_value(value)
            .map_err(|e| Error::Signing(format!("Failed to serialize value: {}", e)))?;
        
        let mut settings = SETTINGS.write()
            .map_err(|e| Error::Signing(format!("Failed to acquire write lock: {}", e)))?;
        
        settings.insert(key.to_string(), json_value);
        Ok(())
    }

    /// Get a specific setting value
    pub fn get_value<T: for<'de> Deserialize<'de>>(key: &str) -> Result<Option<T>, Error> {
        let settings = SETTINGS.read()
            .map_err(|e| Error::Signing(format!("Failed to acquire read lock: {}", e)))?;
        
        match settings.get(key) {
            Some(value) => {
                let deserialized = serde_json::from_value(value.clone())
                    .map_err(|e| Error::Signing(format!("Failed to deserialize value: {}", e)))?;
                Ok(Some(deserialized))
            }
            None => Ok(None),
        }
    }

    /// Get all settings as a JSON string
    pub fn to_json() -> Result<String, Error> {
        let settings = SETTINGS.read()
            .map_err(|e| Error::Signing(format!("Failed to acquire read lock: {}", e)))?;
        
        serde_json::to_string_pretty(&*settings)
            .map_err(|e| Error::Signing(format!("Failed to serialize settings: {}", e)))
    }

    /// Clear all settings
    pub fn clear() -> Result<(), Error> {
        let mut settings = SETTINGS.write()
            .map_err(|e| Error::Signing(format!("Failed to acquire write lock: {}", e)))?;
        
        settings.clear();
        Ok(())
    }

    /// Apply settings to the global settings store
    fn apply_settings(settings: Settings) -> Result<(), Error> {
        let mut global_settings = SETTINGS.write()
            .map_err(|e| Error::Signing(format!("Failed to acquire write lock: {}", e)))?;

        // Apply trust settings
        if let Some(trust) = settings.trust {
            if let Some(user_anchors) = trust.user_anchors {
                global_settings.insert("trust.user_anchors".to_string(), 
                    serde_json::Value::String(user_anchors));
            }
            if let Some(trust_anchors) = trust.trust_anchors {
                global_settings.insert("trust.trust_anchors".to_string(), 
                    serde_json::Value::String(trust_anchors));
            }
            if let Some(trust_config) = trust.trust_config {
                global_settings.insert("trust.trust_config".to_string(), 
                    serde_json::Value::String(trust_config));
            }
        if let Some(certificate_list) = trust.certificate_list {
            global_settings.insert("trust.certificate_list".to_string(), 
                serde_json::Value::String(certificate_list));
        }
        }

        // Apply verify settings
        if let Some(verify) = settings.verify {
            if let Some(verify_after_reading) = verify.verify_after_reading {
                global_settings.insert("verify.verify_after_reading".to_string(), 
                    serde_json::Value::Bool(verify_after_reading));
            }
            if let Some(verify_trust) = verify.verify_trust {
                global_settings.insert("verify.verify_trust".to_string(), 
                    serde_json::Value::Bool(verify_trust));
            }
            if let Some(check_ingredient_trust) = verify.check_ingredient_trust {
                global_settings.insert("verify.check_ingredient_trust".to_string(), 
                    serde_json::Value::Bool(check_ingredient_trust));
            }
            if let Some(verify_timestamp_trust) = verify.verify_timestamp_trust {
                global_settings.insert("verify.verify_timestamp_trust".to_string(), 
                    serde_json::Value::Bool(verify_timestamp_trust));
            }
        }

        Ok(())
    }
}

/// Convenience functions for accessing settings
pub fn get_settings_value<T: for<'de> Deserialize<'de>>(key: &str) -> Result<Option<T>, Error> {
    SettingsApi::get_value(key)
}

pub fn set_settings_value<T: Serialize>(key: &str, value: T) -> Result<(), Error> {
    SettingsApi::set_value(key, value)
}
