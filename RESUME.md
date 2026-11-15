# Résumé wording

**Bit-exact CNN Inference Optimization — Intel Lunar Lake NPU & GPU**

- Reduced C4F32 1080p→4K inference latency to **16.14 ms on NPU** and **17.58 ms on GPU** through compiler scheduling, shared-residual CMX views and fused OpenCL output processing; **64–65% / 16–19%** below retained default/historical baselines across the optimization campaign.
- Preserved original learned weights and verified bitwise equality against each backend's reference across **six complete FP32 outputs (49.8M elements)**; diagnosed a cross-convolution GPU research kernel using disassembly and subgroup timestamps, improving it from **311 ms to 21.00 ms** while retaining the faster native-convolution artifact.

Use the published GitHub Pages URL as the project link once deployment completes. The 15 ms synchronous latency goal is not yet achieved. The percentages describe the full campaign, including changes in driver/resource/buffer policies; they are not attributed solely to a single compiler patch. The GPU research result is separate from the adopted 17.58 ms result.
