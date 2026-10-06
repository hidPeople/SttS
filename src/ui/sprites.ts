import type Phaser from 'phaser';
import { EFFECT_SPRITES } from '../data/sprites';
import type { CharacterPortraitDefinition, SpriteDefinition, SpriteEffectDefinition } from '../models/types';

/** All owners use the same loading/animation pipeline, including future UI. */
export function preloadSprites(scene: Phaser.Scene, definitions: readonly (SpriteDefinition | CharacterPortraitDefinition)[]): void {
  const queued = new Set<string>();
  for (const visual of definitions) {
    if (queued.has(visual.textureKey)) continue;
    queued.add(visual.textureKey);
    if (!scene.textures.exists(visual.textureKey)) {
      if (!('frameWidth' in visual)) {
        scene.load.image(visual.textureKey, visual.source);
        continue;
      }
      scene.load.spritesheet(visual.textureKey, visual.source, {
        frameWidth: visual.frameWidth,
        frameHeight: visual.frameHeight,
        endFrame: visual.frameCount - 1,
      });
    }
  }
}

export function createSpriteAnimations(scene: Phaser.Scene, definitions: readonly (SpriteDefinition | CharacterPortraitDefinition)[]): void {
  for (const visual of definitions) {
    if (!('animationKey' in visual) || !scene.textures.exists(visual.textureKey)) continue;
    if (scene.anims.exists(visual.animationKey)) continue;
    scene.anims.create({
      key: visual.animationKey,
      frames: scene.anims.generateFrameNumbers(visual.textureKey, { start: 0, end: visual.frameCount - 1 }),
      frameRate: visual.frameRate,
      repeat: visual.repeat ?? 0,
    });
  }
}

// Runtime requests share a promise per scene/key; shutdown and failures always settle it.
const pendingLoads = new WeakMap<Phaser.Scene, Map<string, Promise<boolean>>>();
export async function ensureSprites(scene: Phaser.Scene, definitions: readonly (SpriteDefinition | CharacterPortraitDefinition)[]): Promise<boolean> {
  let pending = pendingLoads.get(scene);
  if (!pending) { pending = new Map(); pendingLoads.set(scene, pending); }
  const waits = [...new Map(definitions.map(visual => [visual.textureKey, visual])).values()].map(visual => {
    const key = visual.textureKey;
    if (scene.textures.exists(key)) return Promise.resolve(true);
    const existing = pending!.get(key);
    if (existing) return existing;
    const promise = new Promise<boolean>(resolve => {
      const finish = (success: boolean) => {
        scene.load.off('filecomplete', complete);
        scene.load.off('loaderror', failed);
        scene.events.off('shutdown', cancelled);
        pending!.delete(key);
        resolve(success);
      };
      const complete = (loadedKey: string) => { if (loadedKey === key) finish(true); };
      const failed = (file: { key: string }) => { if (file.key === key) { console.error('Sprite load failed:', key); finish(false); } };
      const cancelled = () => finish(false);
      scene.load.on('filecomplete', complete);
      scene.load.on('loaderror', failed);
      scene.events.once('shutdown', cancelled);
      preloadSprites(scene, [visual]);
    });
    pending!.set(key, promise);
    return promise;
  });
  if (waits.length && !scene.load.isLoading()) scene.load.start();
  const success = (await Promise.all(waits)).every(Boolean) && scene.sys.isActive();
  if (success) createSpriteAnimations(scene, definitions);
  return success;
}

/** The caller owns the returned sprite and may attach it to a UI container. */
export function addAnimatedSprite(scene: Phaser.Scene, visual: SpriteDefinition, x: number, y: number, repeat = visual.repeat ?? 0): Phaser.GameObjects.Sprite {
  const sprite = scene.add.sprite(x, y, visual.textureKey, 0);
  sprite.setDisplaySize(visual.displayWidth, visual.displayHeight);
  return sprite.play({ key: visual.animationKey, repeat });
}

export function playSpriteEffect(scene: Phaser.Scene, effect: SpriteEffectDefinition, x: number, y: number, amount = 1, explicitCount?: number): void {
  const count = explicitCount !== undefined ? Math.max(0, Math.ceil(explicitCount)) : effect.count
    ? Math.min(effect.count.max, Math.max(1, Math.ceil(Math.max(1, amount) / effect.count.amountPerSprite)))
    : 1;
  const between = (radius: number) => Math.floor(Math.random() * (radius * 2 + 1)) - radius;
  const candidates = effect.uniqueSprites ? [...new Set(effect.spriteIds)] : effect.spriteIds;
  const total = effect.uniqueSprites ? Math.min(count, candidates.length) : count;
  for (let i = 0; i < total; i += 1) {
    const choice = Math.floor(Math.random() * candidates.length);
    const id = effect.uniqueSprites ? candidates.splice(choice, 1)[0] : candidates[choice];
    const visual = EFFECT_SPRITES[id];
    if (!visual) continue;
    // Finite effects must finish even if a hand-edited sheet requests looping.
    const sprite = addAnimatedSprite(scene, visual, x + between(effect.scatter?.x ?? 0), y + between(effect.scatter?.y ?? 0), Math.max(0, visual.repeat ?? 0));
    sprite.setDepth(effect.depth + i).setAlpha(effect.alpha);
    if (effect.motion) {
      const motion = effect.motion, angle = Math.random() * Math.PI * 2;
      const travel = visual.displayWidth * motion.distanceRatio;
      scene.tweens.add({
        targets: sprite,
        x: sprite.x + Math.cos(angle) * travel,
        y: sprite.y + Math.sin(angle) * travel * motion.verticalRatio,
        duration: motion.duration,
        ease: motion.ease,
      });
    }
    sprite.once('animationcomplete', () => {
      scene.tweens.add({
        targets: sprite,
        alpha: effect.finish.alpha,
        scaleX: sprite.scaleX * effect.finish.scaleMultiplier,
        scaleY: sprite.scaleY * effect.finish.scaleMultiplier,
        duration: effect.finish.duration,
        ease: effect.finish.ease,
        onComplete: () => sprite.destroy(),
      });
    });
  }
}
