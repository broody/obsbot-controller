# OBSBOT Controller - Architecture Document

## Overview

OBSBOT Controller is an Electron-based desktop application for Linux that provides a graphical interface to control OBSBOT webcams. The application enables device management, live video preview, gimbal control, camera settings adjustment, AI tracking configuration, audio visualization, and video recording.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Electron Application                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────┐         ┌────────────────────────┐  │
│  │   Main Process     │   IPC   │   Renderer Process     │  │
│  │   (Node.js)        │◄───────►│   (Chromium)           │  │
│  │                    │         │                        │  │
│  │  ┌──────────────┐  │         │  ┌──────────────────┐  │  │
│  │  │ Native Addon │  │         │  │  Web UI          │  │  │
│  │  │ (C++ N-API)  │  │         │  │  (HTML/CSS/TS)   │  │  │
│  │  └──────┬───────┘  │         │  └──────────────────┘  │  │
│  │         │          │         │                        │  │
│  └─────────┼──────────┘         └────────────────────────┘  │
│            │                                                 │
└────────────┼─────────────────────────────────────────────────┘
             │
             ▼
┌────────────────────────┐
│   OBSBOT SDK           │
│   (libdev.so)          │
│                        │
│   USB/UVC Interface    │
└────────────────────────┘
```

## Directory Structure

```
obsbot-controller/
├── src/
│   ├── main/                 # Electron main process
│   │   ├── index.ts          # Entry point, IPC handlers
│   │   └── preload.ts        # Context bridge (IPC security)
│   │
│   ├── native/               # C++ native bindings
│   │   ├── obsbot_addon.cpp  # N-API module initialization
│   │   ├── device_wrapper.cpp # Device method implementations
│   │   └── device_wrapper.hpp # Device wrapper declarations
│   │
│   └── renderer/             # Frontend UI
│       ├── index.html        # HTML layout
│       ├── main.ts           # UI logic and state
│       └── styles.css        # Dark theme styling
│
├── dist/                     # Compiled output
│   ├── main/                 # Compiled main process JS
│   └── renderer/             # Bundled frontend assets
│
├── build/Release/            # Compiled native addon
│   └── obsbot_native.node
│
├── binding.gyp               # Native addon build config
├── package.json              # Dependencies and scripts
├── tsconfig.json             # Renderer TypeScript config
├── tsconfig.main.json        # Main process TypeScript config
└── vite.config.ts            # Frontend bundler config
```

## Core Components

### 1. Main Process (`src/main/index.ts`)

The main process handles:
- Window lifecycle management
- Native addon loading and SDK initialization
- Device state tracking
- IPC request/response handling
- File system operations (recording save)

**Key responsibilities:**
- Loads `obsbot_native.node` on startup
- Initializes SDK and registers device change callbacks
- Exposes 65+ IPC handlers for camera control
- Manages the `currentDevice` reference

### 2. Preload Script (`src/main/preload.ts`)

Securely exposes native methods to the renderer via Electron's `contextBridge`:

```typescript
window.obsbot = {
  getDevices, selectDevice, getEnums, onDeviceChanged,
  gimbal: { setSpeed, setAngle, stop, reset, getState },
  preset: { add, delete, trigger, getList, setBoot, triggerBoot },
  zoom: { set, get, getRange },
  focus: { set, get, setFace, getRange, setAutoMode, getAutoMode },
  exposure: { setMode, getMode, set, get, setAELock },
  whiteBalance: { set, get, getRange },
  image: { setBrightness, getContrast, setSaturation, setSharpness, setHue },
  hdr: { set, get },
  fov: { set },
  mirrorFlip: { set, get },
  ai: { setEnabled, setMode, setTrackingSpeed, ... },
  device: { setStatus, setSleepTimeout },
  antiFlicker: { set },
  saveRecording
}
```

### 3. Native C++ Bindings (`src/native/`)

| File | Purpose |
|------|---------|
| `obsbot_addon.cpp` | N-API module init, SDK wrappers, enum exports |
| `device_wrapper.cpp` | Individual device method implementations |
| `device_wrapper.hpp` | DeviceWrapper class declarations |

**Exposed Enums:**
- `ProductTypes` - Tiny, Tiny4K, Tiny2, Meet, Meet4K, TailAir, Me, etc.
- `AIModes` - None, Group, Human, Hand, WhiteBoard, Desk
- `AISubModes` - Normal, UpperBody, CloseUp, HeadHide, LowerBody
- `TrackSpeeds` - Lazy, Slow, Standard, Fast, Crazy, Auto
- `FOVTypes` - Wide86, Medium78, Narrow65
- `WhiteBalanceTypes` - Auto, Manual, Daylight, Fluorescent, Tungsten, Cloudy, Shade
- `DeviceStatuses` - Run, Sleep, Privacy

### 4. Renderer UI (`src/renderer/`)

**main.ts** manages:
- Device selection and connection
- Video/audio stream handling via WebRTC
- Canvas-based audio visualization (bars, waveform, circular)
- MediaRecorder for video recording
- UI event handling and state updates

**index.html** layout:
```
<header>  Device selector + refresh
<main>
  <video-section>
    - Live preview
    - Recording controls
    - Audio visualizer
  <controls-panel>
    <tabs>
      - Gimbal (joystick, position, reset)
      - Camera (zoom, focus, exposure, WB, image settings, HDR, FOV)
      - AI (tracking modes, speed, gestures)
      - Presets (boot position, saved positions)
