export type StatusEffect = 'Charm';
export type AttackAttribute = 'strike' | 'slash' | 'love';

export interface CardDefinition {
  id: string;
  name: string;
  cost: number;
  description: string;
  hpDamage?: number;
  mpDamage?: number;
  attackAttribute?: AttackAttribute;
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
  attackAttribute: AttackAttribute;
}
