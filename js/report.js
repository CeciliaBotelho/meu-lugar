// Cálculos de resumo do dia e exportação em texto/PDF — sempre a partir do que foi registrado.
import { state, peekDay } from './store.js';
import { MOODS, ENERGY, SLEEP_QUALITY, FLOWS, INTENSITIES } from './defaults.js';
import { infoFor, PHASES, stats } from './cycle.js';
import { fmtLong } from './dates.js';
import { fmtNum } from './ui.js';

export const findMood = (id) => MOODS.find((m) => m.id === id);
export const findEnergy = (id) => ENERGY.find((m) => m.id === id);
export const findSleep = (id) => SLEEP_QUALITY.find((m) => m.id === id);
export const findFlow = (id) => FLOWS.find((m) => m.id === id);
export const intensityName = (n) => (INTENSITIES.find((i) => i.id === n) || {}).name || '';

export function mealEntries(day) {
  // ordem: cardápio atual primeiro, depois refeições que só existem no registro
  const order = (state.settings.menu || []).map((m) => m.id);
  const ids = Object.keys(day.meals || {}).filter((id) => (day.meals[id].items || []).length);
  ids.sort((a, b) => {
    const ia = order.indexOf(a), ib = order.indexOf(b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
  return ids.map((id) => ({ id, ...day.meals[id] }));
}

export function mealKcal(meal) {
  return (meal.items || []).reduce((s, it) => s + (Number(it.kcal) || 0), 0);
}

export function extrasKcal(day, mealId) {
  return (day.extras || []).filter((e) => mealId === undefined || (e.mealId || '') === mealId).reduce((s, e) => s + (Number(e.kcal) || 0), 0);
}

export function dayKcal(day) {
  const m = Object.values(day.meals || {}).reduce((s, meal) => s + mealKcal(meal), 0);
  return m + extrasKcal(day);
}

export function mealsRegistered(day) {
  return Object.values(day.meals || {}).filter((m) => (m.items || []).length).length;
}

export function plannedMeals() {
  return (state.settings.menu || []).filter((m) => m.planned !== false);
}

export function workoutEntries(day) {
  return Object.values(day.workouts || {}).filter((w) => (w.exercises || []).some((e) => e.done || e.load || e.notes) || w.duration || w.notes);
}

export function workoutProgress(w) {
  const total = (w.exercises || []).length;
  const done = (w.exercises || []).filter((e) => e.done).length;
  return { total, done, pct: total ? done / total : 0 };
}

export function exercisesDone(day) {
  return Object.values(day.workouts || {}).reduce((s, w) => s + workoutProgress(w).done, 0);
}

/** Treino "realizado" = pelo menos um exercício concluído. */
export function didWorkout(day) {
  return Object.values(day.workouts || {}).some((w) => workoutProgress(w).done > 0);
}

export function hasAnyData(day) {
  return !!state.days.get(day.date);
}

export function dayText(date) {
  const day = peekDay(date);
  const st = stats();
  const info = infoFor(date, st);
  const L = [];
  L.push('Cantinho da Ce 🌸 — Diário do dia');
  L.push(fmtLong(date));
  L.push('');

  L.push('🥤 ALIMENTAÇÃO');
  const meals = mealEntries(day);
  if (!meals.length && !(day.extras || []).length) L.push('  Nada registrado.');
  for (const m of meals) {
    L.push(`  ${m.emoji || '•'} ${m.mealName || m.id}${m.time ? ' — ' + m.time : ''} (${mealKcal(m)} kcal)`);
    for (const it of m.items) {
      L.push(`    • ${it.name} — ${it.kcal} kcal`);
      for (const ing of it.ingredients || []) L.push(`        - ${ing}`);
      if (it.note) L.push(`        Obs.: ${it.note}`);
    }
  }
  if ((day.extras || []).length) {
    L.push('  ➕ Alimentos extras:');
    for (const e of day.extras) L.push(`    • ${e.name}${e.qty ? ' (' + e.qty + ')' : ''} — ${e.kcal || 0} kcal${e.time ? ' às ' + e.time : ''}`);
  }
  L.push(`  Total registrado: ${dayKcal(day)} kcal`);
  L.push('');

  L.push('💪 TREINOS');
  const ws = workoutEntries(day);
  if (day.rest) L.push('  Dia de descanso 😴');
  if (!ws.length && !day.rest) L.push('  Nada registrado.');
  for (const w of ws) {
    const p = workoutProgress(w);
    L.push(`  ${w.emoji || ''} ${w.name}${w.subtitle ? ' — ' + w.subtitle : ''} (${p.done}/${p.total} concluídos)`);
    if (w.duration) L.push(`    Duração: ${w.duration} min`);
    for (const e of w.exercises) {
      const sr = [e.sets ? e.sets + ' ×' : '', e.reps].filter(Boolean).join(' ');
      L.push(`    [${e.done ? 'x' : ' '}] ${e.name}${sr ? ' — ' + sr : ''}${e.load ? ' — ' + fmtNum(e.load) + ' kg' : ''}${e.done ? '' : ' (pendente)'}`);
      if (e.notes) L.push(`        Obs.: ${e.notes}`);
    }
    if (w.notes) L.push(`    Observações do treino: ${w.notes}`);
  }
  L.push('');

  L.push('🌙 CICLO');
  if (info) {
    L.push(`  Dia estimado do ciclo: ${info.cycleDay}`);
    L.push(`  Fase estimada: ${PHASES[info.phase].name}`);
  } else L.push('  Sem menstruação registrada antes desta data para estimar o ciclo.');
  const fl = findFlow(day.flow);
  L.push(`  Menstruada: ${['light', 'medium', 'heavy'].includes(day.flow) ? 'sim' : day.flow ? 'não' : 'não registrado'}`);
  if (fl && day.flow !== 'none') L.push(`  Fluxo: ${fl.name}`);
  if ((day.symptoms || []).length) L.push('  Sintomas: ' + day.symptoms.map((s) => `${s.name} (${intensityName(s.intensity)})`).join(', '));
  if (day.mood) L.push(`  Humor: ${findMood(day.mood)?.name || day.mood} ${findMood(day.mood)?.emoji || ''}`);
  if (day.energy) L.push(`  Energia: ${findEnergy(day.energy)?.name || day.energy}`);
  if (day.sleepHours != null) L.push(`  Sono: ${fmtNum(day.sleepHours)} h`);
  if (day.sleepQuality) L.push(`  Qualidade do sono: ${findSleep(day.sleepQuality)?.name || day.sleepQuality}`);
  if (day.cycleNotes) L.push(`  Observações: ${day.cycleNotes}`);
  L.push('');

  L.push('💗 COMO FOI MEU DIA?');
  L.push(day.journal ? day.journal : '  (sem texto)');
  L.push('');
  L.push('— Estimativas do ciclo são aproximadas e não são diagnóstico nem método contraceptivo.');
  return L.join('\n');
}
