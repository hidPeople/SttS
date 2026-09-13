import type Phaser from 'phaser';
import { ENEMY_SPRITES } from '../data/enemySprites';
import { EFFECT_SPRITES, UI_SPRITES } from '../data/sprites';
import type { SpriteDefinition, SpriteEffectDefinition } from '../models/types';

const registeredSprites = (): SpriteDefinition[] => [
  ...Object.values(ENEMY_SPRITES),
  ...Object.values(EFFECT_SPRITES),
  ...Object.values(UI_SPRITES),
];

/** All owners use the same loading/animation pipeline, including future UI. */
export function preloadSprites(scene: Phaser.Scene, definitions = registeredSprites()): void {
  for (const visual of definitions) {
    if (!scene.textures.exists(visual.textureKey)) {
      scene.load.spritesheet(visual.textureKey, visual.source, {
        frameWidth: visual.frameWidth,
        frameHeight: visual.frameHeight,
        endFrame: visual.frameCount - 1,
      });
    }
  }
}

export function createSpriteAnimations(scene: Phaser.Scene, definitions = registeredSprites()): void {
  for (const visual of definitions) {
    if (scene.anims.exists(visual.animationKey)) continue;
    scene.anims.create({
      key: visual.animationKey,
      frames: scene.anims.generateFrameNumbers(visual.textureKey, { start: 0, end: visual.frameCount - 1 }),
      frameRate: visual.frameRate,
      repeat: visual.repeat ?? 0,
    });
  }
}

/** The caller owns the returned sprite and may attach it to a UI container. */
export function addAnimatedSprite(scene: Phaser.Scene, visual: SpriteDefinition, x: number, y: number, repeat = visual.repeat ?? 0): Phaser.GameObjects.Sprite {
  const sprite = scene.add.sprite(x, y, visual.textureKey, 0);
  sprite.setDisplaySize(visual.displayWidth, visual.displayHeight);
  return sprite.play({ key: visual.animationKey, repeat });
}

export function playSpriteEffect(scene: Phaser.Scene, effect: SpriteEffectDefinition, x: number, y: number, amount = 1): void {
  const count = effect.count
    ? Math.min(effect.count.max, Math.max(1, Math.ceil(Math.max(1, amount) / effect.count.amountPerSprite)))
    : 1;
  const between = (radius: number) => Math.floor(Math.random() * (radius * 2 + 1)) - radius;
  for (let i = 0; i < count; i += 1) {
    const id = effect.spriteIds[Math.floor(Math.random() * effect.spriteIds.length)];
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
