import type { BattleEventContext, ConditionDefinition, ConditionTarget, StatusEffect } from './types';

type StatusHolder = {
  hp: number;
  maxHp: number;
  ep: number;
  maxEp: number;
  block: number;
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

  const value = conditionValue(condition, context);
  if (value === undefined) {
    return false;
  }

  return compareValue(value, condition.operator, condition.value);
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
