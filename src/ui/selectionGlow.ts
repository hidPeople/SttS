import Phaser from 'phaser';
import { SELECTION_GLOW } from '../data/ui';
import { CARD_FRAME } from '../data/cardAppearance';

/** A soft halo behind the card. Parent transforms/opacity apply to the halo too. */
export class CardSelectionGlow {
  private halo: Phaser.GameObjects.Graphics;
  private pulse?: Phaser.Tweens.Tween;
  private color?: number;

  constructor(private scene: Phaser.Scene, parent: Phaser.GameObjects.Container, private width: number, private height: number) {
    this.halo = scene.add.graphics().setVisible(false);
    parent.addAt(this.halo, 0);
    this.halo.once('destroy', () => this.stop());
  }

  set(selected: boolean, usable = true, dimmed = false): void {
    if (!selected) {
      this.stop();
      this.halo.setVisible(false);
      return;
    }
    const config = SELECTION_GLOW.card;
    const color = usable ? config.usableColor : config.unusableColor;
    // Geometry is rebuilt only when color changes, never for each animation frame.
    if (color !== this.color) {
      this.color = color;
      this.halo.clear();
      const spread = Math.max(1, config.spread);
      for (let offset = spread; offset >= 1; offset -= 1) {
        const alpha = 0.5 * Math.pow(1 - (offset - 1) / spread, 2);
        this.halo.lineStyle(2, color, alpha).strokeRoundedRect(
          -this.width / 2 - offset, -this.height / 2 - offset,
          this.width + offset * 2, this.height + offset * 2, offset + CARD_FRAME.cornerRadius,
        );
      }
    }
    const multiplier = dimmed ? config.dimmedMultiplier : 1;
    // Keep the current phase when usability changes during selection.
    this.halo.setData('glowMultiplier', multiplier);
    if (!this.pulse) {
      this.halo.setVisible(true);
      const phase = { alpha: config.maxAlpha };
      const update = () => this.halo.setAlpha(phase.alpha * this.halo.getData('glowMultiplier'));
      update();
      this.pulse = this.scene.tweens.add({
        targets: phase, alpha: config.minAlpha, duration: Math.max(1, config.pulseDuration / 2),
        ease: 'Sine.easeInOut', yoyo: true, repeat: -1, onUpdate: update,
      });
    }
  }

  private stop(): void {
    this.pulse?.remove();
    this.pulse = undefined;
  }
}

/** A transient alpha-contour glow; no hitbox, tint, layout or depth changes. */
export class EnemySelectionGlow {
  private clear?: () => void;

  constructor(private scene: Phaser.Scene) {
    scene.events.once('shutdown', () => this.stop());
  }

  stop(): void {
    this.clear?.();
    this.clear = undefined;
  }

  play(body: Phaser.GameObjects.Sprite | Phaser.GameObjects.Rectangle): void {
    this.stop();
    const config = SELECTION_GLOW.enemy;
    // PreFX runs the glow shader only around the sprite, not across the screen.
    // Its radius/quality are compiled once from SELECTION_GLOW in main.ts.
    const preFX = 'preFX' in body ? body.preFX : undefined;
    if (!body.active || !preFX || !('gl' in this.scene.sys.renderer) || config.strength <= 0) return;
    const padding = preFX.padding;
    preFX.setPadding(Math.max(padding, Math.ceil(config.spread) + 1));
    const fx = preFX.addGlow(config.color, 0, 0, false);
    let tween: Phaser.Tweens.Tween | undefined;
    const cleanup = () => {
      tween?.remove();
      tween = undefined;
      body.off('destroy', cleanup);
      if (preFX.gameObject) {
        preFX.remove(fx);
        preFX.setPadding(padding);
        // remove alone leaves PreFX enabled, still copying the sprite each frame.
        if (!preFX.list.length) preFX.disable();
      }
      if (this.clear === cleanup) this.clear = undefined;
    };
    this.clear = cleanup;
    body.once('destroy', cleanup);
    tween = this.scene.tweens.add({
      targets: fx, outerStrength: config.strength, duration: Math.max(1, config.riseDuration), ease: 'Sine.easeOut',
      onComplete: () => {
        tween = this.scene.tweens.add({
          targets: fx, outerStrength: 0, duration: Math.max(1, config.fadeDuration), ease: 'Sine.easeIn',
          onComplete: cleanup,
        });
      },
    });
  }
}
