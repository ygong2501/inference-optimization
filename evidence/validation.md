# Validation record

This public summary describes the retained acceptance checks. Building the site does not rerun inference.

## Acceptance contract

Six complete [1,1,2160,3840] FP32 output arrays per artifact: 49,766,400 elements in total. Each candidate matches its own original backend reference bit for bit. NPU and GPU reference bits differ. The learned weights are unchanged. No tolerance and no excluded border pixels.

Complete-buffer hashes were compared locally against each backend reference. Raw inputs, outputs, per-frame fingerprints, compiled artifacts and implementation patches are retained locally, outside this public site.

## Retained acceptance checks

| Check | NPU | GPU |
| --- | --- |
| Six complete outputs before timing | All matched | All matched |
| Six complete outputs after timing | All matched | All matched |
| Fresh-process executable import | Not claimed here | All six matched |

## Interpretation

All six hashes matched before and after formal timing. The adopted GPU executable additionally passed fresh-process import verification. These results establish equality for the six retained inputs, not all possible inputs, other hardware, runtime versions or precisions.

[Measurement protocol](./methodology.md) · [Machine-readable data](./results.json)

## New consecutive-frame video

A separate offline demonstration processes 96 consecutive real frames at 24000/1001 fps. Every complete FP32 Y output from the delivered GPU and NPU executables matches the original model on the same backend. That is 192 complete new frame comparisons; no original latency baseline was rerun.

| Backend | New frames matched | Different FP32 Y elements |
| --- | --- | --- |
| GPU | 96 / 96 | 0 |
| NPU | 96 / 96 | 0 |

These checks precede RGB conversion and lossy video encoding. The display videos are 4.004-second 4K H.264 copies with common bicubic U/V. The difference images show absolute Y error multiplied by 1024. The nearest-Y input display is for pixel inspection, not a claim about a normal player scaler.

[Clip metadata](../assets/video/video.json) · [Watch the demo](../index.html#video)
