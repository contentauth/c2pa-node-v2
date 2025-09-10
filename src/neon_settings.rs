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

use crate::error::as_js_error;
use crate::settings::{SettingsApi, get_settings_value, set_settings_value};
use neon::prelude::*;
use serde_json::Value;

/// Neon bindings for the Settings API
pub struct NeonSettings;

impl NeonSettings {
    /// Load settings from a TOML string
    pub fn from_toml(mut cx: FunctionContext) -> JsResult<JsPromise> {
        let toml_str = cx.argument::<JsString>(0)?.value(&mut cx);
        
        let promise = cx
            .task(move || {
                SettingsApi::from_toml(&toml_str)
            })
            .promise(move |mut cx, result: Result<(), crate::error::Error>| match result {
                Ok(()) => Ok(cx.undefined().upcast::<JsValue>()),
                Err(err) => as_js_error(&mut cx, err).and_then(|err| cx.throw(err)),
            });
        
        Ok(promise)
    }

    /// Load settings from a file
    pub fn from_file(mut cx: FunctionContext) -> JsResult<JsPromise> {
        let file_path = cx.argument::<JsString>(0)?.value(&mut cx);
        
        let promise = cx
            .task(move || {
                SettingsApi::from_file(&file_path)
            })
            .promise(move |mut cx, result: Result<(), crate::error::Error>| match result {
                Ok(()) => Ok(cx.undefined().upcast::<JsValue>()),
                Err(err) => as_js_error(&mut cx, err).and_then(|err| cx.throw(err)),
            });
        
        Ok(promise)
    }

    /// Load settings from a URL
    pub fn from_url(mut cx: FunctionContext) -> JsResult<JsPromise> {
        let url_str = cx.argument::<JsString>(0)?.value(&mut cx);
        
        let promise = cx
            .task(move || {
                SettingsApi::from_url(&url_str)
            })
            .promise(move |mut cx, result: Result<(), crate::error::Error>| match result {
                Ok(()) => Ok(cx.undefined().upcast::<JsValue>()),
                Err(err) => as_js_error(&mut cx, err).and_then(|err| cx.throw(err)),
            });
        
        Ok(promise)
    }

    /// Set a setting value
    pub fn set_value(mut cx: FunctionContext) -> JsResult<JsPromise> {
        let key = cx.argument::<JsString>(0)?.value(&mut cx);
        let value = cx.argument::<JsValue>(1)?;
        
        // Convert JS value to JSON value
        let json_value: Value = match neon_serde4::from_value(&mut cx, value) {
            Ok(v) => v,
            Err(e) => return cx.throw_error(format!("Failed to convert value: {}", e)),
        };
        
        let promise = cx
            .task(move || {
                match json_value {
                    Value::String(s) => set_settings_value(&key, s),
                    Value::Bool(b) => set_settings_value(&key, b),
                    Value::Number(n) => {
                        if let Some(i) = n.as_i64() {
                            set_settings_value(&key, i)
                        } else if let Some(f) = n.as_f64() {
                            set_settings_value(&key, f)
                        } else {
                            Err(crate::error::Error::Signing("Unsupported number type".to_string()))
                        }
                    }
                    Value::Null => set_settings_value(&key, Option::<String>::None),
                    _ => Err(crate::error::Error::Signing("Unsupported value type".to_string())),
                }
            })
            .promise(move |mut cx, result: Result<(), crate::error::Error>| match result {
                Ok(()) => Ok(cx.undefined().upcast::<JsValue>()),
                Err(err) => as_js_error(&mut cx, err).and_then(|err| cx.throw(err)),
            });
        
        Ok(promise)
    }

    /// Get a setting value
    pub fn get_value(mut cx: FunctionContext) -> JsResult<JsValue> {
        let key = cx.argument::<JsString>(0)?.value(&mut cx);
        
        // Try to get as string first, then bool, then number
        if let Ok(Some(value)) = get_settings_value::<String>(&key) {
            return Ok(cx.string(value).upcast());
        }
        
        if let Ok(Some(value)) = get_settings_value::<bool>(&key) {
            return Ok(cx.boolean(value).upcast());
        }
        
        if let Ok(Some(value)) = get_settings_value::<i64>(&key) {
            return Ok(cx.number(value as f64).upcast());
        }
        
        if let Ok(Some(value)) = get_settings_value::<f64>(&key) {
            return Ok(cx.number(value).upcast());
        }
        
        // Return undefined if not found
        Ok(cx.undefined().upcast())
    }

