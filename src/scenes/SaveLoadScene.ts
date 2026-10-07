import { reportStorageError } from '../models/storageErrors';
import Phaser from 'phaser';
import { RUN_SAVES, RUN_SAVE_PAGE_SIZE, type RunSaveSlot } from '../models/runSaves';
import { restoreBodyProgress, restoreRunState, resetRunState } from '../models/RunState';
import { USER_SETTINGS } from '../models/userSettings';
import { SCREEN_CENTER_X, SCREEN_CENTER_Y, SCREEN_HEIGHT, SCREEN_WIDTH } from '../ui/layout';
import { GAME_FONT } from '../ui/fonts';
import { CachedCrayonPatch as CrayonPatch, CRAYON_COLORS } from '../ui/crayon';
import { onPrimaryClick, installPointerBack } from '../ui/pointerActions';
import { KeyboardNavigation } from '../ui/keyboardNavigation';
import { SETTINGS_STATE } from '../models/localization';
import { PLAYER_DEFINITION } from '../data/player';
import { captureSavePreview } from '../ui/savePreview';

export type SaveLoadMode = 'save' | 'load' | 'body';
export interface SaveLoadSceneData {
  mode: SaveLoadMode; sourceScene: string; exitAfterSave?: boolean; previewImage?: string;
  previewPending?: Promise<string | undefined>; onOpened?: () => void;
}

export function openSaveLoad(scene: Phaser.Scene, data: Omit<SaveLoadSceneData, 'sourceScene'>): void {
  const launch = (previewPending?: Promise<string | undefined>) => {
    if (!scene.sys.isActive()) return;
    scene.scene.launch('SaveLoadScene', { ...data, sourceScene: scene.scene.key, previewPending });
    scene.scene.pause();
  };
  if (data.mode !== 'save') { launch(); return; }
  const previewPending = captureSavePreview(scene).catch(() => undefined);
  // Snapshot pixels come from this frame, before the overlay exists. Opening the
  // UI waits only one render, not the asynchronous image decoding/encoding.
  const afterFrame = () => { scene.events.off('shutdown', cancel); launch(previewPending); };
  const cancel = () => scene.game.events.off('postrender', afterFrame);
  scene.events.once('shutdown', cancel);
  scene.game.events.once('postrender', afterFrame);
}

export class SaveLoadScene extends Phaser.Scene {
  private mode: SaveLoadMode = 'load';
  private sourceScene = 'TitleScene';
  private exitAfterSave = false;
  private page = 0;
  private previewImage?: string;
  private previewPending?: Promise<string | undefined>;
  private onOpened?: () => void;
  private previewViews = new Map<number, Phaser.GameObjects.Container>();
  private content!: Phaser.GameObjects.Container;
  private dialog?: Phaser.GameObjects.Container;
  private busy = false;
  private previewRevision = 0;
  private previewKeys = new Map<number, { image?: string; key: string }>();
  private ownedPreviewKeys = new Set<string>();
  private clearPreviewTextures(): void {
    for (const { key } of this.previewKeys.values()) if (this.textures.exists(key)) this.textures.remove(key);
    for (const key of this.ownedPreviewKeys) if (this.textures.exists(key)) this.textures.remove(key);
    this.ownedPreviewKeys.clear();
    this.previewKeys.clear();
  }
  private failedPreviewKeys = new Set<string>();
  private readonly onPreviewLoadError = (file: { key: string }) => {
    if (file.key.startsWith('run-save-preview:')) this.failedPreviewKeys.add(file.key);
  };

  constructor() { super('SaveLoadScene'); }

