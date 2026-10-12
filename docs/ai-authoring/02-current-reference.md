# 現行登録と入力契約

リポジトリを読めないAI向けの自動抽出辞書です。共通設定は `01-authoring-knowledge.md`、フレーバー生成は `04-flavor-guide.md`、会話生成は `05-conversation-guide.md` を先に参照してください。型に存在する項目が、すべての配置先で実行されるとは限りません。コード欄の設定一覧は参照用であり、そのままゲームへ追加するブロックではありません。

ゲームの既存台詞は収録せず、登録ID、名前、判定に必要な設定、入力契約を収録します。状態の表示名は識別用の原文です。数値はこのスナップショット時点の値です。

## 条件と文章の入力型

```ts
export type LocalizedText = string | {
    en: string;
    ja: string;
};
```

```ts
export type BattleLogKind = 'system' | 'status' | 'important' | 'narration' | 'quote';
```

```ts
export type BattleEventSource = 'card' | 'enemyIntent' | 'relic' | 'status' | 'system';
```

```ts
export type ConditionKind = 'status' | 'relic' | 'enemyTrait' | 'enemyHasBindingAction' | 'enemyOrgasmAftershocks' | 'hasEp' | 'enemyHasEIntents' | 'bodyPartStatus' | 'playerState' | 'cardsPlayedThisTurn' | 'intentUsageCount' | 'playerOrgasmsThisBattle' | 'flavorValue' | 'purgeCausedOrgasm' | 'purgeWillCauseOrgasm' | 'isPlayerTurn' | 'hp' | 'hpPercent' | 'ep' | 'epPercent' | 'block' | 'aliveEnemyCount';
```

```ts
export type ConditionOperator = 'eq' | 'notEq' | 'gt' | 'gte' | 'lt' | 'lte' | 'has' | 'notHas';
```

```ts
export type ConditionTarget = 'player' | 'actor' | 'self' | 'selectedEnemy' | 'triggerEnemy' | 'statusOwner';
```

```ts
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
    playerState?: PlayerState;
    relicId?: string;
    relicIds?: string[];
    value?: number | boolean;
    valueKey?: string;
    causeStatus?: StatusEffect;
}
```

```ts
export interface BattleFlavorLine {
    kind: BattleLogKind;
    text: LocalizedText;
}
```

```ts
export interface BattleFlavorVariant {
    conditions?: ConditionDefinition[];
    suppressKinds?: BattleLogKind[];
    lines: BattleFlavorLine[];
}
```

```ts
export type BattleFlavorEntry = BattleFlavorLine | BattleFlavorVariant;
```

```ts
export type BattleFlavorSet = Partial<Record<BattleFlavorEvent, BattleFlavorEntry[]>>;
```

```ts
export type EnemyTrait = 'male' | 'softBody' | 'sexToy';
```

```ts
export type BodyPartStatusKind = 'insert' | 'intruded';
```

```ts
export type StatusEffect = 'SuccubusFluid' | 'Starvation' | 'Hunger' | 'ExtremeFatigue' | 'Charm' | 'Aphrodisiac' | 'TurnedOn' | 'InfestedA_AphrodisiacSlime' | 'InfestedV_AphrodisiacSlime' | 'Aftershocks' | 'Horny' | 'InHeat' | 'Frustrated' | 'DesperateToCum' | 'IntrudedA' | 'IntrudedV' | 'IntrudedM' | 'InsertA' | 'InsertV' | 'InsertM' | 'InfestedA_Slime' | 'InfestedV_Slime' | 'MultipleOrgasms' | 'OrgasmsHell' | 'MultipleOrgasmsTorture' | 'Fainted' | 'Focused' | 'Bound' | 'Escaping' | 'Binding' | 'ASensitivityLv1' | 'ASensitivityLv2' | 'ASensitivityLv3' | 'ASensitivityLv4' | 'ASensitivityLv5' | 'BSensitivityLv1' | 'BSensitivityLv2' | 'BSensitivityLv3' | 'BSensitivityLv4' | 'BSensitivityLv5' | 'CSensitivityLv1' | 'CSensitivityLv2' | 'CSensitivityLv3' | 'CSensitivityLv4' | 'CSensitivityLv5' | 'VSensitivityLv1' | 'VSensitivityLv2' | 'VSensitivityLv3' | 'VSensitivityLv4' | 'VSensitivityLv5' | 'MSensitivityLv1' | 'MSensitivityLv2' | 'MSensitivityLv3' | 'MSensitivityLv4' | 'MSensitivityLv5';
```

```ts
export type EffectTarget = 'player' | 'self' | 'selectedEnemy' | 'triggerEnemy' | 'allEnemies';
```

```ts
export type EffectKind = 'inspectDeck' | 'exhaustHandDraw' | 'removeGeneratedCards' | 'transformGeneratedCards' | 'chooseEffect' | 'clearConnections' | 'hpDamage' | 'epDamage' | 'shareEpDamage' | 'copyEpSensitivity' | 'hpHeal' | 'epHeal' | 'epReserveHeal' | 'block' | 'drawCards' | 'addCardToHand' | 'energyGain' | 'status' | 'removeStatus' | 'discardHand' | 'setEpReserve' | 'setEpReserveRatio' | 'setEp' | 'setEpRatio' | 'retainBlock' | 'hpDrain';
```

```ts
export type EpDamagePartMode = 'static' | 'actorIntruded' | 'lastPlayerEpDamageParts';
```

```ts
export type EffectPercentOf = 'playerMaxHp' | 'playerMaxEp' | 'playerBaseMaxEp' | 'selfCurrentHp' | 'selfMaxEp' | 'targetMaxEp';
```

```ts
export type EpRatioBase = 'playerMaxEp' | 'playerCurrentEp' | 'playerEpReserve';
```

```ts
export type CardAddVariant = 'default' | 'purgeForStatusOwner' | 'pulloutForStatusOwner' | 'wriggleFreeForStatusOwner';
```

```ts
export interface EffectDefinition {
    takeCount?: number;
    choices?: EffectDefinition[];
    growthUses?: number;
    connectionParts?: ('M' | 'V' | 'A')[];
    targetConditions?: ConditionDefinition[];
    sensitivityPart?: EpDamagePart;
    textId?: string;
    kind: EffectKind;
    target: EffectTarget;
    amount: number;
    times: number;
    percentOf?: EffectPercentOf;
    ratioBase?: EpRatioBase;
    status?: StatusEffect;
    statusGroup?: string;
    stacks?: number;
    attackAttribute?: AttackAttribute;
    epDamageParts?: EpDamagePart[];
    epDamagePartRules?: {
        conditions: ConditionDefinition[];
        parts: EpDamagePart[];
    }[];
    epDamagePartMode?: EpDamagePartMode;
    cardId?: string;
    cardAddVariant?: CardAddVariant;
    perStack?: boolean;
    onlyDuringPlayerTurn?: boolean;
    chance?: number;
    chancePerStack?: boolean;
    chanceBonusStatus?: StatusEffect;
    chanceBonusTarget?: ConditionTarget;
    chanceBonusPerStack?: number;
    randomAmount?: {
        min: number;
        max: number;
    };
    flavors?: BattleFlavorSet;
}
```

```ts
export interface RelicTriggerDefinition {
    orgasmInterval?: number;
    orgasmPhase?: 'damage';
    timing: EffectTiming;
    effects: EffectDefinition[];
    conditions?: ConditionDefinition[];
    chance?: number;
    flavors?: BattleFlavorSet;
}
```

```ts
export interface StatusTriggerDefinition {
    timing: EffectTiming;
    effects: EffectDefinition[];
    modifiers?: StatusModifierDefinition[];
    visuals?: StatusVisualKey[];
    portraitEvent?: PortraitEvent;
    consumeRule?: StatusConsumeRule;
    stacksPerEnergy?: number;
    initialFreeStacks?: number;
    initialVisuals?: StatusVisualKey[];
    conditions?: ConditionDefinition[];
    chance?: number;
    order?: number;
    flavors?: BattleFlavorSet;
}
```

```ts
export interface EnemyReactionTrigger {
    kind: 'playerSelfEpDamage';
    parts?: EpDamagePart[];
    minBaseAmount?: number;
    cardIds?: string[];
    categories?: CardCategory[];
}
```

```ts
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
```

```ts
export interface EnemyReactionVariant {
    id: string;
    effects: EffectDefinition[];
    conditions?: ConditionDefinition[];
    flavors?: BattleFlavorSet;
}
```

```ts
export interface EnemyDeathNarration {
    cause: EnemyDeathCause;
    text: LocalizedText;
    requiredStatuses?: StatusEffect[];
    intentIds?: string[];
}
```

```ts
const FLAVOR_EVENTS = {
    Battle: {
        Won: 'battle.won',
        PlayerTurnStart: 'battle.playerTurnStart',
        EnemyTurnStart: 'battle.enemyTurnStart',
        ContinuousOrgasms: 'battle.continuousOrgasms',
        PlayerEpDamageQuote: 'battle.playerEpDamageQuote',
        PlayerEpDamageUnfelt: 'battle.playerEpDamageUnfelt',
        PlayerOrgasmAfterglow: 'battle.playerOrgasmAfterglow',
        PlayerOrgasmFirstQuote: 'battle.playerOrgasmFirstQuote',
        PlayerOrgasmFirst: 'battle.playerOrgasmFirst',
        PlayerOrgasmRepeatQuote: 'battle.playerOrgasmRepeatQuote',
        PlayerOrgasmRepeat: 'battle.playerOrgasmRepeat',
        EnemyOrgasm: 'battle.enemyOrgasm',
        AftershocksAfterConsumption: 'battle.aftershocksAfterConsumption',
        SensitivityLevelUp: 'battle.sensitivityLevelUp',
        PortraitSigilTouch: 'battle.portraitSigilTouch',
        PortraitBodyTouch: 'battle.portraitBodyTouch',
        PortraitHeadTouch: 'battle.portraitHeadTouch',
    },
    Card: {
        Play: 'card.play',
        Resolved: 'card.resolved',
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
        EnergyRecoveryBlocked: 'status.energyRecoveryBlocked',
        EpDamageOverridden: 'status.epDamageOverridden',
    },
    Relic: {
        Trigger: 'relic.trigger',
    },
    Enemy: {
        Intent: 'enemy.intent',
        IntentWarning: 'enemy.intentWarning',
        IntentFallback: 'enemy.intentFallback',
        IntentFailed: 'enemy.intentFailed',
        OrgasmAftershocksOverload: 'enemy.orgasmAftershocksOverload',
        DeathHpDamage: 'enemy.deathHpDamage',
        DeathHpDrain: 'enemy.deathHpDrain',
    },
} as const;
```

