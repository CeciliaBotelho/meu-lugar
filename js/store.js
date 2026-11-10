// Estado do app em memória + gravação imediata no IndexedDB a cada alteração.
import * as db from './db.js';
import { DEFAULT_MENU, DEFAULT_WORKOUTS, DEFAULT_KCAL_REFERENCE, DEFAULT_PREFERENCES, DEFAULT_CYCLE } from './defaults.js';
import { todayKey, isValidKey } from './dates.js';

export const SCHEMA_VERSION = 1;

const clone = (o) => (o === undefined ? undefined : JSON.parse(JSON.stringify(o)));
export { clone };

export const state = {
  days: new Map(),        // date -> registro do dia
  settings: {},           // key -> value
  tab: 'home',
  date: todayKey(),       // data selecionada nas abas de registro
  ui: {}                  // estado de interface (não persistido)
};

const SETTINGS_DEFAULTS = () => ({
  schemaVersion: SCHEMA_VERSION,
  menu: clone(DEFAULT_MENU),
  workouts: clone(DEFAULT_WORKOUTS),
  kcalReference: DEFAULT_KCAL_REFERENCE,
  preferences: DEFAULT_PREFERENCES,
  cycleDefaults: clone(DEFAULT_CYCLE),
  customSymptoms: [],
  lastBackup: null,
  backupReminder: true,
  installedAt: new Date().toISOString()
});

export function uid(prefix = 'id') {
  const r = (crypto.getRandomValues ? crypto.getRandomValues(new Uint32Array(2)) : [Math.random() * 1e9, Date.now()]);
  return `${prefix}-${Date.now().toString(36)}-${Array.from(r).map((n) => n.toString(36)).join('')}`;
}

export function emptyDay(date) {
  const now = new Date().toISOString();
  return {
    date,
    schemaVersion: SCHEMA_VERSION,
    createdAt: now,
    updatedAt: now,
    meals: {},          // mealId -> { mealName, emoji, time, items: [snapshot] }
    extras: [],         // { uid, name, qty, kcal, time, mealId }
    workouts: {},       // templateId -> snapshot com exercícios, cargas, conclusão
    rest: false,
    flow: null,         // null | none | spotting | light | medium | heavy
    symptoms: [],       // { id, name, intensity }
    mood: null,
    energy: null,
    sleepHours: null,
    sleepQuality: null,
    cycleNotes: '',
    journal: '',
    flags: {}           // mensagens já mostradas (para não repetir)
  };
}

/** Migração de um registro de dia para o formato atual, sem perder campos. */
export function migrateDay(d) {
  const base = emptyDay(d.date);
  const out = { ...base, ...d };
  out.meals = d.meals && typeof d.meals === 'object' ? d.meals : {};
  out.extras = Array.isArray(d.extras) ? d.extras : [];
  out.workouts = d.workouts && typeof d.workouts === 'object' ? d.workouts : {};
  out.symptoms = Array.isArray(d.symptoms) ? d.symptoms : [];
  out.flags = d.flags || {};
  out.schemaVersion = SCHEMA_VERSION;
  return out;
}

export async function load() {
  const [days, settingsRows] = await Promise.all([db.getAll('days'), db.getAll('settings')]);
  state.days.clear();
  for (const d of days) if (d && isValidKey(d.date)) state.days.set(d.date, migrateDay(d));
  const defaults = SETTINGS_DEFAULTS();
  const s = {};
  for (const row of settingsRows) s[row.key] = row.value;
  const isNew = settingsRows.length === 0;
  state.settings = { ...defaults, ...s };
  // grava padrões que ainda não existem (primeira abertura ou campo novo de atualização)
  const writes = [];
  for (const k of Object.keys(defaults)) if (!(k in s)) writes.push(db.put('settings', { key: k, value: state.settings[k] }));
  if ((s.schemaVersion || 0) < SCHEMA_VERSION) {
    state.settings.schemaVersion = SCHEMA_VERSION;
    writes.push(db.put('settings', { key: 'schemaVersion', value: SCHEMA_VERSION }));
  }
  await Promise.all(writes);
  return { isNew };
}

export function getDay(date) {
  return state.days.get(date) || null;
}

/** Dia para leitura (pode ser vazio, sem gravar). */
export function peekDay(date) {
  return state.days.get(date) || emptyDay(date);
}

const listeners = new Set();
export function onSaveError(fn) { listeners.add(fn); }

/** Altera o dia e grava imediatamente. */
export async function updateDay(date, mutator) {
  const day = state.days.get(date) ? state.days.get(date) : emptyDay(date);
  mutator(day);
  day.updatedAt = new Date().toISOString();
  if (isDayEmpty(day)) {
    // dia sem nenhum dado: não guarda registro vazio
    state.days.delete(date);
    try { await db.del('days', date); } catch (e) { listeners.forEach((f) => f(e)); }
    return day;
  }
  state.days.set(date, day);
  try { await db.put('days', clone(day)); } catch (e) { listeners.forEach((f) => f(e)); throw e; }
  return day;
}

export function isDayEmpty(d) {
  const hasMeals = Object.values(d.meals || {}).some((m) => m.items && m.items.length);
  const hasWorkout = Object.values(d.workouts || {}).some((w) => w.exercises && (w.exercises.some((e) => e.done || e.load || e.notes) || w.duration || w.notes));
  return !hasMeals && !(d.extras && d.extras.length) && !hasWorkout && !d.rest && !d.flow &&
    !(d.symptoms && d.symptoms.length) && !d.mood && !d.energy && d.sleepHours == null && !d.sleepQuality &&
    !(d.cycleNotes || '').trim() && !(d.journal || '').trim();
}

export async function deleteDay(date) {
  state.days.delete(date);
  await db.del('days', date);
}

export async function setSetting(key, value) {
  state.settings[key] = value;
  try { await db.put('settings', { key, value: clone(value) }); } catch (e) { listeners.forEach((f) => f(e)); throw e; }
}

export function sortedDays() {
  return [...state.days.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
}

export function allSymptoms() {
  return [...(state.settings.customSymptoms || [])];
}
