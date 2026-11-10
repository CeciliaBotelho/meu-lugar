import { state, peekDay, updateDay, deleteDay, sortedDays } from '../store.js';
import { todayKey, monthKey, addMonths, fmtLong, fmtShort, fmtDM, startOfWeek, addDays, monthShortLabel, isValidKey } from '../dates.js';
import { esc, toast, fmtNum, confirmSheet, debounce, saveFile } from '../ui.js';
import { rerender, go } from '../router.js';
import { stats, infoFor, PHASES, isBleeding } from '../cycle.js';
import { calendarHTML } from './cycle.js';
import { mealEntries, mealKcal, dayKcal, mealsRegistered, workoutEntries, workoutProgress, exercisesDone, didWorkout, findMood, findEnergy, findSleep, findFlow, intensityName, dayText, plannedMeals } from '../report.js';
import { bars, line, hbars } from '../charts.js';
import { MOODS, ENERGY } from '../defaults.js';
import { loadHistory } from './workouts.js';
import { stars } from './books.js';

const hDate = () => (state.ui.histDate && isValidKey(state.ui.histDate) ? state.ui.histDate : todayKey());

export function render() {
  const mode = state.ui.histMode || 'day';
  return `
  <div class="segment">
    <button class="${mode === 'day' ? 'on' : ''}" data-action="h-mode" data-m="day">📖 Meu diário</button>
    <button class="${mode === 'charts' ? 'on' : ''}" data-action="h-mode" data-m="charts">📊 Gráficos</button>
  </div>
  ${mode === 'day' ? dayView() : chartsView()}`;
}

function dayView() {
  const date = hDate();
  const ym = state.ui.histMonth || monthKey(date);
  const day = peekDay(date);
  const has = state.days.has(date);
  const st = stats();
  const info = infoFor(date, st);
  const ws = workoutEntries(day);
  const mood = findMood(day.mood), energy = findEnergy(day.energy);
  const totalEx = ws.reduce((s, w) => s + w.exercises.length, 0);

  return `
  <div class="card">
    ${calendarHTML(ym, date, { mode: 'history', prefix: 'hcal' })}
    <div class="legend"><span><i style="background:var(--pink)"></i>Alimentação</span><span><i style="background:var(--lilac-ink)"></i>Treino</span><span><i style="background:var(--peach-ink)"></i>Sintomas/humor</span><span><i style="background:#6fbf98"></i>Diário</span><span><i style="background:var(--period)"></i>Menstruação</span></div>
  </div>

  <div class="section-title"><h2 style="font-size:17px">${esc(fmtLong(date))}</h2></div>

  <div class="grid2">
    <div class="stat"><span class="lbl">Calorias</span><span class="val">${dayKcal(day)}<small style="font-size:13px"> kcal</small></span></div>
    <div class="stat"><span class="lbl">Refeições</span><span class="val">${mealsRegistered(day)}</span><span class="sub">${(day.extras || []).length ? `+ ${day.extras.length} extra(s)` : ''}</span></div>
    <div class="stat lilac"><span class="lbl">Treino</span><span class="val sm">${day.rest ? 'Descanso 😴' : ws.length ? ws.map((w) => esc(w.name)).join(' + ') : '—'}</span></div>
    <div class="stat lilac"><span class="lbl">Exercícios</span><span class="val">${exercisesDone(day)}${totalEx ? `<small style="font-size:13px">/${totalEx}</small>` : ''}</span></div>
    <div class="stat peach"><span class="lbl">Fase estimada</span><span class="val sm">${info ? `${PHASES[info.phase].emoji} ${PHASES[info.phase].short}` : '—'}</span><span class="sub">${info ? `dia ${info.cycleDay} do ciclo` : ''}</span></div>
    <div class="stat peach"><span class="lbl">Humor e energia</span><span class="val sm">${mood ? mood.emoji + ' ' + esc(mood.name) : '—'}</span><span class="sub">${energy ? 'Energia ' + esc(energy.name.toLowerCase()) : ''}</span></div>
  </div>

  ${foodDetail(day)}
  ${workoutDetail(day)}
  ${cycleDetail(day, info)}
  ${booksDetail(date)}

  <div class="card">
    <label class="field"><span style="font-size:15px;color:var(--pink-strong)">Como foi meu dia? 💗</span>
      <textarea class="input journal" data-action-input="h-journal" data-date="${date}" placeholder="Escreva livremente… tudo fica salvo só aqui no seu aparelho.">${esc(day.journal || '')}</textarea></label>
    <p class="tiny faint mt-s">Salvo automaticamente.</p>
  </div>

  <div class="btn-row">
    <button class="btn" data-action="h-edit" data-date="${date}">✏️ Editar este dia</button>
  </div>
  <div class="btn-row mt">
    <button class="btn ghost small" data-action="h-export-txt" data-date="${date}">📄 Exportar texto</button>
    <button class="btn ghost small" data-action="h-export-pdf" data-date="${date}">🖨️ PDF / imprimir</button>
  </div>
  ${has ? `<div class="center mt"><button class="link-btn" style="color:#c2334f" data-action="h-delete" data-date="${date}">🗑️ Apagar registros deste dia</button></div>` : ''}
  `;
}

