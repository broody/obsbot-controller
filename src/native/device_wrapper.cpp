#include "device_wrapper.hpp"
#include <sstream>

Napi::FunctionReference DeviceWrapper::constructor;

Napi::Object DeviceWrapper::Init(Napi::Env env, Napi::Object exports) {
    Napi::Function func = DefineClass(env, "DeviceWrapper", {
        // Device info
        InstanceMethod("getDeviceName", &DeviceWrapper::GetDeviceName),
        InstanceMethod("getSerialNumber", &DeviceWrapper::GetSerialNumber),
        InstanceMethod("getProductType", &DeviceWrapper::GetProductType),
        InstanceMethod("getVideoDevicePath", &DeviceWrapper::GetVideoDevicePath),
        InstanceMethod("getDeviceInfo", &DeviceWrapper::GetDeviceInfo),

        // Gimbal control
        InstanceMethod("setGimbalSpeed", &DeviceWrapper::SetGimbalSpeed),
        InstanceMethod("setGimbalAngle", &DeviceWrapper::SetGimbalAngle),
        InstanceMethod("stopGimbal", &DeviceWrapper::StopGimbal),
        InstanceMethod("resetGimbalPosition", &DeviceWrapper::ResetGimbalPosition),
        InstanceMethod("getGimbalState", &DeviceWrapper::GetGimbalState),

        // Presets
        InstanceMethod("addPreset", &DeviceWrapper::AddPreset),
        InstanceMethod("deletePreset", &DeviceWrapper::DeletePreset),
        InstanceMethod("triggerPreset", &DeviceWrapper::TriggerPreset),
        InstanceMethod("getPresetList", &DeviceWrapper::GetPresetList),
        InstanceMethod("setBootPosition", &DeviceWrapper::SetBootPosition),
        InstanceMethod("triggerBootPosition", &DeviceWrapper::TriggerBootPosition),

        // Zoom
        InstanceMethod("setZoom", &DeviceWrapper::SetZoom),
        InstanceMethod("getZoom", &DeviceWrapper::GetZoom),
        InstanceMethod("getZoomRange", &DeviceWrapper::GetZoomRange),

        // Focus
        InstanceMethod("setFocus", &DeviceWrapper::SetFocus),
        InstanceMethod("getFocus", &DeviceWrapper::GetFocus),
        InstanceMethod("setFaceFocus", &DeviceWrapper::SetFaceFocus),
        InstanceMethod("getFocusRange", &DeviceWrapper::GetFocusRange),
        InstanceMethod("setAutoFocusMode", &DeviceWrapper::SetAutoFocusMode),
        InstanceMethod("getAutoFocusMode", &DeviceWrapper::GetAutoFocusMode),

        // Exposure
        InstanceMethod("setExposureMode", &DeviceWrapper::SetExposureMode),
        InstanceMethod("getExposureMode", &DeviceWrapper::GetExposureMode),
        InstanceMethod("setExposure", &DeviceWrapper::SetExposure),
        InstanceMethod("getExposure", &DeviceWrapper::GetExposure),
        InstanceMethod("setAELock", &DeviceWrapper::SetAELock),

        // White balance
        InstanceMethod("setWhiteBalance", &DeviceWrapper::SetWhiteBalance),
        InstanceMethod("getWhiteBalance", &DeviceWrapper::GetWhiteBalance),
        InstanceMethod("getWhiteBalanceRange", &DeviceWrapper::GetWhiteBalanceRange),

        // Image settings
        InstanceMethod("setBrightness", &DeviceWrapper::SetBrightness),
        InstanceMethod("getBrightness", &DeviceWrapper::GetBrightness),
        InstanceMethod("setContrast", &DeviceWrapper::SetContrast),
        InstanceMethod("getContrast", &DeviceWrapper::GetContrast),
        InstanceMethod("setSaturation", &DeviceWrapper::SetSaturation),
        InstanceMethod("getSaturation", &DeviceWrapper::GetSaturation),
        InstanceMethod("setSharpness", &DeviceWrapper::SetSharpness),
        InstanceMethod("getSharpness", &DeviceWrapper::GetSharpness),
        InstanceMethod("setHue", &DeviceWrapper::SetHue),
        InstanceMethod("getHue", &DeviceWrapper::GetHue),

        // HDR
        InstanceMethod("setHDR", &DeviceWrapper::SetHDR),
        InstanceMethod("getHDR", &DeviceWrapper::GetHDR),

        // FOV
        InstanceMethod("setFOV", &DeviceWrapper::SetFOV),

        // Mirror/Flip
        InstanceMethod("setMirrorFlip", &DeviceWrapper::SetMirrorFlip),
        InstanceMethod("getMirrorFlip", &DeviceWrapper::GetMirrorFlip),

        // AI
        InstanceMethod("setAIEnabled", &DeviceWrapper::SetAIEnabled),
        InstanceMethod("setAIMode", &DeviceWrapper::SetAIMode),
        InstanceMethod("setTrackingSpeed", &DeviceWrapper::SetTrackingSpeed),
        InstanceMethod("setAutoZoom", &DeviceWrapper::SetAutoZoom),
        InstanceMethod("setGestureControl", &DeviceWrapper::SetGestureControl),
        InstanceMethod("selectCentralTarget", &DeviceWrapper::SelectCentralTarget),
        InstanceMethod("selectBiggestTarget", &DeviceWrapper::SelectBiggestTarget),
        InstanceMethod("deselectTarget", &DeviceWrapper::DeselectTarget),

        // Device status
        InstanceMethod("setDeviceRunStatus", &DeviceWrapper::SetDeviceRunStatus),
        InstanceMethod("setSleepTimeout", &DeviceWrapper::SetSleepTimeout),

        // Anti-flicker
        InstanceMethod("setAntiFlicker", &DeviceWrapper::SetAntiFlicker),

        // Camera status
        InstanceMethod("getCameraStatus", &DeviceWrapper::GetCameraStatus),
    });

    constructor = Napi::Persistent(func);
    constructor.SuppressDestruct();

    exports.Set("DeviceWrapper", func);
    return exports;
}

