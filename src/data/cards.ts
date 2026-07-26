import type { CardDefinition } from '../models/types';
import { condition, defineCard, effect } from './effectBuilders';

export const CARD_DEFINITIONS: Record<string, CardDefinition> = {
  strike: defineCard({
    id: 'strike',
    name: 'Strike',
    rarity: 'starter',
    cost: 1,
    description: 'Deal 6 HP damage.',
    effects: [effect('hpDamage', 'selectedEnemy', 6, { attackAttribute: 'strike' })],
  }),
  heavyStrike: defineCard({
    id: 'heavyStrike',
    name: 'Heavy Strike',
    rarity: 'starter',
    cost: 2,
    description: 'Deal 15 HP damage.',
    effects: [effect('hpDamage', 'selectedEnemy', 15, { attackAttribute: 'slash' })],
  }),
  defend: defineCard({
    id: 'defend',
    name: 'Defend',
    rarity: 'starter',
    cost: 1,
    description: 'Gain 5 block.',
    effects: [effect('block', 'player', 5)],
  }),
  love: defineCard({
    id: 'love',
    name: 'Love',
    rarity: 'starter',
    cost: 1,
    description: 'Deal 3 EP damage.',
    effects: [effect('epDamage', 'selectedEnemy', 3, { attackAttribute: 'love' })],
  }),
  bigLove: defineCard({
    id: 'bigLove',
    name: 'Big Love',
    rarity: 'starter',
    cost: 2,
    description: 'Deal 8 EP damage.',
    effects: [effect('epDamage', 'selectedEnemy', 8, { attackAttribute: 'love' })],
  }),
  seduction: defineCard({
    id: 'seduction',
    name: 'Seduction',
    rarity: 'starter',
    cost: 0,
    description: 'Apply charm.',
    effects: [effect('status', 'selectedEnemy', 1, { status: 'Charm', stacks: 1, attackAttribute: 'love' })],
  }),
  provocative: defineCard({
    id: 'provocative',
    name: 'Provocative',
    rarity: 'starter',
    cost: 3,
    description: 'Deal 6 EP damage. Apply 2 Charm.',
    effects: [
      effect('epDamage', 'selectedEnemy', 6, { attackAttribute: 'love' }),
      effect('status', 'selectedEnemy', 2, { status: 'Charm', stacks: 2 }),
    ],
  }),
  mountLove: defineCard({
    id: 'mountLove',
    name: 'Mount Love',
    rarity: 'common',
    cost: 1,
    description: 'Deal 10 EP damage. Take 5 EP damage.',
    effects: [
      effect('epDamage', 'selectedEnemy', 10, { attackAttribute: 'love' }),
      effect('epDamage', 'player', 5, { attackAttribute: 'love' }),
    ],
  }),
  preparation: defineCard({
    id: 'preparation',
    name: 'Preparation',
    rarity: 'common',
    cost: 1,
    description: 'Draw 2 cards.',
    effects: [effect('drawCards', 'player', 2)],
  }),
  rubOneOut: defineCard({
    id: 'rubOneOut',
    name: 'RubOneOut',
    rarity: 'uncommon',
    cost: 0,
    description: 'Apply Horny. Take 20% max EP damage.',
    effects: [
      effect('status', 'player', 1, { status: 'Horny', stacks: 1 }),
      effect('epDamage', 'player', 0.2, { percentOf: 'playerMaxEp', attackAttribute: 'love' }),
    ],
  }),
  rubOne: defineCard({
    id: 'rubOne',
    name: 'RubOneOut',
    rarity: 'event',
    cost: 0,
    description: 'Apply Horny. Take 20% max EP damage. Exhaust.',
    effects: [
      effect('status', 'player', 1, { status: 'Horny', stacks: 1 }),
      effect('epDamage', 'player', 0.2, { percentOf: 'playerMaxEp', attackAttribute: 'love' }),
    ],
    exhaust: true,
  }),
  purge: defineCard({
    id: 'purge',
    name: 'Purge',
    rarity: 'event',
    cost: 1,
    description: 'On success, remove an intruded enemy. Fails if it causes EP Peak.',
    effects: [effect('epDamage', 'player', 3, { attackAttribute: 'love' })],
    temporary: true,
  }),
  faint: defineCard({
    id: 'faint',
    name: 'Faint',
    rarity: 'event',
    cost: 0,
    description: 'Collapse from excessive strain.',
    conditions: [condition('cardsPlayedThisTurn', 'eq', { value: 0 })],
    effects: [
      effect('status', 'player', 2, { status: 'Fainted', stacks: 2 }),
      effect('clearStatus', 'player', 0, { status: 'Lingering' }),
      effect('setEpReserveRatio', 'player', 1 / 3),
    ],
    temporary: true,
  }),
};

export function createDeckDefinitions(cardIds: string[]): CardDefinition[] {
  return cardIds.map((id) => CARD_DEFINITIONS[id]);
}
