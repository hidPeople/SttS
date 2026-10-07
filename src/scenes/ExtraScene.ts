import type { CharacterPortraitDefinition } from '../models/types';
import Phaser from 'phaser';
import { galleryEvents, portraitConditionHint } from '../models/gallery';
import { characterPortraitAssets, characterPortraitFiles, characterPortraitThumbnailAssets, portraitGalleryId } from '../models/portraitAssets';
import { galleryThumbnailAsset } from '../models/galleryThumbnailAssets';
import { USER_SETTINGS } from '../models/userSettings';
import { localizeGameText as localize } from '../models/gameText';
import { SETTINGS_STATE } from '../models/localization';
import { ensureSprites } from '../ui/sprites';
import { SCREEN_CENTER_X, SCREEN_CENTER_Y, SCREEN_HEIGHT, SCREEN_WIDTH } from '../ui/layout';
import { GAME_FONT } from '../ui/fonts';
import { CrayonPatch, CRAYON_COLORS } from '../ui/crayon';
import { onPrimaryClick, installPointerBack } from '../ui/pointerActions';
import { KeyboardNavigation, type Direction, type NavigationItem } from '../ui/keyboardNavigation';

type ExtraTab = 'events' | 'portraits';
type PortraitGroup = { category: string; ids: string[]; index: number };
type PortraitMotion = {
  row: Phaser.GameObjects.Container;
  sprites: Phaser.GameObjects.Sprite[];
  groupIndex: number;
  anchorIndex: number;
  position: number;
  target: number;
};

const PORTRAIT_CENTER_X = 700;
const PORTRAIT_ROW_Y = 360;
const PORTRAIT_CAROUSEL_RADIUS = 430;
const PORTRAIT_CAROUSEL_ANGLE_STEP = Math.PI / 10;

export class ExtraScene extends Phaser.Scene {
  private seenPortraits?: readonly string[];
  private unlockedPortraits = new Set<string>();
  private gallerySession = 0;
  private ownedTextures = new Set<string>();
  private galleryAssets = new Map<string, CharacterPortraitDefinition>();
  private scopedGalleryAsset(asset: CharacterPortraitDefinition | undefined, kind: string) {
    if (!asset) return undefined;
    const key = `extra:${this.gallerySession}:${kind}:${asset.textureKey}`;
    if (!this.galleryAssets.has(key)) this.galleryAssets.set(key, { ...asset, textureKey: key });
    return this.galleryAssets.get(key)!;
  }
  private portraitListAsset(id: string) {
    return this.scopedGalleryAsset(characterPortraitThumbnailAssets[id], 'thumb') ?? this.galleryPortraitAsset(id)!;
  }
  private eventThumbnailAsset(path: string | undefined) {
    return this.scopedGalleryAsset(galleryThumbnailAsset(path), 'event');
  }
  private galleryPortraitAsset(id: string, full = false) {
    const asset = characterPortraitAssets[id];
    return this.scopedGalleryAsset(asset, full ? 'full' : 'fallback');
  }
  private async loadGallerySprites(definitions: Parameters<typeof ensureSprites>[1]): Promise<boolean> {
    const owned = this.ownedTextures;
    const session = this.gallerySession;
    for (const asset of definitions) if (!this.textures.exists(asset.textureKey)) owned.add(asset.textureKey);
    await ensureSprites(this, definitions);
    if (session === this.gallerySession && this.sys.isPaused()) await new Promise<void>(resolve => {
      const done = () => { this.events.off('resume', done); this.events.off('shutdown', done); resolve(); };
      this.events.once('resume', done); this.events.once('shutdown', done);
    });
    if (session !== this.gallerySession || !this.sys.isActive()) {
      for (const key of owned) if (this.textures.exists(key)) this.textures.remove(key);
      return false;
    }
    return definitions.every(asset => this.textures.exists(asset.textureKey));
  }
  private goBack(): void {
    if (this.dialog) this.closeDialog();
    else if (this.enlargedPortraitId) this.closeEnlargedPortrait();
    else this.scene.start('TitleScene');
  }
  private tab: ExtraTab = 'events';
  private tabChrome!: Phaser.GameObjects.Container;
  private content!: Phaser.GameObjects.Container;
  private portraitCarousel!: Phaser.GameObjects.Container;
  private portraitChrome!: Phaser.GameObjects.Container;
  private portraitRows = new Map<number, Phaser.GameObjects.Container>();
  private portraitCategoryItems: Array<{ background: CrayonPatch; text: Phaser.GameObjects.Text }> = [];
  private portraitHintText?: Phaser.GameObjects.Text;
  private portraitOverlay?: Phaser.GameObjects.Container;
  private dialog?: Phaser.GameObjects.Container;
  private portraitGroups: PortraitGroup[] = [];
  private portraitGroupIndex = 0;
  private transitioning = false;
  public canShowStorageFailure(): boolean { return !this.transitioning; }
  private enlargedPortraitId?: string;
  private renderRequest = 0;
  private portraitMotion?: PortraitMotion;
  private portraitMotionTween?: Phaser.Tweens.Tween;
  private portraitMotionRequest = 0;

