import Phaser from 'phaser';
import { RUN_SAVES, RUN_SAVE_PAGE_SIZE, type RunSaveSlot } from '../models/runSaves';
import { restoreBodyProgress, restoreRunState, resetRunState } from '../models/RunState';
import { USER_SETTINGS } from '../models/userSettings';
import { SCREEN_CENTER_X, SCREEN_CENTER_Y, SCREEN_HEIGHT, SCREEN_WIDTH } from '../ui/layout';
import { GAME_FONT } from '../ui/fonts';
import { CrayonPatch, CRAYON_COLORS } from '../ui/crayon';
import { onPrimaryClick, installPointerBack } from '../ui/pointerActions';
import { KeyboardNavigation } from '../ui/keyboardNavigation';
import { SETTINGS_STATE } from '../models/localization';
import { preloadConversationAssets, conversationBackgroundTextureKey } from '../ui/conversation';
import { PLAYER_DEFINITION } from '../data/player';
import { characterPortraitAssets } from '../models/portraitAssets';
import { preloadSprites } from '../ui/sprites';

export type SaveLoadMode = 'save' | 'load' | 'body';
export interface SaveLoadSceneData { mode: SaveLoadMode; sourceScene: string; exitAfterSave?: boolean }

export function openSaveLoad(scene: Phaser.Scene, data: Omit<SaveLoadSceneData, 'sourceScene'>): void {
  scene.scene.launch('SaveLoadScene', { ...data, sourceScene: scene.scene.key });
  scene.scene.pause();
}

export class SaveLoadScene extends Phaser.Scene {
  private mode: SaveLoadMode = 'load';
  private sourceScene = 'TitleScene';
  private exitAfterSave = false;
  private page = 0;
  private content!: Phaser.GameObjects.Container;
  private dialog?: Phaser.GameObjects.Container;

  constructor() { super('SaveLoadScene'); }

  init(data: SaveLoadSceneData): void {
    this.mode = data.mode;
    this.sourceScene = data.sourceScene;
    this.exitAfterSave = Boolean(data.exitAfterSave);
    this.page = RUN_SAVES.lastPage;
  }

  preload(): void {
    const saves = RUN_SAVES.list();
    const ids = saves.filter(save => save.scene === 'novel').flatMap(save => {
      const id = (save.sceneState as { conversationId?: string } | undefined)?.conversationId;
      return id ? [id] : [];
    });
    preloadConversationAssets(this, ids);
    preloadSprites(this, saves.flatMap(save => {
      const id = save.preview.portrait?.replace(/\.png$/i, '');
      return id && characterPortraitAssets[id] ? [characterPortraitAssets[id]] : [];
    }));
  }

  create(): void {
    KeyboardNavigation.for(this);
    installPointerBack(this, () => { this.close(); return true; });
    this.add.rectangle(SCREEN_CENTER_X, SCREEN_CENTER_Y, SCREEN_WIDTH, SCREEN_HEIGHT, 0x090c11, 0.96);
    this.add.text(640, 38, this.heading(), this.textStyle(30, '#f8fafc')).setOrigin(0.5);
    this.createButton(80, 38, 130, 38, this.ui('Back', '戻る'), () => this.close());
    this.content = this.add.container(0, 0);
    this.renderPage();
  }

  private heading(): string {
    if (this.mode === 'save') return this.ui('Save Run', 'セーブ');
    if (this.mode === 'body') return this.ui('Choose Body State', 'からだの状態を選択');
    return this.ui('Load Run', 'ロード');
  }

  private renderPage(): void {
    this.content.removeAll(true);
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
  }

