import { EFFECT_TIMINGS, type RelicDefinition } from '../models/types';
import { condition, defineRelic, effect } from './effectBuilders';

export const RELIC_DEFINITIONS: Record<string, RelicDefinition> = {
  succubusBlood: defineRelic({
    id: 'succubusBlood',
    name: 'Succubus\'s Blood',
    rarity: 'starter',
    description: 'When an enemy reaches EP Peak, drain HP equal to that enemy max EP.',
    triggers: [
      {
        timing: EFFECT_TIMINGS.EnemyEpPeak,
        effects: [effect('hpDrain', 'triggerEnemy', 1, { percentOf: 'targetMaxEp', attackAttribute: 'love' })],
      },
    ],
  }),
  lilimBlood: defineRelic({
    id: 'lilimBlood',
    name: 'Lilim\'s Blood',
    rarity: 'uncommon',
    description: 'When an enemy reaches EP Peak, drain 5 HP.',
    triggers: [
      {
        timing: EFFECT_TIMINGS.EnemyEpPeak,
        effects: [effect('hpDrain', 'triggerEnemy', 5, { attackAttribute: 'love' })],
      },
    ],
  }),
  manualOfBrothel: defineRelic({
    id: 'manualOfBrothel',
    name: 'Manual of the Brothel',
    rarity: 'common',
    description: 'Enemy EP damage dealt by cards is increased by 1.',
    triggers: [
      {
        timing: EFFECT_TIMINGS.Passive,
        effects: [effect('epDamage', 'selectedEnemy', 1, { attackAttribute: 'love' })],
      },
    ],
  }),
  pheromones: defineRelic({
    id: 'pheromones',
    name: 'Pheromones',
    rarity: 'uncommon',
    description: 'At battle start, apply Charm to all enemies.',
    triggers: [
      {
        timing: EFFECT_TIMINGS.BattleStart,
        effects: [effect('status', 'allEnemies', 1, { status: 'Charm', stacks: 1 })],
      },
    ],
  }),
  alluringBody: defineRelic({
    id: 'alluringBody',
    name: 'Alluring Body',
    rarity: 'rare',
    description: 'When the player reaches EP Peak, each enemy has a 20% chance to gain Charm.',
    triggers: [
      {
        timing: EFFECT_TIMINGS.PlayerEpPeak,
        effects: [effect('status', 'allEnemies', 1, { status: 'Charm', stacks: 1, chance: 0.2 })],
      },
    ],
  }),
  livingClothes: defineRelic({
    id: 'livingClothes',
    name: 'Living Clothes',
    rarity: 'rare',
    description: 'At turn start, if you have Block, keep that Block and take 1-3 EP damage.',
    triggers: [
      {
        timing: EFFECT_TIMINGS.TurnStart,
        conditions: [condition('block', 'gt', { target: 'player', value: 0 })],
        effects: [
          effect('retainBlock', 'player', 1),
          effect('epDamage', 'player', 1, { randomAmount: { min: 1, max: 3 }, attackAttribute: 'love' }),
        ],
      },
    ],
  }),
};
