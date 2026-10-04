import { CARD_HOVER } from '../data/ui';
import type { UserSettings } from './userSettings';

export function nextCardHoverLevel(level: UserSettings['cardHoverLevel'], deltaY: number): UserSettings['cardHoverLevel'] {
  return Math.max(0, Math.min(2, level + (deltaY < 0 ? 1 : deltaY > 0 ? -1 : 0))) as UserSettings['cardHoverLevel'];
}

export function cardHoverPose(baseX: number, handCount: number, level: UserSettings['cardHoverLevel'], cardHeight: number) {
  const scale = CARD_HOVER.scales[level];
  const range = CARD_HOVER.scales[2] - CARD_HOVER.scales[0];
  const enlargement = range > 0 ? (scale - CARD_HOVER.scales[0]) / range : 0;
  const leftShift = Math.max(0, handCount - CARD_HOVER.crowdingStartCount) * CARD_HOVER.leftShiftPerCard * enlargement;
  return { x: baseX - leftShift, y: CARD_HOVER.bottomY + CARD_HOVER.bottomYStep * level - cardHeight * scale / 2, scale };
}