function foodDetail(day) {
  const meals = mealEntries(day);
  const extras = day.extras || [];
  return `
  <div class="card">
    <div class="card-head"><div class="ttl"><span class="emoji">🥤</span><h3>Alimentação</h3></div><span class="meal-total">${dayKcal(day)} kcal</span></div>
    ${!meals.length && !extras.length ? '<div class="empty">Nada registrado neste dia.</div>' : `
    <ul class="detail-list">
      ${meals.map((m) => `<li>
        <div class="dl-title"><span>${esc(m.emoji || '')} ${esc(m.mealName || m.id)}${m.time ? ` <span class="small muted">· ${esc(m.time)}</span>` : ''}</span><span style="color:var(--pink-strong)">${mealKcal(m)} kcal</span></div>
        ${m.items.map((it) => `<div class="mt-s"><div class="small" style="font-weight:700">• ${esc(it.name)} — ${Number(it.kcal) || 0} kcal${it.edited ? ' <span class="badge gray">ajustado</span>' : ''}${it.custom ? ' <span class="badge gray">avulso</span>' : ''}</div>
          ${(it.ingredients || []).length ? `<ul>${it.ingredients.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>` : ''}${it.note ? `<div class="dl-sub">📝 ${esc(it.note)}</div>` : ''}</div>`).join('')}
      </li>`).join('')}
      ${extras.length ? `<li><div class="dl-title"><span>➕ Extras</span><span style="color:var(--pink-strong)">${extras.reduce((s, e) => s + (Number(e.kcal) || 0), 0)} kcal</span></div>
        <ul>${extras.map((e) => `<li>${esc(e.name)}${e.qty ? ' (' + esc(e.qty) + ')' : ''} — ${Number(e.kcal) || 0} kcal${e.time ? ' · ' + esc(e.time) : ''}</li>`).join('')}</ul></li>` : ''}
    </ul>
    <div class="row between mt" style="font-weight:800"><span>Total do dia</span><span style="color:var(--pink-strong)">${dayKcal(day)} kcal</span></div>`}
  </div>`;
}

function workoutDetail(day) {
  const ws = workoutEntries(day);
  return `
  <div class="card">
    <div class="card-head"><div class="ttl"><span class="emoji">💪</span><h3>Treinos</h3></div>${day.rest ? '<span class="badge lilac">descanso 😴</span>' : ''}</div>
    ${!ws.length ? `<div class="empty">${day.rest ? 'Dia de descanso registrado. 😴💗' : 'Nenhum treino registrado neste dia.'}</div>` : ws.map((w) => {
      const p = workoutProgress(w);
      return `<div class="mt-s">
        <div class="row between"><b>${esc(w.emoji || '')} ${esc(w.name)}${w.subtitle ? ' — ' + esc(w.subtitle) : ''}</b><span class="badge ${p.done === p.total ? 'ok' : 'lilac'}">${p.done}/${p.total}${p.done === p.total ? ' completo' : ''}</span></div>
        ${w.duration ? `<div class="small muted mt-s">⏱️ Duração: ${w.duration} min</div>` : ''}
        <ul class="detail-list mt-s">${w.exercises.map((e) => `<li>
          <div class="dl-title"><span>${e.done ? '✅' : '⬜️'} ${esc(e.name)}</span><span class="small" style="color:${e.done ? 'var(--pink-strong)' : 'var(--ink-faint)'}">${e.load != null && e.load !== '' ? esc(fmtNum(e.load)) + ' kg' : ''}</span></div>
          <div class="dl-sub">${esc([e.sets ? e.sets + ' ×' : '', e.reps].filter(Boolean).join(' '))}${e.done ? '' : ' · pendente'}${e.notes ? ' · 📝 ' + esc(e.notes) : ''}</div></li>`).join('')}</ul>
        ${w.notes ? `<div class="notice mt-s">📝 ${esc(w.notes)}</div>` : ''}
      </div>`;
    }).join('<hr style="border:0;border-top:1px solid var(--line);margin:12px 0">')}
  </div>`;
}

