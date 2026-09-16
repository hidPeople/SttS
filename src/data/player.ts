import type { PlayerDefinition } from '../models/types';
import { text as l } from '../models/localization';

/** Shared offsets from the top-centre portrait anchor. Per-image offsets live in CHARACTER_SPRITES. */
export const PLAYER_PORTRAIT: { spriteId: string; offsetX: number; offsetY: number; battleScale: number } = {
  spriteId: 'succubusIdle', offsetX: 0, offsetY: 0,
  battleScale: 1, // 戦闘・報酬画面の縦横共通倍率。1で等倍。敗北イベント画面には適用しない。
};

export const PLAYER_DEFINITION: PlayerDefinition = {
  id: 'player1',
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
