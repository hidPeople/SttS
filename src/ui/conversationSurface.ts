import type Phaser from 'phaser';
import { CONVERSATION_APPEARANCE, CONVERSATION_THEMES, type ConversationDesign } from '../data/conversationAppearance';
import { localize, text as l } from '../models/localization';
import type { NovelPlaybackMode } from '../models/novelPlayback';
import type { ConversationPage } from '../data/conversations';
import { CrayonPatch } from './crayon';
import { paintConversationPanel } from './conversationPaint';
import { GAME_FONT } from './fonts';
import { onPrimaryClick, markPointerActionHandled } from './pointerActions';
import { setPunctuationAwareWordWrap } from './textLayout';

// Session preferences survive page/conversation changes; source defaults remain editable.
let preferences: { design: ConversationDesign; opacity: number } | undefined;
const designs: ConversationDesign[] = ['graphite', 'paper', 'night'];
const OPACITY_SLIDER = { left: 300, width: 148, hitPadding: 16, hitHeight: 40 };
const CONTROLS_HIDE_TRANSPARENCY = 0.5;
type Host = { enabled: () => boolean; mode: (mode: NovelPlaybackMode) => void; hide: () => void; log: () => void };

/** Three selectable window designs sharing exactly the same text and input layout. */
export class ConversationSurface {
  readonly root: Phaser.GameObjects.Container;
  readonly body: Phaser.GameObjects.Text;
  private name: Phaser.GameObjects.Text;
  private namePlate: Phaser.GameObjects.Container;
  private paint: Phaser.GameObjects.Container;
  private decorations: Phaser.GameObjects.Container;
  private toolbar: Phaser.GameObjects.Container;
  private closeButton: Phaser.GameObjects.Container;
  private pageNumber: Phaser.GameObjects.Text;
  private designLabel: Phaser.GameObjects.Text;
  private progress: Phaser.GameObjects.Rectangle;
  private sliderKnob: Phaser.GameObjects.Arc;
  private sliderValue: Phaser.GameObjects.Text;
  private sliderLabel: Phaser.GameObjects.Text;
  private hoveredButton?: string;
  private buttons = new Map<string, { paint: CrayonPatch; label: Phaser.GameObjects.Text }>();
  private speaker: ConversationPage['speaker'] = 'narration';
  private dragging = false;
  private mode: NovelPlaybackMode = 'off';
  private prefs = preferences ??= { design: CONVERSATION_APPEARANCE.design, opacity: CONVERSATION_APPEARANCE.backgroundOpacity };

