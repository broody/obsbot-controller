#include <napi.h>
#include <dev/devs.hpp>
#include <dev/dev.hpp>
#include "device_wrapper.hpp"
#include <thread>
#include <chrono>
#include <mutex>
#include <vector>

static Napi::ThreadSafeFunction tsfn;
static bool isInitialized = false;
static std::mutex deviceMutex;

// Device change callback
void OnDeviceChanged(std::string devSn, bool connected, void* param) {
    if (tsfn) {
        auto callback = [devSn, connected](Napi::Env env, Napi::Function jsCallback) {
            Napi::Object event = Napi::Object::New(env);
            event.Set("serialNumber", devSn);
            event.Set("connected", connected);
            jsCallback.Call({event});
        };
        tsfn.NonBlockingCall(callback);
    }
}

// Initialize the SDK
Napi::Value Initialize(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (isInitialized) {
        return Napi::Boolean::New(env, true);
    }

    // Set up device change callback if provided
    if (info.Length() > 0 && info[0].IsFunction()) {
        tsfn = Napi::ThreadSafeFunction::New(
            env,
            info[0].As<Napi::Function>(),
            "DeviceChangedCallback",
            0,
            1
        );
        Devices::get().setDevChangedCallback(OnDeviceChanged, nullptr);
    }

    isInitialized = true;
    return Napi::Boolean::New(env, true);
}

// Close the SDK
Napi::Value Close(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (!isInitialized) {
        return Napi::Boolean::New(env, true);
    }

    Devices::get().close();

    if (tsfn) {
        tsfn.Release();
    }

    isInitialized = false;
    return Napi::Boolean::New(env, true);
}

// Get device count
Napi::Value GetDeviceCount(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    return Napi::Number::New(env, Devices::get().getDevNum());
}

// Get all devices
Napi::Value GetDevices(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    std::lock_guard<std::mutex> lock(deviceMutex);
    auto devList = Devices::get().getDevList();

    Napi::Array result = Napi::Array::New(env, devList.size());
    size_t index = 0;

    for (auto& dev : devList) {
        result[index++] = DeviceWrapper::NewInstance(env, dev);
    }

    return result;
}

// Get device by serial number
Napi::Value GetDeviceBySerialNumber(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 1 || !info[0].IsString()) {
        Napi::TypeError::New(env, "Serial number string expected").ThrowAsJavaScriptException();
        return env.Null();
    }

    std::string sn = info[0].As<Napi::String>().Utf8Value();

    std::lock_guard<std::mutex> lock(deviceMutex);
    auto dev = Devices::get().getDevBySn(sn);

    if (dev) {
        return DeviceWrapper::NewInstance(env, dev);
    }

    return env.Null();
}

// Wait for device detection (blocking call with timeout)
Napi::Value WaitForDevices(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    int timeoutMs = 3000;  // Default 3 seconds
    if (info.Length() > 0 && info[0].IsNumber()) {
        timeoutMs = info[0].As<Napi::Number>().Int32Value();
    }

    std::this_thread::sleep_for(std::chrono::milliseconds(timeoutMs));

    return Napi::Number::New(env, Devices::get().getDevNum());
}

// Helper function to create enum objects
Napi::Object CreateProductTypes(Napi::Env env) {
    Napi::Object obj = Napi::Object::New(env);

    // ObsbotProductType is a global enum, not inside Device class
    obj.Set("Tiny", static_cast<int>(ObsbotProdTiny));
    obj.Set("Tiny4K", static_cast<int>(ObsbotProdTiny4k));
    obj.Set("Tiny2", static_cast<int>(ObsbotProdTiny2));
    obj.Set("Tiny2Lite", static_cast<int>(ObsbotProdTiny2Lite));
    obj.Set("TinySE", static_cast<int>(ObsbotProdTinySE));
    obj.Set("Meet", static_cast<int>(ObsbotProdMeet));
    obj.Set("Meet4K", static_cast<int>(ObsbotProdMeet4k));
    obj.Set("Meet2", static_cast<int>(ObsbotProdMeet2));
    obj.Set("MeetSE", static_cast<int>(ObsbotProdMeetSE));
    obj.Set("TailAir", static_cast<int>(ObsbotProdTailAir));
    obj.Set("Tail2", static_cast<int>(ObsbotProdTail2));
    obj.Set("Me", static_cast<int>(ObsbotProdMe));

    return obj;
}

