import type Phaser from 'phaser';
import { CARD_INSPECTION } from '../data/ui';
import { SCREEN_WIDTH, SCREEN_HEIGHT, SCREEN_CENTER_X, SCREEN_CENTER_Y } from './layout';
import { markPointerActionHandled } from './pointerActions';

// Small separable Gaussian kernel: soften both the sides and ends of the arc,
// without a screen-sized blur shader or per-frame texture uploads.
const SHADOW_KERNEL = [1, 4, 6, 4, 1] as const;
const SHADOW_KERNEL_TOTAL = 256;

/** One gesture/overlay per scene. Wall-clock holds are independent of Ctrl speed. */
export class CardInspection {
  root?: Phaser.GameObjects.Container;
  private progress: Phaser.GameObjects.Graphics;
  private press?: {
    object: Phaser.GameObjects.GameObject;
    pointer: Phaser.Input.Pointer;
    started: number;
    enabled: () => boolean;
    preview: () => Phaser.GameObjects.Container;
  };
  private openingRelease?: Phaser.Input.Pointer;
  private waitingForRelease = false;

  get active(): boolean { return Boolean(this.root); }

  constructor(private scene: Phaser.Scene, private clearTips: () => void, private onClosed: () => void = () => {}) {
    this.progress = scene.add.graphics().setDepth(9800).setVisible(false);
    scene.events.on('postupdate', this.update);
    scene.input.on('pointerup', this.cancelPress);
    scene.input.on('gameout', this.leaveGame);
    window.addEventListener('keydown', this.keyDown, true);
    window.addEventListener('blur', this.leaveGame);
    scene.events.once('shutdown', this.dispose);
  }

  bind(object: Phaser.GameObjects.GameObject, enabled: () => boolean,
    use: () => void, preview: () => Phaser.GameObjects.Container): void {
    object.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.cancelPress();
      if (pointer.button !== 0 || this.active || !enabled()) return;
      this.press = { object, pointer, started: performance.now(), enabled, preview };
    });
    object.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (pointer.button !== 0 || this.active) return;
      // Keyboard navigation deliberately emits a primary release without a DOM event.
      if (!pointer.event) { if (enabled()) use(); return; }
      const press = this.press;
      this.cancelPress();
      if (!press || press.object !== object || press.pointer !== pointer || !enabled()) return;
      const elapsed = performance.now() - press.started;
      if (elapsed < CARD_INSPECTION.progressStartMs) use();
      else if (elapsed >= CARD_INSPECTION.openMs) this.open(preview);
    });
    object.on('pointerout', () => { if (this.press?.object === object) this.cancelPress(); });
    object.once('destroy', () => { if (this.press?.object === object) this.cancelPress(); });
  }

  private cancelPress = (): void => {
    this.press = undefined;
    this.progress.clear().setVisible(false);
  };

  private update = (): void => {
    const press = this.press;
    if (!press) return;
    if (!press.object.active || !press.enabled() || !press.pointer.leftButtonDown()) {
      this.cancelPress(); return;
    }
    const elapsed = performance.now() - press.started;
    if (elapsed >= CARD_INSPECTION.openMs) {
      this.openingRelease = press.pointer;
      this.open(press.preview);
      return;
    }
    if (elapsed < CARD_INSPECTION.progressStartMs) return;
    const ratio = Math.min(1, elapsed / Math.max(1, CARD_INSPECTION.openMs));
    this.progress.clear().setVisible(true).setPosition(press.pointer.x, press.pointer.y);
    const shadow = CARD_INSPECTION.progressShadow;
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + ratio * Math.PI * 2;
    const drawShadow = (x: number, y: number, alpha: number) => {
      this.progress.lineStyle(CARD_INSPECTION.progressWidth + shadow.spread * 2, shadow.color, alpha);
      this.progress.beginPath().arc(x, y, CARD_INSPECTION.progressRadius, startAngle, endAngle).strokePath();
    };
    if (shadow.alpha > 0) {
      if (shadow.blur > 0) {
        SHADOW_KERNEL.forEach((wy, iy) => SHADOW_KERNEL.forEach((wx, ix) => {
          // Preserve the configured total opacity where the samples overlap.
          const alpha = 1 - Math.pow(1 - Math.min(1, shadow.alpha), wx * wy / SHADOW_KERNEL_TOTAL);
          drawShadow(shadow.offsetX + (ix - 2) * shadow.blur / 2,
            shadow.offsetY + (iy - 2) * shadow.blur / 2, alpha);
        }));
      } else drawShadow(shadow.offsetX, shadow.offsetY, shadow.alpha);
    }
    this.progress.lineStyle(CARD_INSPECTION.progressWidth, CARD_INSPECTION.progressColor, CARD_INSPECTION.progressAlpha);
    this.progress.beginPath().arc(0, 0, CARD_INSPECTION.progressRadius, startAngle, endAngle).strokePath();
  };

  private open(preview: () => Phaser.GameObjects.Container): void {
    this.cancelPress();
    this.clearTips();
    const root = this.scene.add.container(0, 0).setDepth(9500);
    this.root = root;
    const shade = this.scene.add.rectangle(SCREEN_CENTER_X, SCREEN_CENTER_Y,
      SCREEN_WIDTH, SCREEN_HEIGHT, 0x080d16, CARD_INSPECTION.shadeAlpha).setInteractive();
    const card = preview().setPosition(SCREEN_CENTER_X, SCREEN_CENTER_Y).setScale(CARD_INSPECTION.detailScale);
    root.add([shade, card]);
    shade.on('pointerup', (pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      markPointerActionHandled(pointer);
      if (this.openingRelease === pointer && pointer.button === 0) {
        this.openingRelease = undefined;
        return;
      }
      this.close();
    });
  }

  private keyDown = (event: KeyboardEvent): void => {
    this.cancelPress();
    if (!this.active) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (!event.repeat) this.close();
  };

  close(): void {
    if (this.waitingForRelease) return;
    // Keep the transparent input shield until the opening press is released;
    // closing with a key while still holding must not click the UI underneath.
    if (this.openingRelease?.leftButtonDown() && this.root) {
      this.waitingForRelease = true;
      const root = this.root;
      const shade = root.first as Phaser.GameObjects.Rectangle;
      // Keep the hit target visible (alpha=0 containers are not input candidates).
      shade.setFillStyle(0x000000, 0);
      root.list.slice(1).forEach(child => (child as Phaser.GameObjects.Container).setVisible(false));
      shade.removeAllListeners('pointerup');
      shade.on('pointerup', (pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
        event.stopPropagation(); markPointerActionHandled(pointer);
        if (pointer.button === 0) this.destroyOverlay();
      });
    } else {
      this.destroyOverlay();
    }
    this.openingRelease = undefined;
    this.clearTips();
  }

  private destroyOverlay(notify = true): void {
    const wasOpen = Boolean(this.root);
    this.root?.destroy(); this.root = undefined;
    this.openingRelease = undefined;
    this.waitingForRelease = false;
    if (wasOpen && notify) this.onClosed();
  }

  private leaveGame = (): void => {
    this.cancelPress();
    if (this.waitingForRelease) this.destroyOverlay();
    this.openingRelease = undefined;
  };

  private dispose = (): void => {
    this.scene.events.off('postupdate', this.update);
    this.scene.input.off('pointerup', this.cancelPress);
    this.scene.input.off('gameout', this.leaveGame);
    window.removeEventListener('keydown', this.keyDown, true);
    window.removeEventListener('blur', this.leaveGame);
    this.destroyOverlay(false);
    this.progress.destroy();
  };
}
