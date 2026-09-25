import type Phaser from 'phaser';
import { PLAYER_DEFINITION } from '../data/player';
import { PORTRAIT_FACTORS } from '../data/portraitFactors';
import { PortraitSelection } from '../models/portraitSelection';
import { characterPortraitAssets } from '../models/portraitAssets';
import { PLAYER_PORTRAIT_RENDERING } from '../data/ui';

const smoothingEffects = new WeakMap<Phaser.GameObjects.Sprite, Phaser.FX.Blur>();

/** A single subpixel pass softens resampled edges, including alpha, without stacking on pose changes. */
function smoothPortrait(sprite: Phaser.GameObjects.Sprite): void {
  const renderer = sprite.scene.sys.renderer;
  if (!renderer || !('gl' in renderer) || !sprite.preFX) return;
  const radius = Math.max(0, PLAYER_PORTRAIT_RENDERING.smoothingPixels);
  let effect = smoothingEffects.get(sprite);
  if (!effect && radius > 0) {
    effect = sprite.preFX.addBlur(0, radius, radius, 1, 0xffffff, 1);
    smoothingEffects.set(sprite, effect);
  }
  if (effect) {
    effect.x = radius; effect.y = radius;
    effect.setActive(radius > 0);
    sprite.preFX.setPadding(Math.max(sprite.preFX.padding, Math.ceil(radius * 2)));
  }
}

/** Reusable for later pose changes: image dimensions and offsets are reapplied on every switch. */
export function applyPlayerPortrait(sprite: Phaser.GameObjects.Sprite, spriteId: string, x = 0, y = 0): Phaser.GameObjects.Sprite {
  const visual = characterPortraitAssets[spriteId];
  if (!visual) throw new Error(`Unknown character portrait: ${spriteId}`);
  sprite.setTexture(visual.textureKey);
  smoothPortrait(sprite);
  const width = visual.displayHeight * sprite.frame.realWidth / sprite.frame.realHeight;
  return sprite.setOrigin(0.5, 0).setDisplaySize(width, visual.displayHeight)
    .setPosition(x + (visual.offsetX ?? 0), y + (visual.offsetY ?? 0));
}

/** Fade the new foreground image in first, then fade the old image out in the same parent. */
export class PortraitTransition {
  private outgoing: Phaser.GameObjects.Sprite[] = [];
  private tween?: Phaser.Tweens.Tween;

  constructor(private body: Phaser.GameObjects.Sprite) {
    body.once('destroy', this.dispose, this);
    body.scene.events.once('shutdown', this.dispose, this);
  }

  show(id?: string): void {
    const body = this.body;
    this.tween?.remove();
    this.tween = undefined;
    const duration = Math.max(0, PLAYER_PORTRAIT_RENDERING.transitionDuration);
    if (duration > 0 && body.visible && body.alpha > 0 && body.parentContainer) {
      const copy = body.scene.add.sprite(body.x, body.y, body.texture.key, body.frame.name)
        .setOrigin(body.originX, body.originY).setScale(body.scaleX, body.scaleY)
        .setRotation(body.rotation).setFlip(body.flipX, body.flipY).setAlpha(body.alpha);
      copy.cameraFilter = body.cameraFilter;
      smoothPortrait(copy);
      // Below the live image: it must never block the portrait's hover hit test.
      body.parentContainer.addAt(copy, body.parentContainer.getIndex(body));
      this.outgoing.push(copy);
    }
    if (id) applyPlayerPortrait(body, id);
    body.setVisible(Boolean(id)).setAlpha(duration > 0 ? 0 : 1);
    if (duration <= 0) { this.clearOutgoing(); return; }
    const initial = this.outgoing.map(sprite => ({ sprite, alpha: sprite.alpha }));
    const phase = { progress: 0 };
    const paint = () => {
      if (!body.active) return;
      // Keep the old image intact until the foreground image is fully opaque.
      body.setAlpha(Math.min(1, phase.progress * 2));
      const fadeOut = id ? Math.max(0, phase.progress * 2 - 1) : phase.progress;
      for (const { sprite, alpha } of initial) {
        if (!sprite.active) continue;
        sprite.setAlpha(alpha * (1 - fadeOut));
        sprite.setTint(body.tintTopLeft, body.tintTopRight, body.tintBottomLeft, body.tintBottomRight);
        sprite.tintFill = body.tintFill;
      }
    };
    paint();
    this.tween = body.scene.tweens.add({
      targets: phase, progress: 1, duration, ease: 'Linear', onUpdate: paint,
      onComplete: () => { body.setAlpha(1); this.clearOutgoing(); this.tween = undefined; },
    });
  }

  private clearOutgoing(): void {
    this.outgoing.splice(0).forEach(sprite => { if (sprite.active) sprite.destroy(); });
  }

  private dispose(): void {
    this.tween?.remove();
    this.tween = undefined;
    this.clearOutgoing();
    this.body.scene?.events.off('shutdown', this.dispose, this);
    this.body.off('destroy', this.dispose, this);
  }
}

/** Battle, rewards and events share the same portrait and local placement. */
export function addPlayerPortrait(scene: Phaser.Scene, x = 0, y = 0, portraitId?: string): Phaser.GameObjects.Sprite {
  const id = portraitId ?? new PortraitSelection(Object.keys(characterPortraitAssets), PORTRAIT_FACTORS).select({
    playerId: PLAYER_DEFINITION.id, category: 'normal', statuses: new Set(), relics: new Set(), hpRatio: 1, epRatio: 0,
  });
  const sprite = scene.add.sprite(x, y, id ? characterPortraitAssets[id].textureKey : '__DEFAULT').setName('player-portrait');
  return id ? applyPlayerPortrait(sprite, id, x, y) : sprite.setVisible(false);
}

/** Temporarily suppress an existing portrait while dialogue owns the portrait layer. */
export function hidePlayerPortrait(source?: Phaser.GameObjects.Container): () => void {
  const visible = source?.visible;
  source?.setVisible(false);
  return () => { if (source?.active) source.setVisible(visible!); };
}

/** Move the actual portrait into the foreground scene, retaining all animation/pose state. */
export function bringPlayerPortraitForward(scene: Phaser.Scene, source: Phaser.GameObjects.Container): Phaser.GameObjects.Container {
  const owner = source.scene, oldList = source.displayList, oldDepth = source.depth, oldIgnoreDestroy = source.ignoreDestroy;
  source.removeFromDisplayList();
  scene.sys.displayList.add(source);
  // Reward DisplayList shutdown must not destroy a portrait owned by BattleScene.
  source.ignoreDestroy = true;
  let released = false;
  const release = (restore: boolean) => {
    if (released) return;
    released = true;
    scene.events.off('shutdown', restoreToBattle);
    owner.events.off('shutdown', destroyWithBattle);
    source.ignoreDestroy = oldIgnoreDestroy;
    source.removeFromDisplayList();
    if (restore && source.active && oldList) { source.setDepth(oldDepth); oldList.add(source); }
    else source.destroy();
  };
  const restoreToBattle = () => release(true);
  const destroyWithBattle = () => release(false);
  scene.events.once('shutdown', restoreToBattle);
  owner.events.once('shutdown', destroyWithBattle);
  return source;
}