  constructor() { super('ExtraScene'); }

  init(data: { tab?: ExtraTab } = {}): void { this.tab = data.tab ?? 'events'; }

  create(): void {
    this.gallerySession++; this.ownedTextures = new Set(); this.galleryAssets.clear();
    this.dialog = this.portraitOverlay = undefined; this.enlargedPortraitId = undefined;
    this.events.once('shutdown', () => {
      this.renderRequest++; this.gallerySession++;
      this.content?.removeAll(true);
      for (const key of this.ownedTextures) if (this.textures.exists(key)) this.textures.remove(key);
    });
    KeyboardNavigation.for(this).configure({
      scope: () => this.dialog ?? this.portraitOverlay,
      escape: () => this.goBack(),
      move: (direction, current, items) => this.moveExtraKeyboardSelection(direction, current, items),
    });
    installPointerBack(this, () => { this.goBack(); return true; });
    this.add.rectangle(SCREEN_CENTER_X, SCREEN_CENTER_Y, SCREEN_WIDTH, SCREEN_HEIGHT, 0x111720);
    this.add.text(640, 42, 'Extra', this.style(34, '#f8fafc')).setOrigin(0.5);
    this.createButton(80, 38, 130, 38, this.ui('Back', '戻る'), () => this.scene.start('TitleScene'), true, false, false, 'extra-back');
    this.tabChrome = this.add.container(0, 0);
    this.content = this.add.container(0, 0);
    this.buildPortraitGroups();
    this.input.on('wheel', (_pointer: Phaser.Input.Pointer, objects: Phaser.GameObjects.GameObject[], _dx: number, dy: number) => {
      if (this.tab !== 'portraits' || this.enlargedPortraitId || this.dialog || dy === 0) return;
      const portrait = objects.find(object => object.name === 'portrait-carousel');
      if (portrait) {
        const groupIndex = portrait.getData('portraitGroupIndex');
        if (typeof groupIndex === 'number' && groupIndex !== this.portraitGroupIndex) this.moveGroup(Math.sign(groupIndex - this.portraitGroupIndex));
        else this.queuePortraitWheel(dy);
      } else this.moveGroup(dy > 0 ? 1 : -1);
    });
    this.showTab(this.tab);
  }

  private showTab(tab: ExtraTab): void {
    this.closeEnlargedPortrait();
    this.renderRequest += 1;
    this.tweens.killTweensOf(this.content);
    if (this.portraitCarousel) this.tweens.killTweensOf(this.portraitCarousel);
    this.tab = tab;
    this.renderTabSelector();
    this.transitioning = false;
    this.portraitMotionTween?.stop();
    this.portraitMotionTween = undefined;
    this.portraitMotion = undefined;
    this.portraitMotionRequest += 1;
    if (tab !== 'portraits') this.enlargedPortraitId = undefined;
    this.content.setPosition(0, 0).setAlpha(1);
    this.content.removeAll(true);
    this.portraitRows.clear();
    this.portraitOverlay = undefined;
    this.portraitCategoryItems = [];
    this.portraitHintText = undefined;
    if (tab === 'events') {
      this.renderEvents();
      void this.loadEventThumbnails();
      return;
    }
    this.portraitCarousel = this.add.container(0, 0);
    this.portraitChrome = this.add.container(0, 0);
    this.content.add([this.portraitCarousel, this.portraitChrome]);
    this.renderPortraitChrome();
    void this.loadPortraitsAndRender();
  }

