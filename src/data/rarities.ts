import type { Rarity } from '../models/types';

export const REWARD_RARITY_DROP_RATES: Partial<Record<Rarity, number>> = {
  common: 0.6,
  uncommon: 0.3,
  rare: 0.1,
};