```ts
const EP_DAMAGE_PARTS = ['A', 'B', 'C', 'V', 'M'] as const;
```

```ts
const EFFECT_TIMINGS = {
    Passive: 'passive',
    BattleStart: 'battleStart',
    TurnStart: 'turnStart',
    EnemyOrgasm: 'enemyOrgasm',
    PlayerOrgasm: 'playerOrgasm',
    PlayerOrgasmRecovered: 'playerOrgasmRecovered',
    DamageCalculation: 'damageCalculation',
    EnemyDamaged: 'enemyDamaged',
    CardDrawn: 'cardDrawn',
    BlockGained: 'blockGained',
    PurgePlayed: 'purgePlayed',
    StatusApplied: 'statusApplied',
    PlayerActionStart: 'playerActionStart',
} as const;
```

## 会話とイベントの入力型

```ts
export interface ConversationPageCondition {
    minBattleTurn?: number;
    maxBattleTurn?: number;
}
```

```ts
export interface ConversationPage {
    showWhen?: ConversationPageCondition;
    text: LocalizedText;
    speaker: 'quote' | 'narration' | 'user';
    portrait?: string;
    backgroundDim?: number;
    background?: string;
    backgroundTransition?: ConversationBackgroundTransition;
}
```

```ts
export interface ConversationEventMetadata {
    title: LocalizedText;
    category: 'prologue' | 'normal';
    gallery: boolean;
}
```

```ts
export interface ConversationBackgroundTransition {
    type: 'radial' | 'flash' | 'pageTurn' | 'fade' | 'blink';
    duration?: number;
    showText?: boolean;
    originX?: number;
    originY?: number;
    feather?: number;
}
```

```ts
export interface EventBattleDefinition {
    introConversationId?: string;
    battleStartConversationId?: string;
    victoryConversationId?: string;
    defeatConversations?: {
        conditions?: ConditionDefinition[];
        conversationId: string;
    }[];
    excludedRelicIds?: string[];
    initialHp: number;
    initialEp: number;
    deckIds: string[];
    statuses: StatusApplication[];
    enemyIds: string[];
    beforeDrawEvents: {
        turn: number;
        conversationId?: string;
        repeatWhileStatus?: StatusEffect;
        cardIds?: string[];
    }[];
    victory: 'newGame';
}
```

### ビルダーに渡す入力型

実行時に生成される集計値を手入力しないため、ビルダーの入力契約を掲載します。型内の参照先は保存版マニュアルと登録表を併用してください。

```ts
type CardDefinitionInput = {
    name: CardDefinition['name'];
    rarity: CardDefinition['rarity'];
    categories: CardCategories;
    cost: number;
    description?: CardDefinition['description'];
    textOrder?: CardDefinition['textOrder'];
    effects: EffectDefinition[];
    conditions?: ConditionDefinition[];
    playCondition?: CardDefinition['playCondition'];
    vanish?: boolean;
    temporary?: boolean;
    attackAttribute?: AttackAttribute;
    relatedEnemyName?: CardDefinition['relatedEnemyName'];
    relatedIntrusionPart?: CardDefinition['relatedIntrusionPart'];
    purgeTargetName?: string;
    purgeStatus?: StatusEffect;
    displayNameRules?: CardDisplayNameRule[];
    availability?: CardDefinition['availability'];
    flavors?: BattleFlavorSet;
};
```

```ts
type EnemyIntentInput = {
    id?: string;
    label: EnemyIntent['label'];
    effects: EffectDefinition[];
    conditions?: ConditionDefinition[];
    timesLimit?: number;
    enemyStatusLimit?: StatusEffect[];
    enemyStatusLimitN?: StatusEffect[];
    attackAttribute?: AttackAttribute;
    chance?: number;
    chanceBonusStatus?: StatusEffect;
    chanceBonusTarget?: EnemyIntent['chanceBonusTarget'];
    chanceBonusPerStack?: number;
    flavors?: BattleFlavorSet;
};
```

```ts
type RelicDefinitionInput = {
    iconImage?: RelicDefinition['iconImage'];
    iconText?: RelicDefinition['iconText'];
    iconColor?: RelicDefinition['iconColor'];
    name: RelicDefinition['name'];
    rarity: RelicDefinition['rarity'];
    description: RelicDefinition['description'];
    triggers: RelicTriggerDefinition[];
    statusConsumptionBonus?: RelicDefinition['statusConsumptionBonus'];
    epDamageTakenMultiplierPerOrgasm?: RelicDefinition['epDamageTakenMultiplierPerOrgasm'];
    idleOrgasmsRule?: RelicDefinition['idleOrgasmsRule'];
    counter?: number;
    flavors?: BattleFlavorSet;
};
```

```ts
const CONVERSATION_TRANSITIONS = {
    durations: { radial: 1800, flash: 1800, pageTurn: 700, fade: 650, blink: 800 },
    showText: true,
    originX: 0.5,
    originY: 0.5,
    feather: 0.16,
    maskResolution: 512,
    pageFoldWidth: 38,
    pageFoldAlpha: 0.28,
    flashSwitchAt: 0.7,
    flashFrames: [
        { at: 0, alpha: 0 }, { at: 0.04, alpha: 1 }, { at: 0.12, alpha: 0 },
        { at: 0.18, alpha: 1 }, { at: 0.26, alpha: 0 }, { at: 0.44, alpha: 0 },
        { at: 0.66, alpha: 1 }, { at: 0.76, alpha: 1 }, { at: 1, alpha: 0 },
    ],
};
```

## 全状態IDと所有者

| ID | 英語名 | 日本語名 | allowedOwners | 系列と順位 | 表示抑止 |
| --- | --- | --- | --- | --- | --- |
| `SuccubusFluid` | Succubus Fluid | 淫魔の体液 | ['enemy'] | — / — | — |
| `Starvation` | Starvation | 飢餓 | ['player'] | — / — | — |
| `Hunger` | Hunger | 空腹 | ['player'] | — / — | — |
| `ExtremeFatigue` | Extreme Fatigue | 極限疲労 | ['player'] | — / — | — |
| `Charm` | Charm | 誘惑 | ['enemy'] | — / — | — |
| `Aphrodisiac` | Aphrodisiac | 媚薬状態 | ['player', 'enemy'] | — / — | — |
| `TurnedOn` | Turned on | 発情状態 | ['player'] | — / — | — |
| `InfestedA_AphrodisiacSlime` | InfestedA (Aphrodisiac Slime) | 寄生A (媚毒スライム) | ['player'] | — / — | — |
| `InfestedV_AphrodisiacSlime` | InfestedV (Aphrodisiac Slime) | 寄生V (媚毒スライム) | ['player'] | — / — | — |
| `Aftershocks` | Orgasm Aftershocks | 絶頂余韻 | ['player'] | — / — | — |
| `Horny` | Horny | ムラムラ | ['player'] | 'arousal' / 1 | — |
| `InHeat` | In Heat | 火照り | ['player'] | 'arousal' / 2 | — |
| `Frustrated` | Frustrated | 快楽焦燥 | ['player'] | 'arousal' / 3 | — |
| `DesperateToCum` | Desperate to Cum | 快楽渇望 | ['player'] | 'arousal' / 4 | — |
| `IntrudedA` | IntrudedA | 侵入A | ['enemy'] | — / — | — |
| `IntrudedV` | IntrudedV | 侵入V | ['enemy'] | — / — | — |
| `IntrudedM` | IntrudedM | 侵入M | ['enemy'] | — / — | — |
| `InsertA` | InsertA | 挿入A | ['enemy'] | — / — | — |
| `InsertV` | InsertV | 挿入V | ['enemy'] | — / — | — |
| `InsertM` | InsertM | 挿入M | ['enemy'] | — / — | — |
| `InfestedA_Slime` | InfestedA (Slime) | 寄生A (スライム) | ['player'] | — / — | — |
| `InfestedV_Slime` | InfestedV (Slime) | 寄生V (スライム) | ['player'] | — / — | — |
| `MultipleOrgasms` | Multiple orgasms | 連続絶頂 | ['player'] | — / — | — |
| `OrgasmsHell` | Orgasms Hell | イキ地獄 | ['player'] | — / — | — |
| `MultipleOrgasmsTorture` | Multiple orgasms torture | 連続アクメ拷問 | ['player'] | — / — | — |
| `Fainted` | Fainted | 失神 | ['player'] | — / — | ['quote'] |
| `Focused` | Focused | 集中 | ['player'] | — / — | — |
| `Bound` | Bound | 拘束 | ['player'] | — / — | — |
| `Escaping` | Escaping | 脱出中 | ['player'] | — / — | — |
| `Binding` | Binding | 拘束中 | ['enemy'] | — / — | — |
| `ASensitivityLv1` | A Sensitivity Lv.1 | A開発 Lv.1 | player | 部位別レベル | — |
| `ASensitivityLv2` | A Sensitivity Lv.2 | A開発 Lv.2 | player | 部位別レベル | — |
| `ASensitivityLv3` | A Sensitivity Lv.3 | A開発 Lv.3 | player | 部位別レベル | — |
| `ASensitivityLv4` | A Sensitivity Lv.4 | A開発 Lv.4 | player | 部位別レベル | — |
| `ASensitivityLv5` | A Sensitivity Lv.5 | A開発 Lv.5 | player | 部位別レベル | — |
| `BSensitivityLv1` | B Sensitivity Lv.1 | B開発 Lv.1 | player | 部位別レベル | — |
| `BSensitivityLv2` | B Sensitivity Lv.2 | B開発 Lv.2 | player | 部位別レベル | — |
| `BSensitivityLv3` | B Sensitivity Lv.3 | B開発 Lv.3 | player | 部位別レベル | — |
| `BSensitivityLv4` | B Sensitivity Lv.4 | B開発 Lv.4 | player | 部位別レベル | — |
| `BSensitivityLv5` | B Sensitivity Lv.5 | B開発 Lv.5 | player | 部位別レベル | — |
| `CSensitivityLv1` | C Sensitivity Lv.1 | C開発 Lv.1 | player | 部位別レベル | — |
| `CSensitivityLv2` | C Sensitivity Lv.2 | C開発 Lv.2 | player | 部位別レベル | — |
| `CSensitivityLv3` | C Sensitivity Lv.3 | C開発 Lv.3 | player | 部位別レベル | — |
| `CSensitivityLv4` | C Sensitivity Lv.4 | C開発 Lv.4 | player | 部位別レベル | — |
| `CSensitivityLv5` | C Sensitivity Lv.5 | C開発 Lv.5 | player | 部位別レベル | — |
| `VSensitivityLv1` | V Sensitivity Lv.1 | V開発 Lv.1 | player | 部位別レベル | — |
| `VSensitivityLv2` | V Sensitivity Lv.2 | V開発 Lv.2 | player | 部位別レベル | — |
| `VSensitivityLv3` | V Sensitivity Lv.3 | V開発 Lv.3 | player | 部位別レベル | — |
| `VSensitivityLv4` | V Sensitivity Lv.4 | V開発 Lv.4 | player | 部位別レベル | — |
| `VSensitivityLv5` | V Sensitivity Lv.5 | V開発 Lv.5 | player | 部位別レベル | — |
| `MSensitivityLv1` | M Sensitivity Lv.1 | M開発 Lv.1 | player | 部位別レベル | — |
| `MSensitivityLv2` | M Sensitivity Lv.2 | M開発 Lv.2 | player | 部位別レベル | — |
| `MSensitivityLv3` | M Sensitivity Lv.3 | M開発 Lv.3 | player | 部位別レベル | — |
| `MSensitivityLv4` | M Sensitivity Lv.4 | M開発 Lv.4 | player | 部位別レベル | — |
| `MSensitivityLv5` | M Sensitivity Lv.5 | M開発 Lv.5 | player | 部位別レベル | — |