  private renderTabSelector(): void {
    this.tabChrome.removeAll(true);
    const tabs: Array<{ tab: ExtraTab; x: number; label: string; group: string }> = [
      { tab: 'events', x: 455, label: this.ui('Events', 'イベント一覧'), group: 'extra-tab-events' },
      { tab: 'portraits', x: 825, label: this.ui('Portraits', '立ち絵一覧'), group: 'extra-tab-portraits' },
    ];
    for (const item of tabs) {
      this.tabChrome.add(item.tab === this.tab
        ? this.createSelectedTabLabel(item.x, 92, 280, item.label)
        : this.createButton(item.x, 92, 280, 44, item.label, () => this.showTab(item.tab), true, false, false, item.group));
    }
  }

  private async loadPortraitsAndRender(onReady?: () => void): Promise<void> {
    const request = ++this.renderRequest;
    this.portraitCarousel.removeAll(true);
    this.portraitCarousel.add(this.add.text(640, 360, this.ui('Loading portraits…', '立ち絵を読み込み中…'), this.style(18, '#aeb9c8')).setOrigin(0.5));
    const definitions = this.portraitAssetsForCurrentView();
    const loaded = await this.loadGallerySprites(definitions);
    if (request !== this.renderRequest || this.tab !== 'portraits' || !this.sys.isActive()) return;
    this.portraitCarousel.removeAll(true);
    if (!loaded) {
      this.transitioning = false;
      this.portraitCarousel.add(this.add.text(640, 360, this.ui('Failed to load portraits.', '立ち絵を読み込めませんでした。'), this.style(18, '#d98e93')).setOrigin(0.5));
      return;
    }
    this.renderPortraits();
    onReady?.();
  }

  private portraitAssetsForCurrentView(groupIndex = this.portraitGroupIndex, centerIndex?: number) {
    if (!this.portraitGroups.length) return [];
    groupIndex = Phaser.Math.Clamp(groupIndex, 0, this.portraitGroups.length - 1);
    const ids = new Set<string>();
    const current = this.portraitGroups[groupIndex];
    if (current.ids.length) {
      const index = centerIndex ?? current.index;
      for (let offset = -4; offset <= 4; offset += 1) {
        ids.add(current.ids[this.wrapPortraitIndex(index + offset, current.ids.length)]);
      }
    }
    for (const adjacent of [this.portraitGroups[groupIndex - 1], this.portraitGroups[groupIndex + 1]]) {
      if (adjacent?.ids.length) ids.add(adjacent.ids[adjacent.index]);
    }
    return [...ids].map(id => this.portraitListAsset(id)).filter(Boolean);
  }

