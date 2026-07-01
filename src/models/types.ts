export type StatusEffect = 'Charm' | 'Lingering';
export type AttackAttribute = 'strike' | 'slash' | 'love';
export type EffectTarget = 'self' | 'enemy';

export interface StatusApplication {
  effect: StatusEffect;
  stacks: number;
}

export interface CardDefinition {
  id: string;
  name: string;
  cost: number;
  description: string;
  hpDamage: number;
  hpDamageTimes: number;
  mpDamage: number;
  mpDamageTimes: number;
  selfHpDamage: number;
  selfHpDamageTimes: number;
  selfMpDamage: number;
  selfMpDamageTimes: number;
  attackAttribute: AttackAttribute;
  block: number;
  buffs: StatusApplication[];
  debuffs: StatusApplication[];
}

export interface CardInstance {
  uid: string;
  definition: CardDefinition;
}

export interface EnemyIntent {
  label: string;
  amount: number;
  damageType: 'hp' | 'mp';
  attackAttribute: AttackAttribute;
}

export interface EnemyDefinition {
  id: string;
  name: string;
  maxHp: number;
  maxMp: number;
  intents: EnemyIntent[];
}
