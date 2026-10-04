import type { Language } from './localization';
import type { ConversationDesign } from '../data/conversationAppearance';

export interface UserSettings {
  language: Language;
  cardHoverLevel: 0 | 1 | 2;
  // Unset fields follow the editable defaults in CONVERSATION_APPEARANCE.
  conversation: { design?: ConversationDesign; opacity?: number };
}

/** Platform boundary: an exe host can supply app-config/user-settings.json I/O. */
export interface UserSettingsStorage {
  read(): Promise<string | null>;
  write(contents: string): Promise<void>;
}

export const USER_SETTINGS_STORAGE_KEY = 'stts.user-settings';
const USER_SETTINGS_VERSION = 1;
const SAVE_DEBOUNCE_MS = 150;
const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};

export function normalizeUserSettings(value: unknown): UserSettings {
  const source = record(value), conversation = record(source.conversation);
  const design = conversation.design;
  return {
    language: source.language === 'en' ? 'en' : 'ja',
    cardHoverLevel: source.cardHoverLevel === 1 || source.cardHoverLevel === 2 ? source.cardHoverLevel : 0,
    conversation: {
      ...(design === 'graphite' || design === 'paper' || design === 'night' ? { design } : {}),
      ...(typeof conversation.opacity === 'number' && Number.isFinite(conversation.opacity)
        ? { opacity: Math.max(0, Math.min(1, conversation.opacity)) } : {}),
    },
  };
}

export class UserSettingsStore {
  private current = normalizeUserSettings(undefined);
  private storage?: UserSettingsStorage;
  private timer?: ReturnType<typeof setTimeout>;
  private dirty = false;
  private futureVersion = false;
  private writes: Promise<void> = Promise.resolve();
  get value(): Readonly<Omit<UserSettings, 'conversation'>> & { readonly conversation: Readonly<UserSettings['conversation']> } { return this.current; }

  async initialize(storage: UserSettingsStorage): Promise<void> {
    this.storage = storage;
    try {
      const raw = await storage.read();
      if (!raw) return;
      const saved = record(JSON.parse(raw));
      this.futureVersion = typeof saved.version === 'number' && saved.version > USER_SETTINGS_VERSION;
      // Do not overwrite settings saved by a newer executable.
      if (saved.version === USER_SETTINGS_VERSION) this.current = normalizeUserSettings(saved.settings);
    } catch (error) { console.warn('ユーザー設定を読み込めませんでした。初期設定で続行します。', error); }
  }

  update(patch: Partial<UserSettings>): void {
    const next = normalizeUserSettings({ ...this.current, ...patch,
      conversation: { ...this.current.conversation, ...patch.conversation } });
    if (JSON.stringify(next) === JSON.stringify(this.current)) return;
    this.current = next;
    this.dirty = true;
    if (!this.storage || this.futureVersion) return;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => { void this.flush(); }, SAVE_DEBOUNCE_MS);
  }

  flush(): Promise<void> {
    clearTimeout(this.timer); this.timer = undefined;
    if (!this.dirty || !this.storage || this.futureVersion) return this.writes;
    this.dirty = false;
    const contents = JSON.stringify({ version: USER_SETTINGS_VERSION, settings: this.current });
    const storage = this.storage;
    this.writes = this.writes.then(() => storage.write(contents)).catch(error => {
      this.dirty = true;
      console.warn('ユーザー設定を保存できませんでした。この起動中の設定は維持します。', error);
    });
    return this.writes;
  }
}

export const USER_SETTINGS = new UserSettingsStore();
