# 設定定数リファレンス

[マニュアル目次](README.md) / [入力型](reference-types.md)

src/dataの公開設定を列挙します。登録データの本文・現在値は掲載せず、キーと値の契約を記載します。値を変更するときはリンク先のソースを編集してください。必須は設定オブジェクト自体に対する型の要求です。

## types.ts

[src/models/types.ts](../../src/models/types.ts) ／ [意味・単位・手順](effects.md)

### EP_DAMAGE_PARTS

識別子の契約（現在のバランス設定ではありません）:

~~~ts
['A', 'B', 'C', 'V', 'M'] as const
~~~

### FLAVOR_EVENTS

識別子の契約（現在のバランス設定ではありません）:

~~~ts
{
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
  },
  Card: {
    Play: 'card.play',
    Resolved: 'card.resolved', // カード本体・派生効果・絶頂・除去処理の完了後。flavorValueのplayerCummed / enemyCummedは今回の実績（真偽値）。
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
} as const
~~~

### EFFECT_TIMINGS

識別子の契約（現在のバランス設定ではありません）:

~~~ts
{
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
} as const
~~~

## battlePresentation.ts

[src/data/battlePresentation.ts](../../src/data/battlePresentation.ts) ／ [意味・単位・手順](presentation.md)

### BATTLE_BACKGROUNDS

| 設定パス | 必須／任意 | 型 | 注記 |
| --- | --- | --- | --- |
| <code>fallback</code> | 必須 | <code>string</code> | image/background内のファイル名。未設定のステージで使用。 |
| <code>stages</code> | 必須 | <code>Record&lt;number, string&gt;</code> | ステージ番号 → 背景ファイル名。 |
| <code>events</code> | 必須 | <code>Record&lt;string, string&gt;</code> | イベント戦闘ID → 背景ファイル名。ステージ設定より優先。 |

### BATTLE_ENTRANCE

| 設定パス | 必須／任意 | 型 | 注記 |
| --- | --- | --- | --- |
| <code>playerDuration</code> | 必須 | <code>number</code> | 横方向に1回転しながらフェードインする時間ms。0で即時。 |
| <code>enemyDuration</code> | 必須 | <code>number</code> | 敵1体を下から描画する時間ms。0で即時。 |
| <code>nextEnemyProgress</code> | 必須 | <code>number</code> | 前の敵がこの割合まで現れたら次を開始。0〜1。 |
| <code>enemyOrder</code> | 必須 | <code>Record&lt;number, number[]&gt;</code> | 敵数 → 左から数えた0始まりの登場順。未設定は左から順。 |

## blockPresentation.ts

[src/data/blockPresentation.ts](../../src/data/blockPresentation.ts) ／ [意味・単位・手順](presentation.md)

### BLOCK_PRESENTATION

| 設定パス | 必須／任意 | 型 | 注記 |
| --- | --- | --- | --- |
| <code>gainDuration</code> | 必須 | <code>number</code> | 付与時の金属化と2回の反射の合計。 |
| <code>guardDuration</code> | 必須 | <code>number</code> | 完全防御時の1回の反射。 |
| <code>guardShieldDuration</code> | 必須 | <code>number</code> | 完全防御時の盾・衝撃リング・火花が消えるまでの時間。 |
| <code>breakLeadDuration</code> | 必須 | <code>number</code> | 盾に亀裂が入ってからHPダメージ演出へ移るまで。 |
| <code>fragmentDuration</code> | 必須 | <code>number</code> | 破片が散って消える時間。ダメージ演出と並行。 |
| <code>gainSilver</code> | 必須 | <code>number</code> | 元画像を銀色に寄せる強さ（0～1）。 |
| <code>guardSilver</code> | 必須 | <code>number</code> |  |
| <code>reflectionStrength</code> | 必須 | <code>number</code> | 反射光の強さ（0～1）。 |
| <code>reflectionWidth</code> | 必須 | <code>number</code> | 表示範囲に対する反射帯の幅。 |
| <code>reflectionSlant</code> | 必須 | <code>number</code> | 反射帯の傾き。 |
| <code>shieldSize</code> | 必須 | <code>number</code> | 盾の半幅px。立ち絵の配置・大きさに依存しない。 |
| <code>shieldFill</code> | 必須 | <code>number</code> |  |
| <code>shieldEdge</code> | 必須 | <code>number</code> |  |
| <code>highlight</code> | 必須 | <code>number</code> |  |
| <code>shieldFillAlpha</code> | 必須 | <code>number</code> |  |
| <code>edgeWidth</code> | 必須 | <code>number</code> |  |
| <code>riseCount</code> | 必須 | <code>number</code> | 付与時の細い上昇光の本数。 |
| <code>riseDistance</code> | 必須 | <code>number</code> |  |
| <code>depth</code> | 必須 | <code>number</code> |  |

## bodyParts.ts

[src/data/bodyParts.ts](../../src/data/bodyParts.ts) ／ [意味・単位・手順](effects.md)

### BODY_PART_ALIASES

型: <code>readonly ["AI", "VI", "N", "b", "MI", "U"]</code>

### BODY_PART_TOKENS

型: <code>readonly ["A", "B", "C", "V", "M", "AI", "VI", "N", "b", "MI", "U"]</code>

### BODY_PART_STAT_PART

構造: <code>Record&lt;BodyPartToken, EpDamagePart&gt;</code>

