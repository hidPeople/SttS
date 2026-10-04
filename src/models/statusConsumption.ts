import type { StatusTriggerDefinition } from './types';

/** Initial consumption is independent of energy and relic batch bonuses. */
export function statusInitialFreeStacks(trigger?: StatusTriggerDefinition): number {
  const value = trigger?.initialFreeStacks ?? 0;
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

/** Batch size for allWhileEnergy; omitted settings retain the old one-stack rule. */
export function statusStacksPerEnergy(trigger?: StatusTriggerDefinition, bonus = 0): number {
  const value = trigger?.stacksPerEnergy ?? 1;
  return Number.isFinite(value) ? Math.max(1, Math.floor(value) + Math.max(0, Math.floor(bonus))) : 1;
}
