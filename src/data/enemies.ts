import type { AttackAttribute, EnemyDefinition, EnemyIntent, StatusApplication, StatusEffect } from '../models/types';

type EnemyIntentInput = {
  label: string;
  hpDamage?: number;
  epDamage?: number;
  selfHpDamage?: number;
  selfHpDamagePercent?: number;
  selfEpDamage?: number;
  selfEpDamagePercent?: number;
  hpHeal?: number;
  epHeal?: number;
  block?: number;
  buffs?: StatusApplication[];
  debuffs?: StatusApplication[];
  timesLimit?: number;
  enemyStatusLimit?: StatusEffect[];
  enemyStatusLimitN?: StatusEffect[];
  attackAttribute: AttackAttribute;
};

function enemyIntent(input: EnemyIntentInput): EnemyIntent {
  const hpDamage = input.hpDamage ?? 0;
  const epDamage = input.epDamage ?? 0;
  const damageType = hpDamage > 0 ? 'hp' : 'ep';
  const amount = damageType === 'hp' ? hpDamage : epDamage;

  return {
    label: input.label,
    amount,
    damageType,
    hpDamage,
    epDamage,
    selfHpDamage: input.selfHpDamage ?? 0,
    selfHpDamagePercent: input.selfHpDamagePercent ?? 0,
    selfEpDamage: input.selfEpDamage ?? 0,
    selfEpDamagePercent: input.selfEpDamagePercent ?? 0,
    hpHeal: input.hpHeal ?? 0,
    epHeal: input.epHeal ?? 0,
    block: input.block ?? 0,
    buffs: input.buffs ?? [],
    debuffs: input.debuffs ?? [],
    timesLimit: input.timesLimit ?? 0,
    enemyStatusLimit: input.enemyStatusLimit ?? [],
    enemyStatusLimitN: input.enemyStatusLimitN ?? [],
    attackAttribute: input.attackAttribute,
  };
}

const notIntruded: StatusEffect[] = ['IntrudedA', 'IntrudedV'];
const intruded: StatusEffect[] = ['IntrudedA', 'IntrudedV'];

export const ENEMY_DEFINITIONS: Record<string, EnemyDefinition> = {
  trainingWraith: {
    id: 'trainingWraith',
    name: 'Training Wraith',
    maxHp: 54,
    maxEp: 12,
    stages: [1],
    threat: 1,
    intents: [
      enemyIntent({
        label: 'slash',
        hpDamage: 7,
        attackAttribute: 'slash',
      }),
      enemyIntent({
        label: 'strike',
        hpDamage: 4,
        attackAttribute: 'strike',
      }),
    ],
    intents_E: [
      enemyIntent({
        label: 'in-out',
        epDamage: 5,
        selfEpDamage: 7,
        attackAttribute: 'love',
      }),
      enemyIntent({
        label: 'Fingering',
        epDamage: 5,
        attackAttribute: 'love',
      }),
    ],
  },
  slime: {
    id: 'slime',
    name: 'Slime',
    maxHp: 40,
    maxEp: 0,
    stages: [1],
    threat: 2,
    intents: [
      enemyIntent({
        label: 'Ramming',
        hpDamage: 3,
        epDamage: 1,
        attackAttribute: 'strike',
        enemyStatusLimitN: notIntruded,
      }),
      enemyIntent({
        label: 'mucus',
        epDamage: 4,
        attackAttribute: 'love',
        enemyStatusLimitN: notIntruded,
      }),
      enemyIntent({
        label: 'Cling',
        epDamage: 4,
        buffs: [{ effect: 'Charm', stacks: 1 }],
        attackAttribute: 'love',
        enemyStatusLimitN: notIntruded,
      }),
      enemyIntent({
        label: 'Jiggle',
        epDamage: 5,
        attackAttribute: 'love',
        enemyStatusLimit: intruded,
      }),
      enemyIntent({
        label: 'AcidOoz',
        hpDamage: 3,
        epDamage: 3,
        attackAttribute: 'love',
        enemyStatusLimit: intruded,
      }),
      enemyIntent({
        label: 'parasiteV',
        epDamage: 10,
        selfHpDamagePercent: 1,
        debuffs: [{ effect: 'InfestedV', stacks: 1 }],
        attackAttribute: 'love',
        enemyStatusLimit: ['IntrudedV'],
      }),
      enemyIntent({
        label: 'parasiteA',
        epDamage: 10,
        selfHpDamagePercent: 1,
        debuffs: [{ effect: 'InfestedA', stacks: 1 }],
        attackAttribute: 'love',
        enemyStatusLimit: ['IntrudedA'],
      }),
    ],
    intents_E: [
      enemyIntent({
        label: 'IntrudedA',
        epDamage: 4,
        buffs: [{ effect: 'IntrudedA', stacks: 1 }],
        attackAttribute: 'love',
        enemyStatusLimitN: notIntruded,
      }),
      enemyIntent({
        label: 'IntrudedV',
        epDamage: 4,
        buffs: [{ effect: 'IntrudedV', stacks: 1 }],
        attackAttribute: 'love',
        enemyStatusLimitN: notIntruded,
      }),
      enemyIntent({
        label: 'Jiggle',
        epDamage: 4,
        attackAttribute: 'love',
        enemyStatusLimit: intruded,
      }),
      enemyIntent({
        label: 'AcidOoz',
        hpDamage: 3,
        epDamage: 3,
        attackAttribute: 'love',
        enemyStatusLimit: intruded,
      }),
      enemyIntent({
        label: 'parasiteV',
        epDamage: 10,
        selfHpDamagePercent: 1,
        debuffs: [{ effect: 'InfestedV', stacks: 1 }],
        attackAttribute: 'love',
        enemyStatusLimit: ['IntrudedV'],
      }),
      enemyIntent({
        label: 'parasiteA',
        epDamage: 10,
        selfHpDamagePercent: 1,
        debuffs: [{ effect: 'InfestedA', stacks: 1 }],
        attackAttribute: 'love',
        enemyStatusLimit: ['IntrudedA'],
      }),
    ],
  },
};
