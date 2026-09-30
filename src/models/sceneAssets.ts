import { ENEMY_SPRITES } from '../data/enemySprites';
import { EFFECT_SPRITES, UI_SPRITES } from '../data/sprites';
import type { EnemyDefinition, SpriteDefinition } from './types';

/** Load only spawned enemy types, but include their in-battle appearance variants. */
export function enemySpriteAssets(enemies: readonly EnemyDefinition[]): SpriteDefinition[] {
  const keys = enemies.flatMap(enemy => [enemy.sprite ?? enemy.id, ...(enemy.spriteRules ?? []).map(rule => rule.sprite)]);
  return [...new Set(keys)].map(key => ENEMY_SPRITES[key]).filter(Boolean);
}

/** Shared attack/UI effects can be used by cards, statuses and relics in any battle. */
export function commonBattleSprites(): SpriteDefinition[] {
  return [...Object.values(EFFECT_SPRITES), ...Object.values(UI_SPRITES)];
}