全55状態。うち部位レベル状態は25種類です。Insert・Intruded・Bindingの所有者に注意してください。

## 状態の判定に関わる現行設定

文章・説明・アイコン・描画演出を除いた状態設定です。`defineStatus` は入力をそのまま返します。`epDamageTakenMultiplier(n)` は `{kind: "epDamageTakenMultiplier", amount: n, target: "player"}`、HP倍率・最大EP倍率の同名ヘルパーも同じ構造です。`effect` と `condition` はマニュアルのビルダーです。

```ts
const PART_SENSITIVITY_LEVELS = {
    1: { requiredOrgasmCount: 20, requiredEpDamage: 100, conditionMode: 'or', epDamageMultiplier: 1.2 },
    2: { requiredOrgasmCount: 90, requiredEpDamage: 450, conditionMode: 'or', epDamageMultiplier: 1.5 },
    3: { requiredOrgasmCount: 320, requiredEpDamage: 1600, conditionMode: 'or', epDamageMultiplier: 2 },
    4: { requiredOrgasmCount: 600, requiredEpDamage: 3000, conditionMode: 'or', epDamageMultiplier: 3 },
    5: { requiredOrgasmCount: 1000, requiredEpDamage: 5000, conditionMode: 'or', epDamageMultiplier: 5 },
};
```

```ts
function defineSensitivityStatuses(): Record<SensitivityStatusEffect, StatusDefinition> {
    return EP_DAMAGE_PARTS.reduce((definitions, part) => {
        for (let level = 1; level <= 5; level += 1) {
            const sensitivityLevel = level as SensitivityLevel;
            definitions[sensitivityStatusId(part, sensitivityLevel)] = defineStatus({
                name: l(`${part} Sensitivity Lv.${sensitivityLevel}`, `${part}開発 Lv.${sensitivityLevel}`),
                remain: 1,
                consumeEachTurn: 0,
                allowedOwners: ['player'],
                noticeLevel: 'important',
                triggers: []
            });
        }
        return definitions;
    }, {} as Record<SensitivityStatusEffect, StatusDefinition>);
}
```

