import { state, peekDay, updateDay } from '../store.js';
import { todayKey, fmtLong, diffDays, fmtMedium } from '../dates.js';
import { esc, openSheet, registerToast, hearts, num, fmtNum, debounce } from '../ui.js';
import { go, rerender } from '../router.js';
import { stats, infoFor, PHASES } from '../cycle.js';
import { dayKcal, mealsRegistered, plannedMeals, workoutEntries, exercisesDone, findMood, findEnergy, intensityName } from '../report.js';
import { MOODS, ENERGY, SLEEP_QUALITY } from '../defaults.js';
import { readInYear } from './books.js';

export function render() {
  const today = todayKey();
  const day = peekDay(today);
  const st = stats();
  const info = infoFor(today, st);
  const kcal = dayKcal(day);
  const meals = mealsRegistered(day);
  const planned = plannedMeals().length;
  const ws = workoutEntries(day);
  const exDone = exercisesDone(day);
  const mood = findMood(day.mood);
  const energy = findEnergy(day.energy);
  const lastBackup = state.settings.lastBackup;
  const needBackup = state.settings.backupReminder !== false && state.days.size > 0 && (!lastBackup || diffDays(lastBackup.slice(0, 10), today) >= 30);

  const wsText = day.rest ? 'Descanso 😴' : ws.length ? ws.map((w) => `${esc(w.name)} ${esc(w.emoji || '')}`).join(' + ') : '—';
  const totalEx = ws.reduce((s, w) => s + w.exercises.length, 0);

  let cycleCard;
  if (info) {
    const ph = PHASES[info.phase];
    const nextTxt = info.beyond
      ? `Estimativa era ${fmtMedium(info.nextStart)} — registre quando vier 💗`
      : `Próxima menstruação estimada: <b>${fmtMedium(info.nextStart)}</b>`;
    cycleCard = `
      <div class="card ${info.phase === 'ovu' ? 'lilac' : info.phase === 'lut' ? 'peach' : 'pink'}" data-action="go" data-tab="cycle" style="cursor:pointer">
        <div class="card-head"><div class="ttl"><span class="emoji">🌙</span><h3>Meu ciclo hoje</h3></div><span class="badge gray">estimativa</span></div>
        <div class="row" style="gap:14px">
          <div class="phase-ring" style="--p:${Math.min(100, info.cycleDay / info.cycleLength * 100).toFixed(0)}%"><div><b>${info.cycleDay}</b><small>dia do ciclo</small></div></div>
          <div class="grow">
            <div style="font-weight:800;font-size:16px">${ph.emoji} ${ph.name}</div>
            <div class="small muted mt-s">${nextTxt}</div>
            ${(day.symptoms || []).length ? `<div class="small mt-s">Sintomas: ${day.symptoms.map((s) => esc(s.name) + ' <span class="faint">(' + intensityName(s.intensity) + ')</span>').join(', ')}</div>` : '<div class="small faint mt-s">Nenhum sintoma registrado hoje.</div>'}
          </div>
        </div>
      </div>`;
  } else {
    cycleCard = `
      <div class="card pink" data-action="go" data-tab="cycle" style="cursor:pointer">
        <div class="card-head"><div class="ttl"><span class="emoji">🌙</span><h3>Meu ciclo</h3></div></div>
        <p class="small muted">Registre o primeiro dia da sua última menstruação para ver o dia e a fase estimados do ciclo. 🌷</p>
      </div>`;
  }

  return `
  <section class="hello">
    <h1>Oi, Cecilia! 💗 Vamos cuidar de você hoje?</h1>
    <p>${esc(fmtLong(today))}</p>
  </section>

  ${needBackup ? `
  <div class="banner">
    <span style="font-size:24px">☁️</span>
    <div class="grow"><b>Hora do backup mensal 💗</b><span class="small muted">${lastBackup ? 'Último backup: ' + esc(new Date(lastBackup).toLocaleDateString('pt-BR')) : 'Você ainda não fez nenhum backup.'}</span></div>
    <button class="btn small" data-action="open-settings">Salvar</button>
  </div>` : ''}

  <div class="grid2">
    <div class="stat" data-action="go" data-tab="food"><span class="lbl">Calorias registradas</span><span class="val">${kcal}<small style="font-size:13px"> kcal</small></span><span class="sub">referência ${state.settings.kcalReference} kcal</span></div>
    <div class="stat" data-action="go" data-tab="food"><span class="lbl">Refeições</span><span class="val">${meals}<small style="font-size:13px">/${planned}</small></span><span class="sub">${meals ? 'registradas hoje' : 'nenhuma ainda'}</span></div>
    <div class="stat lilac" data-action="go" data-tab="workouts"><span class="lbl">Treino do dia</span><span class="val sm">${wsText}</span></div>
    <div class="stat lilac" data-action="go" data-tab="workouts"><span class="lbl">Exercícios concluídos</span><span class="val">${exDone}${totalEx ? `<small style="font-size:13px">/${totalEx}</small>` : ''}</span></div>
    <div class="stat peach wide" data-action="open-checkin">
      <span class="lbl">Humor e energia</span>
      ${mood || energy ? `<span class="val sm">${mood ? `${mood.emoji} ${esc(mood.name)}` : ''}${mood && energy ? ' · ' : ''}${energy ? `${energy.emoji} Energia ${esc(energy.name.toLowerCase())}` : ''}</span>` : '<span class="sub">Ainda não registrados hoje — toque para registrar.</span>'}
    </div>
  </div>

  ${cycleCard}

  ${booksCard()}

  <button class="btn block big" data-action="open-checkin">Registrar meu dia</button>

  <p class="tiny faint center mt">🔒 Seus registros ficam salvos somente neste aparelho.</p>
  `;
}

function booksCard() {
  const y = Number(todayKey().slice(0, 4));
  const n = readInYear(y).length;
  const goal = Number(state.settings.readingGoal) || 0;
  const reading = [...state.books.values()].filter((b) => b.status === 'reading');
  return `
  <div class="card lilac" data-action="go" data-tab="books" style="cursor:pointer">
    <div class="card-head"><div class="ttl"><span class="emoji">📚</span><h3>Meus livros</h3></div><span class="badge lilac">${n}${goal ? '/' + goal : ''} em ${y}</span></div>
    ${goal ? `<div class="progress lilac"><span style="width:${Math.min(100, n / goal * 100)}%"></span></div>` : ''}
    <p class="small muted mt-s">${reading.length ? `📖 Lendo agora: <b>${reading.slice(0, 2).map((b) => esc(b.title)).join(', ')}</b>` : n ? 'Toque para ver seus livros e notas. 💜' : 'Registre os livros que você leu este ano, com nota e anotações. 💜'}</p>
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

export const actions = {};
export { fmtNum };
