import type Phaser from 'phaser';
import { PLAYER_PORTRAIT_FLASH } from '../data/ui';

/** Independent of movement tweens: cancellation always restores the original tint. */
export class PortraitFlash {
  private cancelCurrent?: () => void;

  constructor(private scene: Phaser.Scene, private body: Phaser.GameObjects.Sprite) {
    scene.events.once('shutdown', () => this.cancel());
  }

  cancel(): void {
    this.cancelCurrent?.();
  }

  damage(): Promise<void> {
    return this.pulse(PLAYER_PORTRAIT_FLASH.damageColor, PLAYER_PORTRAIT_FLASH.damageFlashCount, PLAYER_PORTRAIT_FLASH.damageCycleDuration);
  }

  peak(count: number, cycleDuration: number): Promise<void> {
    return this.pulse(PLAYER_PORTRAIT_FLASH.peakColor, count, cycleDuration);
  }

  private pulse(color: number, count: number, cycleDuration: number): Promise<void> {
    this.cancel();
    const body = this.body;
    const original = [body.tintTopLeft, body.tintTopRight, body.tintBottomLeft, body.tintBottomRight] as const;
    const fill = body.tintFill;
    const restore = () => { body.setTint(...original); body.tintFill = fill; };
    const duration = Math.max(1, cycleDuration);
    // Always leave an uncolored interval, including during accelerated consecutive Peaks.
    const coloredDuration = Math.min(duration * Math.min(0.9, Math.max(0.05, PLAYER_PORTRAIT_FLASH.tintRatio)), Math.max(0, PLAYER_PORTRAIT_FLASH.maxTintDuration));
    const phase = { elapsed: 0 };
    const paint = () => phase.elapsed < coloredDuration ? body.setTint(color) : restore();
    return new Promise(resolve => {
      let settled = false;
      const settle = () => {
        if (settled) return;
        settled = true;
        restore();
        this.cancelCurrent = undefined;
        resolve();
      };
      paint();
      const tween = this.scene.tweens.add({
        targets: phase, elapsed: duration, duration,
        repeat: Math.max(0, Math.floor(count) - 1),
        onUpdate: paint,
        onRepeat: () => { phase.elapsed = 0; paint(); },
        onComplete: settle,
        onStop: settle,
      });
      this.cancelCurrent = () => { tween.stop(); settle(); };
    });
  }
}
