import type { PlayerDefinition } from '../models/types';
import { text as l } from '../models/localization';

/** 全立ち絵に共通する縦横倍率。画像ごとの配置はcharacterPortraits.tsで設定。 */
export const PLAYER_PORTRAIT = { battleScale: 1 };

export const PLAYER_DEFINITION: PlayerDefinition = {
  id: 'Succubus',
  name: l('Succubus', 'サキュバス'),
  maxHp: 50,
  maxEp: 10,
  maxEnergy: 3,
  initialEpProgress: {
    A: { epDamage: 0, peakCount: 0 },
    B: { epDamage: 0, peakCount: 0 },
    C: { epDamage: 100, peakCount: 20 },
    V: { epDamage: 0, peakCount: 0 },
    M: { epDamage: 0, peakCount: 0 },
  },
  relics: ['succubusBlood'],
  startingDeckIds: [
    'strike',
    'handWork',
    'defend',
    'seduction',
    'crescentSlash',
    'titsWork',
    'cowgirlRiding',
    'strike',
    'defend',
    'handWork',
    'blowWork',
    'strike',
    'defend',
    'crescentSlash',
    'seduction',
    'preparation',
    'rubOneOut',
    'meditation',
  ],
};
