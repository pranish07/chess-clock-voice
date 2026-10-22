import type { DeepPartial } from './types';

export interface StorageArea {
  get(keys: string | string[] | null): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
  remove(keys: string | string[]): Promise<void>;
}

export function chromeSyncArea(): StorageArea {
  return {
    async get(keys) {
      return new Promise((resolve, reject) => {
        chrome.storage.sync.get(keys, (items) => {
          const error = chrome.runtime.lastError;
          if (error) reject(new Error(error.message));
          else resolve(items as Record<string, unknown>);
        });
      });
    },
    async set(items) {
      return new Promise((resolve, reject) => {
        chrome.storage.sync.set(items, () => {
          const error = chrome.runtime.lastError;
          if (error) reject(new Error(error.message));
          else resolve();
        });
      });
    },
    async remove(keys) {
      return new Promise((resolve, reject) => {
        chrome.storage.sync.remove(keys, () => {
          const error = chrome.runtime.lastError;
          if (error) reject(new Error(error.message));
          else resolve();
        });
      });
    },
  };
}

export function memoryArea(initial: Record<string, unknown> = {}): StorageArea {
  let items = { ...initial };
  return {
    async get(keys) {
      if (keys === null) return { ...items };
      const list = Array.isArray(keys) ? keys : [keys];
      const result: Record<string, unknown> = {};
      for (const key of list) {
        if (key in items) result[key] = items[key];
      }
      return result;
    },
    async set(next) {
      items = { ...items, ...next };
    },
    async remove(keys) {
      const list = Array.isArray(keys) ? keys : [keys];
      for (const key of list) delete items[key];
    },
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function deepMerge<T>(base: T, patch: DeepPartial<T>): T {
  if (!isObject(base) || !isObject(patch)) {
    return (patch === undefined ? base : patch) as T;
  }
  const result: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    const current = result[key];
    if (Array.isArray(value)) {
      result[key] = [...value];
    } else if (isObject(value) && isObject(current)) {
      result[key] = deepMerge(current, value as DeepPartial<typeof current>);
    } else {
      result[key] = value;
    }
  }
  return result as T;
}

export interface SettingsStoreOptions<T> {
  area: StorageArea;
  defaults: T;
  version: number;
  migrate: (raw: unknown) => T;
  normalize: (settings: T) => T;
  key?: string;
}

export class SettingsStore<T extends { version: number }> {
  private readonly area: StorageArea;
  private readonly defaults: T;
  private readonly version: number;
  private readonly migrate: (raw: unknown) => T;
  private readonly normalize: (settings: T) => T;
  private readonly key: string;

  constructor(options: SettingsStoreOptions<T>) {
    this.area = options.area;
    this.defaults = options.defaults;
    this.version = options.version;
    this.migrate = options.migrate;
    this.normalize = options.normalize;
    this.key = options.key ?? 'settings';
  }

  async get(): Promise<T> {
    const stored = await this.area.get(this.key);
    const raw = stored[this.key];
    if (raw === undefined) {
      const created = this.normalize(this.defaults);
      await this.write(created);
      return created;
    }
    const migrated = this.migrate(raw);
    const normalized = this.normalize(migrated);
    if (
      !isObject(raw) ||
      raw.version !== this.version ||
      JSON.stringify(migrated) !== JSON.stringify(normalized)
    ) {
      await this.write(normalized);
    }
    return normalized;
  }

  async replace(next: T): Promise<T> {
    const normalized = this.normalize({ ...next, version: this.version });
    await this.write(normalized);
    return normalized;
  }

  async patch(patch: DeepPartial<T>): Promise<T> {
    const current = await this.get();
    return this.replace(deepMerge(current, patch));
  }

  async reset(): Promise<T> {
    return this.replace(this.normalize(this.defaults));
  }

  private async write(settings: T): Promise<void> {
    await this.area.set({ [this.key]: settings });
  }
}
