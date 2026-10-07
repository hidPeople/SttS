import Phaser from 'phaser';
import { galleryEvents, portraitConditionHint } from '../models/gallery';
import { characterPortraitAssets, characterPortraitFiles, portraitGalleryId } from '../models/portraitAssets';
import { USER_SETTINGS } from '../models/userSettings';
import { localizeGameText as localize } from '../models/gameText';
import { SETTINGS_STATE } from '../models/localization';
import { preloadConversationAssets, conversationBackgroundTextureKey } from '../ui/conversation';
import { ensureSprites } from '../ui/sprites';
import { SCREEN_CENTER_X, SCREEN_CENTER_Y, SCREEN_HEIGHT, SCREEN_WIDTH } from '../ui/layout';
import { GAME_FONT } from '../ui/fonts';
import { CrayonPatch, CRAYON_COLORS } from '../ui/crayon';
import { onPrimaryClick, installPointerBack } from '../ui/pointerActions';
import { KeyboardNavigation } from '../ui/keyboardNavigation';

type ExtraTab = 'events' | 'portraits';
type PortraitGroup = { category: string; ids: string[]; index: number };

export class ExtraScene extends Phaser.Scene {
  private tab: ExtraTab = 'events';
  private content!: Phaser.GameObjects.Container;
  private dialog?: Phaser.GameObjects.Container;
  private portraitGroups: PortraitGroup[] = [];
  private portraitGroupIndex = 0;
  private transitioning = false;
  private enlargedPortraitId?: string;
  private portraitRenderRequest = 0;

  constructor() { super('ExtraScene'); }

  init(data: { tab?: ExtraTab } = {}): void { this.tab = data.tab ?? 'events'; }

  preload(): void {
    preloadConversationAssets(this, galleryEvents().map(event => event.conversationId));
  }

