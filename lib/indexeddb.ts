// IndexedDB utility for storing large files
const DB_NAME = 'BirthdayVaultDB';
const STORE_NAME = 'adminData';
const DB_VERSION = 1;

let db: IDBDatabase | null = null;

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(new Error('Failed to open IndexedDB'));
    
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

export const saveData = async (data: any): Promise<void> => {
  try {
    const database = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      const request = store.put({
        id: 'adminData',
        data: data,
        timestamp: new Date().toISOString(),
      });

      request.onerror = () => reject(new Error('Failed to save data'));
      request.onsuccess = () => resolve();
    });
  } catch (error) {
    throw error;
  }
};

export const getData = async (): Promise<any | null> => {
  try {
    const database = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get('adminData');

      request.onerror = () => reject(new Error('Failed to read data'));
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.data : null);
      };
    });
  } catch (error) {
    throw error;
  }
};

export const deleteData = async (): Promise<void> => {
  try {
    const database = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete('adminData');

      request.onerror = () => reject(new Error('Failed to delete data'));
      request.onsuccess = () => resolve();
    });
  } catch (error) {
    throw error;
  }
};

export const getStorageSize = async (): Promise<number> => {
  try {
    const data = await getData();
    if (!data) return 0;
    const str = JSON.stringify(data);
    return new Blob([str]).size;
  } catch (error) {
    return 0;
  }
};