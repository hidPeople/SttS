import { EFFECT_TIMINGS, type EffectTiming, type StatusDefinition, type StatusEffect, type StatusModifierDefinition } from '../models/types';
import { text as l } from '../models/localization';
import { condition, effect } from './effectBuilders';

function defineStatus(input: StatusDefinition): StatusDefinition {
  return input;
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
  Lingering: defineStatus({
    name: l('Lingering', '余韻'),
    description: l('Lingering: At the start of your turn, lose 1 energy per stack while energy remains.', '余韻：ターン開始時、エナジーが残っている限り1スタックごとにエナジーを1失う。'),
    remain: 0,
    consumeEachTurn: 1,
    allowedOwners: ['player'],
    iconText: 'Li',
    iconColor: 0x9b6ef3,
    triggers: [
      {
        timing: EFFECT_TIMINGS.TurnStart,
        consumeRule: 'allWhileEnergy',
        order: 10,
        effects: [
          effect('energyGain', 'player', -1),
        ],
        visuals: ['breathAndEnergyPulse'],
      },
    ],
  }),
  Horny: defineStatus({
    name: l('Horny', 'ムラムラ'),
    description: l('Horny: EP damage received is multiplied by 1.5. Clears at EP Peak and grants 1 energy.', 'ムラムラ：受けるEPダメージが1.5倍。EP Peak時に解除され、エナジーを1得る。'),
    remain: 1,
    consumeEachTurn: 0,
    allowedOwners: ['player'],
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
      },
    ],
  }),
  Heat: defineStatus({
    name: l('Heat', '火照り'),
    description: l('Heat: EP damage received is multiplied by 2. Clears at EP Peak and grants 1 energy.', '火照り：受けるEPダメージが2倍。EP Peak時に解除され、エナジーを1得る。'),
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
          effect('removeStatus', 'player', 1, { status: 'Heat' }),
        ],
      },
    ],
  }),
  Frustrated: defineStatus({
    name: l('Frustrated', '焦燥'),
    description: l('Frustrated: EP damage received is multiplied by 3. Clears at EP Peak and grants 1 energy.', '焦燥：受けるEPダメージが3倍。EP Peak時に解除され、エナジーを1得る。'),
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
      },
    ],
  }),
  IntrudedA: defineStatus({
    name: l('IntrudedA', '侵入A'),
    description: l('IntrudedA: At turn start, add Purge to hand. Purge removes this if it does not cause EP Peak, then you take 10 EP damage.', '侵入A：ターン開始時、Purgeを手札に加える。PurgeでEP Peakが発生しなければ解除され、その後10EPダメージを受ける。'),
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
      },
    ],
  }),
  IntrudedV: defineStatus({
    name: l('IntrudedV', '侵入V'),
    description: l('IntrudedV: At turn start, add Purge to hand. Purge removes this if it does not cause EP Peak, then you take 10 EP damage.', '侵入V：ターン開始時、Purgeを手札に加える。PurgeでEP Peakが発生しなければ解除され、その後10EPダメージを受ける。'),
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
      },
    ],
  }),
  InfestedA: defineStatus({
    name: l('InfestedA', '寄生A'),
    description: l('InfestedA: At player action start, take 1 EP damage.', '寄生A：プレイヤー行動開始時、1EPダメージを受ける。'),
    remain: 1,
    consumeEachTurn: 0,
    allowedOwners: ['player'],
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
      },
    ],
  }),
  InfestedV: defineStatus({
    name: l('InfestedV', '寄生V'),
    description: l('InfestedV: At player action start, take 1 EP damage.', '寄生V：プレイヤー行動開始時、1EPダメージを受ける。'),
    remain: 1,
    consumeEachTurn: 0,
    allowedOwners: ['player'],
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
      },
    ],
  }),
  MultiplePeak: defineStatus({
    name: l('Multiple Peak', '多重Peak'),
    description: l('Multiple Peak: At turn start, add Faint. Each EP Peak deals 1 HP damage and lowers EP reset floor by 1.', '多重Peak：ターン開始時、Faintを手札に加える。EP Peakごとに1HPダメージを受け、EP reset floorを1下げる。'),
    remain: 0,
    consumeEachTurn: 1,
    allowedOwners: ['player'],
    singleStack: true,
    iconText: 'MP',
    iconColor: 0xbd4ed8,
    triggers: [
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
    description: l('Peak Hell: At turn start, add Faint. Each EP Peak deals 2 HP damage and lowers EP reset floor by 1.', 'Peak Hell：ターン開始時、Faintを手札に加える。EP Peakごとに2HPダメージを受け、EP reset floorを1下げる。'),
    remain: 0,
    consumeEachTurn: 1,
    allowedOwners: ['player'],
    singleStack: true,
    iconText: 'PH',
    iconColor: 0x9f1239,
    triggers: [
      {
        timing: EFFECT_TIMINGS.StatusApplied,
        effects: [
          effect('clearStatus', 'player', 0, { status: 'MultiplePeak' }),
        ],
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
  Fainted: defineStatus({
    name: l('Fainted', '失神'),
    description: l('Fainted: Discard all cards when applied and while active at player action start. Enemy HP attacks deal 1.5x damage.', '失神：付与時と有効中のプレイヤー行動開始時、手札を全て捨てる。敵のHP攻撃が1.5倍になる。'),
    remain: 0,
    consumeEachTurn: 1,
    allowedOwners: ['player'],
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
      },
      {
        timing: EFFECT_TIMINGS.PlayerActionStart,
        effects: [
          effect('discardHand', 'player', 1),
        ],
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
    description: l('Focused: Max EP is doubled and EP damage received is halved. After EP returns from Peak, it may fade and cause EP damage equal to the increased EP capacity.', '集中：最大EPが2倍になり、受けるEPダメージが半減する。EP Peakから復帰後、確率で解除され、増加していたEP容量分のEPダメージを受ける。'),
    remain: 0,
    consumeEachTurn: 0,
    allowedOwners: ['player'],
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
      },
    ],
  }),
};

export function statusTriggersForTiming(status: StatusEffect, timing: EffectTiming) {
  return STATUS_DESCRIPTIONS[status]?.triggers.filter((trigger) => trigger.timing === timing) ?? [];
}
