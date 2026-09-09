import { evaluateConditions } from './conditions';
import type { BattleEventContext, EnemyDefinition } from './types';

// The caller supplies its already resolved intent; visual selection must never
// reroll an action or mutate combat state. First matching rule wins.
export function resolveEnemySpriteKey(definition: EnemyDefinition, context: BattleEventContext): string {
  const rule = definition.spriteRules?.find((candidate) => (
    (!candidate.intentIds || (context.intent?.id !== undefined && candidate.intentIds.includes(context.intent.id)))
    && evaluateConditions(candidate.conditions, context)
  ));
  return rule?.sprite ?? definition.sprite ?? definition.id;
}
