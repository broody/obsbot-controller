import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { spawn, ChildProcess } from 'child_process';

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

// FFmpeg recording state
let ffmpegProcess: ChildProcess | null = null;
let ffmpegOutputPath: string | null = null;

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
ipcMain.handle('save-recording', async (_, buffer: ArrayBuffer, mimeType: string) => {
    if (!mainWindow) return null;

    // Determine file extension based on mime type
    const isMP4 = mimeType.includes('mp4') || mimeType.includes('avc');
    const extension = isMP4 ? 'mp4' : 'webm';
    const filterName = isMP4 ? 'MP4 Video' : 'WebM Video';

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const defaultPath = path.join(app.getPath('videos'), `OBSBOT_${timestamp}.${extension}`);

    const result = await dialog.showSaveDialog(mainWindow, {
        title: 'Save Recording',
        defaultPath,
        filters: [
            { name: filterName, extensions: [extension] },
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

// FFmpeg hardware-accelerated recording - captures directly from v4l2 device
ipcMain.handle('ffmpeg-start-recording', async (_, options: {
    width: number;
    height: number;
    fps: number;
    useNvenc: boolean;
    devicePath?: string;  // e.g., '/dev/video0'
    audioDevice?: string; // PulseAudio device name
}) => {
    if (ffmpegProcess) {
        return { success: false, error: 'Recording already in progress' };
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    ffmpegOutputPath = path.join(app.getPath('videos'), `OBSBOT_${timestamp}.mp4`);

    // Choose hardware encoder: NVENC HEVC (NVIDIA) or VAAPI (Intel/AMD)
    const encoder = options.useNvenc ? 'hevc_nvenc' : 'hevc_vaapi';

    let ffmpegArgs: string[];

    if (options.devicePath) {
        // Direct v4l2 device capture - no IPC bottleneck!
        ffmpegArgs = [
            // Video input from v4l2 device
            '-f', 'v4l2',
            '-input_format', 'mjpeg',  // MJPEG is usually fastest for high-res
            '-video_size', `${options.width}x${options.height}`,
            '-framerate', String(options.fps),
            '-i', options.devicePath,
            // Audio input from PulseAudio/PipeWire
            ...(options.audioDevice ? [
                '-f', 'pulse',
                '-i', options.audioDevice
            ] : []),
            // Video encoding (hardware)
            '-c:v', encoder,
            ...(options.useNvenc
                ? ['-preset', 'p4', '-rc', 'vbr', '-cq', '23']
                : ['-vaapi_device', '/dev/dri/renderD128', '-vf', 'format=nv12,hwupload', '-qp', '23']),
            // Audio encoding
            ...(options.audioDevice ? ['-c:a', 'aac', '-b:a', '192k'] : []),
            // Output
            '-y',
            ffmpegOutputPath
        ];
    } else {
        // Fallback: raw RGBA frames from stdin (slow due to IPC)
        const hwAccel = options.useNvenc ? [] : ['-vaapi_device', '/dev/dri/renderD128'];
        ffmpegArgs = [
            ...hwAccel,
            '-f', 'rawvideo',
            '-pix_fmt', 'rgba',
            '-s', `${options.width}x${options.height}`,
            '-r', String(options.fps),
            '-i', 'pipe:0',
            '-c:v', encoder,
            ...(options.useNvenc
                ? ['-preset', 'p4', '-rc', 'vbr', '-cq', '26']
                : ['-vf', 'format=nv12,hwupload', '-qp', '26']),
            '-y',
            ffmpegOutputPath
        ];
    }

    try {
        ffmpegProcess = spawn('ffmpeg', ffmpegArgs, {
            stdio: options.devicePath ? ['ignore', 'pipe', 'pipe'] : ['pipe', 'pipe', 'pipe']
        });

        ffmpegProcess.stderr?.on('data', (data) => {
            const msg = data.toString();
            // Only log important messages, not the continuous status
            if (msg.includes('Error') || msg.includes('error') || msg.includes('failed')) {
                console.error('FFmpeg error:', msg);
            }
        });

        ffmpegProcess.on('close', () => {
            ffmpegProcess = null;
        });

        ffmpegProcess.on('error', (err) => {
            console.error('FFmpeg process error:', err);
            ffmpegProcess = null;
        });

        return { success: true, outputPath: ffmpegOutputPath };
    } catch (error) {
        console.error('Failed to start FFmpeg:', error);
        return { success: false, error: String(error) };
    }
});

ipcMain.handle('ffmpeg-write-frame', async (_, frameData: ArrayBuffer) => {
    if (!ffmpegProcess || !ffmpegProcess.stdin?.writable) {
        return false;
    }

    try {
        const buffer = Buffer.from(frameData);
        return ffmpegProcess.stdin.write(buffer);
    } catch (error) {
        console.error('Failed to write frame:', error);
        return false;
    }
});

ipcMain.handle('ffmpeg-stop-recording', async () => {
    if (!ffmpegProcess) {
        return { success: false, error: 'No recording in progress' };
    }

    return new Promise((resolve) => {
        const outputPath = ffmpegOutputPath;

        ffmpegProcess!.on('close', () => {
            ffmpegProcess = null;
            ffmpegOutputPath = null;
            resolve({ success: true, outputPath });
        });

        // Send SIGINT to gracefully stop FFmpeg (works for both stdin and device capture)
        ffmpegProcess!.kill('SIGINT');
    });
});

// Find video device path by name
ipcMain.handle('ffmpeg-find-video-device', async (_, deviceName: string) => {
    try {
        const videoDevices = fs.readdirSync('/sys/class/video4linux');
        // Sort to get video0 before video1, etc.
        videoDevices.sort();

        const searchTerms = deviceName.toLowerCase().split(/\s+/);

        for (const device of videoDevices) {
            const namePath = `/sys/class/video4linux/${device}/name`;
            if (fs.existsSync(namePath)) {
                const name = fs.readFileSync(namePath, 'utf-8').trim().toLowerCase();
                const matches = searchTerms.some(term => name.includes(term));
                if (matches) {
                    return `/dev/${device}`;
                }
            }
        }
        return null;
    } catch (error) {
        console.error('Failed to find video device:', error);
        return null;
    }
});

// Find PulseAudio audio device by name
ipcMain.handle('ffmpeg-find-audio-device', async (_, deviceName: string) => {
    return new Promise((resolve) => {
        // Use pactl to list sources
        const proc = spawn('pactl', ['list', 'sources', 'short'], { stdio: ['pipe', 'pipe', 'pipe'] });
        let output = '';

        proc.stdout?.on('data', (data) => {
            output += data.toString();
        });

        proc.on('close', () => {
            const lines = output.split('\n');
            const searchTerm = deviceName.toLowerCase();

            for (const line of lines) {
                const parts = line.split('\t');
                if (parts.length >= 2) {
                    const sourceName = parts[1];
                    if (sourceName.toLowerCase().includes(searchTerm)) {
                        resolve(sourceName);
                        return;
                    }
                }
            }
            resolve(null);
        });

        proc.on('error', () => {
            resolve(null);
        });
    });
});

ipcMain.handle('ffmpeg-check-encoders', async () => {
    return new Promise((resolve) => {
        const proc = spawn('ffmpeg', ['-encoders'], { stdio: ['pipe', 'pipe', 'pipe'] });
        let output = '';

        proc.stdout?.on('data', (data) => {
            output += data.toString();
        });

        proc.on('close', () => {
            resolve({
                hasNvenc: output.includes('h264_nvenc'),
                hasVaapi: output.includes('h264_vaapi'),
                hasQsv: output.includes('h264_qsv')
            });
        });

        proc.on('error', () => {
            resolve({ hasNvenc: false, hasVaapi: false, hasQsv: false });
        });
    });
});