値の詳細: [BodyPartToken](reference-types.md#bodyparttoken) / [EpDamagePart](reference-types.md#epdamagepart)

### BODY_PART_NAMES

構造: <code>BodyPartNameConfig[]</code>

値の詳細: [BodyPartNameConfig](reference-types.md#bodypartnameconfig)

### BODY_PART_DEFAULT_NAMES

構造: <code>BodyPartDefaultNameConfig[]</code>

値の詳細: [BodyPartDefaultNameConfig](reference-types.md#bodypartdefaultnameconfig)

## cardAppearance.ts

[src/data/cardAppearance.ts](../../src/data/cardAppearance.ts) ／ [意味・単位・手順](assets.md)

### CARD_ARTWORK_VARIANTS

| 設定パス | 必須／任意 | 型 | 注記 |
| --- | --- | --- | --- |

### CARD_ARTWORK

| 設定パス | 必須／任意 | 型 | 注記 |
| --- | --- | --- | --- |

### CARD_FRAME

| 設定パス | 必須／任意 | 型 | 注記 |
| --- | --- | --- | --- |
| <code>cornerRadius</code> | 必須 | <code>number</code> |  |
| <code>rimWidth</code> | 必須 | <code>number</code> |  |
| <code>decorationWidth</code> | 必須 | <code>number</code> |  |
| <code>background</code> | 必須 | <code>number</code> |  |
| <code>imageEdgeFade</code> | 必須 | <code>number</code> |  |
| <code>textureResolution</code> | 必須 | <code>number</code> | 枠・画像用の内部描画倍率。正の整数。文字の解像度設定とは独立。 |

### CARD_RARITY_FINISH

| 設定パス | 必須／任意 | 型 | 注記 |
| --- | --- | --- | --- |
| <code>starter</code> | 必須 | <code>CardRarityFinish</code> |  |
| <code>common</code> | 必須 | <code>CardRarityFinish</code> |  |
| <code>uncommon</code> | 必須 | <code>CardRarityFinish</code> |  |
| <code>rare</code> | 必須 | <code>CardRarityFinish</code> |  |
| <code>event</code> | 必須 | <code>CardRarityFinish</code> |  |

## cardCategories.ts

[src/data/cardCategories.ts](../../src/data/cardCategories.ts) ／ [意味・単位・手順](cards.md)

### CARD_CATEGORY_COLORS

構造: <code>Record&lt;ColoredCardCategory, number&gt;</code>

値の詳細: [ColoredCardCategory](reference-types.md#coloredcardcategory)

## cardText.ts

[src/data/cardText.ts](../../src/data/cardText.ts) ／ [意味・単位・手順](cards.md)

### CARD_SYSTEM_TERMS

| 設定パス | 必須／任意 | 型 | 注記 |
| --- | --- | --- | --- |
| <code>block</code> | 必須 | <code>{ name: LocalizedText; description: LocalizedText; }</code> |  |
| <code>block.name</code> | 親を設定時必須 | <code>LocalizedText</code> |  |
| <code>block.description</code> | 親を設定時必須 | <code>LocalizedText</code> |  |
| <code>noMotion</code> | 必須 | <code>{ name: LocalizedText; description: LocalizedText; }</code> |  |
| <code>noMotion.name</code> | 親を設定時必須 | <code>LocalizedText</code> |  |
| <code>noMotion.description</code> | 親を設定時必須 | <code>LocalizedText</code> |  |
| <code>temporary</code> | 必須 | <code>{ name: LocalizedText; description: LocalizedText; }</code> |  |
| <code>temporary.name</code> | 親を設定時必須 | <code>LocalizedText</code> |  |
| <code>temporary.description</code> | 親を設定時必須 | <code>LocalizedText</code> |  |
| <code>vanish</code> | 必須 | <code>{ name: LocalizedText; description: LocalizedText; }</code> |  |
| <code>vanish.name</code> | 親を設定時必須 | <code>LocalizedText</code> |  |
| <code>vanish.description</code> | 親を設定時必須 | <code>LocalizedText</code> |  |

### CARD_SYSTEM_TERM_COLOR

型: <code>string</code>

### CARD_BLOCK_CARRY_DESCRIPTION

型: <code>LocalizedText</code>

### CARD_TEXT_TARGETS

構造: <code>Record&lt;EffectTarget, LocalizedText&gt;</code>

値の詳細: [EffectTarget](reference-types.md#effecttarget) / [LocalizedText](reference-types.md#localizedtext)

### CARD_VALUE_BASES

構造: <code>Record&lt;EffectPercentOf &#124; EpRatioBase, LocalizedText&gt;</code>

値の詳細: [EffectPercentOf](reference-types.md#effectpercentof) / [EpRatioBase](reference-types.md#epratiobase) / [LocalizedText](reference-types.md#localizedtext)

### CARD_EFFECT_TEXT

構造: <code>Record&lt;EffectKind, LocalizedText&gt;</code>

値の詳細: [EffectKind](reference-types.md#effectkind) / [LocalizedText](reference-types.md#localizedtext)

### CARD_TEXT_PHRASES

| 設定パス | 必須／任意 | 型 | 注記 |
| --- | --- | --- | --- |
| <code>eachTarget</code> | 必須 | <code>LocalizedText</code> |  |
| <code>repeat</code> | 必須 | <code>LocalizedText</code> |  |
| <code>fractionalSelfEpDamage</code> | 必須 | <code>LocalizedText</code> |  |
| <code>keywordSeparator</code> | 必須 | <code>LocalizedText</code> |  |
| <code>random</code> | 必須 | <code>LocalizedText</code> |  |
| <code>percent</code> | 必須 | <code>LocalizedText</code> |  |
| <code>chance</code> | 必須 | <code>LocalizedText</code> |  |
| <code>turnOnly</code> | 必須 | <code>LocalizedText</code> |  |
| <code>probability</code> | 必須 | <code>LocalizedText</code> |  |
| <code>repetitions</code> | 必須 | <code>LocalizedText</code> |  |
| <code>supplement</code> | 必須 | <code>LocalizedText</code> |  |
| <code>upgrade</code> | 必須 | <code>LocalizedText</code> |  |
| <code>unchanged</code> | 必須 | <code>LocalizedText</code> |  |
| <code>blocked</code> | 必須 | <code>LocalizedText</code> |  |
| <code>turnStart</code> | 必須 | <code>LocalizedText</code> |  |
| <code>condition</code> | 必須 | <code>LocalizedText</code> |  |
| <code>energyGain</code> | 必須 | <code>LocalizedText</code> |  |
| <code>energyLoss</code> | 必須 | <code>LocalizedText</code> |  |

### CARD_CONDITION_NAMES

構造: <code>Record&lt;ConditionKind, LocalizedText&gt;</code>

値の詳細: [ConditionKind](reference-types.md#conditionkind) / [LocalizedText](reference-types.md#localizedtext)

### CARD_CONDITION_OPERATORS

構造: <code>Record&lt;ConditionOperator, LocalizedText&gt;</code>

値の詳細: [ConditionOperator](reference-types.md#conditionoperator) / [LocalizedText](reference-types.md#localizedtext)

## cards.ts

[src/data/cards.ts](../../src/data/cards.ts) ／ [意味・単位・手順](cards.md)

### CARD_DEFINITIONS

構造: <code>Record&lt;string, CardDefinition&gt;</code>

追加する1件は [CardDefinitionInput](reference-types.md#carddefinitioninput)。内部CardDefinitionの集計値は入力しません。

## characterPortraits.ts

[src/data/characterPortraits.ts](../../src/data/characterPortraits.ts) ／ [意味・単位・手順](assets.md)

### CHARACTER_IMAGE_DIRECTORY

型: <code>string</code>

### CHARACTER_IMAGE_EXTENSION

型: <code>string</code>

### DEFAULT_CHARACTER_PLACEMENT

| 設定パス | 必須／任意 | 型 | 注記 |
| --- | --- | --- | --- |
| <code>displayHeight</code> | 必須 | <code>number</code> | 倍率1での高さ。幅は画像の比率から計算。 |
| <code>offsetX</code> | 任意 | <code>number &#124; undefined</code> |  |
| <code>offsetY</code> | 任意 | <code>number &#124; undefined</code> |  |

### CHARACTER_PORTRAIT_CARD_ALIASES

| 設定パス | 必須／任意 | 型 | 注記 |
| --- | --- | --- | --- |

### CHARACTER_PORTRAITS

構造: <code>Record&lt;string, CharacterPortraitPlacement &#124; string&gt;</code>

値の詳細: [CharacterPortraitPlacement](reference-types.md#characterportraitplacement)

## conversationAppearance.ts

[src/data/conversationAppearance.ts](../../src/data/conversationAppearance.ts) ／ [意味・単位・手順](presentation.md)

### CONVERSATION_THEMES

構造: <code>Record&lt;ConversationDesign, ConversationTheme&gt;</code>

値の詳細: [ConversationDesign](reference-types.md#conversationdesign) / [ConversationTheme](reference-types.md#conversationtheme)

### CONVERSATION_APPEARANCE

| 設定パス | 必須／任意 | 型 | 注記 |
| --- | --- | --- | --- |
| <code>design</code> | 必須 | <code>ConversationDesign</code> |  |
| <code>backgroundOpacity</code> | 必須 | <code>number</code> |  |
| <code>showDesignSelector</code> | 必須 | <code>boolean</code> |  |

### NOVEL_AUTO

| 設定パス | 必須／任意 | 型 | 注記 |
| --- | --- | --- | --- |
| <code>baseMs</code> | 必須 | <code>number</code> |  |
| <code>perCharacterMs</code> | 必須 | <code>number</code> | 重み付き1文字あたりの追加待ち時間。 |
| <code>latinWeight</code> | 必須 | <code>number</code> |  |
| <code>japaneseWeight</code> | 必須 | <code>number</code> |  |

## conversationTransitions.ts

[src/data/conversationTransitions.ts](../../src/data/conversationTransitions.ts) ／ [意味・単位・手順](events.md)

### CONVERSATION_TRANSITIONS

| 設定パス | 必須／任意 | 型 | 注記 |
| --- | --- | --- | --- |
| <code>durations</code> | 必須 | <code>{ radial: number; flash: number; pageTurn: number; fade: number; blink: number; }</code> |  |
| <code>durations.radial</code> | 親を設定時必須 | <code>number</code> |  |
| <code>durations.flash</code> | 親を設定時必須 | <code>number</code> |  |
| <code>durations.pageTurn</code> | 親を設定時必須 | <code>number</code> |  |
| <code>durations.fade</code> | 親を設定時必須 | <code>number</code> |  |
| <code>durations.blink</code> | 親を設定時必須 | <code>number</code> |  |
| <code>showText</code> | 必須 | <code>boolean</code> |  |
| <code>originX</code> | 必須 | <code>number</code> |  |
| <code>originY</code> | 必須 | <code>number</code> |  |
| <code>feather</code> | 必須 | <code>number</code> |  |
| <code>maskResolution</code> | 必須 | <code>number</code> | 円形ぼかしの一時テクスチャ解像度。画像本体の解像度は変えない。 |
| <code>pageFoldWidth</code> | 必須 | <code>number</code> | めくる端の影の幅px。 |
| <code>pageFoldAlpha</code> | 必須 | <code>number</code> |  |
| <code>flashSwitchAt</code> | 必須 | <code>number</code> | 長い白フラッシュの頂点で画像を交換。 |
| <code>flashFrames</code> | 必須 | <code>{ at: number; alpha: number; }[]</code> |  |
| <code>flashFrames[].at</code> | 親を設定時必須 | <code>number</code> |  |
| <code>flashFrames[].alpha</code> | 親を設定時必須 | <code>number</code> |  |

## conversations.ts

[src/data/conversations.ts](../../src/data/conversations.ts) ／ [意味・単位・手順](events.md)

### CONVERSATIONS

構造: <code>Record&lt;string, ConversationPage[]&gt;</code>

値の詳細: [ConversationPage](reference-types.md#conversationpage)

### DEFEAT_CONVERSATIONS

構造: <code>Record&lt;string, string&gt;</code>

### CONVERSATION_WINDOW

| 設定パス | 必須／任意 | 型 | 注記 |
| --- | --- | --- | --- |
| <code>openDuration</code> | 必須 | <code>number</code> |  |
| <code>closeDuration</code> | 必須 | <code>number</code> |  |
| <code>backgroundDimDuration</code> | 必須 | <code>number</code> |  |

### NOVEL_PRESENTATION

| 設定パス | 必須／任意 | 型 | 注記 |
| --- | --- | --- | --- |
| <code>fadeInDuration</code> | 必須 | <code>number</code> |  |
| <code>fadeOutDuration</code> | 必須 | <code>number</code> |  |

### NOVEL_CONTROLS

| 設定パス | 必須／任意 | 型 | 注記 |
| --- | --- | --- | --- |
| <code>advance</code> | 必須 | <code>NovelInputBinding</code> |  |
| <code>log</code> | 必須 | <code>NovelInputBinding</code> |  |
| <code>hide</code> | 必須 | <code>NovelInputBinding</code> |  |
| <code>skip</code> | 必須 | <code>{ keys: string[]; intervalMs: number; }</code> |  |
| <code>skip.keys</code> | 親を設定時必須 | <code>string[]</code> |  |
| <code>skip.intervalMs</code> | 親を設定時必須 | <code>number</code> |  |

## enemies.ts

[src/data/enemies.ts](../../src/data/enemies.ts) ／ [意味・単位・手順](combatants.md)

### ENEMY_ORGASM_AFTERSHOCKS_INTENT

構造: <code>import("C:/Git/repos/SttS/src/models/types").EnemyIntent</code>

共通の強制行動。入力は [EnemyIntentInput](reference-types.md#enemyintentinput)。内部ダメージ集計値は入力しません。

### ENEMY_DEFINITIONS

構造: <code>Record&lt;string, EnemyDefinition&gt;</code>

各行動は [EnemyIntentInput](reference-types.md#enemyintentinput) をdefineEnemyIntentへ渡します。

値の詳細: [EnemyDefinition](reference-types.md#enemydefinition)

## enemySprites.ts

[src/data/enemySprites.ts](../../src/data/enemySprites.ts) ／ [意味・単位・手順](assets.md)

### ENEMY_SPRITES

構造: <code>Record&lt;string, EnemySpriteDefinition&gt;</code>

値の詳細: [EnemySpriteDefinition](reference-types.md#enemyspritedefinition)

## eventBattles.ts

[src/data/eventBattles.ts](../../src/data/eventBattles.ts) ／ [意味・単位・手順](events.md)

### EVENT_BATTLES

構造: <code>Record&lt;string, EventBattleDefinition&gt;</code>

値の詳細: [EventBattleDefinition](reference-types.md#eventbattledefinition)

## flavorCatalog.ts

[src/data/flavorCatalog.ts](../../src/data/flavorCatalog.ts) ／ [意味・単位・手順](effects.md)

### GLOBAL_FLAVORS

構造: <code>BattleFlavorSet</code>

値の詳細: [BattleFlavorSet](reference-types.md#battleflavorset)

## player.ts

[src/data/player.ts](../../src/data/player.ts) ／ [意味・単位・手順](combatants.md)

### PLAYER_PORTRAIT

| 設定パス | 必須／任意 | 型 | 注記 |
| --- | --- | --- | --- |
| <code>battleScale</code> | 必須 | <code>number</code> |  |

### PLAYER_DEFINITION

| 設定パス | 必須／任意 | 型 | 注記 |
| --- | --- | --- | --- |
| <code>initialEpProgress</code> | 任意 | <code>Record&lt;"A" &#124; "B" &#124; "C" &#124; "V" &#124; "M", { epDamage: number; orgasmCount: number; }&gt; &#124; undefined</code> |  |
| <code>id</code> | 必須 | <code>string</code> |  |
| <code>name</code> | 必須 | <code>LocalizedText</code> |  |
| <code>maxHp</code> | 必須 | <code>number</code> |  |
| <code>maxEp</code> | 必須 | <code>number</code> |  |
| <code>maxEnergy</code> | 必須 | <code>number</code> |  |
| <code>relics</code> | 必須 | <code>string[]</code> |  |
| <code>startingDeckIds</code> | 必須 | <code>string[]</code> |  |

## portraitFactors.ts

[src/data/portraitFactors.ts](../../src/data/portraitFactors.ts) ／ [意味・単位・手順](assets.md)

### PORTRAIT_FACTORS

| 設定パス | 必須／任意 | 型 | 注記 |
| --- | --- | --- | --- |
| <code>states</code> | 必須 | <code>"Death"[]</code> | 基本状態。前ほど優先。 |
| <code>statuses</code> | 必須 | <code>StatusEffect[]</code> | 前ほど優先。ファイル名で個数/残りターン数の閾値を指定可能。 |
| <code>connections</code> | 必須 | <code>PortraitConnection[]</code> | 敵全体の接続状態。前ほど優先。 |
| <code>relics</code> | 必須 | <code>string[]</code> | relics.tsのID。前ほど優先。 |
| <code>events</code> | 必須 | <code>PortraitEvent[]</code> | 前ほど優先。既定では絶頂をEPdamageより前に置く。 |
| <code>cards</code> | 必須 | <code>string[]</code> | cards.tsのID。そのターン最後に使ったカード。他カード使用または次ターン開始まで有効。 |
| <code>percentComparisons</code> | 必須 | <code>PortraitPercentStat[]</code> | 有効な割合比較対象。前ほど優先。 |
| <code>interactions</code> | 必須 | <code>"hover"[]</code> | マウス操作の要因。優先度はdata側の配列位置で指定。 |
| <code>ThresholdOrder</code> | 必須 | <code>"stricter" &#124; "looser"</code> | 同じ要因・同方向の閾値が競合する場合の優先順。配列でない設定の記述位置は優先度に影響しない。 |

## rarities.ts

[src/data/rarities.ts](../../src/data/rarities.ts) ／ [意味・単位・手順](combatants.md)

### REWARD_RARITY_DROP_RATES

構造: <code>Partial&lt;Record&lt;Rarity, number&gt;&gt;</code>

値の詳細: [Rarity](reference-types.md#rarity)

## relics.ts

[src/data/relics.ts](../../src/data/relics.ts) ／ [意味・単位・手順](combatants.md)

### RELIC_DEFINITIONS

構造: <code>Record&lt;string, RelicDefinition&gt;</code>

入力は [RelicDefinitionInput](reference-types.md#relicdefinitioninput)。

## sprites.ts

[src/data/sprites.ts](../../src/data/sprites.ts) ／ [意味・単位・手順](assets.md)

### EFFECT_SPRITES

構造: <code>Record&lt;string, SpriteDefinition&gt;</code>

値の詳細: [SpriteDefinition](reference-types.md#spritedefinition)

### UI_SPRITES

構造: <code>Record&lt;string, SpriteDefinition&gt;</code>

値の詳細: [SpriteDefinition](reference-types.md#spritedefinition)

### DAMAGE_SPRITE_EFFECTS

構造: <code>Record&lt;AttackAttribute, SpriteEffectDefinition&gt;</code>

値の詳細: [AttackAttribute](reference-types.md#attackattribute) / [SpriteEffectDefinition](reference-types.md#spriteeffectdefinition)

## statuses.ts

[src/data/statuses.ts](../../src/data/statuses.ts) ／ [意味・単位・手順](combatants.md)

### PART_SENSITIVITY_LEVELS

構造: <code>Record&lt;SensitivityLevel, SensitivityLevelConfig&gt;</code>

値の詳細: [SensitivityLevel](reference-types.md#sensitivitylevel) / [SensitivityLevelConfig](reference-types.md#sensitivitylevelconfig)

### STATUS_DESCRIPTIONS

構造: <code>Record&lt;StatusEffect, StatusDefinition&gt;</code>

値の詳細: [StatusEffect](reference-types.md#statuseffect) / [StatusDefinition](reference-types.md#statusdefinition)

## tutorialTips.ts

[src/data/tutorialTips.ts](../../src/data/tutorialTips.ts) ／ [意味・単位・手順](events.md)

### TUTORIAL_TIPS

構造: <code>TutorialTipDefinition[]</code>

値の詳細: [TutorialTipDefinition](reference-types.md#tutorialtipdefinition)

## ui.ts

[src/data/ui.ts](../../src/data/ui.ts) ／ [意味・単位・手順](presentation.md)

### ENEMY_INTENT_COLORS

| 設定パス | 必須／任意 | 型 | 注記 |
| --- | --- | --- | --- |
| <code>hpDamage</code> | 必須 | <code>string</code> | HPダメージ（赤）。#RRGGBB形式。 |
| <code>epDamage</code> | 必須 | <code>string</code> | EPダメージ（ピンク）。#RRGGBB形式。 |

### ENEMY_INTENT_TEXT

| 設定パス | 必須／任意 | 型 | 注記 |
| --- | --- | --- | --- |
| <code>fontSize</code> | 必須 | <code>number</code> |  |
| <code>numberFontSize</code> | 必須 | <code>number</code> | 行動予告のダメージ数値だけの文字サイズpx。 |

### CRAYON_ANIMATION

| 設定パス | 必須／任意 | 型 | 注記 |
| --- | --- | --- | --- |
| <code>redrawDuration</code> | 必須 | <code>number</code> | 描き替え全体の秒数。0で即時切替、0以上。Ctrl早送りの対象。 |

### END_TURN_PROMPT

| 設定パス | 必須／任意 | 型 | 注記 |
| --- | --- | --- | --- |
| <code>cycleDuration</code> | 必須 | <code>number</code> | 元の色→濃い色→元の色の1周期ms。正の値。Ctrl早送り対象。 |
| <code>minBrightness</code> | 必須 | <code>number</code> | 最も濃い時の明るさ。0～1（1で色変化なし）。文字色は変えない。 |

### CARD_HOVER

| 設定パス | 必須／任意 | 型 | 注記 |
| --- | --- | --- | --- |
| <code>scales</code> | 必須 | <code>number[]</code> | 小・中・大の3個。正の倍率、昇順。 |
| <code>bottomY</code> | 必須 | <code>number</code> | 小サイズ時のホバーカード下端座標px。 |
| <code>bottomYStep</code> | 必須 | <code>number</code> | サイズが1段階上がるごとの下端Y加算px。小:+0、中:+1倍、大:+2倍。 |
| <code>resizeDuration</code> | 必須 | <code>number</code> | ホイールによるサイズ切替ms。Ctrl早送り対象。 |
| <code>overshoot</code> | 必須 | <code>number</code> | 拡大時Back easingの戻り具合。0で超過なし。 |
| <code>crowdingStartCount</code> | 必須 | <code>number</code> | この枚数を超えた分だけホバーカードを左へ寄せる。 |
| <code>leftShiftPerCard</code> | 必須 | <code>number</code> | 超過1枚ごとの左寄せpx。小では0、中～大で比例。 |

### CARD_INSPECTION

| 設定パス | 必須／任意 | 型 | 注記 |
| --- | --- | --- | --- |
| <code>detailScale</code> | 必須 | <code>number</code> | 一覧詳細の通常カードに対する倍率。正の値。 |
| <code>holdScale</code> | 必須 | <code>number</code> | 手札長押し表示の通常カードに対する倍率。正の値。 |
| <code>detailX</code> | 必須 | <code>number</code> |  |
| <code>detailY</code> | 必須 | <code>number</code> | 一覧右側の詳細カード中心座標px。 |
| <code>progressStartMs</code> | 必須 | <code>number</code> | 円形進捗の表示開始と短押しの上限。実時間ms。 |
| <code>openMs</code> | 必須 | <code>number</code> | 拡大までの長押し時間。progressStartMsより大きい実時間ms。Ctrl非対象。 |
| <code>progressRadius</code> | 必須 | <code>number</code> |  |
| <code>progressWidth</code> | 必須 | <code>number</code> | マウス周囲の進捗の半径・線幅px。 |
| <code>progressColor</code> | 必須 | <code>number</code> |  |
| <code>progressAlpha</code> | 必須 | <code>number</code> | 進捗色0xRRGGBB、不透明度0～1。 |
| <code>progressShadow</code> | 必須 | <code>{ color: number; alpha: number; spread: number; blur: number; offsetX: number; offsetY: number; }</code> | 進捗背面の影。色0xRRGGBB、不透明度0～1、線の広がり・ぼかし範囲・位置補正px。 |
| <code>progressShadow.color</code> | 親を設定時必須 | <code>number</code> |  |
| <code>progressShadow.alpha</code> | 親を設定時必須 | <code>number</code> |  |
| <code>progressShadow.spread</code> | 親を設定時必須 | <code>number</code> |  |
| <code>progressShadow.blur</code> | 親を設定時必須 | <code>number</code> |  |
| <code>progressShadow.offsetX</code> | 親を設定時必須 | <code>number</code> |  |
| <code>progressShadow.offsetY</code> | 親を設定時必須 | <code>number</code> |  |
| <code>shadeAlpha</code> | 必須 | <code>number</code> | 拡大表示の背面暗転。不透明度0～1。 |

### PLAYER_PORTRAIT_RENDERING

| 設定パス | 必須／任意 | 型 | 注記 |
| --- | --- | --- | --- |
| <code>transitionDuration</code> | 必須 | <code>number</code> | 立ち絵切替の合計時間ms。前半で新画像をフェードイン、後半で旧画像をフェードアウト。ホバー安定待ち後に開始。0で即時。Ctrl早送り対象。 |
| <code>smoothingPixels</code> | 必須 | <code>number</code> | WebGL表示時の平滑化幅px。0で無効。大きいほどぼける。 |

### CARD_TEXT_RENDERING

| 設定パス | 必須／任意 | 型 | 注記 |
| --- | --- | --- | --- |
| <code>scaleResolutions</code> | 必須 | <code>CardTextResolutionPoint[]</code> | 最も近いcardScaleの解像度を使用。配列順は不問。 |
| <code>scaleResolutions[].cardScale</code> | 親を設定時必須 | <code>number</code> | カードの表示倍率。通常手札の160×232を1とする。 |
| <code>scaleResolutions[].resolution</code> | 親を設定時必須 | <code>number</code> | 文字の内部描画倍率。1以上、小数可。 |

### SELECTION_GLOW

| 設定パス | 必須／任意 | 型 | 注記 |
| --- | --- | --- | --- |
| <code>card</code> | 必須 | <code>{ usableColor: number; unusableColor: number; spread: number; maxAlpha: number; minAlpha: number; dimmedMultiplier: number; pulseDuration: number; }</code> |  |
| <code>card.usableColor</code> | 親を設定時必須 | <code>number</code> | 使用可能なカード。 |
| <code>card.unusableColor</code> | 親を設定時必須 | <code>number</code> | エナジー不足・使用条件不成立。 |
| <code>card.spread</code> | 親を設定時必須 | <code>number</code> | カード等倍時の外側への広がりpx。 |
| <code>card.maxAlpha</code> | 親を設定時必須 | <code>number</code> | 発光の最も強い時の不透明度（0～1）。 |
| <code>card.minAlpha</code> | 親を設定時必須 | <code>number</code> | 脈動の谷の不透明度（0～maxAlpha）。 |
| <code>card.dimmedMultiplier</code> | 親を設定時必須 | <code>number</code> | 透過カードの光を追加で弱める倍率（0～1）。カードの透過もそのまま適用。 |
| <code>card.pulseDuration</code> | 親を設定時必須 | <code>number</code> | 弱まり、再び強まる1周期。正のms。 |
| <code>enemy</code> | 必須 | <code>{ color: number; spread: number; strength: number; riseDuration: number; fadeDuration: number; }</code> |  |
| <code>enemy.color</code> | 親を設定時必須 | <code>number</code> | レティクルに合わせた淡い金色。 |
| <code>enemy.spread</code> | 親を設定時必須 | <code>number</code> | 輪郭の外側への広がりpx。正の値。 |
| <code>enemy.strength</code> | 親を設定時必須 | <code>number</code> | 外側発光の強さ。0で無効。 |
| <code>enemy.riseDuration</code> | 親を設定時必須 | <code>number</code> | 光が外側へ広がる時間。正のms。 |
| <code>enemy.fadeDuration</code> | 親を設定時必須 | <code>number</code> | 光が完全に消えるまでの時間。正のms。 |

### RELIC_HUD_LAYOUT

| 設定パス | 必須／任意 | 型 | 注記 |
| --- | --- | --- | --- |
| <code>x</code> | 必須 | <code>number</code> |  |
| <code>y</code> | 必須 | <code>number</code> |  |
| <code>iconSize</code> | 必須 | <code>number</code> |  |

### PLAYER_STATUS_HUD_LAYOUT

| 設定パス | 必須／任意 | 型 | 注記 |
| --- | --- | --- | --- |
| <code>x</code> | 必須 | <code>number</code> |  |
| <code>y</code> | 必須 | <code>number</code> |  |
| <code>iconSize</code> | 必須 | <code>number</code> |  |

### PLAYER_PORTRAIT_FLASH

| 設定パス | 必須／任意 | 型 | 注記 |
| --- | --- | --- | --- |
| <code>damageColor</code> | 必須 | <code>number</code> | 通常の乗算Tint。白塗りにはしない。 |
| <code>damageCycleDuration</code> | 必須 | <code>number</code> | 被ダメージの点滅1周期（ms）。 |
| <code>damageFlashCount</code> | 必須 | <code>number</code> | 被ダメージの点滅回数。 |
| <code>orgasmColor</code> | 必須 | <code>number</code> | 絶頂時の淡いピンク。 |
| <code>tintRatio</code> | 必須 | <code>number</code> | 1周期のうち色を付ける割合（0より大きく1未満）。残りは元の画像。 |
| <code>maxTintDuration</code> | 必須 | <code>number</code> | 色を付ける時間の上限（ms）。連続絶頂では周期に比例して短縮。 |

### PLAYER_PORTRAIT_HOVER

| 設定パス | 必須／任意 | 型 | 注記 |
| --- | --- | --- | --- |
| <code>delayMs</code> | 必須 | <code>number</code> | ホバー開始・解除の判定が連続して続く必要がある実時間ms。0で即時。 |

### TUTORIAL_TIP_PRESENTATION

| 設定パス | 必須／任意 | 型 | 注記 |
| --- | --- | --- | --- |
| <code>fadeInDuration</code> | 必須 | <code>number</code> | 暗転とTipsが徐々に現れる時間ms。Ctrl早送り対象。0で即時。 |
| <code>inputLockDuration</code> | 必須 | <code>number</code> | 表示後のページ送り・終了を禁止する実時間ms。Ctrlでは短縮しない。 |

### ICON_HUD_LAYOUT

| 設定パス | 必須／任意 | 型 | 注記 |
| --- | --- | --- | --- |
| <code>gap</code> | 必須 | <code>number</code> |  |
| <code>statusColumns</code> | 必須 | <code>number</code> |  |
| <code>statusRowGap</code> | 必須 | <code>number</code> | 上にはみ出す個数表示と前の行が重ならない余白。 |
| <code>enemyStatusSize</code> | 必須 | <code>number</code> |  |

### ICON_APPEARANCE

| 設定パス | 必須／任意 | 型 | 注記 |
| --- | --- | --- | --- |
| <code>Status</code> | 必須 | <code>{ fallbackColor: number; borderColor: number; borderAlpha: number; fontSize: number; compactFontSize: number; }</code> |  |
| <code>Status.fallbackColor</code> | 親を設定時必須 | <code>number</code> |  |
| <code>Status.borderColor</code> | 親を設定時必須 | <code>number</code> |  |
| <code>Status.borderAlpha</code> | 親を設定時必須 | <code>number</code> |  |
| <code>Status.fontSize</code> | 親を設定時必須 | <code>number</code> |  |
| <code>Status.compactFontSize</code> | 親を設定時必須 | <code>number</code> |  |
| <code>Relic</code> | 必須 | <code>{ fallbackColor: number; borderColor: number; borderAlpha: number; fontSize: number; compactFontSize: number; }</code> |  |
| <code>Relic.fallbackColor</code> | 親を設定時必須 | <code>number</code> |  |
| <code>Relic.borderColor</code> | 親を設定時必須 | <code>number</code> |  |
| <code>Relic.borderAlpha</code> | 親を設定時必須 | <code>number</code> |  |
| <code>Relic.fontSize</code> | 親を設定時必須 | <code>number</code> |  |
| <code>Relic.compactFontSize</code> | 親を設定時必須 | <code>number</code> |  |
| <code>borderWidth</code> | 必須 | <code>number</code> | 代替表示の枠線幅px。画像表示時は枠線と背景を隠す。 |
| <code>textColor</code> | 必須 | <code>string</code> |  |
| <code>fallbackTextLength</code> | 必須 | <code>number</code> | iconText省略時の文字数。レリックは名称、状態異常はIDから取得。 |
| <code>compactCountThreshold</code> | 必須 | <code>number</code> | スタック数がこの値を超えるとcompactFontSizeを使用。 |
| <code>maxDisplayedStacks</code> | 必須 | <code>number</code> | 状態異常のスタック表示上限。 |
| <code>imageCountStrokeColor</code> | 必須 | <code>string</code> |  |
| <code>imageCountStrokeWidth</code> | 必須 | <code>number</code> |  |
| <code>statusCounter</code> | 必須 | <code>{ offsetX: number; offsetY: number; fontSize: number; stackPrefix: string; turnPrefix: string; }</code> | 右端をアイコン右端に揃え、上方向に半分はみ出す。補正px。 |
| <code>statusCounter.offsetX</code> | 親を設定時必須 | <code>number</code> |  |
| <code>statusCounter.offsetY</code> | 親を設定時必須 | <code>number</code> |  |
| <code>statusCounter.fontSize</code> | 親を設定時必須 | <code>number</code> |  |
| <code>statusCounter.stackPrefix</code> | 親を設定時必須 | <code>string</code> |  |
| <code>statusCounter.turnPrefix</code> | 親を設定時必須 | <code>string</code> |  |
| <code>relicGlow</code> | 必須 | <code>{ color: number; spread: number; angularSamples: number; idleStrength: number; activeStrength: number; }</code> | spreadは通常アイコン表示時のpx（拡大に追従）。angularSamplesはキャッシュ生成時の方向数（8以上、4の倍数へ切上げ）。 |
| <code>relicGlow.color</code> | 親を設定時必須 | <code>number</code> |  |
| <code>relicGlow.spread</code> | 親を設定時必須 | <code>number</code> |  |
| <code>relicGlow.angularSamples</code> | 親を設定時必須 | <code>number</code> |  |
| <code>relicGlow.idleStrength</code> | 親を設定時必須 | <code>number</code> |  |
| <code>relicGlow.activeStrength</code> | 親を設定時必須 | <code>number</code> |  |
| <code>relicActivation</code> | 必須 | <code>{ scale: number; growDuration: number; glowRiseDuration: number; glowHoldDuration: number; glowFadeDuration: number; shrinkDuration: number; }</code> | 拡大→発光→減光→縮小。時間ms、Ctrl早送り対象。 |
| <code>relicActivation.scale</code> | 親を設定時必須 | <code>number</code> |  |
| <code>relicActivation.growDuration</code> | 親を設定時必須 | <code>number</code> |  |
| <code>relicActivation.glowRiseDuration</code> | 親を設定時必須 | <code>number</code> |  |
| <code>relicActivation.glowHoldDuration</code> | 親を設定時必須 | <code>number</code> |  |
| <code>relicActivation.glowFadeDuration</code> | 親を設定時必須 | <code>number</code> |  |
| <code>relicActivation.shrinkDuration</code> | 親を設定時必須 | <code>number</code> |  |
| <code>relicCounter</code> | 必須 | <code>{ offsetX: number; offsetY: number; fontSize: number; textColor: string; backgroundColor: string; }</code> |  |
| <code>relicCounter.offsetX</code> | 親を設定時必須 | <code>number</code> |  |
| <code>relicCounter.offsetY</code> | 親を設定時必須 | <code>number</code> |  |
| <code>relicCounter.fontSize</code> | 親を設定時必須 | <code>number</code> |  |
| <code>relicCounter.textColor</code> | 親を設定時必須 | <code>string</code> |  |
| <code>relicCounter.backgroundColor</code> | 親を設定時必須 | <code>string</code> |  |
| <code>relicRewardSize</code> | 必須 | <code>number</code> |  |
| <code>relicRewardFontSize</code> | 必須 | <code>number</code> | 報酬候補内のアイコンサイズと代替文字サイズpx。 |

## 非公開の設定とヘルパー

- [cardCategories.ts](../../src/data/cardCategories.ts) のCRAVING_PLAYABLE_CARD_CATEGORIESはCardCategoryのSet。快楽渇望中に許可するカテゴリ。
- [enemySprites.ts](../../src/data/enemySprites.ts) のspriteは素材設定の補完ヘルパー。引数と既定値を変える場合は全呼出しへの影響を確認。
- [effectBuilders.ts](../../src/data/effectBuilders.ts) のdefineCard、defineEnemyIntent、defineRelic、effect、conditionは入力を正規化する関数。設定値ではありません。

生成元: tools/docs/generate-reference.mjs。手編集せず、意味の説明は該当マニュアルへ追加してください。
