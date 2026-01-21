// Type declarations for the obsbot API exposed via preload
declare global {
    interface Window {
        obsbot: {
            getDevices: () => Promise<DeviceInfo[]>;
            selectDevice: (serialNumber: string) => Promise<DeviceInfo | null>;
            getEnums: () => Promise<Enums>;
            onDeviceChanged: (callback: (event: { serialNumber: string; connected: boolean }) => void) => void;
            gimbal: {
                setSpeed: (pitch: number, pan: number, roll: number) => Promise<number>;
                setAngle: (pitch: number, yaw: number, roll: number) => Promise<number>;
                stop: () => Promise<number>;
                reset: () => Promise<number>;
                getState: () => Promise<GimbalState | null>;
            };
            preset: {
                add: () => Promise<number>;
                delete: (id: number) => Promise<number>;
                trigger: (id: number) => Promise<number>;
                getList: () => Promise<Preset[]>;
                setBoot: () => Promise<number>;
                triggerBoot: () => Promise<number>;
            };
            zoom: {
                set: (zoom: number) => Promise<number>;
                get: () => Promise<number | null>;
                getRange: () => Promise<Range | null>;
            };
            focus: {
                set: (focus: number) => Promise<number>;
                get: () => Promise<number | null>;
                setFace: (enable: boolean) => Promise<number>;
                getRange: () => Promise<Range | null>;
                setAutoMode: (mode: number) => Promise<number>;
                getAutoMode: () => Promise<number | null>;
            };
            exposure: {
                setMode: (mode: number) => Promise<number>;
                getMode: () => Promise<number | null>;
                set: (value: number) => Promise<number>;
                get: () => Promise<number | null>;
                setAELock: (enable: boolean) => Promise<number>;
            };
            whiteBalance: {
                set: (type: number, param: number) => Promise<number>;
                get: () => Promise<{ type: number; value: number } | null>;
                getRange: () => Promise<Range | null>;
            };
            image: {
                setBrightness: (value: number) => Promise<number>;
                getBrightness: () => Promise<number | null>;
                setContrast: (value: number) => Promise<number>;
                getContrast: () => Promise<number | null>;
                setSaturation: (value: number) => Promise<number>;
                getSaturation: () => Promise<number | null>;
                setSharpness: (value: number) => Promise<number>;
                getSharpness: () => Promise<number | null>;
                setHue: (value: number) => Promise<number>;
                getHue: () => Promise<number | null>;
            };
            hdr: {
                set: (mode: number) => Promise<number>;
                get: () => Promise<number | null>;
            };
            fov: {
                set: (fov: number) => Promise<number>;
            };
            mirrorFlip: {
                set: (mode: number) => Promise<number>;
                get: () => Promise<number | null>;
            };
            ai: {
                setEnabled: (enabled: boolean) => Promise<number>;
                setMode: (mode: number, subMode: number) => Promise<number>;
                setTrackingSpeed: (speed: number) => Promise<number>;
                setAutoZoom: (enabled: boolean) => Promise<number>;
                setGesture: (gesture: number, enabled: boolean) => Promise<number>;
                selectCentral: () => Promise<number>;
                selectBiggest: () => Promise<number>;
                deselect: () => Promise<number>;
            };
            device: {
                setStatus: (status: number) => Promise<number>;
                setSleepTimeout: (timeout: number) => Promise<number>;
            };
            antiFlicker: {
                set: (mode: number) => Promise<number>;
            };
            getCameraStatus: () => Promise<CameraStatus | null>;
            saveRecording: (buffer: ArrayBuffer) => Promise<string | null>;
        };
    }
}

interface CameraStatus {
    productType: number;
    aiMode: number;
    aiSubMode: number;
    hdr: number;
    fov: number;
    zoomRatio: number;
    antiFlicker: number;
    faceAutoFocus: boolean;
    autoFocus: boolean;
    imageFlipHor: boolean;
    aiTrackerSpeed: number;
    gestureTarget: boolean;
    gestureZoom: boolean;
    gestureDynamicZoom: boolean;
}

interface DeviceInfo {
    name: string;
    serialNumber: string;
    productType: number;
    videoDevicePath: string;
    audioDevicePath: string;
    version: string;
    modelCode: string;
}

interface Enums {
    productTypes: Record<string, number>;
    aiModes: Record<string, number>;
    aiSubModes: Record<string, number>;
    trackSpeeds: Record<string, number>;
    fovTypes: Record<string, number>;
    whiteBalanceTypes: Record<string, number>;
    deviceStatuses: Record<string, number>;
}

interface GimbalState {
    pitch: number;
    yaw: number;
    roll: number;
    motorPitch: number;
    motorYaw: number;
    motorRoll: number;
}

interface Preset {
    id: number;
    pitch: number;
    yaw: number;
    roll: number;
    zoom: number;
    name: string;
}

interface Range {
    min: number;
    max: number;
    step: number;
    default: number;
}

// Application state
let currentDevice: DeviceInfo | null = null;
let videoStream: MediaStream | null = null;
let enums: Enums | null = null;
let gimbalPollInterval: number | null = null;

// Audio visualizer state
let audioContext: AudioContext | null = null;
let audioAnalyser: AnalyserNode | null = null;
let audioStream: MediaStream | null = null;
let audioAnimationId: number | null = null;

// Recording state
let mediaRecorder: MediaRecorder | null = null;
let recordingStream: MediaStream | null = null;  // Holds cloned tracks for recording
let recordedChunks: Blob[] = [];
let isRecording = false;
let recordingStartTime: number = 0;
let recordingTimerInterval: number | null = null;
let audioEnabled = false;
let visualizerType: 'bars' | 'waveform' | 'circular' = 'bars';

// FFmpeg hardware recording state
let useFFmpegRecording = false;
let ffmpegEncoders: { hasNvenc: boolean; hasVaapi: boolean; hasQsv: boolean } | null = null;

