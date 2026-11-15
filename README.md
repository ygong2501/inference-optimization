# Reducing CNN Inference Latency on a Laptop NPU and GPU

Yikang Gong · Independent systems project · November 2026

[Interactive case study](https://ygong2501.github.io/inference-optimization/) · [Actual video output](https://ygong2501.github.io/inference-optimization/#video)

## 1. Abstract

I reduced C4F32’s 1080p→4K luminance inference latency by 64–65% on the NPU and 16–19% on the GPU. The changes preserve the learned weights and each backend’s output bits.

| Two-round medians | NPU | GPU |
| --- | --- | --- |
| Historical baseline | 44.46 / 46.15 ms | 21.11 / 21.80 ms |
| Adopted implementation | **16.14 / 16.18 ms** | **17.68 / 17.58 ms** |

The comparison spans driver and resource changes across the optimization campaign. The values measure synchronous Y inference with complete CPU-accessible FP32 output.

## 2. Problem

Conv2 feeds two consumers separated by five convolutions, which extends the lifetime of its feature map. The GPU already fused ReLU and the residual add, but its output path still created intermediate tensors.

The model uses 47,716 parameters and seven convolutions. It takes one 1080p luminance plane and returns one 4K luminance plane. The learned model comes from [Artoriuz/ArtCNN](https://github.com/Artoriuz/ArtCNN); inference uses [OpenVINO](https://github.com/openvinotoolkit/openvino).

## 3. Methods

I modified the NPU compiler to merge halo requirements and share Conv2 subviews in CMX. For the GPU, I retained native convolutions and wrote one output kernel for PixelShuffle, clipping and FP32 conversion.

| Backend | Execution change | Observed plan change |
| --- | --- | --- |
| NPU | Shared residual views; 15 column groups × H6; 6 compute tiles | Conv2/Conv21 planned writeback and explicit spills: 0 |
| GPU | Native convolutions followed by one OpenCL output kernel | 63.28 MiB/frame of intermediate logical reads/writes removed |

These byte counts describe compiler plans or tensor payloads. They are not measurements of physical DDR traffic. [Explore the execution graph](https://ygong2501.github.io/inference-optimization/#architecture).

## 4. Results

Both optimized artifacts match the original model on the six benchmark frames. They also match on all 96 consecutive frames of the demonstration, checked as complete FP32 Y arrays before encoding.

[![Watch the actual GPU/NPU inference output](assets/video/gpu-poster.jpg)](https://ygong2501.github.io/inference-optimization/#video)

The 4.004-second 4K video preserves the source frame rate, 24000/1001 fps. U/V use common bicubic reconstruction. H.264 is a display copy; the exact-output checks precede RGB conversion and encoding. [Validation record](evidence/validation.md).

## 5. Discussion

The 311 ms kernel used scalar gathers and repeated address calculations, with less operand reuse than the native convolutions. Block IO and preloading reduced it to 21.00 ms, but the adopted 17.58 ms path remained faster.

Buffer lifetime analysis, output fusion and matrix reuse can guide other models. Halo rules, layouts, tile counts and register settings need new measurements on each workload. No cross-model speedup is claimed.

## 6. Conclusion

The adopted paths execute the same model faster while preserving its output bits. The NPU runs at 16.14–16.18 ms and the GPU at 17.58–17.68 ms. The next step is to measure the complete playback path and continue toward 15 ms single-frame latency.

Decode, chroma reconstruction, encoding and display are outside the published inference times. Continuous playback and energy remain unvalidated. [Measurement protocol](evidence/methodology.md) · [Résumé bullets](RESUME.md).

<details>
<summary>Website maintenance</summary>

The site uses plain HTML, CSS, SVG and JavaScript. Serve this directory over HTTP, for example with `python -m http.server 8090 --bind 127.0.0.1`. No frontend build is required.

The GitHub Pages workflow deploys the static repository contents. All asset links are relative. The original workspace keeps the evidence exporter locally; it is not included in this public repository. Internal compiler patches, inference-kernel sources, exact driver details and per-frame fingerprints remain outside the public site.

</details>
