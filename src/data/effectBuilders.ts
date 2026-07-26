import type {
  AttackAttribute,
  CardDefinition,
  ConditionDefinition,
  EffectDefinition,
  EnemyIntent,
  RelicDefinition,
  RelicTriggerDefinition,
  StatusApplication,
  StatusEffect,
} from '../models/types';

type CardDefinitionInput = {
  id: string;
  name: string;
  rarity: CardDefinition['rarity'];
  cost: number;
  description: string;
  effects: EffectDefinition[];
  conditions?: ConditionDefinition[];
  playCondition?: CardDefinition['playCondition'];
  vanish?: boolean;
  temporary?: boolean;
  attackAttribute?: AttackAttribute;
  purgeTargetName?: string;
  purgeStatus?: StatusEffect;
};

type EnemyIntentInput = {
  label: string;
  effects: EffectDefinition[];
  conditions?: ConditionDefinition[];
  timesLimit?: number;
  enemyStatusLimit?: StatusEffect[];
  enemyStatusLimitN?: StatusEffect[];
  attackAttribute?: AttackAttribute;
};

type RelicDefinitionInput = {
  id: string;
  name: string;
  rarity: RelicDefinition['rarity'];
  description: string;
  triggers: RelicTriggerDefinition[];
  counter?: number;
};

type DerivedEffects = {
  hpDamage: number;
  hpDamageTimes: number;
  epDamage: number;
  epDamageTimes: number;
  selfHpDamage: number;
  selfHpDamageTimes: number;
  selfHpDamagePercent: number;
  selfEpDamage: number;
  selfEpDamageTimes: number;
  selfEpDamagePercent: number;
  hpHeal: number;
  epHeal: number;
  epReserveHeal: number;
  drawCards: number;
  energyGain: number;
  block: number;
  playerStatuses: StatusApplication[];
  enemyStatuses: StatusApplication[];
  attackAttribute: AttackAttribute;
};

export function defineCard(input: CardDefinitionInput): CardDefinition {
  const derived = deriveCardEffects(input.effects, input.attackAttribute ?? 'strike');

  return {
    id: input.id,
    name: input.name,
    rarity: input.rarity,
    cost: input.cost,
    description: input.description,
    playCondition: input.playCondition ?? 'none',
    hpDamage: derived.hpDamage,
    hpDrain: 0,
    hpDamageTimes: derived.hpDamageTimes,
    epDamage: derived.epDamage,
    epDamageTimes: derived.epDamageTimes,
    selfHpDamage: derived.selfHpDamage,
    selfHpDamageTimes: derived.selfHpDamageTimes,
    selfHpDamagePercent: derived.selfHpDamagePercent,
    selfEpDamage: derived.selfEpDamage,
    selfEpDamageTimes: derived.selfEpDamageTimes,
    selfEpDamagePercent: derived.selfEpDamagePercent,
    hpHeal: derived.hpHeal,
    epHeal: derived.epHeal,
    epReserveHeal: derived.epReserveHeal,
    drawCards: derived.drawCards,
    energyGain: derived.energyGain,
    vanish: input.vanish ?? false,
    temporary: input.temporary ?? false,
    conditions: input.conditions ?? cardPlayConditionToConditions(input.playCondition ?? 'none'),
    attackAttribute: derived.attackAttribute,
    effects: input.effects,
    block: derived.block,
    playerStatuses: derived.playerStatuses,
    enemyStatuses: derived.enemyStatuses,
    purgeTargetName: input.purgeTargetName,
    purgeStatus: input.purgeStatus,
  };
}

