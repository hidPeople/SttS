import type { EnemyDefinition, StatusEffect } from '../models/types';
import { text as l } from '../models/localization';
import { condition, defineEnemyIntent, effect } from './effectBuilders';

const intruded: StatusEffect[] = ['IntrudedA', 'IntrudedV'];
const charmIntentConditions = [
  condition('status', 'has', { target: 'self', status: 'Charm', causeStatus: 'Charm' }),
  condition('status', 'has', { target: 'player', status: 'Fainted', causeStatus: 'Fainted' }),
  condition('status', 'has', { target: 'player', status: 'Bound', causeStatus: 'Bound' }),
];
const notIntruded = [condition('status', 'notHas', { target: 'self', statuses: intruded })];
const hasIntruded = [condition('status', 'has', { target: 'self', statuses: intruded })];
const hasIntrudedA = [condition('status', 'has', { target: 'self', status: 'IntrudedA' })];
const hasIntrudedV = [condition('status', 'has', { target: 'self', status: 'IntrudedV' })];
const notIntrudedM = [condition('status', 'notHas', { target: 'self', status: 'IntrudedM' })];
const hasBothIntruded = [...hasIntrudedA, ...hasIntrudedV];
const hasOnlyIntrudedA = [...hasIntrudedA, condition('status', 'notHas', { target: 'self', status: 'IntrudedV' })];
const hasOnlyIntrudedV = [...hasIntrudedV, condition('status', 'notHas', { target: 'self', status: 'IntrudedA' })];
const bindingIntentConditions = [condition('status', 'has', { target: 'self', status: 'Binding', causeStatus: 'Binding' })];

