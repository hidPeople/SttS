import type { PortraitFactorRules } from '../models/types';

/** 要因の配列は上ほど優先、配列内は前ほど優先。このオブジェクトの記述順がそのまま優先順になる。 */
export const PORTRAIT_FACTORS: PortraitFactorRules = {
  states: ['Death'], // HPが0以下。
  statuses: ['Starvation'],
  relics: [],
  events: ['peak', 'EPdamage', 'HPdamage'],
  cards: [],
  // ファイル名に「比較形式 + 数値 + per」。例: EPgte50per、HPlt12.5per。数値は%で自由指定。
  percentComparisons: ['EPlte', 'EPlt', 'EPgte', 'EPgt', 'HPlte', 'HPlt', 'HPgte', 'HPgt'],
  percentThresholdOrder: 'stricter', // 同形式では厳しい閾値を優先。looserなら緩い閾値を優先。配列ではないため行位置は優先度に影響しない。
  interactions: ['hover'], // 最低優先。同じ条件群にhoverを加えた画像があれば切り替える。
};
