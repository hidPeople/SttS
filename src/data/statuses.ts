import {
  EFFECT_TIMINGS,
  EP_DAMAGE_PARTS,
  FLAVOR_EVENTS,
  type EffectTiming,
  type EpDamagePart,
  type StatusDefinition,
  type StatusEffect,
  type StatusModifierDefinition,
} from '../models/types';
import { text as l } from '../models/localization';
import { condition, effect } from './effectBuilders';

function defineStatus(input: StatusDefinition): StatusDefinition {
  return input;
}

export type SensitivityLevel = 1 | 2 | 3 | 4 | 5;
export type SensitivityLevelConfig = {
  requiredPeakCount: number;
  requiredEpDamage: number;
  conditionMode: 'or' | 'and';
  epDamageMultiplier: number;
};

/** Shared by all parts. Both totals accumulate per part throughout the run. */
export const PART_SENSITIVITY_LEVELS: Record<SensitivityLevel, SensitivityLevelConfig> = {
  1: { requiredPeakCount: 20, requiredEpDamage: 100, conditionMode: 'or', epDamageMultiplier: 1.2 },
  2: { requiredPeakCount: 90, requiredEpDamage: 450, conditionMode: 'or', epDamageMultiplier: 1.5 },
  3: { requiredPeakCount: 320, requiredEpDamage: 1600, conditionMode: 'or', epDamageMultiplier: 2 },
  4: { requiredPeakCount: 600, requiredEpDamage: 3000, conditionMode: 'or', epDamageMultiplier: 3 },
  5: { requiredPeakCount: 1000, requiredEpDamage: 5000, conditionMode: 'or', epDamageMultiplier: 5 },
};

export type SensitivityStatusEffect = Extract<StatusEffect, `${EpDamagePart}SensitivityLv${SensitivityLevel}`>;

export function sensitivityStatusId(part: EpDamagePart, level: SensitivityLevel): SensitivityStatusEffect {
  return `${part}SensitivityLv${level}` as SensitivityStatusEffect;
}

function defineSensitivityStatuses(): Record<SensitivityStatusEffect, StatusDefinition> {
  return EP_DAMAGE_PARTS.reduce((definitions, part) => {
    for (let level = 1; level <= 5; level += 1) {
      const sensitivityLevel = level as SensitivityLevel;
      definitions[sensitivityStatusId(part, sensitivityLevel)] = defineStatus({
        name: l(`${part} Sensitivity Lv.${sensitivityLevel}`, `${part}開発 Lv.${sensitivityLevel}`),
        description: l(
          `${part} Sensitivity Lv.${sensitivityLevel}: {default${part}} sensitivity level ${sensitivityLevel}. EP damage to this part is increased.`,
          `${part}開発 Lv.${sensitivityLevel}：{default${part}}の感度Lv.${sensitivityLevel}。この部位に受けるEPダメージが増加する。`,
        ),
        remain: 1,
        consumeEachTurn: 0,
        allowedOwners: ['player'],
        noticeLevel: 'important',
        iconText: `${part}${sensitivityLevel}`,
        iconColor: 0xc24c8a,
        triggers: [],
      });
    }

    return definitions;
  }, {} as Record<SensitivityStatusEffect, StatusDefinition>);
}

function epDamageTakenMultiplier(amount: number): StatusModifierDefinition {
  return {
    kind: 'epDamageTakenMultiplier',
    amount,
    target: 'player',
  };
}

function hpDamageTakenMultiplier(amount: number): StatusModifierDefinition {
  return {
    kind: 'hpDamageTakenMultiplier',
    amount,
    target: 'player',
  };
}

function epMaxMultiplier(amount: number): StatusModifierDefinition {
  return {
    kind: 'epMaxMultiplier',
    amount,
    target: 'player',
  };
}

