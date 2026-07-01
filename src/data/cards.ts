import type { CardDefinition } from '../models/types';

export const CARD_DEFINITIONS: Record<string, CardDefinition> = {
  strike: {
    id: 'strike',
    name: 'Strike',
    cost: 1,
    hpDamage: 6,
    attackAttribute: 'strike',
    description: 'Deal 6 HP damage.',
  },
  heavyStrike: {
    id: 'heavyStrike',
    name: 'Heavy Strike',
    cost: 2,
    hpDamage: 15,
    attackAttribute: 'slash',
    description: 'Deal 15 HP damage.',
  },
  defend: {
    id: 'defend',
    name: 'Defend',
    cost: 1,
    block: 5,
    description: 'Gain 5 block.',
  },
  love: {
    id: 'love',
    name: 'Love',
    cost: 1,
    mpDamage: 3,
    attackAttribute: 'love',
    description: 'Deal 3 MP damage.',
  },
  bigLove: {
    id: 'bigLove',
    name: 'Big Love',
    cost: 2,
    mpDamage: 8,
    attackAttribute: 'love',
    description: 'Deal 8 MP damage.',
  },
  seduction: {
    id: 'seduction',
    name: 'Seduction',
    cost: 0,
    debuff: 'Charm',
    description: 'Apply charm.',
  },
};

export const STARTING_DECK_IDS = [
  'strike',
  'love',
  'defend',
  'seduction',
  'heavyStrike',
  'strike',
  'defend',
  'love',
  'bigLove',
  'strike',
  'defend',
  'heavyStrike',
  'seduction',
];

export function createStartingDeckDefinitions(): CardDefinition[] {
  return STARTING_DECK_IDS.map((id) => CARD_DEFINITIONS[id]);
}
