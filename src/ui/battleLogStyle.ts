import type { BattleLogKind } from '../models/types';

export function battleLogColor(kind: BattleLogKind | 'user'): string {
  if (kind === 'important') return '#ff3f86';
  if (kind === 'status') return '#e74b86';
  if (kind === 'system' || kind === 'user') return '#dcecff';
  if (kind === 'quote') return '#ffd6ef';
  return '#d8d2c8';
}