// DOM Elements
const deviceSelect = document.getElementById('device-select') as HTMLSelectElement;
const refreshDevicesBtn = document.getElementById('refresh-devices') as HTMLButtonElement;
const videoPreview = document.getElementById('video-preview') as HTMLVideoElement;
const videoPlaceholder = document.getElementById('video-placeholder') as HTMLDivElement;
const startPreviewBtn = document.getElementById('start-preview') as HTMLButtonElement;
const stopPreviewBtn = document.getElementById('stop-preview') as HTMLButtonElement;
const connectionStatus = document.getElementById('connection-status') as HTMLSpanElement;
const deviceInfo = document.getElementById('device-info') as HTMLSpanElement;

// Initialize
async function init() {
    // Load enums
    enums = await window.obsbot.getEnums();

    // Check for FFmpeg hardware encoders
    await checkFFmpegEncoders();

    // Set up device change listener
    window.obsbot.onDeviceChanged(() => {
        refreshDevices();
    });

    // Initial device refresh
    await refreshDevices();

    // Set up event listeners
    setupEventListeners();

    // Initialize audio visualizer
    initAudioVisualizer();

    // Hide loading overlay
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.classList.add('opacity-0', 'pointer-events-none');
        setTimeout(() => overlay.remove(), 500);
    }
}

async function refreshDevices() {
    const devices = await window.obsbot.getDevices();

    // Clear existing options
    deviceSelect.innerHTML = '<option value="">Select a device...</option>';

    if (devices.length === 0) {
        deviceSelect.innerHTML = '<option value="">No device connected</option>';
        connectionStatus.textContent = 'No devices found';
        const statusDot = document.getElementById('connection-status-dot');
        if (statusDot) {
            statusDot.classList.remove('bg-emerald-500', 'status-dot');
            statusDot.classList.add('bg-zinc-600');
        }
        return;
    }

    // Add device options
    devices.forEach((device) => {
        const option = document.createElement('option');
        option.value = device.serialNumber;
        option.textContent = `${device.name} (${device.serialNumber})`;
        deviceSelect.appendChild(option);
    });

    // Auto-select first device if none selected
    if (!currentDevice && devices.length > 0) {
        deviceSelect.value = devices[0].serialNumber;
        await selectDevice(devices[0].serialNumber);
    }
}

// Helper to delay execution
function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function selectDevice(serialNumber: string) {
    const statusDot = document.getElementById('connection-status-dot');

    if (!serialNumber) {
        currentDevice = null;
        connectionStatus.textContent = 'Disconnected';
        if (statusDot) {
            statusDot.classList.remove('bg-emerald-500', 'status-dot');
            statusDot.classList.add('bg-zinc-600');
        }
        deviceInfo.textContent = '';
        stopGimbalPolling();
        return;
    }

    currentDevice = await window.obsbot.selectDevice(serialNumber);

    if (currentDevice) {
        connectionStatus.textContent = 'Connected';
        if (statusDot) {
            statusDot.classList.remove('bg-zinc-600', 'bg-red-500');
            statusDot.classList.add('bg-emerald-500', 'status-dot');
        }
        deviceInfo.textContent = `${currentDevice.name} v${currentDevice.version}`;

        // Wait a bit for device to stabilize before querying settings
        await delay(500);

        // Load current settings with retry
        await loadCurrentSettings();

        // Start gimbal state polling (with longer interval)
        startGimbalPolling();
    }
}

