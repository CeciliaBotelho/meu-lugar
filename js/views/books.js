// 📚 Meus livros — livros lidos, lendo e quero ler, com nota e anotações.
import { state, saveBook, removeBook, setSetting, uid } from '../store.js';
import { todayKey, fmtShort, MONTHS_SHORT } from '../dates.js';
import { esc, openSheet, toast, confetti, hearts, num, fmtNum, confirmSheet } from '../ui.js';
import { rerender } from '../router.js';
import { bars } from '../charts.js';

const STATUS = [
  { id: 'read', name: 'Lido', emoji: '✅' },
  { id: 'reading', name: 'Lendo', emoji: '📖' },
  { id: 'want', name: 'Quero ler', emoji: '🔖' }
];
const FORMATS = [
  { id: 'fisico', name: 'Físico', emoji: '📕' },
  { id: 'ebook', name: 'E-book', emoji: '📱' },
  { id: 'audio', name: 'Audiobook', emoji: '🎧' }
];
const COVERS = ['#f9a8c9', '#c9b3f2', '#ffcfb3', '#f48fb6', '#b9e3d0', '#fcd3e3', '#d8c8fa'];

const year = () => state.ui.bookYear || Number(todayKey().slice(0, 4));
const allBooks = () => [...state.books.values()];
export const readInYear = (y) => allBooks().filter((b) => b.status === 'read' && b.endDate && Number(b.endDate.slice(0, 4)) === y);

export function stars(r, size = 16) {
  const v = Number(r) || 0;
  let out = '';
  for (let i = 1; i <= 5; i++) {
    const fill = v >= i ? 100 : v >= i - 0.5 ? 50 : 0;
    out += `<span style="font-size:${size}px;background:linear-gradient(90deg,#e84f8c ${fill}%,#f3d6e2 ${fill}%);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent">★</span>`;
  }
  return `<span aria-label="nota ${fmtNum(v)} de 5" style="letter-spacing:1px;white-space:nowrap">${out}</span>`;
}

function cover(b, w = 46) {
  const c = b.color || COVERS[Math.abs([...b.title].reduce((s, ch) => s + ch.charCodeAt(0), 0)) % COVERS.length];
  return `<div style="flex:0 0 ${w}px;height:${Math.round(w * 1.45)}px;border-radius:6px 10px 10px 6px;background:linear-gradient(135deg,${c},#fff8);box-shadow:inset 4px 0 0 rgba(0,0,0,.08),0 3px 8px rgba(232,79,140,.18);display:grid;place-items:center;font-size:${Math.round(w / 2.3)}px">${b.status === 'read' ? '📗' : b.status === 'reading' ? '📖' : '🔖'}</div>`;
}

