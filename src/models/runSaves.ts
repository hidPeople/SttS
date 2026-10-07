import type { RunStateSnapshot } from './RunState';

export const RUN_SAVE_STORAGE_KEY = 'stts.run-saves';
export const RUN_SAVE_SLOT_COUNT = 100;
export const RUN_SAVE_PAGE_SIZE = 10;

export type RunSaveScene = 'battle' | 'reward' | 'novel';

export interface RunSavePreview {
  kind: RunSaveScene;
  title: string;
  detail: string;
  background?: string;
  portrait?: string;
  text?: string;
  hp?: number;
  maxHp?: number;
  ep?: number;
  maxEp?: number;
  turn?: number;
}

export interface RunSaveSlot {
  slot: number;
  savedAt: string;
  floor: number;
  scene: RunSaveScene;
  run: RunStateSnapshot;
  sceneState?: unknown;
  preview: RunSavePreview;
}

export interface RunSaveStorage {
  read(): Promise<string | null>;
  write(contents: string): Promise<void>;
  remove(): Promise<void>;
}

type CaptureProvider = () => Omit<RunSaveSlot, 'slot' | 'savedAt'>;

const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value)
  ? value as Record<string, unknown> : {};

class RunSaveStore {
  private slots = new Map<number, RunSaveSlot>();
  private storage?: RunSaveStorage;
  private captureProvider?: CaptureProvider;
  lastPage = 0;

  async initialize(storage: RunSaveStorage): Promise<void> {
    this.storage = storage;
    try {
      const raw = await storage.read();
      if (!raw) return;
      const saved = record(JSON.parse(raw));
      this.lastPage = clampPage(saved.lastPage);
      for (const candidate of Array.isArray(saved.slots) ? saved.slots : []) {
        const slot = candidate as RunSaveSlot;
        if (Number.isInteger(slot?.slot) && slot.slot >= 0 && slot.slot < RUN_SAVE_SLOT_COUNT && slot.run && slot.preview) {
          this.slots.set(slot.slot, slot);
        }
      }
    } catch (error) { console.warn('セーブデータを読み込めませんでした。', error); }
  }

  list(): RunSaveSlot[] { return [...this.slots.values()].sort((a, b) => a.slot - b.slot); }
  get(slot: number): RunSaveSlot | undefined { return this.slots.get(slot); }
  hasEligibleBodySave(): boolean { return this.list().some(save => save.run.eventBattleId !== 'prologue'); }

  setCaptureProvider(provider: CaptureProvider): () => void {
    this.captureProvider = provider;
    return () => { if (this.captureProvider === provider) this.captureProvider = undefined; };
  }
  capture(): Omit<RunSaveSlot, 'slot' | 'savedAt'> | undefined { return this.captureProvider?.(); }

  async save(slot: number, captured: Omit<RunSaveSlot, 'slot' | 'savedAt'>): Promise<RunSaveSlot> {
    const value: RunSaveSlot = { ...captured, slot, savedAt: new Date().toISOString() };
    this.slots.set(slot, value);
    this.lastPage = Math.floor(slot / RUN_SAVE_PAGE_SIZE);
    await this.flush();
    return value;
  }

  async delete(slot: number): Promise<void> { this.slots.delete(slot); await this.flush(); }
  async setLastPage(page: number): Promise<void> { this.lastPage = clampPage(page); await this.flush(); }
  async clear(): Promise<void> { this.slots.clear(); this.lastPage = 0; await this.storage?.remove(); }

  private async flush(): Promise<void> {
    await this.storage?.write(JSON.stringify({ version: 1, lastPage: this.lastPage, slots: this.list() }));
  }
}

function clampPage(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(9, Math.floor(value))) : 0;
}

export const RUN_SAVES = new RunSaveStore();

// TODO: マップ／ルート選択／ボス撃破などゲーム全体の進捗が実装された際はRunSaveSlotへ追加する。
// TODO: マップ画面のセーブプレビューは、マップ実装後に現在地点を中心とした見た目を生成する。
