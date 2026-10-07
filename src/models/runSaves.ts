import { normalizeSave, SAVE_VERSION } from './saveCompatibility';
import { reportStorageError } from './storageErrors';
import type { RunStateSnapshot } from './RunState';

export const RUN_SAVE_STORAGE_KEY = 'stts.run-saves';
export const RUN_SAVE_SLOT_COUNT = 100;
export const RUN_SAVE_PAGE_SIZE = 10;

export type RunSaveScene = 'battle' | 'reward' | 'novel';

export interface RunSavePreview {
  kind: RunSaveScene;
  /** 256x144 WebP/JPEG data URL. Kept inside the slot so overwrite/delete cannot orphan it. */
  image?: string;
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
  compatibility?: { repaired: boolean; restartedBattle: boolean };
}

export interface RunSaveStorage {
  read(): Promise<string | null>;
  write(contents: string): Promise<void>;
  remove(): Promise<void>;
}

type CaptureProvider = () => Omit<RunSaveSlot, 'slot' | 'savedAt'>;

const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value)
  ? value as Record<string, unknown> : {};

export class RunSaveStore {
  private slots = new Map<number, RunSaveSlot>();
  private originals = new Map<number, unknown>();
  private storage?: RunSaveStorage;
  private captureProvider?: CaptureProvider;
  private writes: Promise<unknown> = Promise.resolve();
  private readFailure?: unknown;
  private retrySave?: RunSaveSlot;
  private battleGeneration = 0;
  lastPage = 0;

  async initialize(storage: RunSaveStorage): Promise<void> {
    this.storage = storage;
    this.slots.clear(); this.originals.clear(); this.readFailure = undefined; this.lastPage = 0; this.invalidateRetry();
    try {
      const raw = await storage.read();
      if (!raw) return;
      const saved = record(JSON.parse(raw));
      if (!Array.isArray(saved.slots)) throw new SyntaxError('Invalid save container');
      this.lastPage = clampPage(saved.lastPage);
      for (const candidate of saved.slots) {
        const result = normalizeSave(candidate);
        if (!result) continue;
        const previous = record(record(candidate).compatibility);
        if (saved.version !== SAVE_VERSION || result.repaired || previous.repaired) result.save.compatibility = {
          repaired: true, restartedBattle: result.restartedBattle || previous.restartedBattle === true,
        };
        this.slots.set(result.save.slot, result.save);
        this.originals.set(result.save.slot, { ...record(candidate), compatibility: result.save.compatibility });
      }
    } catch (error) {
      this.readFailure = error;
      reportStorageError(error, 'read');
    }
  }

  list(): RunSaveSlot[] { return [...this.slots.values()].sort((a, b) => a.slot - b.slot); }
  get(slot: number): RunSaveSlot | undefined { return this.slots.get(slot); }
  hasEligibleBodySave(): boolean { return this.list().some(save => save.run.eventBattleId !== 'prologue'); }
  invalidateRetry(): number { this.retrySave = undefined; return ++this.battleGeneration; }
  get retryGeneration(): number { return this.battleGeneration; }
  canRetry(save: RunSaveSlot): boolean { return save === this.retrySave; }
  enableRetry(save: RunSaveSlot, generation: number): void {
    if (generation === this.battleGeneration && this.get(0) === save) this.retrySave = save;
  }

  setCaptureProvider(provider: CaptureProvider): () => void {
    this.captureProvider = provider;
    return () => { if (this.captureProvider === provider) this.captureProvider = undefined; };
  }
  capture(): Omit<RunSaveSlot, 'slot' | 'savedAt'> | undefined { return this.captureProvider?.(); }

  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const next = this.writes.then(operation);
    this.writes = next.catch(() => undefined);
    return next;
  }
  private async write(slots: Map<number, RunSaveSlot>, page: number): Promise<void> {
    if (this.readFailure) throw this.readFailure;
    if (!this.storage) throw { code: 'StorageUnavailable' };
    // Keep untouched slots in their original form, even when a compatibility load was declined.
    const originals = new Map([...slots].map(([id, save]) => [id,
      this.slots.get(id) === save ? this.originals.get(id) ?? save : save]));
    await this.storage.write(JSON.stringify({ version: SAVE_VERSION, lastPage: page, slots: [...originals.values()] }));
    this.originals = originals; this.slots = slots; this.lastPage = page;
  }
  save(slot: number, captured: Omit<RunSaveSlot, 'slot' | 'savedAt'>): Promise<RunSaveSlot> {
    return this.store(slot, captured, false);
  }
  saveAuto(captured: Omit<RunSaveSlot, 'slot' | 'savedAt'>): Promise<RunSaveSlot> {
    return this.store(0, captured, true);
  }
  private store(slot: number, captured: Omit<RunSaveSlot, 'slot' | 'savedAt'>, auto: boolean): Promise<RunSaveSlot> {
    const snapshot = JSON.parse(JSON.stringify(captured)) as typeof captured;
    return this.enqueue(async () => {
      if (!Number.isInteger(slot) || slot < 0 || slot >= RUN_SAVE_SLOT_COUNT) throw { code: 'EINVAL' };
      const value: RunSaveSlot = { ...snapshot, slot, savedAt: new Date().toISOString() };
      const next = new Map(this.slots); next.set(slot, value);
      await this.write(next, auto ? this.lastPage : Math.floor(slot / RUN_SAVE_PAGE_SIZE));
      return value;
    });
  }
  delete(slot: number): Promise<void> {
    return this.enqueue(async () => { const next = new Map(this.slots); next.delete(slot); await this.write(next, this.lastPage); });
  }
  setLastPage(page: number): Promise<void> {
    return this.enqueue(() => this.write(new Map(this.slots), clampPage(page)));
  }
  clear(): Promise<void> {
    return this.enqueue(async () => {
      if (!this.storage) throw { code: 'StorageUnavailable' };
      await this.storage.remove();
      this.slots.clear(); this.originals.clear(); this.lastPage = 0; this.readFailure = undefined; this.invalidateRetry();
    });
  }
}

function clampPage(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(9, Math.floor(value))) : 0;
}

export const RUN_SAVES = new RunSaveStore();

/** Return slot 0 only when it belongs to the battle represented by the current run state. */
export function retryableBattleAutoSave(run: RunStateSnapshot): RunSaveSlot | undefined {
  const save = RUN_SAVES.get(0);
  if (!save || !RUN_SAVES.canRetry(save) || save.scene !== 'battle' || save.run.eventBattleId === 'prologue') return undefined;
  const sameEncounter = save.run.encounterEnemyIds.length === run.encounterEnemyIds.length
    && save.run.encounterEnemyIds.every((enemyId, index) => enemyId === run.encounterEnemyIds[index]);
  return save.run.stage === run.stage
    && save.run.battleIndex === run.battleIndex
    && save.run.eventBattleId === run.eventBattleId
    && sameEncounter ? save : undefined;
}

// TODO: マップ／ルート選択／ボス撃破などゲーム全体の進捗が実装された際はRunSaveSlotへ追加する。
// TODO: マップ実装後はマップSceneも既存の画面スナップショット取得経路へ登録する。
