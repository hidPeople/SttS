import type Phaser from 'phaser';
import { GAME_FONT } from './fonts';
import { SCREEN_WIDTH, SCREEN_HEIGHT, SCREEN_CENTER_X, SCREEN_CENTER_Y } from './layout';
import { setPunctuationAwareWordWrap } from './textLayout';

export interface ConversationLogEntry { name: string; text: string; color: string; }
/** Read-only history for this conversation. Never includes pages not yet reached. */
export class ConversationLog {
  readonly root: Phaser.GameObjects.Container;
  private content: Phaser.GameObjects.Container;
  private clip: Phaser.GameObjects.Graphics;
  private mask: Phaser.Display.Masks.GeometryMask;
  private thumb: Phaser.GameObjects.Rectangle;
  private offset = 0;
  private maxOffset = 0;
  private thumbHeight = 420;
  constructor(scene: Phaser.Scene, entries: ConversationLogEntry[], title: string, onClose: () => void) {
    this.root = scene.add.container(0, 0).setDepth(6500);
    const shield = scene.add.rectangle(SCREEN_CENTER_X, SCREEN_CENTER_Y, SCREEN_WIDTH, SCREEN_HEIGHT, 0x000000, 0.65).setInteractive();
    const panel = scene.add.rectangle(SCREEN_CENTER_X, SCREEN_CENTER_Y, 1100, 610, 0x101419, 0.98).setStrokeStyle(2, 0xaeb8c8).setInteractive();
    const heading = scene.add.text(130, 78, title, { fontFamily: GAME_FONT, fontSize: '28px', color: '#ffffff' });
    const close = scene.add.text(1130, 78, '×', { fontFamily: GAME_FONT, fontSize: '36px', color: '#ffffff', padding: { x: 10, y: 2 } }).setInteractive({ useHandCursor: true });
    close.on('pointerup', (pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      if (pointer.button !== 0) return;
      event.stopPropagation(); onClose();
    });
    this.content = scene.add.container(135, 145);
    this.clip = scene.add.graphics().fillStyle(0xffffff).fillRect(130, 145, 960, 455).setVisible(false);
    this.mask = this.clip.createGeometryMask(); this.content.setMask(this.mask);
    let y = 0;
    for (const entry of entries) {
      if (entry.name) {
        const name = scene.add.text(0, y, entry.name, { fontFamily: GAME_FONT, fontSize: '18px', color: entry.color });
        this.content.add(name); y += name.height + 6;
      }
      const body = scene.add.text(0, y, entry.text, { fontFamily: GAME_FONT, fontSize: '24px', color: entry.color, lineSpacing: 6 });
      setPunctuationAwareWordWrap(body, 930); this.content.add(body); y += body.height + 26;
    }
    this.maxOffset = Math.max(0, y - 455);
    this.thumbHeight = Math.max(32, 455 * 455 / Math.max(455, y));
    const track = scene.add.rectangle(1132, 372.5, 12, 455, 0x667080, 0.5).setInteractive();
    this.thumb = scene.add.rectangle(1132, 145, 12, this.thumbHeight, 0xd2d9e4).setOrigin(0.5, 0);
    const move = (pointer: Phaser.Input.Pointer) => {
      if (!pointer.leftButtonDown()) return;
      this.scrollTo((pointer.y - 145 - this.thumbHeight / 2) / Math.max(1, 455 - this.thumbHeight) * this.maxOffset);
    };
    track.on('pointerdown', move); track.on('pointermove', move);
    this.root.add([shield, panel, heading, close, this.content, track, this.thumb]);
    this.scrollTo(this.maxOffset);
  }
  scroll(delta: number): void { this.scrollTo(this.offset + delta * 0.65); }
  private scrollTo(offset: number): void {
    this.offset = Math.max(0, Math.min(offset, this.maxOffset));
    this.content.setY(145 - this.offset);
    this.thumb.setY(145 + (this.maxOffset ? this.offset / this.maxOffset : 0) * (455 - this.thumbHeight));
  }
  destroy(): void { this.content.clearMask(); this.mask.destroy(); this.clip.destroy(); this.root.destroy(true); }
}
