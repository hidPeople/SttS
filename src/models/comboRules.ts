import type { CardDefinition, CardInstance, EffectDefinition, RelicDefinition, StatusEffect } from './types';
import type { Enemy, Player } from './Combatants';

export type ComboEvent =
  | { kind: 'discard'; count: number }
  | { kind: 'exhaustGenerated'; count: number }
  | { kind: 'promotion'; group: string }
  | { kind: 'overheal'; amount: number }
  | { kind: 'selfOnlyEp' };
export interface ComboAction {
  relic: RelicDefinition;
  effect: EffectDefinition;
  randomEnemy?: boolean;
  /** Shared by one removal event for one relic; damage still resolves per card. */
  flavorBatch?: { announced: boolean };
}

/** Event-driven counters, scoped to a battle; no update-loop scanning or relic-ID branches. */
export class ComboRelics {
  private discarded: Record<string, number> = {};
  snapshot(): Record<string, number> { return { ...this.discarded }; }
  restore(value?: Record<string, number>): void { this.discarded = { ...value }; }
  dispatch(event: ComboEvent, relics: RelicDefinition[]): ComboAction[] {
    const actions: ComboAction[] = [];
    for (const relic of relics) {
      const rule = relic.comboRules;
      if (!rule) continue;
      const flavorBatch = event.kind === 'exhaustGenerated' ? { announced: false } : undefined;
      const add = (kind: EffectDefinition['kind'], target: EffectDefinition['target'], amount: number, count = 1, randomEnemy = false) => {
        for (let i = 0; i < count && amount > 0; i++) actions.push({ relic, randomEnemy, flavorBatch,
          effect: { kind, target, amount, times: 1, ...(kind === 'epDamage' ? { attackAttribute: 'love' as const } : {}) } });
      };
      if (event.kind === 'discard' && rule.discardAttack) {
        const every = Math.max(1, Math.floor(rule.discardAttack.every));
        const total = (this.discarded[relic.id] ?? 0) + event.count;
        this.discarded[relic.id] = total % every;
        add('epDamage', 'selectedEnemy', rule.discardAttack.damage, Math.floor(total / every), true);
      }
      if (event.kind === 'exhaustGenerated') add('epDamage', 'selectedEnemy', rule.generatedExhaustDamage ?? 0, event.count, true);
      if (event.kind === 'promotion' && rule.promotionEnergy?.group === event.group) add('energyGain', 'player', rule.promotionEnergy.amount);
      if (event.kind === 'overheal') add('block', 'player', Math.ceil(event.amount * (rule.overhealBlockRatio ?? 0)));
      if (event.kind === 'selfOnlyEp') add('epDamage', 'allEnemies', rule.selfOnlyEpDamage ?? 0);
    }
    return actions;
  }
}

export function connectedTargets(card: CardDefinition | undefined, enemies: Enemy[]): Enemy[] {
  return [...new Set((card?.connection?.parts ?? []).flatMap(part => enemies.filter(enemy => !enemy.isDefeated && enemy.hasStatus(`Insert${part}`))))];
}
export type TargetOccupancyFailure =
  | { kind: 'occupied'; part: 'M' | 'V' | 'A'; enemy: Enemy; occupancy: 'insert' | 'intruded' }
  | { kind: 'full'; parts: ('M' | 'V' | 'A')[] };

/** Validate the chosen enemy before spending energy or changing the hand. */
export function targetOccupancyFailure(card: CardDefinition, selectedEnemy: Enemy | undefined, enemies: Enemy[]): TargetOccupancyFailure | undefined {
  const rule = card.targetOccupancy;
  if (!rule) return undefined;
  const alive = enemies.filter(enemy => !enemy.isDefeated);
  const occupants = rule.parts.flatMap(part => rule.kinds.flatMap(occupancy =>
    alive.filter(enemy => enemy.hasStatus(`${occupancy === 'insert' ? 'Insert' : 'Intruded'}${part}` as StatusEffect))
      .map(enemy => ({ kind: 'occupied' as const, part, enemy, occupancy }))));
  if (occupants.length) return occupants.some(entry => entry.enemy === selectedEnemy) ? undefined : occupants[0];
  if (rule.requireFreePart && rule.parts.length && rule.parts.every(part =>
    alive.some(enemy => enemy.hasStatus(`Insert${part}`) || enemy.hasStatus(`Intruded${part}`)))) {
    return { kind: 'full', parts: rule.parts };
  }
  return undefined;
}
export function connectedParts(card: CardDefinition | undefined, enemies: Enemy[]): ('M' | 'V' | 'A')[] {
  return (card?.connection?.parts ?? []).filter(part => enemies.some(enemy => !enemy.isDefeated && enemy.hasStatus(`Insert${part}`)));
}
export function canRepeatSequence(effect: EffectDefinition, player: Player, targets: Enemy[]): boolean {
  return targets.length > 0 && player.hp > (effect.hpCost ?? 0)
    && (!effect.statusCost || (player.statuses.get(effect.statusCost.status) ?? 0) >= effect.statusCost.amount);
}
export function canCopyCard(card: CardInstance, relic: RelicDefinition): boolean {
  return Boolean(relic.comboRules?.copyCategory && card.definition.categories.includes(relic.comboRules.copyCategory) && card.copiedByRelic !== relic.id);
}