Napi::Object CreateAIModes(Napi::Env env) {
    Napi::Object obj = Napi::Object::New(env);

    obj.Set("None", static_cast<int>(Device::AiWorkModeNone));
    obj.Set("Group", static_cast<int>(Device::AiWorkModeGroup));
    obj.Set("Human", static_cast<int>(Device::AiWorkModeHuman));
    obj.Set("Hand", static_cast<int>(Device::AiWorkModeHand));
    obj.Set("WhiteBoard", static_cast<int>(Device::AiWorkModeWhiteBoard));
    obj.Set("Desk", static_cast<int>(Device::AiWorkModeDesk));

    return obj;
}

Napi::Object CreateAISubModes(Napi::Env env) {
    Napi::Object obj = Napi::Object::New(env);

    obj.Set("Normal", static_cast<int>(Device::AiSubModeNormal));
    obj.Set("UpperBody", static_cast<int>(Device::AiSubModeUpperBody));
    obj.Set("CloseUp", static_cast<int>(Device::AiSubModeCloseUp));
    obj.Set("HeadHide", static_cast<int>(Device::AiSubModeHeadHide));
    obj.Set("LowerBody", static_cast<int>(Device::AiSubModeLowerBody));

    return obj;
}

Napi::Object CreateTrackSpeeds(Napi::Env env) {
    Napi::Object obj = Napi::Object::New(env);

    obj.Set("Lazy", static_cast<int>(Device::AiTrackSpeedLazy));
    obj.Set("Slow", static_cast<int>(Device::AiTrackSpeedSlow));
    obj.Set("Standard", static_cast<int>(Device::AiTrackSpeedStandard));
    obj.Set("Fast", static_cast<int>(Device::AiTrackSpeedFast));
    obj.Set("Crazy", static_cast<int>(Device::AiTrackSpeedCrazy));
    obj.Set("Auto", static_cast<int>(Device::AiTrackSpeedAuto));

    return obj;
}

Napi::Object CreateFOVTypes(Napi::Env env) {
    Napi::Object obj = Napi::Object::New(env);

    obj.Set("Wide86", static_cast<int>(Device::FovType86));
    obj.Set("Medium78", static_cast<int>(Device::FovType78));
    obj.Set("Narrow65", static_cast<int>(Device::FovType65));

    return obj;
}

Napi::Object CreateWhiteBalanceTypes(Napi::Env env) {
    Napi::Object obj = Napi::Object::New(env);

    obj.Set("Auto", static_cast<int>(Device::DevWhiteBalanceAuto));
    obj.Set("Manual", static_cast<int>(Device::DevWhiteBalanceManual));
    obj.Set("Daylight", static_cast<int>(Device::DevWhiteBalanceDaylight));
    obj.Set("Fluorescent", static_cast<int>(Device::DevWhiteBalanceFluorescent));
    obj.Set("Tungsten", static_cast<int>(Device::DevWhiteBalanceTungsten));
    obj.Set("Flash", static_cast<int>(Device::DevWhiteBalanceFlash));
    obj.Set("Cloudy", static_cast<int>(Device::DevWhiteBalanceCloudy));
    obj.Set("Shade", static_cast<int>(Device::DevWhiteBalanceShade));

    return obj;
}

Napi::Object CreateDeviceStatuses(Napi::Env env) {
    Napi::Object obj = Napi::Object::New(env);

    obj.Set("Run", static_cast<int>(Device::DevStatusRun));
    obj.Set("Sleep", static_cast<int>(Device::DevStatusSleep));
    obj.Set("Privacy", static_cast<int>(Device::DevStatusPrivacy));

    return obj;
}

// Initialize module
Napi::Object Init(Napi::Env env, Napi::Object exports) {
    // Initialize DeviceWrapper class
    DeviceWrapper::Init(env, exports);

    // Export functions
    exports.Set("initialize", Napi::Function::New(env, Initialize));
    exports.Set("close", Napi::Function::New(env, Close));
    exports.Set("getDeviceCount", Napi::Function::New(env, GetDeviceCount));
    exports.Set("getDevices", Napi::Function::New(env, GetDevices));
    exports.Set("getDeviceBySerialNumber", Napi::Function::New(env, GetDeviceBySerialNumber));
    exports.Set("waitForDevices", Napi::Function::New(env, WaitForDevices));

    // Export enums
    exports.Set("ProductTypes", CreateProductTypes(env));
    exports.Set("AIModes", CreateAIModes(env));
    exports.Set("AISubModes", CreateAISubModes(env));
    exports.Set("TrackSpeeds", CreateTrackSpeeds(env));
    exports.Set("FOVTypes", CreateFOVTypes(env));
    exports.Set("WhiteBalanceTypes", CreateWhiteBalanceTypes(env));
    exports.Set("DeviceStatuses", CreateDeviceStatuses(env));

    return exports;
}

NODE_API_MODULE(obsbot_native, Init)