export function render() {
  const y = year();
  const tab = state.ui.bookTab || 'read';
  const read = readInYear(y);
  const goal = Number(state.settings.readingGoal) || 0;
  const pages = read.reduce((s, b) => s + (Number(b.pages) || 0), 0);
  const rated = read.filter((b) => b.rating);
  const avg = rated.length ? rated.reduce((s, b) => s + Number(b.rating), 0) / rated.length : null;
  const best = rated.slice().sort((a, b) => b.rating - a.rating)[0];
  const thisYear = Number(todayKey().slice(0, 4));

  let list;
  if (tab === 'read') list = read.slice().sort((a, b) => (a.endDate < b.endDate ? 1 : -1));
  else list = allBooks().filter((b) => b.status === tab).sort((a, b) => ((a.updatedAt || '') < (b.updatedAt || '') ? 1 : -1));

  const perMonth = MONTHS_SHORT.map((m, i) => ({ label: m, value: read.filter((b) => Number(b.endDate.slice(5, 7)) === i + 1).length }));
  const counts = { read: read.length, reading: allBooks().filter((b) => b.status === 'reading').length, want: allBooks().filter((b) => b.status === 'want').length };

  return `
  <div class="section-title" style="margin-top:4px"><h2>Meus livros</h2></div>

  <div class="datebar">
    <button class="arrow" data-action="bk-year" data-n="-1" aria-label="Ano anterior">‹</button>
    <div class="mid"><div class="d1">${y}</div><div class="d2">livros lidos no ano</div></div>
    <button class="arrow" data-action="${y >= thisYear ? 'noop' : 'bk-year'}" data-n="1" aria-label="Próximo ano" ${y >= thisYear ? 'style="opacity:.35"' : ''}>›</button>
  </div>

  <div class="card pink">
    <div class="row between">
      <div><div class="small muted" style="font-weight:700">Lidos em ${y}</div><div style="font-size:32px;font-weight:900;color:var(--pink-strong)">${read.length}${goal ? `<small style="font-size:15px"> / ${goal}</small>` : ''}</div></div>
      <button class="mini-btn" data-action="bk-goal">🎯 Meta: ${goal || '—'} ✏️</button>
    </div>
    ${goal ? `<div class="progress mt"><span style="width:${Math.min(100, read.length / goal * 100)}%"></span></div><p class="tiny muted mt-s">${read.length >= goal ? 'Meta do ano alcançada! Que orgulho! 🎀' : `Faltam ${goal - read.length} para a meta — no seu ritmo, sem pressa. 💗`}</p>` : ''}
  </div>

  <div class="grid2">
    <div class="stat lilac"><span class="lbl">Páginas lidas</span><span class="val">${pages || '—'}</span></div>
    <div class="stat peach"><span class="lbl">Nota média</span><span class="val sm">${avg ? `${fmtNum(avg)} ${stars(avg, 13)}` : '—'}</span></div>
    ${best ? `<div class="stat wide"><span class="lbl">Favorito do ano</span><span class="val sm">${esc(best.title)}</span><span class="sub">${best.author ? esc(best.author) + ' · ' : ''}${stars(best.rating, 13)}</span></div>` : ''}
  </div>

  <button class="btn block big" data-action="bk-add">＋ Adicionar livro</button>

  <div class="segment mt">
    ${STATUS.map((s) => `<button class="${tab === s.id ? 'on' : ''}" data-action="bk-tab" data-t="${s.id}">${s.emoji} ${s.name} (${counts[s.id]})</button>`).join('')}
  </div>

  ${list.length ? list.map((b) => `
    <div class="card" data-action="bk-edit" data-id="${esc(b.id)}" style="cursor:pointer">
      <div class="row" style="align-items:flex-start;gap:12px">
        ${cover(b)}
        <div class="grow">
          <div style="font-weight:800;font-size:15.5px">${esc(b.title)}</div>
          ${b.author ? `<div class="small muted">${esc(b.author)}</div>` : ''}
          ${b.rating ? `<div class="mt-s">${stars(b.rating)} <span class="tiny muted">${fmtNum(b.rating)}</span></div>` : ''}
          <div class="tiny muted mt-s">${[
            b.status === 'read' && b.endDate ? `terminado em ${fmtShort(b.endDate)}` : '',
            b.status === 'reading' && b.startDate ? `começou em ${fmtShort(b.startDate)}` : '',
            b.pages ? `${b.pages} págs.` : '',
            (FORMATS.find((f) => f.id === b.format) || {}).name || '',
            b.genre || ''
          ].filter(Boolean).map(esc).join(' · ')}</div>
          ${b.notes ? `<div class="small mt-s" style="color:var(--ink-soft);display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden">📝 ${esc(b.notes)}</div>` : ''}
          ${b.quote ? `<div class="small mt-s" style="color:var(--lilac-ink);font-style:italic">“${esc(b.quote)}”</div>` : ''}
        </div>
      </div>
    </div>`).join('') : `<div class="card"><div class="empty"><span class="big">📚</span>${tab === 'read' ? `Nenhum livro terminado em ${y} ainda.` : tab === 'reading' ? 'Nenhum livro em leitura agora.' : 'Sua lista de desejos está vazia.'}</div></div>`}

  ${tab === 'read' && read.length ? `<div class="card"><div class="card-head"><div class="ttl"><span class="emoji">📊</span><h3>Livros por mês em ${y}</h3></div></div>${bars(perMonth, { color: '#e84f8c' })}</div>` : ''}
  <p class="tiny faint center mt">🔒 Seus livros ficam salvos só neste aparelho e entram no backup.</p>`;
}

