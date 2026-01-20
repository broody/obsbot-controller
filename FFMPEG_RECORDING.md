# FFmpeg Recording with OBSBOT Camera

## Discovered Limitations

### 1. Single Device Access
The OBSBOT camera (and most USB webcams) only allows **one process to access the video device at a time**. This means:
- Browser preview (`getUserMedia`) and FFmpeg **cannot run simultaneously**
- Workaround: Stop browser preview before FFmpeg recording, restart after

### 2. Browser MediaRecorder Performance

| Approach | Preview | Recording | FPS | Status |
|----------|---------|-----------|-----|--------|
| 4K Preview + 1080p Canvas | 4K | 1080p | 30 fps | **Works well** |
| 4K Preview + 4K Canvas | 4K | 4K | ~4 fps | Too slow (getImageData bottleneck) |
| Direct 4K MediaRecorder | 4K | 4K | ~15 fps | Software encoding can't keep up |

**Recommended**: Use 4K preview with 1080p canvas downscale for smooth recording with VP8 codec.

For native 4K recording, use FFmpeg with hardware encoding (see below).

### 3. Codec Support
- `OpenH264` (Chrome's built-in) is **software-only** and slow for 4K
- NVENC/VAAPI hardware encoders are **not exposed** through MediaRecorder API
- VP8 codec works well for 1080p software encoding

---

## Working MediaRecorder Configuration (Software)

For recording with live preview (no FFmpeg required):

```
Preview:   4K (3840x2160) via getUserMedia → <video> element
Recording: 1080p canvas downscale → MediaRecorder (VP8)
```

Settings:
- **Codec**: `video/webm;codecs=vp8,opus`
- **Bitrate**: 8 Mbps
- **Frame rate**: 30 fps (via canvas capture)
- **Resolution**: 1920x1080

This approach allows simultaneous preview and recording since both use the same video stream.

---

## Working FFmpeg Configuration (Hardware)

### Video Device
```
/dev/video0  - OBSBOT Tiny 2 Lite (capture)
/dev/video1  - OBSBOT Tiny 2 Lite (metadata, not for capture)
```

Find device by name:
```bash
cat /sys/class/video4linux/video*/name
```

### Audio Device (PulseAudio/PipeWire)
```
alsa_input.usb-Remo_Tech_Co.__Ltd._OBSBOT_Tiny_2_Lite-02.analog-stereo
```

Find device:
```bash
pactl list sources short | grep -i obsbot
```

---

## Recommended FFmpeg Commands

### Basic 4K Recording (NVIDIA NVENC)
```bash
ffmpeg \
  -f v4l2 \
  -input_format mjpeg \
  -video_size 3840x2160 \
  -framerate 30 \
  -i /dev/video0 \
  -c:v hevc_nvenc \
  -preset p4 \
  -rc vbr \
  -cq 23 \
  -y output.mp4
```

### 4K Recording with Audio
```bash
ffmpeg \
  -f v4l2 \
  -input_format mjpeg \
  -video_size 3840x2160 \
  -framerate 30 \
  -i /dev/video0 \
  -f pulse \
  -i "alsa_input.usb-Remo_Tech_Co.__Ltd._OBSBOT_Tiny_2_Lite-02.analog-stereo" \
  -c:v hevc_nvenc \
  -preset p4 \
  -rc vbr \
  -cq 23 \
  -c:a aac \
  -b:a 192k \
  -y output.mp4
```

### Rolling Segments (for continuous recording)
```bash
ffmpeg \
  -f v4l2 \
  -input_format mjpeg \
  -video_size 3840x2160 \
  -framerate 30 \
  -i /dev/video0 \
  -f pulse \
  -i "alsa_input.usb-Remo_Tech_Co.__Ltd._OBSBOT_Tiny_2_Lite-02.analog-stereo" \
  -c:v hevc_nvenc \
  -preset p4 \
  -rc vbr \
  -cq 23 \
  -c:a aac \
  -b:a 192k \
  -f segment \
  -segment_time 30 \
  -reset_timestamps 1 \
  -strftime 1 \
  "segments/%Y%m%d_%H%M%S.mp4"
```

### Recording + Frame Extraction (for AI analysis)
```bash
ffmpeg \
  -f v4l2 \
  -input_format mjpeg \
  -video_size 3840x2160 \
  -framerate 30 \
  -i /dev/video0 \
  -c:v hevc_nvenc -preset p4 -rc vbr -cq 23 \
  -f segment -segment_time 30 -reset_timestamps 1 \
  segments/video_%03d.mp4 \
  -vf "fps=1/5" \
  -update 1 \
  -q:v 2 \
  snapshot.jpg
```

---

## Encoder Options

### NVIDIA NVENC (Recommended for NVIDIA GPUs)
| Encoder | Codec | Command |
|---------|-------|---------|
| `h264_nvenc` | H.264/AVC | Good compatibility |
| `hevc_nvenc` | H.265/HEVC | Better compression, recommended |
| `av1_nvenc` | AV1 | Best compression, newer GPUs |

Quality presets: `p1` (fastest) to `p7` (best quality), `p4` is good balance.

### Intel Quick Sync
| Encoder | Codec |
|---------|-------|
| `h264_qsv` | H.264 |
| `hevc_qsv` | H.265 |
| `av1_qsv` | AV1 |

### VAAPI (Intel/AMD on Linux)
| Encoder | Codec |
|---------|-------|
| `h264_vaapi` | H.264 |
| `hevc_vaapi` | H.265 |
| `av1_vaapi` | AV1 |

Requires: `-vaapi_device /dev/dri/renderD128`

---

## Input Format Notes

### MJPEG vs Raw
- Use `-input_format mjpeg` for high resolutions (4K)
- MJPEG is compressed on-camera, reducing USB bandwidth
- Raw (`yuyv422`) works but may be limited to lower resolutions

### Supported Resolutions
Check with:
```bash
v4l2-ctl -d /dev/video0 --list-formats-ext
```

Common OBSBOT resolutions:
- 3840x2160 @ 30fps (4K)
- 1920x1080 @ 60fps (1080p)
- 1280x720 @ 60fps (720p)

---

## Graceful Termination

To stop FFmpeg cleanly (finalize file properly):
```bash
# Send SIGINT (same as Ctrl+C)
kill -SIGINT <pid>
```

Do NOT use `SIGKILL` - it will corrupt the output file.

---

## Troubleshooting

### "Device or resource busy"
Another process is using the camera. Check:
```bash
fuser /dev/video0
lsof /dev/video0
```

### No audio in recording
Verify PulseAudio device name:
```bash
pactl list sources short
```

### Choppy/dropped frames
- Reduce resolution
- Use MJPEG input format
- Ensure hardware encoder is being used (check with `nvidia-smi` or `intel_gpu_top`)
