import { STATUS_DESCRIPTIONS } from '../data/statuses';
import type { Combatant, Enemy, Player } from './Combatants';
import type { StatusEffect } from './types';

/** Fixed durations use the player-round clock, independent of trigger count. */
export class StatusRuntime {
  turn = 0;
  private expiries = new WeakMap<Combatant, Map<StatusEffect, number>>();
  private counted = new Map<StatusEffect, number>();
  private peakHistory: number[] = [];

  applyDuration(owner: Combatant, status: StatusEffect, isPlayerTurn: boolean): void {
    const duration = STATUS_DESCRIPTIONS[status]?.durationTurns;
    if (!duration) return;
    let entries = this.expiries.get(owner);
    if (!entries) { entries = new Map(); this.expiries.set(owner, entries); }
    entries.set(status, this.turn + duration + (isPlayerTurn ? 0 : 1));
    owner.statuses.set(status, duration);
  }

  advance(player: Player, enemies: Enemy[], previousPeaks: number): void {
    if (this.turn > 0) this.peakHistory.push(previousPeaks);
    this.turn++;
    for (const owner of [player, ...enemies]) {
      for (const [status, stacks] of owner.statuses) {
        if (!STATUS_DESCRIPTIONS[status]?.durationTurns) continue;
        let entries = this.expiries.get(owner);
        if (!entries) { entries = new Map(); this.expiries.set(owner, entries); }
        // Saved statuses retain their remaining duration on entering a battle.
        const expires = entries.get(status) ?? this.turn + stacks;
        entries.set(status, expires);
        if (expires <= this.turn) { owner.statuses.delete(status); entries.delete(status); }
        else owner.statuses.set(status, expires - this.turn);
      }
    }
    this.countActive(player);
  }

  countActive(player: Player): void {
    if (this.turn <= 0) return;
    for (const [status, stacks] of player.statuses) {
      if (stacks <= 0 || !STATUS_DESCRIPTIONS[status]?.trackActiveTurns || this.counted.get(status) === this.turn) continue;
      player.statusActiveTurns[status] = (player.statusActiveTurns[status] ?? 0) + 1;
      this.counted.set(status, this.turn);
    }
  }

  remainingAtNextTurn(owner: Combatant, status: StatusEffect): number {
    const expiry = this.expiries.get(owner)?.get(status);
    return expiry === undefined ? owner.statuses.get(status) ?? 0 : Math.max(0, expiry - this.turn - 1);
  }

  hadNoPeaks(turns: number): boolean {
    return turns > 0 && this.peakHistory.length >= turns && this.peakHistory.slice(-turns).every(count => count === 0);
  }
}

export function blocksTurnStartEpRecovery(player: Player): boolean {
  return [...player.statuses].some(([status, count]) => count > 0 && STATUS_DESCRIPTIONS[status]?.preventTurnStartEpRecovery);
}

export function statusTargetAllowed(target: Combatant, status: StatusEffect, enemy?: Enemy): boolean {
  const definition = STATUS_DESCRIPTIONS[status];
  return Boolean(definition) && (!definition.requiresEp || target.maxEp > 0)
    && !definition.blockedEnemyTraits?.some(trait => enemy?.definition.traits?.includes(trait));
}
