import { EFFECT_TIMINGS, FLAVOR_EVENTS, type RelicDefinition } from '../models/types';
import { text as l } from '../models/localization';
import { condition, defineRelic, effect } from './effectBuilders';

export const RELIC_DEFINITIONS: Record<string, RelicDefinition> = {
  succubusBlood: defineRelic({
    id: 'succubusBlood',
    name: l('Succubus\'s Blood', 'サキュバスの血'),
    rarity: 'starter',
    // アイコン画像: succubusBlood.png / デザイン案: 赤いしずくの下に波紋が広がる様なエフェクト。
    iconText: l('Su', 'サ血'), iconColor: 0x6f4f2d,
    description: l('Succubus\'s Blood: When an enemy reaches orgasm, drain HP equal to that enemy max EP.', 'サキュバスの血：敵をイかせた時、その敵の最大EP分のHPをドレインする。'),
    triggers: [
      {
        timing: EFFECT_TIMINGS.EnemyOrgasm,
        effects: [effect('hpDrain', 'triggerEnemy', 1, { percentOf: 'targetMaxEp', attackAttribute: 'love' })],
      },
    ],
  }),
  contractSigil: defineRelic({
    id: 'contractSigil',
    name: l('Contract Sigil', '契約の淫紋'),
    rarity: 'event',
    // アイコン画像: contractSigil.png / デザイン案: ピンクのハートの左右にピンクの悪魔の羽（コウモリの羽）のような形のデザイン。
    iconText: l('Co', '淫紋'), iconColor: 0x6f4f2d,
    description: l('Contract Sigil\nSensitivity: {relicEpDamageMultiplier}×\nEach orgasm permanently increases EP damage taken by 0.1%, compounding across battles. After three turns without an orgasm, gain Estrus.', '契約の淫紋\n感度：{relicEpDamageMultiplier}倍\nイく度に受けるEPダメージが永続で0.1%ずつ増加する。3ターンの間イかずにいると、発情状態を付与する。'),
    epDamageTakenMultiplierPerOrgasm: 1.001,
    idleOrgasmsRule: { turns: 3, status: 'Estrus', stacks: 1 },
    triggers: [],
  }),
  neverSkipPussyDay: defineRelic({
    id: 'neverSkipPussyDay', name: l('Never Skip Pussy Day', '膣圧トレをさぼるな'), rarity: 'uncommon',
    // アイコン画像: neverSkipPussyDay.png / デザイン案: ダンベルのマークの左右にピンクの波打つエフェクト。
    iconText: l('Ne', '膣圧'), iconColor: 0x6f4f2d,
    description: l('Never Skip Pussy Day: On your orgasm, deal 1 EP damage to enemies with Insert V.', '膣圧トレをさぼるな：絶頂時、挿入V状態の敵に1EPダメージ。'),
    triggers: [{ timing: EFFECT_TIMINGS.PlayerOrgasm, orgasmPhase: 'damage', effects: [
      effect('epDamage', 'allEnemies', 1, { attackAttribute: 'love', targetConditions: [condition('status', 'has', { target: 'selectedEnemy', status: 'InsertV' })] }),
    ] }],
  }),
  extremeYoga: defineRelic({
    id: 'extremeYoga', name: l('Extreme Yoga', 'エクストリームヨガ'), rarity: 'common',
    // アイコン画像: extremeYoga.png / デザイン案: ヨガをやっている人のシルエットの様なデザイン。
    iconText: l('Ex', 'ヨガ'), iconColor: 0x6f4f2d,
    description: l('Extreme Yoga: Every 10 orgasms, recover 5 HP. Also gain 1 energy if it is your turn.', 'エクストリームヨガ：絶頂10回ごとにHPが5回復。自分のターン中ならエナジーも1回復。'),
    triggers: [{ timing: EFFECT_TIMINGS.PlayerOrgasm, orgasmInterval: 10, effects: [
      effect('hpHeal', 'player', 5), effect('energyGain', 'player', 1, { onlyDuringPlayerTurn: true }),
    ] }],
  }),
  marathonRunner: defineRelic({
    id: 'marathonRunner', name: l('Marathon Runner', 'マラソンランナー'), rarity: 'common',
    // アイコン画像: marathonRunner.png / デザイン案: 走っている人のシルエットの様なデザイン。
    iconText: l('Ma', 'マラ'), iconColor: 0x6f4f2d,
    description: l('Marathon Runner: At turn start, consume 1 additional Aftershocks stack per energy spent.', 'マラソンランナー：ターン開始時の絶頂余韻消費で、1エナジーにつき追加で1つ多く消費する。'),
    statusConsumptionBonus: { Aftershocks: 1 }, triggers: [],
  }),
  lilimBlood: defineRelic({
    id: 'lilimBlood',
    name: l('Lilim\'s Blood', 'リリムの血'),
    rarity: 'uncommon',
    // アイコン画像: lilimBlood.png / デザイン案: 赤いしずくの下に波紋が広がる様なエフェクト。しずくの大きさはサキュバスの血より小さく、波紋の広がり方も小さい。
    iconText: l('Li', 'リ血'), iconColor: 0x6f4f2d,
    description: l('Lilim\'s Blood: When an enemy reaches orgasm, drain 5 HP.', 'リリムの血：敵をイかせた時、5HPをドレインする。'),
    triggers: [
      {
        timing: EFFECT_TIMINGS.EnemyOrgasm,
        effects: [effect('hpDrain', 'triggerEnemy', 5, { attackAttribute: 'love' })],
      },
    ],
  }),
  manualOfBrothel: defineRelic({
    id: 'manualOfBrothel',
    name: l('Manual of the Brothel', '娼館の手引き'),
    rarity: 'common',
    // アイコン画像: manualOfBrothel.png / デザイン案: ピンクの本のデザイン。表紙には♀のマーク
    iconText: l('Ma', '娼館'), iconColor: 0x6f4f2d,
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
    // アイコン画像: pheromones.png / デザイン案: ピンクの霧の様なデザイン。
    iconText: l('Ph', 'フェ'), iconColor: 0x6f4f2d,
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
    // アイコン画像: alluringBody.png / デザイン案: ピンクのハートの背景の上に、女性のシルエットが描かれているデザイン。
    iconText: l('Al', '蠱惑'), iconColor: 0x6f4f2d,
    description: l('Alluring Body: When the player reaches orgasm, each enemy has a 20% chance to gain Charm.', '蠱惑の肉体：プレイヤーがイった時、各敵に20%の確率でCharmを付与する。'),
    triggers: [
      {
        timing: EFFECT_TIMINGS.PlayerOrgasm,
        effects: [effect('status', 'allEnemies', 1, {
          status: 'Charm',
          stacks: 1,
          chance: 0.2,
          flavors: {
            [FLAVOR_EVENTS.Effect.ChanceSuccess]: [
              { kind: 'narration', text: l('{enemy} is captivated by {player}\'s alluring orgasm.', '艶めかしい絶頂に{enemy}は釘付けになっている。') },
              { kind: 'narration', text: l('{player}\'s orgasm steals {enemy}\'s gaze.', '{player}の絶頂姿が{enemy}の視線を奪う。') },
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
    // アイコン画像: livingClothes.png / デザイン案: 濃いピンクの触手のデザイン。
    iconText: l('Li', '触服'), iconColor: 0x6f4f2d,
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
