import type { Enemy, Player } from './Combatants';
import type { LocalizedText } from './localization';

export type StatusEffect =
  | 'Charm'
  | 'Aftershocks'
  | 'Horny'
  | 'InHeat'
  | 'Frustrated'
  | 'DesperateToPeak'
  | 'IntrudedA'
  | 'IntrudedV'
  | 'IntrudedM'
  | 'InsertA'
  | 'InsertV'
  | 'InsertM'
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
export type EffectTarget = 'player' | 'self' | 'selectedEnemy' | 'triggerEnemy' | 'allEnemies'; // player=プレイヤー / self=実行主体 / selectedEnemy=選択敵 / triggerEnemy=発火元の敵 / allEnemies=生存敵全員。
// effect(kind, target, amount, options?) で定義。optionsはEffectDefinitionの任意項目。通常はtimes/chance/flavorsを使用可能（例外は各行参照）。
export type EffectKind =
  | 'hpDamage' // HP攻撃: target=対象, amount>=0; options: attackAttribute, percentOf, randomAmount, perStack。
  | 'epDamage' // EP攻撃: target=対象, amount>=0（プレイヤーには小数可）; options: epDamageParts/epDamagePartMode, attackAttribute, percentOf, randomAmount, perStack。
  | 'hpHeal' // HP回復: target=対象, amount>=0; options: percentOf, randomAmount, perStack。最大HPまで回復。
  | 'epHeal' // EP減少: target=対象, amount>=0; options: percentOf, randomAmount, perStack。下限0。プレイヤーEPがEPReserveを下回るとReserveも同値へ減少。
  | 'epReserveHeal' // EPReserve減少: target=player, amount>=0; options: percentOf, randomAmount, perStack。下限0。
  | 'block' // ブロック追加: target=対象, amount>=0; options: percentOf, randomAmount, perStack。
  | 'drawCards' // ドロー: target=player, amount=枚数（0以上の整数）; options: randomAmount, onlyDuringPlayerTurn。times/chance/perStack/効果固有flavorsは非対応。
  | 'addCardToHand' // 手札追加: target=player, amount=枚数（0以上の整数）, options.cardId必須; options: cardAddVariant, status, randomAmount, onlyDuringPlayerTurn。times/chance/perStack/効果固有flavorsは非対応。
  | 'energyGain' // プレイヤーのエナジー増減: target=player, amount=整数（負数で消費）; options: percentOf, randomAmount, perStack。
  | 'status' // 状態付与: target=対象, amount=スタック数（正の整数）, options.status必須; options: stacks（amountより優先）, perStack。timesは無視。
  | 'removeStatus' // 状態解除: target=対象, amount=0; options.status または statusGroupを指定（状態trigger内は発火元状態を省略時に使用）。
  | 'discardHand' // 手札を全て捨てる: target=player, amount=0。枚数指定なし。
  | 'setEpReserve' // EPReserve固定設定: target=player, amount>=0（端数切上げ、有効最大EPまで）; options: percentOf, randomAmount, perStack。現在EPを超えたらEPも同値へ上昇（Peak処理なし）。
  | 'setEpReserveRatio' // 現在EPを超えたらEPも同値へ上昇（Peak処理なし）。EPReserve割合設定: target=player, amount=0～1（1=基準値の100%、端数切捨て）; options.ratioBaseで基準選択（既定は有効最大EP）。percentOf/randomAmount/perStackは使用しない。
  | 'setEp' // EP固定設定: target=player, amount>=0（端数切上げ、有効最大EPまで）; options: percentOf, randomAmount, perStack。Reserveを下回ればReserveも同値へ減少、Peak処理なし。
  | 'setEpRatio' // EP割合設定: target=player, amount=0～1（1=基準値の100%、端数切捨て）; options.ratioBaseで基準選択（既定は有効最大EP）。percentOf/randomAmount/perStackは使用しない。Reserveを下回ればReserveも同値へ減少、Peak処理なし。
  | 'retainBlock' // 今ターンのブロック持越しを有効化: target=player, amount=0。
  | 'hpDrain'; // 敵HPを吸収してプレイヤーHP回復: target=敵, amount>=0; options: percentOf, randomAmount, perStack。
