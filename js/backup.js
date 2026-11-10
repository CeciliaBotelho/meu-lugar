// Backup em JSON (opcionalmente criptografado com senha via Web Crypto: PBKDF2 + AES-GCM).
// Nada é enviado para a internet: o arquivo é gerado no aparelho e você escolhe onde salvar.
import { state, clone, SCHEMA_VERSION, migrateDay } from './store.js';
import * as db from './db.js';
import { isValidKey, todayKey } from './dates.js';

export const BACKUP_FORMAT = 'cantinho-da-ce-backup';
export const BACKUP_VERSION = 1;
const APP_VERSION = '1.0.1';

export function buildBackup() {
  const days = [...state.days.values()].map(clone).sort((a, b) => (a.date < b.date ? -1 : 1));
  const settings = Object.entries(state.settings).map(([key, value]) => ({ key, value: clone(value) }));
  return {
    format: BACKUP_FORMAT,
    backupVersion: BACKUP_VERSION,
    schemaVersion: SCHEMA_VERSION,
    appVersion: APP_VERSION,
    exportedAt: new Date().toISOString(),
    exportedLocalDate: todayKey(),
    counts: { days: days.length },
    contents: 'alimentação, extras, treinos, cargas, ciclo menstrual, sintomas, humor, energia, sono, diário e configurações',
    data: { days, settings }
  };
}

export function backupFilename(encrypted) {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `cantinho-da-ce-backup-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${encrypted ? '-protegido' : ''}.json`;
}

// ===== criptografia =====
const enc = new TextEncoder();
const dec = new TextDecoder();
const b64 = (buf) => { let s = ''; const a = new Uint8Array(buf); for (let i = 0; i < a.length; i += 0x8000) s += String.fromCharCode.apply(null, a.subarray(i, i + 0x8000)); return btoa(s); };
const unb64 = (str) => { const s = atob(str); const a = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) a[i] = s.charCodeAt(i); return a; };

async function deriveKey(password, salt, iterations) {
  const base = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

export function cryptoAvailable() {
  return !!(self.crypto && crypto.subtle && self.isSecureContext);
}

export async function encryptBackup(obj, password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const iterations = 250000;
  const key = await deriveKey(password, salt, iterations);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(obj)));
  return {
    format: BACKUP_FORMAT,
    backupVersion: BACKUP_VERSION,
    encrypted: true,
    exportedAt: obj.exportedAt,
    appVersion: APP_VERSION,
    kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations, salt: b64(salt) },
    cipher: { name: 'AES-GCM', iv: b64(iv) },
    payload: b64(ct)
  };
}

export async function decryptBackup(obj, password) {
  const key = await deriveKey(password, unb64(obj.kdf.salt), obj.kdf.iterations);
  try {
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(obj.cipher.iv) }, key, unb64(obj.payload));
    return JSON.parse(dec.decode(pt));
  } catch (e) {
    throw new Error('Senha incorreta ou arquivo danificado.');
  }
}

/** Valida e normaliza um backup já descriptografado. Lança erro com mensagem amigável. */
export function validateBackup(obj) {
  if (!obj || typeof obj !== 'object') throw new Error('O arquivo não contém um backup válido.');
  if (obj.format !== BACKUP_FORMAT) throw new Error('Este arquivo não é um backup do Cantinho da Ce.');
  if (typeof obj.backupVersion !== 'number' || obj.backupVersion > BACKUP_VERSION) throw new Error('Este backup foi criado por uma versão mais nova do app. Atualize o app e tente de novo.');
  if (!obj.data || !Array.isArray(obj.data.days) || !Array.isArray(obj.data.settings)) throw new Error('O backup está incompleto (faltam registros ou configurações).');
  const seen = new Set();
  const days = [];
  for (const d of obj.data.days) {
    if (!d || !isValidKey(d.date)) throw new Error('O backup contém uma data inválida.');
    if (seen.has(d.date)) throw new Error(`O backup contém o dia ${d.date} duplicado.`);
    seen.add(d.date);
    days.push(migrateDay(d));
  }
  const settings = [];
  for (const s of obj.data.settings) {
    if (!s || typeof s.key !== 'string') throw new Error('O backup contém configurações inválidas.');
    settings.push({ key: s.key, value: s.value });
  }
  const sorted = days.map((d) => d.date).sort();
  return { days, settings, exportedAt: obj.exportedAt, first: sorted[0] || null, last: sorted[sorted.length - 1] || null };
}

export async function restore(valid) {
  await db.replaceAll({ days: valid.days, settings: valid.settings });
}
