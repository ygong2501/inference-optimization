// @file Interactive NPU/GPU execution diagrams and charts, populated from the public experiment projection.
// @see docs/code-index.xml
import data from './evidence/data.js';

const $ = (selector) => document.querySelector(selector);
const section = $('#architecture');
const hardwareButtons = [...document.querySelectorAll('[data-backend]')];
const viewButtons = [...document.querySelectorAll('[data-view]')];
const state = { backend: 'npu', view: 'optimized' };
const pair = (values) => values.map((value) => value.toFixed(2)).join(' / ');
const copy = {
  npu: {
    baseline: {
      kicker: 'HISTORICAL DEFAULT · LONG-LIVED RESIDUAL',
      description: 'The Conv2 feature must survive five convolutions before Add23 consumes it.',
      facts: [['Two round medians', `${pair(data.npu.baseline_ms)} ms`, 'Historical default · four physical compute tiles'], ['Main scheduling problem', 'Feature lifetime', 'Large residual regions span the convolution chain'], ['Numerical contract', 'Original weights', 'Keep the same six NPU reference outputs']],
    },
    optimized: {
      kicker: 'SHARED RESIDUAL · CMX',
      description: 'One Conv2 feature per block, shared by the main path and the residual path.',
      facts: [['Two round medians', `${pair(data.npu.optimized_ms)} ms`, '15 column groups × H6 · six physical compute tiles'], ['Planned DDR payload / frame', `${data.npu.planned_total_mib.toFixed(2)} MiB`, 'Compiler-plan bytes · not measured bus traffic'], ['Conv2 / Conv21 writeback', '0 planned bytes', 'No explicit spills · all six output hashes match']],
    },
    remaining: {
      kicker: 'NEXT · REDUCE THE CRITICAL PATH',
      description: 'The shared-residual graph is verified. The remaining target is single-frame latency.',
      facts: [['Gap to 15 ms', '1.14–1.18 ms', 'About 7% more latency reduction is required'], ['Five 32 → 32 convolutions', '≈97% of MACs', 'Nominal arithmetic share · not a wall-time share'], ['Next evidence gate', 'Profile → change → verify', 'Tune the dominant stage; retain all six exact outputs']],
    },
  },
  gpu: {
    baseline: {
      kicker: 'NATIVE CONVOLUTIONS · MATERIALIZED OUTPUT STAGES',
      description: 'The native convolution path is fast; separate output stages create avoidable intermediates.',
      facts: [['Two round medians', `${pair(data.gpu.baseline_ms)} ms`, 'Retained historical GPU baseline · not rerun'], ['Already fused by the backend', 'ReLU + residual Add', 'An extra standalone “fast ReLU” is not the opportunity'], ['Avoidable output work', 'Reorder + shuffle', 'Intermediate tensor writes and reads after Conv25']],
    },
    optimized: {
      kicker: 'NATIVE CONVOLUTIONS · FUSED OUTPUT KERNEL',
      description: 'Keep all seven native convolutions; fuse PixelShuffle, clamp and FP32 output conversion.',
      facts: [['Two round medians', `${pair(data.gpu.optimized_ms)} ms`, 'Native seven-convolution path remains in use'], ['Eliminated intermediate payload', `${data.gpu.planned_intermediate_saving_mib.toFixed(2)} MiB`, 'Per frame · logical payload, not measured DDR traffic'], ['One output kernel', 'Shuffle + clip + FP32', 'Full 31.64 MiB output write remains necessary']],
    },
    remaining: {
      kicker: 'NEXT · MATRIX REUSE WITHOUT REGRESSING THE NATIVE PATH',
      description: 'Cross-convolution fusion reached 21.00 ms in research, still behind the adopted GPU artifact.',
      facts: [['Gap to 15 ms', '2.58–2.68 ms', 'About 15% more latency reduction is required'], ['Research SLM kernel', '21.00 ms', 'Not adopted · shared memory alone did not beat native'], ['Next evidence gate', 'Fetch → reuse → occupancy', 'Preserve accumulation order, then validate and time']],
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
    svg += text(610, 43, remaining ? 'Verified shared graph · optimize its critical path next' : 'One fused column group · 15 groups per full frame', 'caption');
  } else {
    svg += '<rect x="132" y="126" width="960" height="135" rx="10" class="fusion-box"/>';
    svg += text(610, 149, npu ? 'Compiler-selected execution boundaries' : 'Native GPU convolution path · seven convolutions', 'caption');
  }
  if (remaining) {
    svg += '<rect x="316" y="158" width="458" height="92" rx="6" class="focus-box"/>';
    svg += text(545, 124, 'Five 32 → 32 layers · ≈97% of nominal convolution MACs', 'caption accent-text');
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
    svg += text(259, 355, 'One Conv2 per block', 'caption') + text(259, 376, 'No duplicate recomputation', 'tiny secondary');
  } else if (npu) {
    svg += text(377, 319, 'Residual lifetime + consumer-region mismatch', 'caption secondary');
    svg += text(377, 340, 'Creates pressure on on-chip feature storage', 'tiny secondary');
  } else {
    svg += text(530, 292, 'ReLU and the residual Add were already fused by the native backend', 'tiny secondary');
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
    else svg += text(768, 424, 'Native BYXF FP16 → complete FP32 output · intermediate tensors eliminated', 'tiny secondary');
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
  $('#view-description').textContent = content.description;
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

$('#latency-rows').innerHTML = ['npu', 'gpu'].map((backend, index) => {
  const row = (label, values, css) => `<div class="latency-row"><div class="bar-label">${backend.toUpperCase()} <small>${label}</small></div><div class="bar-plot">${values.map((value) => `<span class="bar-pair ${css}" style="width:${value / 50 * 100}%"></span>`).join('')}<span class="bar-value">${pair(values)}</span></div></div>`;
  return `${index ? '<div class="plot-group-divider"></div>' : ''}${row('Historical baseline', data[backend].baseline_ms, '')}${row('Adopted artifact', data[backend].optimized_ms, `optimized-${backend}`)}`;
}).join('');
$('#research-milestones').innerHTML = data.research.milestones.map(({ label, ms }) => `<div><span class="milestone-label">${label}</span><strong class="milestone-value">${ms.toFixed(2)}<small>ms</small></strong></div>`).join('');
render();
