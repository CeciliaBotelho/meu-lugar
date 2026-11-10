import { state, peekDay, updateDay, setSetting, uid, clone, sortedDays } from '../store.js';
import { todayKey, addDays, startOfWeek, fmtShort, fmtMedium, weekdayShort, nowTime } from '../dates.js';
import { esc, openSheet, toast, confetti, hearts, registerToast, num, fmtNum, confirmSheet } from '../ui.js';
import { rerender, dateBar } from '../router.js';
import { workoutProgress, didWorkout } from '../report.js';

const templates = () => state.settings.workouts || [];
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();

function chosenTemplate(day) {
  const list = templates();
  if (state.ui.workoutId && list.some((t) => t.id === state.ui.workoutId) && state.ui.workoutDate === day.date) return state.ui.workoutId;
  // 1) treino com registro neste dia
  const withData = Object.values(day.workouts || {}).find((w) => w.exercises.some((e) => e.done || e.load || e.notes));
  if (withData && list.some((t) => t.id === withData.templateId)) return withData.templateId;
  // 2) sugestão: próximo da sequência depois do último treino feito
  const past = sortedDays().filter((d) => d.date < day.date && didWorkout(d)).pop();
  if (past) {
    const lastId = Object.values(past.workouts).filter((w) => workoutProgress(w).done).map((w) => w.templateId).pop();
    const i = list.findIndex((t) => t.id === lastId);
    if (i >= 0) return list[(i + 1) % list.length].id;
  }
  return list[0] && list[0].id;
}

/** Lista exibida: o que foi registrado neste dia + exercícios do modelo ainda não registrados. */
function viewExercises(t, snap) {
  if (!snap) return t.exercises.map((e) => ({ exId: e.id, name: e.name, sets: e.sets, reps: e.reps, tnote: e.note, done: false, load: null, notes: '' }));
  const have = new Set(snap.exercises.map((e) => e.exId));
  return [...snap.exercises, ...t.exercises.filter((e) => !have.has(e.id)).map((e) => ({ exId: e.id, name: e.name, sets: e.sets, reps: e.reps, tnote: e.note, done: false, load: null, notes: '' }))];
}

export function lastLoad(name, beforeDate) {
  const n = norm(name);
  const days = sortedDays();
  for (let i = days.length - 1; i >= 0; i--) {
    const d = days[i];
    if (d.date >= beforeDate) continue;
    for (const w of Object.values(d.workouts || {})) for (const e of w.exercises || []) if (norm(e.name) === n && e.load) return { load: e.load, date: d.date };
  }
  return null;
}

export function loadHistory(name) {
  const n = norm(name);
  const out = [];
  for (const d of sortedDays()) for (const w of Object.values(d.workouts || {})) for (const e of w.exercises || []) if (norm(e.name) === n && e.load) out.push({ date: d.date, load: Number(e.load), sets: e.sets, reps: e.reps, workout: w.name });
  return out;
}