  constructor(private scene: Phaser.Scene, private battle: boolean, private host: Host) {
    this.root = scene.add.container(640, 596);
    const hit = scene.add.rectangle(0, 0, 1100, 192, 0, 0).setInteractive();
    this.paint = scene.add.container(0, 0);
    this.decorations = scene.add.container(0, 0);
    this.namePlate = scene.add.container(-385, -94);
    this.name = scene.add.text(0, 0, '', { fontFamily: GAME_FONT, fontSize: 19, fontStyle: 'bold' }).setOrigin(0.5);
    this.namePlate.add(this.name);
    this.body = scene.add.text(-502, -57, '', { fontFamily: GAME_FONT, fontSize: 26, lineSpacing: 7, strokeThickness: 2, padding: { x: 3, y: 3 } });
    setPunctuationAwareWordWrap(this.body, 988);
    this.toolbar = scene.add.container(0, 77);
    const tray = new CrayonPatch(scene, 5, 0, 1070, 33, 0x111a28, 0.87, { animateChanges: false });
    this.toolbar.add(tray);
    this.pageNumber = scene.add.text(-502, 0, '', { fontFamily: GAME_FONT, fontSize: 14, color: '#d9dfec' }).setOrigin(0, .5);
    this.designLabel = scene.add.text(-388, 0, localize(l('DESIGN', 'デザイン')), { fontFamily: GAME_FONT, fontSize: 13, color: '#edf0f5' }).setOrigin(0, .5).setVisible(CONVERSATION_APPEARANCE.showDesignSelector);
    this.toolbar.add([this.pageNumber, this.designLabel]);
    if (CONVERSATION_APPEARANCE.showDesignSelector) {
      designs.forEach((design, i) => this.button(-269 + (i - 1) * 40, 0, 36, String.fromCharCode(65 + i), design, () => {
        this.prefs.design = design; this.redraw();
      }));
    }
    this.button(-144, 0, 80, localize(l('LOG', 'ログ')), 'log', host.log);
    if (!battle) {
      this.button(-33, 0, 98, localize(l('AUTO', 'オート')), 'auto', () => host.mode('auto'), 1);
      this.button(92, 0, 114, localize(l('SKIP', 'スキップ')), 'skip', () => host.mode('skip'), 2);
    }
    this.sliderLabel = scene.add.text(274, 0, localize(l('TRANSPARENCY', '透過度')), { fontFamily: GAME_FONT, fontSize: 13, color: '#edf0f5' }).setOrigin(1, .5);
    const { left, width, hitPadding, hitHeight } = OPACITY_SLIDER;
    const track = scene.add.rectangle(left + width / 2, 0, width + hitPadding * 2, hitHeight, 0, 0).setInteractive({ useHandCursor: true });
    const rail = scene.add.rectangle(left + width / 2, 0, width, 2, 0xa8b6cb, .85);
    const start = scene.add.circle(left, 0, 3, 0xa8b6cb), end = scene.add.circle(left + width, 0, 3, 0xa8b6cb);
    this.sliderKnob = scene.add.circle(left, 0, 6, 0xf3dfb7).setStrokeStyle(2, 0x192434);
    this.sliderValue = scene.add.text(486, 0, '', { fontFamily: GAME_FONT, fontSize: 14, color: '#f3dfb7' }).setOrigin(.5);
    track.on('pointerdown', (pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      if (pointer.button !== 0 || !host.enabled()) return;
      event.stopPropagation(); this.dragging = true; this.slide(pointer);
    });
    track.on('pointerup', (pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      if (pointer.button === 0) event.stopPropagation();
      this.dragging = false;
    });
    this.toolbar.add([this.sliderLabel, rail, start, end, this.sliderKnob, this.sliderValue, track]);
    this.progress = scene.add.rectangle(-502, 55, 1004, 2, 0xe3bc8a).setOrigin(0, .5).setScale(0, 1);
    this.closeButton = scene.add.container(514, -73);
    const closePaint = new CrayonPatch(scene, 0, 0, 35, 30, 0x26364a, .92, { animateChanges: false });
    const cross = scene.add.graphics().lineStyle(1.5, 0xf6ece0).lineBetween(-5, -5, 5, 5).lineBetween(5, -5, -5, 5);
    const closeHit = scene.add.rectangle(0, 0, 38, 34, 0, 0).setInteractive({ useHandCursor: true });
    onPrimaryClick(closeHit, (_p, _x, _y, event: Phaser.Types.Input.EventData) => { event?.stopPropagation(); if (this.dragging) { this.dragging = false; return; } if (host.enabled()) host.hide(); });
    closeHit.on('pointerover', () => closePaint.setHoverColor(0x57697f));
    closeHit.on('pointerout', () => closePaint.setHoverColor());
    this.closeButton.add([closePaint, cross, closeHit]);
    this.root.add([hit, this.paint, this.decorations, this.namePlate, this.body, this.progress, this.toolbar, this.closeButton]);
    scene.input.on('pointermove', this.pointerMove, this);
    scene.input.on('pointerup', this.pointerUp, this);
    scene.input.on('pointerupoutside', this.pointerUp, this);
    this.root.once('destroy', () => {
      scene.input.off('pointermove', this.pointerMove, this);
      scene.input.off('pointerup', this.pointerUp, this);
      scene.input.off('pointerupoutside', this.pointerUp, this);
    });
    this.redraw();
  }

  get design(): ConversationDesign { return this.prefs.design; }

  private button(x: number, y: number, width: number, text: string, id: string, action: () => void, triangles = 0): void {
    const paint = new CrayonPatch(this.scene, x, y, width, 28, 0x344459, .9, { animateChanges: false });
    const label = this.scene.add.text(x + (triangles ? 9 : 0), y, text, { fontFamily: GAME_FONT, fontSize: 14, color: '#f4eee4' }).setOrigin(.5);
    const icon = this.scene.add.graphics().fillStyle(0xf4eee4);
    for (let i = 0; i < triangles; i++) { const left = x - width / 2 + 10 + i * 7; icon.fillTriangle(left, y - 5, left, y + 5, left + 6, y); }
    const hit = this.scene.add.rectangle(x, y, width, 32, 0, 0).setInteractive({ useHandCursor: true });
    onPrimaryClick(hit, (_p, _x, _y, event: Phaser.Types.Input.EventData) => { event?.stopPropagation(); if (this.dragging) { this.dragging = false; return; } if (this.host.enabled()) action(); });
    hit.on('pointerover', () => { this.hoveredButton = id; this.updateButtons(); });
    hit.on('pointerout', () => { this.hoveredButton = undefined; this.updateButtons(); });
    this.buttons.set(id, { paint, label }); this.toolbar.add([paint, label, icon, hit]);
  }