async function loadCurrentSettings() {
    if (!currentDevice) return;

    // Load camera status with retry (includes AI mode, gestures, etc.)
    let status: CameraStatus | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            status = await window.obsbot.getCameraStatus();
            if (status) break;
        } catch (error) {
            console.warn(`Camera status attempt ${attempt + 1} failed:`, error);
        }
        await delay(300);
    }

    if (status) {
        // AI Mode
        const aiModeSelect = document.getElementById('ai-mode') as HTMLSelectElement;
        const aiSubModeSelect = document.getElementById('ai-submode') as HTMLSelectElement;
        const aiEnabledCheckbox = document.getElementById('ai-enabled') as HTMLInputElement;

        if (aiModeSelect && status.aiMode !== undefined) {
            aiModeSelect.value = String(status.aiMode);
            // AI is enabled if mode is not 0 (None)
            if (aiEnabledCheckbox) {
                aiEnabledCheckbox.checked = status.aiMode !== 0;
            }
        }
        if (aiSubModeSelect && status.aiSubMode !== undefined) {
            aiSubModeSelect.value = String(status.aiSubMode);
        }

        // Tracking speed
        const trackingSpeedSelect = document.getElementById('tracking-speed') as HTMLSelectElement;
        if (trackingSpeedSelect && status.aiTrackerSpeed !== undefined) {
            trackingSpeedSelect.value = String(status.aiTrackerSpeed);
        }

        // HDR from camera status
        if (status.hdr !== undefined) {
            const hdrMode = document.getElementById('hdr-mode') as HTMLSelectElement;
            if (hdrMode) hdrMode.value = String(status.hdr);
        }

        // FOV
        if (status.fov !== undefined) {
            document.querySelectorAll('.fov-btn').forEach((btn) => {
                const fov = parseInt((btn as HTMLButtonElement).dataset.fov || '0');
                btn.classList.toggle('active', fov === status!.fov);
            });
        }

        // Face Auto Focus
        const faceFocusCheckbox = document.getElementById('face-focus') as HTMLInputElement;
        if (faceFocusCheckbox && status.faceAutoFocus !== undefined) {
            faceFocusCheckbox.checked = status.faceAutoFocus;
        }

        // Auto Focus from camera status
        if (status.autoFocus !== undefined) {
            const focusModeSelect = document.getElementById('focus-mode') as HTMLSelectElement;
            const manualFocusControl = document.getElementById('manual-focus-control') as HTMLDivElement;
            // autoFocus true means auto mode, false means manual
            if (focusModeSelect) {
                // Try to get specific focus mode
                const focusMode = await window.obsbot.focus.getAutoMode();
                if (focusMode !== null) {
                    focusModeSelect.value = String(focusMode);
                    manualFocusControl.style.display = focusMode === 3 ? 'block' : 'none';
                } else {
                    // Fallback: use autoFocus boolean
                    focusModeSelect.value = status.autoFocus ? '1' : '3';
                    manualFocusControl.style.display = status.autoFocus ? 'none' : 'block';
                }
            }
        }

        // Gesture controls
        const gestureTargetCheckbox = document.getElementById('gesture-target') as HTMLInputElement;
        const gestureZoomCheckbox = document.getElementById('gesture-zoom') as HTMLInputElement;
        const gestureDynamicZoomCheckbox = document.getElementById('gesture-dynamic-zoom') as HTMLInputElement;

        if (gestureTargetCheckbox && status.gestureTarget !== undefined) {
            gestureTargetCheckbox.checked = status.gestureTarget;
        }
        if (gestureZoomCheckbox && status.gestureZoom !== undefined) {
            gestureZoomCheckbox.checked = status.gestureZoom;
        }
        if (gestureDynamicZoomCheckbox && status.gestureDynamicZoom !== undefined) {
            gestureDynamicZoomCheckbox.checked = status.gestureDynamicZoom;
        }
    }

    await delay(100);

    // Load zoom
    const zoom = await window.obsbot.zoom.get();
    if (zoom !== null) {
        const zoomSlider = document.getElementById('zoom-slider') as HTMLInputElement;
        const zoomValue = document.getElementById('zoom-value') as HTMLSpanElement;
        zoomSlider.value = String(zoom * 100);
        zoomValue.textContent = `${zoom.toFixed(1)}x`;
    }

    // Load brightness
    const brightness = await window.obsbot.image.getBrightness();
    if (brightness !== null) {
        const slider = document.getElementById('brightness-slider') as HTMLInputElement;
        const value = document.getElementById('brightness-value') as HTMLSpanElement;
        slider.value = String(brightness);
        value.textContent = String(brightness);
    }

    // Load contrast
    const contrast = await window.obsbot.image.getContrast();
    if (contrast !== null) {
        const slider = document.getElementById('contrast-slider') as HTMLInputElement;
        const value = document.getElementById('contrast-value') as HTMLSpanElement;
        slider.value = String(contrast);
        value.textContent = String(contrast);
    }

    // Load saturation
    const saturation = await window.obsbot.image.getSaturation();
    if (saturation !== null) {
        const slider = document.getElementById('saturation-slider') as HTMLInputElement;
        const value = document.getElementById('saturation-value') as HTMLSpanElement;
        slider.value = String(saturation);
        value.textContent = String(saturation);
    }

    // Load sharpness
    const sharpness = await window.obsbot.image.getSharpness();
    if (sharpness !== null) {
        const slider = document.getElementById('sharpness-slider') as HTMLInputElement;
        const value = document.getElementById('sharpness-value') as HTMLSpanElement;
        slider.value = String(sharpness);
        value.textContent = String(sharpness);
    }

    // Load mirror/flip
    const mirrorFlip = await window.obsbot.mirrorFlip.get();
    if (mirrorFlip !== null) {
        document.querySelectorAll('.mirror-btn').forEach((btn) => {
            const mode = parseInt((btn as HTMLButtonElement).dataset.mode || '0');
            btn.classList.toggle('active', mode === mirrorFlip);
        });
    }

    // Load presets
    await loadPresets();
}

async function loadPresets() {
    const presets = await window.obsbot.preset.getList();
    const presetList = document.getElementById('preset-list') as HTMLDivElement;

    if (!presets || presets.length === 0) {
        presetList.innerHTML = '<p class="empty-message">No presets saved</p>';
        return;
    }

    presetList.innerHTML = presets.map((preset) => `
        <div class="preset-item" data-id="${preset.id}">
            <span class="preset-name">${preset.name || `Preset ${preset.id}`}</span>
            <div class="preset-actions">
                <button class="btn preset-goto" data-id="${preset.id}">Go</button>
                <button class="btn btn-secondary preset-delete" data-id="${preset.id}">Delete</button>
            </div>
        </div>
    `).join('');

    // Add event listeners
    presetList.querySelectorAll('.preset-goto').forEach((btn) => {
        btn.addEventListener('click', async () => {
            const id = parseInt((btn as HTMLButtonElement).dataset.id || '0');
            await window.obsbot.preset.trigger(id);
        });
    });

    presetList.querySelectorAll('.preset-delete').forEach((btn) => {
        btn.addEventListener('click', async () => {
            const id = parseInt((btn as HTMLButtonElement).dataset.id || '0');
            await window.obsbot.preset.delete(id);
            await loadPresets();
        });
    });
}

function startGimbalPolling() {
    if (gimbalPollInterval) return;

    let consecutiveErrors = 0;
    const maxErrors = 5;

    gimbalPollInterval = window.setInterval(async () => {
        // Skip polling if video preview is active to reduce USB conflicts
        if (videoStream) {
            return;
        }

        try {
            const state = await window.obsbot.gimbal.getState();
            if (state) {
                consecutiveErrors = 0; // Reset on success
                const pitchEl = document.getElementById('gimbal-pitch') as HTMLSpanElement;
                const yawEl = document.getElementById('gimbal-yaw') as HTMLSpanElement;
                pitchEl.textContent = `${state.pitch.toFixed(1)}°`;
                yawEl.textContent = `${state.yaw.toFixed(1)}°`;
            }
        } catch (error) {
            consecutiveErrors++;
            console.warn('Gimbal state poll error:', error);
            if (consecutiveErrors >= maxErrors) {
                console.warn('Too many gimbal poll errors, stopping polling');
                stopGimbalPolling();
            }
        }
    }, 2000); // Reduced frequency from 500ms to 2000ms
}

