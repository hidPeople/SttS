import { STATUS_DESCRIPTIONS } from '../data/statuses';
import type { Combatant, Enemy, Player } from './Combatants';
import type { StatusEffect } from './types';

export interface StatusRuntimeSnapshot {
  turn: number;
  orgasmHistory: number[];
  expiries?: [StatusEffect, number][][];
  counted?: [StatusEffect, number][];
}

/** Fixed durations use the player-round clock, independent of trigger count. */
export class StatusRuntime {
  turn = 0;
  private expiries = new WeakMap<Combatant, Map<StatusEffect, number>>();
  private counted = new Map<StatusEffect, number>();
  private orgasmHistory: number[] = [];

  applyDuration(owner: Combatant, status: StatusEffect, isPlayerTurn: boolean): void {
    const duration = STATUS_DESCRIPTIONS[status]?.durationTurns;
    if (!duration) return;
    let entries = this.expiries.get(owner);
    if (!entries) { entries = new Map(); this.expiries.set(owner, entries); }
    entries.set(status, this.turn + duration + (isPlayerTurn ? 0 : 1));
    owner.statuses.set(status, duration);
  }

  advance(player: Player, enemies: Enemy[], previousOrgasms: number): void {
    if (this.turn > 0) this.orgasmHistory.push(previousOrgasms);
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

  hadNoOrgasms(turns: number): boolean {
    return turns > 0 && this.orgasmHistory.length >= turns && this.orgasmHistory.slice(-turns).every(count => count === 0);
  }

  snapshot(owners: Combatant[] = []): StatusRuntimeSnapshot {
    return { turn: this.turn, orgasmHistory: [...this.orgasmHistory],
      expiries: owners.map(owner => [...(this.expiries.get(owner) ?? [])]), counted: [...this.counted] };
  }
  restore(snapshot: Partial<StatusRuntimeSnapshot> & { turn: number }, owners: Combatant[] = []): void {
    this.turn = Math.max(0, Math.floor(snapshot.turn));
    this.orgasmHistory = [...(snapshot.orgasmHistory ?? [])];
    this.counted = new Map(snapshot.counted ?? []);
    this.expiries = new WeakMap();
    owners.forEach((owner, index) => {
      const entries = snapshot.expiries?.[index] ?? [...owner.statuses]
        .filter(([status]) => STATUS_DESCRIPTIONS[status]?.durationTurns)
        .map(([status, remaining]): [StatusEffect, number] => [status, this.turn + remaining]);
      this.expiries.set(owner, new Map(entries));
    });
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