DeviceWrapper::DeviceWrapper(const Napi::CallbackInfo& info)
    : Napi::ObjectWrap<DeviceWrapper>(info) {
}

void DeviceWrapper::SetDevice(std::shared_ptr<Device> device) {
    device_ = device;
}

Napi::Object DeviceWrapper::NewInstance(Napi::Env env, std::shared_ptr<Device> device) {
    Napi::Object obj = constructor.New({});
    DeviceWrapper* wrapper = Napi::ObjectWrap<DeviceWrapper>::Unwrap(obj);
    wrapper->SetDevice(device);
    return obj;
}

// Device info implementations
Napi::Value DeviceWrapper::GetDeviceName(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!device_) return env.Null();
    return Napi::String::New(env, device_->devName());
}

Napi::Value DeviceWrapper::GetSerialNumber(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!device_) return env.Null();
    return Napi::String::New(env, device_->devSn());
}

Napi::Value DeviceWrapper::GetProductType(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!device_) return env.Null();
    return Napi::Number::New(env, static_cast<int>(device_->productType()));
}

Napi::Value DeviceWrapper::GetVideoDevicePath(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!device_) return env.Null();
    return Napi::String::New(env, device_->videoDevPath());
}

Napi::Value DeviceWrapper::GetDeviceInfo(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!device_) return env.Null();

    Napi::Object obj = Napi::Object::New(env);
    obj.Set("name", device_->devName());
    obj.Set("serialNumber", device_->devSn());
    obj.Set("productType", static_cast<int>(device_->productType()));
    obj.Set("videoDevicePath", device_->videoDevPath());
    obj.Set("audioDevicePath", device_->audioDevPath());
    obj.Set("version", device_->devVersion());
    obj.Set("modelCode", device_->devModelCode());

    return obj;
}

// Gimbal control
Napi::Value DeviceWrapper::SetGimbalSpeed(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!device_ || info.Length() < 3) return Napi::Number::New(env, -1);

    double pitch = info[0].As<Napi::Number>().DoubleValue();
    double pan = info[1].As<Napi::Number>().DoubleValue();
    double roll = info[2].As<Napi::Number>().DoubleValue();

    int32_t result = device_->aiSetGimbalSpeedCtrlR(pitch, pan, roll);
    return Napi::Number::New(env, result);
}

