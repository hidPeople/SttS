import type { BattleEventContext, ConditionDefinition, ConditionTarget, EnemyTrait, EpDamagePart, StatusEffect } from './types';

type StatusHolder = {
  hp: number;
  maxHp: number;
  ep: number;
  maxEp: number;
  block: number;
  isDefeated?: boolean;
  statuses: Map<StatusEffect, number>;
};

export function evaluateConditions(
  conditions: readonly ConditionDefinition[] | undefined,
  context: BattleEventContext,
): boolean {
  if (!conditions || conditions.length === 0) {
    return true;
  }

  return conditions.every((condition) => evaluateCondition(condition, context));
}

export function firstMatchingCondition(
  conditions: readonly ConditionDefinition[] | undefined,
  context: BattleEventContext,
): ConditionDefinition | undefined {
  return conditions?.find((condition) => evaluateCondition(condition, context));
}

export function conditionCauseStatus(condition: ConditionDefinition | undefined): StatusEffect | undefined {
  if (!condition) {
    return undefined;
  }

  return condition.causeStatus ?? condition.status;
}

function evaluateCondition(condition: ConditionDefinition, context: BattleEventContext): boolean {
  if (condition.kind === 'status') {
    return evaluateStatusCondition(condition, context);
  }

  if (condition.kind === 'relic') {
    return evaluateRelicCondition(condition, context);
  }

  if (condition.kind === 'enemyTrait') {
    return evaluateEnemyTraitCondition(condition, context);
  }

  if (condition.kind === 'bodyPartStatus') {
    return evaluateBodyPartStatusCondition(condition, context);
  }

  const value = conditionValue(condition, context);
  if (value === undefined) {
    return false;
  }

  return compareValue(value, condition.operator, condition.value);
}

function evaluateBodyPartStatusCondition(condition: ConditionDefinition, context: BattleEventContext): boolean {
  const parts = condition.parts ?? [];
  if (parts.length === 0) {
    return false;
  }

  const statuses = parts.flatMap((part) => bodyPartStatuses(part, condition.bodyPartStatusKinds));
  if (statuses.length === 0) {
    return false;
  }

  const holders = condition.target
    ? [conditionTarget(condition.target, context)].filter((target): target is StatusHolder => Boolean(target))
    : context.enemies.filter((enemy) => !enemy.isDefeated);
  const count = holders.reduce((sum, holder) => (
    sum + statuses.reduce((statusSum, status) => statusSum + ((holder.statuses.get(status) ?? 0) > 0 ? 1 : 0), 0)
  ), 0);
  const hasAny = count > 0;

  if (condition.operator === 'has') {
    return hasAny;
  }

  if (condition.operator === 'notHas') {
    return !hasAny;
  }

  return compareValue(count, condition.operator, condition.value);
}

function evaluateEnemyTraitCondition(condition: ConditionDefinition, context: BattleEventContext): boolean {
  const target = conditionTarget(condition.target ?? 'selectedEnemy', context) as (
    StatusHolder & { definition?: { traits?: EnemyTrait[] } }
  ) | undefined;
  const traits = condition.enemyTraits ?? (condition.enemyTrait ? [condition.enemyTrait] : []);
  if (traits.length === 0) {
    return false;
  }

  const targetTraits = target?.definition?.traits ?? [];
  const count = traits.reduce((sum, trait) => sum + (targetTraits.includes(trait) ? 1 : 0), 0);
  const hasAny = count > 0;
  if (condition.operator === 'has') {
    return hasAny;
  }

  if (condition.operator === 'notHas') {
    return !hasAny;
  }

  return compareValue(count, condition.operator, condition.value);
}

function bodyPartStatuses(
  part: EpDamagePart,
  kinds: ConditionDefinition['bodyPartStatusKinds'] = ['insert', 'intruded'],
): StatusEffect[] {
  const statuses: StatusEffect[] = [];
  if (kinds.includes('insert')) {
    statuses.push(`Insert${part}` as StatusEffect);
  }
  if (kinds.includes('intruded')) {
    statuses.push(`Intruded${part}` as StatusEffect);
  }
  return statuses;
}