export function render() {
  const date = state.date;
  const day = peekDay(date);
  const list = templates();
  const tid = chosenTemplate(day);
  const t = list.find((x) => x.id === tid);
  const snap = t ? day.workouts[t.id] : null;
  const exs = t ? viewExercises(t, snap) : [];
  const done = exs.filter((e) => e.done).length;
  const pct = exs.length ? Math.round((done / exs.length) * 100) : 0;

  // semana
  const ws = startOfWeek(date);
  const week = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
  const weekCount = week.filter((k) => didWorkout(peekDay(k))).length;

  return `
  ${dateBar(date)}

  <div class="card lilac">
    <div class="card-head"><div class="ttl"><h3>Minha semana</h3></div><span class="badge lilac">${weekCount} ${weekCount === 1 ? 'treino' : 'treinos'}</span></div>
    <div class="week">${week.map((k) => {
      const d = peekDay(k);
      const did = didWorkout(d);
      const full = Object.values(d.workouts || {}).some((w) => { const p = workoutProgress(w); return p.total && p.done === p.total; });
      const cls = full ? 'on' : did ? 'part' : d.rest ? 'rest' : '';
      return `<div><div class="wd">${weekdayShort(k)}</div><div class="dot ${cls} ${k === todayKey() ? 'today' : ''}">${full ? '✓' : did ? '•' : d.rest ? '–' : ''}</div></div>`;
    }).join('')}</div>
  </div>

  <div class="segment" role="tablist">
    ${list.map((x) => `<button class="${x.id === tid ? 'on' : ''}" data-action="pick-workout" data-id="${x.id}">${esc(x.name)}</button>`).join('')}
    <button data-action="new-workout" aria-label="Novo treino">＋</button>
  </div>

  ${t ? `
  <div class="card">
    <div class="card-head">
      <div class="ttl"><div><h3>${esc(t.name)} — ${esc(t.subtitle || '')}</h3><div class="tiny muted">${done} de ${exs.length} concluídos</div></div></div>
      <button class="mini-btn" data-action="edit-workout" data-id="${t.id}">Editar</button>
    </div>
    <div class="progress lilac"><span style="width:${pct}%"></span></div>

    <div class="row wrap mt" style="align-items:flex-end">
      <label class="field" style="width:120px"><span>Duração (min)</span><input class="input" type="number" inputmode="numeric" min="0" max="600" value="${snap && snap.duration ? snap.duration : ''}" data-action-change="w-duration" data-id="${t.id}" placeholder="ex.: 50"></label>
      ${snap && snap.timerStart ? `<button class="btn small lilac" data-action="w-timer-stop" data-id="${t.id}">⏹️ Finalizar (início ${esc(snap.timerStart)})</button>` : `<button class="btn small soft" data-action="w-timer-start" data-id="${t.id}">⏱️ Iniciar cronômetro</button>`}
    </div>

    ${exs.map((e) => exRow(t, e, date)).join('')}

    <label class="field mt"><span>Observações do treino</span><textarea class="input" data-action-input="w-notes" data-id="${t.id}" rows="2" placeholder="Como foi o treino?">${esc(snap?.notes || '')}</textarea></label>
    <button class="btn ghost block mt" data-action="add-exercise" data-id="${t.id}">＋ Adicionar exercício</button>
  </div>` : '<div class="empty">Nenhum treino cadastrado. Toque em ＋ para criar.</div>'}

  <button class="btn ${day.rest ? 'lilac' : 'soft'} block" data-action="toggle-rest">${day.rest ? 'Dia de descanso registrado' : 'Registrar dia de descanso'}</button>

  <div class="card soft mt">
    <div class="card-head"><div class="ttl"><h3>Minhas preferências</h3></div><button class="mini-btn" data-action="edit-prefs">Editar</button></div>
    <ul class="small muted" style="margin:0;padding-left:18px;line-height:1.6">${String(state.settings.preferences || '').split('\n').filter(Boolean).map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
    <p class="tiny faint mt-s">Treinos editáveis, criados por você — não são prescrição clínica. Respeite seu corpo e seu conforto.</p>
  </div>`;
}

function exRow(t, e, date) {
  const last = lastLoad(e.name, date);
  const sr = [e.sets ? `${esc(e.sets)} ×` : '', esc(e.reps || '')].filter(Boolean).join(' ');
  return `
  <div class="ex ${e.done ? 'done' : ''}" data-ex="${esc(e.exId)}">
    <div class="ex-top">
      <button class="ex-check" data-action="ex-toggle" data-id="${t.id}" data-ex="${esc(e.exId)}" aria-pressed="${e.done}" aria-label="Marcar ${esc(e.name)}">✓</button>
      <div class="grow">
        <div class="ex-name">${esc(e.name)}</div>
        <div class="ex-meta">${sr}${e.tnote ? ' · ' + esc(e.tnote) : ''}</div>
      </div>
      ${e.done ? '<span class="badge">feito</span>' : ''}
    </div>
    <div class="ex-fields">
      <label class="field"><span>Carga (kg)</span><input type="text" inputmode="decimal" value="${e.load != null && e.load !== '' ? esc(fmtNum(e.load)) : ''}" data-action-input="ex-load" data-id="${t.id}" data-ex="${esc(e.exId)}" placeholder="${last ? esc(fmtNum(last.load)) : '—'}"></label>
      <label class="field"><span>Observações</span><input type="text" value="${esc(e.notes || '')}" data-action-input="ex-notes" data-id="${t.id}" data-ex="${esc(e.exId)}" placeholder="ex.: banco 3"></label>
    </div>
    ${last ? `<div class="ex-last">Última carga: ${esc(fmtNum(last.load))} kg em ${fmtShort(last.date)}</div>` : ''}
    <div class="ex-actions">
      <button class="mini-btn" data-action="ex-edit" data-id="${t.id}" data-ex="${esc(e.exId)}">Editar</button>
      <button class="mini-btn" data-action="ex-history" data-name="${esc(e.name)}">Cargas anteriores</button>
    </div>
  </div>`;
}