```ts
const STATUS_DESCRIPTIONS = {
    Starvation: defineStatus({
        name: l('Starvation', '飢餓'),
        remain: 0,
        consumeEachTurn: 0,
        allowedOwners: ['player'],
        noticeLevel: 'important',
        singleStack: true,
        receivedEpDamage: 1,
        preventEnergyRecovery: true,
        hpDrainProgress: { count: 2, nextStatus: 'Hunger' },
        triggers: [
            { timing: EFFECT_TIMINGS.PlayerOrgasm,
                effects: [effect('hpDamage', 'player', 1, { attackAttribute: 'love' })]
            }
        ]
    }),
    Hunger: defineStatus({
        name: l('Hunger', '空腹'),
        remain: 0,
        consumeEachTurn: 0,
        allowedOwners: ['player'],
        noticeLevel: 'important',
        singleStack: true,
        turnStartEnergy: 1,
        hpDrainProgress: { count: 2 },
        triggers: []
    }),
    ExtremeFatigue: defineStatus({
        name: l('Extreme Fatigue', '極限疲労'),
        remain: 0,
        consumeEachTurn: 0,
        allowedOwners: ['player'],
        noticeLevel: 'important',
        singleStack: true,
        preventTurnStartDraw: true,
        receivedEpDamage: 1,
        removeAboveHpRatio: 0.25,
        triggers: []
    }),
    ...defineSensitivityStatuses(),
    Charm: defineStatus({
        name: l('Charm', '誘惑'),
        remain: 0,
        consumeEachTurn: 1,
        allowedOwners: ['enemy'],
        triggers: [
            {
                timing: EFFECT_TIMINGS.TurnStart,
                effects: []
            },
        ]
    }),
    Aftershocks: defineStatus({
        name: l('Orgasm Aftershocks', '絶頂余韻'),
        remain: 0,
        consumeEachTurn: 1,
        allowedOwners: ['player'],
        triggers: [
            {
                timing: EFFECT_TIMINGS.TurnStart,
                consumeRule: 'allWhileEnergy',
                initialFreeStacks: 1,
                stacksPerEnergy: 2,
                order: 10,
                effects: [
                    effect('energyGain', 'player', -1),
                ],
                portraitEvent: 'AftershockBreath'
            },
        ]
    }),
    TurnedOn: defineStatus({
        name: l('Turned on', '発情状態'),
        remain: 1,
        consumeEachTurn: 0,
        allowedOwners: ['player'],
        singleStack: true,
        triggers: [
            { timing: EFFECT_TIMINGS.TurnStart, effects: [effect('status', 'player', 1, { status: 'Horny' })] },
            { timing: EFFECT_TIMINGS.PlayerOrgasm, effects: [effect('removeStatus', 'player', 0, { status: 'TurnedOn' })] },
        ]
    }),
    Aphrodisiac: defineStatus({
        name: l('Aphrodisiac', '媚薬状態'),
        remain: 1,
        consumeEachTurn: 0,
        allowedOwners: ['player', 'enemy'],
        durationTurns: 3,
        requiresEp: true,
        blockedEnemyTraits: ['sexToy', 'softBody'],
        preventTurnStartEpRecovery: true,
        trackActiveTurns: true,
        idleOrgasmsRule: { turns: 2, status: 'Horny', stacks: 1 },
        spreadRule: {
            appliedStatuses: ['InsertA', 'InsertV', 'InsertM', 'IntrudedA', 'IntrudedV', 'IntrudedM'],
            cardSelfEpDamageParts: ['M', 'V', 'A'],
            cardTarget: 'cardDamagedEnemies'
        },
        triggers: [{
                timing: EFFECT_TIMINGS.DamageCalculation,
                effects: [],
                modifiers: [
                    { kind: 'epDamageTakenMultiplier', target: 'statusOwner', amount: 1.5 },
                ]
            }]
    }),
    Horny: defineStatus({
        name: l('Horny', 'ムラムラ'),
        remain: 1,
        consumeEachTurn: 0,
        allowedOwners: ['player'],
        applyConditions: [condition('status', 'notHas', { target: 'player', status: 'Fainted' })],
        exclusiveGroup: 'arousal',
        groupRank: 1,
        triggers: [
            {
                timing: EFFECT_TIMINGS.TurnStart,
                order: 30,
                effects: [
                    effect('addCardToHand', 'player', 1, { cardId: 'rubOne' }),
                ]
            },
            {
                timing: EFFECT_TIMINGS.DamageCalculation,
                effects: [],
                modifiers: [epDamageTakenMultiplier(1.5)]
            },
            {
                timing: EFFECT_TIMINGS.PlayerOrgasm,
                effects: [
                    effect('energyGain', 'player', 1, { onlyDuringPlayerTurn: true }),
                    effect('removeStatus', 'player', 1, { status: 'Horny' }),
                ]
            },
        ]
    }),
    InHeat: defineStatus({
        name: l('In Heat', '火照り'),
        remain: 1,
        consumeEachTurn: 0,
        allowedOwners: ['player'],
        exclusiveGroup: 'arousal',
        groupRank: 2,
        triggers: [
            {
                timing: EFFECT_TIMINGS.TurnStart,
                order: 30,
                effects: [
                    effect('addCardToHand', 'player', 2, { cardId: 'rubOne' }),
                ]
            },
            {
                timing: EFFECT_TIMINGS.DamageCalculation,
                effects: [],
                modifiers: [epDamageTakenMultiplier(2)]
            },
            {
                timing: EFFECT_TIMINGS.PlayerOrgasm,
                effects: [
                    effect('energyGain', 'player', 1, { onlyDuringPlayerTurn: true }),
                    effect('removeStatus', 'player', 1, { status: 'InHeat' }),
                ]
            },
        ]
    }),
    Frustrated: defineStatus({
        name: l('Frustrated', '快楽焦燥'),
        remain: 1,
        consumeEachTurn: 0,
        allowedOwners: ['player'],
        exclusiveGroup: 'arousal',
        groupRank: 3,
        triggers: [
            {
                timing: EFFECT_TIMINGS.TurnStart,
                order: 30,
                effects: [
                    effect('addCardToHand', 'player', 3, { cardId: 'rubOne' }),
                ]
            },
            {
                timing: EFFECT_TIMINGS.DamageCalculation,
                effects: [],
                modifiers: [epDamageTakenMultiplier(3)]
            },
            {
                timing: EFFECT_TIMINGS.PlayerOrgasm,
                effects: [
                    effect('energyGain', 'player', 1, { onlyDuringPlayerTurn: true }),
                    effect('removeStatus', 'player', 1, { status: 'Frustrated' }),
                ]
            },
        ]
    }),
    DesperateToCum: defineStatus({
        name: l('Desperate to Cum', '快楽渇望'),
        remain: 1,
        consumeEachTurn: 0,
        allowedOwners: ['player'],
        noticeLevel: 'important',
        exclusiveGroup: 'arousal',
        groupRank: 4,
        triggers: [
            {
                timing: EFFECT_TIMINGS.StatusApplied,
                conditions: [condition('status', 'has', { target: 'player', statuses: ['MultipleOrgasms', 'OrgasmsHell', 'MultipleOrgasmsTorture'] })],
                effects: [
                    effect('removeStatus', 'player', 0, { status: 'DesperateToCum' }),
                ]
            },
            {
                timing: EFFECT_TIMINGS.TurnStart,
                order: 30,
                effects: [
                    effect('addCardToHand', 'player', 4, { cardId: 'rubOne' }),
                ]
            },
            {
                timing: EFFECT_TIMINGS.DamageCalculation,
                effects: [],
                modifiers: [epDamageTakenMultiplier(3)]
            },
            {
                timing: EFFECT_TIMINGS.PlayerOrgasm,
                effects: [
                    effect('energyGain', 'player', 1, { onlyDuringPlayerTurn: true }),
                    effect('removeStatus', 'player', 1, {
                        status: 'DesperateToCum',
                        chance: 0.1
                    }),
                ]
            },
        ]
    }),
    IntrudedA: defineStatus({
        name: l('IntrudedA', '侵入A'),
        remain: 0,
        consumeEachTurn: 0,
        allowedOwners: ['enemy'],
        epDamageParts: ['A'],
        triggers: [
            {
                timing: EFFECT_TIMINGS.TurnStart,
                order: 40,
                effects: [
                    effect('addCardToHand', 'player', 1, { cardId: 'purge', cardAddVariant: 'purgeForStatusOwner' }),
                ]
            },
            {
                timing: EFFECT_TIMINGS.PurgePlayed,
                conditions: [condition('purgeCausedOrgasm', 'eq', { value: false })],
                effects: [
                    effect('removeStatus', 'triggerEnemy', 1, { status: 'IntrudedA' }),
                    effect('epDamage', 'player', 10, { attackAttribute: 'love', epDamageParts: ['A'] }),
                ]
            },
            {
                timing: EFFECT_TIMINGS.PurgePlayed,
                conditions: [condition('purgeCausedOrgasm', 'eq', { value: true })],
                effects: []
            },
        ]
    }),
    IntrudedV: defineStatus({
        name: l('IntrudedV', '侵入V'),
        remain: 0,
        consumeEachTurn: 0,
        allowedOwners: ['enemy'],
        epDamageParts: ['V'],
        triggers: [
            {
                timing: EFFECT_TIMINGS.TurnStart,
                order: 40,
                effects: [
                    effect('addCardToHand', 'player', 1, { cardId: 'purge', cardAddVariant: 'purgeForStatusOwner' }),
                ]
            },
            {
                timing: EFFECT_TIMINGS.PurgePlayed,
                conditions: [condition('purgeCausedOrgasm', 'eq', { value: false })],
                effects: [
                    effect('removeStatus', 'triggerEnemy', 1, { status: 'IntrudedV' }),
                    effect('epDamage', 'player', 10, { attackAttribute: 'love', epDamageParts: ['V'] }),
                ]
            },
            {
                timing: EFFECT_TIMINGS.PurgePlayed,
                conditions: [condition('purgeCausedOrgasm', 'eq', { value: true })],
                effects: []
            },
        ]
    }),
    IntrudedM: defineStatus({
        name: l('IntrudedM', '侵入M'),
        remain: 0,
        consumeEachTurn: 0,
        allowedOwners: ['enemy'],
        epDamageParts: ['M'],
        triggers: [
            {
                timing: EFFECT_TIMINGS.TurnStart,
                order: 40,
                effects: [
                    effect('addCardToHand', 'player', 1, { cardId: 'purge', cardAddVariant: 'purgeForStatusOwner' }),
                    effect('hpDamage', 'player', 2, { attackAttribute: 'mucus' }),
                ]
            },
            {
                timing: EFFECT_TIMINGS.PurgePlayed,
                conditions: [condition('purgeCausedOrgasm', 'eq', { value: false })],
                effects: [
                    effect('removeStatus', 'triggerEnemy', 1, { status: 'IntrudedM' }),
                    effect('epDamage', 'player', 10, { attackAttribute: 'love', epDamageParts: ['M'] }),
                ]
            },
            {
                timing: EFFECT_TIMINGS.PurgePlayed,
                conditions: [condition('purgeCausedOrgasm', 'eq', { value: true })],
                effects: []
            },
        ]
    }),
    InsertA: defineStatus({
        name: l('InsertA', '挿入A'),
        remain: 0,
        consumeEachTurn: 0,
        allowedOwners: ['enemy'],
        epDamageParts: ['A'],
        triggers: [
            {
                timing: EFFECT_TIMINGS.TurnStart,
                order: 40,
                effects: [
                    effect('addCardToHand', 'player', 1, { cardId: 'pullout', cardAddVariant: 'pulloutForStatusOwner' }),
                ]
            },
            {
                timing: EFFECT_TIMINGS.PurgePlayed,
                conditions: [condition('purgeCausedOrgasm', 'eq', { value: false })],
                effects: [
                    effect('removeStatus', 'triggerEnemy', 1, { status: 'InsertA' }),
                    effect('epDamage', 'player', 5, { attackAttribute: 'love', epDamageParts: ['A'] }),
                ]
            },
            {
                timing: EFFECT_TIMINGS.PurgePlayed,
                conditions: [condition('purgeCausedOrgasm', 'eq', { value: true })],
                effects: []
            },
        ]
    }),
    InsertV: defineStatus({
        name: l('InsertV', '挿入V'),
        remain: 0,
        consumeEachTurn: 0,
        allowedOwners: ['enemy'],
        epDamageParts: ['V'],
        triggers: [
            {
                timing: EFFECT_TIMINGS.TurnStart,
                order: 40,
                effects: [
                    effect('addCardToHand', 'player', 1, { cardId: 'pullout', cardAddVariant: 'pulloutForStatusOwner' }),
                ]
            },
            {
                timing: EFFECT_TIMINGS.PurgePlayed,
                conditions: [condition('purgeCausedOrgasm', 'eq', { value: false })],
                effects: [
                    effect('removeStatus', 'triggerEnemy', 1, { status: 'InsertV' }),
                    effect('epDamage', 'player', 5, { attackAttribute: 'love', epDamageParts: ['V'] }),
                ]
            },
            {
                timing: EFFECT_TIMINGS.PurgePlayed,
                conditions: [condition('purgeCausedOrgasm', 'eq', { value: true })],
                effects: []
            },
        ]
    }),
    InsertM: defineStatus({
        name: l('InsertM', '挿入M'),
        remain: 0,
        consumeEachTurn: 0,
        allowedOwners: ['enemy'],
        epDamageParts: ['M'],
        triggers: [
            {
                timing: EFFECT_TIMINGS.TurnStart,
                order: 40,
                effects: [
                    effect('addCardToHand', 'player', 1, { cardId: 'pullout', cardAddVariant: 'pulloutForStatusOwner' }),
                ]
            },
            {
                timing: EFFECT_TIMINGS.PurgePlayed,
                conditions: [condition('purgeCausedOrgasm', 'eq', { value: false })],
                effects: [
                    effect('removeStatus', 'triggerEnemy', 1, { status: 'InsertM' }),
                    effect('epDamage', 'player', 5, { attackAttribute: 'love', epDamageParts: ['M'] }),
                ]
            },
            {
                timing: EFFECT_TIMINGS.PurgePlayed,
                conditions: [condition('purgeCausedOrgasm', 'eq', { value: true })],
                effects: []
            },
        ]
    }),
    InfestedA_Slime: defineStatus({
        name: l('InfestedA (Slime)', '寄生A (スライム)'),
        remain: 1,
        consumeEachTurn: 0,
        allowedOwners: ['player'],
        noticeLevel: 'important',
        epDamageParts: ['A'],
        triggers: [
            {
                timing: EFFECT_TIMINGS.PlayerActionStart,
                order: 20,
                effects: [
                    effect('epDamage', 'player', 1, { attackAttribute: 'love', perStack: true, epDamageParts: ['A'] }),
                ]
            },
        ]
    }),
    InfestedV_Slime: defineStatus({
        name: l('InfestedV (Slime)', '寄生V (スライム)'),
        remain: 1,
        consumeEachTurn: 0,
        allowedOwners: ['player'],
        noticeLevel: 'important',
        epDamageParts: ['V'],
        triggers: [
            {
                timing: EFFECT_TIMINGS.PlayerActionStart,
                order: 20,
                effects: [
                    effect('epDamage', 'player', 1, { attackAttribute: 'love', perStack: true, epDamageParts: ['V'] }),
                ]
            },
        ]
    }),
    InfestedA_AphrodisiacSlime: defineStatus({
        name: l('InfestedA (Aphrodisiac Slime)', '寄生A (媚毒スライム)'),
        remain: 1,
        consumeEachTurn: 0,
        allowedOwners: ['player'],
        epDamageParts: ['A'],
        noticeLevel: 'important',
        triggers: [
            {
                timing: EFFECT_TIMINGS.PlayerActionStart,
                order: 20,
                effects: [
                    effect('epDamage', 'player', 1, { attackAttribute: 'aphrodisiacMucus', perStack: true, epDamageParts: ['A'] }),
                    effect('status', 'player', 1, {
                        status: 'Aphrodisiac',
                        chance: 0.15,
                        chancePerStack: true
                    }),
                ]
            },
        ]
    }),
    InfestedV_AphrodisiacSlime: defineStatus({
        name: l('InfestedV (Aphrodisiac Slime)', '寄生V (媚毒スライム)'),
        remain: 1,
        consumeEachTurn: 0,
        allowedOwners: ['player'],
        epDamageParts: ['V'],
        noticeLevel: 'important',
        triggers: [
            {
                timing: EFFECT_TIMINGS.PlayerActionStart,
                order: 20,
                effects: [
                    effect('epDamage', 'player', 1, { attackAttribute: 'aphrodisiacMucus', perStack: true, epDamageParts: ['V'] }),
                    effect('status', 'player', 1, {
                        status: 'Aphrodisiac',
                        chance: 0.15,
                        chancePerStack: true
                    }),
                ]
            },
        ]
    }),
    MultipleOrgasms: defineStatus({
        name: l('Multiple orgasms', '連続絶頂'),
        remain: 0,
        consumeEachTurn: 1,
        allowedOwners: ['player'],
        singleStack: true,
        triggers: [
            {
                timing: EFFECT_TIMINGS.StatusApplied,
                effects: [
                    effect('removeStatus', 'player', 0, { status: 'DesperateToCum' }),
                ]
            },
            {
                timing: EFFECT_TIMINGS.TurnStart,
                order: 25,
                consumeRule: 'one',
                effects: [
                    effect('addCardToHand', 'player', 1, { cardId: 'faint' }),
                ]
            },
            {
                timing: EFFECT_TIMINGS.PlayerOrgasm,
                effects: [
                    effect('hpDamage', 'player', 1, { attackAttribute: 'blackLove' }),
                    effect('epReserveHeal', 'player', 1),
                ]
            },
        ]
    }),
    OrgasmsHell: defineStatus({
        name: l('Orgasms Hell', 'イキ地獄'),
        remain: 0,
        consumeEachTurn: 1,
        allowedOwners: ['player'],
        noticeLevel: 'important',
        singleStack: true,
        triggers: [
            {
                timing: EFFECT_TIMINGS.StatusApplied,
                effects: [
                    effect('removeStatus', 'player', 0, { status: 'MultipleOrgasms' }),
                    effect('removeStatus', 'player', 0, { status: 'DesperateToCum' }),
                ]
            },
            {
                timing: EFFECT_TIMINGS.TurnStart,
                order: 25,
                consumeRule: 'one',
                effects: [
                    effect('addCardToHand', 'player', 1, { cardId: 'faint' }),
                ]
            },
            {
                timing: EFFECT_TIMINGS.PlayerOrgasm,
                effects: [
                    effect('hpDamage', 'player', 2, { attackAttribute: 'blackLove' }),
                    effect('epReserveHeal', 'player', 1),
                ]
            },
        ]
    }),
    MultipleOrgasmsTorture: defineStatus({
        name: l('Multiple orgasms torture', '連続アクメ拷問'),
        remain: 0,
        consumeEachTurn: 1,
        allowedOwners: ['player'],
        noticeLevel: 'important',
        singleStack: true,
        triggers: [
            {
                timing: EFFECT_TIMINGS.StatusApplied,
                effects: [
                    effect('removeStatus', 'player', 0, { status: 'OrgasmsHell' }),
                    effect('removeStatus', 'player', 0, { status: 'MultipleOrgasms' }),
                    effect('removeStatus', 'player', 0, { status: 'DesperateToCum' }),
                ]
            },
            {
                timing: EFFECT_TIMINGS.TurnStart,
                order: 25,
                consumeRule: 'one',
                effects: [
                    effect('addCardToHand', 'player', 1, { cardId: 'faint' }),
                ]
            },
            {
                timing: EFFECT_TIMINGS.PlayerOrgasm,
                effects: [
                    effect('hpDamage', 'player', 2, { attackAttribute: 'blackLove' }),
                    effect('epReserveHeal', 'player', 2),
                ]
            },
        ]
    }),
    Bound: defineStatus({
        name: l('Bound', '拘束'),
        remain: 0,
        consumeEachTurn: 0,
        allowedOwners: ['player'],
        triggers: []
    }),
    Escaping: defineStatus({
        name: l('Escaping', '脱出中'),
        remain: 0,
        consumeEachTurn: 0,
        allowedOwners: ['player'],
        triggers: [
            {
                timing: EFFECT_TIMINGS.TurnStart,
                order: 4,
                conditions: [condition('status', 'notHas', { target: 'player', statuses: ['Frustrated', 'DesperateToCum'] })],
                effects: [
                    effect('removeStatus', 'player', 0, { status: 'Bound' }),
                    effect('removeStatus', 'triggerEnemy', 0, { status: 'Binding' }),
                    effect('removeStatus', 'player', 0, { status: 'Escaping' }),
                ]
            },
            {
                timing: EFFECT_TIMINGS.TurnStart,
                order: 4,
                conditions: [condition('status', 'has', { target: 'player', statuses: ['Frustrated', 'DesperateToCum'] })],
                effects: []
            },
            {
                timing: EFFECT_TIMINGS.PlayerOrgasm,
                effects: [
                    effect('removeStatus', 'player', 1, {
                        status: 'Escaping',
                        chance: 0.5
                    }),
                ]
            },
        ]
    }),
    Binding: defineStatus({
        name: l('Binding', '拘束中'),
        remain: 0,
        consumeEachTurn: 0,
        allowedOwners: ['enemy'],
        triggers: [
            {
                timing: EFFECT_TIMINGS.TurnStart,
                order: 40,
                effects: [
                    effect('addCardToHand', 'player', 1, { cardId: 'wriggleFree', cardAddVariant: 'wriggleFreeForStatusOwner' }),
                ]
            },
        ]
    }),
    SuccubusFluid: defineStatus({
        name: l('Succubus Fluid', '淫魔の体液'),
        remain: 0,
        consumeEachTurn: 0,
        allowedOwners: ['enemy'],
        requiresEp: true,
        epGrowthPerTurn: 1.1,
        triggers: []
    }),
    Fainted: defineStatus({
        name: l('Fainted', '失神'),
        remain: 0,
        consumeEachTurn: 1,
        allowedOwners: ['player'],
        noticeLevel: 'important',
        blockedFlavorKinds: ['quote'],
        triggers: [
            {
                timing: EFFECT_TIMINGS.StatusApplied,
                effects: [
                    effect('discardHand', 'player', 1),
                ]
            },
            {
                timing: EFFECT_TIMINGS.TurnStart,
                order: 5,
                consumeRule: 'one',
                effects: []
            },
            {
                timing: EFFECT_TIMINGS.PlayerActionStart,
                effects: [
                    effect('discardHand', 'player', 1),
                ]
            },
            {
                timing: EFFECT_TIMINGS.Passive,
                effects: [],
                modifiers: [hpDamageTakenMultiplier(1.5)]
            },
        ]
    }),
    Focused: defineStatus({
        name: l('Focused', '集中'),
        remain: 0,
        consumeEachTurn: 0,
        allowedOwners: ['player'],
        singleStack: true,
        triggers: [
            {
                timing: EFFECT_TIMINGS.Passive,
                effects: [],
                modifiers: [epMaxMultiplier(2)]
            },
            {
                timing: EFFECT_TIMINGS.DamageCalculation,
                effects: [],
                modifiers: [epDamageTakenMultiplier(0.5)]
            },
            {
                timing: EFFECT_TIMINGS.PlayerOrgasmRecovered,
                chance: 0.5,
                effects: [
                    effect('removeStatus', 'player', 1, { status: 'Focused' }),
                    effect('epDamage', 'player', 1, { percentOf: 'playerBaseMaxEp', attackAttribute: 'love', epDamagePartMode: 'lastPlayerEpDamageParts' }),
                ]
            },
        ]
    })
};
```