Napi::Value DeviceWrapper::SetGimbalAngle(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!device_ || info.Length() < 3) return Napi::Number::New(env, -1);

    float pitch = info[0].As<Napi::Number>().FloatValue();
    float yaw = info[1].As<Napi::Number>().FloatValue();
    float roll = info[2].As<Napi::Number>().FloatValue();

    int32_t result = device_->aiSetGimbalMotorAngleR(pitch, yaw, roll);
    return Napi::Number::New(env, result);
}

Napi::Value DeviceWrapper::StopGimbal(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!device_) return Napi::Number::New(env, -1);
    return Napi::Number::New(env, device_->aiSetGimbalStop());
}

Napi::Value DeviceWrapper::ResetGimbalPosition(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!device_) return Napi::Number::New(env, -1);
    return Napi::Number::New(env, device_->gimbalRstPosR());
}

Napi::Value DeviceWrapper::GetGimbalState(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!device_) return env.Null();

    Device::AiGimbalStateInfo gimbalInfo;
    int32_t result = device_->aiGetGimbalStateR(&gimbalInfo);

    if (result != 0) return env.Null();

    Napi::Object obj = Napi::Object::New(env);
    obj.Set("pitch", gimbalInfo.pitch_euler);
    obj.Set("yaw", gimbalInfo.yaw_euler);
    obj.Set("roll", gimbalInfo.roll_euler);
    obj.Set("motorPitch", gimbalInfo.pitch_motor);
    obj.Set("motorYaw", gimbalInfo.yaw_motor);
    obj.Set("motorRoll", gimbalInfo.roll_motor);

    return obj;
}

// Preset positions
Napi::Value DeviceWrapper::AddPreset(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!device_) return Napi::Number::New(env, -1);

    Device::PresetPosInfo presetInfo;
    int32_t result = device_->aiAddGimbalPresetR(&presetInfo);

    if (result == 0) {
        return Napi::Number::New(env, presetInfo.id);
    }
    return Napi::Number::New(env, result);
}

Napi::Value DeviceWrapper::DeletePreset(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!device_ || info.Length() < 1) return Napi::Number::New(env, -1);

    int32_t id = info[0].As<Napi::Number>().Int32Value();
    return Napi::Number::New(env, device_->aiDelGimbalPresetR(id));
}

Napi::Value DeviceWrapper::TriggerPreset(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!device_ || info.Length() < 1) return Napi::Number::New(env, -1);

    int32_t id = info[0].As<Napi::Number>().Int32Value();
    return Napi::Number::New(env, device_->aiTrgGimbalPresetR(id));
}

Napi::Value DeviceWrapper::GetPresetList(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!device_) return env.Null();

    Device::DevDataArray ids;
    int32_t result = device_->aiGetGimbalPresetListR(&ids);

    if (result != 0) return env.Null();

    Napi::Array arr = Napi::Array::New(env, ids.len);
    for (int32_t i = 0; i < ids.len; i++) {
        Napi::Object preset = Napi::Object::New(env);
        preset.Set("id", ids.data_int32[i]);

        Device::PresetPosInfo presetInfo;
        if (device_->aiGetGimbalPresetInfoWithIdR(&presetInfo, ids.data_int32[i]) == 0) {
            preset.Set("pitch", presetInfo.pitch);
            preset.Set("yaw", presetInfo.yaw);
            preset.Set("roll", presetInfo.roll);
            preset.Set("zoom", presetInfo.zoom);
            preset.Set("name", std::string(presetInfo.name));
        }
        arr[i] = preset;
    }

    return arr;
}

Napi::Value DeviceWrapper::SetBootPosition(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!device_) return Napi::Number::New(env, -1);

    Device::PresetPosInfo presetInfo = {};
    // Get current position as boot position
    Device::AiGimbalStateInfo gimbalInfo;
    if (device_->aiGetGimbalStateR(&gimbalInfo) == 0) {
        presetInfo.pitch = gimbalInfo.pitch_motor;
        presetInfo.yaw = gimbalInfo.yaw_motor;
        presetInfo.roll = gimbalInfo.roll_motor;
    }

    float zoom;
    if (device_->cameraGetZoomAbsoluteR(zoom) == 0) {
        presetInfo.zoom = zoom;
    }

    return Napi::Number::New(env, device_->aiSetGimbalBootPosR(presetInfo));
}

