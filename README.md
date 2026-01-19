# OBSBOT Controller

An Electron application for controlling OBSBOT webcams on Linux. This app provides a graphical interface to control all features of the OBSBOT webcam driver.

## Features

- **Live Video Preview**: View the webcam feed directly in the application
- **Gimbal Control**: Control camera pan/tilt with a virtual joystick
- **Zoom Control**: Adjust digital zoom
- **Focus Control**: Manual focus and face auto-focus
- **Exposure Settings**: Auto/manual exposure, AE lock
- **White Balance**: Multiple presets and manual temperature control
- **Image Adjustments**: Brightness, contrast, saturation, sharpness
- **HDR/WDR Mode**: Toggle high dynamic range
- **Field of View**: Switch between 86°, 78°, and 65° FOV
- **Mirror/Flip**: Horizontal and vertical image flip
- **AI Tracking**: Enable AI-powered subject tracking with multiple modes
- **Preset Positions**: Save and recall camera positions
- **Gesture Control**: Enable/disable gesture recognition features

## OBSBOT SDK

The OBSBOT driver/SDK is not open source. Ideally, you should request the SDK from [https://www.obsbot.com/sdk](https://www.obsbot.com/sdk).

However, for convenience, the necessary library files (`libdev.so` and headers) have been bundled into this repository under the `sdk/` directory. This allows the application to build and run without external dependencies.

## Supported Devices

- OBSBOT Tiny series (Tiny, Tiny 4K, Tiny 2, Tiny 2 Lite, Tiny SE)
- OBSBOT Meet series (Meet, Meet 4K, Meet 2, Meet SE)
- OBSBOT Tail series (Tail Air, Tail 2)
- OBSBOT Me

## Prerequisites

### System Requirements

- Ubuntu 20.04 or later (or compatible Linux distribution)
- Node.js 18+ and npm
- Python 3 (for node-gyp)
- C++ build tools

### Install Build Dependencies

```bash
# Install Node.js (if not already installed)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install build tools
sudo apt-get install -y build-essential python3 libudev-dev

# For video capture support
sudo apt-get install -y v4l-utils
```

### USB Device Permissions

To allow the application to communicate with the OBSBOT webcam without root privileges, create a udev rule:

```bash
# Create the rules file
sudo tee /etc/udev/rules.d/99-obsbot.rules << 'EOF'
# OBSBOT Webcam
SUBSYSTEM=="usb", ATTR{idVendor}=="3553", MODE="0666"
EOF

# Reload udev rules
sudo udevadm control --reload-rules
sudo udevadm trigger
```

## Installation

1. Clone the repository:
```bash
cd /home/broody/development/obsbot/electron-app
```

2. Install dependencies:
```bash
npm install
```

3. Build the native addon:
```bash
npm run build:native
```

4. Rebuild for Electron:
```bash
npm run rebuild
```

## Development

Run the application in development mode:

```bash
npm run dev
```

This will:
- Start the Vite dev server for the renderer process
- Compile the main process TypeScript
- Launch Electron with hot reload

## Building for Production

```bash
npm run build
```

This will:
1. Build the native C++ addon
2. Compile TypeScript for the main process
3. Build the renderer with Vite

To run the production build:
```bash
npm start
```

## Project Structure

```
electron-app/
├── sdk/                # Bundled OBSBOT SDK (headers & libs)
├── src/
│   ├── main/           # Electron main process
│   │   ├── index.ts    # Main entry point
│   │   └── preload.ts  # Preload script for IPC
│   ├── renderer/       # Frontend UI
│   │   ├── index.html  # HTML template
│   │   ├── main.ts     # UI logic
│   │   └── styles.css  # Styling
│   └── native/         # C++ native addon
│       ├── obsbot_addon.cpp    # Node.js addon entry
│       └── device_wrapper.cpp  # Device wrapper class
├── binding.gyp         # Native addon build config
├── package.json        # npm configuration
├── tsconfig.main.json  # TypeScript config for main
└── vite.config.ts      # Vite config for renderer
```

## Troubleshooting

### Device not detected

1. Check USB connection: `lsusb | grep -i obsbot`
2. Verify udev rules are applied: `ls -la /dev/bus/usb/*/*`
3. Try unplugging and replugging the device

### Video preview not working

1. Check if the device is being used by another application
2. Verify permissions: `ls -la /dev/video*`
3. Test with: `v4l2-ctl --list-devices`

### Permission denied errors

Run with sudo once to verify it's a permission issue, then fix udev rules:
```bash
sudo npm start
```

### Sandbox error on Linux

If you see an error about chrome-sandbox, you have two options:

1. Run without sandbox (for development):
```bash
electron . --no-sandbox
```

2. Fix sandbox permissions (recommended for production):
```bash
sudo chown root:root node_modules/electron/dist/chrome-sandbox
sudo chmod 4755 node_modules/electron/dist/chrome-sandbox
```

## License

This project uses the OBSBOT SDK which has its own licensing terms. You can request the SDK at [https://www.obsbot.com/sdk](https://www.obsbot.com/sdk).