  init(data: SaveLoadSceneData): void {
    this.mode = data.mode;
    this.sourceScene = data.sourceScene;
    this.exitAfterSave = Boolean(data.exitAfterSave);
    this.previewImage = data.previewImage;
    this.previewPending = data.previewPending;
    this.onOpened = data.onOpened;
    this.previewViews.clear();
    this.page = RUN_SAVES.lastPage;
    this.dialog = undefined; this.busy = false;
    this.clearPreviewTextures();
    this.failedPreviewKeys.clear();
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, this.onPreviewLoadError);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.load.off(Phaser.Loader.Events.FILE_LOAD_ERROR, this.onPreviewLoadError));
  }

  create(): void {
    KeyboardNavigation.for(this).configure({ scope: () => this.dialog, filter: () => !this.busy, escape: () => this.close() });
    this.events.once('shutdown', () => { this.clearPreviewTextures(); this.previewViews.clear(); });
    installPointerBack(this, () => { this.close(); return true; });
    this.add.rectangle(SCREEN_CENTER_X, SCREEN_CENTER_Y, SCREEN_WIDTH, SCREEN_HEIGHT, 0x090c11, 0.96);
    this.add.text(640, 38, this.heading(), this.textStyle(30, '#f8fafc')).setOrigin(0.5);
    this.createButton(80, 38, 130, 38, this.ui('Back', '戻る'), () => this.close());
    this.content = this.add.container(0, 0);
    this.renderPage();
    this.onOpened?.(); this.onOpened = undefined;
  }

  private heading(): string {
    if (this.mode === 'save') return this.ui('Save Run', 'セーブ');
    if (this.mode === 'body') return this.ui('Choose Body State', 'からだの状態を選択');
    return this.ui('Load Run', 'ロード');
  }

  private renderPage(): void {
    this.content.removeAll(true);
    this.previewViews.clear();
    const pageStart = this.page * RUN_SAVE_PAGE_SIZE;
    for (let local = 0; local < RUN_SAVE_PAGE_SIZE; local += 1) {
      const slotIndex = pageStart + local;
      const x = 140 + (local % 5) * 250;
      const y = 218 + Math.floor(local / 5) * 270;
      this.content.add(this.createSlot(slotIndex, x, y));
    }
    this.content.add(this.createButton(480, 680, 100, 36, '◀', () => this.changePage(-1), this.page > 0));
    this.content.add(this.add.text(640, 680, `${this.page + 1} / 10`, this.textStyle(18, '#dbe5f2')).setOrigin(0.5));
    this.content.add(this.createButton(800, 680, 100, 36, '▶', () => this.changePage(1), this.page < 9));
    this.content.add(this.createButton(1145, 649, 230, 30, this.ui('Delete All Save Data', 'セーブデータの全削除'), () => this.confirmDeleteAllSaves(), true, true));
    this.content.add(this.createButton(1145, 686, 230, 30, this.ui('Delete All User Data', 'ユーザーデータの全削除'), () => this.confirmDeleteAll(), true, true));
    // Paint the page shell before starting any thumbnail decoding.
    this.events.once(Phaser.Scenes.Events.RENDER, () => this.queuePagePreviewImages());
  }

  private createSlot(slotIndex: number, x: number, y: number): Phaser.GameObjects.Container {
    const slot = RUN_SAVES.get(slotIndex);
    const eligible = this.mode !== 'body' || Boolean(slot && slot.run.eventBattleId !== 'prologue');
    const root = this.add.container(x, y);
    const isAuto = slotIndex === 0;
    const selectable = eligible && !(this.mode === 'save' && isAuto);
    const bg = new CrayonPatch(this, 0, 0, 230, 242, isAuto ? 0x173b2d : slot ? 0x26303e : 0x1b2029, selectable ? 1 : 0.62);
    bg.setStrokeStyle(2, isAuto ? 0x63c98e : slot ? 0x7d93ad : 0x4b5665, 0.9);
    const number = this.add.text(-104, -111, isAuto ? '0  AUTO SAVE' : `${slotIndex}`, this.textStyle(14, isAuto ? '#79e4a7' : '#91a4bd'));
    root.add([bg, number]);
    if (slot) {
      const preview = this.add.container(0, 0);
      root.add(preview); this.previewViews.set(slotIndex, preview);
      this.addSlotPreview(preview, slot);
    }
    else root.add(this.add.text(0, 0, this.ui('Empty', '空き'), this.textStyle(18, '#667180')).setOrigin(0.5));
    if (selectable && (slot || this.mode === 'save')) {
      bg.setInteractive({ useHandCursor: true });
      onPrimaryClick(bg, () => this.choose(slotIndex, slot));
      KeyboardNavigation.for(this).register(bg);
    }
    if (slot) {
      const remove = this.createButton(100, -105, 28, 26, '×', () => this.confirmDelete(slot), true, true);
      root.add(remove);
    }
    return root;
  }

  private addSlotPreview(root: Phaser.GameObjects.Container, slot: RunSaveSlot): void {
    const x = 0, y = -39, width = 210, height = 118;
    const snapshotKey = this.previewTextureKey(slot.slot);
    if (slot.preview.image && this.textures.exists(snapshotKey)) {
      root.add(this.add.image(x, y, snapshotKey).setDisplaySize(width, height));
      root.add(this.add.rectangle(x, y, width, height, 0, 0).setStrokeStyle(2, 0x8da0b7, 0.9));
      this.addSlotMetadata(root, slot);
      return;
    }
    root.add(this.add.rectangle(x, y, width, height, slot.scene === 'battle' ? 0x182332 : 0x10151c, 1));
    root.add(this.add.rectangle(x, y, width, height, 0, 0).setStrokeStyle(2, 0x8da0b7, 0.9));
    this.addSlotMetadata(root, slot);
  }

  private addSlotMetadata(root: Phaser.GameObjects.Container, slot: RunSaveSlot): void {
    const floor = slot.run.eventBattleId === 'prologue' ? this.ui('Prologue', 'プロローグ') : String(slot.floor);
    const hp = slot.preview.hp ?? slot.run.playerHp;
    const ep = slot.preview.ep ?? slot.run.playerEp;
    const maxHp = slot.preview.maxHp ?? PLAYER_DEFINITION.maxHp;
    const maxEp = slot.preview.maxEp ?? PLAYER_DEFINITION.maxEp;
    root.add(this.add.text(-104, 31, this.formatDate(slot.savedAt), this.textStyle(11, '#cbd6e3')));
    root.add(this.add.text(-104, 51, `${this.ui('Floor', '層')} ${floor}`, this.textStyle(11, '#dbe5f2')));
    root.add(this.add.text(-104, 72, `HP ${hp}/${maxHp}　EP ${ep}/${maxEp}`, this.textStyle(11, '#dbe5f2')));
    if (slot.preview.turn !== undefined) root.add(this.add.text(-104, 93, `${this.ui('Turn', 'ターン')} ${slot.preview.turn}`, this.textStyle(11, '#dbe5f2')));
  }

  private previewTextureKey(slot: number): string {
    const image = RUN_SAVES.get(slot)?.preview.image;
    const current = this.previewKeys.get(slot);
    if (current && current.image === image) return current.key;
    if (current && this.textures.exists(current.key)) this.textures.remove(current.key);
    const key = `run-save-preview:${slot}:${++this.previewRevision}`;
    this.previewKeys.set(slot, { image, key });
    return key;
  }

  private queuePagePreviewImages(): void {
    // A page changed while loading: the existing completion callback will queue
    // the new visible page. Never preload neighbouring pages.
    if (this.load.isLoading()) return;
    const start = this.page * RUN_SAVE_PAGE_SIZE;
    let queued = false;
    for (let slot = start; slot < start + RUN_SAVE_PAGE_SIZE; slot += 1) {
      const save = RUN_SAVES.get(slot);
      const key = this.previewTextureKey(slot);
      if (!save?.preview.image || this.textures.exists(key) || this.failedPreviewKeys.has(key)) continue;
      this.ownedPreviewKeys.add(key);
      this.load.image(key, save.preview.image);
      queued = true;
    }
    if (!queued) return;
    const refresh = () => {
      if (this.sys.isPaused()) {
        this.events.once(Phaser.Scenes.Events.RESUME, refresh);
        return;
      }
      cleanup();
      if (!this.sys.isActive()) return;
      for (const [index, preview] of this.previewViews) {
        const slot = RUN_SAVES.get(index);
        if (!slot || !preview.active) continue;
        preview.removeAll(true); this.addSlotPreview(preview, slot);
      }
      this.queuePagePreviewImages();
    };
    const cleanup = () => {
      this.load.off(Phaser.Loader.Events.COMPLETE, refresh);
      this.events.off(Phaser.Scenes.Events.RESUME, refresh);
      this.events.off(Phaser.Scenes.Events.SHUTDOWN, cleanup);
    };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup);
    this.load.once(Phaser.Loader.Events.COMPLETE, refresh);
    this.load.start();
  }

  private choose(slotIndex: number, slot?: RunSaveSlot): void {
    if (this.busy) return;
    if (this.mode === 'save') {
      const captured = RUN_SAVES.capture();
      if (!captured) return;
      captured.preview.image = this.previewImage;
      const pending = this.previewPending;
      const perform = () => { this.runStorageAction(async () => {
        if (pending) captured.preview.image = await pending;
        await RUN_SAVES.save(slotIndex, captured);
        if (this.exitAfterSave) this.goToTitle(); else this.renderPage();
      }); };
      if (slot) this.confirm(this.ui('Overwrite this save?', '上書きしてよろしいですか？'), perform);
      else perform();
      return;
    }
    if (!slot) return;
    if (this.mode === 'body') {
      this.confirm(this.ui('Start a New Game with this body state?', 'このからだの状態をロードして開始しますか？'), () => {
        this.confirmCompatibility(slot, () => { RUN_SAVES.invalidateRetry(); restoreBodyProgress(slot.run); this.startDestination('battle'); });
      });
      return;
    }
    this.confirm(this.ui('Load this save?', 'ロードしてよろしいですか？'), () => this.confirmCompatibility(slot, () => this.loadSlot(slot)));
  }

  private loadSlot(slot: RunSaveSlot): void {
    RUN_SAVES.invalidateRetry();
    restoreRunState(slot.run);
    this.startDestination(slot.scene, slot.sceneState);
  }

  private startDestination(scene: RunSaveSlot['scene'], state?: unknown): void {
    this.scene.stop(this.sourceScene);
    this.scene.stop('BattleScene');
    this.scene.stop('RewardScene');
    this.scene.stop('DefeatEventScene');
    if (scene === 'novel') this.scene.start('DefeatEventScene', { ...(state as object ?? {}), resume: true });
    else if (scene === 'reward') this.scene.start('RewardScene', { resumeState: state });
    else this.scene.start('BattleScene', { resumeState: state });
  }

  private confirmDelete(slot: RunSaveSlot): void {
    this.confirm(this.ui('Delete this save?', 'このセーブデータを削除しますか？'), () => {
      this.runStorageAction(async () => { await RUN_SAVES.delete(slot.slot); this.renderPage(); }, 'delete');
    }, this.ui('Delete', '削除'));
  }

  private confirmDeleteAllSaves(): void {
    this.confirm(this.ui(
      'All save data will be deleted. Continue?',
      '全セーブデータが削除されます。続けますか？',
    ), () => this.confirm(this.ui(
      'Delete all save data. Are you absolutely sure?',
      '削除します。本当によろしいですか？',
    ), () => {
      this.runStorageAction(async () => { await RUN_SAVES.clear(); this.clearPreviewTextures(); this.page = 0; this.renderPage(); }, 'delete');
    }, this.ui('Delete', '削除')), this.ui('Continue', '続ける'));
  }

  private confirmDeleteAll(): void {
    this.confirm(this.ui(
      'In addition to all save data, settings and all viewed event/portrait history will be deleted. Continue?',
      '全セーブデータに加えて、設定した内容と、表示した立ち絵・イベントの情報も削除されます。続けますか？',
    ), () => this.confirm(this.ui('Delete all user data. Are you absolutely sure?', '削除します。本当によろしいですか？'), () => {
      this.runStorageAction(async () => { await USER_SETTINGS.reset(); await RUN_SAVES.clear(); resetRunState(); this.goToTitle(); }, 'delete');
    }, this.ui('Delete', '削除')), this.ui('Continue', '続ける'));
  }

  private confirm(message: string, yesAction: () => void, yesLabel = this.ui('Yes', 'はい')): void {
    this.dialog?.destroy(true);
    const root = this.add.container(0, 0).setDepth(5000);
    const shade = this.add.rectangle(640, 360, 1280, 720, 0x000000, 0.7).setInteractive();
    const panel = new CrayonPatch(this, 640, 360, 620, 250, 0x242a33, 1); panel.setStrokeStyle(3, 0xb27676, 0.95);
    const text = this.add.text(640, 320, message, { ...this.textStyle(19, '#f8fafc'), align: 'center', wordWrap: { width: 540, useAdvancedWrap: true } }).setOrigin(0.5);
    root.add([shade, panel, text, this.createButton(545, 420, 160, 42, yesLabel, () => { if (this.busy) return; this.dialog?.destroy(true); this.dialog = undefined; yesAction(); }), this.createButton(735, 420, 160, 42, this.ui('Cancel', 'キャンセル'), () => { root.destroy(true); this.dialog = undefined; })]);
    this.dialog = root;
  }

  private changePage(delta: number): void {
    this.page = Phaser.Math.Clamp(this.page + delta, 0, 9);
    this.renderPage();
  }

  private confirmCompatibility(slot: RunSaveSlot, action: () => void): void {
    if (!slot.compatibility) { action(); return; }
    const restart = slot.compatibility.restartedBattle ? this.ui('\nThe battle snapshot is incomplete; this battle will restart.', '\n戦闘中の情報が不足しているため、この戦闘は開始時からやり直します。') : '';
    this.confirm(this.ui('This save is from an older version. Some details may not work correctly. Continue?',
      '古いバージョンのセーブデータです。細部に問題が発生する可能性がありますが、よろしいですか？') + restart, action);
  }

  private runStorageAction(action: () => Promise<void>, operation: 'save' | 'delete' = 'save'): void {
    if (this.busy) return;
    this.busy = true;
    void action().catch(error => reportStorageError(error, operation)).finally(() => { this.busy = false; });
  }

  private close(): void {
    if (this.busy) return;
    if (this.dialog) { this.dialog.destroy(true); this.dialog = undefined; return; }
    this.scene.stop();
    if (this.scene.isPaused(this.sourceScene)) this.scene.resume(this.sourceScene);
  }

  private goToTitle(): void {
    this.scene.stop(this.sourceScene);
    this.scene.stop('BattleScene'); this.scene.stop('RewardScene'); this.scene.stop('DefeatEventScene');
    this.scene.start('TitleScene');
  }

  private createButton(x: number, y: number, width: number, height: number, label: string, action: () => void, enabled = true, danger = false): Phaser.GameObjects.Container {
    const root = this.add.container(x, y);
    const bg = new CrayonPatch(this, 0, 0, width, height, enabled ? (danger ? 0x562d34 : CRAYON_COLORS.button) : 0x353b45, 1);
    bg.setStrokeStyle(2, danger ? 0xc36b70 : 0x91a0b2, enabled ? 0.9 : 0.45);
    const text = this.add.text(0, 0, label, this.textStyle(Math.min(16, Math.max(11, width / Math.max(5, label.length) * 1.1)), enabled ? '#f8fafc' : '#737b86')).setOrigin(0.5);
    if (enabled) { bg.setInteractive({ useHandCursor: true }); onPrimaryClick(bg, () => { if (!this.busy) action(); }); KeyboardNavigation.for(this).register(bg); }
    root.add([bg, text]); return root;
  }

  private formatDate(value: string): string {
    try { return new Intl.DateTimeFormat(SETTINGS_STATE.language === 'ja' ? 'ja-JP' : 'en-US', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)); }
    catch { return value; }
  }
  private ui(en: string, ja: string): string { return SETTINGS_STATE.language === 'ja' ? ja : en; }
  private textStyle(size: number, color: string): Phaser.Types.GameObjects.Text.TextStyle { return { fontFamily: GAME_FONT, fontSize: `${size}px`, fontStyle: 'bold', color }; }
}