Napi::Value DeviceWrapper::TriggerBootPosition(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!device_) return Napi::Number::New(env, -1);
    return Napi::Number::New(env, device_->aiTrgGimbalBootPosR(false));
}

// Zoom control
Napi::Value DeviceWrapper::SetZoom(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!device_ || info.Length() < 1) return Napi::Number::New(env, -1);

    float zoom = info[0].As<Napi::Number>().FloatValue();
    return Napi::Number::New(env, device_->cameraSetZoomAbsoluteR(zoom));
}

Napi::Value DeviceWrapper::GetZoom(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!device_) return env.Null();

    float zoom;
    if (device_->cameraGetZoomAbsoluteR(zoom) == 0) {
        return Napi::Number::New(env, zoom);
    }
    return env.Null();
}

Napi::Value DeviceWrapper::GetZoomRange(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!device_) return env.Null();

    Device::UvcParamRange range;
    if (device_->cameraGetRangeZoomAbsoluteR(range) == 0) {
        Napi::Object obj = Napi::Object::New(env);
        obj.Set("min", range.min_);
        obj.Set("max", range.max_);
        obj.Set("step", range.step_);
        obj.Set("default", range.default_);
        return obj;
    }
    return env.Null();
}

// Focus control
Napi::Value DeviceWrapper::SetFocus(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!device_ || info.Length() < 1) return Napi::Number::New(env, -1);

    int32_t focus = info[0].As<Napi::Number>().Int32Value();
    return Napi::Number::New(env, device_->cameraSetFocusAbsolute(focus, false));
}

Napi::Value DeviceWrapper::GetFocus(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!device_) return env.Null();

    int32_t focus;
    bool autoFocus;
    if (device_->cameraGetFocusAbsolute(focus, autoFocus) == 0) {
        return Napi::Number::New(env, focus);
    }
    return env.Null();
}

Napi::Value DeviceWrapper::SetFaceFocus(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!device_ || info.Length() < 1) return Napi::Number::New(env, -1);

    bool enable = info[0].As<Napi::Boolean>().Value();
    return Napi::Number::New(env, device_->cameraSetFaceFocusR(enable));
}

Napi::Value DeviceWrapper::GetFocusRange(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!device_) return env.Null();

    Device::UvcParamRange range;
    if (device_->cameraGetRangeFocusAbsolute(range) == 0) {
        Napi::Object obj = Napi::Object::New(env);
        obj.Set("min", range.min_);
        obj.Set("max", range.max_);
        obj.Set("step", range.step_);
        obj.Set("default", range.default_);
        return obj;
    }
    return env.Null();
}

Napi::Value DeviceWrapper::SetAutoFocusMode(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!device_ || info.Length() < 1) return Napi::Number::New(env, -1);

    int32_t mode = info[0].As<Napi::Number>().Int32Value();
    return Napi::Number::New(env, device_->cameraSetAutoFocusModeR(
        static_cast<Device::DevAutoFocusType>(mode)));
}

Napi::Value DeviceWrapper::GetAutoFocusMode(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!device_) return env.Null();

    Device::DevAutoFocusType focusType;
    if (device_->cameraGetAutoFocusModeR(focusType) == 0) {
        return Napi::Number::New(env, static_cast<int>(focusType));
    }
    return env.Null();
}

// Exposure control
Napi::Value DeviceWrapper::SetExposureMode(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!device_ || info.Length() < 1) return Napi::Number::New(env, -1);

    int32_t mode = info[0].As<Napi::Number>().Int32Value();
    return Napi::Number::New(env, device_->cameraSetExposureModeR(mode));
}

Napi::Value DeviceWrapper::GetExposureMode(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!device_) return env.Null();

    int32_t mode;
    if (device_->cameraGetExposureModeR(mode) == 0) {
        return Napi::Number::New(env, mode);
    }
    return env.Null();
}

Napi::Value DeviceWrapper::SetExposure(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!device_ || info.Length() < 1) return Napi::Number::New(env, -1);

    int32_t exposure = info[0].As<Napi::Number>().Int32Value();
    // Set exposure with auto_enabled=false for manual control
    return Napi::Number::New(env, device_->cameraSetExposureAbsolute(exposure, false));
}

