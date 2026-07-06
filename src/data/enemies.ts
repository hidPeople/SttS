import type { EnemyDefinition } from '../models/types';

export const ENEMY_DEFINITIONS: Record<string, EnemyDefinition> = {
  trainingWraith: {
    id: 'trainingWraith',
    name: 'Training Wraith',
    maxHp: 54,
    maxEp: 12,
    stages: [1],
    threat: 1,
    intents: [
      {
        label: 'slash',
        amount: 7,
        damageType: 'hp',
        selfHpDamage: 0,
        selfEpDamage: 0,
        attackAttribute: 'slash',
      },
      {
        label: 'strike',
        amount: 4,
        damageType: 'hp',
        selfHpDamage: 0,
        selfEpDamage: 0,
        attackAttribute: 'strike',
      },
    ],
    intents_E: [
      {
        label: 'in-out',
        amount: 5,
        damageType: 'ep',
        selfHpDamage: 0,
        selfEpDamage: 7,
        attackAttribute: 'love',
      },
      {
        label: 'Fingering',
        amount: 5,
        damageType: 'ep',
        selfHpDamage: 0,
        selfEpDamage: 0,
        attackAttribute: 'love',
      },
    ],
  },
};
