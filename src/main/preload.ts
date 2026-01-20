import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('obsbot', {
    // Device management
    getDevices: () => ipcRenderer.invoke('get-devices'),
    selectDevice: (serialNumber: string) => ipcRenderer.invoke('select-device', serialNumber),
    getEnums: () => ipcRenderer.invoke('get-enums'),
    onDeviceChanged: (callback: (event: { serialNumber: string; connected: boolean }) => void) => {
        ipcRenderer.on('device-changed', (_, event) => callback(event));
    },

    // Gimbal control
    gimbal: {
        setSpeed: (pitch: number, pan: number, roll: number) =>
            ipcRenderer.invoke('gimbal-set-speed', pitch, pan, roll),
        setAngle: (pitch: number, yaw: number, roll: number) =>
            ipcRenderer.invoke('gimbal-set-angle', pitch, yaw, roll),
        stop: () => ipcRenderer.invoke('gimbal-stop'),
        reset: () => ipcRenderer.invoke('gimbal-reset'),
        getState: () => ipcRenderer.invoke('gimbal-get-state')
    },

    // Presets
    preset: {
        add: () => ipcRenderer.invoke('preset-add'),
        delete: (id: number) => ipcRenderer.invoke('preset-delete', id),
        trigger: (id: number) => ipcRenderer.invoke('preset-trigger', id),
        getList: () => ipcRenderer.invoke('preset-get-list'),
        setBoot: () => ipcRenderer.invoke('preset-set-boot'),
        triggerBoot: () => ipcRenderer.invoke('preset-trigger-boot')
    },

    // Zoom
    zoom: {
        set: (zoom: number) => ipcRenderer.invoke('zoom-set', zoom),
        get: () => ipcRenderer.invoke('zoom-get'),
        getRange: () => ipcRenderer.invoke('zoom-get-range')
    },

    // Focus
    focus: {
        set: (focus: number) => ipcRenderer.invoke('focus-set', focus),
        get: () => ipcRenderer.invoke('focus-get'),
        setFace: (enable: boolean) => ipcRenderer.invoke('focus-set-face', enable),
        getRange: () => ipcRenderer.invoke('focus-get-range'),
        setAutoMode: (mode: number) => ipcRenderer.invoke('focus-set-auto-mode', mode),
        getAutoMode: () => ipcRenderer.invoke('focus-get-auto-mode')
    },

    // Exposure
    exposure: {
        setMode: (mode: number) => ipcRenderer.invoke('exposure-set-mode', mode),
        getMode: () => ipcRenderer.invoke('exposure-get-mode'),
        set: (value: number) => ipcRenderer.invoke('exposure-set', value),
        get: () => ipcRenderer.invoke('exposure-get'),
        setAELock: (enable: boolean) => ipcRenderer.invoke('exposure-set-ae-lock', enable)
    },

    // White balance
    whiteBalance: {
        set: (type: number, param: number) => ipcRenderer.invoke('wb-set', type, param),
        get: () => ipcRenderer.invoke('wb-get'),
        getRange: () => ipcRenderer.invoke('wb-get-range')
    },

    // Image settings
    image: {
        setBrightness: (value: number) => ipcRenderer.invoke('image-set-brightness', value),
        getBrightness: () => ipcRenderer.invoke('image-get-brightness'),
        setContrast: (value: number) => ipcRenderer.invoke('image-set-contrast', value),
        getContrast: () => ipcRenderer.invoke('image-get-contrast'),
        setSaturation: (value: number) => ipcRenderer.invoke('image-set-saturation', value),
        getSaturation: () => ipcRenderer.invoke('image-get-saturation'),
        setSharpness: (value: number) => ipcRenderer.invoke('image-set-sharpness', value),
        getSharpness: () => ipcRenderer.invoke('image-get-sharpness'),
        setHue: (value: number) => ipcRenderer.invoke('image-set-hue', value),
        getHue: () => ipcRenderer.invoke('image-get-hue')
    },

    // HDR
    hdr: {
        set: (mode: number) => ipcRenderer.invoke('hdr-set', mode),
        get: () => ipcRenderer.invoke('hdr-get')
    },

    // FOV
    fov: {
        set: (fov: number) => ipcRenderer.invoke('fov-set', fov)
    },

    // Mirror/Flip
    mirrorFlip: {
        set: (mode: number) => ipcRenderer.invoke('mirror-flip-set', mode),
        get: () => ipcRenderer.invoke('mirror-flip-get')
    },

    // AI tracking
    ai: {
        setEnabled: (enabled: boolean) => ipcRenderer.invoke('ai-set-enabled', enabled),
        setMode: (mode: number, subMode: number) => ipcRenderer.invoke('ai-set-mode', mode, subMode),
        setTrackingSpeed: (speed: number) => ipcRenderer.invoke('ai-set-tracking-speed', speed),
        setAutoZoom: (enabled: boolean) => ipcRenderer.invoke('ai-set-auto-zoom', enabled),
        setGesture: (gesture: number, enabled: boolean) =>
            ipcRenderer.invoke('ai-set-gesture', gesture, enabled),
        selectCentral: () => ipcRenderer.invoke('ai-select-central'),
        selectBiggest: () => ipcRenderer.invoke('ai-select-biggest'),
        deselect: () => ipcRenderer.invoke('ai-deselect')
    },

    // Device status
    device: {
        setStatus: (status: number) => ipcRenderer.invoke('device-set-status', status),
        setSleepTimeout: (timeout: number) => ipcRenderer.invoke('device-set-sleep-timeout', timeout)
    },

    // Anti-flicker
    antiFlicker: {
        set: (mode: number) => ipcRenderer.invoke('anti-flicker-set', mode)
    },

    // Camera status (get all current settings)
    getCameraStatus: () => ipcRenderer.invoke('get-camera-status'),

    // Save recording (MediaRecorder fallback)
    saveRecording: (buffer: ArrayBuffer, mimeType: string) => ipcRenderer.invoke('save-recording', buffer, mimeType),

    // FFmpeg hardware-accelerated recording
    ffmpeg: {
        checkEncoders: () => ipcRenderer.invoke('ffmpeg-check-encoders'),
        findVideoDevice: (deviceName: string) => ipcRenderer.invoke('ffmpeg-find-video-device', deviceName),
        findAudioDevice: (deviceName: string) => ipcRenderer.invoke('ffmpeg-find-audio-device', deviceName),
        startRecording: (options: { width: number; height: number; fps: number; useNvenc: boolean; devicePath?: string; audioDevice?: string }) =>
            ipcRenderer.invoke('ffmpeg-start-recording', options),
        writeFrame: (frameData: ArrayBuffer) => ipcRenderer.invoke('ffmpeg-write-frame', frameData),
        stopRecording: () => ipcRenderer.invoke('ffmpeg-stop-recording')
    }
});