export const ENEMY_DEFINITIONS: Record<string, EnemyDefinition> = {
  PeakMachine: {
    id: 'PeakMachine',
    name: l('Peak Machine', 'ピークマシン'),
    maxHp: 1,
    maxEp: 0,
    stages: [100],
    threat: 100,
    intentEConditions: [],
    deathNarrations: [
      { cause: 'hpDamage', text: l('{enemy} was destroyed.', '{enemy}を破壊した。') },
    ],
    intents: [
      defineEnemyIntent({
        label: l('idling', 'アイドリング'),
        effects: [effect('status', 'player', 1, { status: 'Horny', stacks: 1 }),],
        conditions: notIntruded,
        flavors: {
          onIntent: [
            {
              conditions: [condition('status', 'has', { target: 'player', statuses: ['CravingForPeaks', 'Frustrated'] })],
              lines: [
                { kind: 'narration', text: l('The monotonous movement of the machine is transfixing.', '機械の単調な動きから目が離せない。') },
              ],
            },
            {
              lines: [
                { kind: 'narration', text: l('The machine continues to move slowly.', '機械はゆっくりと動き続けている。') },
              ],
            },
            {
              conditions: [condition('status', 'gte', { target: 'player', status: 'Lingering', value: 10 })],
              lines: [
                { kind: 'quote', text: l('"N-No, I really can\'t take any more!"', '「も、もうこれ以上はヤバい！」') },
              ],
            },
            {
              conditions: [condition('status', 'gte', { target: 'player', status: 'Lingering', value: 3 })],
              lines: [
                { kind: 'quote', text: l('"I don\'t think I can take any more..."', '「……これ以上は無理かも……」') },
              ],
            },
            {
              conditions: [condition('status', 'has', { target: 'player', status: 'CravingForPeaks' })],
              lines: [
                { kind: 'quote', text: l('"I can\'t hold back anymore! Only one time... It\'s just for one time...!"', '「もう我慢できない！1回だけ……1回入れるだけだから……！」') },
              ],
            },
            {
              conditions: [condition('status', 'has', { target: 'player', status: 'Frustrated' })],
              lines: [
                { kind: 'quote', text: l('"I\'m just going to put it in once..."', '「1回入れるだけなら……」') },
              ],
            },
            {
              conditions: [condition('status', 'has', { target: 'player', statuses: ['Horny', 'Heat'] })],
              lines: [
                { kind: 'quote', text: l('"Just a little bit... wouldn\'t hurt..."', '「ちょっとだけなら……痛くないよね…」') },
              ],
            },
            {
              lines: [
                { kind: 'quote', text: l('"What if this is inserted into me...?"', '「……もしこれを挿入したら……。」') },
              ],
            },
          ],
        },
      }),
      defineEnemyIntent({
        label: l('forced Peak', '強制ピーク'),
        effects: [effect('epDamage', 'player', 150, { attackAttribute: 'love', epDamageParts: ['V'] })],
        conditions: hasIntruded,
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
    deathNarrations: [
      { cause: 'hpDamage', text: l('{enemy} was defeated.', '{enemy}を倒した。') },
      { cause: 'hpDrain', text: l('{enemy} was drained dry.', '{enemy}の精気を吸いつくした。') },
    ],
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
    deathNarrations: [
      { cause: 'selfHpDamage', intentIds: ['parasiteA', 'parasiteV'], text: l('{enemy} burrowed deep into {player} and infested her.', '{enemy}は{player}の体内に深く潜り込み寄生した。') },
      { cause: 'hpDamage', requiredStatuses: ['IntrudedA'], text: l('{enemy}\'s core was destroyed. Its body inside {player}\'s A lost control and spilled out.', '{enemy}のコアを破壊した。Aに侵入していた{enemy}の体が制御を失ってこぼれ出た。') },
      { cause: 'hpDamage', requiredStatuses: ['IntrudedV'], text: l('{enemy}\'s core was destroyed. Its body inside {player}\'s V lost control and spilled out.', '{enemy}のコアを破壊した。Vに侵入していた{enemy}の体が制御を失ってこぼれ出た。') },
      { cause: 'hpDamage', text: l('{enemy}\'s core was destroyed, leaving only liquid behind.', '{enemy}のコアを破壊し、ただの液体になった。') },
    ],
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
        id: 'parasiteV',
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
        id: 'parasiteA',
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
        id: 'parasiteV',
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
        id: 'parasiteA',
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
  slimeColony: {
    id: 'slimeColony',
    name: l('Slime Colony', 'スライム群生体'),
    maxHp: 240,
    maxEp: 0,
    stages: [1],
    threat: 5,
    isGiant: true,
    intentEConditions: charmIntentConditions,
    intentBConditions: bindingIntentConditions,
    deathNarrations: [
      { cause: 'selfHpDamage', intentIds: ['parasiteA', 'parasiteV', 'doubleParasite'], text: l('{enemy} burrowed deep into {player} and infested her.', '{enemy}は{player}の体内に深く潜り込み寄生した。') },
      { cause: 'hpDamage', requiredStatuses: ['IntrudedA'], text: l('All cores of {enemy} were destroyed. Its body inside {player}\'s A lost control and spilled out.', '{enemy}のコアを全て破壊した。Aに侵入していた{enemy}の体が制御を失ってこぼれ出た。') },
      { cause: 'hpDamage', requiredStatuses: ['IntrudedV'], text: l('All cores of {enemy} were destroyed. Its body inside {player}\'s V lost control and spilled out.', '{enemy}のコアを全て破壊した。Vに侵入していた{enemy}の体が制御を失ってこぼれ出た。') },
      { cause: 'hpDamage', text: l('All cores of {enemy} were destroyed, leaving only liquid behind.', '{enemy}のコアを全て破壊し、ただの液体になった。') },
    ],
    intents: [
      defineEnemyIntent({
        id: 'cover',
        label: l('Cover', '覆いかぶさる'),
        chance: 0.4,
        chanceBonusStatus: 'Lingering',
        chanceBonusTarget: 'player',
        chanceBonusPerStack: 0.01,
        effects: [
          effect('status', 'player', 1, { status: 'Bound', stacks: 1 }),
          effect('status', 'self', 1, { status: 'Binding', stacks: 1 }),
          effect('epDamage', 'player', 10, { attackAttribute: 'mucus', epDamageParts: ['B', 'C'] }),
        ],
        flavors: {
          onIntent: [{ kind: 'narration', text: l('The slime colony tries to smother {player}.', 'スライム群生体が{player}に覆いかぶさろうとする。') }],
        },
      }),
      defineEnemyIntent({
        label: l('mucus', '粘液'),
        effects: [effect('epDamage', 'player', 4, { attackAttribute: 'mucus', epDamageParts: ['B', 'C'] })],
      }),
      defineEnemyIntent({
        id: 'doubleParasite',
        label: l('Double parasite', '両穴寄生'),
        effects: [
          effect('epDamage', 'player', 10, { attackAttribute: 'love', epDamageParts: ['A', 'V'] }),
          effect('hpDamage', 'self', 80, { attackAttribute: 'love' }),
          effect('status', 'player', 1, { status: 'InfestedA_Slime', stacks: 1 }),
          effect('status', 'player', 1, { status: 'InfestedV_Slime', stacks: 1 }),
        ],
        conditions: hasBothIntruded,
      }),
      defineEnemyIntent({
        id: 'parasiteV',
        label: l('parasiteV', '寄生V'),
        effects: [
          effect('epDamage', 'player', 10, { attackAttribute: 'love', epDamageParts: ['V'] }),
          effect('hpDamage', 'self', 40, { attackAttribute: 'love' }),
          effect('status', 'player', 1, { status: 'InfestedV_Slime', stacks: 1 }),
        ],
        conditions: hasIntrudedV,
      }),
      defineEnemyIntent({
        id: 'parasiteA',
        label: l('parasiteA', '寄生A'),
        effects: [
          effect('epDamage', 'player', 10, { attackAttribute: 'love', epDamageParts: ['A'] }),
          effect('hpDamage', 'self', 40, { attackAttribute: 'love' }),
          effect('status', 'player', 1, { status: 'InfestedA_Slime', stacks: 1 }),
        ],
        conditions: hasIntrudedA,
      }),
    ],
    intents_E: [
      defineEnemyIntent({
        id: 'cover',
        label: l('Cover', '覆いかぶさる'),
        chance: 0.4,
        chanceBonusStatus: 'Lingering',
        chanceBonusTarget: 'player',
        chanceBonusPerStack: 0.01,
        effects: [
          effect('status', 'player', 1, { status: 'Bound', stacks: 1 }),
          effect('status', 'self', 1, { status: 'Binding', stacks: 1 }),
          effect('epDamage', 'player', 10, { attackAttribute: 'mucus', epDamageParts: ['B', 'C'] }),
        ],
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
        label: l('IntrudedA', '侵入A'),
        effects: [
          effect('epDamage', 'player', 4, { attackAttribute: 'love', epDamageParts: ['A'] }),
          effect('status', 'self', 1, { status: 'IntrudedA', stacks: 1 }),
        ],
        conditions: notIntruded,
      }),
      defineEnemyIntent({
        id: 'doubleParasite',
        label: l('Double parasite', '両穴寄生'),
        effects: [
          effect('epDamage', 'player', 10, { attackAttribute: 'love', epDamageParts: ['A', 'V'] }),
          effect('hpDamage', 'self', 80, { attackAttribute: 'love' }),
          effect('status', 'player', 1, { status: 'InfestedA_Slime', stacks: 1 }),
          effect('status', 'player', 1, { status: 'InfestedV_Slime', stacks: 1 }),
        ],
        conditions: hasBothIntruded,
      }),
      defineEnemyIntent({
        id: 'parasiteV',
        label: l('parasiteV', '寄生V'),
        effects: [
          effect('epDamage', 'player', 10, { attackAttribute: 'love', epDamageParts: ['V'] }),
          effect('hpDamage', 'self', 40, { attackAttribute: 'love' }),
          effect('status', 'player', 1, { status: 'InfestedV_Slime', stacks: 1 }),
        ],
        conditions: hasIntrudedV,
      }),
      defineEnemyIntent({
        id: 'parasiteA',
        label: l('parasiteA', '寄生A'),
        effects: [
          effect('epDamage', 'player', 10, { attackAttribute: 'love', epDamageParts: ['A'] }),
          effect('hpDamage', 'self', 40, { attackAttribute: 'love' }),
          effect('status', 'player', 1, { status: 'InfestedA_Slime', stacks: 1 }),
        ],
        conditions: hasIntrudedA,
      }),
    ],
    intents_B: [
      defineEnemyIntent({
        label: l('IntrudedM', '侵入M'),
        effects: [
          effect('epDamage', 'player', 4, { attackAttribute: 'love', epDamageParts: ['M'] }),
          effect('status', 'self', 1, { status: 'IntrudedM', stacks: 1 }),
        ],
        conditions: notIntrudedM,
        flavors: {
          onIntent: [
            { kind: 'narration', text: l('The slime pries open {player}\'s mouth and burrows deep into her throat.', 'スライムは口をこじ開け喉の奥まで潜り込んできた。') },
          ],
        },
      }),
      defineEnemyIntent({
        label: l('Double intrusion', '両穴侵入'),
        effects: [
          effect('status', 'self', 1, { status: 'IntrudedA', stacks: 1 }),
          effect('status', 'self', 1, { status: 'IntrudedV', stacks: 1 }),
          effect('epDamage', 'player', 10, { attackAttribute: 'love', epDamageParts: ['A', 'V'] }),
        ],
      }),
      defineEnemyIntent({
        id: 'doubleParasite',
        label: l('Double parasite', '両穴寄生'),
        effects: [
          effect('epDamage', 'player', 10, { attackAttribute: 'love', epDamageParts: ['A', 'V'] }),
          effect('hpDamage', 'self', 80, { attackAttribute: 'love' }),
          effect('status', 'player', 1, { status: 'InfestedA_Slime', stacks: 1 }),
          effect('status', 'player', 1, { status: 'InfestedV_Slime', stacks: 1 }),
        ],
        conditions: hasBothIntruded,
      }),
      defineEnemyIntent({
        id: 'parasiteV',
        label: l('parasiteV', '寄生V'),
        effects: [
          effect('epDamage', 'player', 10, { attackAttribute: 'love', epDamageParts: ['V'] }),
          effect('hpDamage', 'self', 40, { attackAttribute: 'love' }),
          effect('status', 'player', 1, { status: 'InfestedV_Slime', stacks: 1 }),
        ],
        conditions: hasOnlyIntrudedV,
      }),
      defineEnemyIntent({
        id: 'parasiteA',
        label: l('parasiteA', '寄生A'),
        effects: [
          effect('epDamage', 'player', 10, { attackAttribute: 'love', epDamageParts: ['A'] }),
          effect('hpDamage', 'self', 40, { attackAttribute: 'love' }),
          effect('status', 'player', 1, { status: 'InfestedA_Slime', stacks: 1 }),
        ],
        conditions: hasOnlyIntrudedA,
      }),
      defineEnemyIntent({
        label: l('Sea of acidic mucus', '酸性粘液の海'),
        effects: [
          effect('hpDamage', 'player', 10, { attackAttribute: 'love' }),
          effect('epDamage', 'player', 5, { attackAttribute: 'love', epDamageParts: ['B', 'C', 'V', 'A'] }),
        ],
      }),
    ],
  },};