function evaluateRelicCondition(condition: ConditionDefinition, context: BattleEventContext): boolean {
  const relicIds = condition.relicIds ?? (condition.relicId ? [condition.relicId] : []);
  if (relicIds.length === 0) {
    return false;
  }

  const ownedCount = relicIds.reduce((count, relicId) => (
    context.player.relicIds.includes(relicId) ? count + 1 : count
  ), 0);
  const hasAny = ownedCount > 0;
  if (condition.operator === 'has') {
    return hasAny;
  }

  if (condition.operator === 'notHas') {
    return !hasAny;
  }

  return compareValue(ownedCount, condition.operator, condition.value);
}

function evaluateStatusCondition(condition: ConditionDefinition, context: BattleEventContext): boolean {
  const target = conditionTarget(condition.target ?? 'actor', context);
  if (!target) {
    return condition.operator === 'notHas';
  }

  const statuses = condition.statuses ?? (condition.status ? [condition.status] : []);
  if (statuses.length === 0) {
    return false;
  }

  const hasAny = statuses.some((status) => (target.statuses.get(status) ?? 0) > 0);
  if (condition.operator === 'has') {
    return hasAny;
  }

  if (condition.operator === 'notHas') {
    return !hasAny;
  }

  const stackCount = statuses.reduce((sum, status) => sum + (target.statuses.get(status) ?? 0), 0);
  return compareValue(stackCount, condition.operator, condition.value);
}

function conditionValue(condition: ConditionDefinition, context: BattleEventContext): number | boolean | undefined {
  if (condition.kind === 'cardsPlayedThisTurn') {
    return context.cardsPlayedThisTurn ?? 0;
  }

  if (condition.kind === 'intentUsageCount') {
    return context.intentUsageCount ?? 0;
  }

  if (condition.kind === 'flavorValue') {
    if (!condition.valueKey) {
      return undefined;
    }
    const value = context.flavorValues?.[condition.valueKey];
    return typeof value === 'number' || typeof value === 'boolean' ? value : undefined;
  }

  if (condition.kind === 'purgeCausedEpPeak') {
    return Boolean(context.purgeCausedEpPeak ?? context.causedEpPeak);
  }

  if (condition.kind === 'purgeWillCauseEpPeak') {
    return Boolean(context.purgeWillCauseEpPeak);
  }

  if (condition.kind === 'isPlayerTurn') {
    return Boolean(context.isPlayerTurn);
  }

  if (condition.kind === 'aliveEnemyCount') {
    return context.enemies.filter((enemy) => !enemy.isDefeated).length;
  }

  const target = conditionTarget(condition.target ?? 'actor', context);
  if (!target) {
    return undefined;
  }

  if (condition.kind === 'hp') {
    return target.hp;
  }

  if (condition.kind === 'hpPercent') {
    return target.maxHp > 0 ? (target.hp / target.maxHp) * 100 : 0;
  }

  if (condition.kind === 'ep') {
    return target.ep;
  }

  if (condition.kind === 'epPercent') {
    return target.maxEp > 0 ? (target.ep / target.maxEp) * 100 : 0;
  }

  if (condition.kind === 'block') {
    return target.block;
  }

  return undefined;
}

function conditionTarget(target: ConditionTarget, context: BattleEventContext): StatusHolder | undefined {
  if (target === 'player') {
    return context.player;
  }

  if (target === 'actor' || target === 'self') {
    return context.actor;
  }

  if (target === 'selectedEnemy') {
    return context.selectedEnemy;
  }

  if (target === 'triggerEnemy') {
    return context.triggerEnemy;
  }

  if (target === 'statusOwner') {
    return context.statusOwner;
  }

  return undefined;
}

function compareValue(
  actual: number | boolean,
  operator: ConditionDefinition['operator'],
  expected: ConditionDefinition['value'],
): boolean {
  if (operator === 'eq') {
    return actual === expected;
  }

  if (operator === 'notEq') {
    return actual !== expected;
  }

  if (typeof actual !== 'number' || typeof expected !== 'number') {
    return false;
  }

  if (operator === 'gt') {
    return actual > expected;
  }

  if (operator === 'gte') {
    return actual >= expected;
  }

  if (operator === 'lt') {
    return actual < expected;
  }

  if (operator === 'lte') {
    return actual <= expected;
  }

  return false;
}