function stopGimbalPolling() {
    if (gimbalPollInterval) {
        clearInterval(gimbalPollInterval);
        gimbalPollInterval = null;
    }
}

// Video preview
async function startVideoPreview() {
    if (!currentDevice?.videoDevicePath) {
        console.error('No video device path available');
        return;
    }

    try {
        // Get available video devices
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(d => d.kind === 'videoinput');

        // Find the OBSBOT device
        const obsbotDevice = videoDevices.find(d =>
            d.label.toLowerCase().includes('obsbot') ||
            d.label.toLowerCase().includes(currentDevice!.name.toLowerCase())
        );

        const constraints: MediaStreamConstraints = {
            video: {
                deviceId: obsbotDevice ? { exact: obsbotDevice.deviceId } : undefined,
                width: { ideal: 3840 },
                height: { ideal: 2160 },
                frameRate: { ideal: 30, min: 24 }
            },
            audio: false
        };

        videoStream = await navigator.mediaDevices.getUserMedia(constraints);
        videoPreview.srcObject = videoStream;
        videoPlaceholder.classList.add('hidden');

        // Display resolution
        videoPreview.onloadedmetadata = () => {
            const resEl = document.getElementById('video-resolution');
            if (resEl) {
                resEl.textContent = `${videoPreview.videoWidth}x${videoPreview.videoHeight}`;
            }
        };
    } catch (error) {
        console.error('Failed to start video preview:', error);
        alert('Failed to access webcam. Make sure the device is not in use by another application.');
    }
}

function stopVideoPreview() {
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;
    }
    videoPreview.srcObject = null;
    videoPlaceholder.classList.remove('hidden');

    const resEl = document.getElementById('video-resolution');
    if (resEl) resEl.textContent = '';
}

// Joystick control
function setupJoystick() {
    const container = document.getElementById('joystick-container') as HTMLDivElement;
    const joystick = document.getElementById('joystick') as HTMLDivElement;

    let isDragging = false;
    let centerX = 0;
    let centerY = 0;
    let maxDistance = 0;

    function updateJoystickPosition(clientX: number, clientY: number) {
        const rect = container.getBoundingClientRect();
        centerX = rect.left + rect.width / 2;
        centerY = rect.top + rect.height / 2;
        maxDistance = rect.width / 2 - 20;

        let dx = clientX - centerX;
        let dy = clientY - centerY;

        // Limit to circle
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > maxDistance) {
            dx = (dx / distance) * maxDistance;
            dy = (dy / distance) * maxDistance;
        }

        // Update joystick position
        joystick.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;

        // Calculate speed values (-1 to 1)
        const panSpeed = dx / maxDistance;
        let pitchSpeed = -dy / maxDistance;

        // Invert Y-axis if checkbox is checked
        const invertY = (document.getElementById('invert-y-axis') as HTMLInputElement)?.checked;
        if (invertY) {
            pitchSpeed = -pitchSpeed;
        }

        // Send to gimbal
        window.obsbot.gimbal.setSpeed(pitchSpeed * 50, panSpeed * 50, 0);
    }

    function resetJoystick() {
        joystick.style.transform = 'translate(-50%, -50%)';
        window.obsbot.gimbal.stop();
    }

    container.addEventListener('mousedown', (e) => {
        isDragging = true;
        updateJoystickPosition(e.clientX, e.clientY);
    });

    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            updateJoystickPosition(e.clientX, e.clientY);
        }
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            resetJoystick();
        }
    });

    // Touch support
    container.addEventListener('touchstart', (e) => {
        isDragging = true;
        const touch = e.touches[0];
        updateJoystickPosition(touch.clientX, touch.clientY);
    });

    document.addEventListener('touchmove', (e) => {
        if (isDragging) {
            const touch = e.touches[0];
            updateJoystickPosition(touch.clientX, touch.clientY);
        }
    });

    document.addEventListener('touchend', () => {
        if (isDragging) {
            isDragging = false;
            resetJoystick();
        }
    });
}

function setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            const targetId = (btn as HTMLButtonElement).dataset.target;

            // Update buttons
            document.querySelectorAll('.tab-btn').forEach(b => {
                b.classList.remove('active', 'text-white', 'bg-white/5');
                b.classList.add('text-zinc-500');
            });
            btn.classList.add('active', 'text-white', 'bg-white/5');
            btn.classList.remove('text-zinc-500');

            // Update content
            document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
            if (targetId) {
                document.getElementById(targetId)?.classList.remove('hidden');
            }
        });
    });

    // Device selection
    deviceSelect.addEventListener('change', () => selectDevice(deviceSelect.value));
    refreshDevicesBtn.addEventListener('click', refreshDevices);

    // Video preview
    startPreviewBtn.addEventListener('click', startVideoPreview);
    stopPreviewBtn.addEventListener('click', stopVideoPreview);

    // Gimbal controls
    setupJoystick();
    document.getElementById('gimbal-reset')?.addEventListener('click', () => window.obsbot.gimbal.reset());
    document.getElementById('gimbal-stop')?.addEventListener('click', () => window.obsbot.gimbal.stop());

    // Zoom
    const zoomSlider = document.getElementById('zoom-slider') as HTMLInputElement;
    const zoomValue = document.getElementById('zoom-value') as HTMLSpanElement;
    zoomSlider.addEventListener('input', () => {
        const zoom = parseInt(zoomSlider.value) / 100;
        zoomValue.textContent = `${zoom.toFixed(1)}x`;
    });
    zoomSlider.addEventListener('change', () => {
        const zoom = parseInt(zoomSlider.value) / 100;
        window.obsbot.zoom.set(zoom);
    });

    // Focus
    const focusModeSelect = document.getElementById('focus-mode') as HTMLSelectElement;
    const manualFocusControl = document.getElementById('manual-focus-control') as HTMLDivElement;
    const focusSlider = document.getElementById('focus-slider') as HTMLInputElement;
    const focusValue = document.getElementById('focus-value') as HTMLSpanElement;

    focusModeSelect.addEventListener('change', () => {
        const mode = parseInt(focusModeSelect.value);
        window.obsbot.focus.setAutoMode(mode);
        // Show manual focus slider only in manual mode (3)
        manualFocusControl.style.display = mode === 3 ? 'block' : 'none';
    });

    focusSlider.addEventListener('input', () => {
        focusValue.textContent = focusSlider.value;
    });
    focusSlider.addEventListener('change', () => {
        window.obsbot.focus.set(parseInt(focusSlider.value));
    });
    document.getElementById('face-focus')?.addEventListener('change', (e) => {
        window.obsbot.focus.setFace((e.target as HTMLInputElement).checked);
    });

    // Exposure
    document.getElementById('exposure-mode')?.addEventListener('change', (e) => {
        window.obsbot.exposure.setMode(parseInt((e.target as HTMLSelectElement).value));
    });
    const exposureSlider = document.getElementById('exposure-slider') as HTMLInputElement;
    const exposureValue = document.getElementById('exposure-value') as HTMLSpanElement;
    exposureSlider.addEventListener('input', () => {
        exposureValue.textContent = exposureSlider.value;
    });
    exposureSlider.addEventListener('change', () => {
        window.obsbot.exposure.set(parseInt(exposureSlider.value));
    });
    document.getElementById('ae-lock')?.addEventListener('change', (e) => {
        window.obsbot.exposure.setAELock((e.target as HTMLInputElement).checked);
    });

    // White balance
    const wbMode = document.getElementById('wb-mode') as HTMLSelectElement;
    const wbManualControl = document.getElementById('wb-manual-control') as HTMLDivElement;
    wbMode.addEventListener('change', () => {
        const mode = parseInt(wbMode.value);
        wbManualControl.style.display = mode === 1 ? 'block' : 'none';
        const wbSlider = document.getElementById('wb-slider') as HTMLInputElement;
        window.obsbot.whiteBalance.set(mode, parseInt(wbSlider.value));
    });
    const wbSlider = document.getElementById('wb-slider') as HTMLInputElement;
    const wbValue = document.getElementById('wb-value') as HTMLSpanElement;
    wbSlider.addEventListener('input', () => {
        wbValue.textContent = `${wbSlider.value}K`;
    });
    wbSlider.addEventListener('change', () => {
        window.obsbot.whiteBalance.set(1, parseInt(wbSlider.value));
    });

    // Image adjustments
    setupSlider('brightness', (val) => window.obsbot.image.setBrightness(val));
    setupSlider('contrast', (val) => window.obsbot.image.setContrast(val));
    setupSlider('saturation', (val) => window.obsbot.image.setSaturation(val));
    setupSlider('sharpness', (val) => window.obsbot.image.setSharpness(val));

    // HDR
    document.getElementById('hdr-mode')?.addEventListener('change', (e) => {
        window.obsbot.hdr.set(parseInt((e.target as HTMLSelectElement).value));
    });

    // FOV
    document.querySelectorAll('.fov-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            const fov = parseInt((btn as HTMLButtonElement).dataset.fov || '0');
            window.obsbot.fov.set(fov);
            document.querySelectorAll('.fov-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // Mirror/Flip
    document.querySelectorAll('.mirror-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            const mode = parseInt((btn as HTMLButtonElement).dataset.mode || '0');
            window.obsbot.mirrorFlip.set(mode);
            document.querySelectorAll('.mirror-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // Anti-flicker
    document.querySelectorAll('.flicker-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            const mode = parseInt((btn as HTMLButtonElement).dataset.mode || '0');
            window.obsbot.antiFlicker.set(mode);
            document.querySelectorAll('.flicker-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // AI controls
    document.getElementById('ai-enabled')?.addEventListener('change', (e) => {
        window.obsbot.ai.setEnabled((e.target as HTMLInputElement).checked);
    });
    document.getElementById('ai-mode')?.addEventListener('change', () => {
        const mode = parseInt((document.getElementById('ai-mode') as HTMLSelectElement).value);
        const subMode = parseInt((document.getElementById('ai-submode') as HTMLSelectElement).value);
        window.obsbot.ai.setMode(mode, subMode);
    });
    document.getElementById('ai-submode')?.addEventListener('change', () => {
        const mode = parseInt((document.getElementById('ai-mode') as HTMLSelectElement).value);
        const subMode = parseInt((document.getElementById('ai-submode') as HTMLSelectElement).value);
        window.obsbot.ai.setMode(mode, subMode);
    });
    document.getElementById('tracking-speed')?.addEventListener('change', (e) => {
        window.obsbot.ai.setTrackingSpeed(parseInt((e.target as HTMLSelectElement).value));
    });
    document.getElementById('auto-zoom')?.addEventListener('change', (e) => {
        window.obsbot.ai.setAutoZoom((e.target as HTMLInputElement).checked);
    });
    document.getElementById('select-central')?.addEventListener('click', () => {
        window.obsbot.ai.selectCentral();
    });
    document.getElementById('select-biggest')?.addEventListener('click', () => {
        window.obsbot.ai.selectBiggest();
    });
    document.getElementById('deselect-target')?.addEventListener('click', () => {
        window.obsbot.ai.deselect();
    });

    // Gesture controls
    document.querySelectorAll('[data-gesture]').forEach((checkbox) => {
        checkbox.addEventListener('change', (e) => {
            const gesture = parseInt((checkbox as HTMLInputElement).dataset.gesture || '0');
            window.obsbot.ai.setGesture(gesture, (e.target as HTMLInputElement).checked);
        });
    });

    // Presets
    document.getElementById('save-boot-position')?.addEventListener('click', () => {
        window.obsbot.preset.setBoot();
    });
    document.getElementById('goto-boot-position')?.addEventListener('click', () => {
        window.obsbot.preset.triggerBoot();
    });
    document.getElementById('add-preset')?.addEventListener('click', async () => {
        await window.obsbot.preset.add();
        await loadPresets();
    });
}

function setupSlider(name: string, callback: (value: number) => void) {
    const slider = document.getElementById(`${name}-slider`) as HTMLInputElement;
    const valueEl = document.getElementById(`${name}-value`) as HTMLSpanElement;

    slider.addEventListener('input', () => {
        valueEl.textContent = slider.value;
    });
    slider.addEventListener('change', () => {
        callback(parseInt(slider.value));
    });
}

// Audio Visualizer
async function initAudioVisualizer() {
    const canvas = document.getElementById('audio-visualizer') as HTMLCanvasElement;
    const toggleBtn = document.getElementById('toggle-audio') as HTMLButtonElement;
    const typeSelect = document.getElementById('visualizer-type') as HTMLSelectElement;
    const levelBar = document.querySelector('.level-bar') as HTMLDivElement;
    const levelValue = document.querySelector('.level-value') as HTMLSpanElement;

    toggleBtn.addEventListener('click', async () => {
        if (audioEnabled) {
            stopAudioVisualizer();
            toggleBtn.textContent = 'Enable Mic';
            toggleBtn.classList.remove('bg-red-500/20', 'text-red-400', 'border-red-500/50');
            toggleBtn.classList.add('bg-white/5', 'border-white/10');
        } else {
            await startAudioVisualizer(canvas, levelBar, levelValue);
            toggleBtn.textContent = 'Disable Mic';
            toggleBtn.classList.remove('bg-white/5', 'border-white/10');
            toggleBtn.classList.add('bg-red-500/20', 'text-red-400', 'border-red-500/50');
        }
    });

    typeSelect.addEventListener('change', () => {
        visualizerType = typeSelect.value as 'bars' | 'waveform' | 'circular';
    });

    // Auto-start mic on load
    try {
        await startAudioVisualizer(canvas, levelBar, levelValue);
        toggleBtn.textContent = 'Disable Mic';
        toggleBtn.classList.remove('bg-white/5', 'border-white/10');
        toggleBtn.classList.add('bg-red-500/20', 'text-red-400', 'border-red-500/50');
    } catch (error) {
        console.warn('Failed to auto-start mic:', error);
    }
}

async function startAudioVisualizer(
    canvas: HTMLCanvasElement,
    levelBar: HTMLDivElement,
    levelValue: HTMLSpanElement
) {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioDevices = devices.filter(d => d.kind === 'audioinput');

        // Find the OBSBOT device mic
        const obsbotMic = audioDevices.find(d =>
            d.label.toLowerCase().includes('obsbot') ||
            (currentDevice && d.label.toLowerCase().includes(currentDevice.name.toLowerCase()))
        );

        const constraints: MediaStreamConstraints = {
            audio: obsbotMic ? { deviceId: { exact: obsbotMic.deviceId } } : true,
            video: false
        };

        try {
            audioStream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch {
            audioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        }

        // Create audio context and analyser
        audioContext = new AudioContext();
        if (audioContext.state === 'suspended') {
            await audioContext.resume();
        }
        audioAnalyser = audioContext.createAnalyser();
        audioAnalyser.fftSize = 256;
        audioAnalyser.smoothingTimeConstant = 0.8;

        const source = audioContext.createMediaStreamSource(audioStream);
        source.connect(audioAnalyser);

        audioEnabled = true;

        // Start visualization loop
        const ctx = canvas.getContext('2d')!;
        const bufferLength = audioAnalyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        const timeDataArray = new Uint8Array(bufferLength);

        let frameCount = 0;
        function draw() {
            if (!audioEnabled || !audioAnalyser) return;

            audioAnimationId = requestAnimationFrame(draw);

            // Get frequency and time domain data
            audioAnalyser.getByteFrequencyData(dataArray);
            audioAnalyser.getByteTimeDomainData(timeDataArray);

            frameCount++;

            // Clear canvas
            const width = canvas.width = canvas.offsetWidth;
            const height = canvas.height = canvas.offsetHeight;
            ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg-primary').trim();
            ctx.fillRect(0, 0, width, height);

            // Draw based on visualizer type
            switch (visualizerType) {
                case 'bars':
                    drawBars(ctx, dataArray, width, height);
                    break;
                case 'waveform':
                    drawWaveform(ctx, timeDataArray, width, height);
                    break;
                case 'circular':
                    drawCircular(ctx, dataArray, width, height);
                    break;
            }

            // Update level meter
            updateLevelMeter(dataArray, levelBar, levelValue);
        }

        draw();
    } catch (error) {
        console.error('Failed to start audio visualizer:', error);
        alert('Failed to access microphone. ' + (error instanceof Error ? error.message : String(error)));
    }
}

function stopAudioVisualizer() {
    audioEnabled = false;

    if (audioAnimationId) {
        cancelAnimationFrame(audioAnimationId);
        audioAnimationId = null;
    }

    if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
        audioStream = null;
    }

    if (audioContext) {
        audioContext.close();
        audioContext = null;
        audioAnalyser = null;
    }

    // Clear canvas
    const canvas = document.getElementById('audio-visualizer') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d');
    if (ctx) {
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg-primary').trim();
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Reset level meter
    const levelBar = document.querySelector('.level-bar') as HTMLDivElement;
    const levelValue = document.querySelector('.level-value') as HTMLSpanElement;
    levelBar.style.setProperty('--level', '0%');
    levelValue.textContent = '-∞ dB';
}

function drawBars(ctx: CanvasRenderingContext2D, dataArray: Uint8Array, width: number, height: number) {
    const barCount = 32;
    const barWidth = width / barCount - 2;
    const step = Math.floor(dataArray.length / barCount);

    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
    const success = getComputedStyle(document.documentElement).getPropertyValue('--success').trim();

    for (let i = 0; i < barCount; i++) {
        const value = dataArray[i * step];
        const barHeight = (value / 255) * height * 0.9;

        // Gradient from success (green) to accent (red)
        const gradient = ctx.createLinearGradient(0, height, 0, height - barHeight);
        gradient.addColorStop(0, success);
        gradient.addColorStop(1, accent);

        ctx.fillStyle = gradient;
        ctx.fillRect(i * (barWidth + 2) + 1, height - barHeight, barWidth, barHeight);
    }
}

function drawWaveform(ctx: CanvasRenderingContext2D, dataArray: Uint8Array, width: number, height: number) {
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();

    ctx.lineWidth = 2;
    ctx.strokeStyle = accent;
    ctx.beginPath();

    const sliceWidth = width / dataArray.length;
    let x = 0;

    for (let i = 0; i < dataArray.length; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * height) / 2;

        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }

        x += sliceWidth;
    }

    ctx.lineTo(width, height / 2);
    ctx.stroke();
}

function drawCircular(ctx: CanvasRenderingContext2D, dataArray: Uint8Array, width: number, height: number) {
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.3;

    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
    const success = getComputedStyle(document.documentElement).getPropertyValue('--success').trim();

    const barCount = 64;
    const step = Math.floor(dataArray.length / barCount);

    for (let i = 0; i < barCount; i++) {
        const value = dataArray[i * step];
        const barLength = (value / 255) * radius;
        const angle = (i / barCount) * Math.PI * 2 - Math.PI / 2;

        const x1 = centerX + Math.cos(angle) * radius * 0.5;
        const y1 = centerY + Math.sin(angle) * radius * 0.5;
        const x2 = centerX + Math.cos(angle) * (radius * 0.5 + barLength);
        const y2 = centerY + Math.sin(angle) * (radius * 0.5 + barLength);

        // Color based on value
        const hue = 150 - (value / 255) * 150; // Green to red
        ctx.strokeStyle = `hsl(${hue}, 70%, 50%)`;
        ctx.lineWidth = 3;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    }

    // Draw center circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.4, 0, Math.PI * 2);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.stroke();
}

function updateLevelMeter(dataArray: Uint8Array, levelBar: HTMLDivElement, levelValue: HTMLSpanElement) {
    // Calculate RMS (Root Mean Square) for dB level
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
        const normalized = dataArray[i] / 255;
        sum += normalized * normalized;
    }
    const rms = Math.sqrt(sum / dataArray.length);

    // Convert to dB
    const db = rms > 0 ? 20 * Math.log10(rms) : -Infinity;

    // Update level bar (0% to 100%)
    const level = Math.min(100, Math.max(0, (rms * 100) * 2));
    levelBar.style.setProperty('--level', `${level}%`);

    // Update level value
    if (db === -Infinity) {
        levelValue.textContent = '-∞ dB';
    } else {
        levelValue.textContent = `${db.toFixed(1)} dB`;
    }
}

// Recording functions
function setupRecording() {
    const recordBtn = document.getElementById('record-btn') as HTMLButtonElement;
    const recordTimer = document.getElementById('record-timer') as HTMLSpanElement;

    recordBtn.addEventListener('click', async () => {
        if (isRecording) {
            await stopRecording();
        } else {
            await startRecording();
        }
    });
}

// Canvas and animation frame for recording
let recordingCanvas: HTMLCanvasElement | null = null;
let recordingCtx: CanvasRenderingContext2D | null = null;
let recordingAnimationId: number | null = null;

// Check for FFmpeg hardware encoders on startup
async function checkFFmpegEncoders() {
    try {
        ffmpegEncoders = await window.obsbot.ffmpeg.checkEncoders();
        useFFmpegRecording = ffmpegEncoders.hasNvenc || ffmpegEncoders.hasVaapi;
    } catch {
        useFFmpegRecording = false;
    }
}

async function startRecording() {
    if (!videoStream) {
        alert('Please start the preview first before recording.');
        return;
    }

    const recordBtn = document.getElementById('record-btn') as HTMLButtonElement;
    const recordTimer = document.getElementById('record-timer') as HTMLSpanElement;

    const videoTrack = videoStream.getVideoTracks()[0];
    const settings = videoTrack.getSettings();

    // Use FFmpeg hardware encoding if available, otherwise fall back to MediaRecorder
    if (useFFmpegRecording && ffmpegEncoders) {
        await startFFmpegRecording(settings, recordBtn, recordTimer);
    } else {
        await startMediaRecorderRecording(settings, recordBtn, recordTimer);
    }
}

async function startFFmpegRecording(
    settings: MediaTrackSettings,
    recordBtn: HTMLButtonElement,
    recordTimer: HTMLSpanElement
) {
    // Find the video device path for direct capture
    // Use 'obsbot' as search term since it's reliably in the v4l2 device name
    const deviceName = 'obsbot';
    const devicePath = await window.obsbot.ffmpeg.findVideoDevice(deviceName);

    if (!devicePath) {
        alert('Could not find video device. Falling back to software encoding.');
        await startMediaRecorderRecording(settings, recordBtn, recordTimer);
        return;
    }

    // Find the audio device (OBSBOT microphone)
    const audioDevice = await window.obsbot.ffmpeg.findAudioDevice(deviceName);

    const recordWidth = settings.width || 3840;
    const recordHeight = settings.height || 2160;
    const fps = 30;

    // Stop browser preview to release the device for FFmpeg
    stopVideoPreview();

    // Show "Recording" instead of "No Signal" while recording
    const placeholderIcon = videoPlaceholder.querySelector('i');
    const placeholderText = videoPlaceholder.querySelector('span');
    if (placeholderIcon) {
        placeholderIcon.setAttribute('data-lucide', 'disc');
        placeholderIcon.classList.add('text-red-500');
        // Re-render the icon
        (window as any).lucide.createIcons();
    }
    if (placeholderText) {
        placeholderText.textContent = 'Recording';
        placeholderText.classList.add('text-red-500');
    }

    await new Promise(resolve => setTimeout(resolve, 500));

    const useNvenc = ffmpegEncoders!.hasNvenc;

    const result = await window.obsbot.ffmpeg.startRecording({
        width: recordWidth,
        height: recordHeight,
        fps,
        useNvenc,
        devicePath,
        audioDevice: audioDevice || undefined
    });

    if (!result.success) {
        await startVideoPreview();
        alert('Failed to start hardware recording. Falling back to software encoding.');
        await startMediaRecorderRecording(settings, recordBtn, recordTimer);
        return;
    }

    // No frame capture loop needed - FFmpeg reads directly from the device!
    isRecording = true;
    recordingStartTime = Date.now();

    // Update UI
    recordBtn.classList.add('recording');
    recordBtn.textContent = 'Stop';
    recordTimer.classList.remove('hidden');

    // Start timer display
    recordingTimerInterval = window.setInterval(() => {
        const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
        const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
        const seconds = (elapsed % 60).toString().padStart(2, '0');
        recordTimer.textContent = `${minutes}:${seconds}`;
    }, 1000);
}

async function startMediaRecorderRecording(
    settings: MediaTrackSettings,
    recordBtn: HTMLButtonElement,
    recordTimer: HTMLSpanElement
) {
    // Create offscreen canvas at 1080p for software encoding (4x fewer pixels than 4K)
    const recordWidth = 1920;
    const recordHeight = 1080;
    recordingCanvas = document.createElement('canvas');
    recordingCanvas.width = recordWidth;
    recordingCanvas.height = recordHeight;
    recordingCtx = recordingCanvas.getContext('2d', { alpha: false })!;

    const canvasStream = recordingCanvas.captureStream(30);

    // Add audio track if available
    if (audioStream) {
        audioStream.getAudioTracks().forEach(track => {
            canvasStream.addTrack(track.clone());
        });
    }

    recordingStream = canvasStream;

    // Start drawing video to canvas at ~30fps
    let lastFrameTime = 0;
    const frameInterval = 1000 / 30;

    const drawFrame = (timestamp: number) => {
        if (!isRecording || !recordingCtx || !recordingCanvas) return;

        if (timestamp - lastFrameTime >= frameInterval) {
            recordingCtx.drawImage(videoPreview, 0, 0, recordingCanvas.width, recordingCanvas.height);
            lastFrameTime = timestamp;
        }

        recordingAnimationId = requestAnimationFrame(drawFrame);
    };

    // Determine best codec
    let mimeType: string;
    if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) {
        mimeType = 'video/webm;codecs=vp8,opus';
    } else if (MediaRecorder.isTypeSupported('video/webm;codecs=h264,opus')) {
        mimeType = 'video/webm;codecs=h264,opus';
    } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')) {
        mimeType = 'video/webm;codecs=vp9,opus';
    } else {
        mimeType = 'video/webm';
    }

    try {
        mediaRecorder = new MediaRecorder(canvasStream, {
            mimeType,
            videoBitsPerSecond: 8000000
        });

        recordedChunks = [];

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };

        mediaRecorder.onstop = async () => {
            const blob = new Blob(recordedChunks, { type: mimeType });
            const arrayBuffer = await blob.arrayBuffer();
            await window.obsbot.saveRecording(arrayBuffer, mimeType);
            recordedChunks = [];
        };

        recordingAnimationId = requestAnimationFrame(drawFrame);
        mediaRecorder.start(1000);
        isRecording = true;
        recordingStartTime = Date.now();

        recordBtn.classList.add('recording');
        recordBtn.textContent = 'Stop';
        recordTimer.classList.remove('hidden');

        recordingTimerInterval = window.setInterval(() => {
            const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
            const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
            const seconds = (elapsed % 60).toString().padStart(2, '0');
            recordTimer.textContent = `${minutes}:${seconds}`;
        }, 1000);

    } catch (error) {
        console.error('Failed to start recording:', error);
        alert('Failed to start recording. Your browser may not support this feature.');
    }
}

