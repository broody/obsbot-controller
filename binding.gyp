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
        "../libdev_v2.1.0_7/include"
      ],
      "libraries": [
        "-L<(module_root_dir)/../libdev_v2.1.0_7/linux\\(beta\\)/x86_64-release",
        "-ldev",
        "-Wl,-rpath,<(module_root_dir)/../libdev_v2.1.0_7/linux\\(beta\\)/x86_64-release"
      ],
      "defines": ["NAPI_DISABLE_CPP_EXCEPTIONS"],
      "conditions": [
        ["OS=='linux'", {
          "cflags": ["-fPIC"],
          "ldflags": [
            "-Wl,-rpath,'$$ORIGIN/../libdev_v2.1.0_7/linux(beta)/x86_64-release'"
          ]
        }]
      ]
    }
  ]
}
