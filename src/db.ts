const DB_NAME = 'HeritageDB';
const DB_VERSION = 1;

export function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('people')) {
        db.createObjectStore('people', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('relationships')) {
        db.createObjectStore('relationships', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('stories')) {
        db.createObjectStore('stories', { keyPath: 'id' });
      }
    };
  });
}

export async function getAllFromStore<T>(storeName: 'people' | 'relationships' | 'stories'): Promise<T[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result as T[]);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function saveAllToStore<T>(storeName: 'people' | 'relationships' | 'stories', items: T[]): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);

    // Clear existing
    const clearReq = store.clear();

    clearReq.onsuccess = () => {
      let count = 0;
      if (items.length === 0) {
        resolve();
        return;
      }

      items.forEach((item) => {
        const addReq = store.put(item);
        addReq.onsuccess = () => {
          count++;
          if (count === items.length) {
            resolve();
          }
        };
        addReq.onerror = () => {
          reject(addReq.error);
        };
      });
    };

    clearReq.onerror = () => {
      reject(clearReq.error);
    };
  });
}
