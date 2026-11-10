import { state, peekDay, updateDay } from '../store.js';
import { todayKey, fmtLong, diffDays, fmtMedium } from '../dates.js';
import { esc, openSheet, registerToast, hearts, num, fmtNum, debounce } from '../ui.js';
import { go, rerender } from '../router.js';
import { stats, infoFor, PHASES } from '../cycle.js';
import { dayKcal, mealsRegistered, plannedMeals, workoutEntries, workoutProgress, findMood, findEnergy, intensityName } from '../report.js';
import { MOODS, ENERGY, SLEEP_QUALITY } from '../defaults.js';
import { readInYear } from './books.js';

// Ícones de traço (estilo delicado, desenhados à mão — sem bibliotecas externas)
const ICO = {
  food: '<path d="M4 3v7a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V3"/><path d="M7 3v18"/><path d="M20 15V3a5 5 0 0 0-4 5v5a2 2 0 0 0 2 2h2Zm0 0v6"/>',
  workout: '<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  book: '<path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2Z"/><path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7Z"/>',
  heart: '<path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7Z"/>',
  flower: '<circle cx="12" cy="12" r="2.5"/><path d="M12 9.5C10 6 10.5 3 12 3s2 3 0 6.5M14.5 12c3.5-2 6.5-1.5 6.5 0s-3 2-6.5 0M12 14.5c2 3.5 1.5 6.5 0 6.5s-2-3 0-6.5M9.5 12C6 14 3 13.5 3 12s3-2 6.5 0"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  cloud: '<path d="M17.5 19H8a5 5 0 1 1 .9-9.9A6 6 0 0 1 20 11.5a4 4 0 0 1-2.5 7.5Z"/>'
};
const ico = (k, cls = '') => `<svg class="ce-svg ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICO[k]}</svg>`;

// Humores rápidos do cartão (os 7 continuam disponíveis em "Registrar meu dia")
const QUICK = [
  { id: 'feliz', g: '☺\uFE0E' },
  { id: 'tranquila', svg: 'cloud' },
  { id: 'animada', g: '♡\uFE0E' },
  { id: 'sensivel', g: '☾\uFE0E' }
];

