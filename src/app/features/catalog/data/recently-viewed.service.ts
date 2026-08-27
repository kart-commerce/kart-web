import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';

const DB_NAME = 'kart-recently-viewed';
const STORE_NAME = 'entries';
const DB_VERSION = 1;
const MAX_ENTRIES = 50;

interface RecentlyViewedEntry {
  readonly sku: string;
  readonly viewedAt: number;
}

/**
 * WEB-19 — "recently viewed," resolved as client-local only (requirement-spec.md §9
 * resolution #2): IndexedDB, capped at 50 entries, no backend persistence, no cross-device
 * sync. Stores just the sku + a timestamp — display data is always resolved fresh against
 * `ProductService` (never a stale cached name/price/thumbnail).
 */
@Injectable({ providedIn: 'root' })
export class RecentlyViewedService {
  private readonly platformId = inject(PLATFORM_ID);
  private dbPromise: Promise<IDBDatabase> | null = null;

  readonly recentSkus = signal<readonly string[]>([]);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      void this.loadAll();
    }
  }

  async recordView(sku: string): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    const db = await this.openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put({ sku, viewedAt: Date.now() } satisfies RecentlyViewedEntry);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    await this.trimAndReload();
  }

  private async loadAll(): Promise<void> {
    const db = await this.openDb();
    const entries = await new Promise<RecentlyViewedEntry[]>((resolve, reject) => {
      const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).getAll();
      request.onsuccess = () => resolve(request.result as RecentlyViewedEntry[]);
      request.onerror = () => reject(request.error);
    });
    entries.sort((a, b) => b.viewedAt - a.viewedAt);
    this.recentSkus.set(entries.map((entry) => entry.sku));
  }

  private async trimAndReload(): Promise<void> {
    const db = await this.openDb();
    const entries = await new Promise<RecentlyViewedEntry[]>((resolve, reject) => {
      const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).getAll();
      request.onsuccess = () => resolve(request.result as RecentlyViewedEntry[]);
      request.onerror = () => reject(request.error);
    });
    entries.sort((a, b) => b.viewedAt - a.viewedAt);

    if (entries.length > MAX_ENTRIES) {
      const overflow = entries.slice(MAX_ENTRIES);
      const tx = db.transaction(STORE_NAME, 'readwrite');
      for (const entry of overflow) {
        tx.objectStore(STORE_NAME).delete(entry.sku);
      }
    }

    this.recentSkus.set(entries.slice(0, MAX_ENTRIES).map((entry) => entry.sku));
  }

  private openDb(): Promise<IDBDatabase> {
    this.dbPromise ??= new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE_NAME)) {
          request.result.createObjectStore(STORE_NAME, { keyPath: 'sku' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return this.dbPromise;
  }
}
