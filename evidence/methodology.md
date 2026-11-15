# Measurement protocol and scope

This case study reports retained experiments from November 2026. Building the portfolio does not rerun inference or old baselines. The public JSON is a projection of those reports, with local paths and host details removed.

## Workload

- Model: [ArtCNN C4F32 by Artoriuz](https://github.com/Artoriuz/ArtCNN). The contribution is inference execution optimization, not training or designing the original network.
- Batch 1, one 1920×1080 floating-point luminance plane; complete 3840×2160 FP32 luminance output. This is spatial super-resolution, not temporal frame interpolation.
- Seven 3×3 stride-one, pad-one convolutions with bias, four ReLUs, a long residual, PixelShuffle ×2 and clamp to [0,1]. Original learned weights are retained.
- Five 32→32 convolutions account for approximately 97% of nominal convolution MACs. That arithmetic share is not a measured latency share.
- Six retained real reference frames. Each backend has its own bitwise reference; cross-backend equality is not claimed.

## Hardware and software

| Component | Configuration |
| --- | --- |
| Processor | Intel Core Ultra 7 258V / Lunar Lake |
| GPU | Intel Arc 140V |
| NPU | Intel AI Boost / NPU 4000 |
| Runtime | OpenVINO |
| Power | AC, Windows Balanced, clocks not locked |

The final NPU executable was compiled with an isolated, modified compiler. It runs with the installed runtime; the installed compiler was not replaced by this experiment. The compiler patch is workload-specific and has not been merged upstream.

## Formal synchronous timing

1. Prepare six caller-owned FP32 host buffers in the same OpenVINO context, and a complete caller-accessible FP32 output.
2. Wait for the CPU-quiet gate (30 seconds); perform a two-second warmup.
3. Disable profiling for formal timing. Include input/output binding and synchronous inference submission/completion. Compilation and loading are outside the timed interval.
4. Run for at least six seconds per round. Report two round medians and p95 values, with complete output hash checks before and after timing.
5. Compare with retained historical baselines. Do not rerun them simply to rebuild this presentation.

| Adopted artifact | Round 1 median / p95 | Round 2 median / p95 | Samples |
| --- | --- | --- | --- |
| NPU | 16.1404 / 16.5316 ms | 16.1767 / 16.5414 ms | 373 / 373 |
| GPU | 17.6821 / 18.0537 ms | 17.57625 / 18.05256 ms | 341 / 342 |

The NPU campaign baseline was 44.46 / 46.15 ms with the default four-tile configuration. The GPU historical baseline was 21.11 / 21.80 ms. Driver versions, enabled NPU resources and buffer policies changed during the campaign. The headline reductions describe the whole campaign, not an isolated same-session A/B or the effect of a single patch. The final GPU runtime retains all seven native convolutions.

## Latency, throughput and diagnostic clocks

Two queued NPU requests produced mean intervals of 14.92076 / 14.88408 ms per frame, but completion latency was 29.8284 / 29.7678 ms. This improves throughput; it does not meet the 15 ms single-frame latency target.

The GPU SLM research route improved from a retained 311.3579 ms initial experiment to a newly measured 21.0024 ms. It remains slower than the adopted native-convolution route and is not a further production speedup. The measurements span experiments; they are not a fresh simultaneous A/B.

Instrumented early/late subgroup barrier spans were approximately 3.42–3.52% / 3.14–3.27%. These percentages use sampled subgroup spans as their denominator. They cannot be summed with other profiler durations or interpreted as fractions of end-to-end wall time. Most sampled span was inside convolution stages, including address calculation, memory fetch, compute and waits.

## Traffic accounting

- Final NPU compiler-plan payload: 26,491,264 bytes read plus 41,955,840 bytes written, 65.276 MiB per frame. Planned Conv2 and Conv21 writeback and explicit spills are zero.
- Adopted GPU tail fusion removes 63.28125 MiB per frame of logical intermediate reads/writes. It still retains native Conv25 output and the complete final output write.
- A complete 3840×2160 FP32 output alone is 33,177,600 bytes (31.640625 MiB). That write must remain.
- These are logical compiler-plan or tensor payload counts, not measurements from physical DDR traffic counters. Cache behavior, DMA overlap and repeated transfers cannot be inferred from them alone.

## Scope and limitations

- **The 15 ms synchronous target remains unmet:** NPU 16.14–16.18 ms; GPU 17.58–17.68 ms.
- Six benchmark reference frames and the new 96-frame clip do not prove bitwise equality for every possible input, another device or another software version.
- The work covers the inference call with complete FP32 output. Video decode, color conversion, display, continuous playback and energy consumption have not been accepted as an end-to-end product result.
- No separately measured physical DDR, DMA or instruction-stall breakdown is claimed. Compiler plans and subgroup timestamps are labeled by what they measure.
- The shared-halo patch is restricted to the tested six-cluster NHWC, row-layout-preserving view pattern. Column count, H6, subgroup shape and GRF256 are workload/hardware choices.
- No cross-model speedup or universal NPU-versus-GPU ranking is claimed. Transferable ideas require new correctness and performance evidence on the new workload.
- This public record includes architecture diagrams, aggregate results, the measurement protocol and a four-second visual demonstration. Internal compiler patches, kernel snapshots, exact driver details, per-frame fingerprints, executable blobs and the full source media remain local. It is not a standalone benchmark reproduction package.

## Actual video output

- A new offline render uses 96 consecutive real frames at 24000/1001 fps (4.004 seconds). C4F32 is a **Y-plane spatial super-resolution model**. It does not infer RGB or change the frame rate.
- Source: a short excerpt of the retained Doraemon test clip. The input is decoded as full-range BT.709 working planes. The complete 1920×1080 Y plane is fed to the actual delivered GPU/NPU executable, producing 3840×2160 FP32 Y.
- U/V are enlarged with a common bicubic filter for every variant and recombined using the same BT.709 YCbCr-to-RGB transform. Chroma reconstruction, decode, RGB conversion, encoding and display remain outside the published inference latency.
- For each new frame, the original model is executed on the same backend and compared with the optimized result. All **96/96 GPU** and **96/96 NPU** complete FP32 outputs match bit for bit. One retained input calibrates each reference configuration; no historical latency baseline is remeasured.
- The 4K H.264 videos are 8-bit display copies, not the numeric equality proof. The selected 512×512 color crops are lossless WebP; the difference maps are absolute FP32 Y error ×1024, computed before RGB conversion and encoding.
- The input display repeats Y pixels ×2 and shares the same bicubic U/V. It is labeled for pixel inspection; it is not a comparison against the scaler normally used by a player. The source has no pristine 4K ground truth, and this demonstration makes no new reconstruction-quality claim.
- This is a processed video preview, not evidence that a complete real-time player pipeline meets 15 ms. Continuous playback timing, frame pacing and energy remain unvalidated.

[Video metadata](../assets/video/video.json) · [Play the actual output](../index.html#video)

## Implementation notes and attribution

- GPU tail fusion consumes native BYXF FP16 Conv25 output, four channels, and writes complete FP32 output. No extra “fast ReLU” kernel is needed because the native path already fuses ReLU.
- Experimental changes to the [OpenVINO NPU compiler](https://github.com/openvinotoolkit/npu_compiler) union consumer halo requirements and repair per-cluster shared-view addressing. They have not been merged upstream.
- The GPU SLM research route uses Intel subgroup extensions and is separate from the adopted result.
- Network/model: [Artoriuz / ArtCNN](https://github.com/Artoriuz/ArtCNN). Runtime and native GPU convolutions: [OpenVINO](https://github.com/openvinotoolkit/openvino). Fonts: [Archivo](https://github.com/Omnibus-Type/Archivo), SIL Open Font License, bundled [license](../assets/fonts/LICENSE.txt).

[Validation record](./validation.md) · [Public data](./results.json) · [Case study](../index.html)
