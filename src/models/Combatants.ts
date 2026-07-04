import type { EnemyDefinition, EnemyIntent, PlayerDefinition, StatusEffect } from './types';

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

  constructor(readonly definition: EnemyDefinition) {
    super(definition.name, definition.maxHp, definition.maxEp);
  }

  currentIntent(): EnemyIntent {
    if (this.hasStatus('Charm') && this.definition.intents_E.length > 0) {
      if (!this.charmIntent) {
        const index = Math.floor(Math.random() * this.definition.intents_E.length);
        this.charmIntent = this.definition.intents_E[index];
      }

      return {
        ...this.charmIntent,
        causedByStatus: 'Charm',
      };
    }

    return this.definition.intents[this.intentIndex] ?? this.definition.intents[0];
  }

  advanceIntent(intent: EnemyIntent): void {
    if (intent.causedByStatus) {
      return;
    }

    this.intentIndex = (this.intentIndex + 1) % this.definition.intents.length;
  }

  clearCharmIntent(): void {
    this.charmIntent = undefined;
  }

  resetEpAfterPeak(): void {
    this.ep = 0;
  }
}
