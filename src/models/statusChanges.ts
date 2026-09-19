import { STATUS_DESCRIPTIONS } from '../data/statuses';
import type { StatusEffect } from './types';

export type StatusChange = { from?: StatusEffect; to?: StatusEffect };

/** Compare automatic model updates without duplicating effect-driven notifications. */
export function statusChanges(before: ReadonlyMap<StatusEffect, number>, after: ReadonlyMap<StatusEffect, number>): StatusChange[] {
  const added = new Set([...after].filter(([status, count]) => count > 0 && (before.get(status) ?? 0) <= 0).map(([status]) => status));
  const changes: StatusChange[] = [];
  for (const [from, count] of before) {
    if (count <= 0 || (after.get(from) ?? 0) > 0) continue;
    const next = STATUS_DESCRIPTIONS[from]?.hpDrainProgress?.nextStatus;
    const to = next && added.has(next) ? next : undefined;
    if (to) added.delete(to);
    changes.push({ from, to });
  }
  for (const to of added) changes.push({ to });
  return changes;
}

export function statusNoticeKind(...statuses: (StatusEffect | undefined)[]): 'important' | 'status' {
  return statuses.some(status => status && STATUS_DESCRIPTIONS[status]?.noticeLevel === 'important') ? 'important' : 'status';
}
