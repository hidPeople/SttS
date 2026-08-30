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
  PeakMachine: {
    id: 'PeakMachine',
    name: l('Peak Machine', 'ピークマシン'),
    maxHp: 1,
    maxEp: 0,
    stages: [100],
    threat: 100,
    intentEConditions: [],
    intents: [
      defineEnemyIntent({
        label: l('forced Peak', '強制ピーク'),
        effects: [effect('epDamage', 'player', 150, { attackAttribute: 'love', epDamageParts: ['V'] })],
        flavors: {
          onIntent: [{ kind: 'narration', text: l('The machine accuses me coldly.', '機械が無感情に責め立てる。') }],
        },
      }),
    ],
    intents_E: [],
  },
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
        label: l('in-out', '出し入れ'),
        effects: [
          effect('epDamage', 'player', 5, { attackAttribute: 'love', epDamageParts: ['V'] }),
          effect('epDamage', 'self', 7, { attackAttribute: 'love' }),
        ],
        flavors: {
          onIntent: [{ kind: 'narration', text: l('The Grunt\'s in-out attacks!', '下級兵の出し入れ攻撃！') }],
        },
      }),
      defineEnemyIntent({
        label: l('Fingering', '指技'),
        effects: [effect('epDamage', 'player', 5, { attackAttribute: 'love', epDamageParts: ['V'] })],
        flavors: {
          onIntent: [{ kind: 'narration', text: l('The Grunt soldier touched me!', '下級兵に触られた！') }],
        },
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
        label: l('Ramming', '飛びつき'),
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
        flavors: {
          onIntent: [{ kind: 'narration', text: l('The slime is clinging to your body.', 'スライムが体にまとわりついてくる。') }],
        },
      }),
      defineEnemyIntent({
        label: l('Jiggle', '蠢き'),
        effects: [effect('epDamage', 'player', 5, { attackAttribute: 'love', epDamageParts: ['B', 'C'], epDamagePartMode: 'actorIntruded' })],
        conditions: hasIntruded,
        flavors: {
          onIntent: [{ kind: 'narration', text: l('The slime is jiggling inside the body.', 'スライムが体内で蠢いている。') }],
        },
      }),
      defineEnemyIntent({
        label: l('AcidOoz', '酸性粘液'),
        effects: [
          effect('hpDamage', 'player', 3, { attackAttribute: 'love' }),
          effect('epDamage', 'player', 3, { attackAttribute: 'love', epDamageParts: ['B', 'C'], epDamagePartMode: 'actorIntruded' }),
        ],
        conditions: hasIntruded,
        flavors: {
          onIntent: [{ kind: 'narration', text: l('The slime started oozing fluids inside the body.', 'スライムが体内で粘液を吐き出し始めた。') }],
        },
      }),
      defineEnemyIntent({
        label: l('parasiteV', '寄生V'),
        effects: [
          effect('epDamage', 'player', 10, { attackAttribute: 'love', epDamageParts: ['V'] }),
          effect('hpDamage', 'self', 1, { percentOf: 'selfCurrentHp', attackAttribute: 'love' }),
          effect('status', 'player', 1, { status: 'InfestedV_Slime', stacks: 1 }),
        ],
        conditions: hasIntrudedV,
        flavors: {
          onIntent: [{ kind: 'narration', text: l('The slime sends its core deep inside {player}\'s V.', 'スライムは{player}のVの奥深くに自身のコアを送り込んできた。') }],
        },
      }),
      defineEnemyIntent({
        label: l('parasiteA', '寄生A'),
        effects: [
          effect('epDamage', 'player', 10, { attackAttribute: 'love', epDamageParts: ['A'] }),
          effect('hpDamage', 'self', 1, { percentOf: 'selfCurrentHp', attackAttribute: 'love' }),
          effect('status', 'player', 1, { status: 'InfestedA_Slime', stacks: 1 }),
        ],
        conditions: hasIntrudedA,
        flavors: {
          onIntent: [{ kind: 'narration', text: l('The slime sends its core deep inside {player}\'s A.', 'スライムは{player}のAの奥深くに自身のコアを送り込んできた。') }],
        },
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
        flavors: {
          onIntent: [{ kind: 'narration', text: l('The slime intruded and made its way into V.', 'スライムはVの中に潜り込んできた。') }],
        },
      }),
      defineEnemyIntent({
        label: l('IntrudedV', '侵入V'),
        effects: [
          effect('epDamage', 'player', 4, { attackAttribute: 'love', epDamageParts: ['V'] }),
          effect('status', 'self', 1, { status: 'IntrudedV', stacks: 1 }),
        ],
        conditions: notIntruded,
        flavors: {
          onIntent: [{ kind: 'narration', text: l('The slime intruded and made its way into A.', 'スライムはAの中に潜り込んできた。') }],
        },
      }),
      defineEnemyIntent({
        label: l('Jiggle', '蠢き'),
        effects: [effect('epDamage', 'player', 4, { attackAttribute: 'love', epDamageParts: ['B', 'C'], epDamagePartMode: 'actorIntruded' })],
        conditions: hasIntruded,
        flavors: {
          onIntent: [{ kind: 'narration', text: l('The slime is jiggling inside the body.', 'スライムが体内で蠢いている。') }],
        },
      }),
      defineEnemyIntent({
        label: l('AcidOoz', '酸性粘液'),
        effects: [
          effect('hpDamage', 'player', 3, { attackAttribute: 'love' }),
          effect('epDamage', 'player', 3, { attackAttribute: 'love', epDamageParts: ['B', 'C'], epDamagePartMode: 'actorIntruded' }),
        ],
        conditions: hasIntruded,
        flavors: {
          onIntent: [{ kind: 'narration', text: l('The slime started oozing fluids inside the body.', 'スライムが体内で粘液を吐き出し始めた。') }],
        },
      }),
      defineEnemyIntent({
        label: l('parasiteV', '寄生V'),
        effects: [
          effect('epDamage', 'player', 10, { attackAttribute: 'love', epDamageParts: ['V'] }),
          effect('hpDamage', 'self', 1, { percentOf: 'selfCurrentHp', attackAttribute: 'love' }),
          effect('status', 'player', 1, { status: 'InfestedV_Slime', stacks: 1 }),
        ],
        conditions: hasIntrudedV,
        flavors: {
          onIntent: [{ kind: 'narration', text: l('The slime sends its core deep inside {player}\'s V.', 'スライムは{player}のVの奥深くに自身のコアを送り込んできた。') }],
        },
      }),
      defineEnemyIntent({
        label: l('parasiteA', '寄生A'),
        effects: [
          effect('epDamage', 'player', 10, { attackAttribute: 'love', epDamageParts: ['A'] }),
          effect('hpDamage', 'self', 1, { percentOf: 'selfCurrentHp', attackAttribute: 'love' }),
          effect('status', 'player', 1, { status: 'InfestedA_Slime', stacks: 1 }),
        ],
        conditions: hasIntrudedA,
        flavors: {
          onIntent: [{ kind: 'narration', text: l('The slime sends its core deep inside {player}\'s A.', 'スライムは{player}のAの奥深くに自身のコアを送り込んできた。') }],
        },
      }),
    ],
  },
};
