import type { CardCategory } from '../models/types';

export type ColoredCardCategory = Exclude<CardCategory, 'noMotion'>;

export const CARD_CATEGORY_COLORS: Record<ColoredCardCategory, number> = {
  attack: 0xe7aeb6,
  utility: 0xdceafa,
  caress: 0xf8d6e8,
  lust: 0xe4d7fa,
  physiology: 0xf4f4f5,
  remedy: 0xe7f4c8,
};

const CRAVING_PLAYABLE_CARD_CATEGORIES = new Set<CardCategory>(['lust', 'physiology']);

export function cardCategoryColor(category: CardCategory): number {
  if (category === 'noMotion') {
    throw new Error('Card category "noMotion" has no color. Put a colored category first.');
  }

  return CARD_CATEGORY_COLORS[category];
}

export function canPlayCardDuringCraving(categories: CardCategory[]): boolean {
  return categories.some((category) => CRAVING_PLAYABLE_CARD_CATEGORIES.has(category));
}

export function canPlayCardWhileBound(categories: CardCategory[]): boolean {
  return categories.includes('noMotion');
}