## 複合状態の完全な定義

```ts
const PLAYER_STATE_CONDITIONS = {
    Breathless: {
        name: l('Breathless', '息も絶え絶え'),
        anyOf: [
            [{ kind: 'status', operator: 'has', target: 'player', statuses: ['MultipleOrgasms', 'OrgasmsHell', 'MultipleOrgasmsTorture'] }],
            [{ kind: 'status', operator: 'gte', target: 'player', status: 'Aftershocks', value: 10 }],
        ],
    } as PlayerStateDefinition,
    Aroused: {
        name: l('Aroused', '興奮状態'),
        anyOf: [
            [{ kind: 'epPercent', operator: 'gte', target: 'player', value: 75 }],
            [{ kind: 'status', operator: 'has', target: 'player', statuses: ['Horny', 'InHeat', 'Frustrated', 'DesperateToCum'] }],
            [
                { kind: 'status', operator: 'gte', target: 'player', status: 'Aftershocks', value: 1 },
                { kind: 'status', operator: 'lte', target: 'player', status: 'Aftershocks', value: 9 },
            ],
        ],
    } as PlayerStateDefinition,
    Gagged: {
        name: l('Gagged', '口がふさがれている'),
        anyOf: [
            [{ kind: 'bodyPartStatus', operator: 'has', parts: ['M'], bodyPartStatusKinds: ['insert'] }],
            [{ kind: 'bodyPartStatus', operator: 'has', parts: ['M'], bodyPartStatusKinds: ['intruded'] }],
        ],
    } as PlayerStateDefinition,
};
```

## 部位トークンと固定名

大文字小文字を区別します。別名は条件の parts に使わず、文章置換に使います。動的名の段階や接頭辞の意味はナレッジ本文を参照してください。

```ts
const BODY_PART_ALIASES = ['AI', 'VI', 'N', 'b', 'MI', 'U'] as const;
```

```ts
const BODY_PART_STAT_PART = {
    A: 'A',
    B: 'B',
    C: 'C',
    V: 'V',
    M: 'M',
    AI: 'A',
    VI: 'V',
    N: 'B',
    b: 'C',
    MI: 'M',
    U: 'V',
};
```

```ts
const BODY_PART_DEFAULT_NAMES = [
    { part: 'A', name: l('anal', 'アナル') },
    { part: 'B', name: l('breasts', '胸') },
    { part: 'C', name: l('clit', 'クリトリス') },
    { part: 'V', name: l('pussy', 'まんこ') },
    { part: 'M', name: l('mouth', '口') },
    { part: 'AI', name: l('ass', '直腸') },
    { part: 'VI', name: l('pussy', '膣内') },
    { part: 'N', name: l('nipples', '乳首') },
    { part: 'b', name: l('tits', 'おっぱい') },
    { part: 'MI', name: l('throat', '喉奥') },
    { part: 'U', name: l('womb', '子宮') },
];
```

## 登録済みカードとレリック

### CARD_DEFINITIONS

| ID | 日英名 |
| --- | --- |
| `strike` | l('Strike', 'ストライク') |
| `crescentSlash` | l('Crescent Slash', '三日月斬り') |
| `defend` | l('Defense Magic', '防御魔法') |
| `seduction` | l('Seduction', '誘惑') |
| `handjob` | l('Handjob', '手コキ') |
| `blowjob` | l('Blowjob', 'フェラチオ') |
| `Titjob` | l('Titjob', 'パイズリ') |
| `cowgirlRiding` | l('Cowgirl riding', '騎乗位') |
| `preparation` | l('Preparation', '準備') |
| `rubOneOut` | l('RubOneOut', '自慰') |
| `rubOne` | l('RubOneOut', '自慰') |
| `meditation` | l('Meditation', '瞑想') |
| `purge` | l('Purge', '排出') |
| `pullout` | l('Pullout', '引き抜く') |
| `wriggleFree` | l('Wriggle Free', '拘束抵抗') |
| `faint` | l('Faint', '失神') |
| `sharedSensation` | l('Shared Sensation', '感覚共有') |
| `sensitivityTransfer` | l('Sensitivity Transfer', '感度転写') |
| `shrewd` | l('Shrewd', 'したたか') |
| `tidyUp` | l('Tidy Up', '整理整頓') |
| `dozeOff` | l('Doze Off', '寝落ち') |
| `thrash` | l('Thrash', '暴れる') |
| `bite` | l('Bite', '噛みつく') |
| `succubusFluid` | l('Succubus Fluid', '淫魔の体液') |
| `adapt` | l('Adapt', '臨機応変') |
| `throwCards` | l('Throw', '投げつける') |
| `projectileX` | l('Projectile X', '飛翔体X') |

