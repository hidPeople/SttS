import { RUN_SAVES, RUN_SAVE_STORAGE_KEY, type RunSaveStorage } from '../models/runSaves';

export function browserRunSaveStorage(): RunSaveStorage {
  return {
    async read() { return localStorage.getItem(RUN_SAVE_STORAGE_KEY); },
    async write(contents) { localStorage.setItem(RUN_SAVE_STORAGE_KEY, contents); },
    async remove() { localStorage.removeItem(RUN_SAVE_STORAGE_KEY); },
  };
}

export async function initializeRunSaves(storage = browserRunSaveStorage()): Promise<void> {
  await RUN_SAVES.initialize(storage);
}
