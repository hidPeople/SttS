import type { Enemy, Player } from './Combatants';
import type { LocalizedText } from './localization';

export type StatusEffect =
  | 'Charm'
  | 'Lingering'
  | 'Horny'
  | 'Heat'
  | 'Frustrated'
  | 'CravingForPeaks'
  | 'IntrudedA'
  | 'IntrudedV'
  | 'IntrudedM'
  | 'InfestedA_Slime'
  | 'InfestedV_Slime'
  | 'MultiplePeak'
  | 'PeakHell'
  | 'MultiplePeaksTorture'
  | 'Fainted'
  | 'Focused'
  | 'Bound'
  | 'Escaping'
  | 'Binding'
  | 'ASensitivityLv1'
  | 'ASensitivityLv2'
  | 'ASensitivityLv3'
  | 'ASensitivityLv4'
  | 'ASensitivityLv5'
  | 'BSensitivityLv1'
  | 'BSensitivityLv2'
  | 'BSensitivityLv3'
  | 'BSensitivityLv4'
  | 'BSensitivityLv5'
  | 'CSensitivityLv1'
  | 'CSensitivityLv2'
  | 'CSensitivityLv3'
  | 'CSensitivityLv4'
  | 'CSensitivityLv5'
  | 'VSensitivityLv1'
  | 'VSensitivityLv2'
  | 'VSensitivityLv3'
  | 'VSensitivityLv4'
  | 'VSensitivityLv5'
  | 'MSensitivityLv1'
  | 'MSensitivityLv2'
  | 'MSensitivityLv3'
  | 'MSensitivityLv4'
  | 'MSensitivityLv5';
export type AttackAttribute = 'strike' | 'slash' | 'slice' | 'love' | 'mucus';
export const EP_DAMAGE_PARTS = ['A', 'B', 'C', 'V', 'M'] as const;
export type EpDamagePart = typeof EP_DAMAGE_PARTS[number];
export type EpDamagePartMode = 'static' | 'actorIntruded' | 'lastPlayerEpDamageParts';
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
  | 'discardHand'
  | 'setEpReserveRatio'
  | 'setEp'
  | 'retainBlock'
  | 'hpDrain';
export type StatusOwner = 'player' | 'enemy';
export type StatusConsumeRule = 'none' | 'one' | 'allWhileEnergy';
export type StatusVisualKey = 'breathAndEnergyPulse' | 'addCardFromPlayerFadeIn' | 'faintedDrop';
export type StatusModifierKind = 'epDamageTakenMultiplier' | 'hpDamageTakenMultiplier' | 'epMaxMultiplier';
export type CardPlayCondition = 'none' | 'noCardsPlayedThisTurn';
export type CardCategory = 'attack' | 'utility' | 'caress' | 'lust' | 'physiology' | 'remedy' | 'noMotion';
export type Rarity = 'starter' | 'common' | 'uncommon' | 'rare' | 'event';
export type BattleEventSource = 'card' | 'enemyIntent' | 'relic' | 'status' | 'system';
export type BattleLogKind = 'system' | 'status' | 'important' | 'narration' | 'quote';
export type StatusNoticeLevel = 'normal' | 'important';
export type EnemyDeathCause = 'hpDamage' | 'hpDrain' | 'selfHpDamage';
export type BattleFlavorKey =
  | 'onPlay'
  | 'onTrigger'
  | 'onApply'
  | 'onRemove'
  | 'onIntent'
  | 'onIntentWarning'
  | 'onBattleStart'
  | 'onEffect'
  | 'onChanceSuccess'
  | 'onChanceFailure'
  | 'onRandomAmountMin'
  | 'onRandomAmountMax'
  | 'onRandomAmountOther';
export type ConditionTarget = 'player' | 'actor' | 'self' | 'selectedEnemy' | 'triggerEnemy' | 'statusOwner';
export type ConditionKind =
  | 'status'
  | 'cardsPlayedThisTurn'
  | 'intentUsageCount'
  | 'purgeCausedEpPeak'
  | 'isPlayerTurn'
  | 'hp'
  | 'hpPercent'
  | 'ep'
  | 'epPercent'
  | 'block'
  | 'aliveEnemyCount';
