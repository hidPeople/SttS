import { BATTLE_BACKGROUNDS, BATTLE_ENTRANCE, type BattleBackgroundConfig, type BattleEntranceConfig } from '../data/battlePresentation';

export function battleBackgroundFile(stage: number, eventId?: string, config: BattleBackgroundConfig = BATTLE_BACKGROUNDS): string {
  return (eventId && config.events[eventId]) || config.stages[stage] || config.fallback;
}

/** Indexes refer to enemies sorted by screen X, independent of encounter storage order. */
export function entranceSchedule(count: number, config: BattleEntranceConfig = BATTLE_ENTRANCE) {
  const configured = config.enemyOrder[count];
  const order = configured?.length === count && new Set(configured).size === count && configured.every(i => Number.isInteger(i) && i >= 0 && i < count)
    ? configured : Array.from({ length: count }, (_, i) => i);
  const duration = Math.max(0, config.enemyDuration);
  return order.map((index, rank) => ({ index, delay: rank * duration * Math.max(0, Math.min(1, config.nextEnemyProgress)), duration }));
}

export function entranceProgress(elapsed: number, duration: number, delay = 0): number {
  if (elapsed < delay) return 0;
  return duration <= 0 ? 1 : Math.max(0, Math.min(1, (elapsed - delay) / duration));
}
