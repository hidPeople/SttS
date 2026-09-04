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
    'handWork',
    'defend',
    'seduction',
    'CrescentSlash',
    'titsWork',
    'mountLove',
    'strike',
    'defend',
    'handWork',
    'blowWork',
    'strike',
    'defend',
    'CrescentSlash',
    'seduction',
    'preparation',
    'rubOneOut',
    'meditation',
  ],
};