export type StatusOwner = 'player' | 'enemy';
export type StatusConsumeRule = 'none' | 'one' | 'allWhileEnergy';
export type StatusVisualKey = 'breathAndEnergyPulse' | 'addCardFromPlayerFadeIn' | 'faintedDrop';
export type StatusModifierKind = 'epDamageTakenMultiplier' | 'hpDamageTakenMultiplier' | 'epMaxMultiplier';
export type CardPlayCondition = 'none' | 'noCardsPlayedThisTurn';
export type CardCategory = 'attack' | 'utility' | 'caress' | 'lust' | 'physiology' | 'remedy' | 'noMotion';
export type EnemyTrait = 'male' | 'softBody' | 'sexToy';
export type Rarity = 'starter' | 'common' | 'uncommon' | 'rare' | 'event';
export type BattleEventSource = 'card' | 'enemyIntent' | 'relic' | 'status' | 'system';
export type BattleLogKind = 'system' | 'status' | 'important' | 'narration' | 'quote';
export type StatusNoticeLevel = 'normal' | 'important';
export type EnemyDeathCause = 'hpDamage' | 'hpDrain' | 'selfHpDamage';
export type BodyPartStatusKind = 'insert' | 'intruded';
export const FLAVOR_EVENTS = {
  Battle: {
    Won: 'battle.won',
    PlayerTurnStart: 'battle.playerTurnStart',
    EnemyTurnStart: 'battle.enemyTurnStart',
    ContinuousPeaks: 'battle.continuousPeaks',
    PlayerEpDamageQuote: 'battle.playerEpDamageQuote',
    PlayerEpDamageUnfelt: 'battle.playerEpDamageUnfelt',
    PlayerEpPeakAfterglow: 'battle.playerEpPeakAfterglow',
    PlayerEpPeakFirstQuote: 'battle.playerEpPeakFirstQuote',
    PlayerEpPeakFirst: 'battle.playerEpPeakFirst',
    PlayerEpPeakRepeatQuote: 'battle.playerEpPeakRepeatQuote',
    PlayerEpPeakRepeat: 'battle.playerEpPeakRepeat',
    EnemyEpPeak: 'battle.enemyEpPeak',
    AftershocksAfterConsumption: 'battle.aftershocksAfterConsumption',
    SensitivityLevelUp: 'battle.sensitivityLevelUp',
  },
  Card: {
    Play: 'card.play',
    PurgeFailed: 'card.purgeFailed',
    RejectEnergy: 'card.rejectEnergy',
    RejectBound: 'card.rejectBound',
    RejectCraving: 'card.rejectCraving',
    RejectCondition: 'card.rejectCondition',
  },
  Effect: {
    Trigger: 'effect.trigger',
    ChanceSuccess: 'effect.chanceSuccess',
    ChanceFailure: 'effect.chanceFailure',
    RandomAmountMin: 'effect.randomAmountMin',
    RandomAmountMax: 'effect.randomAmountMax',
    RandomAmountOther: 'effect.randomAmountOther',
    AddCardToHand: 'effect.addCardToHand',
    DrawCards: 'effect.drawCards',
    DiscardHand: 'effect.discardHand',
    SetEpReserveRatio: 'effect.setEpReserveRatio',
    SetEpReserve: 'effect.setEpReserve',
    SetEp: 'effect.setEp',
    SetEpRatio: 'effect.setEpRatio',
    RetainBlock: 'effect.retainBlock',
    EpReserveHeal: 'effect.epReserveHeal',
    EnergyChange: 'effect.energyChange',
    HpHeal: 'effect.hpHeal',
    EpHeal: 'effect.epHeal',
    BlockGain: 'effect.blockGain',
    HpDamage: 'effect.hpDamage',
    EpDamage: 'effect.epDamage',
    HpDrain: 'effect.hpDrain',
  },
  Status: {
    Trigger: 'status.trigger',
    Apply: 'status.apply',
    ApplyImportant: 'status.applyImportant',
    Infest: 'status.infest',
    ApplyMiss: 'status.applyMiss',
    Change: 'status.change',
    ChangeImportant: 'status.changeImportant',
    Remove: 'status.remove',
  },
  Relic: {
    Trigger: 'relic.trigger',
  },
  Enemy: {
    Intent: 'enemy.intent',
    IntentWarning: 'enemy.intentWarning',
    IntentFallback: 'enemy.intentFallback',
    IntentFailed: 'enemy.intentFailed',
    PeakAftershocksOverload: 'enemy.peakAftershocksOverload',
    DeathHpDamage: 'enemy.deathHpDamage',
    DeathHpDrain: 'enemy.deathHpDrain',
  },
} as const;
type DeepValueOf<T> = T extends object ? DeepValueOf<T[keyof T]> : T;
export type BattleFlavorEvent = DeepValueOf<typeof FLAVOR_EVENTS>;
export type ConditionTarget = 'player' | 'actor' | 'self' | 'selectedEnemy' | 'triggerEnemy' | 'statusOwner';
export type ConditionKind =
  | 'status'
  | 'relic'
  | 'enemyTrait'
  | 'bodyPartStatus'
  | 'cardsPlayedThisTurn'
  | 'intentUsageCount'
  | 'flavorValue'
  | 'purgeCausedEpPeak'
  | 'purgeWillCauseEpPeak'
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
export type EpRatioBase = 'playerMaxEp' | 'playerCurrentEp' | 'playerEpReserve'; // 割合設定の基準: 有効最大EP / 実行直前の現在EP / 実行直前のEPリセット下限。
export type EffectPercentOf = 'playerMaxHp' | 'playerMaxEp' | 'playerBaseMaxEp' | 'selfCurrentHp' | 'selfMaxEp' | 'targetMaxEp'; // amountを倍率として基準値×amountを切上げ。playerMaxEp=補正後、playerBaseMaxEp=補正前。self*/targetMaxEpは効果対象の敵を参照。
export type CardAddVariant = 'default' | 'purgeForStatusOwner' | 'pulloutForStatusOwner' | 'wriggleFreeForStatusOwner';

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
export type BattleFlavorSet = Partial<Record<BattleFlavorEvent, BattleFlavorEntry[]>>;

