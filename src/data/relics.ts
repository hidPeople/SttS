import { EFFECT_TIMINGS, FLAVOR_EVENTS, type RelicDefinition } from '../models/types';
import { text as l } from '../models/localization';
import { condition, defineRelic, defineRelicRegistry, effect } from './effectBuilders';

export const RELIC_DEFINITIONS: Record<string, RelicDefinition> = defineRelicRegistry({
// ===================================================================
  succubusBlood: defineRelic({
    name: l('Succubus\'s Blood', 'サキュバスの血'),
// ===================================================================
    rarity: 'starter',
    // アイコン画像: succubusBlood.png / デザイン案: 赤いしずくの下に波紋が広がる様なエフェクト。
    iconText: l('Su', 'サ血'),
    iconColor: 0x6f4f2d,
    description: l('When an enemy reaches orgasm, drain HP equal to that enemy max EP.', '敵をイかせた時、その敵の最大EP分のHPをドレインする。'),
    triggers: [
      {
        timing: EFFECT_TIMINGS.EnemyOrgasm,
        effects: [effect('hpDrain', 'triggerEnemy', 1, { percentOf: 'targetMaxEp', attackAttribute: 'love' })],
      },
    ],
  }),
// ===================================================================
  contractSigil: defineRelic({
    name: l('Contract Sigil', '契約の淫紋'),
// ===================================================================
    rarity: 'event',
    // アイコン画像: contractSigil.png / デザイン案: ピンクのハートの左右にピンクの悪魔の羽（コウモリの羽）のような形のデザイン。
    iconText: l('Co', '淫紋'),
    iconColor: 0x6f4f2d,
    description: l('Sensitivity: {relicEpDamageMultiplier}×\nEach orgasm permanently increases EP damage taken by 0.1%, compounding across battles. After three turns without an orgasm, gain TurnedOn.', '感度：{relicEpDamageMultiplier}倍\nイく度に受けるEPダメージが永続で0.1%ずつ増加する。3ターンの間イかずにいると、発情状態を付与する。'),
    epDamageTakenMultiplierPerOrgasm: 1.001,
    idleOrgasmsRule: { turns: 3, status: 'TurnedOn', stacks: 1 },
    triggers: [],
  }),
// ===================================================================
  neverSkipPussyDay: defineRelic({
    name: l('Never Skip Pussy Day', '膣圧トレをさぼるな'),
// ===================================================================
    rarity: 'uncommon',
    // アイコン画像: neverSkipPussyDay.png / デザイン案: ダンベルのマークの左右にピンクの波打つエフェクト。
    iconText: l('Ne', '膣圧'),
    iconColor: 0x6f4f2d,
    description: l('On your orgasm, deal 1 EP damage to enemies with Insert V.', '絶頂時、挿入V状態の敵に1EPダメージ。'),
    triggers: [
      {
        timing: EFFECT_TIMINGS.PlayerOrgasm,
        orgasmPhase: 'damage',
        effects: [
          effect('epDamage', 'allEnemies', 1, { attackAttribute: 'love', targetConditions: [condition('status', 'has', { target: 'selectedEnemy', status: 'InsertV' })] }),
        ],
      },
    ],
  }),
// ===================================================================
  extremeYoga: defineRelic({
    name: l('Extreme Yoga', 'エクストリームヨガ'),
// ===================================================================
    rarity: 'common',
    // アイコン画像: extremeYoga.png / デザイン案: ヨガをやっている人のシルエットの様なデザイン。
    iconText: l('Ex', 'ヨガ'),
    iconColor: 0x6f4f2d,
    description: l('Every 10 orgasms, recover 5 HP. Also gain 1 energy if it is your turn.', '絶頂10回ごとにHPが5回復。自分のターン中ならエナジーも1回復。'),
    triggers: [
      {
        timing: EFFECT_TIMINGS.PlayerOrgasm,
        orgasmInterval: 10,
        effects: [
          effect('hpHeal', 'player', 5),
          effect('energyGain', 'player', 1, { onlyDuringPlayerTurn: true }),
        ],
      },
    ],
  }),
// ===================================================================
  marathonRunner: defineRelic({
    name: l('Marathon Runner', 'マラソンランナー'),
// ===================================================================
    rarity: 'common',
    // アイコン画像: marathonRunner.png / デザイン案: 走っている人のシルエットの様なデザイン。
    iconText: l('Ma', 'マラ'),
    iconColor: 0x6f4f2d,
    description: l('At turn start, consume 1 additional Aftershocks stack per energy spent.', 'ターン開始時の絶頂余韻消費で、1エナジーにつき追加で1つ多く消費する。'),
    statusConsumptionBonus: { Aftershocks: 1 },
    triggers: [],
  }),
// ===================================================================
  lilimBlood: defineRelic({
    name: l('Lilim\'s Blood', 'リリムの血'),
// ===================================================================
    rarity: 'uncommon',
    // アイコン画像: lilimBlood.png / デザイン案: 赤いしずくの下に波紋が広がる様なエフェクト。しずくの大きさはサキュバスの血より小さく、波紋の広がり方も小さい。
    iconText: l('Li', 'リ血'),
    iconColor: 0x6f4f2d,
    description: l('When an enemy reaches orgasm, drain 5 HP.', '敵をイかせた時、5HPをドレインする。'),
    triggers: [
      {
        timing: EFFECT_TIMINGS.EnemyOrgasm,
        effects: [effect('hpDrain', 'triggerEnemy', 5, { attackAttribute: 'love' })],
      },
    ],
  }),
// ===================================================================
  manualOfBrothel: defineRelic({
    name: l('Manual of the Brothel', '娼館の手引き'),
// ===================================================================
    rarity: 'common',
    // アイコン画像: manualOfBrothel.png / デザイン案: ピンクの本のデザイン。表紙には♀のマーク
    iconText: l('Ma', '娼館'),
    iconColor: 0x6f4f2d,
    description: l('Enemy EP damage dealt by cards is increased by 1.', 'カードで敵に与えるEPダメージが1増える。'),
    triggers: [
      {
        timing: EFFECT_TIMINGS.Passive,
        effects: [effect('epDamage', 'selectedEnemy', 1, { attackAttribute: 'love' })],
      },
    ],
  }),
// ===================================================================
  pheromones: defineRelic({
    name: l('Pheromones', 'フェロモン'),
// ===================================================================
    rarity: 'uncommon',
    // アイコン画像: pheromones.png / デザイン案: ピンクの霧の様なデザイン。
    iconText: l('Ph', 'フェ'),
    iconColor: 0x6f4f2d,
    description: l('At battle start, apply Charm to all enemies.', '戦闘開始時、全ての敵にCharmを付与する。'),
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
// ===================================================================
  alluringBody: defineRelic({
    name: l('Alluring Body', '蠱惑の肉体'),
// ===================================================================
    rarity: 'rare',
    // アイコン画像: alluringBody.png / デザイン案: ピンクのハートの背景の上に、女性のシルエットが描かれているデザイン。
    iconText: l('Al', '蠱惑'),
    iconColor: 0x6f4f2d,
    description: l('When the player reaches orgasm, each enemy has a 20% chance to gain Charm.', 'プレイヤーがイった時、各敵に20%の確率でCharmを付与する。'),
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
// ===================================================================
  livingClothes: defineRelic({
    name: l('Living Clothes', '触手服'),
// ===================================================================
    rarity: 'rare',
    // アイコン画像: livingClothes.png / デザイン案: 濃いピンクの触手のデザイン。
    iconText: l('Li', '触服'),
    iconColor: 0x6f4f2d,
    description: l('At turn start, if you have Block, keep that Block and take 1-3 EP damage.', 'ターン開始時にBlockがあるならBlockを維持し、1〜3EPダメージを受ける。'),
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
// ===================================================================
  professionalism: defineRelic({
    name: l('Professionalism', 'プロ意識'),
// ===================================================================
    rarity: 'rare',
    // アイコン画像: professionalism.png / デザイン案: 金縁の名札とピンクのカード2枚。
    iconText: l('Pr', 'プロ'),
    iconColor: 0x765783,
    description: l('After playing a caress card, add a 0-cost temporary copy. Copies from this relic cannot generate further copies.', 'caressカード使用後、0コスト・一時カードのコピーを手札に加える。このレリックのコピーから再コピーは作らない。'),
    comboRules: { copyCategory: 'caress' },
    triggers: [],
    // フレーバー不要: カードコピーという手札操作。元カードの行為とコピー使用時の台詞があり、生成のたびに重ねる必要はない。
  }),
// ===================================================================
  provocateur: defineRelic({
    name: l('Provocateur', '煽り上手'),
// ===================================================================
    rarity: 'uncommon',
    // アイコン画像: provocateur.png / デザイン案: ピンクのメガホンとハートの波紋。
    iconText: l('Pr', '煽り'),
    iconColor: 0x765783,
    description: l('On your turn, after a card damages only your EP, deal 2 EP damage to all enemies. Ignore relic damage.', '自分のターン中、カードで自身だけがEPダメージを受けた時、敵全員に2EPダメージ。レリック由来のEPダメージは判定に含めない。'),
    comboRules: { selfOnlyEpDamage: 2 },
    triggers: [],
    flavors: {
      [FLAVOR_EVENTS.Relic.Trigger]: [
        {
          lines: [
            { kind: 'narration', text: l('Her flustered state pulls every foe in.', '乱れた様子に、敵全員が釣られる。') },
          ],
        },
      ],
    },
  }),
// ===================================================================
  burusera: defineRelic({
    name: l('Clothing Sale', 'ブルセラ'),
// ===================================================================
    rarity: 'uncommon',
    // アイコン画像: burusera.png / デザイン案: 白いパンツと金色の値札。
    iconText: l('Cl', 'ブル'),
    iconColor: 0x765783,
    description: l('For every 3 cards discarded without being played, deal 4 EP damage to a random enemy.', '使用せずに捨て札へ送ったカード3枚ごとに、ランダムな敵に4EPダメージ。'),
    comboRules: { discardAttack: { every: 3, damage: 4 } },
    triggers: [],
    flavors: {
      [FLAVOR_EVENTS.Relic.Trigger]: [
        {
          lines: [
            { kind: 'narration', text: l('The scent left on her clothes stirs a foe.', '衣類の残り香が、敵を煽る。') },
          ],
        },
      ],
    },
  }),
// ===================================================================
  heroicAppetite: defineRelic({
    name: l('Heroic Appetite', '英雄色を好む'),
// ===================================================================
    rarity: 'rare',
    // アイコン画像: heroicAppetite.png / デザイン案: 月桂冠の赤いハートと金の稲妻。
    iconText: l('He', '英雄'),
    iconColor: 0x765783,
    description: l('Gain 1 energy when an existing arousal status advances to a higher stage.', 'ムラムラ系状態異常が上位に強化された時、エナジーを1得る。初回付与では発動しない。'),
    comboRules: { promotionEnergy: { group: 'arousal', amount: 1 } },
    triggers: [],
    // フレーバー不要: 状態の段階上昇に伴うエナジー回復。変化は状態側の通知・フレーバーで表現でき、追加の行為はない。
  }),
// ===================================================================
  reciprocity: defineRelic({
    name: l('Reciprocity', '返礼'),
// ===================================================================
    rarity: 'uncommon',
    // アイコン画像: reciprocity.png / デザイン案: 赤い雫から銀青の盾へつながる曲線。
    iconText: l('Re', '返礼'),
    iconColor: 0x765783,
    description: l('Gain Block equal to half of excess HP drain healing, rounded up.', 'HPドレインの余剰回復量の半分（切り上げ）のブロックを得る。'),
    comboRules: { overhealBlockRatio: 0.5 },
    triggers: [],
    // フレーバー不要: HPドレインの余剰回復をブロックへ換算する数値処理。ドレインとブロックの既存表示で伝わる。
  }),
// ===================================================================
  todaysTreat: defineRelic({
    name: l('Today’s Treat', '今日のおかず'),
// ===================================================================
    rarity: 'rare',
    // アイコン画像: todaysTreat.png / デザイン案: ハート印のカード束を載せた小皿とフォーク。
    iconText: l('To', '今日'),
    iconColor: 0x765783,
    description: l('Whenever a card effect removes a generated card from this battle, deal 2 EP damage to a random enemy.', 'カード効果で戦闘中生成カードを除外するたび、ランダムな敵に2EPダメージ。'),
    comboRules: { generatedExhaustDamage: 2 },
    triggers: [],
    flavors: {
      [FLAVOR_EVENTS.Relic.Trigger]: [
        {
          lines: [
            { kind: 'narration', text: l('A foe takes up what she cast aside, looking pleased.', '手放したものを、敵がありがたそうに受け取る。') },
          ],
        },
      ],
    },
  }),
// ===================================================================
  secretPocket: defineRelic({
    name: l('Secret Pocket', '秘密のポッケ'),
// ===================================================================
    rarity: 'uncommon',
    // アイコン画像: secretPocket.png / デザイン案: 紫のポケットからカードが1枚のぞく。
    iconText: l('Se', '秘密'),
    iconColor: 0x765783,
    description: l('At turn end, you may retain 1 non-temporary card instead of discarding it.', 'ターン終了時、一時カード以外の手札を1枚選び、捨てずに残せる。'),
    comboRules: { retainAtTurnEnd: 1 },
    triggers: [],
    // フレーバー不要: ターン終了時の手札保持というシステム操作。実物を身体や衣類へ収納する動作とは限らない。
  }),
});
