export interface GalleryItem {
  id: string;
  svg: string;
  prompt: string;
  model: string;
  timestamp: number;
}

const DB_NAME = "SVGenGalleryDB";
const DB_VERSION = 1;
const STORE_NAME = "svgs";

class GalleryDatabase {
  private dbPromise: Promise<IDBDatabase>;
  private dbInstance: IDBDatabase | null = null;

  constructor() {
    this.dbPromise = this.initDb();
  }

  private initDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "id" });
        }
      };

      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        this.dbInstance = db;
        resolve(db);
      };

      request.onerror = (event) => {
        const error = (event.target as IDBOpenDBRequest).error;
        console.error("IndexedDB error:", error);
        reject(error);
      };
    });
  }

  private async getDb(): Promise<IDBDatabase> {
    return this.dbPromise;
  }

  async saveSvg(item: GalleryItem): Promise<void> {
    const db = await this.getDb();
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    return new Promise((resolve, reject) => {
      const request = store.put(item);
      request.onsuccess = () => resolve();
      request.onerror = (event) => reject((event.target as IDBRequest).error);
    });
  }

  async getAllSvgs(): Promise<GalleryItem[]> {
    const db = await this.getDb();
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result as GalleryItem[]);
      request.onerror = (event) => reject((event.target as IDBRequest).error);
    });
  }

  async deleteSvg(id: string): Promise<void> {
    const db = await this.getDb();
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = (event) => reject((event.target as IDBRequest).error);
    });
  }

  close() {
    if (this.dbInstance) {
      this.dbInstance.close();
      this.dbInstance = null;
    }
  }

  async deleteDatabase(): Promise<void> {
    this.close();
    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(DB_NAME);
      request.onsuccess = () => resolve();
      request.onerror = (event) => reject((event.target as IDBRequest).error);
    });
  }
}

export const galleryDb = new GalleryDatabase();