### RELIC_DEFINITIONS

| ID | 日英名 |
| --- | --- |
| `succubusBlood` | l('Succubus\'s Blood', 'サキュバスの血') |
| `contractSigil` | l('Contract Sigil', '契約の淫紋') |
| `neverSkipPussyDay` | l('Never Skip Pussy Day', '膣圧トレをさぼるな') |
| `extremeYoga` | l('Extreme Yoga', 'エクストリームヨガ') |
| `marathonRunner` | l('Marathon Runner', 'マラソンランナー') |
| `lilimBlood` | l('Lilim\'s Blood', 'リリムの血') |
| `manualOfBrothel` | l('Manual of the Brothel', '娼館の手引き') |
| `pheromones` | l('Pheromones', 'フェロモン') |
| `alluringBody` | l('Alluring Body', '蠱惑の肉体') |
| `livingClothes` | l('Living Clothes', '触手服') |

## 登録済み敵と行動の配置先

共有定義を展開した実行時添字です。元ソースが共有定義やfilterで構成されている場合、配列全体の差し替えはせず、行動ID・labelを目印に編集箇所を指定してください。

### ForcedOrgasmMachine

- name: l('ForcedOrgasm Machine', '鬼イかせマシン')
- traits: ['sexToy', 'male']
- maxEp: 0
- intentEConditions: []
- intentBConditions: —

| intents の実行時添字 | id | label |
| --- | --- | --- |
| 0 | — | l('idling', 'アイドリング') |
| 1 | — | l('forced Orgasm', '強制アクメピストン') |

| intents_E の実行時添字 | id | label |
| --- | --- | --- |

### grunt

- name: l('Grunt', '下級兵')
- traits: ['male']
- maxEp: 12
- intentEConditions: charmIntentConditions
- intentBConditions: —

| intents の実行時添字 | id | label |
| --- | --- | --- |
| 0 | — | l('slice', '斬撃') |
| 1 | — | l('strike', '打撃') |
| 2 | 'inOut' | l('Slamming Hips', '連続ピストン') |

| intents_E の実行時添字 | id | label |
| --- | --- | --- |
| 0 | — | l('Fuck', '挿入') |
| 1 | — | l('Fuck', '挿入') |
| 2 | — | l('Lustful Thrust', '欲情高速ピストン') |
| 3 | 'fingering' | l('Fingering', '手マン') |

### prologueGrunt

- name: l('On duty Grunt', '当直の下級兵')
- traits: ['male']
- maxEp: 12
- intentEConditions: charmIntentConditions
- intentBConditions: —

| intents の実行時添字 | id | label |
| --- | --- | --- |
| 0 | 'fingering' | l('Fingering', '手マン') |
| 1 | 'inOut' | l('Slamming Hips', '連続ピストン') |

| intents_E の実行時添字 | id | label |
| --- | --- | --- |
| 0 | — | l('Fuck', '挿入') |
| 1 | — | l('Fuck', '挿入') |
| 2 | — | l('Lustful Thrust', '欲情高速ピストン') |

### slime

- name: l('Slime', 'スライム')
- traits: ['softBody']
- maxEp: 0
- intentEConditions: charmIntentConditions
- intentBConditions: —

| intents の実行時添字 | id | label |
| --- | --- | --- |
| 0 | — | l('Ramming', '飛びつき') |
| 1 | — | l('mucus', '粘液') |
| 2 | — | l('Cling', 'まとわりつき') |
| 3 | — | l('Jiggle', '蠢き') |
| 4 | — | l('AcidOoz', '酸性粘液') |
| 5 | 'parasiteV' | l('parasiteV', '寄生V') |
| 6 | 'parasiteA' | l('parasiteA', '寄生A') |

| intents_E の実行時添字 | id | label |
| --- | --- | --- |
| 0 | — | l('IntrudedV', '侵入V') |
| 1 | — | l('IntrudedA', '侵入A') |
| 2 | — | l('Jiggle', '蠢き') |
| 3 | — | l('AcidOoz', '酸性粘液') |
| 4 | 'parasiteV' | l('parasiteV', '寄生V') |
| 5 | 'parasiteA' | l('parasiteA', '寄生A') |

### aphrodisiacSlime

- name: l('Aphrodisiac Slime', '媚毒スライム')
- traits: ['softBody']
- maxEp: 0
- intentEConditions: charmIntentConditions
- intentBConditions: —

| intents の実行時添字 | id | label |
| --- | --- | --- |
| 0 | — | l('Ramming', '飛びつき') |
| 1 | — | l('mucus', '粘液') |
| 2 | — | l('Cling', 'まとわりつき') |
| 3 | — | l('Jiggle', '蠢き') |
| 4 | — | l('AphrodisiacOoz', '媚毒粘液') |
| 5 | 'parasiteV' | l('parasiteV', '寄生V') |
| 6 | 'parasiteA' | l('parasiteA', '寄生A') |

| intents_E の実行時添字 | id | label |
| --- | --- | --- |
| 0 | — | l('IntrudedV', '侵入V') |
| 1 | — | l('IntrudedA', '侵入A') |
| 2 | — | l('Jiggle', '蠢き') |
| 3 | — | l('AphrodisiacOoz', '媚毒粘液') |
| 4 | 'parasiteV' | l('parasiteV', '寄生V') |
| 5 | 'parasiteA' | l('parasiteA', '寄生A') |

### slimeColony

- name: l('Slime Colony', 'スライム群生体')
- traits: ['softBody']
- maxEp: 0
- intentEConditions: charmIntentConditions
- intentBConditions: bindingIntentConditions

| intents の実行時添字 | id | label |
| --- | --- | --- |
| 0 | 'cover' | l('Cover', '覆いかぶさる') |
| 1 | — | l('mucus', '粘液') |
| 2 | 'doubleParasite' | l('Double parasite', '両穴寄生') |
| 3 | 'parasiteV' | l('parasiteV', '寄生V') |
| 4 | 'parasiteA' | l('parasiteA', '寄生A') |

| intents_E の実行時添字 | id | label |
| --- | --- | --- |
| 0 | 'cover' | l('Cover', '覆いかぶさる') |
| 1 | — | l('IntrudedV', '侵入V') |
| 2 | — | l('IntrudedA', '侵入A') |
| 3 | 'doubleParasite' | l('Double parasite', '両穴寄生') |
| 4 | 'parasiteV' | l('parasiteV', '寄生V') |
| 5 | 'parasiteA' | l('parasiteA', '寄生A') |

| intents_B の実行時添字 | id | label |
| --- | --- | --- |
| 0 | — | l('IntrudedM', '侵入M') |
| 1 | — | l('Double intrusion', '両穴侵入') |
| 2 | 'doubleParasite' | l('Double parasite', '両穴寄生') |
| 3 | 'parasiteV' | l('parasiteV', '寄生V') |
| 4 | 'parasiteA' | l('parasiteA', '寄生A') |
| 5 | — | l('Sea of acidic mucus', '酸性粘液の海') |

### 敵の条件で使うローカル定数と部位判定ヘルパー

```ts
const intruded = ['IntrudedA', 'IntrudedV', 'IntrudedM'];
```

```ts
const inserted = ['InsertA', 'InsertV', 'InsertM'];
```

```ts
const charmIntentConditions = [
    condition('status', 'has', { target: 'self', status: 'Charm', causeStatus: 'Charm' }),
    condition('status', 'has', { target: 'player', status: 'Fainted', causeStatus: 'Fainted' }),
    condition('status', 'has', { target: 'player', status: 'Bound', causeStatus: 'Bound' }),
];
```

```ts
const notIntruded = [condition('status', 'notHas', { target: 'self', statuses: intruded })];
```

```ts
const hasIntruded = [condition('status', 'has', { target: 'self', statuses: intruded })];
```

```ts
const hasIntrudedA = [condition('status', 'has', { target: 'self', status: 'IntrudedA' })];
```

```ts
const hasIntrudedV = [condition('status', 'has', { target: 'self', status: 'IntrudedV' })];
```

```ts
const notIntrudedM = [condition('status', 'notHas', { target: 'self', status: 'IntrudedM' })];
```

```ts
const notInserted = [condition('status', 'notHas', { target: 'self', statuses: inserted })];
```

```ts
const hasInserted = [condition('status', 'has', { target: 'self', statuses: inserted })];
```

```ts
const hasInsertedA = [condition('status', 'has', { target: 'self', status: 'InsertA' })];
```

```ts
const hasInsertedV = [condition('status', 'has', { target: 'self', status: 'InsertV' })];
```

```ts
const hasBothIntruded = [...hasIntrudedA, ...hasIntrudedV];
```

```ts
const hasOnlyIntrudedA = [...hasIntrudedA, condition('status', 'notHas', { target: 'self', status: 'IntrudedV' })];
```

```ts
const hasOnlyIntrudedV = [...hasIntrudedV, condition('status', 'notHas', { target: 'self', status: 'IntrudedA' })];
```

```ts
const bindingIntentConditions = [condition('status', 'has', { target: 'self', status: 'Binding', causeStatus: 'Binding' })];
```

```ts
const playerNotBound = [condition('status', 'notHas', { target: 'player', status: 'Bound' })];
```

```ts
const noInsertAt = (part: Extract<EpDamagePart, 'A' | 'V' | 'M'>) => [
    condition('bodyPartStatus', 'notHas', { parts: [part], bodyPartStatusKinds: ['insert'] }),
];
```

```ts
const noInsertOrIntrusionAt = (part: Extract<EpDamagePart, 'A' | 'V' | 'M'>) => [
    condition('bodyPartStatus', 'notHas', { parts: [part], bodyPartStatusKinds: ['insert', 'intruded'] }),
];
```

