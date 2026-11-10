// Utilidades de interface: escape de texto, toasts, folhas (modais), confetes e corações.

export function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function num(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

export function fmtNum(n, dec = 1) {
  if (n === null || n === undefined || n === '') return '';
  const r = Math.round(Number(n) * 10 ** dec) / 10 ** dec;
  return String(r).replace('.', ',');
}

const toastRoot = () => document.getElementById('toast-root');

export function toast(msg, { big = false, ms = 2600, action = null } = {}) {
  const el = document.createElement('div');
  el.className = 'toast' + (big ? ' big' : '');
  el.textContent = msg;
  if (action) {
    const b = document.createElement('button');
    b.className = 'act'; b.textContent = action.label;
    b.addEventListener('click', () => { action.fn(); close(); });
    el.appendChild(b);
  }
  const root = toastRoot();
  // no máximo 2 toasts ao mesmo tempo
  while (root.children.length >= 2) root.firstChild.remove();
  root.appendChild(el);
  let t = setTimeout(close, ms);
  function close() {
    clearTimeout(t);
    el.classList.add('out');
    setTimeout(() => el.remove(), 320);
  }
  return close;
}

let lastRegisterToast = 0;
/** "Boa, Cecilia! Mais um registro feito! 💗" — no máximo a cada 45 s para não cansar. */
export function registerToast() {
  const now = Date.now();
  if (now - lastRegisterToast < 45000) return;
  lastRegisterToast = now;
  toast('Boa, Cecilia! Mais um registro feito! 💗');
}

const PINKS = ['#e84f8c', '#f48fb6', '#fcd3e3', '#f06a9f', '#c9b3f2', '#ffcfb3', '#ffffff', '#d63a78'];

export function confetti(count = 90) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const root = document.getElementById('fx-root');
  for (let i = 0; i < count; i++) {
    const c = document.createElement('i');
    c.className = 'confetti';
    c.style.left = Math.random() * 100 + 'vw';
    c.style.background = PINKS[i % PINKS.length];
    c.style.setProperty('--dx', (Math.random() * 160 - 80) + 'px');
    c.style.setProperty('--rot', (Math.random() * 900 + 200) + 'deg');
    c.style.animationDuration = (2.2 + Math.random() * 1.8) + 's';
    c.style.animationDelay = (Math.random() * 0.5) + 's';
    if (i % 3 === 0) { c.style.borderRadius = '50%'; c.style.width = '9px'; c.style.height = '9px'; }
    root.appendChild(c);
    setTimeout(() => c.remove(), 4800);
  }
}

export function hearts(count = 8) {
  if (count < 6) return; // pequenos toques sem efeito, visual mais limpo
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const root = document.getElementById('fx-root');
  const emo = ['💗', '💕', '🌸', '💖', '🩷'];
  for (let i = 0; i < count; i++) {
    const h = document.createElement('span');
    h.className = 'float-heart';
    h.textContent = emo[i % emo.length];
    h.style.left = (20 + Math.random() * 60) + 'vw';
    h.style.setProperty('--dx', (Math.random() * 80 - 40) + 'px');
    h.style.animationDelay = (Math.random() * 0.5) + 's';
    root.appendChild(h);
    setTimeout(() => h.remove(), 2600);
  }
}

// ===== Folhas (modais) =====
let currentClose = null;

/**
 * Abre uma folha inferior. `render(el)` recebe o container; retorna função de fechar.
 * onClose é chamado ao fechar (por toque fora, botão ou programaticamente).
 */
export function openSheet(html, { onMount, onClose } = {}) {
  closeSheet();
  const root = document.getElementById('modal-root');
  const back = document.createElement('div');
  back.className = 'modal-backdrop';
  back.innerHTML = `<div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>${html}</div>`;
  root.appendChild(back);
  document.body.style.overflow = 'hidden';
  const sheet = back.querySelector('.sheet');
  back.addEventListener('click', (e) => { if (e.target === back) close(); });
  sheet.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) close(); });
  function close() {
    if (!back.isConnected) return;
    back.remove();
    document.body.style.overflow = '';
    currentClose = null;
    onClose && onClose();
  }
  currentClose = close;
  onMount && onMount(sheet, close);
  return close;
}

export function closeSheet() {
  if (currentClose) currentClose();
}

/** Confirmação carinhosa (substitui o confirm() nativo). Retorna Promise<boolean>. */
export function confirmSheet({ title, text = '', ok = 'Confirmar', cancel = 'Cancelar', danger = false, requireText = null }) {
  return new Promise((resolve) => {
    let result = false;
    openSheet(`
      <h2>${esc(title)}</h2>
      ${text ? `<p class="muted" style="line-height:1.5">${text}</p>` : ''}
      ${requireText ? `<label class="field mt"><span>Digite <b>${esc(requireText)}</b> para confirmar</span><input class="input" id="cf-text" autocomplete="off" autocapitalize="off"></label>` : ''}
      <div class="sheet-actions">
        <button class="btn ghost" data-close>${esc(cancel)}</button>
        <button class="btn ${danger ? 'danger' : ''}" id="cf-ok" ${requireText ? 'disabled' : ''}>${esc(ok)}</button>
      </div>`, {
      onMount(sheet, close) {
        const okb = sheet.querySelector('#cf-ok');
        const inp = sheet.querySelector('#cf-text');
        if (inp) inp.addEventListener('input', () => { okb.disabled = inp.value.trim().toUpperCase() !== requireText.toUpperCase(); });
        okb.addEventListener('click', () => { result = true; close(); });
      },
      onClose() { resolve(result); }
    });
  });
}

export function debounce(fn, ms = 400) {
  let t;
  const wrapped = (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  wrapped.flush = (...a) => { clearTimeout(t); return fn(...a); };
  return wrapped;
}

/** Compartilha (iPhone: Salvar em Arquivos/iCloud Drive) ou baixa um arquivo.
 * Retorna 'shared' | 'downloaded' | 'cancelled'. */
export async function saveFile(filename, content, mime) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
  let file = null;
  try { file = new File([blob], filename, { type: mime }); } catch (e) { file = null; }
  if (file && navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share) {
    try {
      await navigator.share({ files: [file], title: filename });
      return 'shared';
    } catch (e) {
      if (e && e.name === 'AbortError') return 'cancelled';
      // outros erros: tenta download
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 4000);
  return 'downloaded';
}