  private async loadEventThumbnails(): Promise<void> {
    const request = this.renderRequest;
    const definitions = galleryEvents().flatMap(event => {
      const asset = this.eventThumbnailAsset(event.thumbnail);
      return asset ? [asset] : [];
    });
    if (definitions.every(asset => this.textures.exists(asset.textureKey))) return;
    const loaded = await this.loadGallerySprites(definitions);
    if (!loaded || request !== this.renderRequest || this.tab !== 'events' || !this.sys.isActive()) return;
    this.content.removeAll(true);
    this.renderEvents();
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
      const background = this.eventThumbnailAsset(event.thumbnail);
      if (background && this.textures.exists(background.textureKey)) {
        const image = this.add.image(0, -16, background.textureKey).setDisplaySize(356, 160);
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
    this.portraitMotionTween?.stop();
    this.portraitMotionTween = undefined;
    this.portraitMotion = undefined;
    this.portraitCarousel.removeAll(true);
    this.portraitRows.clear();
    this.portraitGroupIndex = Phaser.Math.Clamp(this.portraitGroupIndex, 0, this.portraitGroups.length - 1);
    const previous = this.portraitGroupIndex - 1;
    const next = this.portraitGroupIndex + 1;
    if (previous >= 0) this.renderPortraitRow(this.portraitGroups[previous], previous, -48, false);
    if (next < this.portraitGroups.length) this.renderPortraitRow(this.portraitGroups[next], next, 778, false);
    this.renderPortraitMotionRow(this.portraitGroups[this.portraitGroupIndex], this.portraitGroupIndex, PORTRAIT_ROW_Y);
    this.updatePortraitChromeText();
  }

  private renderPortraitChrome(): void {
    this.portraitChrome.removeAll(true);
    this.portraitChrome.add(this.createDirectionalButton(100, 185, 92, 38, 'W', 'up', () => this.moveGroup(-1)));
    this.portraitChrome.add(this.createDirectionalButton(100, 535, 92, 38, 'S', 'down', () => this.moveGroup(1)));
    this.portraitChrome.add(this.createDirectionalButton(235, 360, 112, 44, 'A', 'left', () => this.movePortrait(-1)));
    this.portraitChrome.add(this.createDirectionalButton(1170, 360, 112, 44, 'D', 'right', () => this.movePortrait(1)));
    this.renderPortraitCategoryList();
    this.portraitHintText = this.add.text(PORTRAIT_CENTER_X, 615, '', {
      ...this.style(15, '#d6e0ec'), align: 'center', wordWrap: { width: 850, useAdvancedWrap: true },
      backgroundColor: 'rgba(17, 23, 32, 0.84)', padding: { x: 10, y: 5 },
    }).setOrigin(0.5);
    this.portraitChrome.add(this.portraitHintText);
    const allIds = this.portraitGroups.flatMap(group => group.ids);
    const unlockedCount = allIds.filter(id => this.isPortraitUnlocked(id)).length;
    const percent = allIds.length ? Math.floor(unlockedCount / allIds.length * 100) : 100;
    this.portraitChrome.add(this.add.text(28, 690, this.ui(`Portrait completion  ${percent}%`, `表示達成率　${percent}％`), this.style(16, '#dbe5f2')).setOrigin(0, 0.5));
    this.addGalleryUnlockControl('portraits', unlockedCount < allIds.length, this.portraitChrome);
    this.updatePortraitChromeText();
  }

  private updatePortraitChromeText(): void {
    const group = this.portraitGroups[this.portraitGroupIndex];
    const id = group?.ids[group.index];
    this.portraitCategoryItems.forEach((item, index) => {
      const selected = index === this.portraitGroupIndex;
      item.background.setFillStyle(selected ? 0x66512b : 0x242d39, 1)
        .setStrokeStyle(2, selected ? 0xefd18c : 0x6d7888, selected ? 1 : 0.55);
      item.text.setColor(selected ? '#fff1b8' : '#aeb9c8');
    });
    this.portraitHintText?.setText(id ? localize(portraitConditionHint(id)) : '');
  }

  private renderPortraitCategoryList(): void {
    this.portraitCategoryItems = [];
    const count = this.portraitGroups.length;
    if (!count) return;
    const gap = count === 1 ? 50 : Math.min(50, 250 / (count - 1));
    const height = Math.max(22, Math.min(40, gap - 6));
    const startY = 360 - gap * (count - 1) / 2;
    this.portraitGroups.forEach((group, index) => {
      const y = startY + index * gap;
      const background = new CrayonPatch(this, 100, y, 154, height, 0x242d39, 1, { animateChanges: false });
      const text = this.add.text(100, y, this.categoryName(group.category), {
        ...this.style(Math.min(18, height * 0.46), '#aeb9c8'), align: 'center',
        wordWrap: { width: 140, useAdvancedWrap: true },
      }).setOrigin(0.5);
      background.setInteractive({ useHandCursor: true });
      onPrimaryClick(background, () => this.moveGroup(index - this.portraitGroupIndex));
      this.portraitCategoryItems.push({ background, text });
      this.portraitChrome.add([background, text]);
    });
  }

  private renderPortraitRow(group: PortraitGroup, groupIndex: number, y: number, focused: boolean): Phaser.GameObjects.Container | undefined {
    const count = group.ids.length;
    if (!count) return undefined;
    const row = this.add.container(0, y);
    const offsets = focused ? [-4, 4, -3, 3, -2, 2, -1, 1, 0] : [0];
    for (const offset of offsets) {
      const index = this.wrapPortraitIndex(group.index + offset, count);
      const id = group.ids[index];
      const asset = this.portraitListAsset(id);
      const distance = Math.abs(offset);
      // Orthographic projection of equally spaced points on a semicircle.
      // sin(theta) makes the visible gaps narrower toward either outer edge.
      const xOffset = PORTRAIT_CAROUSEL_RADIUS * Math.sin(offset * PORTRAIT_CAROUSEL_ANGLE_STEP);
      const sprite = this.add.sprite(PORTRAIT_CENTER_X + xOffset, 0, asset.textureKey).setName('portrait-carousel');
      sprite.setData('portraitGroupIndex', groupIndex);
      const targetHeight = focused ? (distance === 0 ? 470 : 350 - distance * 20) : (distance === 0 ? 370 : 290 - distance * 14);
      sprite.setScale(targetHeight / Math.max(1, sprite.height)).setAlpha(focused ? Math.max(0.38, 1 - distance * 0.13) : 0.34);
      const unlocked = this.isPortraitUnlocked(id);
      if (!unlocked) {
        const lockedAlpha = focused ? Math.max(0.42, 1 - distance * 0.145) : 0.42;
        sprite.setTintFill(0x747c88).setAlpha(lockedAlpha);
      }
      sprite.setInteractive({ useHandCursor: focused ? unlocked && distance === 0 : true });
      if (focused && distance === 0 && unlocked) onPrimaryClick(sprite, () => {
        void this.openEnlargedPortrait(id);
      });
      if (!focused) onPrimaryClick(sprite, () => this.moveGroup(Math.sign(groupIndex - this.portraitGroupIndex)));
      row.add(sprite);
    }
    this.portraitRows.set(groupIndex, row);
    this.portraitCarousel.add(row);
    return row;
  }

  private renderPortraitMotionRow(group: PortraitGroup, groupIndex: number, y: number): void {
    const row = this.add.container(0, y);
    // Keep enough fixed logical slots for the visible nine portraits plus the
    // maximum eight-step swipe. Slots never change identity mid-motion.
    const sprites = Array.from({ length: 25 }, () => {
      const sprite = this.add.sprite(PORTRAIT_CENTER_X, 0, '__DEFAULT').setName('portrait-carousel');
      sprite.setData('portraitGroupIndex', groupIndex).setInteractive({ useHandCursor: true });
      onPrimaryClick(sprite, () => {
        if (this.transitioning) return;
        const id = sprite.getData('portraitId');
        const relative = sprite.getData('portraitRelative');
        if (typeof id === 'string' && typeof relative === 'number' && Math.abs(relative) < 0.5 && this.isPortraitUnlocked(id)) {
          void this.openEnlargedPortrait(id);
        }
      });
      row.add(sprite);
      return sprite;
    });
    this.portraitMotion = { row, sprites, groupIndex, anchorIndex: group.index, position: 0, target: 0 };
    this.portraitRows.set(groupIndex, row);
    this.portraitCarousel.add(row);
    this.updatePortraitMotionLayout();
  }

  private updatePortraitMotionLayout(): void {
    const motion = this.portraitMotion;
    const group = motion && this.portraitGroups[motion.groupIndex];
    if (!motion || !group?.ids.length) return;
    motion.sprites.forEach((sprite, poolIndex) => {
      const logicalOffset = poolIndex - 12;
      const relative = logicalOffset - motion.position;
      const distance = Math.abs(relative);
      const id = group.ids[this.wrapPortraitIndex(motion.anchorIndex + logicalOffset, group.ids.length)];
      const asset = this.portraitListAsset(id);
      if (distance > 4.15 || !asset || !this.textures.exists(asset.textureKey)) {
        sprite.setVisible(false);
        return;
      }
      if (sprite.texture.key !== asset.textureKey) sprite.setTexture(asset.textureKey);
      const xOffset = PORTRAIT_CAROUSEL_RADIUS * Math.sin(relative * PORTRAIT_CAROUSEL_ANGLE_STEP);
      const targetHeight = distance <= 1 ? 470 - distance * 140 : 330 - (distance - 1) * 20;
      const unlocked = this.isPortraitUnlocked(id);
      const alpha = unlocked ? Math.max(0.38, 1 - distance * 0.13) : Math.max(0.42, 1 - distance * 0.145);
      sprite.clearTint().setPosition(PORTRAIT_CENTER_X + xOffset, 0)
        .setScale(targetHeight / Math.max(1, sprite.height)).setAlpha(alpha).setVisible(true)
        .setDepth(Math.round((5 - distance) * 100));
      if (!unlocked) sprite.setTintFill(0x747c88);
      sprite.setData('portraitId', id).setData('portraitRelative', relative);
    });
    motion.row.sort('depth');
  }

  private renderEnlargedPortrait(id: string): void {
    const asset = this.galleryPortraitAsset(id, true);
    if (!asset || !this.isPortraitUnlocked(id)) { this.enlargedPortraitId = undefined; return; }
    this.portraitOverlay?.destroy(true);
    const overlay = this.add.container(0, 0);
    const shade = this.add.rectangle(640, 405, 1280, 630, 0x05070a, 0.84).setInteractive({ useHandCursor: true });
    const sprite = this.add.sprite(640, 385, asset.textureKey).setInteractive({ useHandCursor: true });
    sprite.setScale(Math.min(700 / Math.max(1, sprite.height), 1200 / Math.max(1, sprite.width)));
    const close = () => this.closeEnlargedPortrait();
    onPrimaryClick(shade, close); onPrimaryClick(sprite, close);
    KeyboardNavigation.for(this).register(sprite, { group: 'portrait-close', activate: close });
    overlay.add([shade, sprite]);
    this.content.add(overlay);
    this.portraitOverlay = overlay;
  }

  private async openEnlargedPortrait(id: string): Promise<void> {
    const asset = this.galleryPortraitAsset(id, true);
    if (!asset || !this.isPortraitUnlocked(id) || this.transitioning) return;
    this.transitioning = true;
    const request = this.renderRequest;
    const loaded = await this.loadGallerySprites([asset]);
    if (request !== this.renderRequest || this.tab !== 'portraits' || !this.sys.isActive()) {
      if (this.textures.exists(asset.textureKey)) this.textures.remove(asset.textureKey);
      return;
    }
    this.transitioning = false;
    if (!loaded) return;
    this.enlargedPortraitId = id;
    this.renderEnlargedPortrait(id);
  }

  private closeEnlargedPortrait(): void {
    this.portraitOverlay?.destroy(true);
    this.portraitOverlay = undefined;
    const key = this.enlargedPortraitId ? this.galleryPortraitAsset(this.enlargedPortraitId, true)?.textureKey : undefined;
    this.enlargedPortraitId = undefined;
    if (key && this.textures.exists(key)) this.textures.remove(key);
    if (key) this.ownedTextures.delete(key);
  }

  private wrapPortraitIndex(index: number, count: number): number {
    return ((index % count) + count) % count;
  }

  private moveExtraKeyboardSelection(direction: Direction, current: NavigationItem | undefined,
    items: NavigationItem[]): NavigationItem | undefined {
    if (this.tab !== 'portraits' || this.dialog || this.enlargedPortraitId) {
      const index = current ? items.indexOf(current) : -1;
      const step = direction === 'left' || direction === 'up' ? -1 : 1;
      return items[index < 0 ? 0 : (index + step + items.length) % items.length];
    }

    const byGroup = (group: string) => items.find(item => item.group === group);
    const back = byGroup('extra-back');
    const events = byGroup('extra-tab-events');
    const unlock = byGroup('extra-portrait-unlock');
    const navigation = KeyboardNavigation.for(this);
    if (!navigation.hasKeyboardSelection) current = undefined;
    const atTop = this.portraitGroupIndex === 0;
    const atBottom = this.portraitGroupIndex === this.portraitGroups.length - 1;

    if (!current) {
      if (direction === 'left' || direction === 'right') {
        this.movePortrait(direction === 'left' ? -1 : 1);
        return undefined;
      }
      if (direction === 'up') {
        if (atTop) return back;
        this.moveGroup(-1);
        return undefined;
      }
      if (atBottom) return unlock;
      this.moveGroup(1);
      return undefined;
    }

    if (current.group === 'extra-portrait-unlock') {
      if (direction === 'down') return back;
      if (direction === 'up') {
        navigation.clearSelection();
        if (!atBottom) this.moveGroup(this.portraitGroups.length - 1 - this.portraitGroupIndex);
      }
      return undefined;
    }

    if (current.group === 'extra-back' || current.group === 'extra-tab-events') {
      if (direction === 'left' || direction === 'right') return current.group === 'extra-back' ? events : back;
      if (direction === 'up') return unlock ?? current;
      navigation.clearSelection();
      if (!atTop) this.moveGroup(-this.portraitGroupIndex);
      return undefined;
    }

    return current;
  }

  private movePortrait(delta: number): void {
    const group = this.portraitGroups[this.portraitGroupIndex];
    const motion = this.portraitMotion;
    if (!group?.ids.length || !motion || motion.groupIndex !== this.portraitGroupIndex || delta === 0) return;
    if (Math.abs(motion.target + delta) > 8) {
      this.portraitMotionTween?.stop();
      this.portraitMotionTween = undefined;
      this.rebasePortraitMotion(motion, group);
    }
    motion.target = Phaser.Math.Clamp(motion.target + delta, -8, 8);
    void this.animatePortraitMotion(motion, group);
  }

  private rebasePortraitMotion(motion: PortraitMotion, group: PortraitGroup): void {
    const moved = Math.round(motion.position);
    if (moved === 0) return;
    motion.anchorIndex = this.wrapPortraitIndex(motion.anchorIndex + moved, group.ids.length);
    group.index = motion.anchorIndex;
    motion.position -= moved;
    motion.target -= moved;
    this.updatePortraitMotionLayout();
  }

  private queuePortraitWheel(deltaY: number): void {
    const direction = Math.sign(deltaY);
    const steps = Phaser.Math.Clamp(Math.ceil(Math.abs(deltaY) / 100), 1, 4);
    this.movePortrait(direction * steps);
  }

  private portraitAssetsForMotion(motion: PortraitMotion, group: PortraitGroup) {
    const ids = new Set<string>();
    const from = Math.floor(Math.min(motion.position, motion.target)) - 5;
    const to = Math.ceil(Math.max(motion.position, motion.target)) + 5;
    for (let logicalOffset = from; logicalOffset <= to; logicalOffset += 1) {
      ids.add(group.ids[this.wrapPortraitIndex(motion.anchorIndex + logicalOffset, group.ids.length)]);
    }
    return [...ids].map(id => this.portraitListAsset(id)).filter(Boolean);
  }

  private async animatePortraitMotion(motion: PortraitMotion, group: PortraitGroup): Promise<void> {
    const motionRequest = ++this.portraitMotionRequest;
    this.transitioning = true;
    const request = this.renderRequest;
    const loaded = await this.loadGallerySprites(this.portraitAssetsForMotion(motion, group));
    if (motionRequest !== this.portraitMotionRequest) return;
    if (!loaded || request !== this.renderRequest || this.tab !== 'portraits' || !this.sys.isActive() || this.portraitMotion !== motion) {
      this.transitioning = false;
      return;
    }
    this.portraitMotionTween?.stop();
    const distance = Math.abs(motion.target - motion.position);
    const duration = Phaser.Math.Clamp(115 + distance * 38, 130, 310);
    this.portraitMotionTween = this.tweens.add({
      targets: motion, position: motion.target, duration, ease: 'Cubic.easeOut',
      onUpdate: () => this.updatePortraitMotionLayout(),
      onComplete: () => {
        const moved = Math.round(motion.position);
        group.index = this.wrapPortraitIndex(motion.anchorIndex + moved, group.ids.length);
        motion.anchorIndex = group.index;
        motion.position = 0;
        motion.target = 0;
        this.updatePortraitMotionLayout();
        this.updatePortraitChromeText();
        this.portraitMotionTween = undefined;
        this.transitioning = false;
      },
    });
  }

  private moveGroup(delta: number): void {
    const next = Phaser.Math.Clamp(this.portraitGroupIndex + delta, 0, Math.max(0, this.portraitGroups.length - 1));
    if (next === this.portraitGroupIndex || this.transitioning) return;
    void this.moveGroupAsync(delta, next);
  }

  private async moveGroupAsync(delta: number, next: number): Promise<void> {
    this.transitioning = true;
    const request = this.renderRequest;
    const loaded = await this.loadGallerySprites(this.portraitAssetsForCurrentView(next));
    if (!loaded || request !== this.renderRequest || this.tab !== 'portraits' || !this.sys.isActive()) {
      this.transitioning = false;
      return;
    }
    const distance = 74;
    this.tweens.add({
      targets: this.portraitCarousel, y: -Math.sign(delta) * distance, alpha: 0.55, duration: 90, ease: 'Sine.easeIn',
      onComplete: () => {
        this.portraitGroupIndex = next;
        this.portraitCarousel.y = Math.sign(delta) * distance;
        this.portraitCarousel.setAlpha(0.55);
        this.renderPortraits();
        this.tweens.add({ targets: this.portraitCarousel, y: 0, alpha: 1, duration: 120, ease: 'Sine.easeOut', onComplete: () => { this.transitioning = false; } });
      },
    });
  }

  private addGalleryUnlockControl(kind: ExtraTab, hasLocked: boolean, target = this.content): void {
    const forced = kind === 'events' ? USER_SETTINGS.value.gallery.forcedEventsUnlocked : USER_SETTINGS.value.gallery.forcedPortraitsUnlocked;
    if (forced) {
      target.add(this.createButton(1140, 688, 230, 32, this.ui('FORCIBLY UNLOCKED', '強制解放済み'), () => {}, false, true, true));
      return;
    }
    if (!hasLocked) return;
    target.add(this.createButton(1125, 688, 260, 32,
      kind === 'events' ? this.ui('Unlock All Events', '全てのイベントを解放する') : this.ui('Unlock All Portraits', '全ての立ち絵を解放する'),
      () => this.confirmForceUnlock(kind), true, true, false, kind === 'portraits' ? 'extra-portrait-unlock' : 'buttons'));
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
  private isPortraitUnlocked(id: string): boolean {
    const seen = USER_SETTINGS.value.gallery.seenPortraitIds;
    if (seen !== this.seenPortraits) {
      this.seenPortraits = seen; this.unlockedPortraits = new Set(seen.map(portraitGalleryId));
    }
    return this.unlockedPortraits.has(id);
  }
  private categoryName(category: string): string {
    if (category === 'prologue') return this.ui('Prologue', 'プロローグ');
    if (category === 'normal') return this.ui('Normal', '通常');
    return category;
  }

  private createButton(x: number, y: number, width: number, height: number, label: string, action: () => void,
    enabled = true, danger = false, stamped = false, navigationGroup: string | false = 'buttons'): Phaser.GameObjects.Container {
    const root = this.add.container(x, y);
    const fill = stamped ? 0x302426 : enabled ? (danger ? 0x562d34 : CRAYON_COLORS.button) : 0x373d47;
    const bg = new CrayonPatch(this, 0, 0, width, height, fill, 1);
    bg.setStrokeStyle(2, danger ? 0xc36b70 : 0x9ba8ba, stamped ? 0.8 : enabled ? 0.9 : 0.45);
    const text = this.add.text(0, 0, label, this.style(Math.min(17, Math.max(11, width / Math.max(5, label.length) * 1.1)), stamped ? '#d98e93' : enabled ? '#f8fafc' : '#717985')).setOrigin(0.5);
    if (enabled) {
      bg.setInteractive({ useHandCursor: true });
      onPrimaryClick(bg, action);
      if (navigationGroup) KeyboardNavigation.for(this).register(bg, { group: navigationGroup });
    }
    root.add([bg, text]); return root;
  }

  private createSelectedTabLabel(x: number, y: number, width: number, label: string): Phaser.GameObjects.Container {
    const root = this.add.container(x, y);
    const text = this.add.text(0, -2, label, this.style(19, '#efd18c')).setOrigin(0.5);
    const underline = this.add.graphics();
    underline.lineStyle(3, 0xefd18c, 0.95).lineBetween(-width * 0.32, 18, width * 0.32, 18);
    root.add([text, underline]);
    return root;
  }

  private createDirectionalButton(x: number, y: number, width: number, height: number, label: string,
    direction: 'left' | 'right' | 'up' | 'down', action: () => void): Phaser.GameObjects.Container {
    const root = this.createButton(x, y, width, height, label, action, true, false, false, false);
    const arrow = this.add.graphics();
    arrow.fillStyle(0xf8fafc, 1);
    if (direction === 'left') arrow.fillTriangle(-38, 0, -25, -8, -25, 8);
    else if (direction === 'right') arrow.fillTriangle(38, 0, 25, -8, 25, 8);
    else if (direction === 'up') arrow.fillTriangle(-8, -7, 8, -7, 0, -18);
    else arrow.fillTriangle(-8, 7, 8, 7, 0, 18);
    root.add(arrow);
    return root;
  }
  private ui(en: string, ja: string): string { return SETTINGS_STATE.language === 'ja' ? ja : en; }
  private style(size: number, color: string): Phaser.Types.GameObjects.Text.TextStyle { return { fontFamily: GAME_FONT, fontSize: `${size}px`, fontStyle: 'bold', color }; }
}
