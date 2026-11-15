// @file Interactive NPU/GPU execution diagrams, charts and same-frame video/detail controls, populated from public experiment data.
// @see docs/code-index.xml
import data from './evidence/data.js';

const $ = (selector) => document.querySelector(selector);
const section = $('#architecture');
const hardwareButtons = [...document.querySelectorAll('[data-backend]')];
const viewButtons = [...document.querySelectorAll('[data-view]')];
const state = { backend: 'npu', view: 'baseline' };
const pair = (values) => values.map((value) => value.toFixed(2)).join(' / ');
const copy = {
  npu: {
    baseline: {
      kicker: 'LONG-LIVED RESIDUAL',
      description: 'The Conv2 feature must survive five convolutions before Add23 consumes it.',
      facts: [['Two-round medians', `${pair(data.npu.baseline_ms)} ms`, 'Historical · 4 compute tiles'], ['Bottleneck', 'Feature lifetime', 'Conv2 → five convs → Add23'], ['Acceptance', '6 / 6 exact', 'Original NPU reference']],
    },
    optimized: {
      kicker: 'SHARED RESIDUAL · CMX',
      description: 'One Conv2 feature per block, shared by the main path and the residual path.',
      facts: [['Two-round medians', `${pair(data.npu.optimized_ms)} ms`, '15 groups × H6 · 6 compute tiles'], ['Planned payload / frame', `${data.npu.planned_total_mib.toFixed(2)} MiB`, 'Logical read + write bytes'], ['Conv2 / Conv21 writeback', '0 planned bytes', 'No explicit spills · 6/6 exact']],
    },
    remaining: {
      kicker: 'NEXT · CRITICAL PATH',
      description: 'The shared-residual graph is verified. The remaining target is single-frame latency.',
      facts: [['Gap to 15 ms', '1.14–1.18 ms', '≈7% more reduction'], ['Five 32 → 32 convs', '≈97% of MACs', 'Arithmetic share ≠ time share'], ['Acceptance gate', 'Profile → tune → verify', '6/6 exact → formal timing']],
    },
  },
  gpu: {
    baseline: {
      kicker: 'NATIVE CONVS · SEPARATE OUTPUT STAGES',
      description: 'The native convolution path is fast; separate output stages create avoidable intermediates.',
      facts: [['Two-round medians', `${pair(data.gpu.baseline_ms)} ms`, 'Historical baseline · retained'], ['Already fused', 'ReLU + Add', 'Native convolution backend'], ['Bottleneck', 'Output intermediates', 'Reorder → shuffle → convert']],
    },
    optimized: {
      kicker: 'NATIVE CONVS · ONE OUTPUT KERNEL',
      description: 'Keep all seven native convolutions; fuse PixelShuffle, clamp and FP32 output conversion.',
      facts: [['Two-round medians', `${pair(data.gpu.optimized_ms)} ms`, '7 native convolutions'], ['Intermediate payload saved', `${data.gpu.planned_intermediate_saving_mib.toFixed(2)} MiB`, 'Per frame · logical bytes'], ['Output processing', '1 fused kernel', '31.64 MiB final write retained']],
    },
    remaining: {
      kicker: 'NEXT · MATRIX REUSE',
      description: 'Cross-convolution fusion reached 21.00 ms in research, still behind the adopted GPU artifact.',
      facts: [['Gap to 15 ms', '2.58–2.68 ms', '≈15% more reduction'], ['Research SLM route', '21.00 ms', 'Slower than native · not adopted'], ['Next tuning axis', 'Fetch → reuse → occupancy', 'Preserve order · 6/6 exact']],
    },
  },
};

const text = (x, y, value, css = '', anchor = 'middle') => `<text x="${x}" y="${y}" text-anchor="${anchor}" class="${css}">${value}</text>`;
const arrow = (x1, y1, x2, y2, extra = '') => `<path d="M${x1} ${y1}H${x2}" class="wire ${extra}" marker-end="url(#arrow)"/>`;
function tensor(x, y, width = 48, height = 44, depth = 3) {
  let markup = '';
  for (let layer = depth - 1; layer >= 0; layer--) markup += `<rect x="${x + layer * 3}" y="${y - layer * 3}" width="${width}" height="${height}" class="${layer ? 'tensor-back' : 'tensor-front'}"/>`;
  markup += `<path d="M${x + width / 3} ${y + 5}V${y + height - 5}M${x + width * 2 / 3} ${y + 5}V${y + height - 5}M${x + 5} ${y + height / 3}H${x + width - 5}M${x + 5} ${y + height * 2 / 3}H${x + width - 5}" class="tensor-grid"/>`;
  return markup;
}

