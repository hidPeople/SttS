import { EFFECT_TIMINGS, type EnemyDefinition, type StatusEffect } from '../models/types';
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
const playerNotBound = [condition('status', 'notHas', { target: 'player', status: 'Bound' })];
const manIntrusionPart = l('Cock', 'ペニス');
const dildoIntrusionPart = l('Dildo', 'ディルド');
const slimeIntrusionPart = l('the slime body', 'スライムの体');
const slimeColonyIntrusionPart = l('part of the slime colony', 'スライム群生体の一部');

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
    intrusionPart: slimeIntrusionPart,
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
    intrusionPart: slimeColonyIntrusionPart,
    statusTriggers: {
      Binding: [
        {
          timing: EFFECT_TIMINGS.TurnStart,
          order: 41,
          effects: [effect('epDamage', 'player', 4, { attackAttribute: 'mucus', epDamageParts: ['B', 'C'] })],
          flavors: {
            onTrigger: [
              { kind: 'narration', text: l('{player} is continuously squeezed inside the slime colony\'s soft body.', '{player}はスライムの柔らかな体内で、全身を圧搾され続けている。') },
            ],
          },
        },
      ],
    },
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
        chance: 0.2,
        chanceBonusStatus: 'Lingering',
        chanceBonusTarget: 'player',
        chanceBonusPerStack: 0.2,
        conditions: playerNotBound,
        effects: [
          effect('status', 'player', 1, { status: 'Bound', stacks: 1 }),
          effect('status', 'self', 1, { status: 'Binding', stacks: 1 }),
          effect('epDamage', 'player', 10, { attackAttribute: 'mucus', epDamageParts: ['B', 'C'] }),
        ],
        flavors: {
          onIntentWarning: [{ kind: 'narration', text: l('{enemy} is looking for a chance to bind {player}.', '{enemy}は{player}の拘束を狙っている。') }],
          onIntent: [
            {
              conditions: [condition('status', 'gte', { target: 'player', status: 'Lingering', value: 4 })],
              lines: [
                { kind: 'quote', text: l('"...hah♡... hah♡... hah♡..."', '「……はっ♡……はっ♡…はっ♡…」') },
                { kind: 'narration', text: l('{player} sits on the ground in the afterglow of Peak, breathing shallowly.', '{player}はPeakの余韻で地面に座り込み、浅い呼吸を繰り返している。') },
              ],
            },
            {
              conditions: [condition('status', 'eq', { target: 'player', status: 'Lingering', value: 3 })],
              lines: [
                { kind: 'quote', text: l('"...fuu♡... fuu♡..."', '「……ふーっ♡……ふーっ♡……」') },
                { kind: 'narration', text: l('{player} cannot run properly, her legs weakened by the afterglow of Peak.', '{player}はPeakの余韻で腰が砕けて上手に走れない。') },
              ],
            },
            {
              conditions: [condition('status', 'eq', { target: 'player', status: 'Lingering', value: 2 })],
              lines: [
                { kind: 'quote', text: l('"...hah♡... hah♡..."', '「……はぁっ♡……はぁっ♡……」') },
                { kind: 'narration', text: l('{player} is doing all she can to suppress the afterglow of Peak.', '{player}はPeakの余韻を押し殺すのに精一杯だ。') },
              ],
            },
            {
              conditions: [condition('status', 'eq', { target: 'player', status: 'Lingering', value: 1 })],
              lines: [
                { kind: 'quote', text: l('"Hah... hah..."', '「はぁ……はぁ……」') },
                { kind: 'narration', text: l('{player} is short of breath from the afterglow of Peak.', '{player}はPeakの余韻で息が上がっている。') },
              ],
            },
            {
              lines: [
                { kind: 'narration', text: l('The slime colony tries to smother {player}.', 'スライム群生体が{player}に覆いかぶさろうとする。') },
              ],
            },
          ],
          onChanceSuccess: [
            { kind: 'narration', text: l('The slime colony catches up to {player} before she can escape and engulfs her.', '逃げ切れない{player}にスライム群生体が追いつき、そのまま覆いかぶさった。') },
          ],
          onChanceFailure: [
            { kind: 'narration', text: l('{player} barely slips away from the slime colony as it crashes down over her.', '{player}は覆いかぶさってくるスライム群生体から、なんとか逃げ切った。') },
          ],
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
        flavors: {
          onIntent: [{ kind: 'narration', text: l('The slime colony separates two cores and sends them deep into {player}\'s V and A at the same time.', 'スライム群生体は2つのコアを切り離して、{player}のVとAの奥深くへ同時に送り込んできた。') }],
        },
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
        flavors: {
          onIntent: [{ kind: 'narration', text: l('The slime detaches and sends its core deep inside {player}\'s V.', 'スライム群生体は自身のコアを切り離して、{player}のVの奥深くに送り込んできた。') }],
        },
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
        flavors: {
          onIntent: [{ kind: 'narration', text: l('The slime detaches and sends its core deep inside {player}\'s A.', 'スライム群生体は自身のコアを切り離して、{player}のAの奥深くに送り込んできた。') }],
        },
      }),
    ],
    intents_E: [
      defineEnemyIntent({
        id: 'cover',
        label: l('Cover', '覆いかぶさる'),
        conditions: playerNotBound,
        effects: [
          effect('status', 'player', 1, { status: 'Bound', stacks: 1 }),
          effect('status', 'self', 1, { status: 'Binding', stacks: 1 }),
          effect('epDamage', 'player', 10, { attackAttribute: 'mucus', epDamageParts: ['B', 'C'] }),
        ],
        flavors: {
          onIntentWarning: [{ kind: 'narration', text: l('{enemy} is looking for a chance to bind {player}.', '{enemy}は{player}の拘束を狙っている。') }],
          onIntent: [
            {
              conditions: [condition('status', 'has', { target: 'self', status: 'Charm' })],
              lines: [
                { kind: 'narration', text: l('Drawn in by {player}, the slime colony willingly spreads over her.', '{player}に誘惑されるがまま、スライム群生体はその体へ覆いかぶさってきた。') },
              ],
            },
            {
              conditions: [condition('status', 'has', { target: 'player', status: 'Fainted' })],
              lines: [
                { kind: 'narration', text: l('The slime colony spreads over the motionless {player}.', '動かない{player}の体に、スライム群生体が覆いかぶさってきた。') },
              ],
            },
            {
              lines: [
                { kind: 'narration', text: l('The slime colony spreads over {player}.', 'スライム群生体が{player}に覆いかぶさった。') },
              ],
            },
          ],
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
          onIntent: [{ kind: 'narration', text: l('The slime colony stretches part of its body and slips it deep into {player}\'s V.', 'スライム群生体は体の一部を伸ばし、{player}のVへぬるりと潜り込ませてきた。') }],
        },
      }),
      defineEnemyIntent({
        label: l('IntrudedA', '侵入A'),
        effects: [
          effect('epDamage', 'player', 4, { attackAttribute: 'love', epDamageParts: ['A'] }),
          effect('status', 'self', 1, { status: 'IntrudedA', stacks: 1 }),
        ],
        conditions: notIntruded,
        flavors: {
          onIntent: [{ kind: 'narration', text: l('The slime colony stretches part of its body and slips it deep into {player}\'s A.', 'スライム群生体は体の一部を伸ばし、{player}のAへぬるりと潜り込ませてきた。') }],
        },
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
        flavors: {
          onIntent: [{ kind: 'narration', text: l('The slime colony separates two cores and sends them deep into {player}\'s V and A at the same time.', 'スライム群生体は2つのコアを切り離して、{player}のVとAの奥深くへ同時に送り込んできた。') }],
        },
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
        flavors: {
          onIntent: [{ kind: 'narration', text: l('The slime detaches and sends its core deep inside {player}\'s V.', 'スライム群生体は自身のコアを切り離して、{player}のVの奥深くに送り込んできた。') }],
        },
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
        flavors: {
          onIntent: [{ kind: 'narration', text: l('The slime detaches and sends its core deep inside {player}\'s A.', 'スライム群生体は自身のコアを切り離して、{player}のAの奥深くに送り込んできた。') }],
        },
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
        flavors: {
          onIntent: [{ kind: 'narration', text: l('The slime colony forces {player}\'s legs open and pushes part of its body into both V and A.', 'スライム群生体は拘束した{player}の足を開かせ、体の一部をVとAの両方へ潜り込ませてきた。') }],
        },
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
        flavors: {
          onIntent: [{ kind: 'narration', text: l('The slime colony separates two cores and sends them deep into {player}\'s V and A at the same time.', 'スライム群生体は2つのコアを切り離して、{player}のVとAの奥深くへ同時に送り込んできた。') }],
        },
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
        flavors: {
          onIntent: [{ kind: 'narration', text: l('The slime detaches and sends its core deep inside {player}\'s V.', 'スライム群生体は自身のコアを切り離して、{player}のVの奥深くに送り込んできた。') }],
        },
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
        flavors: {
          onIntent: [{ kind: 'narration', text: l('The slime detaches and sends its core deep inside {player}\'s A.', 'スライム群生体は自身のコアを切り離して、{player}のAの奥深くに送り込んできた。') }],
        },
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