function booksDetail(date) {
  const fin = [...state.books.values()].filter((b) => b.status === 'read' && b.endDate === date);
  const st = [...state.books.values()].filter((b) => b.startDate === date);
  if (!fin.length && !st.length) return '';
  return `
  <div class="card" data-action="go" data-tab="books" style="cursor:pointer">
    <div class="card-head"><div class="ttl"><span class="emoji">📚</span><h3>Livros</h3></div></div>
    ${fin.map((b) => `<div class="small">✅ Terminei <b>${esc(b.title)}</b>${b.author ? ' — ' + esc(b.author) : ''} ${b.rating ? stars(b.rating, 13) : ''}</div>`).join('')}
    ${st.map((b) => `<div class="small mt-s">📖 Comecei <b>${esc(b.title)}</b>${b.author ? ' — ' + esc(b.author) : ''}</div>`).join('')}
  </div>`;
}

function cycleDetail(day, info) {
  const fl = findFlow(day.flow);
  const bleeding = isBleeding(day);
  const sq = findSleep(day.sleepQuality);
  const rows = [
    ['Dia estimado do ciclo', info ? String(info.cycleDay) : '—'],
    ['Fase estimada', info ? `${PHASES[info.phase].emoji} ${PHASES[info.phase].name}` : '—'],
    ['Menstruada', bleeding ? 'Sim 🌷' : day.flow ? 'Não' : 'Não registrado'],
    ['Fluxo', fl && day.flow !== 'none' ? `${fl.emoji} ${fl.name}` : '—'],
    ['Humor', findMood(day.mood) ? `${findMood(day.mood).emoji} ${findMood(day.mood).name}` : '—'],
    ['Energia', findEnergy(day.energy) ? findEnergy(day.energy).name : '—'],
    ['Sono', day.sleepHours != null ? `${fmtNum(day.sleepHours)} h${sq ? ' · ' + sq.name : ''}` : sq ? sq.name : '—']
  ];
  return `
  <div class="card">
    <div class="card-head"><div class="ttl"><span class="emoji">🌙</span><h3>Ciclo e bem-estar</h3></div></div>
    <dl class="kv">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
    <div class="mt"><div class="small" style="font-weight:800;margin-bottom:6px">Sintomas</div>
    ${(day.symptoms || []).length ? `<div class="chips">${day.symptoms.map((s) => `<span class="chip lv${s.intensity}">${esc(s.name)} <span class="lvl">· ${intensityName(s.intensity)}</span></span>`).join('')}</div>` : '<span class="small faint">Nenhum sintoma registrado.</span>'}</div>
    ${day.cycleNotes ? `<div class="notice mt">📝 ${esc(day.cycleNotes)}</div>` : ''}
  </div>`;
}