function drawNetwork() {
  const npu = state.backend === 'npu';
  const baseline = state.view === 'baseline';
  const remaining = state.view === 'remaining';
  const title = `${state.backend.toUpperCase()} ${state.view} execution of C4F32`;
  let svg = `<title id="network-title">${title}</title><desc id="network-desc">Seven 3 by 3 convolutions, a long skip from Conv2 to Add23, and a two-times PixelShuffle with complete FP32 output. ${copy[state.backend][state.view].description}</desc>
    <defs><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M1 1L9 5L1 9" fill="none" stroke="#818c9b" stroke-width="1.5"/></marker><marker id="skip-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M1 1L9 5L1 9" fill="none" stroke="#cd77b1" stroke-width="1.5"/></marker></defs>`;
  if (npu && !baseline) {
    svg += '<rect x="132" y="16" width="960" height="383" rx="10" class="fusion-box"/>';
    svg += text(610, 43, remaining ? 'Shared graph · critical-path tuning' : 'One fused group · 15 column groups / frame', 'caption');
  } else {
    svg += '<rect x="132" y="126" width="960" height="135" rx="10" class="fusion-box"/>';
    svg += text(610, 149, npu ? 'Compiler-selected execution boundaries' : 'Native GPU convolution path · seven convolutions', 'caption');
  }
  if (remaining) {
    svg += '<rect x="316" y="158" width="458" height="92" rx="6" class="focus-box"/>';
    svg += text(545, 124, 'Five 32 → 32 convs · ≈97% nominal MACs', 'caption accent-text');
  }
  const skipLabel = npu && !baseline ? 'Shared Conv2 · union halo · per-cluster offsets' : 'Long residual · Conv2 → Add23';
  svg += '<path d="M174 165V87H852V162" class="skip-wire" marker-end="url(#skip-arrow)"/>';
  svg += text(520, 73, skipLabel, 'skip-caption');
  const positions = [22, 150, 339, 427, 515, 603, 706, 994];
  svg += tensor(positions[0], 174, 55, 48, 1) + text(50, 250, '1080p Y', 'layer-label') + text(50, 271, 'Single input', 'tiny secondary');
  svg += arrow(90, 199, 132, 199);
  svg += tensor(positions[1], 174, 59, 48) + text(179, 250, 'Conv2', 'layer-label') + text(179, 271, '1 → 32', 'caption secondary');
  svg += arrow(220, 199, 323, 199);
  for (const [index, label] of ['C5', 'C9', 'C13', 'C17'].entries()) {
    const x = positions[index + 2];
    svg += tensor(x, 178, 38, 42) + text(x + 19, 250, label, 'caption');
    svg += arrow(x + 48, 199, positions[index + 3] - 10, 199);
  }
  svg += text(490, 271, '32 → 32 · each followed by ReLU', 'tiny secondary');
  svg += tensor(positions[6], 174, 57, 48) + text(735, 250, 'Conv21', 'layer-label') + text(735, 271, '32 → 32', 'caption secondary');
  svg += arrow(778, 199, 823, 199);
  svg += '<circle cx="852" cy="199" r="22" class="node-add"/>' + text(852, 205, '+', 'layer-label') + text(852, 250, 'Add23', 'layer-label');
  svg += arrow(884, 199, 977, 199);
  svg += tensor(positions[7], 174, 61, 48, 4) + text(1024, 250, 'Conv25', 'layer-label') + text(1024, 271, '32 → 4', 'caption secondary');
  if (npu && !baseline) {
    svg += text(179, 295, 'CMX retained', 'tiny accent-text') + text(735, 295, 'Writeback: 0', 'tiny accent-text');
    svg += text(259, 355, 'One Conv2 per block', 'caption') + text(259, 376, 'Shared, not recomputed', 'tiny secondary');
  } else if (npu) {
    svg += text(335, 319, 'Long lifetime · mismatched regions', 'caption secondary');
  } else {
    svg += text(530, 292, 'ReLU + residual Add: already fused', 'tiny secondary');
  }
  svg += '<path d="M1024 284V325" class="wire" marker-end="url(#arrow)"/>';
  if (!baseline) {
    const tailX = npu ? 485 : 458;
    if (!npu) svg += `<rect x="${tailX}" y="313" width="630" height="91" rx="8" class="focus-box"/>`;
    svg += '<rect x="991" y="335" width="27" height="24" fill="#dce5fa"/><rect x="1020" y="335" width="27" height="24" fill="#e6eaf5"/><rect x="991" y="361" width="27" height="24" fill="#e6eaf5"/><rect x="1020" y="361" width="27" height="24" fill="#dce5fa"/>';
    svg += text(1004, 352, 'a', 'caption') + text(1033, 352, 'b', 'caption') + text(1004, 378, 'c', 'caption') + text(1033, 378, 'd', 'caption');
    svg += arrow(969, 358, 884, 358) + text(803, 352, 'Clip [0,1] · FP32', 'caption') + text(803, 375, npu ? 'Fused tail' : 'One OpenCL kernel', 'tiny accent-text');
    svg += arrow(713, 358, 654, 358) + tensor(549, 333, 87, 46, 1) + text(592, 398, '4K Y · direct write', 'caption');
    if (npu) svg += text(1023, 417, 'PixelShuffle ×2', 'tiny secondary');
    else svg += text(768, 424, 'BYXF FP16 → full FP32 · no tail intermediates', 'tiny secondary');
  } else {
    svg += '<rect x="880" y="330" width="186" height="46" rx="5" class="tensor-front"/>';
    svg += text(973, 350, npu ? 'PixelShuffle ×2' : 'Reorder · PixelShuffle ×2', 'tiny') + text(973, 366, 'Materialized stages', 'tiny secondary');
    svg += arrow(863, 352, 803, 352) + text(741, 346, 'Clip · FP32', 'caption') + text(741, 368, 'Output conversion', 'tiny secondary');
    svg += arrow(680, 352, 620, 352) + tensor(505, 330, 88, 46, 1) + text(549, 399, '4K Y output', 'caption');
  }
  $('#network').innerHTML = svg;
}