function ensureSnap(d, t) {
  if (!d.workouts[t.id]) {
    d.workouts[t.id] = {
      templateId: t.id, name: t.name, subtitle: t.subtitle || '', emoji: t.emoji || '',
      exercises: t.exercises.map((e) => ({ exId: e.id, name: e.name, sets: e.sets, reps: e.reps, tnote: e.note || '', done: false, load: null, notes: '' })),
      duration: null, notes: '', timerStart: null, flags: {}, startedAt: new Date().toISOString()
    };
  }
  const s = d.workouts[t.id];
  // exercícios adicionados ao modelo depois que o registro do dia começou
  const have = new Set(s.exercises.map((e) => e.exId));
  for (const e of t.exercises) if (!have.has(e.id)) s.exercises.push({ exId: e.id, name: e.name, sets: e.sets, reps: e.reps, tnote: e.note || '', done: false, load: null, notes: '' });
  return s;
}

const findT = (id) => templates().find((x) => x.id === id);

export const actions = {
  'pick-workout'(el) { state.ui.workoutId = el.dataset.id; state.ui.workoutDate = state.date; rerender(); },

  async 'ex-toggle'(el) {
    const t = findT(el.dataset.id); if (!t) return;
    const date = state.date;
    let nowDone = false, p = null, flags = null;
    await updateDay(date, (d) => {
      const s = ensureSnap(d, t);
      const e = s.exercises.find((x) => x.exId === el.dataset.ex); if (!e) return;
      e.done = !e.done; e.doneAt = e.done ? new Date().toISOString() : null; nowDone = e.done;
      if (e.done) d.rest = false;
      p = workoutProgress(s); flags = s.flags || (s.flags = {});
      if (p.done === p.total && !flags.completed) { flags.completed = true; flags.halfShown = true; s.completedAt = new Date().toISOString(); flags._celebrate = 'full'; }
      else if (p.done >= p.total / 2 && p.done < p.total && !flags.halfShown) { flags.halfShown = true; flags._celebrate = 'half'; }
    });
    state.ui.workoutId = t.id; state.ui.workoutDate = date;
    rerender();
    const c = flags && flags._celebrate;
    if (c) await updateDay(date, (d) => { delete d.workouts[t.id].flags._celebrate; });
    if (c === 'full') { confetti(120); toast('ARRASOU, CECILIA! 💪💕 Mais um treino concluído!', { big: true, ms: 5000 }); }
    else if (c === 'half') { hearts(6); toast('Já chegou na metade! Você está indo super bem! 🌷', { big: true, ms: 3500 }); }
    else if (nowDone) { hearts(3); registerToast(); }
  },

  async 'ex-load'(el) {
    const t = findT(el.dataset.id); if (!t) return;
    const raw = el.value.trim();
    const v = raw === '' ? null : num(raw);
    if (raw !== '' && v == null) return;
    await updateDay(state.date, (d) => { const s = ensureSnap(d, t); const e = s.exercises.find((x) => x.exId === el.dataset.ex); if (e) e.load = v; });
    state.ui.workoutId = t.id; state.ui.workoutDate = state.date;
  },

  async 'ex-notes'(el) {
    const t = findT(el.dataset.id); if (!t) return;
    await updateDay(state.date, (d) => { const s = ensureSnap(d, t); const e = s.exercises.find((x) => x.exId === el.dataset.ex); if (e) e.notes = el.value; });
    state.ui.workoutId = t.id; state.ui.workoutDate = state.date;
  },

  async 'w-notes'(el) {
    const t = findT(el.dataset.id); if (!t) return;
    await updateDay(state.date, (d) => { ensureSnap(d, t).notes = el.value; });
  },

  async 'w-duration'(el) {
    const t = findT(el.dataset.id); if (!t) return;
    const v = num(el.value);
    await updateDay(state.date, (d) => { ensureSnap(d, t).duration = v == null ? null : Math.max(0, Math.round(v)); });
    registerToast();
  },

  async 'w-timer-start'(el) {
    const t = findT(el.dataset.id); if (!t) return;
    if (state.date !== todayKey()) return toast('O cronômetro funciona no dia de hoje. Para outros dias, digite a duração. 💗');
    await updateDay(state.date, (d) => { const s = ensureSnap(d, t); s.timerStart = nowTime(); s.timerStartISO = new Date().toISOString(); s.notes = s.notes || ''; });
    state.ui.workoutId = t.id; state.ui.workoutDate = state.date;
    rerender();
    toast('Cronômetro iniciado ⏱️ Bom treino! 💗');
  },

  async 'w-timer-stop'(el) {
    const t = findT(el.dataset.id); if (!t) return;
    await updateDay(state.date, (d) => {
      const s = ensureSnap(d, t);
      if (s.timerStartISO) s.duration = Math.max(1, Math.round((Date.now() - new Date(s.timerStartISO).getTime()) / 60000));
      s.timerStart = null; s.timerStartISO = null;
    });
    rerender();
    registerToast();
  },

  async 'toggle-rest'() {
    await updateDay(state.date, (d) => { d.rest = !d.rest; });
    rerender();
    if (peekDay(state.date).rest) { hearts(4); toast('Descanso também é cuidado. 😴💗'); }
  },

  'ex-history'(el) {
    const name = el.dataset.name;
    const h = loadHistory(name).reverse();
    openSheet(`<h2>${esc(name)}</h2>
      ${h.length ? `<ul class="detail-list">${h.map((x) => `<li><div class="dl-title"><span>${fmtShort(x.date)}</span><span style="color:var(--pink-strong)">${esc(fmtNum(x.load))} kg</span></div><div class="dl-sub">${esc(x.workout)} · ${esc([x.sets ? x.sets + ' ×' : '', x.reps].filter(Boolean).join(' '))}</div></li>`).join('')}</ul>` : '<div class="empty"><span class="big">♡</span>Nenhuma carga registrada ainda.</div>'}
      <div class="sheet-actions"><button class="btn" data-close>Fechar</button></div>`);
  },

  'ex-edit'(el) { exerciseSheet(el.dataset.id, el.dataset.ex); },
  'add-exercise'(el) { exerciseSheet(el.dataset.id, null); },
  'edit-workout'(el) { workoutSheet(el.dataset.id); },
  'new-workout'() { workoutSheet(null); },

  'edit-prefs'() {
    openSheet(`<h2>Minhas preferências</h2>
      <label class="field"><span>Uma por linha</span><textarea class="input" id="pf" rows="8">${esc(state.settings.preferences || '')}</textarea></label>
      <div class="sheet-actions"><button class="btn ghost" data-close>Cancelar</button><button class="btn" id="ok">Salvar</button></div>`, {
      onMount(s, close) { s.querySelector('#ok').addEventListener('click', async () => { await setSetting('preferences', s.querySelector('#pf').value); close(); rerender(); }); }
    });
  }
};

