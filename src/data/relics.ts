import { EFFECT_TIMINGS, FLAVOR_EVENTS, type RelicDefinition } from '../models/types';
import { text as l } from '../models/localization';
import { condition, defineRelic, effect } from './effectBuilders';

export const RELIC_DEFINITIONS: Record<string, RelicDefinition> = {
  succubusBlood: defineRelic({
    id: 'succubusBlood',
    name: l('Succubus\'s Blood', 'サキュバスの血'),
    rarity: 'starter',
    description: l('Succubus\'s Blood: When an enemy reaches Peak, drain HP equal to that enemy max EP.', 'サキュバスの血：敵をPeakさせた時、その敵の最大EP分のHPをドレインする。'),
    triggers: [
      {
        timing: EFFECT_TIMINGS.EnemyEpPeak,
        effects: [effect('hpDrain', 'triggerEnemy', 1, { percentOf: 'targetMaxEp', attackAttribute: 'love' })],
      },
    ],
  }),
  contractSigil: defineRelic({
    id: 'contractSigil',
    name: l('Contract Sigil', '契約の淫紋'),
    rarity: 'event',
    description: l('Contract Sigil\nSensitivity: {relicEpDamageMultiplier}×\nEach Peak permanently increases EP damage taken by 0.1%, compounding across battles. After three turns without a Peak, gain Estrus.', '契約の淫紋\n感度：{relicEpDamageMultiplier}倍\nPeakする度に受けるEPダメージが永続で0.1%ずつ増加する。3ターンの間Peakせずにいると、発情状態を付与する。'),
    epDamageTakenMultiplierPerPeak: 1.001,
    idlePeakRule: { turns: 3, status: 'Estrus', stacks: 1 },
    triggers: [],
  }),
  neverSkipPussyDay: defineRelic({
    id: 'neverSkipPussyDay', name: l('Never Skip Pussy Day', '膣圧トレをさぼるな'), rarity: 'uncommon',
    description: l('Never Skip Pussy Day: On your Peak, deal 1 EP damage to enemies with Insert V.', '膣圧トレをさぼるな：Peak時、挿入V状態の敵に1EPダメージ。'),
    triggers: [{ timing: EFFECT_TIMINGS.PlayerEpPeak, peakPhase: 'damage', effects: [
      effect('epDamage', 'allEnemies', 1, { attackAttribute: 'love', targetConditions: [condition('status', 'has', { target: 'selectedEnemy', status: 'InsertV' })] }),
    ] }],
  }),
  extremeYoga: defineRelic({
    id: 'extremeYoga', name: l('Extreme Yoga', 'エクストリームヨガ'), rarity: 'common',
    description: l('Extreme Yoga: Every 10 Peaks, recover 5 HP. Also gain 1 energy if it is your turn.', 'エクストリームヨガ：Peak10回ごとにHPが5回復。自分のターン中ならエナジーも1回復。'),
    triggers: [{ timing: EFFECT_TIMINGS.PlayerEpPeak, peakInterval: 10, effects: [
      effect('hpHeal', 'player', 5), effect('energyGain', 'player', 1, { onlyDuringPlayerTurn: true }),
    ] }],
  }),
  marathonRunner: defineRelic({
    id: 'marathonRunner', name: l('Marathon Runner', 'マラソンランナー'), rarity: 'common',
    description: l('Marathon Runner: At turn start, consume 1 additional Aftershocks stack per energy spent.', 'マラソンランナー：ターン開始時のPeak余韻消費で、1エナジーにつき追加で1つ多く消費する。'),
    statusConsumptionBonus: { Aftershocks: 1 }, triggers: [],
  }),
  lilimBlood: defineRelic({
    id: 'lilimBlood',
    name: l('Lilim\'s Blood', 'リリムの血'),
    rarity: 'uncommon',
    description: l('Lilim\'s Blood: When an enemy reaches Peak, drain 5 HP.', 'リリムの血：敵をPeakさせた時、5HPをドレインする。'),
    triggers: [
      {
        timing: EFFECT_TIMINGS.EnemyEpPeak,
        effects: [effect('hpDrain', 'triggerEnemy', 5, { attackAttribute: 'love' })],
      },
    ],
  }),
  manualOfBrothel: defineRelic({
    id: 'manualOfBrothel',
    name: l('Manual of the Brothel', '娼館の手引き'),
    rarity: 'common',
    description: l('Manual of the Brothel: Enemy EP damage dealt by cards is increased by 1.', '娼館の手引き：カードで敵に与えるEPダメージが1増える。'),
    triggers: [
      {
        timing: EFFECT_TIMINGS.Passive,
        effects: [effect('epDamage', 'selectedEnemy', 1, { attackAttribute: 'love' })],
      },
    ],
  }),
  pheromones: defineRelic({
    id: 'pheromones',
    name: l('Pheromones', 'フェロモン'),
    rarity: 'uncommon',
    description: l('Pheromones: At battle start, apply Charm to all enemies.', 'フェロモン：戦闘開始時、全ての敵にCharmを付与する。'),
    triggers: [
      {
        timing: EFFECT_TIMINGS.BattleStart,
        effects: [effect('status', 'allEnemies', 1, {
          status: 'Charm',
          stacks: 1,
          flavors: {
            [FLAVOR_EVENTS.Effect.Trigger]: [
              { kind: 'narration', text: l('{enemy} cannot take their eyes off {player}\'s allure.', '{player}の色香に{enemy}は目を離せない。') },
            ],
          },
        })],
      },
    ],
  }),
  alluringBody: defineRelic({
    id: 'alluringBody',
    name: l('Alluring Body', '蠱惑の肉体'),
    rarity: 'rare',
    description: l('Alluring Body: When the player reaches Peak, each enemy has a 20% chance to gain Charm.', '蠱惑の肉体：プレイヤーがPeakした時、各敵に20%の確率でCharmを付与する。'),
    triggers: [
      {
        timing: EFFECT_TIMINGS.PlayerEpPeak,
        effects: [effect('status', 'allEnemies', 1, {
          status: 'Charm',
          stacks: 1,
          chance: 0.2,
          flavors: {
            [FLAVOR_EVENTS.Effect.ChanceSuccess]: [
              { kind: 'narration', text: l('{enemy} is captivated by {player}\'s alluring Peak.', '艶めかしいPeakに{enemy}は釘付けになっている。') },
              { kind: 'narration', text: l('{player}\'s Peak steals {enemy}\'s gaze.', '{player}のPeak姿が{enemy}の視線を奪う。') },
            ],
          },
        })],
      },
    ],
  }),
  livingClothes: defineRelic({
    id: 'livingClothes',
    name: l('Living Clothes', '触手服'),
    rarity: 'rare',
    description: l('Living Clothes: At turn start, if you have Block, keep that Block and take 1-3 EP damage.', '触手服：ターン開始時にBlockがあるならBlockを維持し、1〜3EPダメージを受ける。'),
    triggers: [
      {
        timing: EFFECT_TIMINGS.TurnStart,
        conditions: [condition('block', 'gt', { target: 'player', value: 0 })],
        effects: [
          effect('retainBlock', 'player', 1),
          effect('epDamage', 'player', 1, {
            randomAmount: { min: 1, max: 3 },
            attackAttribute: 'love',
            epDamageParts: ['B', 'C', 'V', 'A'],
            flavors: {
              [FLAVOR_EVENTS.Effect.RandomAmountMin]: [
                { kind: 'narration', text: l('The living clothes stroke her whole body teasingly.', '触手服が全身を焦らすように撫でる。') },
              ],
              [FLAVOR_EVENTS.Effect.RandomAmountMax]: [
                { kind: 'narration', text: l('The inner surface of the living clothes fiercely assaults {player}\'s whole body.', '触手服の内面が{player}の全身を激しく責め立てる。') },
              ],
              [FLAVOR_EVENTS.Effect.RandomAmountOther]: [
                { kind: 'narration', text: l('The living clothes cling to the entire body and jiggle.', '触手服が全身に密着し、舐めるように蠢く。') },
              ],
            },
          }),
        ],
      },
    ],
  }),
};