function render() {
  const content = copy[state.backend][state.view];
  section.dataset.backend = state.backend;
  hardwareButtons.forEach((button) => {
    const selected = button.dataset.backend === state.backend;
    button.setAttribute('aria-selected', String(selected));
    button.tabIndex = selected ? 0 : -1;
  });
  $('#execution-panel').setAttribute('aria-labelledby', `tab-${state.backend}`);
  viewButtons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.view === state.view)));
  $('#view-kicker').textContent = content.kicker;
  $('#view-facts').innerHTML = content.facts.map(([label, value, note]) => `<div><span class="fact-label">${label}</span><strong class="fact-value">${value}</strong><span class="fact-note">${note}</span></div>`).join('');
  drawNetwork();
}
hardwareButtons.forEach((button, index) => {
  button.addEventListener('click', () => { state.backend = button.dataset.backend; render(); });
  button.addEventListener('keydown', (event) => {
    let next;
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') next = (index + 1) % hardwareButtons.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = hardwareButtons.length - 1;
    if (next !== undefined) { event.preventDefault(); hardwareButtons[next].click(); hardwareButtons[next].focus(); }
  });
});
viewButtons.forEach((button) => button.addEventListener('click', () => { state.view = button.dataset.view; render(); }));

$('#latency-cards').innerHTML = ['npu', 'gpu'].map((backend) => {
  const result = data[backend];
  const reductions = result.baseline_ms.map((value, i) => Math.round((1 - result.optimized_ms[i] / value) * 100));
  const row = (label, values, css) => `<div class="mini-row"><span>${label}</span><div class="mini-track" aria-hidden="true">${values.map((value) => `<span class="mini-bar ${css}" style="width:${value / 50 * 100}%"></span>`).join('')}</div><span class="mini-values">${pair(values)}</span></div>`;
  return `<article class="latency-card"><div class="metric-top"><span class="card-label">${backend.toUpperCase()} / ms</span><span class="delta ${backend}-text">↓ ${Math.min(...reductions)}–${Math.max(...reductions)}%</span></div><div class="metric-value">${Math.min(...result.optimized_ms).toFixed(2)}<small>ms</small></div>${row('Before', result.baseline_ms, '')}${row('After', result.optimized_ms, `after-${backend}`)}</article>`;
}).join('');
const milestoneLabels = ['Initial SLM', 'Row blocks + block IO', 'GRF256', 'Preload + residual reads'];
$('#research-milestones').innerHTML = data.research.milestones.map(({ ms }, index) => `<div><strong class="milestone-value">${ms.toFixed(2)}<small>ms</small></strong><span class="milestone-label">${milestoneLabels[index]}</span></div>`).join('');
$('#timing-rows').innerHTML = ['npu', 'gpu'].map((backend) => `<tr><th>${backend.toUpperCase()}</th><td>${pair(data[backend].optimized_ms)}</td><td>${pair(data[backend].p95_ms)}</td><td>${data[backend].iterations.join(' / ')}</td></tr>`).join('');
render();

