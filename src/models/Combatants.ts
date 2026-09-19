import { conditionCauseStatus, evaluateConditions, firstMatchingCondition } from './conditions';
import { statusTriggersForTiming } from '../data/statuses';
import { EFFECT_TIMINGS } from './types';
import { englishText } from './localization';
import { energyRecovery, removeRecoveredRestrictions } from './statusRestrictions';
import { EP_DAMAGE_PARTS, type BattleEventContext, type EnemyDefinition, type EnemyIntent, type EpDamagePart, type PlayerDefinition, type PlayerEpDamageRecord, type StatusEffect } from './types';

export class Combatant {
  hp: number;
  ep: number;
  block = 0;
  statuses = new Map<StatusEffect, number>();

  constructor(
    readonly name: string,
    readonly maxHp: number,
    readonly maxEp: number,
  ) {
    this.hp = maxHp;
    this.ep = 0;
  }

  get isDefeated(): boolean {
    return this.hp <= 0;
  }

  healHp(amount: number): void {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  takeHpDamage(amount: number): number {
    const blocked = Math.min(this.block, amount);
    this.block -= blocked;
    const damage = amount - blocked;
    this.hp = Math.max(0, this.hp - damage);
    return damage;
  }

  takeDirectHpDamage(amount: number): void {
    this.hp = Math.max(0, this.hp - amount);
  }

  takeEpDamage(amount: number): void {
    this.ep = Math.min(this.maxEp, this.ep + amount);
  }

  addStatus(status: StatusEffect, stacks = 1): void {
    this.statuses.set(status, (this.statuses.get(status) ?? 0) + stacks);
  }

  hasStatus(status: StatusEffect): boolean {
    return (this.statuses.get(status) ?? 0) > 0;
  }

  consumeStatus(status: StatusEffect, stacks = 1): boolean {
    const current = this.statuses.get(status) ?? 0;
    if (current <= 0 || stacks <= 0) {
      return false;
    }

    if (current <= stacks) {
      this.statuses.delete(status);
    } else {
      this.statuses.set(status, current - stacks);
    }

    return true;
  }

  statusLabel(): string {
    const labels = Array.from(this.statuses.entries()).map(([status, stacks]) =>
      stacks > 1 ? `${status} x${stacks}` : status,
    );
    return labels.join(', ') || 'None';
  }
}

export class Player extends Combatant {
  statusDrainCounts = new Map<StatusEffect, number>();
  readonly maxEnergy: number;
  readonly relicIds: string[];
  energy: number;
  epPeakCount = 0;
  epPeaksThisBattle = 0;
  epDamageByPart: Record<EpDamagePart, number> = createEpPartRecord();
  epPeakByPart: Record<EpDamagePart, number> = createEpPartRecord();
  recentEpPeakByPart: Record<EpDamagePart, number> = createEpPartRecord();
  epDamageRecords: PlayerEpDamageRecord[] = [];
  lastEpDamageParts: EpDamagePart[] = ['M'];
  statusActiveTurns: Partial<Record<StatusEffect, number>> = {};

  constructor(readonly definition: PlayerDefinition) {
    super(englishText(definition.name), definition.maxHp, definition.maxEp);
    this.maxEnergy = definition.maxEnergy;
    this.relicIds = [...definition.relics];
    this.energy = 0;
    for (const part of EP_DAMAGE_PARTS) {
      this.epDamageByPart[part] = definition.initialEpProgress?.[part].epDamage ?? 0;
      this.epPeakByPart[part] = definition.initialEpProgress?.[part].peakCount ?? 0;
    }
  }

  startTurn(resetBlock = true, recoverEp = true): StatusEffect | undefined {
    if (resetBlock) {
      this.block = 0;
    }
    removeRecoveredRestrictions(this);
    const recovery = energyRecovery(this, this.maxEnergy, true);
    this.energy = recovery.amount;
    if (recoverEp) this.ep = Math.max(0, this.ep - 1);
    return recovery.cause;
  }

  override healHp(amount: number): void {
    super.healHp(amount);
    removeRecoveredRestrictions(this);
  }

  override addStatus(status: StatusEffect, stacks = 1): void {
    if (!this.hasStatus(status)) this.statusDrainCounts.delete(status);
    super.addStatus(status, stacks);
  }

