import type { EnemyDefinition } from '../models/types';

export const ENEMY_DEFINITIONS: Record<string, EnemyDefinition> = {
  trainingWraith: {
    id: 'trainingWraith',
    name: 'Training Wraith',
    maxHp: 54,
    maxEp: 12,
    intents: [
      {
        label: 'slash 7 HP',
        amount: 7,
        damageType: 'hp',
        attackAttribute: 'slash',
      },
      {
        label: 'strike 4 HP',
        amount: 4,
        damageType: 'hp',
        attackAttribute: 'strike',
      },
    ],
  },
};