async function stopRecording() {
    if (!isRecording) return;

    const recordBtn = document.getElementById('record-btn') as HTMLButtonElement;
    const recordTimer = document.getElementById('record-timer') as HTMLSpanElement;

    isRecording = false;

    // Stop FFmpeg or MediaRecorder
    if (useFFmpegRecording && !mediaRecorder) {
        // Restore placeholder to "No Signal" before restarting preview
        const placeholderIcon = videoPlaceholder.querySelector('i');
        const placeholderText = videoPlaceholder.querySelector('span');
        if (placeholderIcon) {
            placeholderIcon.setAttribute('data-lucide', 'video-off');
            placeholderIcon.classList.remove('text-red-500');
            (window as any).lucide.createIcons();
        }
        if (placeholderText) {
            placeholderText.textContent = 'No Signal';
            placeholderText.classList.remove('text-red-500');
        }

        await window.obsbot.ffmpeg.stopRecording();
        await startVideoPreview();
    } else if (mediaRecorder) {
        // MediaRecorder recording - stop frame capture loop first
        if (recordingAnimationId) {
            cancelAnimationFrame(recordingAnimationId);
            recordingAnimationId = null;
        }
        mediaRecorder.stop();
        mediaRecorder = null;
    }

    // Clean up canvas (only used by MediaRecorder fallback now)
    recordingCanvas = null;
    recordingCtx = null;

    // Stop tracks used for recording
    if (recordingStream) {
        recordingStream.getTracks().forEach(track => track.stop());
        recordingStream = null;
    }

    // Update UI
    recordBtn.classList.remove('recording');
    recordBtn.textContent = 'Record';
    recordTimer.classList.add('hidden');
    recordTimer.textContent = '00:00';

    // Stop timer
    if (recordingTimerInterval) {
        clearInterval(recordingTimerInterval);
        recordingTimerInterval = null;
    }
}

// Start the app
init().catch(console.error);

// Initialize recording
setupRecording();

export {};
