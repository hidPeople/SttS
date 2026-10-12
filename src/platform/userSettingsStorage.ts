import { hostedJsonStorage } from './hostedJsonStorage';
import { USER_SETTINGS, USER_SETTINGS_STORAGE_KEY, type UserSettingsStorage } from '../models/userSettings';

/** No absolute paths or game-progress dependencies. WebViews also supply Storage. */
export function browserUserSettingsStorage(): UserSettingsStorage {
  return {
    async read() { return localStorage.getItem(USER_SETTINGS_STORAGE_KEY); },
    async write(contents) { localStorage.setItem(USER_SETTINGS_STORAGE_KEY, contents); },
    async remove() { localStorage.removeItem(USER_SETTINGS_STORAGE_KEY); },
  };
}

const SETTINGS_ENDPOINT = '/__stts/user-settings';
const HOST_PROTOCOL = 'stts.user-settings-file.v1';
export function hostedUserSettingsStorage(
  browser = browserUserSettingsStorage(), request: typeof fetch = fetch, requireHost = import.meta.env.DEV,
): Promise<UserSettingsStorage> {
  return hostedJsonStorage(SETTINGS_ENDPOINT, HOST_PROTOCOL, browser, request, requireHost);
}

export async function initializeUserSettings(storage?: UserSettingsStorage): Promise<void> {
  if (!storage) {
    try { storage = await hostedUserSettingsStorage(); }
    catch (error) {
      // Let the store's normal read-error protection/dialog handle host failures.
      // Falling back silently would look successful but lose private-mode history.
      storage = { read: async () => { throw error; }, write: async () => { throw error; }, remove: async () => { throw error; } };
    }
  }
  await USER_SETTINGS.initialize(storage);
  // Real-time debounce combines slider/wheel updates. Flush again on exit/background.
  window.addEventListener('pagehide', () => { void USER_SETTINGS.flush(); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void USER_SETTINGS.flush();
  });
}
