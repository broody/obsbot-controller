{
  "targets": [
    {
      "target_name": "obsbot_native",
      "cflags!": ["-fno-exceptions"],
      "cflags_cc!": ["-fno-exceptions"],
      "cflags_cc": ["-std=c++17", "-fexceptions"],
      "sources": [
        "src/native/obsbot_addon.cpp",
        "src/native/device_wrapper.cpp"
      ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")",
        "sdk/include"
      ],
      "libraries": [
        "-L<(module_root_dir)/sdk/lib",
        "-ldev"
      ],
      "copies": [
        {
          "destination": "<(PRODUCT_DIR)",
          "files": [
            "<(module_root_dir)/sdk/lib/libdev.so",
            "<(module_root_dir)/sdk/lib/libdev.so.1",
            "<(module_root_dir)/sdk/lib/libdev.so.1.0.2"
          ]
        }
      ],
      "defines": ["NAPI_DISABLE_CPP_EXCEPTIONS"],
      "conditions": [
        ["OS=='linux'", {
          "cflags": ["-fPIC"],
          "ldflags": [
            "-Wl,-rpath,'$$ORIGIN'"
          ]
        }]
      ]
    }
  ]
}