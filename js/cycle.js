// Cálculos do ciclo: apenas ESTIMATIVAS baseadas no calendário registrado.
// Não confirmam ovulação e não servem como método contraceptivo.
import { state, sortedDays } from './store.js';
import { BLEEDING_FLOWS } from './defaults.js';
import { addDays, diffDays } from './dates.js';

const MIN_VALID = 15, MAX_VALID = 60;   // ciclos fora disso não entram na média
const GAP_NEW_PERIOD = 3;               // dias sem sangramento para considerar nova menstruação

export function isBleeding(day) {
  return !!day && BLEEDING_FLOWS.includes(day.flow);
}

/** Lista de menstruações registradas: [{start, end, days}] */
export function periods() {
  const bleed = sortedDays().filter(isBleeding).map((d) => d.date);
  const out = [];
  for (const k of bleed) {
    const last = out[out.length - 1];
    if (last && diffDays(last.end, k) <= GAP_NEW_PERIOD) {
      last.end = k; last.days++;
    } else {
      out.push({ start: k, end: k, days: 1 });
    }
  }
  return out;
}

/** Ciclos completos (entre um início e o próximo). */
export function cycles() {
  const p = periods();
  const out = [];
  for (let i = 0; i < p.length - 1; i++) {
    const length = diffDays(p[i].start, p[i + 1].start);
    out.push({ start: p[i].start, nextStart: p[i + 1].start, length, periodDays: diffDays(p[i].start, p[i].end) + 1, valid: length >= MIN_VALID && length <= MAX_VALID });
  }
  return out;
}

export function stats() {
  const p = periods();
  const c = cycles();
  const valid = c.filter((x) => x.valid).slice(-6);
  const def = state.settings.cycleDefaults || { cycleLength: 28, periodLength: 5 };
  const avgCycle = valid.length ? Math.round(valid.reduce((s, x) => s + x.length, 0) / valid.length) : null;
  const perList = p.slice(-6).map((x) => diffDays(x.start, x.end) + 1);
  const avgPeriod = perList.length ? Math.round(perList.reduce((s, x) => s + x, 0) / perList.length) : null;
  const lengths = valid.map((x) => x.length);
  return {
    periods: p,
    cycles: c,
    avgCycle,
    avgPeriod,
    cycleLength: avgCycle || def.cycleLength,
    periodLength: avgPeriod || def.periodLength,
    usingDefaultCycle: !avgCycle,
    minCycle: lengths.length ? Math.min(...lengths) : null,
    maxCycle: lengths.length ? Math.max(...lengths) : null,
    basedOn: valid.length
  };
}

/**
 * Informação estimada do ciclo para uma data.
 * Retorna null se não houver menstruação registrada antes (ou na) data.
 */
export function infoFor(date, st = stats()) {
  const p = st.periods;
  let idx = -1;
  for (let i = 0; i < p.length; i++) if (p[i].start <= date) idx = i;
  if (idx === -1) return null;
  const cur = p[idx];
  const nextActual = p[idx + 1] ? p[idx + 1].start : null;
  const nextStart = nextActual || addDays(cur.start, st.cycleLength);
  const cycleDay = diffDays(cur.start, date) + 1;
  const ovulation = addDays(nextStart, -14);           // estimativa central
  const ovuFrom = addDays(nextStart, -16);              // 12–16 dias antes da próxima
  const ovuTo = addDays(nextStart, -12);
  const fertileFrom = addDays(ovulation, -5);
  const fertileTo = addDays(ovulation, 1);
  const dayRec = state.days.get(date);
  const bleeding = isBleeding(dayRec);
  const periodEnd = cur.end;
  const inRegisteredPeriod = date >= cur.start && date <= cur.end;
  const beyond = !nextActual && date >= nextStart; // passou da data estimada sem novo registro

  let phase;
  if (bleeding || inRegisteredPeriod) phase = 'men';
  else if (beyond) phase = 'unknown';
  else if (date < ovuFrom) phase = 'fol';
  else if (date <= ovuTo) phase = 'ovu';
  else phase = 'lut';

  return {
    cycleDay, start: cur.start, periodEnd, nextStart, nextIsActual: !!nextActual,
    ovulation, ovuFrom, ovuTo, fertileFrom, fertileTo,
    inFertile: date >= fertileFrom && date <= fertileTo,
    phase, bleeding, beyond, daysLate: beyond ? diffDays(nextStart, date) : 0,
    cycleLength: nextActual ? diffDays(cur.start, nextActual) : st.cycleLength
  };
}

export const PHASES = {
  men: { name: 'Menstruação', emoji: '🌷', short: 'Menstruação', cls: 'men' },
  fol: { name: 'Fase folicular', emoji: '🌱', short: 'Folicular', cls: 'fol' },
  ovu: { name: 'Ovulação estimada', emoji: '🦋', short: 'Ovulação (est.)', cls: 'ovu' },
  lut: { name: 'Fase lútea', emoji: '🌙', short: 'Lútea', cls: 'lut' },
  unknown: { name: 'Aguardando registro', emoji: '🤍', short: 'Sem estimativa', cls: '' }
};

export function phaseLabel(info) {
  if (!info) return 'Sem dados do ciclo';
  const ph = PHASES[info.phase];
  return `${ph.emoji} ${ph.name}`;
}

/** Classe de cor do calendário para uma data (registro real ou estimativa). */
export function dayClass(date, st, today, predicted) {
  const rec = state.days.get(date);
  if (isBleeding(rec)) return 'ph-men';
  if (predicted && predicted.has(date)) return 'ph-men-pred';
  const info = infoFor(date, st);
  if (info && !info.beyond) {
    if (info.phase === 'men') return 'ph-men';
    if (info.phase === 'ovu') return 'ph-ovu';
    if (info.phase === 'fol') return info.inFertile ? 'ph-fert' : 'ph-fol';
    if (info.phase === 'lut') return 'ph-lut';
  }
  return futureClass(date, st, today) || '';
}

/** Datas previstas da próxima menstruação (somente estimativa futura). */
export function predictedPeriodDays(st, today) {
  const p = st.periods;
  if (!p.length) return new Set();
  const last = p[p.length - 1];
  let next = addDays(last.start, st.cycleLength);
  const out = new Set();
  // até 3 ciclos à frente
  for (let c = 0; c < 3; c++) {
    for (let i = 0; i < st.periodLength; i++) {
      const k = addDays(next, i);
      if (k > today) out.add(k);
    }
    next = addDays(next, st.cycleLength);
  }
  return out;
}

/** Fase estimada para datas futuras além do ciclo atual (para pintar o calendário). */
export function futureClass(date, st, today) {
  const p = st.periods;
  if (!p.length || date <= today) return null;
  const last = p[p.length - 1];
  const since = diffDays(last.start, date);
  if (since < 0) return null;
  const L = st.cycleLength;
  const pos = since % L; // 0 = início estimado
  const n = Math.floor(since / L);
  if (n === 0) return null; // ciclo atual já tratado por infoFor
  if (pos < st.periodLength) return 'ph-men-pred';
  const daysToNext = L - pos;
  if (daysToNext >= 12 && daysToNext <= 16) return 'ph-ovu';
  if (daysToNext > 16) return (daysToNext <= 19) ? 'ph-fert' : 'ph-fol';
  return 'ph-lut';
}