export const STATUS_DESCRIPTIONS: Record<StatusEffect, StatusDefinition> = {
  Starvation: defineStatus({
    name: l('Starvation', '飢餓'),
    description: l('Starvation: Severe hunger and thirst prevent energy recovery. Take 1 HP damage on Peak. After two HP drains, becomes Hunger.', '飢餓：強烈な飢えと渇きで身体が動かない。ターン開始時を含めエナジーが回復しない。Peak時HPに1ダメージ。HPドレインを2回行うと空腹に変化。'),
    remain: 0, consumeEachTurn: 0, allowedOwners: ['player'], singleStack: true,
    iconText: '餓', iconColor: 0x85643b,
    preventEnergyRecovery: true,
    hpDrainProgress: { count: 2, nextStatus: 'Hunger' },
    triggers: [{ timing: EFFECT_TIMINGS.PlayerEpPeak, effects: [effect('hpDamage', 'player', 1)] }],
    flavors: {
      [FLAVOR_EVENTS.Status.EnergyRecoveryBlocked]: [
        { kind: 'quote', text: l('"...Ugh... w... water..."', '「……ぅ……み、……みず…………」') },
        { kind: 'narration', text: l('{player} cannot move from severe hunger and thirst.', '{player}は強烈な飢えと渇きで身体が動かない。') },
      ],
    },
  }),
  Hunger: defineStatus({
    name: l('Hunger', '空腹'),
    description: l('Hunger: Too hungry to regain strength. Start each turn with 1 energy. Removed after two HP drains.', '空腹：お腹が空いて力が出ない。ターン開始時のエナジー回復量が1になる。HPドレインを2回行うと解除。'),
    remain: 0, consumeEachTurn: 0, allowedOwners: ['player'], singleStack: true,
    iconText: '空', iconColor: 0xac8652,
    turnStartEnergy: 1,
    hpDrainProgress: { count: 2 },
    triggers: [],
    flavors: {
      [FLAVOR_EVENTS.Status.EnergyRecoveryBlocked]: [
        { kind: 'quote', text: l('"...Ugh... I am hungry... still not enough..."', '「……うぅ……お腹空いた……足りない……」') },
        { kind: 'narration', text: l('{player} feels faint from hunger.', '{player}はお腹が減ってフラフラだ。') },
      ],
    },
  }),
  ExtremeFatigue: defineStatus({
    name: l('Extreme Fatigue', '極限疲労'),
    description: l('Extreme Fatigue: Too exhausted to move. Cannot draw at turn start. Incoming EP damage becomes 1. Removed when HP exceeds one quarter of maximum HP.', '極限疲労：体力が限界を迎えて身体が動かない。ターン開始時にドローできない。受けるEPダメージが1になる。HPが最大値の1/4を超えると解除。'),
    remain: 0, consumeEachTurn: 0, allowedOwners: ['player'], singleStack: true,
    iconText: '疲', iconColor: 0x65717d,
    preventTurnStartDraw: true, receivedEpDamage: 1, removeAboveHpRatio: 0.25,
    triggers: [],
    flavors: { [FLAVOR_EVENTS.Status.EpDamageOverridden]: [{ kind: 'narration', text: l('', '') }] },
  }),
  ...defineSensitivityStatuses(),
  Charm: defineStatus({
    name: l('Charm', '誘惑'),
    description: l('Charm: The next enemy attack uses the charm intent pool. One stack is consumed when it takes effect.', '誘惑：次の敵行動が誘惑時行動になる。発動時に1スタック消費。'),
    remain: 0,
    consumeEachTurn: 1,
    allowedOwners: ['enemy'],
    iconText: 'Ch',
    iconColor: 0xe14f9d,
    triggers: [
      {
        timing: EFFECT_TIMINGS.TurnStart,
        effects: [],
      },
    ],
  }),
  Aftershocks: defineStatus({
    name: l('Peak Aftershocks', 'Peak余韻'),
    description: l('Peak Aftershocks: At the start of your turn, lose 1 energy per {aftershocksStacksPerEnergy} stacks while energy remains.', 'Peak余韻：ターン開始時、エナジーが残っている限り{aftershocksStacksPerEnergy}スタックごとにエナジーを1失う。'),
    remain: 0,
    consumeEachTurn: 1,
    allowedOwners: ['player'],
    iconText: 'Li',
    iconColor: 0x9b6ef3,
    triggers: [
      {
        timing: EFFECT_TIMINGS.TurnStart,
        consumeRule: 'allWhileEnergy',
        stacksPerEnergy: 2,
        order: 10,
        effects: [
          effect('energyGain', 'player', -1),
        ],
        visuals: ['breathAndEnergyPulse'],
      },
    ],
  }),
  Aphrodisiac: defineStatus({
    name: l('Aphrodisiac', '媚薬状態'),
    descriptionsByOwner: {
      enemy: l('Aphrodisiac: Increases EP damage taken. Reapplication refreshes the duration without stacking.', '媚薬状態：受けるEPダメージが増加する。再付与で持続時間を更新し、重ね掛けでは効果量が増えない。'),
    },
    description: l('Aphrodisiac: EP damage taken increases. Duration refreshes on reapplication. Player: prevents turn-start EP recovery and enables status transfer(Mucosal contact).', '媚薬状態：被EPダメージが増加。再付与で持続時間を更新。プレイヤーはターン開始時のEP自然回復を停止し、粘膜接触した相手も媚薬状態にする。'),
    remain: 1,
    consumeEachTurn: 0,
    allowedOwners: ['player', 'enemy'],
    durationTurns: 3,
    requiresEp: true,
    blockedEnemyTraits: ['sexToy', 'softBody'],
    preventTurnStartEpRecovery: true,
    trackActiveTurns: true,
    idlePeakRule: { turns: 2, status: 'Horny', stacks: 1 },
    spreadRule: {
      appliedStatuses: ['InsertA', 'InsertV', 'InsertM', 'IntrudedA', 'IntrudedV', 'IntrudedM'],
      cardSelfEpDamageParts: ['M', 'V', 'A'],
      cardTarget: 'cardDamagedEnemies',
    },
    iconText: 'Ap',
    iconColor: 0xb85fd6,
    flavors: {
      [FLAVOR_EVENTS.Status.Apply]: [
        {
          conditions: [condition('flavorValue', 'eq', { valueKey: 'statusTargetIsPlayer', value: true })],
          lines: [
            { kind: 'quote', text: l("Stop...♡ That will make me feel strange!♡♡", '「やめっ……♡ それ、変になるからっ！♡♡」') },
            { kind: 'quote', text: l("Again!? Deep inside♡ ...You're making me strange♡♡", '「また！？これ奥っ♡ ……変にされちゃう♡♡」') },
          ],
        },
        {
          conditions: [condition('flavorValue', 'eq', { valueKey: 'statusTargetIsEnemy', value: true })],
          lines: [
            { kind: 'narration', text: l('{player} rubs aphrodisiac-tainted fluids into {enemy}.', '{player}は{enemy}に、媚薬に侵された体液を塗り込んだ') },
          ],
        },
      ],
    },
    triggers: [{
      timing: EFFECT_TIMINGS.DamageCalculation,
      effects: [],
      modifiers: [
        { kind: 'epDamageTakenMultiplier', target: 'statusOwner', amount: 1.5 },
      ],
    }],
  }),
  Horny: defineStatus({
    name: l('Horny', 'ムラムラ'),
    description: l('Horny: EP damage received is multiplied by 1.5. Clears at Peak and grants 1 energy.', 'ムラムラ：受けるEPダメージが1.5倍。Peak時に解除され、エナジーを1得る。'),
    remain: 1,
    consumeEachTurn: 0,
    allowedOwners: ['player'],
    applyConditions: [condition('status', 'notHas', { target: 'player', status: 'Fainted' })],
    iconText: 'Ho',
    iconColor: 0xef5da8,
    exclusiveGroup: 'arousal',
    groupRank: 1,
    triggers: [
      {
        timing: EFFECT_TIMINGS.TurnStart,
        order: 30,
        effects: [
          effect('addCardToHand', 'player', 1, { cardId: 'rubOne' }),
        ],
        visuals: ['addCardFromPlayerFadeIn'],
      },
      {
        timing: EFFECT_TIMINGS.DamageCalculation,
        effects: [],
        modifiers: [epDamageTakenMultiplier(1.5)],
      },
      {
        timing: EFFECT_TIMINGS.PlayerEpPeak,
        effects: [
          effect('energyGain', 'player', 1, { onlyDuringPlayerTurn: true }),
          effect('removeStatus', 'player', 1, { status: 'Horny' }),
        ],
        flavors: {
          [FLAVOR_EVENTS.Status.Trigger]: [
            { kind: 'narration', text: l('The desire is satisfied.', '欲求が満たされ満足した。') },
          ],
        },
      },
    ],
  }),
  InHeat: defineStatus({
    name: l('In Heat', '火照り'),
    description: l('In Heat: EP damage received is multiplied by 2. Clears at Peak and grants 1 energy.', '火照り：受けるEPダメージが2倍。Peak時に解除され、エナジーを1得る。'),
    remain: 1,
    consumeEachTurn: 0,
    allowedOwners: ['player'],
    iconText: 'Ht',
    iconColor: 0xf26b4f,
    exclusiveGroup: 'arousal',
    groupRank: 2,
    triggers: [
      {
        timing: EFFECT_TIMINGS.TurnStart,
        order: 30,
        effects: [
          effect('addCardToHand', 'player', 2, { cardId: 'rubOne' }),
        ],
        visuals: ['addCardFromPlayerFadeIn'],
      },
      {
        timing: EFFECT_TIMINGS.DamageCalculation,
        effects: [],
        modifiers: [epDamageTakenMultiplier(2)],
      },
      {
        timing: EFFECT_TIMINGS.PlayerEpPeak,
        effects: [
          effect('energyGain', 'player', 1, { onlyDuringPlayerTurn: true }),
          effect('removeStatus', 'player', 1, { status: 'InHeat' }),
        ],
        flavors: {
          [FLAVOR_EVENTS.Status.Trigger]: [
            { kind: 'narration', text: l('The desire is satisfied.', '欲求が満たされ満足した。') },
          ],
        },
      },
    ],
  }),
  Frustrated: defineStatus({
    name: l('Frustrated', '快楽焦燥'),
    description: l('Frustrated: EP damage received is multiplied by 3. Clears at Peak and grants 1 energy.', '快楽焦燥：受けるEPダメージが3倍。Peak時に解除され、エナジーを1得る。'),
    remain: 1,
    consumeEachTurn: 0,
    allowedOwners: ['player'],
    iconText: 'Fr',
    iconColor: 0xd9466f,
    exclusiveGroup: 'arousal',
    groupRank: 3,
    triggers: [
      {
        timing: EFFECT_TIMINGS.TurnStart,
        order: 30,
        effects: [
          effect('addCardToHand', 'player', 5, { cardId: 'rubOne' }),
        ],
        visuals: ['addCardFromPlayerFadeIn'],
        flavors: {
          [FLAVOR_EVENTS.Status.Trigger]: [
            { kind: 'narration', text: l('She can think of nothing but Peak.', 'Peakする事以外考えられない。') },
          ],
        },
      },
      {
        timing: EFFECT_TIMINGS.DamageCalculation,
        effects: [],
        modifiers: [epDamageTakenMultiplier(3)],
      },
      {
        timing: EFFECT_TIMINGS.PlayerEpPeak,
        effects: [
          effect('energyGain', 'player', 1, { onlyDuringPlayerTurn: true }),
          effect('removeStatus', 'player', 1, { status: 'Frustrated' }),
        ],
        flavors: {
          [FLAVOR_EVENTS.Status.Trigger]: [
            { kind: 'narration', text: l('The desire is satisfied.', '欲求が満たされ満足した。') },
          ],
        },
      },
    ],
  }),
  DesperateToPeak: defineStatus({
    name: l('Desperate to Peak', '快楽渇望'),
    description: l('Desperate to Peak: EP damage received is multiplied by 3. At turn start, add 5 RubOneOut. Only cards that damage your own EP can be played. At Peak, gain 1 energy and has a 10% chance to clear.', '快楽渇望：受けるEPダメージが3倍。ターン開始時、RubOneOutを5枚手札に加える。自身のEPにダメージを与えるカードしか使用できない。Peak時、エナジーを1得て10%の確率で解除される。'),
    remain: 1,
    consumeEachTurn: 0,
    allowedOwners: ['player'],
    noticeLevel: 'important',
    iconText: 'CP',
    iconColor: 0xbe185d,
    exclusiveGroup: 'arousal',
    groupRank: 4,
    triggers: [
      {
        timing: EFFECT_TIMINGS.StatusApplied,
        conditions: [condition('status', 'has', { target: 'player', statuses: ['MultiplePeak', 'PeakHell', 'MultiplePeaksTorture'] })],
        effects: [
          effect('removeStatus', 'player', 0, { status: 'DesperateToPeak' }),
        ],
      },
      {
        timing: EFFECT_TIMINGS.TurnStart,
        order: 30,
        effects: [
          effect('addCardToHand', 'player', 5, { cardId: 'rubOne' }),
        ],
        visuals: ['addCardFromPlayerFadeIn'],
        flavors: {
          [FLAVOR_EVENTS.Status.Trigger]: [
            { kind: 'narration', text: l('She can think of nothing but Peak.', 'Peakする事以外考えられない。') },
          ],
        },
      },
      {
        timing: EFFECT_TIMINGS.DamageCalculation,
        effects: [],
        modifiers: [epDamageTakenMultiplier(3)],
      },
      {
        timing: EFFECT_TIMINGS.PlayerEpPeak,
        effects: [
          effect('energyGain', 'player', 1, { onlyDuringPlayerTurn: true }),
          effect('removeStatus', 'player', 1, {
            status: 'DesperateToPeak',
            chance: 0.1,
            flavors: {
              [FLAVOR_EVENTS.Effect.ChanceSuccess]: [
                { kind: 'narration', text: l('The desire is satisfied.', '欲求が満たされ満足した。') },
              ],
              [FLAVOR_EVENTS.Effect.ChanceFailure]: [
                { kind: 'narration', text: l('The craving for Peaks is not satisfied.', 'Peakへの渇望は満たされない。') },
              ],
            },
          }),
        ],
      },
    ],
  }),
  IntrudedA: defineStatus({
    name: l('IntrudedA', '侵入A'),
    description: l('IntrudedA: At turn start, add Purge to hand. Purge removes this if it does not cause Peak, then you take 10 EP damage.', '侵入A：ターン開始時、排出を手札に加える。排出時にPeakしなければ解除され、その後10EPダメージを受ける。'),
    remain: 0,
    consumeEachTurn: 0,
    allowedOwners: ['enemy'],
    epDamageParts: ['A'],
    iconText: 'IA',
    iconColor: 0x86c75f,
    triggers: [
      {
        timing: EFFECT_TIMINGS.TurnStart,
        order: 40,
        effects: [
          effect('addCardToHand', 'player', 1, { cardId: 'purge', cardAddVariant: 'purgeForStatusOwner' }),
        ],
        visuals: ['addCardFromPlayerFadeIn'],
      },
      {
        timing: EFFECT_TIMINGS.PurgePlayed,
        conditions: [condition('purgeCausedEpPeak', 'eq', { value: false })],
        effects: [
          effect('removeStatus', 'triggerEnemy', 1, { status: 'IntrudedA' }),
          effect('epDamage', 'player', 10, { attackAttribute: 'love', epDamageParts: ['A'] }),
        ],
        flavors: {
          [FLAVOR_EVENTS.Status.Trigger]: [
            { kind: 'narration', text: l('{intrusionPart} lodged deep in {A} is pulled out at once, turning the entrance outward.', '{A}に深くまで侵入していた{intrusionPart}が一気に引き抜かれ、{A}の入口がめくれ上がる。') },
          ],
        },
      },
      {
        timing: EFFECT_TIMINGS.PurgePlayed,
        conditions: [condition('purgeCausedEpPeak', 'eq', { value: true })],
        effects: [],
        flavors: {
          [FLAVOR_EVENTS.Status.Trigger]: [
            { kind: 'narration', text: l('{enemy} fiercely resists and forces a Peak, leaving {player} unable to muster strength.', '{enemy}の激しい抵抗でPeakさせられ、力が入らない。') },
          ],
        },
      },
    ],
  }),
  IntrudedV: defineStatus({
    name: l('IntrudedV', '侵入V'),
    description: l('IntrudedV: At turn start, add Purge to hand. Purge removes this if it does not cause Peak, then you take 10 EP damage.', '侵入V：ターン開始時、排出を手札に加える。排出時にPeakしなければ解除され、その後10EPダメージを受ける。'),
    remain: 0,
    consumeEachTurn: 0,
    allowedOwners: ['enemy'],
    epDamageParts: ['V'],
    iconText: 'IV',
    iconColor: 0x6fbf73,
    triggers: [
      {
        timing: EFFECT_TIMINGS.TurnStart,
        order: 40,
        effects: [
          effect('addCardToHand', 'player', 1, { cardId: 'purge', cardAddVariant: 'purgeForStatusOwner' }),
        ],
        visuals: ['addCardFromPlayerFadeIn'],
      },
      {
        timing: EFFECT_TIMINGS.PurgePlayed,
        conditions: [condition('purgeCausedEpPeak', 'eq', { value: false })],
        effects: [
          effect('removeStatus', 'triggerEnemy', 1, { status: 'IntrudedV' }),
          effect('epDamage', 'player', 10, { attackAttribute: 'love', epDamageParts: ['V'] }),
        ],
        flavors: {
          [FLAVOR_EVENTS.Status.Trigger]: [
            { kind: 'narration', text: l('{intrusionPart} filling {V} pulls free with force, stretching the entrance as it leaves.', '{V}を一杯に満たしていた{intrusionPart}が入口を押し広げながら勢いよく抜けた。') },
          ],
        },
      },
      {
        timing: EFFECT_TIMINGS.PurgePlayed,
        conditions: [condition('purgeCausedEpPeak', 'eq', { value: true })],
        effects: [],
        flavors: {
          [FLAVOR_EVENTS.Status.Trigger]: [
            { kind: 'narration', text: l('{enemy} fiercely resists and forces a Peak, leaving {player} unable to muster strength.', '{enemy}の激しい抵抗でPeakさせられ、力が入らない。') },
          ],
        },
      },
    ],
  }),
  IntrudedM: defineStatus({
    name: l('IntrudedM', '侵入M'),
    description: l('IntrudedM: At turn start, add Purge to hand and take 2 HP damage. Purge removes this if it does not cause Peak, then you take 10 EP damage.', '侵入M：ターン開始時、排出を手札に加え、HPに2ダメージを受ける。排出時にPeakしなければ解除され、その後10EPダメージを受ける。'),
    remain: 0,
    consumeEachTurn: 0,
    allowedOwners: ['enemy'],
    epDamageParts: ['M'],
    iconText: 'IM',
    iconColor: 0x4d7c0f,
    triggers: [
      {
        timing: EFFECT_TIMINGS.TurnStart,
        order: 40,
        effects: [
          effect('addCardToHand', 'player', 1, { cardId: 'purge', cardAddVariant: 'purgeForStatusOwner' }),
          effect('hpDamage', 'player', 2, { attackAttribute: 'mucus' }),
        ],
        visuals: ['addCardFromPlayerFadeIn'],
        flavors: {
          [FLAVOR_EVENTS.Status.Trigger]: [
            { kind: 'quote', text: l('"Ugh... gurgle... hrrk..."', '「ぅ……ごぼっ……ぐぅおぇ……」') },
            { kind: 'quote', text: l('"G-gulp... gurgle... (I can\'t... breathe...)"', '「ごぽぽっ……ごぼ……(もう…息が……)」') },
            { kind: 'narration', text: l('{intrusionPart} blocks the airway, making it hard to breathe.', '{intrusionPart}で気道がふさがれ呼吸が苦しい。') },
          ],
        },
      },
      {
        timing: EFFECT_TIMINGS.PurgePlayed,
        conditions: [condition('purgeCausedEpPeak', 'eq', { value: false })],
        effects: [
          effect('removeStatus', 'triggerEnemy', 1, { status: 'IntrudedM' }),
          effect('epDamage', 'player', 10, { attackAttribute: 'love', epDamageParts: ['M'] }),
        ],
        flavors: {
          [FLAVOR_EVENTS.Status.Trigger]: [
            { kind: 'narration', text: l('{intrusionPart} forced into the back of the throat is expelled with a violent urge to vomit.', '喉奥に突っ込まれていた{intrusionPart}を強烈な嘔吐感とともに吐き出した。') },
            { kind: 'quote', text: l('"Ah... cough! ...Hah, hah... wheeze... I can... breathe... cough!..."', '「ぉあ゛ぁ……ゴホッ！……はぁ、はぁ……ヒュー……息が……できる……ゴホッ！……」') },
            { kind: 'quote', text: l('"Cough! Cough! ...Hah... wheeze... ugh, hack!"', '「ゴホッ、ゴホッ！……はぁ゛……ヒュー……ぅえ゛ぇっ、ゲホッ！」') },
          ],
        },
      },
      {
        timing: EFFECT_TIMINGS.PurgePlayed,
        conditions: [condition('purgeCausedEpPeak', 'eq', { value: true })],
        effects: [],
        flavors: {
          [FLAVOR_EVENTS.Status.Trigger]: [
            { kind: 'narration', text: l('{enemy} fiercely resists and forces a Peak, leaving {player} breathing ragged.', '{enemy}の激しい抵抗でPeakさせられ、呼吸が乱れてしまった。') },
          ],
        },
      },
    ],
  }),
  InsertA: defineStatus({
    name: l('InsertA', '挿入A'),
    description: l('InsertA: At turn start, add Pullout to hand. Pullout removes this if it does not cause Peak, then you take 5 EP damage.', '挿入A：ターン開始時、引き抜くを手札に加える。引き抜く時にPeakしなければ解除され、その後5EPダメージを受ける。'),
    remain: 0,
    consumeEachTurn: 0,
    allowedOwners: ['enemy'],
    epDamageParts: ['A'],
    iconText: 'SA',
    iconColor: 0x60a5fa,
    triggers: [
      {
        timing: EFFECT_TIMINGS.TurnStart,
        order: 40,
        effects: [
          effect('addCardToHand', 'player', 1, { cardId: 'pullout', cardAddVariant: 'pulloutForStatusOwner' }),
        ],
        visuals: ['addCardFromPlayerFadeIn'],
      },
      {
        timing: EFFECT_TIMINGS.PurgePlayed,
        conditions: [condition('purgeCausedEpPeak', 'eq', { value: false })],
        effects: [
          effect('removeStatus', 'triggerEnemy', 1, { status: 'InsertA' }),
          effect('epDamage', 'player', 5, { attackAttribute: 'love', epDamageParts: ['A'] }),
        ],
        flavors: {
          [FLAVOR_EVENTS.Status.Trigger]: [
            { kind: 'narration', text: l('{intrusionPart} inserted into {A} is pulled free.', '{defaultA}に挿入されていた{intrusionPart}を引き抜いた。') },
          ],
        },
      },
      {
        timing: EFFECT_TIMINGS.PurgePlayed,
        conditions: [condition('purgeCausedEpPeak', 'eq', { value: true })],
        effects: [],
        flavors: {
          [FLAVOR_EVENTS.Status.Trigger]: [
            { kind: 'narration', text: l('{enemy} forces a Peak during the attempt, leaving {player} unable to pull free.', '{enemy}にPeakさせられてしまい、{player}はうまく動けない。') },
          ],
        },
      },
    ],
  }),
  InsertV: defineStatus({
    name: l('InsertV', '挿入V'),
    description: l('InsertV: At turn start, add Pullout to hand. Pullout removes this if it does not cause Peak, then you take 5 EP damage.', '挿入V：ターン開始時、引き抜くを手札に加える。引き抜く時にPeakしなければ解除され、その後5EPダメージを受ける。'),
    remain: 0,
    consumeEachTurn: 0,
    allowedOwners: ['enemy'],
    epDamageParts: ['V'],
    iconText: 'SV',
    iconColor: 0x3b82f6,
    triggers: [
      {
        timing: EFFECT_TIMINGS.TurnStart,
        order: 40,
        effects: [
          effect('addCardToHand', 'player', 1, { cardId: 'pullout', cardAddVariant: 'pulloutForStatusOwner' }),
        ],
        visuals: ['addCardFromPlayerFadeIn'],
      },
      {
        timing: EFFECT_TIMINGS.PurgePlayed,
        conditions: [condition('purgeCausedEpPeak', 'eq', { value: false })],
        effects: [
          effect('removeStatus', 'triggerEnemy', 1, { status: 'InsertV' }),
          effect('epDamage', 'player', 5, { attackAttribute: 'love', epDamageParts: ['V'] }),
        ],
        flavors: {
          [FLAVOR_EVENTS.Status.Trigger]: [
            { kind: 'narration', text: l('{intrusionPart} inserted into {V} is pulled free.', '{defaultV}に挿入されていた{intrusionPart}を引き抜いた。') },
          ],
        },
      },
      {
        timing: EFFECT_TIMINGS.PurgePlayed,
        conditions: [condition('purgeCausedEpPeak', 'eq', { value: true })],
        effects: [],
        flavors: {
          [FLAVOR_EVENTS.Status.Trigger]: [
            { kind: 'narration', text: l('{enemy} forces a Peak during the attempt, leaving {player} unable to pull free.', '{enemy}にPeakさせられてしまい、{player}はうまく動けない。') },
          ],
        },
      },
    ],
  }),
  InsertM: defineStatus({
    name: l('InsertM', '挿入M'),
    description: l('InsertM: At turn start, add Pullout to hand. Pullout removes this if it does not cause Peak, then you take 5 EP damage.', '挿入M：ターン開始時、引き抜くを手札に加える。引き抜く時にPeakしなければ解除され、その後5EPダメージを受ける。'),
    remain: 0,
    consumeEachTurn: 0,
    allowedOwners: ['enemy'],
    epDamageParts: ['M'],
    iconText: 'SM',
    iconColor: 0x2563eb,
    triggers: [
      {
        timing: EFFECT_TIMINGS.TurnStart,
        order: 40,
        effects: [
          effect('addCardToHand', 'player', 1, { cardId: 'pullout', cardAddVariant: 'pulloutForStatusOwner' }),
        ],
        visuals: ['addCardFromPlayerFadeIn'],
      },
      {
        timing: EFFECT_TIMINGS.PurgePlayed,
        conditions: [condition('purgeCausedEpPeak', 'eq', { value: false })],
        effects: [
          effect('removeStatus', 'triggerEnemy', 1, { status: 'InsertM' }),
          effect('epDamage', 'player', 5, { attackAttribute: 'love', epDamageParts: ['M'] }),
        ],
        flavors: {
          [FLAVOR_EVENTS.Status.Trigger]: [
            { kind: 'narration', text: l('{intrusionPart} inserted into {M} is pulled free.', '{defaultM}に挿入されていた{intrusionPart}を引き抜いた。') },
          ],
        },
      },
      {
        timing: EFFECT_TIMINGS.PurgePlayed,
        conditions: [condition('purgeCausedEpPeak', 'eq', { value: true })],
        effects: [],
        flavors: {
          [FLAVOR_EVENTS.Status.Trigger]: [
            { kind: 'narration', text: l('{enemy} forces a Peak during the attempt, leaving {player} unable to pull free.', '{enemy}にPeakさせられてしまい、{player}はうまく吐き出せない。') },
          ],
        },
      },
    ],
  }),
  InfestedA_Slime: defineStatus({
    name: l('InfestedA (Slime)', '寄生A (スライム)'),
    description: l('InfestedA (Slime): At player action start, take 1 EP damage.', '寄生A (スライム)：プレイヤー行動開始時、1EPダメージを受ける。'),
    remain: 1,
    consumeEachTurn: 0,
    allowedOwners: ['player'],
    noticeLevel: 'important',
    epDamageParts: ['A'],
    iconText: 'FA',
    iconColor: 0xb7791f,
    triggers: [
      {
        timing: EFFECT_TIMINGS.PlayerActionStart,
        order: 20,
        effects: [
          effect('epDamage', 'player', 1, { attackAttribute: 'love', perStack: true, epDamageParts: ['A'] }),
        ],
        flavors: {
          [FLAVOR_EVENTS.Status.Trigger]: [
            { kind: 'narration', text: l('The slime wriggles deep inside {player}\'s A.', '{player}のAの奥でスライムが蠢いている。') },
            { kind: 'narration', text: l('The slime secretes mucus deep inside {player}\'s A.', '{player}のAの奥でスライムが粘液を分泌している。') },
            { kind: 'narration', text: l('The slime in {player}\'s A tries to burrow even deeper.', '{player}のAのスライムが更に奥へと潜り込もうとしている。') },
          ],
        },
      },
    ],
  }),
  InfestedV_Slime: defineStatus({
    name: l('InfestedV (Slime)', '寄生V (スライム)'),
    description: l('InfestedV (Slime): At player action start, take 1 EP damage.', '寄生V (スライム)：プレイヤー行動開始時、1EPダメージを受ける。'),
    remain: 1,
    consumeEachTurn: 0,
    allowedOwners: ['player'],
    noticeLevel: 'important',
    epDamageParts: ['V'],
    iconText: 'FV',
    iconColor: 0xb45309,
    triggers: [
      {
        timing: EFFECT_TIMINGS.PlayerActionStart,
        order: 20,
        effects: [
          effect('epDamage', 'player', 1, { attackAttribute: 'love', perStack: true, epDamageParts: ['V'] }),
        ],
        flavors: {
          [FLAVOR_EVENTS.Status.Trigger]: [
            { kind: 'narration', text: l('The slime wriggles deep inside {player}\'s V.', '{player}のVの奥でスライムが蠢いている。') },
            { kind: 'narration', text: l('The slime secretes mucus deep inside {player}\'s V.', '{player}のVの奥でスライムが粘液を分泌している。') },
            { kind: 'narration', text: l('The slime in {player}\'s V tries to burrow even deeper.', '{player}のVのスライムが更に奥へと潜り込もうとしている。') },
          ],
        },
      },
    ],
  }),
  InfestedA_AphrodisiacSlime: defineStatus({
    name: l('InfestedA (Aphrodisiac Slime)', '寄生A (媚毒スライム)'),
    description: l('InfestedA (Aphrodisiac Slime): At player action start: 1 EP damage per stack to A. Each stack independently has a 15% chance to apply Aphrodisiac; any success applies it once.', '寄生A (媚毒スライム)：プレイヤー行動開始時、スタックごとにAへ1EPダメージ。各スタックが独立して15%で抽選し、1回以上成功すると媚薬状態を付与。'),
    remain: 1, consumeEachTurn: 0, allowedOwners: ['player'], epDamageParts: ['A'],
    iconText: 'PA', iconColor: 0xa45bc4, noticeLevel: 'important',
    triggers: [{ timing: EFFECT_TIMINGS.PlayerActionStart, order: 20, effects: [
      effect('epDamage', 'player', 1, { attackAttribute: 'aphrodisiacMucus', perStack: true, epDamageParts: ['A'] }),
      effect('status', 'player', 1, {
        status: 'Aphrodisiac',
        chance: 0.15,
        chancePerStack: true,
        flavors: {
          [FLAVOR_EVENTS.Effect.ChanceSuccess]: [
            { kind: 'narration', text: l('The parasitic aphrodisiac slime injects an aphrodisiac into {AI}.', '寄生した媚毒スライムが、{AI}に媚薬を注入してきた。') },
            { kind: 'narration', text: l('The aphrodisiac slime parasitizing {defaultA} smears aphrodisiac through her body.', '{defaultA}に寄生した媚毒スライムが、体内に媚薬を塗りたくる。') },
          ],
        },
      }),
    ] }],
  }),
  InfestedV_AphrodisiacSlime: defineStatus({
    name: l('InfestedV (Aphrodisiac Slime)', '寄生V (媚毒スライム)'),
    description: l('InfestedV (Aphrodisiac Slime): At player action start: 1 EP damage per stack to V. Each stack independently has a 15% chance to apply Aphrodisiac; any success applies it once.', '寄生V (媚毒スライム)：プレイヤー行動開始時、スタックごとにVへ1EPダメージ。各スタックが独立して15%で抽選し、1回以上成功すると媚薬状態を付与。'),
    remain: 1, consumeEachTurn: 0, allowedOwners: ['player'], epDamageParts: ['V'],
    iconText: 'PV', iconColor: 0xb85fd6, noticeLevel: 'important',
    triggers: [{ timing: EFFECT_TIMINGS.PlayerActionStart, order: 20, effects: [
      effect('epDamage', 'player', 1, { attackAttribute: 'aphrodisiacMucus', perStack: true, epDamageParts: ['V'] }),
      effect('status', 'player', 1, {
        status: 'Aphrodisiac',
        chance: 0.15,
        chancePerStack: true,
        flavors: {
          [FLAVOR_EVENTS.Effect.ChanceSuccess]: [
            { kind: 'narration', text: l('The parasitic aphrodisiac slime injects an aphrodisiac into {VI}.', '寄生した媚毒スライムが、{VI}に媚薬を注入してきた。') },
            { kind: 'narration', text: l('The aphrodisiac slime parasitizing {defaultV} smears aphrodisiac through her body.', '{defaultV}に寄生した媚毒スライムが、体内に媚薬を塗りたくる。') },
          ],
        },
      }),
    ] }],
  }),
  MultiplePeak: defineStatus({
    name: l('Multiple Peak', '連続Peak'),
    description: l('Multiple Peak: At turn start, add Faint. Each Peak deals 1 HP damage and lowers EP reset floor by 1.', '連続Peak：ターン開始時、失神を手札に加える。Peakするごとに1HPダメージを受け、EPリセット下限を1下げる。'),
    remain: 0,
    consumeEachTurn: 1,
    allowedOwners: ['player'],
    singleStack: true,
    iconText: 'MP',
    iconColor: 0xbd4ed8,
    triggers: [
      {
        timing: EFFECT_TIMINGS.StatusApplied,
        effects: [
          effect('removeStatus', 'player', 0, { status: 'DesperateToPeak' }),
        ],
        flavors: {
          [FLAVOR_EVENTS.Status.Trigger]: [
            { kind: 'narration', text: l('Peak keeps coming in waves, and breathing starts to hurt.', '連続でPeakし続け、苦しくなってきた。') },
            { kind: 'quote', text: l("But I'm already cumming...! Ah, not again♡...!", "「もうPeakしてるのに……！あっ♡、またっ♡……！」") },
            { kind: 'quote', text: l("I just came♡...! stop♡, another wave is...!", "「今Peakしたのにっ♡……！やめてっ♡、またPeakする……！」") },
            { kind: 'quote', text: l("This is too much♡...! I can't take it♡...!", "「Peakしすぎてっっ♡……！もう耐えられっ♡ないっ♡……！」") },
            { kind: 'quote', text: l("I can't♡... I'm already♡ at my limit♡...! Why♡ is it starting again♡...?", "「無理ぃ♡ ……もう限界っなのにっ♡……！なんで、またっ♡」") },
            { kind: 'quote', text: l("You're too fast... I haven't even caught my breath yet...!", "「早すぎるよ……まだ息も整ってないのに……っ！♡」") },
            { kind: 'quote', text: l("Wait, let me rest♡... It's already starting again...?", "「待って、休ませて♡ ……もうまたPeakさせられちゃうの……？♡」") },
            { kind: 'quote', text: l("I can't... the feeling hasn't gone away yet... ah...!", "「無理……まだ前のが残ってるっ♡ のに♡♡ ……っあ♡♡……！」") },
          ],
        },
      },
      {
        timing: EFFECT_TIMINGS.TurnStart,
        order: 25,
        consumeRule: 'one',
        effects: [
          effect('addCardToHand', 'player', 1, { cardId: 'faint' }),
        ],
        visuals: ['addCardFromPlayerFadeIn'],
      },
      {
        timing: EFFECT_TIMINGS.PlayerEpPeak,
        effects: [
          effect('hpDamage', 'player', 1, { attackAttribute: 'love' }),
          effect('epReserveHeal', 'player', 1),
        ],
      },
    ],
  }),
  PeakHell: defineStatus({
    name: l('Peak Hell', 'Peak地獄'),
    description: l('Peak Hell: At turn start, add Faint. Each Peak deals 2 HP damage and lowers EP reset floor by 1.', 'Peak地獄：ターン開始時、失神を手札に加える。Peakするごとに2HPダメージを受け、EPリセット下限を1下げる。'),
    remain: 0,
    consumeEachTurn: 1,
    allowedOwners: ['player'],
    noticeLevel: 'important',
    singleStack: true,
    iconText: 'PH',
    iconColor: 0x9f1239,
    triggers: [
      {
        timing: EFFECT_TIMINGS.StatusApplied,
        effects: [
          effect('removeStatus', 'player', 0, { status: 'MultiplePeak' }),
          effect('removeStatus', 'player', 0, { status: 'DesperateToPeak' }),
        ],
        flavors: {
          [FLAVOR_EVENTS.Status.Trigger]: [
            { kind: 'narration', text: l('She cannot escape the repeated Peaks, and her breathing falls apart.', '度重なるPeakから逃げられず、うまく呼吸ができない。') },
            { kind: 'quote', text: l("I can't......take it anymore...! This is too much♡...!♡hah...!", "「もぉ♡……これ以上……無理っ！…Peakしすぎてっ♡ ……息が……」") },
            { kind: 'quote', text: l("I♡—I'm♡ still coming... ah♡♡! It won't stop♡♡... another one is coming♡♡...!", "「まっ♡、まだPeakし続けてるのに……あっ♡♡ だめっ♡♡ ……またPeakするっ♡♡……！」") },
            { kind: 'quote', text: l("Too fast... it's too fast♡♡♡! I haven't even recovered yet♡... ah♡♡♡", "「早っ……早いぃ♡♡♡！まだ戻って来てないのにっ♡ ……ぁあっ♡♡♡」") },
            { kind: 'quote', text: l("No♡!, please♡...! I can't take back-to-back...♡ it's too much♡♡♡!", "「嫌♡！！、お願い♡！！……連続でPeakするの無理っ♡ ……強すぎっ♡♡」") },
          ],
        },
      },
      {
        timing: EFFECT_TIMINGS.TurnStart,
        order: 25,
        consumeRule: 'one',
        effects: [
          effect('addCardToHand', 'player', 1, { cardId: 'faint' }),
        ],
        visuals: ['addCardFromPlayerFadeIn'],
      },
      {
        timing: EFFECT_TIMINGS.PlayerEpPeak,
        effects: [
          effect('hpDamage', 'player', 2, { attackAttribute: 'love' }),
          effect('epReserveHeal', 'player', 1),
        ],
      },
    ],
  }),
  MultiplePeaksTorture: defineStatus({
    name: l('multiple Peaks torture', '連続Peak拷問'),
    description: l('multiple Peaks torture: At turn start, add Faint. Each Peak deals 2 HP damage and lowers EP reset floor by 2.', '連続Peak拷問：ターン開始時、失神を手札に加える。Peakするごとに2HPダメージを受け、EPリセット下限を2下げる。'),
    remain: 0,
    consumeEachTurn: 1,
    allowedOwners: ['player'],
    noticeLevel: 'important',
    singleStack: true,
    iconText: 'PT',
    iconColor: 0x701a75,
    triggers: [
      {
        timing: EFFECT_TIMINGS.StatusApplied,
        effects: [
          effect('removeStatus', 'player', 0, { status: 'PeakHell' }),
          effect('removeStatus', 'player', 0, { status: 'MultiplePeak' }),
          effect('removeStatus', 'player', 0, { status: 'DesperateToPeak' }),
        ],
        flavors: {
          [FLAVOR_EVENTS.Status.Trigger]: [
            { kind: 'narration', text: l('After too many peaks, {player}\'s mind and body are at their limit.', 'Peakし過ぎて{player}の精神と肉体は限界だ。') },
            { kind: 'quote', text: l("A-Again?! No, stop—I'm already... ah, AHH!", "「ま、また？！嫌゛ぁ――、やめて──もう、私……あ、あ゛あ゛あっ！」") },
            { kind: 'quote', text: l("N-Not♡ another one♡♡...! My body is... going crazy♡♡♡... ah!", "「ま♡、またPeakする゛っ♡♡……！からだが、おかしくなっちゃう♡♡♡♡ ……ぁああああっ！」") },
            { kind: 'quote', text: l("Mercy... please... I'm—ah♡♡♡, it's hitting♡♡♡ again♡♡♡...!", "「許してっ……お願いしますっ！！……私──あっ♡♡、まだおぐっ♡♡ 当たって♡♡……っ！」") },
          ],
        },
      },
      {
        timing: EFFECT_TIMINGS.TurnStart,
        order: 25,
        consumeRule: 'one',
        effects: [
          effect('addCardToHand', 'player', 1, { cardId: 'faint' }),
        ],
        visuals: ['addCardFromPlayerFadeIn'],
      },
      {
        timing: EFFECT_TIMINGS.PlayerEpPeak,
        effects: [
          effect('hpDamage', 'player', 2, { attackAttribute: 'love' }),
          effect('epReserveHeal', 'player', 2),
        ],
      },
    ],
  }),
  Bound: defineStatus({
    name: l('Bound', '拘束'),
    description: l('Bound: Limbs and body are restrained. Only certain cards can be played.', '拘束：手足と体が拘束され動かせない。一部のカードのみ使用できる。'),
    remain: 0,
    consumeEachTurn: 0,
    allowedOwners: ['player'],
    iconText: 'Bd',
    iconColor: 0x64748b,
    triggers: [],
  }),
  Escaping: defineStatus({
    name: l('Escaping', '脱出中'),
    description: l('Escaping: Trying to escape enemy binding. Fails if it causes Peak.', '脱出中：敵の拘束から脱出を試みる。Peakさせられてしまうと失敗する可能性がある。'),
    remain: 0,
    consumeEachTurn: 0,
    allowedOwners: ['player'],
    iconText: 'Es',
    iconColor: 0x22c55e,
    flavors: {
      [FLAVOR_EVENTS.Status.Apply]: [
        { kind: 'narration', text: l('{player} struggles to escape {enemy}\'s binding.', '{player}は{enemy}の拘束から抜け出そうと藻掻いた。') },
        { kind: 'quote', text: l('"If this keeps up, I can get free!"', '「このままいけば抜け出せそう！！」') },
      ],
    },
    triggers: [
      {
        timing: EFFECT_TIMINGS.TurnStart,
        order: 4,
        conditions: [condition('status', 'notHas', { target: 'player', statuses: ['Frustrated', 'DesperateToPeak'] })],
        effects: [
          effect('removeStatus', 'player', 0, { status: 'Bound' }),
          effect('removeStatus', 'triggerEnemy', 0, { status: 'Binding' }),
          effect('removeStatus', 'player', 0, { status: 'Escaping' }),
        ],
        flavors: {
          [FLAVOR_EVENTS.Status.Trigger]: [
            { kind: 'narration', text: l('{player} escapes {enemy}\'s binding.', '{player}は{enemy}の拘束から抜け出した。') },
          ],
        },
      },
      {
        timing: EFFECT_TIMINGS.TurnStart,
        order: 4,
        conditions: [condition('status', 'has', { target: 'player', statuses: ['Frustrated', 'DesperateToPeak'] })],
        effects: [],
        flavors: {
          [FLAVOR_EVENTS.Status.Trigger]: [
            { kind: 'quote', text: l('"Please... please make me Peak...♡♡"', '「ぉね、お願いします……♡ Peakさせてください……♡♡」') },
            { kind: 'narration', text: l('{player} is entranced by the stimulation {enemy} promises.', '{player}は{enemy}から与えられる刺激への期待にうっとりしている。') },
          ],
        },
      },
      {
        timing: EFFECT_TIMINGS.PlayerEpPeak,
        effects: [
          effect('removeStatus', 'player', 1, {
            status: 'Escaping',
            chance: 0.5,
            flavors: {
              [FLAVOR_EVENTS.Effect.ChanceSuccess]: [
                { kind: 'quote', text: l('"Ahh... I have no strength left..."', '「ぁあっ……もう、力が……。」') },
                { kind: 'narration', text: l('After Peak, her strength leaves her. {player} is bound tightly again.', 'Peakしてしまって力が入らない。{player}は再びしっかりと拘束されてしまった。') },
              ],
              [FLAVOR_EVENTS.Effect.ChanceFailure]: [
                { kind: 'quote', text: l('"No... I cannot be Peaking now!"', '「ダメっ……Peakしてる場合じゃないのにっ！」') },
                { kind: 'narration', text: l('{player} desperately suppresses the pleasure of Peak and keeps struggling.', '{player}はPeakの快感を必死に押し殺し、藻掻き続けた。') },
              ],
            },
          }),
        ],
      },
    ],
  }),
  Binding: defineStatus({
    name: l('Binding', '拘束中'),
    description: l('Binding: This enemy is binding the player.', '拘束中：この敵はプレイヤーを拘束している。'),
    remain: 0,
    consumeEachTurn: 0,
    allowedOwners: ['enemy'],
    iconText: 'Bi',
    iconColor: 0x475569,
    triggers: [
      {
        timing: EFFECT_TIMINGS.TurnStart,
        order: 40,
        effects: [
          effect('addCardToHand', 'player', 1, { cardId: 'wriggleFree', cardAddVariant: 'wriggleFreeForStatusOwner' }),
        ],
        visuals: ['addCardFromPlayerFadeIn'],
      },
    ],
  }),
  Fainted: defineStatus({
    name: l('Fainted', '失神'),
    description: l('Fainted: Discard all cards when applied and while active at player action start. Enemy HP attacks deal 1.5x damage.', '失神：付与時と有効中のプレイヤー行動開始時、手札を全て捨てる。敵のHP攻撃が1.5倍になる。'),
    remain: 0,
    consumeEachTurn: 1,
    allowedOwners: ['player'],
    noticeLevel: 'important',
    blockedFlavorKinds: ['quote'],
    iconText: 'Ft',
    iconColor: 0x596579,
    triggers: [
      {
        timing: EFFECT_TIMINGS.StatusApplied,
        effects: [
          effect('discardHand', 'player', 1),
        ],
        visuals: ['faintedDrop'],
      },
      {
        timing: EFFECT_TIMINGS.TurnStart,
        order: 5,
        consumeRule: 'one',
        effects: [],
        flavors: {
          [FLAVOR_EVENTS.Status.Remove]: [
            { kind: 'narration', text: l('{player} wakes up.', '{player}は目を覚ました。') },
          ],
        },
      },
      {
        timing: EFFECT_TIMINGS.PlayerActionStart,
        effects: [
          effect('discardHand', 'player', 1),
        ],
        flavors: {
          [FLAVOR_EVENTS.Status.Trigger]: [
            { kind: 'narration', text: l('She is unconscious and cannot act.', '意識を失って行動できない。') },
          ],
        },
      },
      {
        timing: EFFECT_TIMINGS.Passive,
        effects: [],
        modifiers: [hpDamageTakenMultiplier(1.5)],
      },
    ],
  }),
  Focused: defineStatus({
    name: l('Focused', '集中'),
    description: l('Focused: Max EP is doubled and EP damage received is halved. After EP returns from Peak, it may fade and cause EP damage equal to the increased EP capacity.', '集中：最大EPが2倍になり、受けるEPダメージが半減する。Peakしてしまうと確率で解除され、増加していたEP容量分のEPダメージを受ける。'),
    remain: 0,
    consumeEachTurn: 0,
    allowedOwners: ['player'],
    singleStack: true,
    iconText: 'Fo',
    iconColor: 0x3b82f6,
    triggers: [
      {
        timing: EFFECT_TIMINGS.Passive,
        effects: [],
        modifiers: [epMaxMultiplier(2)],
      },
      {
        timing: EFFECT_TIMINGS.DamageCalculation,
        effects: [],
        modifiers: [epDamageTakenMultiplier(0.5)],
      },
      {
        timing: EFFECT_TIMINGS.PlayerEpPeakRecovered,
        chance: 0.5,
        effects: [
          effect('removeStatus', 'player', 1, { status: 'Focused' }),
          effect('epDamage', 'player', 1, { percentOf: 'playerBaseMaxEp', attackAttribute: 'love', epDamagePartMode: 'lastPlayerEpDamageParts' }),
        ],
        flavors: {
          [FLAVOR_EVENTS.Effect.ChanceSuccess]: [
            { kind: 'narration', text: l('Peak breaks her focus. The pleasure she held back rushes over her.', 'Peakにより集中が切れてしまった。我慢していた快感が襲い掛かる。') },
          ],
          [FLAVOR_EVENTS.Effect.ChanceFailure]: [
            { kind: 'narration', text: l('{player} resists the pleasure of Peak and desperately keeps focus.', '{player} はPeakの快感に抗い、必死に集中を保った。') },
          ],
        },
      },
    ],
  }),
};

export function statusTriggersForTiming(status: StatusEffect, timing: EffectTiming) {
  return STATUS_DESCRIPTIONS[status]?.triggers.filter((trigger) => trigger.timing === timing) ?? [];
}