Napi::Value DeviceWrapper::GetExposure(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!device_) return env.Null();

    int32_t exposure;
    bool autoEnabled;
    if (device_->cameraGetExposureAbsolute(exposure, autoEnabled) == 0) {
        return Napi::Number::New(env, exposure);
    }
    return env.Null();
}

Napi::Value DeviceWrapper::SetAELock(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!device_ || info.Length() < 1) return Napi::Number::New(env, -1);

    bool enable = info[0].As<Napi::Boolean>().Value();
    return Napi::Number::New(env, device_->cameraSetAELockR(enable));
}

// White balance
Napi::Value DeviceWrapper::SetWhiteBalance(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!device_ || info.Length() < 2) return Napi::Number::New(env, -1);

    int32_t type = info[0].As<Napi::Number>().Int32Value();
    int32_t param = info[1].As<Napi::Number>().Int32Value();
    return Napi::Number::New(env, device_->cameraSetWhiteBalanceR(
        static_cast<Device::DevWhiteBalanceType>(type), param));
}

Napi::Value DeviceWrapper::GetWhiteBalance(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!device_) return env.Null();

    Device::DevWhiteBalanceType wbType;
    int32_t param;
    if (device_->cameraGetWhiteBalanceR(wbType, param) == 0) {
        Napi::Object obj = Napi::Object::New(env);
        obj.Set("type", static_cast<int32_t>(wbType));
        obj.Set("value", param);
        return obj;
    }
    return env.Null();
}

Napi::Value DeviceWrapper::GetWhiteBalanceRange(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!device_) return env.Null();

    Device::UvcParamRange range;
    if (device_->cameraGetRangeWhiteBalanceR(range) == 0) {
        Napi::Object obj = Napi::Object::New(env);
        obj.Set("min", range.min_);
        obj.Set("max", range.max_);
        obj.Set("step", range.step_);
        obj.Set("default", range.default_);
        return obj;
    }
    return env.Null();
}

// Image settings
Napi::Value DeviceWrapper::SetBrightness(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!device_ || info.Length() < 1) return Napi::Number::New(env, -1);

    int32_t value = info[0].As<Napi::Number>().Int32Value();
    return Napi::Number::New(env, device_->cameraSetImageBrightnessR(value));
}

Napi::Value DeviceWrapper::GetBrightness(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!device_) return env.Null();

    int32_t value;
    if (device_->cameraGetImageBrightnessR(value) == 0) {
        return Napi::Number::New(env, value);
    }
    return env.Null();
}

Napi::Value DeviceWrapper::SetContrast(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!device_ || info.Length() < 1) return Napi::Number::New(env, -1);

    int32_t value = info[0].As<Napi::Number>().Int32Value();
    return Napi::Number::New(env, device_->cameraSetImageContrastR(value));
}

Napi::Value DeviceWrapper::GetContrast(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!device_) return env.Null();

    int32_t value;
    if (device_->cameraGetImageContrastR(value) == 0) {
        return Napi::Number::New(env, value);
    }
    return env.Null();
}

Napi::Value DeviceWrapper::SetSaturation(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!device_ || info.Length() < 1) return Napi::Number::New(env, -1);

    int32_t value = info[0].As<Napi::Number>().Int32Value();
    return Napi::Number::New(env, device_->cameraSetImageSaturationR(value));
}

Napi::Value DeviceWrapper::GetSaturation(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!device_) return env.Null();

    int32_t value;
    if (device_->cameraGetImageSaturationR(value) == 0) {
        return Napi::Number::New(env, value);
    }
    return env.Null();
}

Napi::Value DeviceWrapper::SetSharpness(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!device_ || info.Length() < 1) return Napi::Number::New(env, -1);

    int32_t value = info[0].As<Napi::Number>().Int32Value();
    return Napi::Number::New(env, device_->cameraSetImageSharpR(value));
}

Napi::Value DeviceWrapper::GetSharpness(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!device_) return env.Null();

    int32_t value;
    if (device_->cameraGetImageSharpR(value) == 0) {
        return Napi::Number::New(env, value);
    }
    return env.Null();
}

