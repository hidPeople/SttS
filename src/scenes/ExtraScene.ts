import Phaser from 'phaser';
import { CONVERSATIONS } from '../data/conversations';
import { galleryEvents, portraitConditionHint } from '../models/gallery';
import { characterPortraitAssets, characterPortraitFiles, portraitGalleryId } from '../models/portraitAssets';
import { USER_SETTINGS } from '../models/userSettings';
import { localizeGameText as localize } from '../models/gameText';
import { SETTINGS_STATE } from '../models/localization';
import { preloadConversationAssets, conversationBackgroundTextureKey } from '../ui/conversation';
import { preloadSprites } from '../ui/sprites';
import { SCREEN_CENTER_X, SCREEN_CENTER_Y, SCREEN_HEIGHT, SCREEN_WIDTH } from '../ui/layout';
import { GAME_FONT } from '../ui/fonts';
import { CrayonPatch, CRAYON_COLORS } from '../ui/crayon';
import { onPrimaryClick, installPointerBack } from '../ui/pointerActions';
import { KeyboardNavigation } from '../ui/keyboardNavigation';

type ExtraTab = 'events' | 'portraits';

export class ExtraScene extends Phaser.Scene {
  private tab: ExtraTab = 'events';
  private content!: Phaser.GameObjects.Container;
  private tooltip!: Phaser.GameObjects.Container;
  private tooltipText!: Phaser.GameObjects.Text;
  private portraitGroups: { category: string; ids: string[]; index: number }[] = [];
  private portraitGroupIndex = 0;

  constructor() { super('ExtraScene'); }

  preload(): void {
    preloadConversationAssets(this, galleryEvents().map(event => event.conversationId));
    preloadSprites(this, Object.values(characterPortraitAssets));
  }