  takeEcstasyDamage(amount: number): boolean {
    let remaining = amount;
    let peaked = false;

    while (remaining > 0) {
      const capacity = this.maxEp - this.ep;
      if (capacity > remaining) {
        this.ep += remaining;
        return peaked;
      }

      remaining -= capacity;
      this.ep = this.maxEp;
      this.recoverFromEpPeak(Math.max(1, Math.floor(this.maxEp * 0.1)));
      peaked = true;
    }

    return peaked;
  }

  recoverFromEpPeak(recoveryEp: number, maxEp = this.maxEp): void {
    this.epPeakCount += 1;
    this.epPeaksThisBattle += 1;
    this.addStatus('Aftershocks');
    this.ep = Math.max(0, Math.min(maxEp, recoveryEp));
  }

  recordEpDamage(record: PlayerEpDamageRecord, developmentAmount = record.amount): void {
    const parts = sanitizeEpDamageParts(record.parts);
    const normalizedRecord = { ...record, parts };
    this.epDamageRecords.push(normalizedRecord);
    this.lastEpDamageParts = [...parts];

    for (const part of parts) {
      this.epDamageByPart[part] += developmentAmount;
      if (record.causedPeak) {
        this.epPeakByPart[part] += 1;
        this.recentEpPeakByPart[part] += 1;
      }
    }
  }

  resetRecentEpPeakByPart(): void {
    this.recentEpPeakByPart = createEpPartRecord();
  }

  get effectiveMaxEp(): number {
    let multiplier = 1;
    for (const [status, stacks] of this.statuses) {
      if (stacks <= 0) continue;
      for (const trigger of statusTriggersForTiming(status, EFFECT_TIMINGS.Passive)) {
        for (const modifier of trigger.modifiers ?? []) {
          if (modifier.kind === 'epMaxMultiplier' && ['player', 'statusOwner'].includes(modifier.target)) {
            multiplier = Math.max(multiplier, modifier.amount);
          }
        }
      }
    }
    return Math.max(1, Math.ceil(this.maxEp * multiplier));
  }
}

function createEpPartRecord(): Record<EpDamagePart, number> {
  return EP_DAMAGE_PARTS.reduce((record, part) => {
    record[part] = 0;
    return record;
  }, {} as Record<EpDamagePart, number>);
}

function sanitizeEpDamageParts(parts: EpDamagePart[]): EpDamagePart[] {
  const unique = parts.filter((part, index) => EP_DAMAGE_PARTS.includes(part) && parts.indexOf(part) === index);
  return unique.length > 0 ? unique : ['M'];
}

export class Enemy extends Combatant {
  private intentIndex = 0;
  private specialIntent?: { pool: 'e' | 'b'; intent: EnemyIntent };
  private forcedPeakAftershocksIntent?: EnemyIntent;
  private intentUsage = new Map<string, number>();

  constructor(readonly definition: EnemyDefinition) {
    super(englishText(definition.name), definition.maxHp, definition.maxEp);
  }

  currentIntent(player: Player, enemies: Enemy[] = [this]): EnemyIntent {
    const bIntentCause = this.activeBIntentCause(player, enemies);
    const bIntents = this.definition.intents_B ?? [];
    if (bIntentCause && bIntents.length > 0) {
      return this.specialPoolIntent(bIntents, 'b', bIntentCause, player, enemies);
    }

    const eIntentCause = this.activeEIntentCause(player, enemies);
    if (eIntentCause && this.definition.intents_E.length > 0) {
      if (eIntentCause === 'Charm') {
        this.clearPeakAftershocksIntent();
      }
      return this.specialPoolIntent(this.definition.intents_E, 'e', eIntentCause, player, enemies);
    }

    if (this.forcedPeakAftershocksIntent) {
      this.specialIntent = undefined;
      return {
        ...this.forcedPeakAftershocksIntent,
        intentKey: 'forced:peakAftershocks',
      };
    }

    this.specialIntent = undefined;
    return this.normalIntent(player, enemies);
  }

  private specialPoolIntent(intents: EnemyIntent[], pool: 'e' | 'b', cause: StatusEffect, player: Player, enemies: Enemy[]): EnemyIntent {
    if (this.specialIntent?.pool === pool) {
      const key = this.intentKeyFor(intents, this.specialIntent.intent, pool);
      if (this.isIntentUsable(this.specialIntent.intent, key, player, enemies)) {
        return {
          ...this.specialIntent.intent,
          causedByStatus: cause,
          intentKey: key,
        };
      }
    }

    const eligible = this.eligibleIntents(intents, pool, player, enemies);
    if (eligible.length === 0) {
      this.specialIntent = undefined;
      return this.normalIntent(player, enemies);
    }

    const choice = eligible[Math.floor(Math.random() * eligible.length)];
    this.specialIntent = { pool, intent: choice.intent };
    return {
      ...choice.intent,
      causedByStatus: cause,
      intentKey: choice.key,
    };
  }