export interface ConditionDefinition {
  kind: ConditionKind;
  operator: ConditionOperator;
  target?: ConditionTarget;
  status?: StatusEffect;
  statuses?: StatusEffect[];
  enemyTrait?: EnemyTrait;
  enemyTraits?: EnemyTrait[];
  parts?: EpDamagePart[];
  bodyPartStatusKinds?: BodyPartStatusKind[];
  relicId?: string;
  relicIds?: string[];
  value?: number | boolean;
  valueKey?: string;
  causeStatus?: StatusEffect;
}

export interface CardDisplayNameRule {
  conditions: ConditionDefinition[];
  name: LocalizedText;
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
  purgeWillCauseEpPeak?: boolean;
  cardsPlayedThisTurn?: number;
  isPlayerTurn?: boolean;
  skipEffectKinds?: ReadonlySet<EffectKind>;
  flavorValues?: Record<string, LocalizedText | string | number | boolean | undefined>;
}

export interface EffectDefinition {
  kind: EffectKind; // 必須: 効果の種類。専用オプション・例外はEffectKindの各行を参照。
  target: EffectTarget; // 必須: 効果対象。プレイヤー専用効果にはplayerを指定。
  amount: number; // 必須: 基本量（通常0以上）。割合設定は0～1、energyGainは負数可。未使用の効果は0。
  times: number; // 1以上の整数。effect()では省略時1。status/drawCards/addCardToHandは繰返し対象外。
  percentOf?: EffectPercentOf; // 基準値×amountを切上げて効果量にする。直接割合設定の2種には使用しない。
  ratioBase?: EpRatioBase; // setEpRatio/setEpReserveRatio専用。省略時playerMaxEp。選択した基準値×amountを切捨て、繰返し時は毎回再取得。
  status?: StatusEffect; // status時必須。removeStatusの解除対象、部位別追加カードの原因状態にも使用。
  statusGroup?: string; // removeStatus用: 状態定義のexclusiveGroupに一致する状態をまとめて解除。
  stacks?: number; // status用: 正の整数。省略時は計算済みamountを付与数とする。
  attackAttribute?: AttackAttribute; // 攻撃演出の属性。strike/slash/slice/love/mucus。
  epDamageParts?: EpDamagePart[]; // EP攻撃の部位: A/B/C/V/M。複数指定可。
  epDamagePartMode?: EpDamagePartMode; // static=指定部位 / actorIntruded=実行主体の侵入部位 / lastPlayerEpDamageParts=直前の被EP攻撃部位。
  cardId?: string; // addCardToHand時必須: CARD_DEFINITIONSの登録キー。
  cardAddVariant?: CardAddVariant; // addCardToHand用: default=通常 / *ForStatusOwner=原因状態に合わせて除去カードを生成。
  perStack?: boolean; // 状態triggerからの実行時、計算済み効果量×statusStacks。直接割合設定・ドロー・手札追加には使用しない。
  onlyDuringPlayerTurn?: boolean; // trueならプレイヤーターン中のみ実行。省略時は制限なし。
  chance?: number; // 0～1（1=100%）。省略時は必ず実行。ドロー・手札追加には使用しない。
  chanceBonusStatus?: StatusEffect; // chance指定時、確率にスタック補正を加える状態。
  chanceBonusTarget?: ConditionTarget; // 補正スタックを読む対象。省略時player。
  chanceBonusPerStack?: number; // chanceへの1スタック当たり加算（負数可）。最終確率は0～1に制限。
  randomAmount?: { // 基本量/percentOfの代わりに整数を抽選。直接割合設定には使用しない。
    min: number; // 最小値を含む（切上げ）。通常0以上、energyGainは負数可。
    max: number; // 最大値を含む（切上げ）。min以上。
  };
  flavors?: BattleFlavorSet; // effect.trigger/chanceSuccess/chanceFailure/randomAmount*等の文章。ドロー・手札追加は共通フレーバーを使用。
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

export interface EnemyReactionRule {
  id: string;
  trigger: EnemyReactionTrigger;
  effects?: EffectDefinition[];
  variants?: EnemyReactionVariant[];
  conditions?: ConditionDefinition[];
  priority?: number;
  timing?: EnemyReactionTiming;
  flavors?: BattleFlavorSet;
}

export interface EnemyReactionVariant {
  id: string;
  effects: EffectDefinition[];
  conditions?: ConditionDefinition[];
  flavors?: BattleFlavorSet;
}

export interface EnemyReactionTrigger {
  kind: 'playerSelfEpDamage';
  parts?: EpDamagePart[];
  minBaseAmount?: number;
  cardIds?: string[];
  categories?: CardCategory[];
}

export type EnemyReactionTiming = 'beforePlayerSelfEpDamage' | 'afterPlayerSelfEpDamage';

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
  consumeRule?: StatusConsumeRule; // none=消費なし / one=1消費 / allWhileEnergy=エナジーが残る間、まとめて消費しeffectsを反復。
  stacksPerEnergy?: number; // allWhileEnergy用: 1回に消費するスタック数（1以上の整数、既定1）。端数も消費して1回実行。
  conditions?: ConditionDefinition[]; // 全条件が成立した場合のみ実行（AND）。省略/空配列は無条件。
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
  relatedIntrusionPart?: LocalizedText;
  purgeTargetName?: string;
  purgeStatus?: StatusEffect;
  displayNameRules?: CardDisplayNameRule[];
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
  flavors?: BattleFlavorSet;
}

