import type { EnemyIntent, StatusEffect } from './types';

export class Combatant {
  hp: number;
  mp: number;
  block = 0;
  statuses = new Map<StatusEffect, number>();

  constructor(
    readonly name: string,
    readonly maxHp: number,
    readonly maxMp: number,
  ) {
    this.hp = maxHp;
    this.mp = maxMp;
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

  takeMpDamage(amount: number): void {
    this.mp = Math.max(0, this.mp - amount);
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
  readonly maxEnergy = 3;
  energy = 3;
  mpBreakCount = 0;
  nextTurnEnergyPenalty = 0;

  constructor() {
    super('Player', 50, 10);
  }

  startTurn(): void {
    this.block = 0;
    this.energy = Math.max(0, this.maxEnergy - this.nextTurnEnergyPenalty);
    this.nextTurnEnergyPenalty = 0;
    this.mp = Math.min(this.maxMp, this.mp + 1);
  }

  takeMentalDamage(amount: number): boolean {
    this.takeMpDamage(amount);
    if (this.mp > 0) {
      return false;
    }

    this.mpBreakCount += 1;
    this.nextTurnEnergyPenalty = 1;
    const recoveryPercent = Math.max(10, 100 - this.mpBreakCount * 10);
    this.mp = Math.max(1, Math.ceil(this.maxMp * (recoveryPercent / 100)));
    return true;
  }
}

export class Enemy extends Combatant {
  intent: EnemyIntent = {
    label: 'Attack 7 HP',
    amount: 7,
    damageType: 'hp',
    attackAttribute: 'strike',
  };

  constructor() {
    super('Training Wraith', 54, 12);
  }

  currentIntent(): EnemyIntent {
    if (this.hasStatus('Charm')) {
      return {
        label: `Charm: Attack ${this.intent.amount} MP`,
        amount: this.intent.amount,
        damageType: 'mp',
        attackAttribute: 'love',
      };
    }

    return this.intent;
  }

  breakMp(): void {
    this.mp = this.maxMp;
  }
}