  create(): void {
    KeyboardNavigation.for(this);
    installPointerBack(this, () => { this.scene.start('TitleScene'); return true; });
    this.add.rectangle(SCREEN_CENTER_X, SCREEN_CENTER_Y, SCREEN_WIDTH, SCREEN_HEIGHT, 0x111720);
    this.add.text(640, 42, 'Extra', this.style(34, '#f8fafc')).setOrigin(0.5);
    this.createButton(455, 92, 280, 44, this.ui('Events', 'イベント一覧'), () => this.showTab('events'));
    this.createButton(825, 92, 280, 44, this.ui('Portraits', '立ち絵一覧'), () => this.showTab('portraits'));
    this.createButton(1180, 684, 150, 36, this.ui('Back', '戻る'), () => this.scene.start('TitleScene'));
    this.content = this.add.container(0, 0);
    this.tooltipText = this.add.text(14, 10, '', { ...this.style(15, '#f8fafc'), wordWrap: { width: 330, useAdvancedWrap: true } });
    const tooltipBg = new CrayonPatch(this, 0, 0, 360, 76, 0x202733, 0.98).setOrigin(0, 0);
    this.tooltip = this.add.container(0, 0, [tooltipBg, this.tooltipText]).setDepth(5000).setVisible(false);
    this.buildPortraitGroups();
    this.input.on('wheel', (_pointer: Phaser.Input.Pointer, objects: Phaser.GameObjects.GameObject[], _dx: number, dy: number) => {
      if (this.tab !== 'portraits') return;
      const portrait = objects.find(object => object.name === 'portrait-carousel');
      if (portrait) {
        this.portraitGroupIndex = portrait.getData('portraitGroupIndex') ?? this.portraitGroupIndex;
        this.movePortrait(dy > 0 ? 1 : -1);
      } else this.moveGroup(dy > 0 ? 1 : -1);
    });
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      if (this.tab !== 'portraits') return;
      if (['ArrowLeft', 'KeyA'].includes(event.code)) this.movePortrait(-1);
      if (['ArrowRight', 'KeyD'].includes(event.code)) this.movePortrait(1);
      if (['ArrowUp', 'KeyW'].includes(event.code)) this.moveGroup(-1);
      if (['ArrowDown', 'KeyS'].includes(event.code)) this.moveGroup(1);
    });
    this.showTab('events');
  }

  private showTab(tab: ExtraTab): void {
    this.tab = tab;
    this.tooltip.setVisible(false);
    this.content.removeAll(true);
    if (tab === 'events') this.renderEvents(); else this.renderPortraits();
  }

  private renderEvents(): void {
    const events = galleryEvents();
    events.forEach((event, index) => {
      const x = 190 + (index % 3) * 450;
      const y = 220 + Math.floor(index / 3) * 270;
      const unlocked = USER_SETTINGS.value.gallery.seenConversationIds.includes(event.conversationId);
      const root = this.add.container(x, y);
      const frame = new CrayonPatch(this, 0, 0, 380, 220, 0x242d39, 1); frame.setStrokeStyle(3, unlocked ? 0xd6b76a : 0x606977, 0.9);
      root.add(frame);
      const background = event.thumbnail;
      if (background && this.textures.exists(conversationBackgroundTextureKey(background))) {
        const image = this.add.image(0, -16, conversationBackgroundTextureKey(background)).setDisplaySize(356, 160);
        if (!unlocked) {
          image.setTint(0x5b5b5b).setAlpha(0.55);
          const fx = image.preFX as unknown as { addBlur?: (...args: number[]) => unknown };
          fx?.addBlur?.(0, 2, 2, 1, 0xffffff, 4);
        }
        root.addAt(image, 0);
      }
      root.add(this.add.text(0, 82, unlocked ? localize(event.title) : '？？？', this.style(18, unlocked ? '#f8fafc' : '#8a929e')).setOrigin(0.5));
      frame.setInteractive({ useHandCursor: true });
      frame.on('pointerover', (pointer: Phaser.Input.Pointer) => {
        if (!unlocked) this.showTooltip(localize(event.condition), pointer.worldX, pointer.worldY);
      });
      frame.on('pointermove', (pointer: Phaser.Input.Pointer) => { if (!unlocked) this.positionTooltip(pointer.worldX, pointer.worldY); });
      frame.on('pointerout', () => this.tooltip.setVisible(false));
      if (unlocked) onPrimaryClick(frame, () => this.scene.start('DefeatEventScene', { conversationId: event.conversationId, completion: 'title' }));
      KeyboardNavigation.for(this).register(frame);
      this.content.add(root);
    });
  }

  private buildPortraitGroups(): void {
    const groups = new Map<string, string[]>();
    const ids = characterPortraitFiles.map(file => file.replace(/\.png$/i, '')).filter(id => characterPortraitAssets[id]);
    for (const id of ids.sort()) {
      const category = id.split('_')[1] || 'normal';
      const ids = groups.get(category) ?? []; ids.push(id); groups.set(category, ids);
    }
    const order = (category: string) => category === 'prologue' ? 0 : category === 'normal' ? 1 : 2;
    this.portraitGroups = [...groups].sort(([a], [b]) => order(a) - order(b) || a.localeCompare(b))
      .map(([category, ids]) => ({ category, ids, index: 0 }));
  }

  private renderPortraits(): void {
    if (this.portraitGroups.length === 0) return;
    const first = Phaser.Math.Clamp(this.portraitGroupIndex, 0, Math.max(0, this.portraitGroups.length - 2));
    this.portraitGroups.slice(first, first + 2).forEach((group, row) => this.renderPortraitRow(group, first + row, 255 + row * 270));
    this.content.add(this.add.text(1180, 172, `${this.portraitGroupIndex + 1} / ${this.portraitGroups.length}`, this.style(14, '#91a4bd')).setOrigin(0.5));
    this.content.add(this.createButton(1180, 220, 90, 34, '▲ W', () => this.moveGroup(-1), this.portraitGroupIndex > 0));
    this.content.add(this.createButton(1180, 570, 90, 34, '▼ S', () => this.moveGroup(1), this.portraitGroupIndex < this.portraitGroups.length - 1));
  }

  private renderPortraitRow(group: { category: string; ids: string[]; index: number }, groupIndex: number, y: number): void {
    const focused = groupIndex === this.portraitGroupIndex;
    this.content.add(this.add.text(118, y - 92, this.categoryName(group.category), this.style(21, focused ? '#efd18c' : '#9eabbc')).setOrigin(0.5));
    const count = group.ids.length;
    for (const offset of [-2, 2, -1, 1, 0]) {
      if (!count) continue;
      const index = (group.index + offset + count) % count;
      const id = group.ids[index];
      const asset = characterPortraitAssets[id];
      const sprite = this.add.sprite(640 + offset * 150, y, asset.textureKey).setName('portrait-carousel').setInteractive({ useHandCursor: true });
      sprite.setData('portraitGroupIndex', groupIndex);
      const center = offset === 0;
      const scale = Math.min(1, (center ? 205 : 155) / Math.max(1, sprite.height));
      sprite.setScale(scale).setDepth(100 - Math.abs(offset)).setAlpha(center ? 1 : 0.55);
      const unlocked = USER_SETTINGS.value.gallery.seenPortraitIds.some(seen => portraitGalleryId(seen) === id);
      if (!unlocked) sprite.setTint(0x06070a).setAlpha(center ? 0.9 : 0.45);
      this.content.add(sprite);
    }
    const id = group.ids[group.index];
    const unlocked = USER_SETTINGS.value.gallery.seenPortraitIds.some(seen => portraitGalleryId(seen) === id);
    this.content.add(this.add.text(640, y + 94, unlocked ? id : '？？？', this.style(14, unlocked ? '#f8fafc' : '#8a929e')).setOrigin(0.5));
    this.content.add(this.add.text(640, y + 116, localize(portraitConditionHint(id)), { ...this.style(13, '#b9c7d8'), align: 'center', wordWrap: { width: 760, useAdvancedWrap: true } }).setOrigin(0.5));
    if (focused) {
      this.content.add(this.createButton(165, y, 58, 58, '◀', () => this.movePortrait(-1)));
      this.content.add(this.createButton(1115, y, 58, 58, '▶', () => this.movePortrait(1)));
    }
  }

  private movePortrait(delta: number): void {
    const group = this.portraitGroups[this.portraitGroupIndex]; if (!group?.ids.length) return;
    group.index = (group.index + delta + group.ids.length) % group.ids.length; this.showTab('portraits');
  }
  private moveGroup(delta: number): void {
    this.portraitGroupIndex = Phaser.Math.Clamp(this.portraitGroupIndex + delta, 0, Math.max(0, this.portraitGroups.length - 1));
    this.showTab('portraits');
  }
  private categoryName(category: string): string {
    if (category === 'prologue') return this.ui('Prologue', 'プロローグ');
    if (category === 'normal') return this.ui('Normal', '通常');
    return category;
  }

  private showTooltip(text: string, x: number, y: number): void { this.tooltipText.setText(text); this.tooltip.setVisible(true); this.positionTooltip(x, y); }
  private positionTooltip(x: number, y: number): void { this.tooltip.setPosition(Phaser.Math.Clamp(x + 18, 12, 900), Phaser.Math.Clamp(y + 18, 12, 620)); }
  private createButton(x: number, y: number, width: number, height: number, label: string, action: () => void, enabled = true): Phaser.GameObjects.Container {
    const root = this.add.container(x, y); const bg = new CrayonPatch(this, 0, 0, width, height, enabled ? CRAYON_COLORS.button : 0x373d47, 1);
    bg.setStrokeStyle(2, 0x9ba8ba, enabled ? 0.9 : 0.4); const text = this.add.text(0, 0, label, this.style(17, enabled ? '#f8fafc' : '#717985')).setOrigin(0.5);
    if (enabled) { bg.setInteractive({ useHandCursor: true }); onPrimaryClick(bg, action); KeyboardNavigation.for(this).register(bg); }
    root.add([bg, text]); return root;
  }
  private ui(en: string, ja: string): string { return SETTINGS_STATE.language === 'ja' ? ja : en; }
  private style(size: number, color: string): Phaser.Types.GameObjects.Text.TextStyle { return { fontFamily: GAME_FONT, fontSize: `${size}px`, fontStyle: 'bold', color }; }
}
