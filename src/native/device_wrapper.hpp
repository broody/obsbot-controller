#pragma once

#include <napi.h>
#include <dev/devs.hpp>
#include <dev/dev.hpp>
#include <memory>
#include <string>
#include <functional>

class DeviceWrapper : public Napi::ObjectWrap<DeviceWrapper> {
public:
    static Napi::Object Init(Napi::Env env, Napi::Object exports);
    static Napi::Object NewInstance(Napi::Env env, std::shared_ptr<Device> device);

    DeviceWrapper(const Napi::CallbackInfo& info);

    void SetDevice(std::shared_ptr<Device> device);

private:
    static Napi::FunctionReference constructor;
    std::shared_ptr<Device> device_;

    // Device info
    Napi::Value GetDeviceName(const Napi::CallbackInfo& info);
    Napi::Value GetSerialNumber(const Napi::CallbackInfo& info);
    Napi::Value GetProductType(const Napi::CallbackInfo& info);
    Napi::Value GetVideoDevicePath(const Napi::CallbackInfo& info);
    Napi::Value GetDeviceInfo(const Napi::CallbackInfo& info);

    // Gimbal control
    Napi::Value SetGimbalSpeed(const Napi::CallbackInfo& info);
    Napi::Value SetGimbalAngle(const Napi::CallbackInfo& info);
    Napi::Value StopGimbal(const Napi::CallbackInfo& info);
    Napi::Value ResetGimbalPosition(const Napi::CallbackInfo& info);
    Napi::Value GetGimbalState(const Napi::CallbackInfo& info);

    // Preset positions
    Napi::Value AddPreset(const Napi::CallbackInfo& info);
    Napi::Value DeletePreset(const Napi::CallbackInfo& info);
    Napi::Value TriggerPreset(const Napi::CallbackInfo& info);
    Napi::Value GetPresetList(const Napi::CallbackInfo& info);
    Napi::Value SetBootPosition(const Napi::CallbackInfo& info);
    Napi::Value TriggerBootPosition(const Napi::CallbackInfo& info);

    // Zoom control
    Napi::Value SetZoom(const Napi::CallbackInfo& info);
    Napi::Value GetZoom(const Napi::CallbackInfo& info);
    Napi::Value GetZoomRange(const Napi::CallbackInfo& info);

    // Focus control
    Napi::Value SetFocus(const Napi::CallbackInfo& info);
    Napi::Value GetFocus(const Napi::CallbackInfo& info);
    Napi::Value SetFaceFocus(const Napi::CallbackInfo& info);
    Napi::Value GetFocusRange(const Napi::CallbackInfo& info);
    Napi::Value SetAutoFocusMode(const Napi::CallbackInfo& info);
    Napi::Value GetAutoFocusMode(const Napi::CallbackInfo& info);

    // Exposure control
    Napi::Value SetExposureMode(const Napi::CallbackInfo& info);
    Napi::Value GetExposureMode(const Napi::CallbackInfo& info);
    Napi::Value SetExposure(const Napi::CallbackInfo& info);
    Napi::Value GetExposure(const Napi::CallbackInfo& info);
    Napi::Value SetAELock(const Napi::CallbackInfo& info);

    // White balance
    Napi::Value SetWhiteBalance(const Napi::CallbackInfo& info);
    Napi::Value GetWhiteBalance(const Napi::CallbackInfo& info);
    Napi::Value GetWhiteBalanceRange(const Napi::CallbackInfo& info);

    // Image settings
    Napi::Value SetBrightness(const Napi::CallbackInfo& info);
    Napi::Value GetBrightness(const Napi::CallbackInfo& info);
    Napi::Value SetContrast(const Napi::CallbackInfo& info);
    Napi::Value GetContrast(const Napi::CallbackInfo& info);
    Napi::Value SetSaturation(const Napi::CallbackInfo& info);
    Napi::Value GetSaturation(const Napi::CallbackInfo& info);
    Napi::Value SetSharpness(const Napi::CallbackInfo& info);
    Napi::Value GetSharpness(const Napi::CallbackInfo& info);
    Napi::Value SetHue(const Napi::CallbackInfo& info);
    Napi::Value GetHue(const Napi::CallbackInfo& info);

    // HDR/WDR
    Napi::Value SetHDR(const Napi::CallbackInfo& info);
    Napi::Value GetHDR(const Napi::CallbackInfo& info);

    // FOV
    Napi::Value SetFOV(const Napi::CallbackInfo& info);

    // Flip/Mirror
    Napi::Value SetMirrorFlip(const Napi::CallbackInfo& info);
    Napi::Value GetMirrorFlip(const Napi::CallbackInfo& info);

    // AI tracking
    Napi::Value SetAIEnabled(const Napi::CallbackInfo& info);
    Napi::Value SetAIMode(const Napi::CallbackInfo& info);
    Napi::Value SetTrackingSpeed(const Napi::CallbackInfo& info);
    Napi::Value SetAutoZoom(const Napi::CallbackInfo& info);
    Napi::Value SetGestureControl(const Napi::CallbackInfo& info);
    Napi::Value SelectCentralTarget(const Napi::CallbackInfo& info);
    Napi::Value SelectBiggestTarget(const Napi::CallbackInfo& info);
    Napi::Value DeselectTarget(const Napi::CallbackInfo& info);

    // Device status
    Napi::Value SetDeviceRunStatus(const Napi::CallbackInfo& info);
    Napi::Value SetSleepTimeout(const Napi::CallbackInfo& info);

    // Anti-flicker
    Napi::Value SetAntiFlicker(const Napi::CallbackInfo& info);

    // Camera status
    Napi::Value GetCameraStatus(const Napi::CallbackInfo& info);
};
