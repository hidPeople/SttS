import { STATUS_DESCRIPTIONS } from '../data/statuses';
import type { Player } from './Combatants';
import type { StatusEffect } from './types';

export function activeRestrictions(player: Player) {
  return [...player.statuses].filter(([, count]) => count > 0)
    .map(([status]) => ({ status, definition: STATUS_DESCRIPTIONS[status] }));
}

export function energyRecovery(player: Player, amount: number, turnStart = false): { amount: number; cause?: StatusEffect } {
  if (amount <= 0) return { amount };
  const blocked = activeRestrictions(player).find(entry => entry.definition.preventEnergyRecovery);
  if (blocked) return { amount: 0, cause: blocked.status };
  if (turnStart) {
    const limit = activeRestrictions(player).filter(entry => entry.definition.turnStartEnergy !== undefined)
      .sort((a, b) => a.definition.turnStartEnergy! - b.definition.turnStartEnergy!)[0];
    if (limit && amount > limit.definition.turnStartEnergy!) return { amount: Math.max(0, limit.definition.turnStartEnergy!), cause: limit.status };
  }
  return { amount };
}

export function turnStartDrawAllowed(player: Player): boolean {
  return !activeRestrictions(player).some(entry => entry.definition.preventTurnStartDraw);
}

export function receivedEpDamage(player: Player, amount: number): { amount: number; cause?: StatusEffect } {
  if (amount <= 0) return { amount };
  const entry = activeRestrictions(player).find(entry => entry.definition.receivedEpDamage !== undefined);
  return entry ? { amount: Math.max(0, entry.definition.receivedEpDamage!), cause: entry.status } : { amount };
}

export function removeRecoveredRestrictions(player: Player): void {
  for (const { status, definition } of activeRestrictions(player)) {
    if (definition.removeAboveHpRatio !== undefined && player.hp > player.maxHp * definition.removeAboveHpRatio) {
      player.statuses.delete(status);
      player.statusDrainCounts.delete(status);
    }
  }
}

export function recordHpDrain(player: Player): void {
  // Snapshot the old statuses: one drain cannot also advance the replacement status.
  for (const { status, definition } of activeRestrictions(player)) {
    const rule = definition.hpDrainProgress;
    if (!rule) continue;
    const count = (player.statusDrainCounts.get(status) ?? 0) + 1;
    if (count < rule.count) player.statusDrainCounts.set(status, count);
    else {
      player.statuses.delete(status); player.statusDrainCounts.delete(status);
      if (rule.nextStatus) { player.addStatus(rule.nextStatus, 1); player.statusDrainCounts.delete(rule.nextStatus); }
    }
  }
}
