import type Phaser from 'phaser';
import { PLAYER_PORTRAIT } from '../data/player';
import { CHARACTER_SPRITES } from '../data/sprites';
import { addAnimatedSprite } from './sprites';

/** Battle, rewards and events share the same portrait and local placement. */
export function addPlayerPortrait(scene: Phaser.Scene, x = 0, y = 0): Phaser.GameObjects.Sprite {
  return addAnimatedSprite(scene, CHARACTER_SPRITES[PLAYER_PORTRAIT.spriteId],
    x + PLAYER_PORTRAIT.offsetX, y + PLAYER_PORTRAIT.offsetY).setName('player-portrait');
}