Napi::Value DeviceWrapper::SetHue(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!device_ || info.Length() < 1) return Napi::Number::New(env, -1);

    int32_t value = info[0].As<Napi::Number>().Int32Value();
    return Napi::Number::New(env, device_->cameraSetImageHueR(value));
}

Napi::Value DeviceWrapper::GetHue(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!device_) return env.Null();

    int32_t value;
    if (device_->cameraGetImageHueR(value) == 0) {
        return Napi::Number::New(env, value);
    }
    return env.Null();
}

// HDR
Napi::Value DeviceWrapper::SetHDR(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!device_ || info.Length() < 1) return Napi::Number::New(env, -1);

    int32_t mode = info[0].As<Napi::Number>().Int32Value();
    return Napi::Number::New(env, device_->cameraSetWdrR(mode));
}

Napi::Value DeviceWrapper::GetHDR(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!device_) return env.Null();

    int32_t mode;
    if (device_->cameraGetWdrR(mode) == 0) {
        return Napi::Number::New(env, mode);
    }
    return env.Null();
}

// FOV
Napi::Value DeviceWrapper::SetFOV(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!device_ || info.Length() < 1) return Napi::Number::New(env, -1);

    int32_t fov = info[0].As<Napi::Number>().Int32Value();
    return Napi::Number::New(env, device_->cameraSetFovU(
        static_cast<Device::FovType>(fov)));
}

// Mirror/Flip
Napi::Value DeviceWrapper::SetMirrorFlip(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!device_ || info.Length() < 1) return Napi::Number::New(env, -1);

    int32_t mode = info[0].As<Napi::Number>().Int32Value();
    return Napi::Number::New(env, device_->cameraSetMirrorFlipR(mode));
}

Napi::Value DeviceWrapper::GetMirrorFlip(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!device_) return env.Null();

    int32_t mode;
    if (device_->cameraGetMirrorFlipR(mode) == 0) {
        return Napi::Number::New(env, mode);
    }
    return env.Null();
}

// AI tracking
Napi::Value DeviceWrapper::SetAIEnabled(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!device_ || info.Length() < 1) return Napi::Number::New(env, -1);

    bool enabled = info[0].As<Napi::Boolean>().Value();
    return Napi::Number::New(env, device_->aiSetEnabledR(enabled));
}

Napi::Value DeviceWrapper::SetAIMode(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!device_ || info.Length() < 2) return Napi::Number::New(env, -1);

    int32_t mode = info[0].As<Napi::Number>().Int32Value();
    int32_t subMode = info[1].As<Napi::Number>().Int32Value();
    return Napi::Number::New(env, device_->cameraSetAiModeU(
        static_cast<Device::AiWorkModeType>(mode), subMode));
}

Napi::Value DeviceWrapper::SetTrackingSpeed(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!device_ || info.Length() < 1) return Napi::Number::New(env, -1);

    int32_t speed = info[0].As<Napi::Number>().Int32Value();
    return Napi::Number::New(env, device_->aiSetTrackSpeedTypeR(
        static_cast<Device::AiTrackSpeedType>(speed)));
}

Napi::Value DeviceWrapper::SetAutoZoom(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!device_ || info.Length() < 1) return Napi::Number::New(env, -1);

    bool enabled = info[0].As<Napi::Boolean>().Value();
    return Napi::Number::New(env, device_->aiSetAiAutoZoomR(enabled));
}

Napi::Value DeviceWrapper::SetGestureControl(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!device_ || info.Length() < 2) return Napi::Number::New(env, -1);

    int32_t gesture = info[0].As<Napi::Number>().Int32Value();
    bool enabled = info[1].As<Napi::Boolean>().Value();
    return Napi::Number::New(env, device_->aiSetGestureCtrlIndividualR(gesture, enabled));
}

Napi::Value DeviceWrapper::SelectCentralTarget(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!device_) return Napi::Number::New(env, -1);
    return Napi::Number::New(env, device_->aiSetSelectCentralTarget());
}

Napi::Value DeviceWrapper::SelectBiggestTarget(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!device_) return Napi::Number::New(env, -1);
    return Napi::Number::New(env, device_->aiSetSelectBiggestTarget());
}

