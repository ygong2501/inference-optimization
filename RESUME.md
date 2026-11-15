# Résumé wording

**CNN Inference Optimization — Intel Lunar Lake NPU & GPU**  
[Project case study](https://ygong2501.github.io/inference-optimization/)

- Reduced C4F32 1080p→4K luminance inference latency by **64–65% on NPU** and **16–19% on GPU** across the optimization campaign. Modified NPU buffer scheduling to share residual features in CMX and implemented a fused OpenCL output kernel.
- Preserved the original weights and verified complete FP32 outputs against each original backend on **six benchmark frames and 96 consecutive video frames**. Used disassembly to improve an experimental GPU kernel from **311 ms to 21.00 ms**, then retained the faster **17.58 ms** native-convolution path.

The measured scope is synchronous Y inference. Historical comparisons span driver/resource changes; the percentages do not isolate a single patch. The 15 ms target and the complete playback pipeline remain open.