// ===== Gráficos =====
function chartsView() {
  const rng = state.ui.chartRange || 'weeks';
  const today = todayKey();
  const days = sortedDays();
  let buckets;
  if (rng === 'weeks') {
    const w0 = startOfWeek(today);
    buckets = Array.from({ length: 8 }, (_, i) => { const s = addDays(w0, -7 * (7 - i)); return { label: fmtDM(s), from: s, to: addDays(s, 6) }; });
  } else {
    const m0 = monthKey(today);
    buckets = Array.from({ length: 6 }, (_, i) => { const m = addMonths(m0, -(5 - i)); return { label: monthShortLabel(m), from: `${m}-01`, to: `${m}-31` }; });
  }
  const inB = (b) => days.filter((d) => d.date >= b.from && d.date <= b.to);
  const trainFreq = buckets.map((b) => ({ label: b.label, value: inB(b).filter(didWorkout).length }));
  const exDone = buckets.map((b) => ({ label: b.label, value: inB(b).reduce((s, d) => s + exercisesDone(d), 0) }));
  const mealDays = buckets.map((b) => ({ label: b.label, value: inB(b).filter((d) => mealsRegistered(d) > 0).length }));
  const nPlanned = plannedMeals().length || 4;
  const fullMealDays = buckets.map((b) => ({ label: b.label, value: inB(b).filter((d) => mealsRegistered(d) >= nPlanned).length }));

  // cargas
  const exNames = new Map();
  for (const d of days) for (const w of Object.values(d.workouts || {})) for (const e of w.exercises || []) if (e.load) exNames.set(e.name.trim().toLowerCase(), e.name);
  const names = [...exNames.values()].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const selEx = state.ui.chartEx && names.includes(state.ui.chartEx) ? state.ui.chartEx : names[0];
  const loadPts = selEx ? loadHistory(selEx).slice(-12).map((x) => ({ label: fmtDM(x.date), value: x.load })) : [];

  // ciclo
  const st = stats();
  const cyc = st.cycles.slice(-8).map((c) => ({ label: fmtDM(c.start), value: c.length }));
  const symCount = new Map();
  for (const d of days) for (const s of d.symptoms || []) symCount.set(s.name, (symCount.get(s.name) || 0) + 1);
  const topSym = [...symCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([label, value]) => ({ label, value }));

  // humor e energia por fase
  const byPhase = { men: [], fol: [], ovu: [], lut: [] };
  for (const d of days) {
    if (!d.mood && !d.energy) continue;
    const info = infoFor(d.date, st);
    if (info && byPhase[info.phase]) byPhase[info.phase].push(d);
  }
  const phaseRows = Object.entries(byPhase).map(([ph, list]) => {
    const en = list.map((d) => findEnergy(d.energy)?.value).filter(Boolean);
    const moods = new Map();
    for (const d of list) if (d.mood) moods.set(d.mood, (moods.get(d.mood) || 0) + 1);
    const topM = [...moods.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([m, n]) => `${findMood(m)?.emoji || ''} ${findMood(m)?.name || m} (${n})`).join(', ');
    return { ph, n: list.length, avg: en.length ? en.reduce((s, x) => s + x, 0) / en.length : null, topM };
  });

  // energia x treino
  const enRows = ENERGY.map((e) => {
    const list = days.filter((d) => d.energy === e.id);
    const w = list.filter(didWorkout).length;
    return { e, n: list.length, w };
  });

  const hasAny = days.length > 0;
  return `
  <div class="segment"><button class="${rng === 'weeks' ? 'on' : ''}" data-action="c-range" data-r="weeks">Semanas</button><button class="${rng === 'months' ? 'on' : ''}" data-action="c-range" data-r="months">Meses</button></div>
  ${!hasAny ? '<div class="card"><div class="empty"><span class="big">🌸</span>Os gráficos aparecem conforme você registra seus dias. Só dados reais, nada inventado.</div></div>' : ''}

  <div class="card"><div class="card-head"><div class="ttl"><span class="emoji">💪</span><h3>Frequência de treinos</h3></div><span class="tiny muted">dias com treino</span></div>${bars(trainFreq, { color: '#9a7be0' })}</div>
  <div class="card"><div class="card-head"><div class="ttl"><span class="emoji">✅</span><h3>Exercícios concluídos</h3></div></div>${bars(exDone)}</div>
  <div class="card"><div class="card-head"><div class="ttl"><span class="emoji">📈</span><h3>Evolução das cargas</h3></div></div>
    ${names.length ? `<div class="chips" style="margin-bottom:10px">${names.map((n) => `<button class="chip ${n === selEx ? 'on' : ''}" data-action="c-ex" data-n="${esc(n)}">${esc(n)}</button>`).join('')}</div>${line(loadPts, { unit: ' kg' })}` : '<div class="empty"><span class="big">🌱</span>Registre cargas nos treinos para ver a evolução.</div>'}
  </div>
  <div class="card"><div class="card-head"><div class="ttl"><span class="emoji">🥤</span><h3>Consistência dos registros alimentares</h3></div></div>
    <div class="tiny muted" style="margin-bottom:4px">Dias com pelo menos uma refeição registrada</div>${bars(mealDays)}
    <div class="tiny muted" style="margin:10px 0 4px">Dias com todas as ${nPlanned} refeições planejadas registradas</div>${bars(fullMealDays, { color: '#f48fb6' })}
  </div>
  <div class="card"><div class="card-head"><div class="ttl"><span class="emoji">🌙</span><h3>Duração dos ciclos</h3></div><span class="tiny muted">dias</span></div>${bars(cyc, { color: '#e84f8c', emptyText: 'Registre pelo menos duas menstruações para ver a duração dos ciclos.' })}</div>
  <div class="card"><div class="card-head"><div class="ttl"><span class="emoji">🌡️</span><h3>Sintomas mais frequentes</h3></div><span class="tiny muted">nº de dias</span></div>${hbars(topSym, { emptyText: 'Nenhum sintoma registrado ainda.' })}</div>
  <div class="card"><div class="card-head"><div class="ttl"><span class="emoji">💭</span><h3>Humor e energia ao longo do ciclo</h3></div></div>
    ${phaseRows.some((r) => r.n) ? phaseRows.map((r) => `<div class="extra-item"><div class="grow"><b>${PHASES[r.ph].emoji} ${PHASES[r.ph].short}</b><div class="tiny muted">${r.n} dia(s) com registro${r.topM ? ' · ' + esc(r.topM) : ''}</div></div>
      <div style="width:110px"><div class="tiny muted">energia média</div><div class="progress lilac"><span style="width:${r.avg ? (r.avg / 3 * 100).toFixed(0) : 0}%"></span></div><div class="tiny" style="font-weight:800;color:var(--lilac-ink)">${r.avg ? fmtNum(r.avg) + ' / 3' : '—'}</div></div></div>`).join('') : '<div class="empty"><span class="big">🌱</span>Registre humor/energia e sua menstruação para ver esta relação.</div>'}
  </div>
  <div class="card"><div class="card-head"><div class="ttl"><span class="emoji">⚡</span><h3>Disposição e treinos</h3></div></div>
    ${enRows.some((r) => r.n) ? enRows.map((r) => `<div class="hbar"><span class="nm">${r.e.emoji} Energia ${esc(r.e.name.toLowerCase())}</span><span class="bar"><span style="width:${r.n ? (r.w / r.n * 100).toFixed(0) : 0}%"></span></span><span class="n">${r.n ? Math.round(r.w / r.n * 100) + '%' : '—'}</span></div><div class="tiny muted" style="margin:-2px 0 6px">${r.w} de ${r.n} dia(s) com treino</div>`).join('') : '<div class="empty"><span class="big">🌱</span>Registre sua energia para ver esta relação.</div>'}
  </div>
  <div class="notice">📊 Os gráficos mostram somente o que você registrou. Relações entre ciclo, energia e treinos são observações dos seus registros — não são diagnósticos médicos.</div>
  `;
}

