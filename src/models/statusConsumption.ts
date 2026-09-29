import type { StatusTriggerDefinition } from './types';

/** Batch size for allWhileEnergy; omitted settings retain the old one-stack rule. */
export function statusStacksPerEnergy(trigger?: StatusTriggerDefinition, bonus = 0): number {
  const value = trigger?.stacksPerEnergy ?? 1;
  return Number.isFinite(value) ? Math.max(1, Math.floor(value) + Math.max(0, Math.floor(bonus))) : 1;
}
