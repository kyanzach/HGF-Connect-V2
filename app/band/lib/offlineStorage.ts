// app/band/lib/offlineStorage.ts
// IndexedDB client storage for songs, setlists, and offline backing track buffers

const DB_NAME = 'hgf_band_offline_db';
const DB_VERSION = 1;
const STORE_SONGS = 'songs';
const STORE_SETLISTS = 'setlists';
const STORE_AUDIO = 'audio_blobs';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported'));
    }
    const req = window.indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_SONGS)) {
        db.createObjectStore(STORE_SONGS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_SETLISTS)) {
        db.createObjectStore(STORE_SETLISTS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_AUDIO)) {
        db.createObjectStore(STORE_AUDIO, { keyPath: 'filename' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveSongsOffline(songs: any[]): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_SONGS, 'readwrite');
    const store = tx.objectStore(STORE_SONGS);
    for (const song of songs) {
      store.put(song);
    }
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (_) {}
}

export async function getSongsOffline(): Promise<any[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_SONGS, 'readonly');
    const store = tx.objectStore(STORE_SONGS);
    const req = store.getAll();
    return new Promise((resolve) => {
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch (_) {
    return [];
  }
}

export async function saveAudioBlobOffline(filename: string, blob: Blob): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_AUDIO, 'readwrite');
    tx.objectStore(STORE_AUDIO).put({ filename, blob, storedAt: Date.now() });
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (_) {}
}

export async function getAudioBlobOffline(filename: string): Promise<Blob | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_AUDIO, 'readonly');
    const req = tx.objectStore(STORE_AUDIO).get(filename);
    return new Promise((resolve) => {
      req.onsuccess = () => resolve(req.result?.blob || null);
      req.onerror = () => resolve(null);
    });
  } catch (_) {
    return null;
  }
}
