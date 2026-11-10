// Datas sempre no fuso local, como texto "AAAA-MM-DD" — evita misturar dias por causa de UTC.

const pad = (n) => String(n).padStart(2, '0');

export function toKey(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayKey() {
  return toKey(new Date());
}

/** Converte "AAAA-MM-DD" em Date ao meio-dia local (seguro contra horário de verão). */
export function fromKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

export function isValidKey(key) {
  if (typeof key !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
  const d = fromKey(key);
  return toKey(d) === key;
}

export function addDays(key, n) {
  const d = fromKey(key);
  d.setDate(d.getDate() + n);
  return toKey(d);
}

/** Diferença em dias inteiros (b - a). */
export function diffDays(a, b) {
  return Math.round((fromKey(b) - fromKey(a)) / 86400000);
}

export function nowTime() {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const WEEKDAYS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
const WEEKDAYS_SHORT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export { WEEKDAYS, WEEKDAYS_SHORT, MONTHS, MONTHS_SHORT };

export function fmtLong(key) {
  const d = fromKey(key);
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} de ${MONTHS[d.getMonth()]} de ${d.getFullYear()}`;
}

export function fmtMedium(key) {
  const d = fromKey(key);
  return `${d.getDate()} de ${MONTHS[d.getMonth()]}`;
}

export function fmtShort(key) {
  const d = fromKey(key);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export function fmtDM(key) {
  const d = fromKey(key);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}

export function weekdayShort(key) {
  return WEEKDAYS_SHORT[fromKey(key).getDay()];
}

/** Segunda-feira da semana da data. */
export function startOfWeek(key) {
  const d = fromKey(key);
  const wd = (d.getDay() + 6) % 7; // seg=0
  d.setDate(d.getDate() - wd);
  return toKey(d);
}

export function monthKey(key) {
  return key.slice(0, 7);
}

export function monthLabel(ym) {
  const [y, m] = ym.split('-').map(Number);
  return `${MONTHS[m - 1]} de ${y}`;
}

export function monthShortLabel(ym) {
  const [y, m] = ym.split('-').map(Number);
  return `${MONTHS_SHORT[m - 1]}/${String(y).slice(2)}`;
}

export function addMonths(ym, n) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1, 12);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

/** Datas exibidas num calendário mensal (semanas começando na segunda). */
export function monthGrid(ym) {
  const first = `${ym}-01`;
  const start = startOfWeek(first);
  const cells = [];
  let k = start;
  for (let i = 0; i < 42; i++) {
    cells.push(k);
    k = addDays(k, 1);
  }
  // remove última semana se for toda do mês seguinte
  while (cells.length > 35 && cells.slice(-7).every((c) => monthKey(c) !== ym)) cells.splice(-7);
  return cells;
}

export function range(fromK, toK) {
  const out = [];
  let k = fromK;
  let guard = 0;
  while (k <= toK && guard++ < 4000) { out.push(k); k = addDays(k, 1); }
  return out;
}
