import type Phaser from 'phaser';
import { PLAYER_PORTRAIT } from '../data/player';
import { CHARACTER_SPRITES } from '../data/sprites';

/** Reusable for later pose changes: image dimensions and offsets are reapplied on every switch. */
export function applyPlayerPortrait(sprite: Phaser.GameObjects.Sprite, spriteId: string, x = 0, y = 0): Phaser.GameObjects.Sprite {
  const visual = CHARACTER_SPRITES[spriteId];
  if (!visual) throw new Error(`Unknown character portrait: ${spriteId}`);
  sprite.setTexture(visual.textureKey);
  const width = visual.displayHeight * sprite.frame.realWidth / sprite.frame.realHeight;
  return sprite.setOrigin(0.5, 0).setDisplaySize(width, visual.displayHeight)
    .setPosition(x + PLAYER_PORTRAIT.offsetX + (visual.offsetX ?? 0), y + PLAYER_PORTRAIT.offsetY + (visual.offsetY ?? 0));
}

/** Battle, rewards and events share the same portrait and local placement. */
export function addPlayerPortrait(scene: Phaser.Scene, x = 0, y = 0): Phaser.GameObjects.Sprite {
  const visual = CHARACTER_SPRITES[PLAYER_PORTRAIT.spriteId];
  return applyPlayerPortrait(scene.add.sprite(x, y, visual.textureKey), PLAYER_PORTRAIT.spriteId, x, y).setName('player-portrait');
}
