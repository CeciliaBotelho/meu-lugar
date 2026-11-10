// Cantinho da Ce 🌸 — ponto de entrada
import { state, load, onSaveError } from './store.js';
import { todayKey, fmtLong } from './dates.js';
import { toast, debounce } from './ui.js';
import { setRenderer, globalActions, globalChange, go } from './router.js';
import * as home from './views/home.js';
import * as food from './views/food.js';
import * as workouts from './views/workouts.js';
import * as cycle from './views/cycle.js';
import * as history from './views/history.js';
import * as settings from './views/settings.js';
import * as books from './views/books.js';

const views = { home, food, workouts, cycle, history, settings, books };
const viewEl = document.getElementById('view');

function render({ scrollTop = false } = {}) {
  const v = views[state.tab] || home;
  const y = window.scrollY;
  try {
    viewEl.innerHTML = v.render();
  } catch (e) {
    console.error(e);
    viewEl.innerHTML = `<div class="card"><b>Ops, algo deu errado ao mostrar esta tela.</b><p class="small muted mt-s">Seus dados continuam salvos. Tente outra aba ou recarregue o app.</p><pre class="tiny faint" style="white-space:pre-wrap">${String(e && e.message || e).replace(/</g, '&lt;')}</pre></div>`;
  }
  const isHome = (views[state.tab] || home) === home;
  document.getElementById('app').classList.toggle('is-home', isHome);
  if (isHome) document.querySelector('.top-date').textContent = fmtLong(todayKey()).replace(/ de \d{4}$/, '').toUpperCase();
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === state.tab));
  if (scrollTop) window.scrollTo(0, 0); else window.scrollTo(0, y);
}
setRenderer(render);

function findAction(name) {
  const v = views[state.tab] || {};
  if (v.actions && v.actions[name]) return v.actions[name];
  if (globalActions[name]) return globalActions[name];
  for (const k of Object.keys(views)) if (views[k].actions && views[k].actions[name]) return views[k].actions[name];
  return null;
}

// Cliques (delegação)
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el || el.closest('.sheet')) return; // folhas cuidam dos próprios cliques
  const name = el.dataset.action;
  if (name === 'open-settings') { settings.refreshStorageInfo().then(() => { if (state.tab === 'settings') render(); }); go('settings'); return; }
  if (name === 'open-checkin') { home.openCheckin(todayKey()); return; }
  const fn = findAction(name);
  if (fn) { e.preventDefault(); Promise.resolve(fn(el, e)).catch(onErr); }
});

// Mudanças (inputs de data/hora/número/arquivo)
document.addEventListener('change', (e) => {
  const el = e.target.closest('[data-action-change]');
  if (!el || el.closest('.sheet')) return;
  const name = el.dataset.actionChange;
  const fn = globalChange[name] || findAction(name);
  if (fn) Promise.resolve(fn(el, e)).catch(onErr);
});

// Digitação: grava com pequeno atraso, sem redesenhar a tela (não perde o foco)
const pending = new Map();
document.addEventListener('input', (e) => {
  const el = e.target.closest('[data-action-input]');
  if (!el || el.closest('.sheet')) return;
  const name = el.dataset.actionInput;
  const fn = findAction(name);
  if (!fn) return;
  const key = name + '|' + (el.dataset.id || '') + '|' + (el.dataset.ex || '') + '|' + (el.dataset.date || '');
  if (!pending.has(key)) pending.set(key, debounce((target) => Promise.resolve(fn(target)).catch(onErr), 350));
  pending.get(key)(el);
});
// ao sair do campo, grava imediatamente
document.addEventListener('focusout', (e) => {
  const el = e.target.closest && e.target.closest('[data-action-input]');
  if (!el) return;
  const name = el.dataset.actionInput;
  const key = name + '|' + (el.dataset.id || '') + '|' + (el.dataset.ex || '') + '|' + (el.dataset.date || '');
  const p = pending.get(key);
  if (p) p.flush(el);
});
// app indo para segundo plano: grava tudo que estiver pendente
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    const a = document.activeElement;
    if (a && a.dataset && a.dataset.actionInput) a.blur();
  } else if (document.visibilityState === 'visible') {
    // virou o dia com o app aberto? atualiza a data
    if (state.ui.lastSeenToday && state.ui.lastSeenToday !== todayKey()) {
      if (state.date === state.ui.lastSeenToday) state.date = todayKey();
      state.ui.lastSeenToday = todayKey();
      render();
    }
  }
});

function onErr(e) {
  console.error(e);
  toast('Não consegui salvar agora 😢 ' + (e && e.message ? e.message : ''), { ms: 5000 });
}
onSaveError(onErr);

// ===== Service worker (offline + atualizações seguras) =====
function setupSW() {
  if (!('serviceWorker' in navigator)) return;
  if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') return;
  let refreshing = false;
  const hadController = !!navigator.serviceWorker.controller; // primeira instalação não recarrega
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing || !hadController) return;
    refreshing = true;
    location.reload();
  });
  navigator.serviceWorker.register('./sw.js', { scope: './' }).then((reg) => {
    const ask = (w) => toast('Nova versão do Cantinho da Ce disponível 🌸', { ms: 15000, action: { label: 'Atualizar', fn: () => w.postMessage('SKIP_WAITING') } });
    if (reg.waiting && navigator.serviceWorker.controller) ask(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const w = reg.installing;
      if (!w) return;
      w.addEventListener('statechange', () => {
        if (w.state === 'installed' && navigator.serviceWorker.controller) ask(w);
      });
    });
  }).catch((e) => console.warn('SW não registrado', e));
}

async function boot() {
  try {
    await load();
  } catch (e) {
    console.error(e);
    viewEl.innerHTML = `<div class="card"><b>Não foi possível abrir o armazenamento do aparelho.</b><p class="small muted mt-s">${String(e.message || e)}. Se estiver em uma aba privada do Safari, abra em uma aba normal ou pela Tela de Início.</p></div>`;
    return;
  }
  state.ui.lastSeenToday = todayKey();
  let tab = 'home';
  try { tab = sessionStorage.getItem('cdc-tab') || 'home'; } catch (e) { /* ok */ }
  state.tab = views[tab] ? tab : 'home';
  render();
  setupSW();
  // pede armazenamento persistente (o navegador pode aceitar ou não)
  try { if (navigator.storage && navigator.storage.persist && !(await navigator.storage.persisted())) await navigator.storage.persist(); } catch (e) { /* ok */ }
  settings.refreshStorageInfo();
}

boot();
