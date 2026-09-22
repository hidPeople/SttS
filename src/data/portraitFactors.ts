import type { PortraitFactorRules } from '../models/types';

/** 要因の配列は上ほど優先、配列内は前ほど優先。このオブジェクトの記述順がそのまま優先順になる。 */
export const PORTRAIT_FACTORS: PortraitFactorRules = {
  // 比較は立ち絵ファイル名側で指定。例: EPgte50per、EP_gte50、Aftershocksgte5、Aftershocks_gte5。
  states: ['Death'], // HPが0以下。
  statuses: ['Fainted', 'Starvation', 'Aftershocks'],
  relics: [],
  events: ['peak', 'EPdamage', 'HPdamage', 'AftershockBreath'],
  cards: [],
  percentComparisons: ['EP', 'HP'],
  interactions: ['hover'], // 最低優先。同じ条件群にhoverを加えた画像があれば切り替える。

  ThresholdOrder: 'stricter', // 状態異常・HP/EPの同じ要因では厳しい閾値を優先。looserなら緩い閾値を優先。配列ではないため行位置は優先度に影響しない。
};