export function defineEnemyIntent(input: EnemyIntentInput): EnemyIntent {
  const derived = deriveEnemyIntentEffects(input.effects, input.attackAttribute ?? 'strike');
  const damageType = derived.hpDamage > 0 ? 'hp' : 'ep';
  const amount = damageType === 'hp' ? derived.hpDamage : derived.epDamage;

  return {
    label: input.label,
    amount,
    damageType,
    hpDamage: derived.hpDamage,
    epDamage: derived.epDamage,
    selfHpDamage: derived.selfHpDamage,
    selfHpDamagePercent: derived.selfHpDamagePercent,
    selfEpDamage: derived.selfEpDamage,
    selfEpDamagePercent: derived.selfEpDamagePercent,
    hpHeal: derived.hpHeal,
    epHeal: derived.epHeal,
    block: derived.block,
    effects: input.effects,
    playerStatuses: derived.playerStatuses,
    enemyStatuses: derived.enemyStatuses,
    conditions: [
      ...(input.conditions ?? []),
      ...enemyStatusConditions(input.enemyStatusLimit ?? [], 'has'),
      ...enemyStatusConditions(input.enemyStatusLimitN ?? [], 'notHas'),
      ...(input.timesLimit && input.timesLimit > 0
        ? [condition('intentUsageCount', 'lt', { value: input.timesLimit })]
        : []),
    ],
    timesLimit: input.timesLimit ?? 0,
    enemyStatusLimit: input.enemyStatusLimit ?? [],
    enemyStatusLimitN: input.enemyStatusLimitN ?? [],
    attackAttribute: derived.attackAttribute,
  };
}

export function defineRelic(input: RelicDefinitionInput): RelicDefinition {
  return {
    id: input.id,
    name: input.name,
    rarity: input.rarity,
    description: input.description,
    triggers: input.triggers,
    counter: input.counter,
  };
}

export function effect(
  kind: EffectDefinition['kind'],
  target: EffectDefinition['target'],
  amount: number,
  options: Partial<Omit<EffectDefinition, 'kind' | 'target' | 'amount'>> = {},
): EffectDefinition {
  return {
    kind,
    target,
    amount,
    times: options.times ?? 1,
    percentOf: options.percentOf,
    status: options.status,
    statusGroup: options.statusGroup,
    stacks: options.stacks,
    attackAttribute: options.attackAttribute,
    cardId: options.cardId,
    cardAddVariant: options.cardAddVariant,
    perStack: options.perStack,
    onlyDuringPlayerTurn: options.onlyDuringPlayerTurn,
  };
}

export function condition(
  kind: ConditionDefinition['kind'],
  operator: ConditionDefinition['operator'],
  options: Omit<ConditionDefinition, 'kind' | 'operator'> = {},
): ConditionDefinition {
  return {
    kind,
    operator,
    target: options.target,
    status: options.status,
    statuses: options.statuses,
    value: options.value,
    causeStatus: options.causeStatus,
  };
}

function cardPlayConditionToConditions(playCondition: CardDefinition['playCondition']): ConditionDefinition[] {
  if (playCondition === 'noCardsPlayedThisTurn') {
    return [condition('cardsPlayedThisTurn', 'eq', { value: 0 })];
  }

  return [];
}

function enemyStatusConditions(
  statuses: StatusEffect[],
  operator: Extract<ConditionDefinition['operator'], 'has' | 'notHas'>,
): ConditionDefinition[] {
  if (statuses.length === 0) {
    return [];
  }

  return [condition('status', operator, { target: 'self', statuses })];
}

function deriveCardEffects(effects: EffectDefinition[], fallbackAttribute: AttackAttribute): DerivedEffects {
  return deriveEffects(effects, fallbackAttribute, {
    ownTarget: 'player',
    opponentTargets: ['selectedEnemy', 'triggerEnemy', 'allEnemies'],
    ownStatusBucket: 'player',
    opponentStatusBucket: 'enemy',
  });
}

function deriveEnemyIntentEffects(effects: EffectDefinition[], fallbackAttribute: AttackAttribute): DerivedEffects {
  return deriveEffects(effects, fallbackAttribute, {
    ownTarget: 'self',
    opponentTargets: ['player'],
    ownStatusBucket: 'enemy',
    opponentStatusBucket: 'player',
  });
}

