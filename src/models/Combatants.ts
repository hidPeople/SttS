import type { EnemyIntent, StatusEffect } from './types';

export class Combatant {
  hp: number;
  mp: number;
  block = 0;
  statuses = new Set<StatusEffect>();

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

  statusLabel(): string {
    return Array.from(this.statuses).join(', ') || 'None';
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
  };

  constructor() {
    super('Training Wraith', 54, 12);
  }

  currentIntent(): EnemyIntent {
    if (this.statuses.has('Charm')) {
      return {
        label: `Charm: Attack ${this.intent.amount} MP`,
        amount: this.intent.amount,
        damageType: 'mp',
      };
    }

    return this.intent;
  }

  breakMp(): void {
    this.mp = this.maxMp;
  }
}
