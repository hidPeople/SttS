import type { EnemyDefinition, StatusEffect } from '../models/types';
import { defineEnemyIntent, effect } from './effectBuilders';

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
      defineEnemyIntent({
        label: 'slash',
        effects: [effect('hpDamage', 'player', 7, { attackAttribute: 'slash' })],
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
    intents: [
      defineEnemyIntent({
        label: 'Ramming',
        effects: [
          effect('hpDamage', 'player', 3, { attackAttribute: 'strike' }),
          effect('epDamage', 'player', 1, { attackAttribute: 'strike' }),
        ],
        enemyStatusLimitN: intruded,
      }),
      defineEnemyIntent({
        label: 'mucus',
        effects: [effect('epDamage', 'player', 4, { attackAttribute: 'love' })],
        enemyStatusLimitN: intruded,
      }),
      defineEnemyIntent({
        label: 'Cling',
        effects: [
          effect('epDamage', 'player', 4, { attackAttribute: 'love' }),
          effect('status', 'self', 1, { status: 'Charm', stacks: 1 }),
        ],
        enemyStatusLimitN: intruded,
      }),
      defineEnemyIntent({
        label: 'Jiggle',
        effects: [effect('epDamage', 'player', 5, { attackAttribute: 'love' })],
        enemyStatusLimit: intruded,
      }),
      defineEnemyIntent({
        label: 'AcidOoz',
        effects: [
          effect('hpDamage', 'player', 3, { attackAttribute: 'love' }),
          effect('epDamage', 'player', 3, { attackAttribute: 'love' }),
        ],
        enemyStatusLimit: intruded,
      }),
      defineEnemyIntent({
        label: 'parasiteV',
        effects: [
          effect('epDamage', 'player', 10, { attackAttribute: 'love' }),
          effect('hpDamage', 'self', 1, { percentOf: 'selfCurrentHp', attackAttribute: 'love' }),
          effect('status', 'player', 1, { status: 'InfestedV', stacks: 1 }),
        ],
        enemyStatusLimit: ['IntrudedV'],
      }),
      defineEnemyIntent({
        label: 'parasiteA',
        effects: [
          effect('epDamage', 'player', 10, { attackAttribute: 'love' }),
          effect('hpDamage', 'self', 1, { percentOf: 'selfCurrentHp', attackAttribute: 'love' }),
          effect('status', 'player', 1, { status: 'InfestedA', stacks: 1 }),
        ],
        enemyStatusLimit: ['IntrudedA'],
      }),
    ],
    intents_E: [
      defineEnemyIntent({
        label: 'IntrudedA',
        effects: [
          effect('epDamage', 'player', 4, { attackAttribute: 'love' }),
          effect('status', 'self', 1, { status: 'IntrudedA', stacks: 1 }),
        ],
        enemyStatusLimitN: intruded,
      }),
      defineEnemyIntent({
        label: 'IntrudedV',
        effects: [
          effect('epDamage', 'player', 4, { attackAttribute: 'love' }),
          effect('status', 'self', 1, { status: 'IntrudedV', stacks: 1 }),
        ],
        enemyStatusLimitN: intruded,
      }),
      defineEnemyIntent({
        label: 'Jiggle',
        effects: [effect('epDamage', 'player', 4, { attackAttribute: 'love' })],
        enemyStatusLimit: intruded,
      }),
      defineEnemyIntent({
        label: 'AcidOoz',
        effects: [
          effect('hpDamage', 'player', 3, { attackAttribute: 'love' }),
          effect('epDamage', 'player', 3, { attackAttribute: 'love' }),
        ],
        enemyStatusLimit: intruded,
      }),
      defineEnemyIntent({
        label: 'parasiteV',
        effects: [
          effect('epDamage', 'player', 10, { attackAttribute: 'love' }),
          effect('hpDamage', 'self', 1, { percentOf: 'selfCurrentHp', attackAttribute: 'love' }),
          effect('status', 'player', 1, { status: 'InfestedV', stacks: 1 }),
        ],
        enemyStatusLimit: ['IntrudedV'],
      }),
      defineEnemyIntent({
        label: 'parasiteA',
        effects: [
          effect('epDamage', 'player', 10, { attackAttribute: 'love' }),
          effect('hpDamage', 'self', 1, { percentOf: 'selfCurrentHp', attackAttribute: 'love' }),
          effect('status', 'player', 1, { status: 'InfestedA', stacks: 1 }),
        ],
        enemyStatusLimit: ['IntrudedA'],
      }),
    ],
  },
};
