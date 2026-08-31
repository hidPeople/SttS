import {
  EFFECT_TIMINGS,
  EP_DAMAGE_PARTS,
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
          `${part} sensitivity level ${sensitivityLevel}: EP damage to this part is increased.`,
          `${part}部位の感度Lv.${sensitivityLevel}。この部位に受けるEPダメージが増加する。`,
        ),
        remain: 1,
        consumeEachTurn: 0,
        allowedOwners: ['player'],
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
          onTrigger: [
            { kind: 'narration', text: l('The desire is satisfied.', '欲求が満たされ満足した。') },
          ],
        },
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
        flavors: {
          onTrigger: [
            { kind: 'narration', text: l('The desire is satisfied.', '欲求が満たされ満足した。') },
          ],
        },
      },
    ],
  }),
  Frustrated: defineStatus({
    name: l('Frustrated', '快楽焦燥'),
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
        flavors: {
          onTrigger: [
            { kind: 'narration', text: l('She can think of nothing but Peak.', 'Peakの事以外考えられない。') },
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
          onTrigger: [
            { kind: 'narration', text: l('The desire is satisfied.', '欲求が満たされ満足した。') },
          ],
        },
      },
    ],
  }),
  CravingForPeaks: defineStatus({
    name: l('Craving for Peaks', '快楽渇望'),
    description: l('Craving for Peaks: EP damage received is multiplied by 3. At turn start, add 5 RubOneOut. Only cards that damage your own EP can be played. At EP Peak, gain 1 energy and has a 10% chance to clear.', '快楽渇望：受けるEPダメージが3倍。ターン開始時、RubOneOutを5枚手札に加える。自身のEPにダメージを与えるカードしか使用できない。EP Peak時、エナジーを1得て10%の確率で解除される。'),
    remain: 1,
    consumeEachTurn: 0,
    allowedOwners: ['player'],
    iconText: 'CP',
    iconColor: 0xbe185d,
    exclusiveGroup: 'arousal',
    groupRank: 4,
    triggers: [
      {
        timing: EFFECT_TIMINGS.StatusApplied,
        conditions: [condition('status', 'has', { target: 'player', statuses: ['MultiplePeak', 'PeakHell', 'MultiplePeaksTorture'] })],
        effects: [
          effect('removeStatus', 'player', 0, { status: 'CravingForPeaks' }),
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
          onTrigger: [
            { kind: 'narration', text: l('She can think of nothing but Peak.', 'Peakの事以外考えられない。') },
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
            status: 'CravingForPeaks',
            chance: 0.1,
            flavors: {
              onChanceSuccess: [
                { kind: 'narration', text: l('The desire is satisfied.', '欲求が満たされ満足した。') },
              ],
              onChanceFailure: [
                { kind: 'narration', text: l('The craving for Peak is not satisfied.', 'Peakへの渇望は満たされない。') },
              ],
            },
          }),
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
  IntrudedM: defineStatus({
    name: l('IntrudedM', '侵入M'),
    description: l('IntrudedM: At turn start, add Purge to hand and take 2 HP damage. Purge removes this if it does not cause EP Peak, then you take 10 EP damage.', '侵入M：ターン開始時、Purgeを手札に加え、HPに2ダメージを受ける。PurgeでEP Peakが発生しなければ解除され、その後10EPダメージを受ける。'),
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
          onTrigger: [
            { kind: 'quote', text: l('"Ugh... gurgle... hrrk..."', '「ぅ……ごぼっ……ぐぅおぇ……」') },
            { kind: 'quote', text: l('"G-gulp... gurgle... (I can’t... breathe...)"', '「ごぽぽっ……ごぼ……(もう…息が……)」') },
            { kind: 'narration', text: l('The intruding slime blocks the airway, making it hard to breathe.', '侵入してきたスライムで気道がふさがれ呼吸が苦しい。') },
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
      },
    ],
  }),
  InfestedA_Slime: defineStatus({
    name: l('InfestedA (Slime)', '寄生A (スライム)'),
    description: l('InfestedA (Slime): At player action start, take 1 EP damage.', '寄生A (スライム)：プレイヤー行動開始時、1EPダメージを受ける。'),
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
        flavors: {
          onTrigger: [
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
          onTrigger: [
            { kind: 'narration', text: l('The slime wriggles deep inside {player}\'s V.', '{player}のVの奥でスライムが蠢いている。') },
            { kind: 'narration', text: l('The slime secretes mucus deep inside {player}\'s V.', '{player}のVの奥でスライムが粘液を分泌している。') },
            { kind: 'narration', text: l('The slime in {player}\'s V tries to burrow even deeper.', '{player}のVのスライムが更に奥へと潜り込もうとしている。') },
          ],
        },
      },
    ],
  }),
  MultiplePeak: defineStatus({
    name: l('Multiple Peak', '連続Peak'),
    description: l('Multiple Peak: At turn start, add Faint. Each EP Peak deals 1 HP damage and lowers EP reset floor by 1.', '連続Peak：ターン開始時、失神を手札に加える。EP Peakごとに1HPダメージを受け、EPリセット下限を1下げる。'),
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
          effect('removeStatus', 'player', 0, { status: 'CravingForPeaks' }),
        ],
        flavors: {
          onTrigger: [
            { kind: 'narration', text: l('Peak keeps coming in waves, and breathing starts to hurt.', '連続でPeakし続け、苦しくなってきた。') },
            { kind: 'quote', text: l("But I'm already cumming...! Ah, not again♡...!", "「もうPeakしてるのに……！あっ♡、またっ♡……！」") },
            { kind: 'quote', text: l("I just came♡...! stop♡, another wave is...!", "「今Peakしたのにっ♡……！やめてっ♡、またPeakする……！」") },
            { kind: 'quote', text: l("This is too much♡...! I can't take it♡...!", "「Peakしすぎてっっ♡……！もう耐えられっ♡ないっ♡……！」") },
            { kind: 'quote', text: l("I can't♡... I'm already♡ at my limit♡...! Why♡ is it starting again♡...?", "「無理ぃ♡ ……もう限界っなのにっ♡……！なんで、またっ♡」") },
            { kind: 'quote', text: l("You’re too fast... I haven't even caught my breath yet...!", "「早すぎるよ……まだ息も整ってないのに……っ！♡」") },
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
    description: l('Peak Hell: At turn start, add Faint. Each EP Peak deals 2 HP damage and lowers EP reset floor by 1.', 'Peak地獄：ターン開始時、失神を手札に加える。EP Peakごとに2HPダメージを受け、EPリセット下限を1下げる。'),
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
          effect('removeStatus', 'player', 0, { status: 'MultiplePeak' }),
          effect('removeStatus', 'player', 0, { status: 'CravingForPeaks' }),
        ],
        flavors: {
          onTrigger: [
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
    description: l('multiple Peaks torture: At turn start, add Faint. Each EP Peak deals 2 HP damage and lowers EP reset floor by 2.', '連続Peak拷問：ターン開始時、失神を手札に加える。EP Peakごとに2HPダメージを受け、EPリセット下限を2下げる。'),
    remain: 0,
    consumeEachTurn: 1,
    allowedOwners: ['player'],
    singleStack: true,
    iconText: 'PT',
    iconColor: 0x701a75,
    triggers: [
      {
        timing: EFFECT_TIMINGS.StatusApplied,
        effects: [
          effect('removeStatus', 'player', 0, { status: 'PeakHell' }),
          effect('removeStatus', 'player', 0, { status: 'MultiplePeak' }),
          effect('removeStatus', 'player', 0, { status: 'CravingForPeaks' }),
        ],
        flavors: {
          onTrigger: [
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
    description: l('Bound: Limbs and body are restrained. Only noMotion cards can be played.', '拘束：手足と体が拘束され動かせない。noMotionカードのみ使用できる。'),
    remain: 0,
    consumeEachTurn: 0,
    allowedOwners: ['player'],
    iconText: 'Bd',
    iconColor: 0x64748b,
    triggers: [],
  }),
  Escaping: defineStatus({
    name: l('Escaping', '脱出中'),
    description: l('Escaping: Trying to escape enemy binding. If focus breaks, escape may fail.', '脱出中：敵の拘束から脱出を試みる。集中が途切れると失敗する可能性がある。'),
    remain: 0,
    consumeEachTurn: 0,
    allowedOwners: ['player'],
    iconText: 'Es',
    iconColor: 0x22c55e,
    flavors: {
      onApply: [
        { kind: 'narration', text: l('{player} struggles to escape {enemy}\'s binding.', '{player}は{enemy}の拘束から抜け出そうと藻掻いた。') },
        { kind: 'quote', text: l('"If this keeps up, I can get free!"', '「このままいけば抜け出せそう！！」') },
      ],
    },
    triggers: [
      {
        timing: EFFECT_TIMINGS.TurnStart,
        order: 4,
        conditions: [condition('status', 'notHas', { target: 'player', statuses: ['Frustrated', 'CravingForPeaks'] })],
        effects: [
          effect('removeStatus', 'player', 0, { status: 'Bound' }),
          effect('removeStatus', 'triggerEnemy', 0, { status: 'Binding' }),
          effect('removeStatus', 'player', 0, { status: 'Escaping' }),
        ],
        flavors: {
          onTrigger: [
            { kind: 'narration', text: l('{player} escapes {enemy}\'s binding.', '{player}は{enemy}の拘束から抜け出した。') },
          ],
        },
      },
      {
        timing: EFFECT_TIMINGS.TurnStart,
        order: 4,
        conditions: [condition('status', 'has', { target: 'player', statuses: ['Frustrated', 'CravingForPeaks'] })],
        effects: [],
        flavors: {
          onTrigger: [
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
              onChanceSuccess: [
                { kind: 'quote', text: l('"Ahh... I have no strength left..."', '「ぁあっ……もう、力が……。」') },
                { kind: 'narration', text: l('After Peak, her strength leaves her. {player} is bound tightly again.', 'Peakしてしまって力が入らない。{player}は再びしっかりと拘束されてしまった。') },
              ],
              onChanceFailure: [
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
          effect('addCardToHand', 'player', 1, { cardId: 'resistBinding', cardAddVariant: 'resistBindingForStatusOwner' }),
        ],
        visuals: ['addCardFromPlayerFadeIn'],
      },
    ],
  }),  Fainted: defineStatus({
    name: l('Fainted', '失神'),
    description: l('Fainted: Discard all cards when applied and while active at player action start. Enemy HP attacks deal 1.5x damage.', '失神：付与時と有効中のプレイヤー行動開始時、手札を全て捨てる。敵のHP攻撃が1.5倍になる。'),
    remain: 0,
    consumeEachTurn: 1,
    allowedOwners: ['player'],
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
          onRemove: [
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
          onTrigger: [
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
    description: l('Focused: Max EP is doubled and EP damage received is halved. After EP returns from Peak, it may fade and cause EP damage equal to the increased EP capacity.', '集中：最大EPが2倍になり、受けるEPダメージが半減する。EP Peakから復帰後、確率で解除され、増加していたEP容量分のEPダメージを受ける。'),
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
          onChanceSuccess: [
            { kind: 'narration', text: l('Peak breaks her focus. The pleasure she held back rushes over her.', 'Peakにより集中が切れてしまった。我慢していた快感が襲い掛かる。') },
          ],
          onChanceFailure: [
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