/** Edita um exercício: vale para o modelo (próximos treinos) e para o registro do dia selecionado. */
function exerciseSheet(tid, exId) {
  const t = findT(tid); if (!t) return;
  const date = state.date;
  const snap = peekDay(date).workouts[tid];
  const te = exId ? t.exercises.find((e) => e.id === exId) : null;
  const se = exId && snap ? snap.exercises.find((e) => e.exId === exId) : null;
  const v = te ? { name: te.name, sets: te.sets, reps: te.reps, note: te.note } : se ? { name: se.name, sets: se.sets, reps: se.reps, note: se.tnote } : { name: '', sets: '3', reps: '10–12', note: '' };
  const idx = te ? t.exercises.indexOf(te) : -1;
  openSheet(`
    <h2>${exId ? 'Editar exercício' : '＋ Novo exercício'}</h2>
    <p class="small muted" style="margin-top:-6px">${esc(t.name)} · vale para os próximos treinos e para ${esc(fmtMedium(date))}. Dias anteriores não mudam.</p>
    <div class="form mt">
      <label class="field"><span>Nome</span><input class="input" id="nm" value="${esc(v.name)}" placeholder="ex.: Cadeira adutora"></label>
      <div class="row"><label class="field" style="width:100px"><span>Séries</span><input class="input" id="st" value="${esc(v.sets)}" inputmode="numeric"></label>
      <label class="field grow"><span>Repetições / tempo</span><input class="input" id="rp" value="${esc(v.reps)}" placeholder="10–12 ou 5 minutos"></label></div>
      <label class="field"><span>Observação fixa (opcional)</span><input class="input" id="nt" value="${esc(v.note || '')}" placeholder="ex.: amplitude confortável para o joelho"></label>
      ${te ? `<div class="row"><button class="mini-btn grow" id="up" ${idx <= 0 ? 'disabled' : ''}>↑ Subir</button><button class="mini-btn grow" id="down" ${idx >= t.exercises.length - 1 ? 'disabled' : ''}>↓ Descer</button></div>` : ''}
    </div>
    <div class="sheet-actions">${exId ? '<button class="btn danger" id="rm">Remover</button>' : '<button class="btn ghost" data-close>Cancelar</button>'}<button class="btn" id="ok">Salvar</button></div>`, {
    onMount(s, close) {
      const save = async (mutTpl, mutSnap) => {
        const list = clone(templates());
        const tt = list.find((x) => x.id === tid);
        mutTpl(tt);
        await setSetting('workouts', list);
        if (snap && mutSnap) await updateDay(date, (d) => { if (d.workouts[tid]) mutSnap(d.workouts[tid]); });
        close(); rerender();
      };
      s.querySelector('#ok').addEventListener('click', async () => {
        const data = { name: s.querySelector('#nm').value.trim(), sets: s.querySelector('#st').value.trim(), reps: s.querySelector('#rp').value.trim(), note: s.querySelector('#nt').value.trim() };
        if (!data.name) return toast('Dê um nome ao exercício 💗');
        if (exId) {
          await save((tt) => {
            const e = tt.exercises.find((x) => x.id === exId);
            if (e) Object.assign(e, data); else tt.exercises.push({ id: exId, ...data });
          }, (sn) => { const e = sn.exercises.find((x) => x.exId === exId); if (e) Object.assign(e, { name: data.name, sets: data.sets, reps: data.reps, tnote: data.note }); });
        } else {
          const id = uid('exr');
          await save((tt) => { tt.exercises.push({ id, ...data }); }, null);
        }
      });
      const rm = s.querySelector('#rm');
      if (rm) rm.addEventListener('click', async () => {
        await save((tt) => { tt.exercises = tt.exercises.filter((x) => x.id !== exId); },
          (sn) => { // remove do dia apenas se ainda não tinha nada registrado nele
            sn.exercises = sn.exercises.filter((x) => x.exId !== exId || x.done || x.load || x.notes);
          });
      });
      const mv = (dir) => save((tt) => { const i = tt.exercises.findIndex((x) => x.id === exId); const j = i + dir; if (i < 0 || j < 0 || j >= tt.exercises.length) return; [tt.exercises[i], tt.exercises[j]] = [tt.exercises[j], tt.exercises[i]]; },
        (sn) => { const i = sn.exercises.findIndex((x) => x.exId === exId); const j = i + dir; if (i < 0 || j < 0 || j >= sn.exercises.length) return; [sn.exercises[i], sn.exercises[j]] = [sn.exercises[j], sn.exercises[i]]; });
      const up = s.querySelector('#up'), down = s.querySelector('#down');
      if (up) up.addEventListener('click', () => mv(-1));
      if (down) down.addEventListener('click', () => mv(1));
    }
  });
}

