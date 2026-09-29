import { RELIC_DEFINITIONS } from '../data/relics';
import type { Player } from './Combatants';
import type { StatusRuntime } from './statusRuntime';
import type { RelicDefinition } from './types';

/** Recompute from the run total so previews never accumulate the multiplier again. */
export function relicEpDamageTakenMultiplier(player: Pick<Player, 'relicIds' | 'epPeakCount'>): number {
  return player.relicIds.reduce((multiplier, id) => {
    return multiplier * relicPeakMultiplier(RELIC_DEFINITIONS[id], player.epPeakCount);
  }, 1);
}

function relicPeakMultiplier(relic: RelicDefinition | undefined, peakCount: number): number {
  return (relic?.epDamageTakenMultiplierPerPeak ?? 1) ** peakCount;
}

/** Display rounding only; damage calculations retain full precision. */
export function relicTextReplacements(relic: RelicDefinition, peakCount: number): Record<string, string> {
  return { relicEpDamageMultiplier: String(Number(relicPeakMultiplier(relic, peakCount).toFixed(3))) };
}

/** Run before turn-start status triggers so newly applied states act this turn. */
export function idlePeakRelicApplications(player: Player, runtime: StatusRuntime) {
  return player.relicIds.flatMap(id => {
    const relic = RELIC_DEFINITIONS[id];
    const rule = relic?.idlePeakRule;
    return rule && !player.hasStatus(rule.status) && runtime.hadNoPeaks(rule.turns)
      ? [{ relic, rule }] : [];
  });
}
