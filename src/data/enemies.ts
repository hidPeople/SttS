import type { EnemyDefinition, StatusEffect } from '../models/types';
import { text as l } from '../models/localization';
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
    name: l('Grunt', '下級兵'),
    maxHp: 54,
    maxEp: 12,
    stages: [1],
    threat: 1,
    intentEConditions: charmIntentConditions,
    intents: [
      defineEnemyIntent({
        label: l('slice', '裂き斬り'),
        effects: [effect('hpDamage', 'player', 7, { attackAttribute: 'slice' })],
        flavors: {
          onIntent: [{ kind: 'narration', text: l('The Grunt swings with desperate force.', '下級兵が必死の力で剣を振るう。') }],
        },
      }),
      defineEnemyIntent({
        label: l('strike', '打撃'),
        effects: [effect('hpDamage', 'player', 4, { attackAttribute: 'strike' })],
      }),
    ],
    intents_E: [
      defineEnemyIntent({
        label: l('in-out', 'in-out'),
        effects: [
          effect('epDamage', 'player', 5, { attackAttribute: 'love', epDamageParts: ['V'] }),
          effect('epDamage', 'self', 7, { attackAttribute: 'love' }),
        ],
      }),
      defineEnemyIntent({
        label: l('Fingering', 'Fingering'),
        effects: [effect('epDamage', 'player', 5, { attackAttribute: 'love', epDamageParts: ['V'] })],
      }),
    ],
  },
  slime: {
    id: 'slime',
    name: l('Slime', 'スライム'),
    maxHp: 40,
    maxEp: 0,
    stages: [1],
    threat: 2,
    intentEConditions: charmIntentConditions,
    intents: [
      defineEnemyIntent({
        label: l('Ramming', '体当たり'),
        effects: [
          effect('hpDamage', 'player', 3, { attackAttribute: 'strike' }),
          effect('epDamage', 'player', 1, { attackAttribute: 'strike', epDamageParts: ['B', 'C'] }),
        ],
        conditions: notIntruded,
      }),
      defineEnemyIntent({
        label: l('mucus', '粘液'),
        effects: [effect('epDamage', 'player', 4, { attackAttribute: 'mucus', epDamageParts: ['B', 'C'] })],
        conditions: notIntruded,
      }),
      defineEnemyIntent({
        label: l('Cling', 'まとわりつき'),
        effects: [
          effect('epDamage', 'player', 4, { attackAttribute: 'love', epDamageParts: ['B', 'C'] }),
          effect('status', 'self', 1, { status: 'Charm', stacks: 1 }),
        ],
        conditions: notIntruded,
      }),
      defineEnemyIntent({
        label: l('Jiggle', '蠢き'),
        effects: [effect('epDamage', 'player', 5, { attackAttribute: 'love', epDamageParts: ['B', 'C'], epDamagePartMode: 'actorIntruded' })],
        conditions: hasIntruded,
      }),
      defineEnemyIntent({
        label: l('AcidOoz', '酸性粘液'),
        effects: [
          effect('hpDamage', 'player', 3, { attackAttribute: 'love' }),
          effect('epDamage', 'player', 3, { attackAttribute: 'love', epDamageParts: ['B', 'C'], epDamagePartMode: 'actorIntruded' }),
        ],
        conditions: hasIntruded,
      }),
      defineEnemyIntent({
        label: l('parasiteV', '寄生V'),
        effects: [
          effect('epDamage', 'player', 10, { attackAttribute: 'love', epDamageParts: ['V'] }),
          effect('hpDamage', 'self', 1, { percentOf: 'selfCurrentHp', attackAttribute: 'love' }),
          effect('status', 'player', 1, { status: 'InfestedV', stacks: 1 }),
        ],
        conditions: hasIntrudedV,
      }),
      defineEnemyIntent({
        label: l('parasiteA', '寄生A'),
        effects: [
          effect('epDamage', 'player', 10, { attackAttribute: 'love', epDamageParts: ['A'] }),
          effect('hpDamage', 'self', 1, { percentOf: 'selfCurrentHp', attackAttribute: 'love' }),
          effect('status', 'player', 1, { status: 'InfestedA', stacks: 1 }),
        ],
        conditions: hasIntrudedA,
      }),
    ],
    intents_E: [
      defineEnemyIntent({
        label: l('IntrudedA', '侵入A'),
        effects: [
          effect('epDamage', 'player', 4, { attackAttribute: 'love', epDamageParts: ['A'] }),
          effect('status', 'self', 1, { status: 'IntrudedA', stacks: 1 }),
        ],
        conditions: notIntruded,
      }),
      defineEnemyIntent({
        label: l('IntrudedV', '侵入V'),
        effects: [
          effect('epDamage', 'player', 4, { attackAttribute: 'love', epDamageParts: ['V'] }),
          effect('status', 'self', 1, { status: 'IntrudedV', stacks: 1 }),
        ],
        conditions: notIntruded,
      }),
      defineEnemyIntent({
        label: l('Jiggle', '蠢き'),
        effects: [effect('epDamage', 'player', 4, { attackAttribute: 'love', epDamageParts: ['B', 'C'], epDamagePartMode: 'actorIntruded' })],
        conditions: hasIntruded,
      }),
      defineEnemyIntent({
        label: l('AcidOoz', '酸性粘液'),
        effects: [
          effect('hpDamage', 'player', 3, { attackAttribute: 'love' }),
          effect('epDamage', 'player', 3, { attackAttribute: 'love', epDamageParts: ['B', 'C'], epDamagePartMode: 'actorIntruded' }),
        ],
        conditions: hasIntruded,
      }),
      defineEnemyIntent({
        label: l('parasiteV', '寄生V'),
        effects: [
          effect('epDamage', 'player', 10, { attackAttribute: 'love', epDamageParts: ['V'] }),
          effect('hpDamage', 'self', 1, { percentOf: 'selfCurrentHp', attackAttribute: 'love' }),
          effect('status', 'player', 1, { status: 'InfestedV', stacks: 1 }),
        ],
        conditions: hasIntrudedV,
      }),
      defineEnemyIntent({
        label: l('parasiteA', '寄生A'),
        effects: [
          effect('epDamage', 'player', 10, { attackAttribute: 'love', epDamageParts: ['A'] }),
          effect('hpDamage', 'self', 1, { percentOf: 'selfCurrentHp', attackAttribute: 'love' }),
          effect('status', 'player', 1, { status: 'InfestedA', stacks: 1 }),
        ],
        conditions: hasIntrudedA,
      }),
    ],
  },
};
