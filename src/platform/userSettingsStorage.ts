import { USER_SETTINGS, USER_SETTINGS_STORAGE_KEY, type UserSettingsStorage } from '../models/userSettings';

/** No absolute paths or game-progress dependencies. WebViews also supply Storage. */
export function browserUserSettingsStorage(): UserSettingsStorage {
  return {
    async read() { return localStorage.getItem(USER_SETTINGS_STORAGE_KEY); },
    async write(contents) { localStorage.setItem(USER_SETTINGS_STORAGE_KEY, contents); },
    async remove() { localStorage.removeItem(USER_SETTINGS_STORAGE_KEY); },
  };
}

export async function initializeUserSettings(storage = browserUserSettingsStorage()): Promise<void> {
  await USER_SETTINGS.initialize(storage);
  // Real-time debounce combines slider/wheel updates. Flush again on exit/background.
  window.addEventListener('pagehide', () => { void USER_SETTINGS.flush(); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void USER_SETTINGS.flush();
  });
}
