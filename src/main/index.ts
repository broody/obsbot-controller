import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

// Load native addon
let obsbot: any;
try {
    obsbot = require('../../build/Release/obsbot_native.node');
} catch (e) {
    console.error('Failed to load native addon:', e);
    obsbot = null;
}

let mainWindow: BrowserWindow | null = null;
let currentDevice: any = null;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1000,
        minHeight: 700,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        title: 'OBSBOT Controller'
    });

    // In development, load from vite dev server
    if (process.env.NODE_ENV === 'development') {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// Initialize SDK when app is ready
app.whenReady().then(async () => {
    createWindow();

    if (obsbot) {
        obsbot.initialize((event: { serialNumber: string; connected: boolean }) => {
            if (mainWindow) {
                mainWindow.webContents.send('device-changed', event);
            }
        });
        
        // Removed blocking waitForDevices(5000) to prevent startup delay.
        // The renderer will poll or receive events.
    }

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (obsbot) {
        obsbot.close();
    }
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// IPC Handlers

// Device management
ipcMain.handle('get-devices', async () => {
    if (!obsbot) return [];
    const devices = obsbot.getDevices();
    return devices.map((dev: any) => dev.getDeviceInfo());
});

ipcMain.handle('select-device', async (_, serialNumber: string) => {
    if (!obsbot) return null;
    currentDevice = obsbot.getDeviceBySerialNumber(serialNumber);
    if (currentDevice) {
        return currentDevice.getDeviceInfo();
    }
    return null;
});

ipcMain.handle('get-enums', async () => {
    if (!obsbot) return {};
    return {
        productTypes: obsbot.ProductTypes,
        aiModes: obsbot.AIModes,
        aiSubModes: obsbot.AISubModes,
        trackSpeeds: obsbot.TrackSpeeds,
        fovTypes: obsbot.FOVTypes,
        whiteBalanceTypes: obsbot.WhiteBalanceTypes,
        deviceStatuses: obsbot.DeviceStatuses
    };
});

// Gimbal control
ipcMain.handle('gimbal-set-speed', async (_, pitch: number, pan: number, roll: number) => {
    if (!currentDevice) return -1;
    return currentDevice.setGimbalSpeed(pitch, pan, roll);
});

ipcMain.handle('gimbal-set-angle', async (_, pitch: number, yaw: number, roll: number) => {
    if (!currentDevice) return -1;
    return currentDevice.setGimbalAngle(pitch, yaw, roll);
});

ipcMain.handle('gimbal-stop', async () => {
    if (!currentDevice) return -1;
    return currentDevice.stopGimbal();
});

ipcMain.handle('gimbal-reset', async () => {
    if (!currentDevice) return -1;
    return currentDevice.resetGimbalPosition();
});

ipcMain.handle('gimbal-get-state', async () => {
    if (!currentDevice) return null;
    try {
        return currentDevice.getGimbalState();
    } catch (error) {
        // UVC control errors can occur when video stream is active
        return null;
    }
});

// Presets
ipcMain.handle('preset-add', async () => {
    if (!currentDevice) return -1;
    return currentDevice.addPreset();
});

ipcMain.handle('preset-delete', async (_, id: number) => {
    if (!currentDevice) return -1;
    return currentDevice.deletePreset(id);
});

ipcMain.handle('preset-trigger', async (_, id: number) => {
    if (!currentDevice) return -1;
    return currentDevice.triggerPreset(id);
});

ipcMain.handle('preset-get-list', async () => {
    if (!currentDevice) return [];
    return currentDevice.getPresetList() || [];
});

ipcMain.handle('preset-set-boot', async () => {
    if (!currentDevice) return -1;
    return currentDevice.setBootPosition();
});

ipcMain.handle('preset-trigger-boot', async () => {
    if (!currentDevice) return -1;
    return currentDevice.triggerBootPosition();
});

// Zoom
ipcMain.handle('zoom-set', async (_, zoom: number) => {
    if (!currentDevice) return -1;
    return currentDevice.setZoom(zoom);
});

ipcMain.handle('zoom-get', async () => {
    if (!currentDevice) return null;
    return currentDevice.getZoom();
});

ipcMain.handle('zoom-get-range', async () => {
    if (!currentDevice) return null;
    return currentDevice.getZoomRange();
});

// Focus
ipcMain.handle('focus-set', async (_, focus: number) => {
    if (!currentDevice) return -1;
    return currentDevice.setFocus(focus);
});

ipcMain.handle('focus-get', async () => {
    if (!currentDevice) return null;
    return currentDevice.getFocus();
});

ipcMain.handle('focus-set-face', async (_, enable: boolean) => {
    if (!currentDevice) return -1;
    return currentDevice.setFaceFocus(enable);
});

ipcMain.handle('focus-get-range', async () => {
    if (!currentDevice) return null;
    return currentDevice.getFocusRange();
});

ipcMain.handle('focus-set-auto-mode', async (_, mode: number) => {
    if (!currentDevice) return -1;
    return currentDevice.setAutoFocusMode(mode);
});

ipcMain.handle('focus-get-auto-mode', async () => {
    if (!currentDevice) return null;
    return currentDevice.getAutoFocusMode();
});

// Exposure
ipcMain.handle('exposure-set-mode', async (_, mode: number) => {
    if (!currentDevice) return -1;
    return currentDevice.setExposureMode(mode);
});

ipcMain.handle('exposure-get-mode', async () => {
    if (!currentDevice) return null;
    return currentDevice.getExposureMode();
});

ipcMain.handle('exposure-set', async (_, value: number) => {
    if (!currentDevice) return -1;
    return currentDevice.setExposure(value);
});

ipcMain.handle('exposure-get', async () => {
    if (!currentDevice) return null;
    return currentDevice.getExposure();
});

ipcMain.handle('exposure-set-ae-lock', async (_, enable: boolean) => {
    if (!currentDevice) return -1;
    return currentDevice.setAELock(enable);
});

// White balance
ipcMain.handle('wb-set', async (_, type: number, param: number) => {
    if (!currentDevice) return -1;
    return currentDevice.setWhiteBalance(type, param);
});

ipcMain.handle('wb-get', async () => {
    if (!currentDevice) return null;
    return currentDevice.getWhiteBalance();
});

ipcMain.handle('wb-get-range', async () => {
    if (!currentDevice) return null;
    return currentDevice.getWhiteBalanceRange();
});

// Image settings
ipcMain.handle('image-set-brightness', async (_, value: number) => {
    if (!currentDevice) return -1;
    return currentDevice.setBrightness(value);
});

ipcMain.handle('image-get-brightness', async () => {
    if (!currentDevice) return null;
    return currentDevice.getBrightness();
});

ipcMain.handle('image-set-contrast', async (_, value: number) => {
    if (!currentDevice) return -1;
    return currentDevice.setContrast(value);
});

ipcMain.handle('image-get-contrast', async () => {
    if (!currentDevice) return null;
    return currentDevice.getContrast();
});

ipcMain.handle('image-set-saturation', async (_, value: number) => {
    if (!currentDevice) return -1;
    return currentDevice.setSaturation(value);
});

ipcMain.handle('image-get-saturation', async () => {
    if (!currentDevice) return null;
    return currentDevice.getSaturation();
});

ipcMain.handle('image-set-sharpness', async (_, value: number) => {
    if (!currentDevice) return -1;
    return currentDevice.setSharpness(value);
});

ipcMain.handle('image-get-sharpness', async () => {
    if (!currentDevice) return null;
    return currentDevice.getSharpness();
});

ipcMain.handle('image-set-hue', async (_, value: number) => {
    if (!currentDevice) return -1;
    return currentDevice.setHue(value);
});

ipcMain.handle('image-get-hue', async () => {
    if (!currentDevice) return null;
    return currentDevice.getHue();
});

// HDR
ipcMain.handle('hdr-set', async (_, mode: number) => {
    if (!currentDevice) return -1;
    return currentDevice.setHDR(mode);
});

ipcMain.handle('hdr-get', async () => {
    if (!currentDevice) return null;
    return currentDevice.getHDR();
});

// FOV
ipcMain.handle('fov-set', async (_, fov: number) => {
    if (!currentDevice) return -1;
    return currentDevice.setFOV(fov);
});

// Mirror/Flip
ipcMain.handle('mirror-flip-set', async (_, mode: number) => {
    if (!currentDevice) return -1;
    return currentDevice.setMirrorFlip(mode);
});

ipcMain.handle('mirror-flip-get', async () => {
    if (!currentDevice) return null;
    return currentDevice.getMirrorFlip();
});

// AI tracking
ipcMain.handle('ai-set-enabled', async (_, enabled: boolean) => {
    if (!currentDevice) return -1;
    return currentDevice.setAIEnabled(enabled);
});

ipcMain.handle('ai-set-mode', async (_, mode: number, subMode: number) => {
    if (!currentDevice) return -1;
    return currentDevice.setAIMode(mode, subMode);
});

ipcMain.handle('ai-set-tracking-speed', async (_, speed: number) => {
    if (!currentDevice) return -1;
    return currentDevice.setTrackingSpeed(speed);
});

ipcMain.handle('ai-set-auto-zoom', async (_, enabled: boolean) => {
    if (!currentDevice) return -1;
    return currentDevice.setAutoZoom(enabled);
});

ipcMain.handle('ai-set-gesture', async (_, gesture: number, enabled: boolean) => {
    if (!currentDevice) return -1;
    return currentDevice.setGestureControl(gesture, enabled);
});

ipcMain.handle('ai-select-central', async () => {
    if (!currentDevice) return -1;
    return currentDevice.selectCentralTarget();
});

ipcMain.handle('ai-select-biggest', async () => {
    if (!currentDevice) return -1;
    return currentDevice.selectBiggestTarget();
});

ipcMain.handle('ai-deselect', async () => {
    if (!currentDevice) return -1;
    return currentDevice.deselectTarget();
});

// Device status
ipcMain.handle('device-set-status', async (_, status: number) => {
    if (!currentDevice) return -1;
    return currentDevice.setDeviceRunStatus(status);
});

ipcMain.handle('device-set-sleep-timeout', async (_, timeout: number) => {
    if (!currentDevice) return -1;
    return currentDevice.setSleepTimeout(timeout);
});

// Anti-flicker
ipcMain.handle('anti-flicker-set', async (_, mode: number) => {
    if (!currentDevice) return -1;
    return currentDevice.setAntiFlicker(mode);
});

// Camera status (to get current settings)
ipcMain.handle('get-camera-status', async () => {
    if (!currentDevice) return null;
    try {
        return currentDevice.getCameraStatus();
    } catch (error) {
        return null;
    }
});

// Save recording
ipcMain.handle('save-recording', async (_, buffer: ArrayBuffer) => {
    if (!mainWindow) return null;

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const defaultPath = path.join(app.getPath('videos'), `OBSBOT_${timestamp}.webm`);

    const result = await dialog.showSaveDialog(mainWindow, {
        title: 'Save Recording',
        defaultPath,
        filters: [
            { name: 'WebM Video', extensions: ['webm'] },
            { name: 'All Files', extensions: ['*'] }
        ]
    });

    if (result.canceled || !result.filePath) {
        return null;
    }

    try {
        const uint8Array = new Uint8Array(buffer);
        fs.writeFileSync(result.filePath, uint8Array);
        return result.filePath;
    } catch (error) {
        console.error('Failed to save recording:', error);
        return null;
    }
});