export interface EnemyDeathNarration {
  cause: EnemyDeathCause;
  text: LocalizedText;
  requiredStatuses?: StatusEffect[];
  intentIds?: string[];
}

export interface EnemySpriteRule {
  sprite: string;
  conditions?: ConditionDefinition[];
  intentIds?: string[];
}

/** Shared sheet/animation settings for enemies, effects and animated UI. */
export interface SpriteDefinition {
  textureKey: string;
  animationKey: string;
  source: string;
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  frameRate: number;
  /** Additional plays; -1 loops forever. Omitted means play once. */
  repeat?: number;
  displayWidth: number;
  displayHeight: number;
}

export interface EnemySpriteDefinition extends SpriteDefinition {
  bodyOffsetY?: number;
  attackAnimationTimeScale?: number;
  opaqueBounds: { left: number; right: number; top: number; bottom: number };
}

/** A finite sprite effect. Movement and fade are relative to its display size. */
export interface SpriteEffectDefinition {
  spriteIds: string[];
  depth: number;
  alpha: number;
  finish: { duration: number; scaleMultiplier: number; alpha: number; ease: string };
  count?: { amountPerSprite: number; max: number };
  scatter?: { x: number; y: number };
  motion?: { distanceRatio: number; verticalRatio: number; duration: number; ease: string };
}

export interface EnemyDefinition {
  id: string;
  name: LocalizedText;
  maxHp: number;
  maxEp: number;
  stages: number[];
  threat: number;
  isGiant?: boolean;
  sprite?: string;
  spriteRules?: EnemySpriteRule[];
  traits?: EnemyTrait[];
  intrusionPart?: LocalizedText;
  statusTriggers?: Partial<Record<StatusEffect, StatusTriggerDefinition[]>>;
  reactionRules?: EnemyReactionRule[];
  intentEConditions: ConditionDefinition[];
  intentBConditions?: ConditionDefinition[];
  intents: EnemyIntent[];
  intents_E: EnemyIntent[];
  intents_B?: EnemyIntent[];
  deathNarrations?: EnemyDeathNarration[];
}

export interface PlayerDefinition {
  initialEpProgress?: Record<EpDamagePart, { epDamage: number; peakCount: number }>;
  id: string;
  name: LocalizedText;
  maxHp: number;
  maxEp: number;
  maxEnergy: number;
  relics: string[];
  startingDeckIds: string[];
}
