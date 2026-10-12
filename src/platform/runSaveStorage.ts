import { hostedJsonStorage } from './hostedJsonStorage';
import { RUN_SAVES, RUN_SAVE_STORAGE_KEY, type RunSaveStorage } from '../models/runSaves';

export function browserRunSaveStorage(): RunSaveStorage {
  return {
    async read() { return localStorage.getItem(RUN_SAVE_STORAGE_KEY); },
    async write(contents) { localStorage.setItem(RUN_SAVE_STORAGE_KEY, contents); },
    async remove() { localStorage.removeItem(RUN_SAVE_STORAGE_KEY); },
  };
}

export function hostedRunSaveStorage(
  browser = browserRunSaveStorage(), request: typeof fetch = fetch, requireHost = import.meta.env.DEV,
): Promise<RunSaveStorage> {
  return hostedJsonStorage('/__stts/run-saves', 'stts.run-saves-file.v1', browser, request, requireHost);
}

export async function initializeRunSaves(storage?: RunSaveStorage): Promise<void> {
  if (!storage) {
    try { storage = await hostedRunSaveStorage(); }
    catch (error) {
      // Preserve the existing read-failure protection and failure dialog. Do not
      // silently claim success in private-browser storage if the file host fails.
      storage = { read: async () => { throw error; }, write: async () => { throw error; }, remove: async () => { throw error; } };
    }
  }
  await RUN_SAVES.initialize(storage);
}
