import type { PlayerDefinition } from '../models/types';
import { text as l } from '../models/localization';

export const PLAYER_DEFINITION: PlayerDefinition = {
  id: 'player1',
  name: l('Succubus', 'サキュバス'),
  maxHp: 50,
  maxEp: 10,
  maxEnergy: 3,
  relics: ['succubusBlood'],
  startingDeckIds: [
    'strike',
    'love',
    'defend',
    'seduction',
    'CrescentSlash',
    'provocative',
    'mountLove',
    'strike',
    'defend',
    'love',
    'bigLove',
    'strike',
    'defend',
    'CrescentSlash',
    'seduction',
    'preparation',
    'rubOneOut',
    'meditation',
  ],
};