export function render() {
  const today = todayKey();
  const day = peekDay(today);
  const st = stats();
  const info = infoFor(today, st);
  const kcal = dayKcal(day);
  const meals = mealsRegistered(day);
  const planned = plannedMeals().length;
  const ws = workoutEntries(day);
  const mood = findMood(day.mood);
  const energy = findEnergy(day.energy);
  const lastBackup = state.settings.lastBackup;
  const needBackup = state.settings.backupReminder !== false && state.days.size > 0 && (!lastBackup || diffDays(lastBackup.slice(0, 10), today) >= 30);

  // Alimentação
  const extras = (day.extras || []).length;
  const foodTxt = meals || extras
    ? `${meals} de ${planned} refeições registradas${extras ? ` + ${extras} extra${extras > 1 ? 's' : ''}` : ''} · ${kcal} kcal`
    : 'Nenhuma refeição registrada ainda';

  // Treino
  let workTxt;
  if (ws.length) {
    workTxt = ws.map((w) => { const p = workoutProgress(w); return `${esc(w.name)} · ${p.done} de ${p.total} exercícios concluídos`; }).join(' · ');
  } else if (day.rest) workTxt = 'Dia de descanso registrado';
  else workTxt = 'Nenhum treino registrado hoje';

  // Ciclo + bem-estar
  const parts = [];
  if (info) {
    parts.push(`Dia ${info.cycleDay} do ciclo · ${esc(PHASES[info.phase].name)} (estimativa)`);
    if (!info.beyond) parts.push(`próxima menstruação ≈ ${esc(fmtMedium(info.nextStart))}`);
  }
  const reg = [];
  if (mood) reg.push(`humor ${esc(mood.name.toLowerCase())}`);
  if (energy) reg.push(`energia ${esc(energy.name.toLowerCase())}`);
  if ((day.symptoms || []).length) reg.push(day.symptoms.map((s) => `${esc(s.name.toLowerCase())} (${intensityName(s.intensity)})`).join(', '));
  const cycleTxt = [parts.join(' · '), reg.length ? 'Hoje: ' + reg.join(' · ') : (info ? 'Nada registrado hoje' : 'Registre sua menstruação para ver as estimativas')].filter(Boolean).join('<br>');

  const quickChosen = QUICK.some((q) => q.id === day.mood);
  const otherMood = mood && !quickChosen ? mood : null;

  return `
  <div class="ce-home">
    <h1 class="ce-h1">Bem-vinda,<br>Cecilia<span> ♡</span></h1>
    <p class="ce-intro">Hoje também é dia de cuidar de você.</p>

    ${needBackup ? `
    <button class="ce-backup" data-action="open-settings">
      <span>${lastBackup ? 'Seu último backup foi em ' + esc(new Date(lastBackup).toLocaleDateString('pt-BR')) + '.' : 'Você ainda não fez nenhum backup.'} Que tal salvar uma cópia hoje?</span><span>↗</span>
    </button>` : ''}

    <div class="ce-feature">
      <div>
        <span class="ce-eyebrow">SEU MOMENTO</span>
        <h2>Como você<br>está se sentindo?</h2>
        <p>${mood ? `Hoje você está <b>${esc(mood.name.toLowerCase())}</b>${energy ? ` · energia ${esc(energy.name.toLowerCase())}` : ''}.` : 'Um pouquinho de atenção para você.'}</p>
      </div>
      <div class="ce-flower" aria-hidden="true">✳</div>
      <div class="ce-moods" role="group" aria-label="Humor de hoje">
        ${QUICK.map((q) => { const m = findMood(q.id); return `<button class="${day.mood === q.id ? 'chosen' : ''}" data-action="quick-mood" data-mood="${q.id}" aria-label="${esc(m.name)}" aria-pressed="${day.mood === q.id}"><span>${q.svg ? ico(q.svg, 'ce-mood-svg') : q.g}</span><small>${esc(m.name)}</small></button>`; }).join('')}
        <button class="${otherMood ? 'chosen' : ''}" data-action="open-checkin" aria-label="Outros humores"><span>${otherMood ? otherMood.emoji : '…'}</span><small>${otherMood ? esc(otherMood.name) : 'Outro'}</small></button>
      </div>
    </div>

    <div class="ce-section"><h2>Meus progressos de hoje</h2><span>♡</span></div>
    <button class="ce-shortcut" data-action="go" data-tab="food">
      <span class="ce-icon">${ico('food')}</span>
      <div><h3>Nutrir o corpo</h3><p>${foodTxt}</p></div><span class="ce-arrow">↗</span>
    </button>
    <button class="ce-shortcut" data-action="go" data-tab="workouts">
      <span class="ce-icon">${ico('workout')}</span>
      <div><h3>Encontrar seu movimento</h3><p>${workTxt}</p></div><span class="ce-arrow">↗</span>
    </button>
    <button class="ce-shortcut" data-action="go" data-tab="cycle">
      <span class="ce-icon">${ico('moon')}</span>
      <div><h3>Ouvir seu corpo</h3><p>${cycleTxt}</p></div><span class="ce-arrow">↗</span>
    </button>

    <div class="ce-section"><h2>Minha estante</h2><span>♡</span></div>
    ${shelf()}

    <p class="ce-note">você não precisa dar conta de tudo hoje.</p>
  </div>
  <div class="ce-register-wrap"><button class="ce-register" data-action="open-checkin">Registrar meu dia</button></div>
  `;
}

const SPINES = [
  { bg: '#dfb7c2', edge: '#c797a6', ink: '#69424e', icon: 'heart' },
  { bg: '#d8dcc6', edge: '#b6bca0', ink: '#596047', icon: 'flower' },
  { bg: '#e5d4bf', edge: '#cbb394', ink: '#7a624b', icon: 'moon' }
];

function shelf() {
  const y = Number(todayKey().slice(0, 4));
  const read = [...state.books.values()].filter((b) => b.status === 'read').sort((a, b) => ((a.endDate || '') < (b.endDate || '') ? 1 : -1));
  const nYear = readInYear(y).length;
  const covers = read.slice(0, 3);
  const row = covers.length
    ? covers.map((b, i) => { const s = SPINES[i % 3]; return `<button class="ce-book" data-action="bk-edit" data-id="${esc(b.id)}" style="--cv:${s.bg};--edge:${s.edge};--ink:${s.ink}" aria-label="${esc(b.title)}">${ico(s.icon)}<span>${esc(b.title)}</span></button>`; }).join('')
      + Array.from({ length: 3 - covers.length }, () => `<button class="ce-book ce-book-empty" data-action="bk-add" aria-label="Adicionar livro">${ico('plus')}<span>adicionar</span></button>`).join('')
    : `<button class="ce-book ce-book-empty" data-action="bk-add" aria-label="Adicionar livro">${ico('plus')}<span>seu primeiro<br>livro</span></button>`
      + '<div class="ce-book ce-book-ghost" aria-hidden="true"></div><div class="ce-book ce-book-ghost" aria-hidden="true"></div>';
  return `
  <div class="ce-books">
    <div class="ce-books-heading"><span class="ce-icon">${ico('book')}</span><div><h3>Meus livros</h3><p>${read.length ? 'As histórias que já fizeram parte de mim.' : 'As histórias que forem fazendo parte de você aparecem aqui.'}</p></div></div>
    <div class="ce-book-row">${row}</div>
    <div class="ce-books-footer"><span>${nYear ? `${nYear} livro${nYear > 1 ? 's' : ''} lido${nYear > 1 ? 's' : ''} em ${y}` : read.length ? `Nenhum livro terminado em ${y} ainda` : 'Nenhum livro registrado ainda'}</span><button data-action="go" data-tab="books">Minha coleção ↗</button></div>
  </div>`;
}

