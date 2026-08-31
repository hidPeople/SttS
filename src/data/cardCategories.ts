import type { CardCategory } from '../models/types';

export const CARD_CATEGORY_COLORS: Record<CardCategory, number> = {
  attack: 0xe7aeb6,
  utility: 0xdceafa,
  caress: 0xf8d6e8,
  lust: 0xe4d7fa,
  physiology: 0xf4f4f5,
  remedy: 0xe7f4c8,
};

const CRAVING_PLAYABLE_CARD_CATEGORIES = new Set<CardCategory>(['lust', 'physiology']);

export function cardCategoryColor(category?: CardCategory): number {
  return category ? CARD_CATEGORY_COLORS[category] : CARD_CATEGORY_COLORS.utility;
}

export function canPlayCardDuringCraving(categories: CardCategory[]): boolean {
  return categories.some((category) => CRAVING_PLAYABLE_CARD_CATEGORIES.has(category));
}