```

## Data Flow

### IPC Communication Pattern

```
Renderer                    Main Process              Native Addon
   │                             │                         │
   │ invoke('zoom-set', 50)      │                         │
   │────────────────────────────►│                         │
   │                             │ currentDevice.setZoom() │
   │                             │────────────────────────►│
   │                             │                         │ SDK call
   │                             │◄────────────────────────│
   │                             │ return status           │
   │◄────────────────────────────│                         │
   │ Promise resolves            │                         │
```

### Device Change Events

```
OBSBOT SDK ──► Native Callback ──► ThreadSafeFunction ──► Main Process
                                                              │
                                                              ▼
                                                   webContents.send('device-changed')
                                                              │
                                                              ▼
                                                       Renderer listener
                                                              │
                                                              ▼
                                                      refreshDevices()
```

### Media Streams

**Video Preview:**
```
USB Camera ──► getUserMedia() ──► MediaStream ──► <video> element
```

**Audio Visualization:**
```
USB Microphone ──► getUserMedia() ──► AudioContext ──► AnalyserNode ──► Canvas
```

**Recording:**
```
Video + Audio Streams ──► MediaRecorder ──► Blob chunks ──► IPC ──► fs.writeFile
```

## Key Data Structures

```typescript
interface DeviceInfo {
  name: string;
  serialNumber: string;
  productType: number;
  videoDevicePath: string;
  audioDevicePath: string;
  version: string;
  modelCode: string;
}

interface GimbalState {
  pitch: number;
  yaw: number;
  roll: number;
  motorPitch: number;
  motorYaw: number;
  motorRoll: number;
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

interface Range {
  min: number;
  max: number;
  step: number;
  default: number;
}
```

## External Dependencies

### Runtime
- **OBSBOT SDK** (`libdev.so`) - Hardware control library
- **electron-store** - Persistent configuration (available but unused)

### Build
- **electron** (v28) - Desktop framework
- **typescript** (v5.3) - Type checking
- **vite** (v5) - Frontend bundler
- **node-gyp** (v10) - Native addon compilation
- **node-addon-api** (v7) - C++ N-API bindings

### Browser APIs
- **WebRTC** - Video/audio capture
- **Web Audio API** - Audio analysis
- **Canvas API** - Visualization rendering
- **MediaRecorder** - Video recording

## Build Pipeline

```
npm run build
├── build:native   →  node-gyp rebuild  →  build/Release/obsbot_native.node
├── build:main     →  tsc               →  dist/main/*.js
└── build:renderer →  vite build        →  dist/renderer/
```

**Development:**
```
npm run dev
├── dev:main     →  tsc + electron (with watch)
└── dev:renderer →  vite dev server (:5173 with HMR)
```

## Security Model

| Feature | Implementation |
|---------|---------------|
| Context Isolation | `contextIsolation: true` - No direct Node access from renderer |
| IPC Bridge | Only explicitly exposed methods via `contextBridge` |
| File Access | User-initiated via Electron dialog API only |
| Device Access | Requires udev rules (vendor ID 3553) |

## IPC Handler Categories

| Category | Examples | Count |
|----------|----------|-------|
| Device Management | `get-devices`, `select-device`, `get-enums` | 3 |
| Gimbal Control | `gimbal-set-speed`, `gimbal-set-angle`, `gimbal-stop` | 5 |
| Presets | `preset-add`, `preset-delete`, `preset-trigger` | 6 |
| Zoom/Focus | `zoom-set/get`, `focus-set/get`, `focus-set-face` | 10 |
| Exposure | `exposure-set-mode`, `exposure-set`, `exposure-set-ae-lock` | 5 |
| White Balance | `wb-set/get`, `wb-get-range` | 3 |
| Image Quality | `image-set-brightness/contrast/saturation/sharpness/hue` | 10 |
| Advanced | `hdr-set/get`, `fov-set`, `mirror-flip-set/get`, `ai-*` | 20+ |
| Recording | `save-recording` | 1 |

## Performance Characteristics

| Metric | Value |
|--------|-------|
| Gimbal Polling | 2000ms interval |
| Settings Load | ~1.5s (with retries) |
| Audio Analysis | 60 fps, 256-point FFT |
| Recording Bitrate | 5 Mbps (VP9/VP8 + Opus) |
| Memory Usage | ~100-150 MB typical |

## Platform Requirements

- **OS:** Linux (Ubuntu 20.04+)
- **Architecture:** x86_64
- **Display:** 1000x700px minimum
- **USB:** OBSBOT device connected
- **Permissions:** udev rules for USB access