  private activeBIntentCause(player: Player, enemies: Enemy[]): StatusEffect | undefined {
    const matchingCondition = firstMatchingCondition(this.definition.intentBConditions ?? [], this.intentContext(player, undefined, undefined, enemies));
    return conditionCauseStatus(matchingCondition);
  }

  private activeEIntentCause(player: Player, enemies: Enemy[]): StatusEffect | undefined {
    const matchingCondition = firstMatchingCondition(this.definition.intentEConditions, this.intentContext(player, undefined, undefined, enemies));
    return conditionCauseStatus(matchingCondition);
  }

  advanceIntent(intent: EnemyIntent, player: Player, enemies: Enemy[] = [this]): void {
    if (intent.intentKey) {
      this.intentUsage.set(intent.intentKey, (this.intentUsage.get(intent.intentKey) ?? 0) + 1);
    }

    if (intent.intentKey === 'forced:peakAftershocks') {
      this.clearPeakAftershocksIntent();
      return;
    }

    if (intent.causedByStatus) {
      return;
    }

    const intents = this.definition.intents;
    if (intents.length === 0) {
      return;
    }

    for (let step = 1; step <= intents.length; step += 1) {
      const nextIndex = (this.intentIndex + step) % intents.length;
      if (this.isIntentUsable(intents[nextIndex], this.intentKey('normal', nextIndex), player, enemies)) {
        this.intentIndex = nextIndex;
        return;
      }
    }
  }

  clearCharmIntent(): void {
    this.specialIntent = undefined;
  }

  hasPeakAftershocksIntent(): boolean {
    return Boolean(this.forcedPeakAftershocksIntent);
  }

  setPeakAftershocksIntent(intent: EnemyIntent): void {
    this.forcedPeakAftershocksIntent = intent;
  }

  clearPeakAftershocksIntent(): void {
    this.forcedPeakAftershocksIntent = undefined;
  }

  resetEpAfterPeak(): void {
    this.ep = 0;
  }

  private normalIntent(player: Player, enemies: Enemy[]): EnemyIntent {
    const intents = this.definition.intents;
    if (intents.length === 0) {
      return this.definition.intents_E[0];
    }

    for (let step = 0; step < intents.length; step += 1) {
      const index = (this.intentIndex + step) % intents.length;
      const intent = intents[index];
      const key = this.intentKey('normal', index);
      if (this.isIntentUsable(intent, key, player, enemies)) {
        this.intentIndex = index;
        return { ...intent, intentKey: key };
      }
    }

    return { ...intents[this.intentIndex], intentKey: this.intentKey('normal', this.intentIndex) };
  }

  private eligibleIntents(intents: EnemyIntent[], pool: 'normal' | 'e' | 'b', player: Player, enemies: Enemy[]): { intent: EnemyIntent; key: string }[] {
    return intents
      .map((intent, index) => ({ intent, key: this.intentKey(pool, index) }))
      .filter(({ intent, key }) => this.isIntentUsable(intent, key, player, enemies));
  }

  private isIntentUsable(intent: EnemyIntent, key: string, player: Player, enemies: Enemy[]): boolean {
    return evaluateConditions(intent.conditions, this.intentContext(player, intent, key, enemies));
  }

  private intentContext(player: Player, intent?: EnemyIntent, key?: string, enemies: Enemy[] = [this]): BattleEventContext {
    return {
      source: 'enemyIntent',
      sourceName: this.name,
      sourceId: this.definition.id,
      player,
      enemies,
      actor: this,
      selectedEnemy: this,
      intent,
      intentKey: key,
      intentUsageCount: key ? (this.intentUsage.get(key) ?? 0) : 0,
    };
  }

  private intentKeyFor(intents: EnemyIntent[], intent: EnemyIntent, pool: 'normal' | 'e' | 'b'): string {
    const index = intents.indexOf(intent);
    return this.intentKey(pool, Math.max(0, index));
  }

  private intentKey(pool: 'normal' | 'e' | 'b', index: number): string {
    return `${pool}:${index}`;
  }
}
