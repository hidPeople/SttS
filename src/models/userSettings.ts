import type { Language } from './localization';
import type { ConversationDesign } from '../data/conversationAppearance';

export interface UserSettings {
  language: Language;
  cardHoverLevel: 0 | 1 | 2;
  // Unset fields follow the editable defaults in CONVERSATION_APPEARANCE.
  conversation: { design?: ConversationDesign; opacity?: number };
  gallery: {
    seenConversationIds: string[];
    seenPortraitIds: string[];
    forcedEventsUnlocked: boolean;
    forcedPortraitsUnlocked: boolean;
  };
}

/** Platform boundary: an exe host can supply app-config/user-settings.json I/O. */
export interface UserSettingsStorage {
  read(): Promise<string | null>;
  write(contents: string): Promise<void>;
  remove(): Promise<void>;
}

export const USER_SETTINGS_STORAGE_KEY = 'stts.user-settings';
const USER_SETTINGS_VERSION = 3;
const SAVE_DEBOUNCE_MS = 150;
const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};

export function normalizeUserSettings(value: unknown): UserSettings {
  const source = record(value), conversation = record(source.conversation), gallery = record(source.gallery);
  const design = conversation.design;
  const stringArray = (candidate: unknown): string[] => Array.isArray(candidate)
    ? [...new Set(candidate.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0))]
    : [];
  return {
    language: source.language === 'en' ? 'en' : 'ja',
    cardHoverLevel: source.cardHoverLevel === 1 || source.cardHoverLevel === 2 ? source.cardHoverLevel : 0,
    conversation: {
      ...(design === 'graphite' || design === 'paper' || design === 'night' ? { design } : {}),
      ...(typeof conversation.opacity === 'number' && Number.isFinite(conversation.opacity)
        ? { opacity: Math.max(0, Math.min(1, conversation.opacity)) } : {}),
    },
    gallery: {
      seenConversationIds: stringArray(gallery.seenConversationIds),
      seenPortraitIds: stringArray(gallery.seenPortraitIds),
      forcedEventsUnlocked: gallery.forcedEventsUnlocked === true,
      forcedPortraitsUnlocked: gallery.forcedPortraitsUnlocked === true,
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
  get value(): Readonly<UserSettings> { return this.current; }

  async initialize(storage: UserSettingsStorage): Promise<void> {
    this.storage = storage;
    try {
      const raw = await storage.read();
      if (!raw) return;
      const saved = record(JSON.parse(raw));
      this.futureVersion = typeof saved.version === 'number' && saved.version > USER_SETTINGS_VERSION;
      // Do not overwrite settings saved by a newer executable.
      if (typeof saved.version === 'number' && saved.version <= USER_SETTINGS_VERSION) {
        this.current = normalizeUserSettings(saved.settings);
      }
    } catch (error) { console.warn('ユーザー設定を読み込めませんでした。初期設定で続行します。', error); }
  }

  update(patch: Partial<UserSettings>): void {
    const next = normalizeUserSettings({ ...this.current, ...patch,
      conversation: { ...this.current.conversation, ...patch.conversation },
      gallery: { ...this.current.gallery, ...patch.gallery } });
    if (JSON.stringify(next) === JSON.stringify(this.current)) return;
    this.current = next;
    this.dirty = true;
    if (!this.storage || this.futureVersion) return;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => { void this.flush(); }, SAVE_DEBOUNCE_MS);
  }

  markConversationSeen(id: string): void {
    if (!id || this.current.gallery.seenConversationIds.includes(id)) return;
    this.update({ gallery: { ...this.current.gallery, seenConversationIds: [...this.current.gallery.seenConversationIds, id] } });
  }

  markPortraitSeen(id: string): void {
    if (!id || this.current.gallery.seenPortraitIds.includes(id)) return;
    this.update({ gallery: { ...this.current.gallery, seenPortraitIds: [...this.current.gallery.seenPortraitIds, id] } });
  }

  unlockAllEvents(ids: readonly string[]): void {
    this.update({ gallery: {
      ...this.current.gallery,
      seenConversationIds: [...new Set([...this.current.gallery.seenConversationIds, ...ids])],
      forcedEventsUnlocked: true,
    } });
  }

  unlockAllPortraits(ids: readonly string[]): void {
    this.update({ gallery: {
      ...this.current.gallery,
      seenPortraitIds: [...new Set([...this.current.gallery.seenPortraitIds, ...ids])],
      forcedPortraitsUnlocked: true,
    } });
  }

  async reset(): Promise<void> {
    clearTimeout(this.timer); this.timer = undefined;
    this.current = normalizeUserSettings(undefined);
    this.dirty = false;
    this.futureVersion = false;
    await this.writes;
    if (this.storage) await this.storage.remove();
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