```ts
const hasInsertOrIntrusionAt = (part: Extract<EpDamagePart, 'A' | 'V' | 'M'>) => [
    condition('bodyPartStatus', 'has', { parts: [part], bodyPartStatusKinds: ['insert', 'intruded'] }),
];
```

## 会話IDと現在の接続

会話本文の生成例はナレッジ本文にあります。以下は既存本文の転載ではなく、参照先の識別情報です。

- `prologueBeforeBattle`: 14 ページ
- `prologueTurn1`: 2 ページ
- `prologueTurn3`: 10 ページ
- `prologueAfterBattle`: 23 ページ
- `prologueDefeat1`: 8 ページ
- `prologueDefeat2`: 12 ページ
- `defeatDefault`: 10 ページ

```ts
const CONVERSATION_EVENTS = {
    prologueBeforeBattle: { title: l('A Captive Succubus', '囚われのサキュバス'), category: 'prologue', gallery: true },
    prologueAfterBattle: { title: l('The Lewd God\'s Contract', '淫神との契約'), category: 'prologue', gallery: true },
    prologueDefeat1: { title: l('Bad End: Starved Away', 'BAD END：飢えたままで……'), category: 'prologue', gallery: true },
    prologueDefeat2: { title: l('Bad End: Strength Exhausted', 'BAD END：快感には勝てなかったよ……'), category: 'prologue', gallery: true },
    defeatDefault: { title: l('Defeat', '敗北'), category: 'normal', gallery: true },
};
```

```ts
const DEFEAT_CONVERSATIONS = { default: 'defeatDefault' };
```

```ts
const EVENT_BATTLES = {
    prologue: {
        introConversationId: 'prologueBeforeBattle',
        battleStartConversationId: 'prologueTurn1',
        victoryConversationId: 'prologueAfterBattle',
        defeatConversations: [
            { conditions: [condition('status', 'has', { target: 'player', status: 'Starvation' })], conversationId: 'prologueDefeat1' },
            { conversationId: 'prologueDefeat2' },
        ],
        excludedRelicIds: ['contractSigil'],
        initialHp: 2,
        initialEp: 2,
        deckIds: ['strike', 'handjob', 'cowgirlRiding', 'rubOneOut'],
        statuses: [{ effect: 'Starvation', stacks: 1 }, { effect: 'ExtremeFatigue', stacks: 1 }],
        enemyIds: ['prologueGrunt', 'prologueGrunt', 'prologueGrunt'],
        beforeDrawEvents: [
            { turn: 3, conversationId: 'prologueTurn3', cardIds: ['seduction'] },
            { turn: 4, repeatWhileStatus: 'ExtremeFatigue', cardIds: ['seduction'] },
        ],
        victory: 'newGame',
    },
};
```

## フレーバー呼出し配置の監査表

各イベントがどの定義から呼ばれるかを示します。表のローカル変数名はそのまま差し込みキーとして使えません。条件用値の保証範囲はナレッジ本文のイベント表が基準です。`event` などの変数経由は呼出し元の制限に従います。

| メソッド | 参照元 | イベント | ソース位置 |
| --- | --- | --- | --- |
| startInitialTurn | GLOBAL_FLAVORS | FLAVOR_EVENTS.Battle.PlayerTurnStart | BattleScene.ts:760 |
| showEnergyRecoveryBlocked | STATUS_DESCRIPTIONS[status].flavors | FLAVOR_EVENTS.Status.EnergyRecoveryBlocked | BattleScene.ts:783 |
| touchPortraitSigil | GLOBAL_FLAVORS | FLAVOR_EVENTS.Battle.PortraitSigilTouch | BattleScene.ts:975 |
| touchPortraitBody | GLOBAL_FLAVORS | FLAVOR_EVENTS.Battle.PortraitBodyTouch | BattleScene.ts:999 |
| touchPortraitHead | GLOBAL_FLAVORS | FLAVOR_EVENTS.Battle.PortraitHeadTouch | BattleScene.ts:1009 |
| addStatusRemovalFlavorEvent | GLOBAL_FLAVORS | statusNoticeKind(removedStatus, transitionTarget) === 'important'           ? FLAVOR_EVENTS.Status.ChangeImportant           : FLAVOR_EVENTS.Status.Change | BattleScene.ts:1778 |
| addStatusRemovalFlavorEvent | GLOBAL_FLAVORS | FLAVOR_EVENTS.Status.Remove | BattleScene.ts:1803 |
| prepareRelicTrigger | entry.trigger.flavors | chancePassed ? FLAVOR_EVENTS.Effect.ChanceSuccess : FLAVOR_EVENTS.Effect.ChanceFailure | BattleScene.ts:1906 |
| applyRelicTriggerEffects | entry.relic.flavors | FLAVOR_EVENTS.Relic.Trigger | BattleScene.ts:1936 |
| applyRelicTriggerEffects | entry.trigger.flavors | FLAVOR_EVENTS.Relic.Trigger | BattleScene.ts:1937 |
| executeEffect | GLOBAL_FLAVORS | FLAVOR_EVENTS.Effect.AddCardToHand | BattleScene.ts:1994 |
| executeEffect | GLOBAL_FLAVORS | FLAVOR_EVENTS.Effect.DrawCards | BattleScene.ts:2007 |
| executeEffect | effect.flavors | chancePassed ? FLAVOR_EVENTS.Effect.ChanceSuccess : FLAVOR_EVENTS.Effect.ChanceFailure | BattleScene.ts:2037 |
| executeEffect | effect.flavors | FLAVOR_EVENTS.Effect.Trigger | BattleScene.ts:2043 |
| executeEffect | GLOBAL_FLAVORS | FLAVOR_EVENTS.Effect.DiscardHand | BattleScene.ts:2096 |
| executeEffect | GLOBAL_FLAVORS | effect.kind === 'setEpReserveRatio' ? FLAVOR_EVENTS.Effect.SetEpReserveRatio : FLAVOR_EVENTS.Effect.SetEpReserve | BattleScene.ts:2105 |
| executeEffect | GLOBAL_FLAVORS | effect.kind === 'setEpRatio' ? FLAVOR_EVENTS.Effect.SetEpRatio : FLAVOR_EVENTS.Effect.SetEp | BattleScene.ts:2114 |
| executeEffect | GLOBAL_FLAVORS | FLAVOR_EVENTS.Effect.RetainBlock | BattleScene.ts:2122 |
| executeEffect | GLOBAL_FLAVORS | FLAVOR_EVENTS.Effect.EpReserveHeal | BattleScene.ts:2128 |
| executeCardTactic | GLOBAL_FLAVORS | FLAVOR_EVENTS.Effect.DrawCards | BattleScene.ts:2219 |
| applyEffectEnergyGain | GLOBAL_FLAVORS | FLAVOR_EVENTS.Effect.EnergyChange | BattleScene.ts:2471 |
| addStatusApplicationFlavorEvent | GLOBAL_FLAVORS | statusNoticeKind(applied.upgradeFrom, applied.upgradeTo) === 'important'           ? FLAVOR_EVENTS.Status.ChangeImportant           : FLAVOR_EVENTS.Status.Change | BattleScene.ts:2508 |
| addStatusApplicationFlavorEvent | GLOBAL_FLAVORS | FLAVOR_EVENTS.Status.ApplyMiss | BattleScene.ts:2531 |
| addStatusApplicationFlavorEvent | GLOBAL_FLAVORS | FLAVOR_EVENTS.Status.Infest | BattleScene.ts:2547 |
| addStatusApplicationFlavorEvent | GLOBAL_FLAVORS | this.statusApplicationLogKind(displayStatus) === 'important'         ? FLAVOR_EVENTS.Status.ApplyImportant         : FLAVOR_EVENTS.Status.Apply | BattleScene.ts:2557 |
| applyEffectHpHeal | GLOBAL_FLAVORS | FLAVOR_EVENTS.Effect.HpHeal | BattleScene.ts:2614 |
| applyEffectEpHeal | GLOBAL_FLAVORS | FLAVOR_EVENTS.Effect.EpHeal | BattleScene.ts:2631 |
| applyEffectEpHeal | GLOBAL_FLAVORS | FLAVOR_EVENTS.Effect.EpHeal | BattleScene.ts:2648 |
| applyEffectBlock | GLOBAL_FLAVORS | FLAVOR_EVENTS.Effect.BlockGain | BattleScene.ts:2671 |
| addHpDamageBattleLog | GLOBAL_FLAVORS | FLAVOR_EVENTS.Effect.HpDamage | BattleScene.ts:2745 |
| applyEffectEpDamage | STATUS_DESCRIPTIONS[override.cause].flavors | FLAVOR_EVENTS.Status.EpDamageOverridden | BattleScene.ts:2814 |
| applyEffectEpDamage | GLOBAL_FLAVORS | FLAVOR_EVENTS.Battle.PlayerEpDamageUnfelt | BattleScene.ts:2818 |
| runEnemyReactionsForPlayerSelfEpDamage | rule.flavors | FLAVOR_EVENTS.Enemy.Intent | BattleScene.ts:2990 |
| runEnemyReactionsForPlayerSelfEpDamage | variant?.flavors | FLAVOR_EVENTS.Enemy.Intent | BattleScene.ts:2991 |
| addEpDamageBattleLog | GLOBAL_FLAVORS | FLAVOR_EVENTS.Effect.EpDamage | BattleScene.ts:3038 |
| addPlayerEpDamageQuote | GLOBAL_FLAVORS | FLAVOR_EVENTS.Battle.PlayerEpDamageQuote | BattleScene.ts:3047 |
| addHpDrainFlavorEvent | GLOBAL_FLAVORS | FLAVOR_EVENTS.Effect.HpDrain | BattleScene.ts:3124 |
| executeStatusTriggerEffects | entry.definition.flavors | FLAVOR_EVENTS.Status.Trigger | BattleScene.ts:3232 |
| executeStatusTriggerEffects | entry.trigger.flavors | FLAVOR_EVENTS.Status.Trigger | BattleScene.ts:3233 |
| executeStatusTriggerEffects | entry.trigger.flavors | chancePassed ? FLAVOR_EVENTS.Effect.ChanceSuccess : FLAVOR_EVENTS.Effect.ChanceFailure | BattleScene.ts:3252 |
| executeStatusTriggerEffects | entry.definition.flavors | FLAVOR_EVENTS.Status.Trigger | BattleScene.ts:3262 |
| executeStatusTriggerEffects | entry.trigger.flavors | FLAVOR_EVENTS.Status.Trigger | BattleScene.ts:3263 |
| executeStatusTriggerEffects | entry.definition.flavors | FLAVOR_EVENTS.Status.Remove | BattleScene.ts:3282 |
| executeStatusTriggerEffects | entry.trigger.flavors | FLAVOR_EVENTS.Status.Remove | BattleScene.ts:3283 |
| addAftershocksAfterConsumptionFlavor | GLOBAL_FLAVORS | FLAVOR_EVENTS.Battle.AftershocksAfterConsumption | BattleScene.ts:3306 |
| rejectCardPlay | GLOBAL_FLAVORS | event | BattleScene.ts:4820 |
| applyCardEffect | definition.flavors | FLAVOR_EVENTS.Card.Play | BattleScene.ts:4995 |
| applyCardEffect | definition.flavors | FLAVOR_EVENTS.Card.Resolved | BattleScene.ts:5009 |
| applyPurgeEffect | GLOBAL_FLAVORS | FLAVOR_EVENTS.Card.PurgeFailed | BattleScene.ts:5187 |
| addEnemyOrgasmLog | GLOBAL_FLAVORS | FLAVOR_EVENTS.Battle.EnemyOrgasm | BattleScene.ts:5230 |
| addEnemyOrgasmLog | context.card.flavors | FLAVOR_EVENTS.Battle.EnemyOrgasm | BattleScene.ts:5238 |
| resolveMaleEnemyOrgasmAftershocks | ENEMY_ORGASM_AFTERSHOCKS_INTENT.flavors | FLAVOR_EVENTS.Enemy.OrgasmAftershocksOverload | BattleScene.ts:5267 |
| applyPlayerEpDamage | GLOBAL_FLAVORS | FLAVOR_EVENTS.Battle.ContinuousOrgasms | BattleScene.ts:5496 |
| applyPlayerEpDamage | GLOBAL_FLAVORS | FLAVOR_EVENTS.Battle.PlayerOrgasmRepeatQuote | BattleScene.ts:5503 |
| addPlayerOrgasmLog | GLOBAL_FLAVORS | FLAVOR_EVENTS.Battle.PlayerOrgasmAfterglow | BattleScene.ts:5605 |
| addPlayerOrgasmLog | GLOBAL_FLAVORS | FLAVOR_EVENTS.Battle.PlayerOrgasmFirstQuote | BattleScene.ts:5610 |
| addPlayerOrgasmLog | GLOBAL_FLAVORS | FLAVOR_EVENTS.Battle.PlayerOrgasmFirst | BattleScene.ts:5611 |
| addPlayerOrgasmLog | GLOBAL_FLAVORS | FLAVOR_EVENTS.Battle.PlayerOrgasmRepeat | BattleScene.ts:5621 |
| addPlayerOrgasmRepeatQuote | GLOBAL_FLAVORS | FLAVOR_EVENTS.Battle.PlayerOrgasmRepeatQuote | BattleScene.ts:5625 |
| syncPlayerSensitivityStatuses | GLOBAL_FLAVORS | FLAVOR_EVENTS.Battle.SensitivityLevelUp | BattleScene.ts:5747 |
| applyStatusToCombatantWithTriggers | STATUS_DESCRIPTIONS[appliedStatus]?.flavors | FLAVOR_EVENTS.Status.Apply | BattleScene.ts:6083 |
| endTurn | GLOBAL_FLAVORS | FLAVOR_EVENTS.Battle.EnemyTurnStart | BattleScene.ts:6338 |
| enemyAction | intent.flavors | FLAVOR_EVENTS.Enemy.Intent | BattleScene.ts:6377 |
| enemyAction | GLOBAL_FLAVORS | FLAVOR_EVENTS.Enemy.IntentFallback | BattleScene.ts:6379 |
| enemyAction | intent.flavors | intentChancePassed ? FLAVOR_EVENTS.Effect.ChanceSuccess : FLAVOR_EVENTS.Effect.ChanceFailure | BattleScene.ts:6388 |
| enemyAction | GLOBAL_FLAVORS | FLAVOR_EVENTS.Enemy.IntentFailed | BattleScene.ts:6393 |
| startNextTurn | GLOBAL_FLAVORS | FLAVOR_EVENTS.Battle.PlayerTurnStart | BattleScene.ts:6444 |
| addBindingIntentWarnings | intent.flavors | FLAVOR_EVENTS.Enemy.IntentWarning | BattleScene.ts:7167 |
| addBindingIntentWarnings | GLOBAL_FLAVORS | FLAVOR_EVENTS.Enemy.IntentWarning | BattleScene.ts:7169 |
| defeatEnemy | GLOBAL_FLAVORS | FLAVOR_EVENTS.Battle.Won | BattleScene.ts:7702 |
| addEnemyDeathNarration | GLOBAL_FLAVORS | causeContext.cause === 'hpDrain'         ? FLAVOR_EVENTS.Enemy.DeathHpDrain         : FLAVOR_EVENTS.Enemy.DeathHpDamage | BattleScene.ts:7763 |
| addRandomAmountFlavors | effect.flavors | FLAVOR_EVENTS.Effect.RandomAmountMin | BattleScene.ts:8311 |
| addRandomAmountFlavors | effect.flavors | FLAVOR_EVENTS.Effect.RandomAmountMax | BattleScene.ts:8316 |
| addRandomAmountFlavors | effect.flavors | FLAVOR_EVENTS.Effect.RandomAmountOther | BattleScene.ts:8320 |

