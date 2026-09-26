import type Phaser from 'phaser';
import { CONVERSATION_THEMES, type ConversationDesign } from '../data/conversationAppearance';
import type { ConversationPage } from '../data/conversations';
import { paintConversationPanel } from './conversationPaint';
import { CrayonPatch } from './crayon';
import { onPrimaryClick, markPointerActionHandled } from './pointerActions';
import { GAME_FONT } from './fonts';
import { SCREEN_WIDTH, SCREEN_HEIGHT, SCREEN_CENTER_X, SCREEN_CENTER_Y } from './layout';
import { setPunctuationAwareWordWrap } from './textLayout';

export interface ConversationLogEntry { name: string; text: string; speaker: ConversationPage['speaker']; }
/** Read-only history for this conversation. Never includes pages not yet reached. */
export class ConversationLog {
  readonly root: Phaser.GameObjects.Container;
  private content: Phaser.GameObjects.Container;
  private clip: Phaser.GameObjects.Graphics;
  private mask: Phaser.Display.Masks.GeometryMask;
  private thumb: Phaser.GameObjects.Rectangle;
  private offset = 0;
  private maxOffset = 0;
  private readonly viewport = { top: 115, height: 485 };
  private thumbHeight = this.viewport.height;
  constructor(scene: Phaser.Scene, entries: ConversationLogEntry[], title: string, onClose: () => void, design: ConversationDesign) {
    const theme = CONVERSATION_THEMES[design];
    const { top, height } = this.viewport;
    this.root = scene.add.container(0, 0).setDepth(6500);
    const shield = scene.add.rectangle(SCREEN_CENTER_X, SCREEN_CENTER_Y, SCREEN_WIDTH, SCREEN_HEIGHT, 0x000000, 0.65).setInteractive();
    const panel = scene.add.rectangle(SCREEN_CENTER_X, SCREEN_CENTER_Y, 1100, 610, 0, 0).setInteractive();
    const paint = scene.add.container(SCREEN_CENTER_X, SCREEN_CENTER_Y).setAlpha(.98);
    const decorations = scene.add.container(SCREEN_CENTER_X, SCREEN_CENTER_Y);
    paintConversationPanel(scene, design, 1100, 610, paint, decorations);
    const heading = scene.add.container(255, 57);
    const headingText = scene.add.text(0, 0, title, { fontFamily: GAME_FONT, fontSize: 24, fontStyle: 'bold', color: '#fff0e7', stroke: '#16202e', strokeThickness: 2 }).setOrigin(.5);
    const headingPaint = new CrayonPatch(scene, 0, 0, Math.max(248, headingText.width + 48), 42, design === 'paper' ? 0x805350 : 0x304360, 1, { animateChanges: false });
    heading.add([headingPaint, headingText]);
    const close = scene.add.container(1146, 98);
    const closePaint = new CrayonPatch(scene, 0, 0, 35, 30, 0x26364a, .92, { animateChanges: false });
    const cross = scene.add.graphics().lineStyle(1.5, 0xf6ece0).lineBetween(-5, -5, 5, 5).lineBetween(5, -5, -5, 5);
    const closeHit = scene.add.rectangle(0, 0, 38, 34, 0, 0).setInteractive({ useHandCursor: true });
    const closeLog = (pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      markPointerActionHandled(pointer);
      event?.stopPropagation(); onClose();
    };
    onPrimaryClick(shield, closeLog);
    onPrimaryClick(closeHit, closeLog);
    closeHit.on('pointerover', () => closePaint.setHoverColor(0x57697f));
    closeHit.on('pointerout', () => closePaint.setHoverColor());
    close.add([closePaint, cross, closeHit]);
    this.content = scene.add.container(135, top);
    this.clip = scene.add.graphics().fillStyle(0xffffff).fillRect(130, top, 960, height).setVisible(false);
    this.mask = this.clip.createGeometryMask(); this.content.setMask(this.mask);
    let y = 0;
    for (const entry of entries) {
      const color = theme.ink[entry.speaker];
      if (entry.name) {
        const name = scene.add.text(0, y, entry.name, { fontFamily: GAME_FONT, fontSize: '18px', color, stroke: theme.outline, strokeThickness: 1 });
        this.content.add(name); y += name.height + 6;
      }
      const body = scene.add.text(0, y, entry.text, { fontFamily: GAME_FONT, fontSize: '24px', color, stroke: theme.outline, strokeThickness: 1, lineSpacing: 6 });
      setPunctuationAwareWordWrap(body, 930); this.content.add(body); y += body.height + 26;
    }
    this.maxOffset = Math.max(0, y - height);
    this.thumbHeight = Math.max(32, height * height / Math.max(height, y));
    const track = scene.add.rectangle(1132, top + height / 2, 12, height, theme.accent, 0.25).setInteractive();
    this.thumb = scene.add.rectangle(1132, top, 12, this.thumbHeight, theme.progressColor).setOrigin(0.5, 0);
    const move = (pointer: Phaser.Input.Pointer) => {
      if (!pointer.leftButtonDown()) return;
      this.scrollTo((pointer.y - top - this.thumbHeight / 2) / Math.max(1, height - this.thumbHeight) * this.maxOffset);
    };
    track.on('pointerdown', move); track.on('pointermove', move);
    this.root.add([shield, panel, paint, decorations, heading, close, this.content, track, this.thumb]);
    this.scrollTo(this.maxOffset);
  }
  scroll(delta: number): void { this.scrollTo(this.offset + delta * 0.65); }
  private scrollTo(offset: number): void {
    this.offset = Math.max(0, Math.min(offset, this.maxOffset));
    this.content.setY(this.viewport.top - this.offset);
    this.thumb.setY(this.viewport.top + (this.maxOffset ? this.offset / this.maxOffset : 0) * (this.viewport.height - this.thumbHeight));
  }
  destroy(): void { this.content.clearMask(); this.mask.destroy(); this.clip.destroy(); this.root.destroy(true); }
}