  private redraw(): void {
    this.paint.removeAll(true); this.decorations.removeAll(true);
    const { design } = this.prefs, theme = CONVERSATION_THEMES[design];
    const patch = (x: number, y: number, w: number, h: number, color: number, alpha = 1) => new CrayonPatch(this.scene, x, y, w, h, color, alpha, { animateChanges: false });
    paintConversationPanel(this.scene, design, 1100, 192, this.paint, this.decorations);
    const old = this.namePlate.list.filter(child => child !== this.name);
    old.forEach(child => this.namePlate.remove(child, true));
    this.namePlate.addAt(patch(0, 0, 208, 34, design === 'paper' ? 0x805350 : 0x304360), 0);
    this.name.setColor('#fff0e7').setStroke('#16202e', 2);
    this.body.setColor(theme.ink[this.speaker]).setStroke(theme.outline, 2);
    this.progress.setFillStyle(theme.progressColor);
    this.syncOpacity(); this.updateButtons();
  }

  private syncOpacity(): void {
    this.prefs.opacity = Math.max(0, Math.min(1, this.prefs.opacity));
    this.paint.setAlpha(this.prefs.opacity); this.decorations.setAlpha(this.prefs.opacity);
    // Keep the speaker readable even against a completely transparent panel.
    for (const child of this.namePlate.list) if (child !== this.name && 'setAlpha' in child) (child as CrayonPatch).setAlpha(this.prefs.opacity);
    const transparency = 1 - this.prefs.opacity;
    this.sliderKnob.x = OPACITY_SLIDER.left + transparency * OPACITY_SLIDER.width;
    this.sliderValue.setText(Math.round(transparency * 100) + '%');
  }
  private slide(pointer: Phaser.Input.Pointer): void {
    const point = this.root.getLocalPoint(pointer.x, pointer.y);
    this.prefs.opacity = 1 - Math.max(0, Math.min(1, (point.x - OPACITY_SLIDER.left) / OPACITY_SLIDER.width));
    this.syncOpacity();
  }
  private pointerMove(pointer: Phaser.Input.Pointer): void { if (this.dragging && this.host.enabled()) this.slide(pointer); }
  private pointerUp(pointer: Phaser.Input.Pointer): void { if (this.dragging) markPointerActionHandled(pointer); this.dragging = false; }

  setPage(text: string, name: string, speaker: ConversationPage['speaker'], index: number, count: number): void {
    this.speaker = speaker;
    this.buttons.get('log')?.label.setText(localize(l('LOG', 'ログ')));
    this.buttons.get('auto')?.label.setText(localize(l('AUTO', 'オート')));
    this.buttons.get('skip')?.label.setText(localize(l('SKIP', 'スキップ')));
    this.sliderLabel.setText(localize(l('TRANSPARENCY', '透過度')));
    this.designLabel.setText(localize(l('DESIGN', 'デザイン')));
    const theme = CONVERSATION_THEMES[this.prefs.design];
    this.body.setText(text).setColor(theme.ink[speaker]).setFontSize(26);
    while (this.body.height > 110 && parseInt(String(this.body.style.fontSize)) > 12) this.body.setFontSize(parseInt(String(this.body.style.fontSize)) - 1);
    this.name.setText(name); this.namePlate.setVisible(speaker !== 'narration');
    this.pageNumber.setText(String(index + 1).padStart(2, '0') + ' / ' + String(count).padStart(2, '0') + ' Page');
  }
  setPlayback(mode: NovelPlaybackMode, progress: number): void {
    if (this.mode !== mode) { this.mode = mode; this.updateButtons(); }
    this.progress.setVisible(mode === 'auto').setScale(progress, 1);
  }
  private updateButtons(): void {
    for (const [id, button] of this.buttons) if (button.paint.active) button.paint.setHoverColor(
      id === this.hoveredButton ? 0x627086 : id === this.mode || id === this.prefs.design ? 0x7a665b : undefined);
  }
  update(): void {
    const pointer = this.scene.input.activePointer;
    const point = this.root.getLocalPoint(pointer.x, pointer.y);
    const nearToolbar = point.x >= -555 && point.x <= 555 && point.y >= 40 && point.y <= 118;
    const nearClose = point.x >= 475 && point.x <= 560 && point.y >= -115 && point.y <= -35;
    const reveal = this.prefs.opacity > 1 - CONTROLS_HIDE_TRANSPARENCY || this.dragging;
    this.toolbar.setVisible(reveal || nearToolbar);
    this.closeButton.setVisible(reveal || nearClose);
  }
}
