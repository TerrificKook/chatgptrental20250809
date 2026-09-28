import type { CatalogPackage, CatalogState } from "../domain/models";
import { DomainError } from "../domain/calculations";

export interface MarketplaceRepository {
  init(seed: CatalogPackage): Promise<CatalogState>;
  getState(): Promise<CatalogState>;
  mutate(change: (state: CatalogState) => void): Promise<CatalogState>;
  subscribe(listener: () => void): () => void;
}
export function stateFromSeed(seed: CatalogPackage): CatalogState {
  if (
    seed.schemaVersion !== 1 ||
    !Array.isArray(seed.sellers) ||
    !Array.isArray(seed.listings) ||
    !Array.isArray(seed.images) ||
    !Array.isArray(seed.categories) ||
    !Array.isArray(seed.collections)
  )
    throw new DomainError(
      "Начальный каталог имеет неподдерживаемую схему. Локальные данные не сброшены.",
    );
  const now = new Date().toISOString();
  return {
    ...structuredClone(seed),
    revision: 0,
    users: [
      ...new Map(
        [
          ...seed.sellers.map((seller) => ({
            id: seller.userId,
            alias: seller.name,
            isAdmin: false,
            isDemo: true as const,
            createdAt: now,
          })),
          {
            id: "participant",
            alias: "Динар · демо-участник",
            isAdmin: false,
            isDemo: true as const,
            createdAt: now,
          },
          {
            id: "admin",
            alias: "Администратор демо",
            isAdmin: true,
            isDemo: true as const,
            createdAt: now,
          },
        ].map((user) => [user.id, user]),
      ).values(),
    ],
    favorites: [],
    selections: [],
    savedSelections: [],
    requestGroups: [],
    ownerRequests: [],
    audit: [],
  };
}
function normalizeState(state: CatalogState): CatalogState {
  if (!state || state.schemaVersion !== 1)
    throw new DomainError(
      "Неподдерживаемое или неинициализированное хранилище. Данные не сброшены.",
    );
  if (state.savedSelections === undefined) state.savedSelections = [];
  if (!Array.isArray(state.savedSelections))
    throw new DomainError(
      "Повреждён раздел сохранённых подборок. Данные не сброшены.",
    );
  return state;
}
export class IndexedDbRepository implements MarketplaceRepository {
  private dbPromise?: Promise<IDBDatabase>;
  private listeners = new Set<() => void>();
  private channel?: BroadcastChannel;
  constructor(readonly name = "kinostore-catalog-demo-v1") {
    if (typeof BroadcastChannel !== "undefined") {
      this.channel = new BroadcastChannel(name);
      this.channel.onmessage = () => this.notify(false);
    }
  }
  private open(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;
    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === "undefined")
        return reject(
          new DomainError(
            "IndexedDB недоступна. Разрешите локальное хранилище браузера.",
          ),
        );
      const request = indexedDB.open(this.name, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains("state"))
          request.result.createObjectStore("state");
      };
      request.onsuccess = () => {
        request.result.onversionchange = () => {
          request.result.close();
          this.dbPromise = undefined;
          this.notify(false);
        };
        resolve(request.result);
      };
      request.onerror = () => {
        this.dbPromise = undefined;
        reject(
          new DomainError(
            `Не удалось открыть хранилище: ${request.error?.message ?? "ошибка браузера"}. Данные не сброшены.`,
          ),
        );
      };
      request.onblocked = () =>
        reject(
          new DomainError(
            "Обновление хранилища заблокировано другой вкладкой. Закройте другие вкладки Kinostore и повторите.",
          ),
        );
    });
    return this.dbPromise;
  }
  async init(seed: CatalogPackage): Promise<CatalogState> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("state", "readwrite"),
        store = transaction.objectStore("state"),
        request = store.get("catalog");
      let state: CatalogState;
      request.onsuccess = () => {
        try {
          state = request.result as CatalogState;
          if (!state) {
            state = stateFromSeed(seed);
            store.put(state, "catalog");
          } else {
            const needsUpgrade = state.savedSelections === undefined;
            normalizeState(state);
            if (needsUpgrade) store.put(state, "catalog");
          }
        } catch (error) {
          transaction.abort();
          reject(error);
        }
      };
      transaction.oncomplete = () => resolve(structuredClone(state));
      transaction.onerror = () =>
        reject(
          new DomainError(
            `Не удалось загрузить данные: ${transaction.error?.message ?? "ошибка хранилища"}. Данные не сброшены.`,
          ),
        );
      transaction.onabort = () =>
        reject(
          new DomainError("Загрузка отменена. Локальные данные сохранены."),
        );
    });
  }
  async getState(): Promise<CatalogState> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("state", "readonly"),
        request = transaction.objectStore("state").get("catalog");
      request.onsuccess = () => {
        try {
          resolve(normalizeState(request.result as CatalogState));
        } catch (error) {
          reject(error);
        }
      };
      request.onerror = () =>
        reject(new DomainError("Не удалось прочитать локальные данные."));
    });
  }
  async mutate(change: (state: CatalogState) => void): Promise<CatalogState> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      // Read and write belong to the SAME readwrite transaction. IndexedDB serializes
      // competing transactions across tabs, so no last-writer stale-state overwrite occurs.
      const transaction = db.transaction("state", "readwrite"),
        store = transaction.objectStore("state"),
        request = store.get("catalog");
      let state: CatalogState;
      request.onsuccess = () => {
        try {
          state = request.result as CatalogState;
          normalizeState(state);
          change(state);
          state.revision++;
          store.put(state, "catalog");
        } catch (error) {
          transaction.abort();
          reject(error);
        }
      };
      transaction.oncomplete = () => {
        this.notify();
        resolve(structuredClone(state));
      };
      transaction.onerror = () =>
        reject(
          new DomainError(
            `Не удалось сохранить изменения: ${transaction.error?.message ?? "ошибка хранилища"}. Проверьте свободное место.`,
          ),
        );
      transaction.onabort = () =>
        reject(new DomainError("Сохранение отменено. Изменения не применены."));
    });
  }
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  private notify(broadcast = true) {
    for (const listener of this.listeners) listener();
    if (broadcast) this.channel?.postMessage("changed");
  }
  async close(): Promise<void> {
    this.channel?.close();
    (await this.dbPromise)?.close();
    this.dbPromise = undefined;
  }
}
