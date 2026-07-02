import type { EnemyDefinition } from '../models/types';

export const ENEMY_DEFINITIONS: Record<string, EnemyDefinition> = {
  trainingWraith: {
    id: 'trainingWraith',
    name: 'Training Wraith',
    maxHp: 54,
    maxEp: 12,
    intents: [
      {
        label: 'Attack 7 HP',
        amount: 7,
        damageType: 'hp',
        attackAttribute: 'strike',
      },
      {
        label: 'Attack 4 HP',
        amount: 4,
        damageType: 'hp',
        attackAttribute: 'strike',
      },
    ],
  },
};
