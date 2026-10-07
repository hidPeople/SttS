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
      const x = local % 2 === 0 ? 345 : 935;
      const y = 112 + Math.floor(local / 2) * 104;
      this.content.add(this.createSlot(slotIndex, x, y));
    }
    this.content.add(this.createButton(460, 662, 120, 38, '◀', () => this.changePage(-1), this.page > 0));
    this.content.add(this.add.text(640, 662, `${this.page + 1} / 10`, this.textStyle(18, '#dbe5f2')).setOrigin(0.5));
    this.content.add(this.createButton(820, 662, 120, 38, '▶', () => this.changePage(1), this.page < 9));
    this.content.add(this.createButton(90, 678, 140, 34, this.ui('Back', '戻る'), () => this.close()));
    this.content.add(this.createButton(1170, 678, 180, 32, this.ui('Delete All User Data', 'ユーザーデータの全削除'), () => this.confirmDeleteAll(), true, true));
  }

  private createSlot(slotIndex: number, x: number, y: number): Phaser.GameObjects.Container {
    const slot = RUN_SAVES.get(slotIndex);
    const eligible = this.mode !== 'body' || Boolean(slot && slot.run.eventBattleId !== 'prologue');
    const root = this.add.container(x, y);
    const bg = new CrayonPatch(this, 0, 0, 540, 88, slot ? 0x26303e : 0x1b2029, eligible ? 1 : 0.55);
    bg.setStrokeStyle(2, slot ? 0x7d93ad : 0x4b5665, 0.9);
    const number = this.add.text(-250, -31, `${slotIndex + 1}`, this.textStyle(15, '#91a4bd'));
    const textX = slot ? -105 : -208;
    const title = this.add.text(textX, -31, slot?.preview.title ?? this.ui('Empty', '空き'), this.textStyle(17, eligible ? '#f8fafc' : '#747d89'));
    const detail = this.add.text(textX, -4, slot ? `${this.formatDate(slot.savedAt)}  ${this.ui('Floor', '層')} ${slot.floor}\n${slot.preview.detail}` : '', {
      ...this.textStyle(12, eligible ? '#bdcad9' : '#747d89'), wordWrap: { width: slot ? 315 : 425, useAdvancedWrap: true }, lineSpacing: 2,
    });
    root.add([bg, number, title, detail]);
    if (slot) this.addSlotPreview(root, slot);
    if (eligible && (slot || this.mode === 'save')) {
      bg.setInteractive({ useHandCursor: true });
      onPrimaryClick(bg, () => this.choose(slotIndex, slot));
      KeyboardNavigation.for(this).register(bg);
    }
    if (slot) {
      const remove = this.createButton(246, -29, 34, 28, '×', () => this.confirmDelete(slot), true, true);
      root.add(remove);
    }
    return root;
  }

  private addSlotPreview(root: Phaser.GameObjects.Container, slot: RunSaveSlot): void {
    const x = -176;
    let hasBackground = false;
    if (slot.preview.background && this.textures.exists(conversationBackgroundTextureKey(slot.preview.background))) {
      root.add(this.add.image(x, 5, conversationBackgroundTextureKey(slot.preview.background)).setDisplaySize(118, 68));
      hasBackground = true;
    } else {
      root.add(this.add.rectangle(x, 5, 118, 68, 0x10151c, 1).setStrokeStyle(1, 0x657386, 0.8));
    }
    if (slot.scene === 'novel') {
      const portraitId = slot.preview.portrait?.replace(/\.png$/i, '');
      const portrait = portraitId ? characterPortraitAssets[portraitId] : undefined;
      if (portrait && this.textures.exists(portrait.textureKey)) {
        const sprite = this.add.sprite(x + 22, 0, portrait.textureKey);
        sprite.setScale(Math.min(1, 62 / Math.max(1, sprite.height))).setOrigin(0.5, 0.5);
        root.add(sprite);
      }
      root.add(this.add.rectangle(x, 25, 114, 24, 0x090b10, hasBackground ? 0.82 : 0.95));
      root.add(this.add.text(x - 54, 16, slot.preview.text?.slice(0, 28) ?? '', {
        ...this.textStyle(7, '#f2f4f8'), wordWrap: { width: 108, useAdvancedWrap: true }, maxLines: 2,
      }));
    } else if (slot.scene === 'battle') {
      const state = slot.sceneState as { player?: { hp?: number; ep?: number }; deck?: { hand?: unknown[] }; enemies?: unknown[] } | undefined;
      const hp = Math.max(0, Math.min(1, (state?.player?.hp ?? 0) / PLAYER_DEFINITION.maxHp));
      const ep = Math.max(0, Math.min(1, (state?.player?.ep ?? 0) / PLAYER_DEFINITION.maxEp));
      root.add(this.add.rectangle(x - 51, -14, 102, 7, 0x342326).setOrigin(0, 0.5));
      root.add(this.add.rectangle(x - 51, -14, 102 * hp, 7, 0xc75555).setOrigin(0, 0.5));
      root.add(this.add.rectangle(x - 51, -2, 102, 7, 0x34263a).setOrigin(0, 0.5));
      root.add(this.add.rectangle(x - 51, -2, 102 * ep, 7, 0xd16da7).setOrigin(0, 0.5));
      root.add(this.add.text(x, 21, `${this.ui('Enemies', '敵')} ${state?.enemies?.length ?? 0} / ${this.ui('Cards', '手札')} ${state?.deck?.hand?.length ?? 0}`, this.textStyle(10, '#cbd6e3')).setOrigin(0.5));
    } else if (slot.scene === 'reward') {
      const hp = Math.max(0, Math.min(1, slot.run.playerHp / PLAYER_DEFINITION.maxHp));
      const ep = Math.max(0, Math.min(1, slot.run.playerEp / PLAYER_DEFINITION.maxEp));
      root.add(this.add.rectangle(x - 51, -27, 48, 5, 0x342326).setOrigin(0, 0.5));
      root.add(this.add.rectangle(x - 51, -27, 48 * hp, 5, 0xc75555).setOrigin(0, 0.5));
      root.add(this.add.rectangle(x + 3, -27, 48, 5, 0x34263a).setOrigin(0, 0.5));
      root.add(this.add.rectangle(x + 3, -27, 48 * ep, 5, 0xd16da7).setOrigin(0, 0.5));
      [-35, 0, 35].forEach(offset => root.add(this.add.rectangle(x + offset, 5, 26, 38, 0x42536b).setStrokeStyle(1, 0xd4bd79)));
      root.add(this.add.text(x, 29, this.ui('Rewards', '報酬'), this.textStyle(9, '#dbe5f2')).setOrigin(0.5));
    }
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

  private confirmDeleteAll(): void {
    this.confirm(this.ui(
      'This also deletes settings and all viewed event/portrait history. Continue?',
      '設定した内容と、表示した立ち絵・イベントの情報も削除されます。続けますか？',
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
