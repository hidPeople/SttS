import { conditionCauseStatus, evaluateConditions, firstMatchingCondition } from './conditions';
import type { BattleEventContext, EnemyDefinition, EnemyIntent, PlayerDefinition, StatusEffect } from './types';

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

  consumeStatus(status: StatusEffect): boolean {
    const current = this.statuses.get(status) ?? 0;
    if (current <= 0) {
      return false;
    }

    if (current === 1) {
      this.statuses.delete(status);
    } else {
      this.statuses.set(status, current - 1);
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
  readonly maxEnergy: number;
  readonly relicIds: string[];
  energy: number;
  epPeakCount = 0;

  constructor(readonly definition: PlayerDefinition) {
    super(definition.name, definition.maxHp, definition.maxEp);
    this.maxEnergy = definition.maxEnergy;
    this.relicIds = [...definition.relics];
    this.energy = definition.maxEnergy;
  }

  startTurn(): void {
    this.block = 0;
    this.energy = this.maxEnergy;
    this.ep = Math.max(0, this.ep - 1);
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

  recoverFromEpPeak(recoveryEp: number): void {
    this.epPeakCount += 1;
    this.addStatus('Lingering');
    this.ep = Math.max(0, Math.min(this.maxEp, recoveryEp));
  }
}

export class Enemy extends Combatant {
  private intentIndex = 0;
  private charmIntent?: EnemyIntent;
  private intentUsage = new Map<string, number>();

  constructor(readonly definition: EnemyDefinition) {
    super(definition.name, definition.maxHp, definition.maxEp);
  }

  currentIntent(player: Player): EnemyIntent {
    const eIntentCause = this.activeEIntentCause(player);
    if (eIntentCause && this.definition.intents_E.length > 0) {
      if (!this.charmIntent) {
        const eligible = this.eligibleIntents(this.definition.intents_E, 'e', player);
        if (eligible.length === 0) {
          return this.normalIntent(player);
        }

        const choice = eligible[Math.floor(Math.random() * eligible.length)];
        this.charmIntent = choice.intent;
        return {
          ...choice.intent,
          causedByStatus: eIntentCause,
          intentKey: choice.key,
        };
      }

      const key = this.intentKeyFor(this.definition.intents_E, this.charmIntent, 'e');
      return {
        ...this.charmIntent,
        causedByStatus: eIntentCause,
        intentKey: key,
      };
    }

    return this.normalIntent(player);
  }

  private activeEIntentCause(player: Player): StatusEffect | undefined {
    const matchingCondition = firstMatchingCondition(this.definition.intentEConditions, this.intentContext(player));
    return conditionCauseStatus(matchingCondition);
  }

  advanceIntent(intent: EnemyIntent, player: Player): void {
    if (intent.intentKey) {
      this.intentUsage.set(intent.intentKey, (this.intentUsage.get(intent.intentKey) ?? 0) + 1);
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
      if (this.isIntentUsable(intents[nextIndex], this.intentKey('normal', nextIndex), player)) {
        this.intentIndex = nextIndex;
        return;
      }
    }
  }

  clearCharmIntent(): void {
    this.charmIntent = undefined;
  }

  resetEpAfterPeak(): void {
    this.ep = 0;
  }

  private normalIntent(player: Player): EnemyIntent {
    const intents = this.definition.intents;
    if (intents.length === 0) {
      return this.definition.intents_E[0];
    }

    for (let step = 0; step < intents.length; step += 1) {
      const index = (this.intentIndex + step) % intents.length;
      const intent = intents[index];
      const key = this.intentKey('normal', index);
      if (this.isIntentUsable(intent, key, player)) {
        this.intentIndex = index;
        return { ...intent, intentKey: key };
      }
    }

    return { ...intents[this.intentIndex], intentKey: this.intentKey('normal', this.intentIndex) };
  }

  private eligibleIntents(intents: EnemyIntent[], pool: 'normal' | 'e', player: Player): { intent: EnemyIntent; key: string }[] {
    return intents
      .map((intent, index) => ({ intent, key: this.intentKey(pool, index) }))
      .filter(({ intent, key }) => this.isIntentUsable(intent, key, player));
  }

  private isIntentUsable(intent: EnemyIntent, key: string, player: Player): boolean {
    return evaluateConditions(intent.conditions, this.intentContext(player, intent, key));
  }

  private intentContext(player: Player, intent?: EnemyIntent, key?: string): BattleEventContext {
    return {
      source: 'enemyIntent',
      sourceName: this.name,
      sourceId: this.definition.id,
      player,
      enemies: [this],
      actor: this,
      selectedEnemy: this,
      intent,
      intentKey: key,
      intentUsageCount: key ? (this.intentUsage.get(key) ?? 0) : 0,
    };
  }

  private intentKeyFor(intents: EnemyIntent[], intent: EnemyIntent, pool: 'normal' | 'e'): string {
    const index = intents.indexOf(intent);
    return this.intentKey(pool, Math.max(0, index));
  }

  private intentKey(pool: 'normal' | 'e', index: number): string {
    return `${pool}:${index}`;
  }
}