  create(): void {
    KeyboardNavigation.for(this);
    installPointerBack(this, () => {
      if (this.dialog) { this.closeDialog(); return true; }
      if (this.enlargedPortraitId) { this.enlargedPortraitId = undefined; this.showTab('portraits'); return true; }
      this.scene.start('TitleScene'); return true;
    });
    this.add.rectangle(SCREEN_CENTER_X, SCREEN_CENTER_Y, SCREEN_WIDTH, SCREEN_HEIGHT, 0x111720);
    this.add.text(640, 42, 'Extra', this.style(34, '#f8fafc')).setOrigin(0.5);
    this.createButton(80, 38, 130, 38, this.ui('Back', '戻る'), () => this.scene.start('TitleScene'));
    this.createButton(455, 92, 280, 44, this.ui('Events', 'イベント一覧'), () => this.showTab('events'));
    this.createButton(825, 92, 280, 44, this.ui('Portraits', '立ち絵一覧'), () => this.showTab('portraits'));
    this.content = this.add.container(0, 0);
    this.buildPortraitGroups();
    this.input.on('wheel', (_pointer: Phaser.Input.Pointer, objects: Phaser.GameObjects.GameObject[], _dx: number, dy: number) => {
      if (this.tab !== 'portraits' || this.transitioning || this.enlargedPortraitId || this.dialog) return;
      const portrait = objects.find(object => object.name === 'portrait-carousel');
      if (portrait) {
        const groupIndex = portrait.getData('portraitGroupIndex');
        if (typeof groupIndex === 'number' && groupIndex !== this.portraitGroupIndex) this.moveGroup(Math.sign(groupIndex - this.portraitGroupIndex));
        else this.movePortrait(dy > 0 ? 1 : -1);
      } else this.moveGroup(dy > 0 ? 1 : -1);
    });
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      if (this.tab !== 'portraits' || this.transitioning || this.enlargedPortraitId || this.dialog) return;
      if (['ArrowLeft', 'KeyA'].includes(event.code)) this.movePortrait(-1);
      if (['ArrowRight', 'KeyD'].includes(event.code)) this.movePortrait(1);
      if (['ArrowUp', 'KeyW'].includes(event.code)) this.moveGroup(-1);
      if (['ArrowDown', 'KeyS'].includes(event.code)) this.moveGroup(1);
    });
    this.showTab(this.tab);
  }

  private showTab(tab: ExtraTab): void {
    this.portraitRenderRequest += 1;
    this.tweens.killTweensOf(this.content);
    this.tab = tab;
    this.transitioning = false;
    if (tab !== 'portraits') this.enlargedPortraitId = undefined;
    this.content.setPosition(0, 0).setAlpha(1);
    this.content.removeAll(true);
    if (tab === 'events') this.renderEvents(); else void this.loadPortraitsAndRender();
  }

  private async loadPortraitsAndRender(onReady?: () => void): Promise<void> {
    const request = ++this.portraitRenderRequest;
    this.content.removeAll(true);
    this.content.add(this.add.text(640, 360, this.ui('Loading portraits…', '立ち絵を読み込み中…'), this.style(18, '#aeb9c8')).setOrigin(0.5));
    const definitions = this.portraitAssetsForCurrentView();
    const loaded = await ensureSprites(this, definitions);
    if (request !== this.portraitRenderRequest || this.tab !== 'portraits' || !this.sys.isActive()) return;
    this.content.removeAll(true);
    if (!loaded) {
      this.transitioning = false;
      this.content.add(this.add.text(640, 360, this.ui('Failed to load portraits.', '立ち絵を読み込めませんでした。'), this.style(18, '#d98e93')).setOrigin(0.5));
      return;
    }
    this.renderPortraits();
    onReady?.();
  }

  private portraitAssetsForCurrentView() {
    if (!this.portraitGroups.length) return [];
    const groupIndex = Phaser.Math.Clamp(this.portraitGroupIndex, 0, this.portraitGroups.length - 1);
    const ids = new Set<string>();
    const current = this.portraitGroups[groupIndex];
    for (let offset = -4; offset <= 4; offset += 1) {
      ids.add(current.ids[(current.index + offset + current.ids.length) % current.ids.length]);
    }
    for (const adjacent of [this.portraitGroups[groupIndex - 1], this.portraitGroups[groupIndex + 1]]) {
      if (adjacent?.ids.length) ids.add(adjacent.ids[adjacent.index]);
    }
    if (this.enlargedPortraitId) ids.add(this.enlargedPortraitId);
    return [...ids].map(id => characterPortraitAssets[id]).filter(Boolean);
  }

  private renderEvents(): void {
    const events = galleryEvents();
    const seen = new Set(USER_SETTINGS.value.gallery.seenConversationIds);
    events.forEach((event, index) => {
      const x = 190 + (index % 3) * 450;
      const y = 220 + Math.floor(index / 3) * 260;
      const unlocked = seen.has(event.conversationId);
      const root = this.add.container(x, y);
      const frame = new CrayonPatch(this, 0, 0, 380, 220, 0x242d39, 1);
      frame.setStrokeStyle(3, unlocked ? 0xd6b76a : 0x606977, 0.9);
      root.add(frame);
      const background = event.thumbnail;
      if (background && this.textures.exists(conversationBackgroundTextureKey(background))) {
        const image = this.add.image(0, -16, conversationBackgroundTextureKey(background)).setDisplaySize(356, 160);
        if (!unlocked) {
          image.setTint(0xa0a0a0).setAlpha(0.8);
          const fx = image.preFX as unknown as { addBlur?: (...args: number[]) => unknown };
          fx?.addBlur?.(0, 2, 2, 1, 0xffffff, 4);
        }
        root.add(image);
      } else root.add(this.add.rectangle(0, -16, 356, 160, 0x11161d));
      root.add(this.add.rectangle(0, -16, 356, 160, 0, 0).setStrokeStyle(2, unlocked ? 0xd6b76a : 0x667180, 0.9));
      if (!unlocked) {
        root.add(this.add.rectangle(0, -16, 356, 160, 0x080a0e, 0.28));
        root.add(this.add.text(0, -16, localize(event.condition), {
          ...this.style(16, '#f5f7fa'), align: 'center', wordWrap: { width: 320, useAdvancedWrap: true },
          backgroundColor: 'rgba(12, 15, 20, 0.72)', padding: { x: 8, y: 6 },
        }).setOrigin(0.5));
      }
      root.add(this.add.text(0, 82, unlocked ? localize(event.title) : '？？？', this.style(18, unlocked ? '#f8fafc' : '#8a929e')).setOrigin(0.5));
      frame.setInteractive({ useHandCursor: unlocked });
      if (unlocked) onPrimaryClick(frame, () => this.scene.start('DefeatEventScene', { conversationId: event.conversationId, completion: 'extra' }));
      KeyboardNavigation.for(this).register(frame);
      this.content.add(root);
    });
    const unlockedCount = events.filter(event => seen.has(event.conversationId)).length;
    const percent = events.length ? Math.floor(unlockedCount / events.length * 100) : 100;
    this.content.add(this.add.text(28, 690, this.ui(`Event completion  ${percent}%`, `イベント達成率　${percent}％`), this.style(16, '#dbe5f2')).setOrigin(0, 0.5));
    this.addGalleryUnlockControl('events', unlockedCount < events.length);
  }

  private buildPortraitGroups(): void {
    const groups = new Map<string, string[]>();
    const ids = characterPortraitFiles.map(file => file.replace(/\.png$/i, '')).filter(id => characterPortraitAssets[id]);
    for (const id of ids.sort()) {
      const category = id.split('_')[1] || 'normal';
      const groupIds = groups.get(category) ?? []; groupIds.push(id); groups.set(category, groupIds);
    }
    const order = (category: string) => category === 'prologue' ? 0 : category === 'normal' ? 1 : 2;
    this.portraitGroups = [...groups].sort(([a], [b]) => order(a) - order(b) || a.localeCompare(b))
      .map(([category, ids]) => ({ category, ids, index: 0 }));
  }

  private renderPortraits(): void {
    if (this.portraitGroups.length === 0) return;
    this.portraitGroupIndex = Phaser.Math.Clamp(this.portraitGroupIndex, 0, this.portraitGroups.length - 1);
    const previous = this.portraitGroupIndex - 1;
    const next = this.portraitGroupIndex + 1;
    if (previous >= 0) this.renderPortraitRow(this.portraitGroups[previous], previous, -48, false);
    if (next < this.portraitGroups.length) this.renderPortraitRow(this.portraitGroups[next], next, 778, false);
    this.renderPortraitRow(this.portraitGroups[this.portraitGroupIndex], this.portraitGroupIndex, 360, true);

    this.content.add(this.createButton(92, 150, 92, 36, '▲ W', () => this.moveGroup(-1), this.portraitGroupIndex > 0));
    this.content.add(this.createButton(92, 610, 92, 36, '▼ S', () => this.moveGroup(1), this.portraitGroupIndex < this.portraitGroups.length - 1));
    this.content.add(this.createButton(82, 360, 112, 44, '◀ A', () => this.movePortrait(-1)));
    this.content.add(this.createButton(1198, 360, 112, 44, 'D ▶', () => this.movePortrait(1)));

    const allIds = this.portraitGroups.flatMap(group => group.ids);
    const unlockedCount = allIds.filter(id => this.isPortraitUnlocked(id)).length;
    const percent = allIds.length ? Math.floor(unlockedCount / allIds.length * 100) : 100;
    this.content.add(this.add.text(28, 690, this.ui(`Portrait completion  ${percent}%`, `表示達成率　${percent}％`), this.style(16, '#dbe5f2')).setOrigin(0, 0.5));
    this.addGalleryUnlockControl('portraits', unlockedCount < allIds.length);
    if (this.enlargedPortraitId) this.renderEnlargedPortrait(this.enlargedPortraitId);
  }

  private renderPortraitRow(group: PortraitGroup, groupIndex: number, y: number, focused: boolean): void {
    const count = group.ids.length;
    if (!count) return;
    const offsets = focused ? [-4, 4, -3, 3, -2, 2, -1, 1, 0] : [0];
    for (const offset of offsets) {
      const index = (group.index + offset + count) % count;
      const id = group.ids[index];
      const asset = characterPortraitAssets[id];
      const distance = Math.abs(offset);
      const xOffset = offset === 0 ? 0 : Math.sign(offset) * (125 + (distance - 1) * 78);
      const sprite = this.add.sprite(640 + xOffset, y, asset.textureKey).setName('portrait-carousel');
      sprite.setData('portraitGroupIndex', groupIndex);
      const targetHeight = focused ? (distance === 0 ? 470 : 350 - distance * 20) : (distance === 0 ? 370 : 290 - distance * 14);
      sprite.setScale(targetHeight / Math.max(1, sprite.height)).setAlpha(focused ? Math.max(0.38, 1 - distance * 0.13) : 0.34);
      const unlocked = this.isPortraitUnlocked(id);
      if (!unlocked) sprite.setTint(0x050608).setAlpha(focused && distance === 0 ? 0.92 : 0.3);
      sprite.setInteractive({ useHandCursor: focused ? unlocked && distance === 0 : true });
      if (focused && distance === 0 && unlocked) onPrimaryClick(sprite, () => {
        this.enlargedPortraitId = this.enlargedPortraitId === id ? undefined : id;
        this.showTab('portraits');
      });
      if (!focused) onPrimaryClick(sprite, () => this.moveGroup(Math.sign(groupIndex - this.portraitGroupIndex)));
      this.content.add(sprite);
    }
    if (focused) {
      const id = group.ids[group.index];
      this.content.add(this.add.text(640, 137, this.categoryName(group.category), this.style(22, '#efd18c')).setOrigin(0.5));
      this.content.add(this.add.text(640, 615, localize(portraitConditionHint(id)), {
        ...this.style(15, '#d6e0ec'), align: 'center', wordWrap: { width: 850, useAdvancedWrap: true },
        backgroundColor: 'rgba(17, 23, 32, 0.84)', padding: { x: 10, y: 5 },
      }).setOrigin(0.5));
    }
  }

  private renderEnlargedPortrait(id: string): void {
    const asset = characterPortraitAssets[id];
    if (!asset || !this.isPortraitUnlocked(id)) { this.enlargedPortraitId = undefined; return; }
    const shade = this.add.rectangle(640, 405, 1280, 630, 0x05070a, 0.84).setInteractive({ useHandCursor: true });
    const sprite = this.add.sprite(640, 390, asset.textureKey).setInteractive({ useHandCursor: true });
    sprite.setScale(Math.min(1.6, 600 / Math.max(1, sprite.height)));
    const close = () => { this.enlargedPortraitId = undefined; this.showTab('portraits'); };
    onPrimaryClick(shade, close); onPrimaryClick(sprite, close);
    this.content.add([shade, sprite]);
  }

  private movePortrait(delta: number): void {
    const group = this.portraitGroups[this.portraitGroupIndex];
    if (!group?.ids.length || this.transitioning) return;
    this.animateNavigation('x', delta, () => { group.index = (group.index + delta + group.ids.length) % group.ids.length; });
  }

  private moveGroup(delta: number): void {
    const next = Phaser.Math.Clamp(this.portraitGroupIndex + delta, 0, Math.max(0, this.portraitGroups.length - 1));
    if (next === this.portraitGroupIndex || this.transitioning) return;
    this.animateNavigation('y', delta, () => { this.portraitGroupIndex = next; });
  }

  private animateNavigation(axis: 'x' | 'y', delta: number, update: () => void): void {
    this.transitioning = true;
    const distance = axis === 'x' ? 58 : 74;
    this.tweens.add({
      targets: this.content, [axis]: -Math.sign(delta) * distance, alpha: 0.55, duration: 90, ease: 'Sine.easeIn',
      onComplete: () => {
        update();
        if (axis === 'x') this.content.x = Math.sign(delta) * distance; else this.content.y = Math.sign(delta) * distance;
        this.content.setAlpha(0.55);
        void this.loadPortraitsAndRender(() => {
          this.tweens.add({ targets: this.content, [axis]: 0, alpha: 1, duration: 120, ease: 'Sine.easeOut', onComplete: () => { this.transitioning = false; } });
        });
      },
    });
  }

  private addGalleryUnlockControl(kind: ExtraTab, hasLocked: boolean): void {
    const forced = kind === 'events' ? USER_SETTINGS.value.gallery.forcedEventsUnlocked : USER_SETTINGS.value.gallery.forcedPortraitsUnlocked;
    if (forced) {
      this.content.add(this.createButton(1140, 688, 230, 32, this.ui('FORCIBLY UNLOCKED', '強制解放済み'), () => {}, false, true, true));
      return;
    }
    if (!hasLocked) return;
    this.content.add(this.createButton(1125, 688, 260, 32,
      kind === 'events' ? this.ui('Unlock All Events', '全てのイベントを解放する') : this.ui('Unlock All Portraits', '全ての立ち絵を解放する'),
      () => this.confirmForceUnlock(kind), true, true));
  }

  private confirmForceUnlock(kind: ExtraTab): void {
    const message = kind === 'events'
      ? this.ui('Ignore all conditions and unlock every event?', '条件を無視して、全てのイベントを解放済みにします。よろしいですか？')
      : this.ui('Ignore all conditions and unlock every portrait?', '条件を無視して、全ての立ち絵を表示済みにします。よろしいですか？');
    this.showConfirm(message, () => {
      if (kind === 'events') USER_SETTINGS.unlockAllEvents(galleryEvents().map(event => event.conversationId));
      else USER_SETTINGS.unlockAllPortraits(this.portraitGroups.flatMap(group => group.ids));
      this.closeDialog(); this.showTab(kind);
    });
  }

  private showConfirm(message: string, action: () => void): void {
    this.closeDialog();
    const shade = this.add.rectangle(640, 360, 1280, 720, 0x000000, 0.72).setInteractive();
    const panel = new CrayonPatch(this, 640, 360, 650, 260, 0x242a33, 1); panel.setStrokeStyle(3, 0xc36b70, 0.95);
    const body = this.add.text(640, 320, message, { ...this.style(20, '#f8fafc'), align: 'center', wordWrap: { width: 560, useAdvancedWrap: true } }).setOrigin(0.5);
    const root = this.add.container(0, 0, [shade, panel, body]).setDepth(8000);
    root.add(this.createButton(540, 425, 170, 42, this.ui('Unlock', '解放する'), action, true, true));
    root.add(this.createButton(740, 425, 170, 42, this.ui('Cancel', 'キャンセル'), () => this.closeDialog()));
    this.dialog = root;
  }

  private closeDialog(): void { this.dialog?.destroy(true); this.dialog = undefined; }
  private isPortraitUnlocked(id: string): boolean { return USER_SETTINGS.value.gallery.seenPortraitIds.some(seen => portraitGalleryId(seen) === id); }
  private categoryName(category: string): string {
    if (category === 'prologue') return this.ui('Prologue', 'プロローグ');
    if (category === 'normal') return this.ui('Normal', '通常');
    return category;
  }

  private createButton(x: number, y: number, width: number, height: number, label: string, action: () => void,
    enabled = true, danger = false, stamped = false): Phaser.GameObjects.Container {
    const root = this.add.container(x, y);
    const fill = stamped ? 0x302426 : enabled ? (danger ? 0x562d34 : CRAYON_COLORS.button) : 0x373d47;
    const bg = new CrayonPatch(this, 0, 0, width, height, fill, 1);
    bg.setStrokeStyle(2, danger ? 0xc36b70 : 0x9ba8ba, stamped ? 0.8 : enabled ? 0.9 : 0.45);
    const text = this.add.text(0, 0, label, this.style(Math.min(17, Math.max(11, width / Math.max(5, label.length) * 1.1)), stamped ? '#d98e93' : enabled ? '#f8fafc' : '#717985')).setOrigin(0.5);
    if (enabled) { bg.setInteractive({ useHandCursor: true }); onPrimaryClick(bg, action); KeyboardNavigation.for(this).register(bg); }
    root.add([bg, text]); return root;
  }
  private ui(en: string, ja: string): string { return SETTINGS_STATE.language === 'ja' ? ja : en; }
  private style(size: number, color: string): Phaser.Types.GameObjects.Text.TextStyle { return { fontFamily: GAME_FONT, fontSize: `${size}px`, fontStyle: 'bold', color }; }
}
