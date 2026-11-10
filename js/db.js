// IndexedDB — tudo fica salvo SOMENTE neste aparelho.
// Versões do banco: só adicionamos estruturas; nada é apagado em atualizações.

const DB_NAME = 'cantinho-da-ce';
const DB_VERSION = 1;

let dbPromise = null;

export function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (!('indexedDB' in self)) { reject(new Error('Este navegador não oferece IndexedDB.')); return; }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (ev) => {
      const db = req.result;
      const old = ev.oldVersion;
      // Migrações incrementais e seguras (nunca apagam dados).
      if (old < 1) {
        db.createObjectStore('days', { keyPath: 'date' });   // um registro por data local
        db.createObjectStore('settings', { keyPath: 'key' }); // cardápio, treinos, preferências
      }
      // Exemplo para o futuro:
      // if (old < 2) { req.transaction.objectStore('days').createIndex('byMonth', 'month'); }
    };
    req.onsuccess = () => {
      const db = req.result;
      db.onversionchange = () => { db.close(); location.reload(); };
      resolve(db);
    };
    req.onerror = () => reject(req.error);
    req.onblocked = () => console.warn('IndexedDB bloqueado por outra aba aberta.');
  });
  return dbPromise;
}

function done(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Transação cancelada'));
  });
}

export async function getAll(store) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(store, 'readonly').objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function put(store, value) {
  const db = await openDB();
  const tx = db.transaction(store, 'readwrite');
  tx.objectStore(store).put(value);
  return done(tx);
}

export async function del(store, key) {
  const db = await openDB();
  const tx = db.transaction(store, 'readwrite');
  tx.objectStore(store).delete(key);
  return done(tx);
}

/** Substitui todo o conteúdo de forma atômica (usado na restauração de backup). */
export async function replaceAll(data) {
  const db = await openDB();
  const tx = db.transaction(['days', 'settings'], 'readwrite');
  const days = tx.objectStore('days');
  const settings = tx.objectStore('settings');
  days.clear();
  settings.clear();
  for (const d of data.days) days.put(d);
  for (const s of data.settings) settings.put(s);
  return done(tx);
}

export async function clearAll() {
  const db = await openDB();
  const tx = db.transaction(['days', 'settings'], 'readwrite');
  tx.objectStore('days').clear();
  tx.objectStore('settings').clear();
  return done(tx);
}