export type ConditionOperator = 'eq' | 'notEq' | 'gt' | 'gte' | 'lt' | 'lte' | 'has' | 'notHas';
export const EFFECT_TIMINGS = {
  Passive: 'passive',
  BattleStart: 'battleStart',
  TurnStart: 'turnStart',
  EnemyEpPeak: 'enemyEpPeak',
  PlayerEpPeak: 'playerEpPeak',
  PlayerEpPeakRecovered: 'playerEpPeakRecovered',
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
export type EffectPercentOf = 'playerMaxHp' | 'playerMaxEp' | 'playerBaseMaxEp' | 'selfCurrentHp' | 'selfMaxEp' | 'targetMaxEp';
export type CardAddVariant = 'default' | 'purgeForStatusOwner' | 'resistBindingForStatusOwner';

export interface StatusApplication {
  effect: StatusEffect;
  stacks: number;
}

export interface BattleFlavorLine {
  kind: BattleLogKind;
  text: LocalizedText;
}

export interface BattleFlavorVariant {
  conditions?: ConditionDefinition[];
  lines: BattleFlavorLine[];
}

export type BattleFlavorEntry = BattleFlavorLine | BattleFlavorVariant;
export type BattleFlavorSet = Partial<Record<BattleFlavorKey, BattleFlavorEntry[]>>;

export interface ConditionDefinition {
  kind: ConditionKind;
  operator: ConditionOperator;
  target?: ConditionTarget;
  status?: StatusEffect;
  statuses?: StatusEffect[];
  value?: number | boolean;
  causeStatus?: StatusEffect;
}

export interface BattleEventContext {
  source: BattleEventSource;
  sourceName: string;
  sourceId?: string;
  player: Player;
  enemies: Enemy[];
  actor: Player | Enemy;
  target?: Player | Enemy;
  selectedEnemy?: Enemy;
  triggerEnemy?: Enemy;
  statusOwner?: Player | Enemy;
  card?: CardDefinition;
  intent?: EnemyIntent;
  intentKey?: string;
  intentUsageCount?: number;
  relic?: RelicDefinition;
  status?: StatusEffect;
  statusStacks?: number;
  statusTrigger?: StatusTriggerDefinition;
  intrusionPart?: LocalizedText;
  amount?: number;
  rawAmount?: number;
  modifiedAmount?: number;
  actualHpDamage?: number;
  blockedAmount?: number;
  causedEpPeak?: boolean;
  purgeCausedEpPeak?: boolean;
  cardsPlayedThisTurn?: number;
  isPlayerTurn?: boolean;
  skipEffectKinds?: ReadonlySet<EffectKind>;
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
  epDamageParts?: EpDamagePart[];
  epDamagePartMode?: EpDamagePartMode;
  cardId?: string;
  cardAddVariant?: CardAddVariant;
  perStack?: boolean;
  onlyDuringPlayerTurn?: boolean;
  chance?: number;
  chanceBonusStatus?: StatusEffect;
  chanceBonusTarget?: ConditionTarget;
  chanceBonusPerStack?: number;
  randomAmount?: {
    min: number;
    max: number;
  };
  flavors?: BattleFlavorSet;
}

export interface PlayerEpDamageRecord {
  amount: number;
  parts: EpDamagePart[];
  causedPeak: boolean;
  source: BattleEventSource;
  sourceName: string;
  sourceId?: string;
}

export interface RelicTriggerDefinition {
  timing: EffectTiming;
  effects: EffectDefinition[];
  conditions?: ConditionDefinition[];
  chance?: number;
  flavors?: BattleFlavorSet;
}

export interface StatusModifierDefinition {
  kind: StatusModifierKind;
  amount: number;
  target: EffectTarget;
}

export interface StatusTriggerDefinition {
  timing: EffectTiming;
  effects: EffectDefinition[];
  modifiers?: StatusModifierDefinition[];
  visuals?: StatusVisualKey[];
  consumeRule?: StatusConsumeRule;
  conditions?: ConditionDefinition[];
  chance?: number;
  order?: number;
  flavors?: BattleFlavorSet;
}

export interface StatusDefinition {
  name: LocalizedText;
  description: LocalizedText;
  remain: 0 | 1;
  consumeEachTurn: 0 | 1;
  allowedOwners: StatusOwner[];
  applyConditions?: ConditionDefinition[];
  epDamageParts?: EpDamagePart[];
  triggers: StatusTriggerDefinition[];
  iconText?: string;
  iconColor?: number;
  exclusiveGroup?: string;
  groupRank?: number;
  singleStack?: boolean;
  blockedFlavorKinds?: BattleLogKind[];
  noticeLevel?: StatusNoticeLevel;
  flavors?: BattleFlavorSet;
}

export interface CardDefinition {
  id: string;
  name: LocalizedText;
  rarity: Rarity;
  categories: CardCategory[];
  cost: number;
  description: LocalizedText;
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
  vanish: boolean;
  temporary: boolean;
  conditions: ConditionDefinition[];
  attackAttribute: AttackAttribute;
  effects: EffectDefinition[];
  block: number;
  playerStatuses: StatusApplication[];
  enemyStatuses: StatusApplication[];
  relatedEnemyName?: LocalizedText;
  purgeTargetName?: string;
  purgeStatus?: StatusEffect;
  flavors?: BattleFlavorSet;
}

export interface RelicDefinition {
  id: string;
  name: LocalizedText;
  rarity: Rarity;
  description: LocalizedText;
  triggers: RelicTriggerDefinition[];
  counter?: number;
  flavors?: BattleFlavorSet;
}

export interface CardInstance {
  uid: string;
  definition: CardDefinition;
}

export interface EnemyIntent {
  id?: string;
  label: LocalizedText;
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
  conditions: ConditionDefinition[];
  timesLimit: number;
  enemyStatusLimit: StatusEffect[];
  enemyStatusLimitN: StatusEffect[];
  attackAttribute: AttackAttribute;
  chance?: number;
  chanceBonusStatus?: StatusEffect;
  chanceBonusTarget?: ConditionTarget;
  chanceBonusPerStack?: number;
  causedByStatus?: StatusEffect;
  intentKey?: string;
  intrusionPart?: LocalizedText;
  flavors?: BattleFlavorSet;
}

export interface EnemyDeathNarration {
  cause: EnemyDeathCause;
  text: LocalizedText;
  requiredStatuses?: StatusEffect[];
  intentIds?: string[];
}

export interface EnemyDefinition {
  id: string;
  name: LocalizedText;
  maxHp: number;
  maxEp: number;
  stages: number[];
  threat: number;
  isGiant?: boolean;
  statusTriggers?: Partial<Record<StatusEffect, StatusTriggerDefinition[]>>;
  intentEConditions: ConditionDefinition[];
  intentBConditions?: ConditionDefinition[];
  intents: EnemyIntent[];
  intents_E: EnemyIntent[];
  intents_B?: EnemyIntent[];
  deathNarrations?: EnemyDeathNarration[];
}

export interface PlayerDefinition {
  id: string;
  name: LocalizedText;
  maxHp: number;
  maxEp: number;
  maxEnergy: number;
  relics: string[];
  startingDeckIds: string[];
}