const video = $('#demo-video');
const videoButtons = [...document.querySelectorAll('[data-video]')];
let videoGeneration = 0;
let detailBackend = 'gpu';
let desiredVideoPosition = 0;
let resumeVideoPlayback = false;

function updateDetail() {
  const prefix = `./assets/video/f${$('#detail-frame').value.padStart(3, '0')}`;
  for (const [kind, suffix] of [['source', 'source.webp'], ['output', `${detailBackend}.webp`], ['difference', `${detailBackend}-difference.png`]]) {
    const path = `${prefix}-${suffix}`;
    $(`#detail-${kind}`).src = path;
    $(`#detail-${kind}-link`).href = path;
  }
  $('#detail-output-label').innerHTML = `Optimized ${detailBackend.toUpperCase()} <small>C4F32 Y · common U/V</small>`;
  $('#detail-output').alt = `Actual optimized ${detailBackend.toUpperCase()} inference output at the same crop coordinates`;
}

videoButtons.forEach((button) => button.addEventListener('click', () => {
  if (button.getAttribute('aria-pressed') === 'true') return;
  const generation = ++videoGeneration;
  if (video.readyState >= 1) {
    desiredVideoPosition = video.ended ? 0 : video.currentTime;
    resumeVideoPlayback = !video.paused && !video.ended;
  }
  const name = button.dataset.video;
  videoButtons.forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
  $('#video-plane-label').textContent = name === 'source' ? 'Y: nearest ×2 · U/V: bicubic' : 'Y: C4F32 ×2 · U/V: bicubic';
  $('#video-download').href = `./assets/video/${name}.mp4`;
  $('#video-status').textContent = 'Loading clip…';
  video.setAttribute('aria-label', name === 'source' ? 'Input display: nearest-neighbor Y enlargement and common bicubic chroma' : `Actual 4K output from the optimized ${name.toUpperCase()} inference executable`);
  video.addEventListener('loadedmetadata', () => {
    if (generation !== videoGeneration) return;
    video.currentTime = Math.min(desiredVideoPosition, Math.max(0, video.duration - 1 / 24));
    $('#video-status').textContent = '4.004 s · 23.976 fps · 4K display copy';
    if (resumeVideoPlayback) video.play().catch(() => { $('#video-status').textContent = 'Press play to resume'; });
  }, { once: true });
  video.src = `./assets/video/${name}.mp4`;
  if (name === 'source') video.removeAttribute('poster');
  else video.poster = `./assets/video/${name}-poster.jpg`;
  video.load();
  if (name !== 'source') {
    detailBackend = name;
    updateDetail();
  }
}));
$('#detail-frame').addEventListener('change', () => {
  updateDetail();
  desiredVideoPosition = Number($('#detail-frame').value) * 1001 / 24000;
  resumeVideoPlayback = false;
  video.pause();
  if (video.readyState >= 1) video.currentTime = desiredVideoPosition;
});
video.addEventListener('error', () => { $('#video-status').textContent = 'Clip could not load — try the 4K link'; });
