export type StatusEffect = 'Charm';

export interface CardDefinition {
  id: string;
  name: string;
  cost: number;
  description: string;
  hpDamage?: number;
  mpDamage?: number;
  block?: number;
  debuff?: StatusEffect;
}

export interface CardInstance {
  uid: string;
  definition: CardDefinition;
}

export interface EnemyIntent {
  label: string;
  amount: number;
  damageType: 'hp' | 'mp';
}
