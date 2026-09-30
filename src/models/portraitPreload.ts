import { STATUS_DESCRIPTIONS } from '../data/statuses';
import type { EffectDefinition, StatusEffect } from './types';
import type { PortraitContext, PortraitSelection } from './portraitSelection';

/** Conservative asset-only forecast. Never rolls chance, executes effects, or changes game state. */
export function portraitEffectPreloadIds(selection: PortraitSelection, context: PortraitContext, effects: readonly EffectDefinition[], actorIsPlayer: boolean): string[] {
  let projected = { ...context, statuses: new Set(context.statuses), statusStacks: new Map(context.statusStacks ?? [...context.statuses].map(id => [id, 1])) };
  const ids = new Set(selection.preloadIds(projected));
  const add = (events: string[] = []) => selection.preloadIds(projected, events).forEach(id => ids.add(id));
  const damageEvents = new Set<string>();
  for (const effect of effects) {
    if (effect.chance === 0) continue;
    const playerTarget = effect.target === 'player' || (actorIsPlayer && effect.target === 'self');
    if (effect.kind === 'status' && effect.status) {
      if (!playerTarget) {
        if (/^Insert[AVM]$/.test(effect.status)) projected.hasInserted = true;
        if (/^Intruded[AVM]$/.test(effect.status)) projected.hasIntruded = true;
      } else {
        const definition = STATUS_DESCRIPTIONS[effect.status];
        let status: string = effect.status;
        let stacks = definition.durationTurns ?? (definition.singleStack ? 1 : (projected.statusStacks.get(status) ?? 0) + (effect.stacks ?? effect.randomAmount?.max ?? effect.amount));
        if (definition.exclusiveGroup) {
          const group = Object.entries(STATUS_DESCRIPTIONS).filter(([, candidate]) => candidate.exclusiveGroup === definition.exclusiveGroup);
          const currentRank = Math.max(0, ...group.filter(([id]) => projected.statuses.has(id)).map(([, d]) => d.groupRank ?? 0));
          const rank = Math.min(Math.max(...group.map(([, d]) => d.groupRank ?? 0)), currentRank + (definition.groupRank ?? 1));
          status = group.find(([, d]) => d.groupRank === rank)?.[0] ?? status;
          for (const [id] of group) { projected.statuses.delete(id); projected.statusStacks.delete(id); }
          stacks = 1;
        }
        if (stacks > 0) { projected.statuses.add(status); projected.statusStacks.set(status, stacks); }
      }
      add();
    } else if (effect.kind === 'removeStatus' && playerTarget) {
      for (const status of projected.statuses) {
        if (status !== effect.status && (!effect.statusGroup || STATUS_DESCRIPTIONS[status as StatusEffect]?.exclusiveGroup !== effect.statusGroup)) continue;
        const stacks = effect.amount > 0 ? Math.max(0, (projected.statusStacks.get(status) ?? 1) - effect.amount) : 0;
        if (stacks > 0) projected.statusStacks.set(status, stacks);
        else { projected.statuses.delete(status); projected.statusStacks.delete(status); }
      }
      add();
    }
    if (playerTarget && effect.kind === 'epDamage') { damageEvents.add('EPdamage'); damageEvents.add('peak'); }
    if (playerTarget && effect.kind === 'hpDamage') damageEvents.add('HPdamage');
    // Prefetch both persistent and transient art for each possible intermediate state.
    for (const event of damageEvents) add([event]);
  }
  return [...ids];
}