## 参照元と更新

ソース指紋: `ba6ae0a3d21ee6e50f81ca8054c3ec57851dba24db774b1880fc9b31cb2dad6f`。改行コードをLFへ正規化して計算しています。

再生成: `node tools/docs/generate-authoring-reference.mjs`。鮮度確認: `node tools/docs/generate-authoring-reference.mjs --check`。再生成だけでは手書きのナレッジ本文の意味は更新されません。イベント追加・実行器変更時は本文も照合してください。

| 参照元 | SHA256 |
| --- | --- |
| docs/manual/assets.md | ee0b32aa04cd90bfeb3ac52c43030c039c3641b30a4a372434223af333c209e0 |
| docs/manual/cards.md | c731d9c45b10cb0742af6c18572161c34f6329749852e6bc2b9ff70e7382a3fc |
| docs/manual/combatants.md | e0e3466bac60de88bf08a39c9533df89e293e3dbd59ea31d84e16400d60259d9 |
| docs/manual/editor.md | 37993333d953c0262cba2364df70a2bbdb5cf372710412c1056c31369323a324 |
| docs/manual/effects.md | 4d981257312abaffb15b8b195a5a7e8469449c85e47deba3da5ba4cb5b9daaf0 |
| docs/manual/events.md | 91da23330d5221afc95886b3308bc0af6581c868a31095f6dccb4ba15c56d179 |
| docs/manual/presentation.md | 608092bd79e3861b83e8bfb6c2a63928bcf373e13c9003ce5aba8f4a52ada7a7 |
| src/data/bodyParts.ts | a2eb00cebeaf02e4b70b44a1e466eccc71ac471c0c1e4154494ee01ad0c4f914 |
| src/data/cards.ts | 36c57192db30a9dd230738436b55b1e7a0aa37b712d8690115390abe814675a9 |
| src/data/conversationTransitions.ts | c0f1f8390288de642c0fd2663c91c5d5bfcc47a9893129a6006fe672f3f88493 |
| src/data/conversations.ts | 551e4d97dc78f74336bd645652315be5673dabba35412ad2b9f27a1f8fc587bc |
| src/data/effectBuilders.ts | 2f294be35c924a14c2645b42fa67252108e9288be04c1bda4451a8375ca45b96 |
| src/data/enemies.ts | e1988b16e5651639dcad28cfb7fe644918444d03d7da791b51b6bc7570f2fdea |
| src/data/eventBattles.ts | a6aed7d9e2570e64698c9e43f0dee5f45643844ad975298c33713e71041f1343 |
| src/data/flavorCatalog.ts | 55fbe95144dde241fce54c0e45844c4835639f010e5411cb40143b548c65e368 |
| src/data/playerStates.ts | 911b73b55647e8c6c198033b40208ab4e7257848fe40410e5b0e588603dc5864 |
| src/data/portraitTouch.ts | 7cfb354296094b1c758dc7bae226d9b3c1028538a31a606c6d2f041a4043984b |
| src/data/relics.ts | 202e320d505239155f13344f0e940af54377c44eb5266db8522dd2243348f23a |
| src/data/statuses.ts | a624b001e6a33836663b6b476f03091ad81998e416037437fee9526d7aaee8ab |
| src/models/conditions.ts | 95ca297ed36f46b373896ac48eb0e0f8266bab6d4a953e59ea4a7540ab654d3d |
| src/models/conversationPages.ts | e986ff33548e3a38915b5029b6d6166be95ae25b7491b8905c43b28ad1ff2f8b |
| src/models/gameText.ts | cf60ea7ffb23b7dea6447cf6fdf8d3f4443876ec0da11d3ab424b1686e6b151b |
| src/models/localization.ts | 9bfdc12b1130c2758529ef9fc23822174aab892a8f9f78d28eb9031df00ce083 |
| src/models/saveCompatibility.ts | 67b1ebcae85c6ad5bde8ec5a38b998e29ae083badec6e2361e4c8c0cb9177991 |
| src/models/statusChanges.ts | acdf1e9d3de2506cf3c198482bb14cf5029381490f342e248c3a38655ec3e483 |
| src/models/statusRestrictions.ts | 4c1427ac6769e01c77cced8144987637490cfd0ef80749aef10b6b2fe2928ef5 |
| src/models/statusRuntime.ts | 992374f5765cbbab43bdf468e3fb422012d36cbb1a135ec7bf73551376702dbe |
| src/models/types.ts | 6dd095bab3a543ba1ac939e02eb973ead707174bce0405c4c3ce5ab7aa2ac02b |
| src/scenes/BattleScene.ts | 76c7b1effb6d6b1ddc170bc4a0f3fb88c7dd04cf88f7cc412d8eb105431a2b5b |
| src/scenes/DefeatEventScene.ts | 494391c02bc53a2f89a8f6c7381aad976be793ad5cb89cc48bec120d9a92be0b |
| src/ui/battleLogStyle.ts | ff5526c7c6a9d7b3a712f394076fd35949b1ffd68782d8df12f269177756d88c |
| src/ui/conversation.ts | 7f5aa3ca457c5d81732830eb8ba1d6b174b52c1ecc37489d6a168084b55e138b |