  private createSlot(slotIndex: number, x: number, y: number): Phaser.GameObjects.Container {
    const slot = RUN_SAVES.get(slotIndex);
    const eligible = this.mode !== 'body' || Boolean(slot && slot.run.eventBattleId !== 'prologue');
    const root = this.add.container(x, y);
    const bg = new CrayonPatch(this, 0, 0, 230, 242, slot ? 0x26303e : 0x1b2029, eligible ? 1 : 0.55);
    bg.setStrokeStyle(2, slot ? 0x7d93ad : 0x4b5665, 0.9);
    const number = this.add.text(-104, -111, `${slotIndex + 1}`, this.textStyle(14, '#91a4bd'));
    const title = this.add.text(-74, -111, slot?.preview.title ?? this.ui('Empty', '空き'), this.textStyle(14, eligible ? '#f8fafc' : '#747d89'));
    root.add([bg, number, title]);
    if (slot) this.addSlotPreview(root, slot);
    else root.add(this.add.text(0, 0, this.ui('Empty', '空き'), this.textStyle(18, '#667180')).setOrigin(0.5));
    if (eligible && (slot || this.mode === 'save')) {
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
    let hasBackground = false;
    if (slot.preview.background && this.textures.exists(conversationBackgroundTextureKey(slot.preview.background))) {
      root.add(this.add.image(x, y, conversationBackgroundTextureKey(slot.preview.background)).setDisplaySize(width, height));
      hasBackground = true;
    } else {
      root.add(this.add.rectangle(x, y, width, height, slot.scene === 'battle' ? 0x182332 : 0x10151c, 1));
    }
    if (slot.scene === 'novel') {
      const portraitId = slot.preview.portrait?.replace(/\.png$/i, '');
      const portrait = portraitId ? characterPortraitAssets[portraitId] : undefined;
      if (portrait && this.textures.exists(portrait.textureKey)) {
        const sprite = this.add.sprite(x + 36, y + 2, portrait.textureKey);
        sprite.setScale(Math.min(1, 108 / Math.max(1, sprite.height))).setOrigin(0.5, 0.5);
        root.add(sprite);
      }
      root.add(this.add.rectangle(x, y + 38, width - 6, 36, 0x090b10, hasBackground ? 0.82 : 0.95));
      root.add(this.add.text(x - width / 2 + 8, y + 24, slot.preview.text?.slice(0, 64) ?? '', {
        ...this.textStyle(7, '#f2f4f8'), wordWrap: { width: width - 16, useAdvancedWrap: true }, maxLines: 3,
      }));
    } else if (slot.scene === 'battle') {
      const state = slot.sceneState as { player?: { hp?: number; ep?: number }; deck?: { hand?: unknown[] }; enemies?: unknown[] } | undefined;
      const portraitId = slot.preview.portrait?.replace(/\.png$/i, '');
      const portrait = portraitId ? characterPortraitAssets[portraitId] : undefined;
      if (portrait && this.textures.exists(portrait.textureKey)) {
        const sprite = this.add.sprite(x - 47, y - 1, portrait.textureKey);
        sprite.setScale(Math.min(1, 104 / Math.max(1, sprite.height)));
        root.add(sprite);
      }
      const enemyCount = state?.enemies?.length ?? 0;
      for (let index = 0; index < enemyCount; index += 1) {
        root.add(this.add.ellipse(x + 44 + index * 28, y + 1, 24, 36, 0x718197, 0.95).setStrokeStyle(1, 0xd0dae7, 0.7));
      }
      const handCount = state?.deck?.hand?.length ?? 0;
      const shownCards = Math.min(8, handCount);
      for (let index = 0; index < shownCards; index += 1) {
        const spread = (index - (shownCards - 1) / 2) * 13;
        root.add(this.add.rectangle(x + spread, y + 45, 20, 29, 0x42536b).setStrokeStyle(1, 0xd4bd79));
      }
      this.addMiniBars(root, x - 98, y - 50, slot);
    } else if (slot.scene === 'reward') {
      root.add(this.add.text(x, y - 45, this.ui('REWARDS', '戦闘報酬'), this.textStyle(10, '#dbe5f2')).setOrigin(0.5));
      [-52, 0, 52].forEach(offset => root.add(this.add.rectangle(x + offset, y + 8, 42, 66, 0x42536b).setStrokeStyle(2, 0xd4bd79)));
      root.add(this.add.circle(x + 78, y + 36, 13, 0x7961a8).setStrokeStyle(2, 0xd8c8ef));
      this.addMiniBars(root, x - 98, y - 50, slot);
    }
    root.add(this.add.rectangle(x, y, width, height, 0, 0).setStrokeStyle(2, 0x8da0b7, 0.9));
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

  private addMiniBars(root: Phaser.GameObjects.Container, x: number, y: number, slot: RunSaveSlot): void {
    const hp = Math.max(0, Math.min(1, (slot.preview.hp ?? slot.run.playerHp) / (slot.preview.maxHp ?? PLAYER_DEFINITION.maxHp)));
    const ep = Math.max(0, Math.min(1, (slot.preview.ep ?? slot.run.playerEp) / (slot.preview.maxEp ?? PLAYER_DEFINITION.maxEp)));
    root.add(this.add.rectangle(x, y, 88, 5, 0x342326).setOrigin(0, 0.5));
    root.add(this.add.rectangle(x, y, 88 * hp, 5, 0xc75555).setOrigin(0, 0.5));
    root.add(this.add.rectangle(x, y + 8, 88, 5, 0x34263a).setOrigin(0, 0.5));
    root.add(this.add.rectangle(x, y + 8, 88 * ep, 5, 0xd16da7).setOrigin(0, 0.5));
  }

  private choose(slotIndex: number, slot?: RunSaveSlot): void {
    if (this.mode === 'save') {
      const captured = RUN_SAVES.capture();
      if (!captured) return;
      const perform = () => { void RUN_SAVES.save(slotIndex, captured).then(() => {
        if (this.exitAfterSave) this.goToTitle(); else { this.dialog?.destroy(true); this.dialog = undefined; this.renderPage(); }
      }); };
      if (slot) this.confirm(this.ui('Overwrite this save?', '上書きしてよろしいですか？'), perform);
      else perform();
      return;
    }
    if (!slot) return;
    if (this.mode === 'body') {
      this.confirm(this.ui('Start a New Game with this body state?', 'このからだの状態をロードして開始しますか？'), () => {
        restoreBodyProgress(slot.run); this.startDestination('battle');
      });
      return;
    }
    this.confirm(this.ui('Load this save?', 'ロードしてよろしいですか？'), () => this.loadSlot(slot));
  }

  private loadSlot(slot: RunSaveSlot): void {
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
      void RUN_SAVES.delete(slot.slot).then(() => { this.dialog?.destroy(true); this.dialog = undefined; this.renderPage(); });
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
      void RUN_SAVES.clear().then(() => { this.dialog?.destroy(true); this.dialog = undefined; this.page = 0; this.renderPage(); });
    }, this.ui('Delete', '削除')), this.ui('Continue', '続ける'));
  }

  private confirmDeleteAll(): void {
    this.confirm(this.ui(
      'In addition to all save data, settings and all viewed event/portrait history will be deleted. Continue?',
      '全セーブデータに加えて、設定した内容と、表示した立ち絵・イベントの情報も削除されます。続けますか？',
    ), () => this.confirm(this.ui('Delete all user data. Are you absolutely sure?', '削除します。本当によろしいですか？'), () => {
      void Promise.all([RUN_SAVES.clear(), USER_SETTINGS.reset()]).then(() => { resetRunState(); this.goToTitle(); });
    }, this.ui('Delete', '削除')), this.ui('Continue', '続ける'));
  }

  private confirm(message: string, yesAction: () => void, yesLabel = this.ui('Yes', 'はい')): void {
    this.dialog?.destroy(true);
    const root = this.add.container(0, 0).setDepth(5000);
    const shade = this.add.rectangle(640, 360, 1280, 720, 0x000000, 0.7).setInteractive();
    const panel = new CrayonPatch(this, 640, 360, 620, 250, 0x242a33, 1); panel.setStrokeStyle(3, 0xb27676, 0.95);
    const text = this.add.text(640, 320, message, { ...this.textStyle(19, '#f8fafc'), align: 'center', wordWrap: { width: 540, useAdvancedWrap: true } }).setOrigin(0.5);
    root.add([shade, panel, text, this.createButton(545, 420, 160, 42, yesLabel, yesAction), this.createButton(735, 420, 160, 42, this.ui('Cancel', 'キャンセル'), () => { root.destroy(true); this.dialog = undefined; })]);
    this.dialog = root;
  }

  private changePage(delta: number): void {
    this.page = Phaser.Math.Clamp(this.page + delta, 0, 9);
    this.renderPage();
  }

  private close(): void {
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
    if (enabled) { bg.setInteractive({ useHandCursor: true }); onPrimaryClick(bg, action); KeyboardNavigation.for(this).register(bg); }
    root.add([bg, text]); return root;
  }

  private formatDate(value: string): string {
    try { return new Intl.DateTimeFormat(SETTINGS_STATE.language === 'ja' ? 'ja-JP' : 'en-US', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)); }
    catch { return value; }
  }
  private ui(en: string, ja: string): string { return SETTINGS_STATE.language === 'ja' ? ja : en; }
  private textStyle(size: number, color: string): Phaser.Types.GameObjects.Text.TextStyle { return { fontFamily: GAME_FONT, fontSize: `${size}px`, fontStyle: 'bold', color }; }
}