function bookSheet(id) {
  const existing = id ? state.books.get(id) : null;
  const b = existing ? { ...existing } : { id: uid('bk'), title: '', author: '', status: state.ui.bookTab || 'read', startDate: '', endDate: (state.ui.bookTab || 'read') === 'read' ? todayKey() : '', pages: '', rating: 0, format: '', genre: '', notes: '', quote: '' };
  const prevStatus = existing ? existing.status : null;
  const chipRow = (list, field) => list.map((o) => `<button class="chip ${b[field] === o.id ? 'on' : ''}" data-f="${field}" data-v="${o.id}">${o.emoji} ${o.name}</button>`).join('');
  openSheet(`
    <h2>${existing ? '✏️ Editar livro' : '📚 Novo livro'}</h2>
    <div class="form">
      <label class="field"><span>Título</span><input class="input" id="tt" value="${esc(b.title)}" placeholder="ex.: Tudo é rio"></label>
      <label class="field"><span>Autor(a)</span><input class="input" id="au" value="${esc(b.author)}"></label>
      <div><div class="tiny muted" style="font-weight:700;margin:0 0 6px 4px">Status</div><div class="chips" id="st">${chipRow(STATUS, 'status')}</div></div>
      <div class="row">
        <label class="field grow"><span>Comecei em</span><input class="input" id="sd" type="date" max="${todayKey()}" value="${esc(b.startDate)}"></label>
        <label class="field grow" id="ed-wrap"><span>Terminei em</span><input class="input" id="ed" type="date" max="${todayKey()}" value="${esc(b.endDate)}"></label>
      </div>
      <div id="rt-wrap"><div class="tiny muted" style="font-weight:700;margin:0 0 4px 4px">Minha nota <span class="faint">(toque de novo na estrela para meia)</span></div>
        <div class="row"><div id="rt" style="display:flex;gap:2px"></div><span id="rtv" class="small" style="font-weight:800;color:var(--pink-strong)"></span><button class="link-btn tiny" id="rt0">limpar</button></div></div>
      <div class="row">
        <label class="field" style="width:110px"><span>Páginas</span><input class="input" id="pg" type="number" inputmode="numeric" min="0" value="${esc(b.pages)}"></label>
        <label class="field grow"><span>Gênero</span><input class="input" id="gn" value="${esc(b.genre)}" placeholder="ex.: romance"></label>
      </div>
      <div><div class="tiny muted" style="font-weight:700;margin:0 0 6px 4px">Formato</div><div class="chips" id="fm">${chipRow(FORMATS, 'format')}</div></div>
      <label class="field"><span>Minhas anotações 📝</span><textarea class="input" id="nt" rows="5" placeholder="O que achei, o que me marcou…">${esc(b.notes)}</textarea></label>
      <label class="field"><span>Trecho favorito ✨</span><textarea class="input" id="qt" rows="2">${esc(b.quote)}</textarea></label>
    </div>
    <div class="sheet-actions">${existing ? '<button class="btn danger" id="rm">Excluir</button>' : '<button class="btn ghost" data-close>Cancelar</button>'}<button class="btn" id="ok">Salvar</button></div>`, {
    onMount(s, close) {
      let rating = Number(b.rating) || 0;
      const paint = () => {
        s.querySelector('#rt').innerHTML = [1, 2, 3, 4, 5].map((i) => `<button data-star="${i}" style="border:0;background:none;padding:2px;font-size:30px;line-height:1;cursor:pointer;background:linear-gradient(90deg,#e84f8c ${rating >= i ? 100 : rating >= i - 0.5 ? 50 : 0}%,#f3d6e2 0);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent" aria-label="${i} estrelas">★</button>`).join('');
        s.querySelector('#rtv').textContent = rating ? fmtNum(rating) : '';
      };
      paint();
      s.querySelector('#rt').addEventListener('click', (e) => {
        const st = e.target.closest('[data-star]'); if (!st) return;
        const i = Number(st.dataset.star);
        rating = rating === i ? i - 0.5 : i;
        paint();
      });
      s.querySelector('#rt0').addEventListener('click', () => { rating = 0; paint(); });
      const sync = () => {
        s.querySelector('#ed-wrap').style.opacity = b.status === 'read' ? 1 : 0.45;
        if (b.status === 'read' && !s.querySelector('#ed').value) s.querySelector('#ed').value = todayKey();
      };
      sync();
      s.addEventListener('click', (e) => {
        const c = e.target.closest('[data-f]'); if (!c) return;
        const f = c.dataset.f;
        b[f] = b[f] === c.dataset.v && f === 'format' ? '' : c.dataset.v;
        c.parentElement.querySelectorAll('.chip').forEach((x) => x.classList.toggle('on', x.dataset.v === b[f]));
        if (f === 'status') sync();
      });
      s.querySelector('#ok').addEventListener('click', async () => {
        const title = s.querySelector('#tt').value.trim();
        if (!title) return toast('Qual é o título do livro? 📚');
        const startDate = s.querySelector('#sd').value;
        const endDate = b.status === 'read' ? (s.querySelector('#ed').value || todayKey()) : s.querySelector('#ed').value;
        if (startDate && endDate && endDate < startDate) return toast('A data de término precisa ser depois do início 💗');
        const pagesN = num(s.querySelector('#pg').value);
        Object.assign(b, {
          title, author: s.querySelector('#au').value.trim(), startDate, endDate: b.status === 'read' ? endDate : (endDate || ''),
          pages: pagesN == null ? '' : Math.max(0, Math.round(pagesN)), rating, genre: s.querySelector('#gn').value.trim(),
          notes: s.querySelector('#nt').value, quote: s.querySelector('#qt').value.trim()
        });
        await saveBook(b);
        close();
        if (b.status === 'read') { state.ui.bookYear = Number(b.endDate.slice(0, 4)); }
        state.ui.bookTab = b.status;
        rerender();
        if (b.status === 'read' && prevStatus !== 'read') {
          confetti(70);
          const n = readInYear(Number(b.endDate.slice(0, 4))).length;
          toast(`Mais um livro lido, Cecilia! 📚💗 Já são ${n} em ${b.endDate.slice(0, 4)}!`, { big: true, ms: 4500 });
        } else { hearts(4); toast('Livro salvo 📚'); }
      });
      const rm = s.querySelector('#rm');
      if (rm) rm.addEventListener('click', async () => {
        const ok = await confirmSheet({ title: `Excluir “${b.title}”?`, text: 'O livro e suas anotações serão removidos deste aparelho.', ok: 'Excluir', danger: true });
        if (ok) { await removeBook(b.id); toast('Livro excluído.'); }
        rerender();
      });
    }
  });
}

export const actions = {
  'bk-year'(el) {
    const n = year() + Number(el.dataset.n);
    if (n > Number(todayKey().slice(0, 4))) return;
    state.ui.bookYear = n; rerender();
  },
  'bk-tab'(el) { state.ui.bookTab = el.dataset.t; rerender(); },
  'bk-add'() { bookSheet(null); },
  'bk-edit'(el) { bookSheet(el.dataset.id); },
  'bk-goal'() {
    openSheet(`<h2>Meta de leitura</h2>
      <p class="small muted">Quantos livros você gostaria de ler por ano? É só um incentivo carinhoso — use 0 para não ter meta.</p>
      <label class="field mt"><span>Livros por ano</span><input class="input" id="g" type="number" inputmode="numeric" min="0" value="${state.settings.readingGoal || 0}"></label>
      <div class="sheet-actions"><button class="btn ghost" data-close>Cancelar</button><button class="btn" id="ok">Salvar</button></div>`, {
      onMount(s, close) { s.querySelector('#ok').addEventListener('click', async () => { await setSetting('readingGoal', Math.max(0, Math.round(num(s.querySelector('#g').value) || 0))); close(); rerender(); }); }
    });
  }
};
