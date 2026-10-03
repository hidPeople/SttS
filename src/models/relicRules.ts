import { RELIC_DEFINITIONS } from '../data/relics';
import type { Player } from './Combatants';
import type { StatusRuntime } from './statusRuntime';
import type { RelicDefinition } from './types';

/** Recompute from the run total so previews never accumulate the multiplier again. */
export function relicEpDamageTakenMultiplier(player: Pick<Player, 'relicIds' | 'orgasmCount'>): number {
  return player.relicIds.reduce((multiplier, id) => {
    return multiplier * relicOrgasmMultiplier(RELIC_DEFINITIONS[id], player.orgasmCount);
  }, 1);
}

function relicOrgasmMultiplier(relic: RelicDefinition | undefined, orgasmCount: number): number {
  return (relic?.epDamageTakenMultiplierPerOrgasm ?? 1) ** orgasmCount;
}

/** Display rounding only; damage calculations retain full precision. */
export function relicTextReplacements(relic: RelicDefinition, orgasmCount: number): Record<string, string> {
  return { relicEpDamageMultiplier: String(Number(relicOrgasmMultiplier(relic, orgasmCount).toFixed(3))) };
}

/** Run before turn-start status triggers so newly applied states act this turn. */
export function idleOrgasmRelicApplications(player: Player, runtime: StatusRuntime) {
  return player.relicIds.flatMap(id => {
    const relic = RELIC_DEFINITIONS[id];
    const rule = relic?.idleOrgasmsRule;
    return rule && !player.hasStatus(rule.status) && runtime.hadNoOrgasms(rule.turns)
      ? [{ relic, rule }] : [];
  });
}

/** Number of interval boundaries crossed, including batched Orgasms. */
export function orgasmIntervalActivations(before: number, count: number, interval?: number): number {
  if (interval === undefined) return count > 0 ? 1 : 0;
  return Math.floor((before + count) / interval) - Math.floor(before / interval);
}

export function relicStatusConsumptionBonus(player: Pick<Player, 'relicIds'>, status: import('./types').StatusEffect): number {
  return player.relicIds.reduce((sum, id) => sum + (RELIC_DEFINITIONS[id]?.statusConsumptionBonus?.[status] ?? 0), 0);
}