    /// Get all settings as JSON
    pub fn to_json(mut cx: FunctionContext) -> JsResult<JsPromise> {
        let promise = cx
            .task(move || {
                SettingsApi::to_json()
            })
            .promise(move |mut cx, result: Result<String, crate::error::Error>| match result {
                Ok(json) => Ok(cx.string(json).upcast::<JsValue>()),
                Err(err) => as_js_error(&mut cx, err).and_then(|err| cx.throw(err)),
            });
        
        Ok(promise)
    }

    /// Clear all settings
    pub fn clear(mut cx: FunctionContext) -> JsResult<JsPromise> {
        let promise = cx
            .task(move || {
                SettingsApi::clear()
            })
            .promise(move |mut cx, result: Result<(), crate::error::Error>| match result {
                Ok(()) => Ok(cx.undefined().upcast::<JsValue>()),
                Err(err) => as_js_error(&mut cx, err).and_then(|err| cx.throw(err)),
            });
        
        Ok(promise)
    }

    /// Convenience method to set trust anchors
    pub fn set_trust_anchors(mut cx: FunctionContext) -> JsResult<JsPromise> {
        let anchors = cx.argument::<JsString>(0)?.value(&mut cx);
        
        let promise = cx
            .task(move || {
                set_settings_value("trust.trust_anchors", anchors)
            })
            .promise(move |mut cx, result: Result<(), crate::error::Error>| match result {
                Ok(()) => Ok(cx.undefined().upcast::<JsValue>()),
                Err(err) => as_js_error(&mut cx, err).and_then(|err| cx.throw(err)),
            });
        
        Ok(promise)
    }

    /// Convenience method to set user anchors
    pub fn set_user_anchors(mut cx: FunctionContext) -> JsResult<JsPromise> {
        let anchors = cx.argument::<JsString>(0)?.value(&mut cx);
        
        let promise = cx
            .task(move || {
                set_settings_value("trust.user_anchors", anchors)
            })
            .promise(move |mut cx, result: Result<(), crate::error::Error>| match result {
                Ok(()) => Ok(cx.undefined().upcast::<JsValue>()),
                Err(err) => as_js_error(&mut cx, err).and_then(|err| cx.throw(err)),
            });
        
        Ok(promise)
    }

    /// Convenience method to set certificate list
    pub fn set_certificate_list(mut cx: FunctionContext) -> JsResult<JsPromise> {
        let certificate_list = cx.argument::<JsString>(0)?.value(&mut cx);
        
        let promise = cx
            .task(move || {
                set_settings_value("trust.certificate_list", certificate_list)
            })
            .promise(move |mut cx, result: Result<(), crate::error::Error>| match result {
                Ok(()) => Ok(cx.undefined().upcast::<JsValue>()),
                Err(err) => as_js_error(&mut cx, err).and_then(|err| cx.throw(err)),
            });
        
        Ok(promise)
    }

    /// Convenience method to set trust config
    pub fn set_trust_config(mut cx: FunctionContext) -> JsResult<JsPromise> {
        let config = cx.argument::<JsString>(0)?.value(&mut cx);
        
        let promise = cx
            .task(move || {
                set_settings_value("trust.trust_config", config)
            })
            .promise(move |mut cx, result: Result<(), crate::error::Error>| match result {
                Ok(()) => Ok(cx.undefined().upcast::<JsValue>()),
                Err(err) => as_js_error(&mut cx, err).and_then(|err| cx.throw(err)),
            });
        
        Ok(promise)
    }

    /// Convenience method to enable trust verification
    pub fn enable_trust_verification(mut cx: FunctionContext) -> JsResult<JsPromise> {
        let promise = cx
            .task(move || {
                set_settings_value("verify.verify_trust", true)
            })
            .promise(move |mut cx, result: Result<(), crate::error::Error>| match result {
                Ok(()) => Ok(cx.undefined().upcast::<JsValue>()),
                Err(err) => as_js_error(&mut cx, err).and_then(|err| cx.throw(err)),
            });
        
        Ok(promise)
    }

    /// Convenience method to disable trust verification
    pub fn disable_trust_verification(mut cx: FunctionContext) -> JsResult<JsPromise> {
        let promise = cx
            .task(move || {
                set_settings_value("verify.verify_trust", false)
            })
            .promise(move |mut cx, result: Result<(), crate::error::Error>| match result {
                Ok(()) => Ok(cx.undefined().upcast::<JsValue>()),
                Err(err) => as_js_error(&mut cx, err).and_then(|err| cx.throw(err)),
            });
        
        Ok(promise)
    }
}
