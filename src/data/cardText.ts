import { text as l, type LocalizedText } from '../models/localization';
import type { EffectKind, EffectTarget, EffectPercentOf, EpRatioBase, ConditionKind, ConditionOperator } from '../models/types';

export const CARD_SYSTEM_TERMS = {
  block: { name: l('Block', 'ブロック'), description: l('Block: Reinforces clothing to prevent HP damage by the indicated amount. Resets at the start of your turn.', 'ブロック：衣類を強化して、HPへの攻撃を数値の分だけ防ぐ。ターン開始時にリセットされる。') },
  noMotion: { name: l('Motionless', '不動'), description: l('Motionless: Can be played while bound.', '不動：拘束中でも使用できる。') },
  temporary: { name: l('Temporary', '一時カード'), description: l('Temporary: Disappears after use or when discarded, instead of entering the discard pile.', '一時カード：使用後や手札から捨てられる時、捨て札に入らず消滅する。') },
  vanish: { name: l('Vanish', '消滅'), description: l('Vanish: Disappears after use instead of entering the discard pile.', '消滅：使用後、捨て札に入らず消滅する。') },
};
export const CARD_SYSTEM_TERM_COLOR = '#478dc7';
export const CARD_BLOCK_CARRY_DESCRIPTION = l('Block: Reinforces clothing to prevent HP damage by the indicated amount. Carries over between turns.', 'ブロック：衣類を強化して、HPへの攻撃を数値の分だけ防ぐ。ターンをまたいで持ち越せる。');
export const CARD_TEXT_TARGETS: Record<EffectTarget, LocalizedText> = {
  player: l('yourself', '自身'), self: l('yourself', '自身'), selectedEnemy: l('the target', '対象'), triggerEnemy: l('the triggering enemy', '発動元の敵'), allEnemies: l('all enemies', '敵全体'),
};
export const CARD_VALUE_BASES: Record<EffectPercentOf | EpRatioBase, LocalizedText> = {
  playerMaxHp: l('your max HP', '自身の最大HP'), playerMaxEp: l('your max EP', '自身の最大EP'), playerBaseMaxEp: l('your base max EP', '自身の基本最大EP'),
  selfCurrentHp: l('the target’s current HP', '対象の現在HP'), selfMaxEp: l('the target’s max EP', '対象の最大EP'), targetMaxEp: l('the target’s max EP', '対象の最大EP'),
  playerCurrentEp: l('your current EP', '現在EP'), playerEpReserve: l('your current EP reserve', '現在EPリセット下限'),
};
/** Every effect kind must have an authored rule; adding a kind without one is a type error. */
export const CARD_EFFECT_TEXT: Record<EffectKind, LocalizedText> = {
  hpDamage: l('Deal {amount}{repeat} HP damage to {target}.', '{target}のHPに{amount}{repeat}ダメージ。'),
  epDamage: l('Deal {amount}{repeat} EP damage to {target}.', '{target}のEPに{amount}{repeat}ダメージ。'),
  hpHeal: l('Restore {amount}{repeat} HP to {target}.', '{target}のHPを{amount}{repeat}回復。'),
  epHeal: l('Reduce {target}’s EP by {amount}{repeat}.', '{target}のEPを{amount}{repeat}減少。'),
  epReserveHeal: l('Reduce EP reserve by {amount}{repeat}.', 'EPリセット下限を{amount}{repeat}減少。'),
  block: l('Give {target} {amount}{repeat} {block}.', '{target}に{block}を{amount}{repeat}付与。'),
  drawCards: l('Draw {amount} cards.', 'カードを{amount}枚引く。'),
  addCardToHand: l('Add {amount} {card} to your hand.', '手札に{card}を{amount}枚追加。'),
  energyGain: l('Change energy by {amount}{repeat}.', 'エナジーを{amount}{repeat}増減。'),
  status: l('Apply {status}{stackSuffix} to {target}.', '{target}に{status}{stackSuffix}を付与。'),
  removeStatus: l('Remove all {status} from {target}.', '{target}の{status}を全解除。'),
  discardHand: l('Discard your entire hand.', '手札を全て捨てる。'),
  setEp: l('Set EP to {amount}{repeat}.', 'EPを{amount}{repeat}にする。'),
  setEpRatio: l('Set EP to {ratio}% of {base}{repeat}.', 'EPを{base}の{ratio}%にする{repeat}。'),
  setEpReserve: l('Set EP reserve to {amount}{repeat}.', 'EPリセット下限を{amount}{repeat}にする。'),
  setEpReserveRatio: l('Set EP reserve to {ratio}% of {base}{repeat}.', 'EPリセット下限を{base}の{ratio}%にする{repeat}。'),
  retainBlock: l('Carry {block} over to the next turn.', '{block}を次のターンへ持ち越す。'),
  hpDrain: l('Drain {amount}{repeat} HP from {target}.', '{target}からHPを{amount}{repeat}吸収。'),
};
export const CARD_TEXT_PHRASES = {
  keywordSeparator: l(', ', '、'),
  random: l('a random {value}', 'ランダムに{value}'), percent: l('{value}% of {base}', '{base}の{value}%分'),
  chance: l('{value}% chance: ', '{value}%の確率で：'), turnOnly: l('During your turn: ', '自身のターン中：'),
  probability: l('{value}% chance', '発動率{value}%'),
  repetitions: l('{value} times', '{value}回'),
  supplement: l('{target}: {value}', '{target}：{value}'),
  upgrade: l('Upgrade {target}’s {from} to {status}.', '{target}の{from}を{status}に強化する。'),
  unchanged: l('{target} already has {status}.', '{target}の{status}は既に最大段階。'),
  blocked: l('{status} cannot be applied to {target} now.', '現在、{target}に{status}を付与できない。'),
  turnStart: l('Playable only at turn start.', 'ターン開始時のみ使用可。'),
  condition: l('Playable when: {value}.', '使用条件：{value}。'),
  energyGain: l('Gain {amount}{repeat} energy.', 'エナジーを{amount}{repeat}得る。'),
  energyLoss: l('Spend {amount}{repeat} energy.', 'エナジーを{amount}{repeat}消費。'),
};
export const CARD_CONDITION_NAMES: Record<ConditionKind, LocalizedText> = {
  flavorValue: l('event value', 'イベント値'),
  status: l('status', '状態'), relic: l('relic', 'レリック'), hp: l('HP', 'HP'), hpPercent: l('HP ratio', 'HP割合'), ep: l('EP', 'EP'), epPercent: l('EP ratio', 'EP割合'),
  block: l('Block', 'ブロック'), cardsPlayedThisTurn: l('cards played this turn', '今ターン使用枚数'), intentUsageCount: l('intent uses', '行動使用回数'),
  playerEpPeaksThisBattle: l('Peaks this battle', 'この戦闘のPeak回数'), aliveEnemyCount: l('living enemies', '生存敵数'),
  isPlayerTurn: l('your turn', '自身のターン'), enemyTrait: l('enemy trait', '敵の属性'), bodyPartStatus: l('part status', '部位の状態'),
  purgeCausedEpPeak: l('Peak during removal', '除去中のPeak'), purgeWillCauseEpPeak: l('Peak predicted during removal', '除去時Peak予測'),
  enemyHasBindingAction: l('enemy has binding action', '敵が拘束行動を持つ'), enemyHasEIntents: l('enemy has E actions', '敵がE行動を持つ'),
};
export const CARD_CONDITION_OPERATORS: Record<ConditionOperator, LocalizedText> = {
  eq: l('=', '＝'), notEq: l('≠', '≠'), gt: l('>', '超'), gte: l('≥', '以上'), lt: l('<', '未満'), lte: l('≤', '以下'), has: l('has', 'あり'), notHas: l('does not have', 'なし'),
};
