import { invoke, isTauri } from '@tauri-apps/api/core';
import type { JsonStorage } from './hostedJsonStorage';
import { USER_SETTINGS } from '../models/userSettings';
import { RUN_SAVES } from '../models/runSaves';

export async function installDesktopCloseHandler(): Promise<void> {
  if (!isTauri()) return;
  const { getCurrentWindow } = await import('@tauri-apps/api/window');
  await getCurrentWindow().onCloseRequested(async () => {
    await Promise.all([USER_SETTINGS.flush(), RUN_SAVES.waitForPendingWrites()]);
  });
}

export function desktopStorage(store: 'settings' | 'runSaves'): JsonStorage | undefined {
  if (!isTauri()) return undefined;
  async function command<T>(name: string, args: Record<string, unknown>) {
    try { return await invoke<T>(name, { store, ...args }); }
    catch (cause) { throw Object.assign(new Error(String(cause)), { code: String(cause), cause }); }
  }
  return {
    read: () => command<string | null>('read_store', {}),
    write: contents => command<void>('write_store', { contents }),
    remove: () => command<void>('write_store', { contents: null }),
  };
}