/** Folha "Registrar meu dia": humor, energia, sono e diário de hoje (ou da data escolhida). */
export function openCheckin(date = todayKey()) {
  const d = peekDay(date);
  let flushJournal = () => {};
  const chipRow = (list, field, cur) => list.map((o) => `<button class="chip ${cur === o.id ? 'on' : ''}" data-ck="${field}" data-v="${o.id}">${o.emoji} ${esc(o.name)}</button>`).join('');
  openSheet(`
    <h2>Registrar meu dia</h2>
    <p class="small muted" style="margin:-6px 0 12px">${esc(fmtLong(date))}</p>
    <div class="form">
      <div><div class="small" style="font-weight:800;margin-bottom:6px">Como você está? 💭</div><div class="chips" id="ck-mood">${chipRow(MOODS, 'mood', d.mood)}</div></div>
      <div><div class="small" style="font-weight:800;margin-bottom:6px">Energia</div><div class="chips" id="ck-energy">${chipRow(ENERGY, 'energy', d.energy)}</div></div>
      <div class="row" style="align-items:flex-end">
        <label class="field" style="width:120px"><span>Horas dormidas</span><input class="input" id="ck-sleep" type="number" inputmode="decimal" min="0" max="24" step="0.5" value="${d.sleepHours ?? ''}" placeholder="ex.: 7,5"></label>
        <div class="grow"><div class="tiny muted" style="font-weight:700;margin:0 0 4px 4px">Qualidade do sono</div><div class="chips" id="ck-sq">${chipRow(SLEEP_QUALITY, 'sleepQuality', d.sleepQuality)}</div></div>
      </div>
      <label class="field"><span>Como foi meu dia? 💗</span><textarea class="input journal" id="ck-journal" placeholder="Escreva livremente…">${esc(d.journal || '')}</textarea></label>
      <div class="btn-row">
        <button class="btn soft small" data-close data-goto="food">🥤 Refeições</button>
        <button class="btn soft small" data-close data-goto="workouts">💪 Treino</button>
        <button class="btn soft small" data-close data-goto="cycle">🌙 Sintomas</button>
      </div>
    </div>
    <div class="sheet-actions"><button class="btn" data-close>Pronto 💗</button></div>
  `, {
    onMount(sheet) {
      const save = async (fn) => { await updateDay(date, fn); registerToast(); };
      sheet.addEventListener('click', async (e) => {
        const c = e.target.closest('[data-ck]');
        if (c) {
          const f = c.dataset.ck, v = c.dataset.v;
          const was = c.classList.contains('on');
          c.parentElement.querySelectorAll('.chip').forEach((x) => x.classList.remove('on'));
          if (!was) { c.classList.add('on'); hearts(4); }
          await save((day) => { day[f] = was ? null : v; });
        }
        const g = e.target.closest('[data-goto]');
        if (g) { state.date = date; setTimeout(() => go(g.dataset.goto), 10); }
      });
      const sl = sheet.querySelector('#ck-sleep');
      sl.addEventListener('change', () => save((day) => { const n = num(sl.value); day.sleepHours = n == null ? null : Math.max(0, Math.min(24, n)); }));
      const j = sheet.querySelector('#ck-journal');
      const saveJ = debounce(() => (j.value === (peekDay(date).journal || '') ? null : updateDay(date, (day) => { day.journal = j.value; })), 500);
      j.addEventListener('input', saveJ);
      j.addEventListener('blur', () => saveJ.flush());
      flushJournal = () => saveJ.flush();
    },
    async onClose() { await flushJournal(); rerender(); }
  });
}

export const actions = {
  async 'quick-mood'(el) {
    const id = el.dataset.mood;
    const cur = peekDay(todayKey()).mood;
    await updateDay(todayKey(), (d) => { d.mood = cur === id ? null : id; });
    rerender();
    if (cur !== id) registerToast();
  }
};
export { fmtNum };
