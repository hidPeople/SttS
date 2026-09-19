import type { PortraitFactorRules } from '../models/types';

/** 各配列は後ろほど優先。状態・レリックの文脈を保ち、その中でカード・演出を選択する。 */
export const PORTRAIT_FACTORS: PortraitFactorRules = {
  statuses: ['Starvation'],
  relics: [],
  cards: [],
  events: ['HPdamage', 'EPdamage', 'peak'],
  hpRatios: [], // 例: { tag: 'lowHP', max: 0.25 }。境界値を含む0～1の割合。
  epRatios: [], // 例: { tag: 'highEP', min: 0.5 }。
};
