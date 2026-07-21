export type StatusEffect =
  | 'Charm'
  | 'Lingering'
  | 'Horny'
  | 'Heat'
  | 'Frustrated'
  | 'IntrudedA'
  | 'IntrudedV'
  | 'InfestedA'
  | 'InfestedV'
  | 'MultiplePeak'
  | 'PeakHell'
  | 'Fainted';
export type AttackAttribute = 'strike' | 'slash' | 'slice' | 'love' | 'mucus';
export type EffectTarget = 'player' | 'self' | 'selectedEnemy' | 'triggerEnemy' | 'allEnemies';
export type EffectKind =
  | 'hpDamage'
  | 'epDamage'
  | 'hpHeal'
  | 'epHeal'
  | 'epReserveHeal'
  | 'block'
  | 'drawCards'
  | 'addCardToHand'
  | 'energyGain'
  | 'status'
  | 'removeStatus'
  | 'clearStatus'
  | 'discardHand'
  | 'setEpReserveRatio'
  | 'hpDrain';
export type StatusOwner = 'player' | 'enemy';
export type StatusConsumeRule = 'none' | 'one' | 'allWhileEnergy';
export type StatusVisualKey = 'breathAndEnergyPulse' | 'addCardFromPlayerFadeIn' | 'faintedDrop';
export type StatusModifierKind = 'epDamageTakenMultiplier' | 'hpDamageTakenMultiplier';
export type CardPlayCondition = 'none' | 'noCardsPlayedThisTurn';
export type EnemyIntentPoolCondition = 'enemyCharmed' | 'playerFainted';
export type Rarity = 'starter' | 'common' | 'uncommon' | 'rare' | 'event';
export const EFFECT_TIMINGS = {
  Passive: 'passive',
  BattleStart: 'battleStart',
  TurnStart: 'turnStart',
  EnemyEpPeak: 'enemyEpPeak',
  PlayerEpPeak: 'playerEpPeak',
  DamageCalculation: 'damageCalculation',
  EnemyDamaged: 'enemyDamaged',
  CardDrawn: 'cardDrawn',
  BlockGained: 'blockGained',
  PurgePlayed: 'purgePlayed',
  StatusApplied: 'statusApplied',
  PlayerActionStart: 'playerActionStart',
} as const;
export type EffectTiming = typeof EFFECT_TIMINGS[keyof typeof EFFECT_TIMINGS];

export type HpDrainValue = number | 'targetMaxEp';
export type EffectPercentOf = 'playerMaxHp' | 'playerMaxEp' | 'selfCurrentHp' | 'selfMaxEp' | 'targetMaxEp';
export type CardAddVariant = 'default' | 'purgeForStatusOwner';

export interface StatusApplication {
  effect: StatusEffect;
  stacks: number;
}

export interface EffectDefinition {
  kind: EffectKind;
  target: EffectTarget;
  amount: number;
  times: number;
  percentOf?: EffectPercentOf;
  status?: StatusEffect;
  statusGroup?: string;
  stacks?: number;
  attackAttribute?: AttackAttribute;
  cardId?: string;
  cardAddVariant?: CardAddVariant;
  perStack?: boolean;
  onlyDuringPlayerTurn?: boolean;
}

export interface RelicTriggerDefinition {
  timing: EffectTiming;
  effects: EffectDefinition[];
}

export interface StatusModifierDefinition {
  kind: StatusModifierKind;
  amount: number;
  target: EffectTarget;
}

export interface StatusTriggerCondition {
  purgeCausedEpPeak?: boolean;
}

export interface StatusTriggerDefinition {
  timing: EffectTiming;
  effects: EffectDefinition[];
  modifiers?: StatusModifierDefinition[];
  visuals?: StatusVisualKey[];
  consumeRule?: StatusConsumeRule;
  conditions?: StatusTriggerCondition;
  order?: number;
}

export interface StatusDefinition {
  name: StatusEffect;
  description: string;
  remain: 0 | 1;
  consumeEachTurn: 0 | 1;
  allowedOwners: StatusOwner[];
  triggers: StatusTriggerDefinition[];
  iconText?: string;
  iconColor?: number;
  exclusiveGroup?: string;
  groupRank?: number;
  singleStack?: boolean;
}

export interface CardDefinition {
  id: string;
  name: string;
  rarity: Rarity;
  cost: number;
  description: string;
  playCondition: CardPlayCondition;
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
  effects: EffectDefinition[];
  block: number;
  playerStatuses: StatusApplication[];
  enemyStatuses: StatusApplication[];
  purgeTargetName?: string;
  purgeStatus?: StatusEffect;
}

export interface RelicDefinition {
  id: string;
  name: string;
  rarity: Rarity;
  description: string;
  triggers: RelicTriggerDefinition[];
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
  hpDamage: number;
  epDamage: number;
  selfHpDamage: number;
  selfHpDamagePercent: number;
  selfEpDamage: number;
  selfEpDamagePercent: number;
  hpHeal: number;
  epHeal: number;
  block: number;
  effects: EffectDefinition[];
  playerStatuses: StatusApplication[];
  enemyStatuses: StatusApplication[];
  timesLimit: number;
  enemyStatusLimit: StatusEffect[];
  enemyStatusLimitN: StatusEffect[];
  attackAttribute: AttackAttribute;
  causedByStatus?: StatusEffect;
  intentKey?: string;
}

export interface EnemyDefinition {
  id: string;
  name: string;
  maxHp: number;
  maxEp: number;
  stages: number[];
  threat: number;
  intentEConditions: EnemyIntentPoolCondition[];
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
