// Navegação simples entre abas (sem recarregar a página).
import { state } from './store.js';
import { todayKey, addDays, fmtLong, isValidKey } from './dates.js';
import { esc } from './ui.js';

let renderFn = null;
export function setRenderer(fn) { renderFn = fn; }
export function rerender(opts = {}) { renderFn && renderFn(opts); }

export function go(tab, { date } = {}) {
  if (date && isValidKey(date)) state.date = date;
  state.tab = tab;
  try { sessionStorage.setItem('cdc-tab', tab); } catch (e) { /* ok */ }
  rerender({ scrollTop: true });
}

export function setDate(date) {
  if (!isValidKey(date)) return;
  state.date = date;
  rerender();
}

/** Barra de data usada nas abas de registro. */
export function dateBar(date = state.date) {
  const isToday = date === todayKey();
  const [w, ...rest] = fmtLong(date).split(', ');
  return `
  <div class="datebar">
    <button class="arrow" data-action="date-shift" data-n="-1" aria-label="Dia anterior">‹</button>
    <div class="mid">
      <div class="d1">${esc(rest.join(', ').replace(/ de \d{4}$/, ''))}${isToday ? '<span class="today-pill">hoje</span>' : ''}</div>
      <div class="d2">${esc(w)}${isToday ? '' : ' · toque para escolher'}</div>
      <input type="date" value="${date}" data-action-change="date-pick" aria-label="Escolher data">
    </div>
    <button class="arrow" data-action="${isToday ? 'noop' : 'date-shift'}" data-n="1" aria-label="Próximo dia" ${isToday ? 'style="opacity:.35"' : ''}>›</button>
  </div>
  ${isToday ? '' : `<div class="center" style="margin:-6px 0 12px"><button class="link-btn" data-action="date-today">← Voltar para hoje</button></div>`}`;
}

export const globalActions = {
  'go': (el) => go(el.dataset.tab),
  'date-shift': (el) => {
    const n = Number(el.dataset.n);
    const next = addDays(state.date, n);
    if (next > todayKey()) return;
    setDate(next);
  },
  'date-today': () => setDate(todayKey()),
  'noop': () => {}
};

export const globalChange = {
  'date-pick': (el) => {
    let v = el.value;
    if (!v) return;
    if (v > todayKey()) v = todayKey();
    setDate(v);
  }
};
