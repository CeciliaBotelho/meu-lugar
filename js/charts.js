// Gráficos em SVG puro (funcionam offline, sem bibliotecas externas).
import { esc } from './ui.js';

const PINK = '#e84f8c', PINK_SOFT = '#fcd3e3', INK_SOFT = '#8a6878', LINE = '#f6dbe6';

/** Barras verticais. data: [{label, value, title?}] */
export function bars(data, { height = 170, color = PINK, unit = '', maxValue = null, emptyText = 'Sem registros neste período.' } = {}) {
  if (!data.length || data.every((d) => !d.value)) return `<div class="empty"><span class="big">🌱</span>${esc(emptyText)}</div>`;
  const W = 340, H = height, padL = 26, padB = 26, padT = 18;
  const max = Math.max(maxValue || 0, ...data.map((d) => d.value), 1);
  const step = (W - padL - 6) / data.length;
  const bw = Math.min(30, step * 0.62);
  const ticks = niceTicks(max);
  let g = '';
  for (const t of ticks) {
    const y = padT + (H - padT - padB) * (1 - t / ticks[ticks.length - 1]);
    g += `<line x1="${padL}" x2="${W}" y1="${y}" y2="${y}" stroke="${LINE}" stroke-width="1"/>`;
    g += `<text x="${padL - 5}" y="${y + 4}" font-size="10" text-anchor="end" fill="${INK_SOFT}">${t}</text>`;
  }
  const top = ticks[ticks.length - 1];
  data.forEach((d, i) => {
    const x = padL + step * i + (step - bw) / 2;
    const h = (H - padT - padB) * (d.value / top);
    const y = H - padB - h;
    g += `<rect x="${x}" y="${y}" width="${bw}" height="${Math.max(h, d.value ? 2 : 0)}" rx="${Math.min(8, bw / 2)}" fill="${color}"><title>${esc(d.title || d.label)}: ${d.value}${unit}</title></rect>`;
    if (d.value) g += `<text x="${x + bw / 2}" y="${y - 4}" font-size="10" font-weight="700" text-anchor="middle" fill="${color}">${d.value}</text>`;
    g += `<text x="${x + bw / 2}" y="${H - 9}" font-size="10" text-anchor="middle" fill="${INK_SOFT}">${esc(d.label)}</text>`;
  });
  return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img">${g}</svg></div>`;
}

/** Linha. points: [{label, value}] */
export function line(points, { height = 180, color = PINK, unit = '', emptyText = 'Sem registros ainda.' } = {}) {
  if (points.length < 1) return `<div class="empty"><span class="big">🌱</span>${esc(emptyText)}</div>`;
  const W = 340, H = height, padL = 34, padB = 28, padT = 18, padR = 12;
  const vals = points.map((p) => p.value);
  let min = Math.min(...vals), max = Math.max(...vals);
  if (min === max) { min = Math.max(0, min - 5); max = max + 5; }
  const span = max - min;
  min = Math.max(0, min - span * 0.15); max = max + span * 0.15;
  const x = (i) => padL + (points.length === 1 ? (W - padL - padR) / 2 : (W - padL - padR) * i / (points.length - 1));
  const y = (v) => padT + (H - padT - padB) * (1 - (v - min) / (max - min));
  let g = '';
  for (let k = 0; k <= 3; k++) {
    const v = min + (max - min) * k / 3;
    const yy = y(v);
    g += `<line x1="${padL}" x2="${W - padR}" y1="${yy}" y2="${yy}" stroke="${LINE}"/>`;
    g += `<text x="${padL - 5}" y="${yy + 4}" font-size="10" text-anchor="end" fill="${INK_SOFT}">${Math.round(v)}</text>`;
  }
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const area = `${path} L${x(points.length - 1).toFixed(1)},${H - padB} L${x(0).toFixed(1)},${H - padB} Z`;
  g += `<defs><linearGradient id="lg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".28"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>`;
  g += `<path d="${area}" fill="url(#lg)"/>`;
  g += `<path d="${path}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`;
  const every = Math.ceil(points.length / 6);
  points.forEach((p, i) => {
    g += `<circle cx="${x(i)}" cy="${y(p.value)}" r="4" fill="#fff" stroke="${color}" stroke-width="2.5"><title>${esc(p.label)}: ${p.value}${unit}</title></circle>`;
    if (i % every === 0 || i === points.length - 1) g += `<text x="${x(i)}" y="${H - 9}" font-size="10" text-anchor="middle" fill="${INK_SOFT}">${esc(p.label)}</text>`;
  });
  const last = points[points.length - 1];
  g += `<text x="${x(points.length - 1)}" y="${y(last.value) - 9}" font-size="11" font-weight="800" text-anchor="middle" fill="${color}">${last.value}${unit}</text>`;
  return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img">${g}</svg></div>`;
}

/** Barras horizontais em HTML. items: [{label, value}] */
export function hbars(items, { emptyText = 'Nada registrado ainda.', max = null } = {}) {
  if (!items.length) return `<div class="empty"><span class="big">🌱</span>${esc(emptyText)}</div>`;
  const m = max || Math.max(...items.map((i) => i.value), 1);
  return items.map((i) => `<div class="hbar"><span class="nm" title="${esc(i.label)}">${esc(i.label)}</span><span class="bar"><span style="width:${(i.value / m * 100).toFixed(1)}%"></span></span><span class="n">${i.value}</span></div>`).join('');
}

function niceTicks(max) {
  if (max <= 4) return Array.from({ length: max + 1 }, (_, i) => i);
  const raw = max / 4;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((s) => s * mag).find((s) => s >= raw);
  const out = [];
  for (let v = 0; v <= max + step * 0.999; v += step) out.push(Math.round(v * 100) / 100);
  if (out[out.length - 1] < max) out.push(out[out.length - 1] + step);
  return out;
}

export { PINK, PINK_SOFT };
