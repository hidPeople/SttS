import type { EnemyDefinition, StatusEffect } from '../models/types';
import { condition, defineEnemyIntent, effect } from './effectBuilders';

const intruded: StatusEffect[] = ['IntrudedA', 'IntrudedV'];
const charmIntentConditions = [
  condition('status', 'has', { target: 'self', status: 'Charm', causeStatus: 'Charm' }),
  condition('status', 'has', { target: 'player', status: 'Fainted', causeStatus: 'Fainted' }),
];
const notIntruded = [condition('status', 'notHas', { target: 'self', statuses: intruded })];
const hasIntruded = [condition('status', 'has', { target: 'self', statuses: intruded })];
const hasIntrudedA = [condition('status', 'has', { target: 'self', status: 'IntrudedA' })];
const hasIntrudedV = [condition('status', 'has', { target: 'self', status: 'IntrudedV' })];

export const ENEMY_DEFINITIONS: Record<string, EnemyDefinition> = {
  grunt: {
    id: 'grunt',
    name: 'Grunt',
    maxHp: 54,
    maxEp: 12,
    stages: [1],
    threat: 1,
    intentEConditions: charmIntentConditions,
    intents: [
      defineEnemyIntent({
        label: 'slice',
        effects: [effect('hpDamage', 'player', 7, { attackAttribute: 'slice' })],
      }),
      defineEnemyIntent({
        label: 'strike',
        effects: [effect('hpDamage', 'player', 4, { attackAttribute: 'strike' })],
      }),
    ],
    intents_E: [
      defineEnemyIntent({
        label: 'in-out',
        effects: [
          effect('epDamage', 'player', 5, { attackAttribute: 'love' }),
          effect('epDamage', 'self', 7, { attackAttribute: 'love' }),
        ],
      }),
      defineEnemyIntent({
        label: 'Fingering',
        effects: [effect('epDamage', 'player', 5, { attackAttribute: 'love' })],
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
    intentEConditions: charmIntentConditions,
    intents: [
      defineEnemyIntent({
        label: 'Ramming',
        effects: [
          effect('hpDamage', 'player', 3, { attackAttribute: 'strike' }),
          effect('epDamage', 'player', 1, { attackAttribute: 'strike' }),
        ],
        conditions: notIntruded,
      }),
      defineEnemyIntent({
        label: 'mucus',
        effects: [effect('epDamage', 'player', 4, { attackAttribute: 'mucus' })],
        conditions: notIntruded,
      }),
      defineEnemyIntent({
        label: 'Cling',
        effects: [
          effect('epDamage', 'player', 4, { attackAttribute: 'love' }),
          effect('status', 'self', 1, { status: 'Charm', stacks: 1 }),
        ],
        conditions: notIntruded,
      }),
      defineEnemyIntent({
        label: 'Jiggle',
        effects: [effect('epDamage', 'player', 5, { attackAttribute: 'love' })],
        conditions: hasIntruded,
      }),
      defineEnemyIntent({
        label: 'AcidOoz',
        effects: [
          effect('hpDamage', 'player', 3, { attackAttribute: 'love' }),
          effect('epDamage', 'player', 3, { attackAttribute: 'love' }),
        ],
        conditions: hasIntruded,
      }),
      defineEnemyIntent({
        label: 'parasiteV',
        effects: [
          effect('epDamage', 'player', 10, { attackAttribute: 'love' }),
          effect('hpDamage', 'self', 1, { percentOf: 'selfCurrentHp', attackAttribute: 'love' }),
          effect('status', 'player', 1, { status: 'InfestedV', stacks: 1 }),
        ],
        conditions: hasIntrudedV,
      }),
      defineEnemyIntent({
        label: 'parasiteA',
        effects: [
          effect('epDamage', 'player', 10, { attackAttribute: 'love' }),
          effect('hpDamage', 'self', 1, { percentOf: 'selfCurrentHp', attackAttribute: 'love' }),
          effect('status', 'player', 1, { status: 'InfestedA', stacks: 1 }),
        ],
        conditions: hasIntrudedA,
      }),
    ],
    intents_E: [
      defineEnemyIntent({
        label: 'IntrudedA',
        effects: [
          effect('epDamage', 'player', 4, { attackAttribute: 'love' }),
          effect('status', 'self', 1, { status: 'IntrudedA', stacks: 1 }),
        ],
        conditions: notIntruded,
      }),
      defineEnemyIntent({
        label: 'IntrudedV',
        effects: [
          effect('epDamage', 'player', 4, { attackAttribute: 'love' }),
          effect('status', 'self', 1, { status: 'IntrudedV', stacks: 1 }),
        ],
        conditions: notIntruded,
      }),
      defineEnemyIntent({
        label: 'Jiggle',
        effects: [effect('epDamage', 'player', 4, { attackAttribute: 'love' })],
        conditions: hasIntruded,
      }),
      defineEnemyIntent({
        label: 'AcidOoz',
        effects: [
          effect('hpDamage', 'player', 3, { attackAttribute: 'love' }),
          effect('epDamage', 'player', 3, { attackAttribute: 'love' }),
        ],
        conditions: hasIntruded,
      }),
      defineEnemyIntent({
        label: 'parasiteV',
        effects: [
          effect('epDamage', 'player', 10, { attackAttribute: 'love' }),
          effect('hpDamage', 'self', 1, { percentOf: 'selfCurrentHp', attackAttribute: 'love' }),
          effect('status', 'player', 1, { status: 'InfestedV', stacks: 1 }),
        ],
        conditions: hasIntrudedV,
      }),
      defineEnemyIntent({
        label: 'parasiteA',
        effects: [
          effect('epDamage', 'player', 10, { attackAttribute: 'love' }),
          effect('hpDamage', 'self', 1, { percentOf: 'selfCurrentHp', attackAttribute: 'love' }),
          effect('status', 'player', 1, { status: 'InfestedA', stacks: 1 }),
        ],
        conditions: hasIntrudedA,
      }),
    ],
  },
};