function deriveEffects(
  effects: EffectDefinition[],
  fallbackAttribute: AttackAttribute,
  targets: {
    ownTarget: EffectDefinition['target'];
    opponentTargets: EffectDefinition['target'][];
    ownStatusBucket: 'player' | 'enemy';
    opponentStatusBucket: 'player' | 'enemy';
  },
): DerivedEffects {
  const derived: DerivedEffects = {
    hpDamage: 0,
    hpDamageTimes: 0,
    epDamage: 0,
    epDamageTimes: 0,
    selfHpDamage: 0,
    selfHpDamageTimes: 0,
    selfHpDamagePercent: 0,
    selfEpDamage: 0,
    selfEpDamageTimes: 0,
    selfEpDamagePercent: 0,
    hpHeal: 0,
    epHeal: 0,
    epReserveHeal: 0,
    drawCards: 0,
    energyGain: 0,
    block: 0,
    playerStatuses: [],
    enemyStatuses: [],
    attackAttribute: fallbackAttribute,
  };

  for (const item of effects) {
    const times = item.times ?? 1;
    if (item.attackAttribute) {
      derived.attackAttribute = item.attackAttribute;
    }

    if (targets.opponentTargets.includes(item.target)) {
      applyOpponentEffect(derived, item, times, targets.opponentStatusBucket);
      continue;
    }

    if (item.target === targets.ownTarget) {
      applyOwnEffect(derived, item, times, targets.ownStatusBucket);
      continue;
    }

    if (item.target === 'player') {
      applyPlayerEffect(derived, item);
    }
  }

  return derived;
}

function applyOpponentEffect(
  derived: DerivedEffects,
  item: EffectDefinition,
  times: number,
  statusBucket: 'player' | 'enemy',
): void {
  if (item.kind === 'hpDamage') {
    derived.hpDamage += item.amount;
    derived.hpDamageTimes = Math.max(derived.hpDamageTimes, times);
  } else if (item.kind === 'epDamage') {
    derived.epDamage += item.amount;
    derived.epDamageTimes = Math.max(derived.epDamageTimes, times);
  } else if (item.kind === 'status' && item.status) {
    pushStatus(derived, statusBucket, item);
  } else if (item.kind === 'addCardToHand') {
    derived.drawCards += 0;
  }
}

function applyOwnEffect(
  derived: DerivedEffects,
  item: EffectDefinition,
  times: number,
  statusBucket: 'player' | 'enemy',
): void {
  if (item.kind === 'hpDamage') {
    if (item.percentOf) {
      derived.selfHpDamagePercent += item.amount;
    } else {
      derived.selfHpDamage += item.amount;
    }
    derived.selfHpDamageTimes = Math.max(derived.selfHpDamageTimes, times);
  } else if (item.kind === 'epDamage') {
    if (item.percentOf) {
      derived.selfEpDamagePercent += item.amount;
    } else {
      derived.selfEpDamage += item.amount;
    }
    derived.selfEpDamageTimes = Math.max(derived.selfEpDamageTimes, times);
  } else if (item.kind === 'hpHeal') {
    derived.hpHeal += item.amount;
  } else if (item.kind === 'epHeal') {
    derived.epHeal += item.amount;
  } else if (item.kind === 'epReserveHeal') {
    derived.epReserveHeal += item.amount;
  } else if (item.kind === 'block') {
    derived.block += item.amount;
  } else if (item.kind === 'drawCards') {
    derived.drawCards += item.amount;
  } else if (item.kind === 'energyGain') {
    derived.energyGain += item.amount;
  } else if (item.kind === 'status' && item.status) {
    pushStatus(derived, statusBucket, item);
  }
}

function applyPlayerEffect(derived: DerivedEffects, item: EffectDefinition): void {
  if (item.kind === 'status' && item.status) {
    pushStatus(derived, 'player', item);
  }
}

function pushStatus(derived: DerivedEffects, bucket: 'player' | 'enemy', item: EffectDefinition): void {
  if (!item.status) {
    return;
  }

  const status = { effect: item.status, stacks: item.stacks ?? item.amount };
  if (bucket === 'player') {
    derived.playerStatuses.push(status);
  } else {
    derived.enemyStatuses.push(status);
  }
}