Napi::Value DeviceWrapper::DeselectTarget(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!device_) return Napi::Number::New(env, -1);
    return Napi::Number::New(env, device_->aiDelSelectedTargetR());
}

// Device status
Napi::Value DeviceWrapper::SetDeviceRunStatus(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!device_ || info.Length() < 1) return Napi::Number::New(env, -1);

    int32_t status = info[0].As<Napi::Number>().Int32Value();
    return Napi::Number::New(env, device_->cameraSetDevRunStatusR(
        static_cast<Device::DevStatus>(status)));
}

Napi::Value DeviceWrapper::SetSleepTimeout(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!device_ || info.Length() < 1) return Napi::Number::New(env, -1);

    int32_t timeout = info[0].As<Napi::Number>().Int32Value();
    return Napi::Number::New(env, device_->cameraSetSuspendTimeU(timeout));
}

// Anti-flicker
Napi::Value DeviceWrapper::SetAntiFlicker(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!device_ || info.Length() < 1) return Napi::Number::New(env, -1);

    int32_t mode = info[0].As<Napi::Number>().Int32Value();
    return Napi::Number::New(env, device_->cameraSetAntiFlickR(mode));
}

// Camera status
Napi::Value DeviceWrapper::GetCameraStatus(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!device_) return env.Null();

    Napi::Object obj = Napi::Object::New(env);

    auto productType = device_->productType();
    obj.Set("productType", static_cast<int>(productType));

    // For tiny2 series devices, query fresh camera status
    if (productType == ObsbotProdTiny2 || productType == ObsbotProdTiny2Lite ||
        productType == ObsbotProdTinySE || productType == ObsbotProdTiny ||
        productType == ObsbotProdTiny4k) {

        Device::CameraStatus status;
        // Try to get fresh status from device
        int32_t result = device_->cameraGetCameraStatusU(status);
        if (result == 0) {
            obj.Set("aiMode", static_cast<int>(status.tiny.ai_mode));
            obj.Set("aiSubMode", static_cast<int>(status.tiny.ai_sub_mode));
            obj.Set("hdr", static_cast<int>(status.tiny.hdr));
            obj.Set("fov", static_cast<int>(status.tiny.fov));
            obj.Set("zoomRatio", static_cast<int>(status.tiny.zoom_ratio));
            obj.Set("antiFlicker", static_cast<int>(status.tiny.anti_flicker));
            obj.Set("faceAutoFocus", status.tiny.face_auto_focus != 0);
            obj.Set("autoFocus", status.tiny.auto_focus != 0);
            obj.Set("imageFlipHor", status.tiny.image_flip_hor != 0);
            obj.Set("aiTrackerSpeed", static_cast<int>(status.tiny.ai_tracker_speed));
        } else {
            // Fall back to cached status if query fails
            auto cachedStatus = device_->cameraStatus();
            obj.Set("aiMode", static_cast<int>(cachedStatus.tiny.ai_mode));
            obj.Set("aiSubMode", static_cast<int>(cachedStatus.tiny.ai_sub_mode));
            obj.Set("hdr", static_cast<int>(cachedStatus.tiny.hdr));
            obj.Set("fov", static_cast<int>(cachedStatus.tiny.fov));
            obj.Set("zoomRatio", static_cast<int>(cachedStatus.tiny.zoom_ratio));
            obj.Set("antiFlicker", static_cast<int>(cachedStatus.tiny.anti_flicker));
            obj.Set("faceAutoFocus", cachedStatus.tiny.face_auto_focus != 0);
            obj.Set("autoFocus", cachedStatus.tiny.auto_focus != 0);
            obj.Set("imageFlipHor", cachedStatus.tiny.image_flip_hor != 0);
            obj.Set("aiTrackerSpeed", static_cast<int>(cachedStatus.tiny.ai_tracker_speed));
        }
    }

    // Get AI status for gesture settings
    Device::AiStatus aiStatus;
    if (device_->aiGetAiStatusR(&aiStatus) == 0) {
        obj.Set("gestureTarget", aiStatus.gesture_target);
        obj.Set("gestureZoom", aiStatus.gesture_zoom);
        obj.Set("gestureDynamicZoom", aiStatus.gesture_dynamic_zoom);
    }

    return obj;
}