function workoutSheet(tid) {
  const t = tid ? clone(findT(tid)) : { id: uid('tr'), name: `Treino ${String.fromCharCode(65 + templates().length)}`, subtitle: '', emoji: '💪', exercises: [] };
  openSheet(`
    <h2>${tid ? 'Editar treino' : '＋ Novo treino'}</h2>
    <div class="form">
      <div class="row"><label class="field" style="width:80px"><span>Emoji</span><input class="input" id="em" value=""></label>
      <label class="field grow"><span>Nome</span><input class="input" id="nm" value="${esc(t.name)}"></label></div>
      <label class="field"><span>Foco</span><input class="input" id="sb" value="${esc(t.subtitle)}" placeholder="ex.: Glúteos e core"></label>
    </div>
    <div class="sheet-actions">${tid && templates().length > 1 ? '<button class="btn danger" id="rm">Excluir</button>' : '<button class="btn ghost" data-close>Cancelar</button>'}<button class="btn" id="ok">Salvar</button></div>`, {
    onMount(s, close) {
      s.querySelector('#ok').addEventListener('click', async () => {
        const name = s.querySelector('#nm').value.trim();
        if (!name) return toast('Dê um nome ao treino 💗');
        Object.assign(t, { name, subtitle: s.querySelector('#sb').value.trim(), emoji: s.querySelector('#em').value.trim() || '💪' });
        const list = clone(templates());
        const i = list.findIndex((x) => x.id === t.id);
        if (i >= 0) list[i] = t; else list.push(t);
        await setSetting('workouts', list);
        state.ui.workoutId = t.id; state.ui.workoutDate = state.date;
        close(); rerender();
      });
      const rm = s.querySelector('#rm');
      if (rm) rm.addEventListener('click', async () => {
        const ok = await confirmSheet({ title: `Excluir ${t.name}?`, text: 'Os treinos já registrados continuam no histórico.', ok: 'Excluir', danger: true });
        if (ok) { await setSetting('workouts', templates().filter((x) => x.id !== t.id)); state.ui.workoutId = null; }
        rerender();
      });
    }
  });
}
