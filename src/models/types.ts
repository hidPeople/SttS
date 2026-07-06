export type StatusEffect = 'Charm' | 'Lingering' | 'Horny' | 'Heat' | 'Frustrated';
export type AttackAttribute = 'strike' | 'slash' | 'love';
export type EffectTarget = 'self' | 'enemy';
export type Rarity = 'starter' | 'common' | 'uncommon' | 'rare' | 'event';
export type EffectTiming =
  | 'passive'
  | 'battleStart'
  | 'turnStart'
  | 'enemyEpPeak'
  | 'playerEpPeak'
  | 'damageCalculation'
  | 'enemyDamaged'
  | 'cardDrawn'
  | 'blockGained';

export type HpDrainValue = number | 'targetMaxEp';

export interface StatusApplication {
  effect: StatusEffect;
  stacks: number;
}

export interface CardDefinition {
  id: string;
  name: string;
  rarity: Rarity;
  cost: number;
  description: string;
  hpDamage: number;
  hpDrain: number;
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
  exhaust: boolean;
  temporary: boolean;
  attackAttribute: AttackAttribute;
  block: number;
  buffs: StatusApplication[];
  debuffs: StatusApplication[];
}

export interface RelicDefinition {
  id: string;
  name: string;
  rarity: Rarity;
  description: string;
  hpDamage: number;
  epDamage: number;
  selfHpDamage: number;
  selfEpDamage: number;
  selfEpDamagePercent: number;
  hpHeal: number;
  epHeal: number;
  epReserveHeal: number;
  drawCards: number;
  energyGain: number;
  attackAttribute: AttackAttribute;
  block: number;
  buffs: StatusApplication[];
  debuffs: StatusApplication[];
  hpDrain: HpDrainValue;
  timing: EffectTiming;
  counter?: number;
}

export interface CardInstance {
  uid: string;
  definition: CardDefinition;
}

export interface EnemyIntent {
  label: string;
  amount: number;
  damageType: 'hp' | 'ep';
  selfHpDamage: number;
  selfEpDamage: number;
  attackAttribute: AttackAttribute;
  causedByStatus?: StatusEffect;
}

export interface EnemyDefinition {
  id: string;
  name: string;
  maxHp: number;
  maxEp: number;
  intents: EnemyIntent[];
  intents_E: EnemyIntent[];
}

export interface PlayerDefinition {
  id: string;
  name: string;
  maxHp: number;
  maxEp: number;
  maxEnergy: number;
  relics: string[];
  startingDeckIds: string[];
}
