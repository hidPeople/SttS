import type { StatusDefinition, StatusOwner } from './types';

/** Actual positive additions only. Promotions use the destination definition. */
export function statusApplicationVisual(definition: StatusDefinition, owner: StatusOwner, addedStacks: number) {
  const visual = definition.visuals?.applied;
  if (!visual || addedStacks <= 0 || (visual.owners && !visual.owners.includes(owner))) return undefined;
  const count = visual.count === 'addedStacks' ? addedStacks : visual.count === 'groupRank' ? definition.groupRank ?? 1 : visual.count;
  return { effect: visual.effect, count: Math.max(0, Math.ceil(count)) };
}