const saveJournal = debounce((date, v) => updateDay(date, (d) => { d.journal = v; }), 450);

function printDay(date) {
  const root = document.getElementById('print-root');
  const txt = dayText(date);
  root.innerHTML = `<h1>Cantinho da Ce 🌸</h1><pre>${esc(txt)}</pre>`;
  setTimeout(() => window.print(), 60);
}

export const actions = {
  'h-mode'(el) { state.ui.histMode = el.dataset.m; rerender(); },
  'c-range'(el) { state.ui.chartRange = el.dataset.r; rerender(); },
  'c-ex'(el) { state.ui.chartEx = el.dataset.n; rerender(); },
  'hcal-month'(el) { const ym = state.ui.histMonth || monthKey(hDate()); state.ui.histMonth = addMonths(ym, Number(el.dataset.n)); rerender(); },
  'hcal-pick'(el) {
    const k = el.dataset.date;
    if (k > todayKey()) return toast('Esse dia ainda não chegou 🌸');
    state.ui.histDate = k; state.ui.histMonth = monthKey(k); rerender();
  },
  'h-journal'(el) { saveJournal(el.dataset.date, el.value); },
  'h-edit'(el) { go('food', { date: el.dataset.date }); },
  async 'h-export-txt'(el) {
    const date = el.dataset.date;
    const r = await saveFile(`cantinho-da-ce-diario-${date}.txt`, dayText(date), 'text/plain;charset=utf-8');
    if (r === 'cancelled') toast('Exportação cancelada.');
  },
  'h-export-pdf'(el) { printDay(el.dataset.date); toast('No iPhone: escolha “Imprimir” e depois compartilhe como PDF para salvar em Arquivos. 💗', { ms: 6000 }); },
  async 'h-delete'(el) {
    const date = el.dataset.date;
    const ok = await confirmSheet({ title: 'Apagar todos os registros deste dia?', text: `${esc(fmtLong(date))}: alimentação, treinos, ciclo, humor e diário. Esta ação não pode ser desfeita (a não ser por um backup).`, ok: 'Apagar dia', danger: true, requireText: 'APAGAR' });
    if (!ok) return;
    await deleteDay(date);
    toast('Registros do dia apagados.');
    rerender();
  }
};

export { fmtShort, MOODS };
