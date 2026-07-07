import type { RelicDefinition } from '../models/types';
import { defineRelic, effect } from './effectBuilders';

export const RELIC_DEFINITIONS: Record<string, RelicDefinition> = {
  succubusBlood: defineRelic({
    id: 'succubusBlood',
    name: 'Succubus\'s Blood',
    rarity: 'starter',
    description: 'When an enemy reaches EP Peak, drain HP equal to that enemy max EP.',
    triggers: [
      {
        timing: 'enemyEpPeak',
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
        timing: 'enemyEpPeak',
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
        timing: 'passive',
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
        timing: 'battleStart',
        effects: [effect('status', 'allEnemies', 1, { status: 'Charm', stacks: 1 })],
      },
    ],
  }),
};
