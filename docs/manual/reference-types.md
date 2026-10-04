# 入力型の全項目リファレンス

[マニュアル目次](README.md) / [設定定数](reference-config.md)

この文書は型から生成します。現在のバランス数値・登録カード一覧は複製しません。型上の必須／任意と、動作上の条件付き必須は別です。各型の「使い方」を併読してください。参照欄が空でも、型名のリンクと「使い方」から意味・参照先・省略時の動作を確認してください。

カード／敵行動／レリックはビルダー入力型を掲載し、生成後の内部集計型を除外しています。EffectDefinitionだけは直書きの型です。effect()を使うとtimesを省略できます。


主な入力: [カード](#carddefinitioninput) / [効果](#effectdefinition) / [条件](#conditiondefinition) / [敵](#enemydefinition) / [行動](#enemyintentinput) / [状態](#statusdefinition) / [レリック](#relicdefinitioninput) / [プレイヤー](#playerdefinition) / [会話](#conversationpage) / [Tips](#tutorialtipdefinition) / [立ち絵](#characterportraitplacement) / [スプライト](#spritedefinition)

## StatusEffect

定義: [src/models/types.ts](../../src/models/types.ts) ／ [使い方](effects.md)

<code>'Starvation' &#124; 'Hunger' &#124; 'ExtremeFatigue' &#124; 'Charm' &#124; 'Aphrodisiac' &#124; 'Estrus' &#124; 'InfestedA_AphrodisiacSlime' &#124; 'InfestedV_AphrodisiacSlime' &#124; 'Aftershocks' &#124; 'Horny' &#124; 'InHeat' &#124; 'Frustrated' &#124; 'DesperateToCum' &#124; 'IntrudedA' &#124; 'IntrudedV' &#124; 'IntrudedM' &#124; 'InsertA' &#124; 'InsertV' &#124; 'InsertM' &#124; 'InfestedA_Slime' &#124; 'InfestedV_Slime' &#124; 'MultipleOrgasm' &#124; 'OrgasmHell' &#124; 'MultipleOrgasmsTorture' &#124; 'Fainted' &#124; 'Focused' &#124; 'Bound' &#124; 'Escaping' &#124; 'Binding' &#124; 'ASensitivityLv1' &#124; 'ASensitivityLv2' &#124; 'ASensitivityLv3' &#124; 'ASensitivityLv4' &#124; 'ASensitivityLv5' &#124; 'BSensitivityLv1' &#124; 'BSensitivityLv2' &#124; 'BSensitivityLv3' &#124; 'BSensitivityLv4' &#124; 'BSensitivityLv5' &#124; 'CSensitivityLv1' &#124; 'CSensitivityLv2' &#124; 'CSensitivityLv3' &#124; 'CSensitivityLv4' &#124; 'CSensitivityLv5' &#124; 'VSensitivityLv1' &#124; 'VSensitivityLv2' &#124; 'VSensitivityLv3' &#124; 'VSensitivityLv4' &#124; 'VSensitivityLv5' &#124; 'MSensitivityLv1' &#124; 'MSensitivityLv2' &#124; 'MSensitivityLv3' &#124; 'MSensitivityLv4' &#124; 'MSensitivityLv5'</code>

## AttackAttribute

定義: [src/models/types.ts](../../src/models/types.ts) ／ [使い方](effects.md)

<code>'strike' &#124; 'slash' &#124; 'slice' &#124; 'love' &#124; 'mucus' &#124; 'aphrodisiacMucus'</code>

## EpDamagePart

定義: [src/models/types.ts](../../src/models/types.ts) ／ [使い方](effects.md)

<code>typeof EP_DAMAGE_PARTS[number]</code>

## EpDamagePartMode

定義: [src/models/types.ts](../../src/models/types.ts) ／ [使い方](effects.md)

<code>'static' &#124; 'actorIntruded' &#124; 'lastPlayerEpDamageParts'</code>

## EffectTarget

定義: [src/models/types.ts](../../src/models/types.ts) ／ [使い方](effects.md)

<code>'player' &#124; 'self' &#124; 'selectedEnemy' &#124; 'triggerEnemy' &#124; 'allEnemies'</code>

## EffectKind

定義: [src/models/types.ts](../../src/models/types.ts) ／ [使い方](effects.md)

<code>'hpDamage' &#124; 'epDamage' &#124; 'shareEpDamage' &#124; 'copyEpSensitivity' &#124; 'hpHeal' &#124; 'epHeal' &#124; 'epReserveHeal' &#124; 'block' &#124; 'drawCards' &#124; 'addCardToHand' &#124; 'energyGain' &#124; 'status' &#124; 'removeStatus' &#124; 'discardHand' &#124; 'setEpReserve' &#124; 'setEpReserveRatio' &#124; 'setEp' &#124; 'setEpRatio' &#124; 'retainBlock' &#124; 'hpDrain'</code>

## StatusOwner

定義: [src/models/types.ts](../../src/models/types.ts) ／ [使い方](effects.md)

<code>'player' &#124; 'enemy'</code>

## StatusConsumeRule

定義: [src/models/types.ts](../../src/models/types.ts) ／ [使い方](effects.md)

<code>'none' &#124; 'one' &#124; 'allWhileEnergy'</code>

## StatusVisualKey

定義: [src/models/types.ts](../../src/models/types.ts) ／ [使い方](effects.md)

<code>'breathAndEnergyPulse' &#124; 'playerTremble' &#124; 'addCardFromPlayerFadeIn' &#124; 'faintedDrop'</code>

## StatusModifierKind

定義: [src/models/types.ts](../../src/models/types.ts) ／ [使い方](effects.md)

<code>'epDamageTakenMultiplier' &#124; 'hpDamageTakenMultiplier' &#124; 'epMaxMultiplier'</code>

## CardPlayCondition

定義: [src/models/types.ts](../../src/models/types.ts) ／ [使い方](effects.md)

<code>'none' &#124; 'noCardsPlayedThisTurn'</code>

## CardCategory

定義: [src/models/types.ts](../../src/models/types.ts) ／ [使い方](effects.md)

<code>'attack' &#124; 'utility' &#124; 'caress' &#124; 'lust' &#124; 'physiology' &#124; 'remedy' &#124; 'noMotion'</code>

## EnemyTrait

定義: [src/models/types.ts](../../src/models/types.ts) ／ [使い方](effects.md)

<code>'male' &#124; 'softBody' &#124; 'sexToy'</code>

## Rarity

定義: [src/models/types.ts](../../src/models/types.ts) ／ [使い方](effects.md)

<code>'starter' &#124; 'common' &#124; 'uncommon' &#124; 'rare' &#124; 'event'</code>

## BattleEventSource

定義: [src/models/types.ts](../../src/models/types.ts) ／ [使い方](effects.md)

<code>'card' &#124; 'enemyIntent' &#124; 'relic' &#124; 'status' &#124; 'system'</code>

## BattleLogKind

定義: [src/models/types.ts](../../src/models/types.ts) ／ [使い方](effects.md)

<code>'system' &#124; 'status' &#124; 'important' &#124; 'narration' &#124; 'quote'</code>

## StatusNoticeLevel

定義: [src/models/types.ts](../../src/models/types.ts) ／ [使い方](effects.md)

<code>'normal' &#124; 'important'</code>

## EnemyDeathCause

定義: [src/models/types.ts](../../src/models/types.ts) ／ [使い方](combatants.md)

<code>'hpDamage' &#124; 'hpDrain' &#124; 'selfHpDamage'</code>

## BodyPartStatusKind

定義: [src/models/types.ts](../../src/models/types.ts) ／ [使い方](effects.md)

<code>'insert' &#124; 'intruded'</code>

## BattleFlavorEvent

定義: [src/models/types.ts](../../src/models/types.ts) ／ [使い方](effects.md)

<code>DeepValueOf&lt;typeof FLAVOR_EVENTS&gt;</code>

## ConditionTarget

定義: [src/models/types.ts](../../src/models/types.ts) ／ [使い方](effects.md)

<code>'player' &#124; 'actor' &#124; 'self' &#124; 'selectedEnemy' &#124; 'triggerEnemy' &#124; 'statusOwner'</code>

## ConditionKind

定義: [src/models/types.ts](../../src/models/types.ts) ／ [使い方](effects.md)

<code>'status' &#124; 'relic' &#124; 'enemyTrait' &#124; 'enemyHasBindingAction' &#124; 'enemyOrgasmAftershocks' &#124; 'hasEp' &#124; 'enemyHasEIntents' &#124; 'bodyPartStatus' &#124; 'cardsPlayedThisTurn' &#124; 'intentUsageCount' &#124; 'playerOrgasmsThisBattle' &#124; 'flavorValue' &#124; 'purgeCausedOrgasm' &#124; 'purgeWillCauseOrgasm' &#124; 'isPlayerTurn' &#124; 'hp' &#124; 'hpPercent' &#124; 'ep' &#124; 'epPercent' &#124; 'block' &#124; 'aliveEnemyCount'</code>

## ConditionOperator

定義: [src/models/types.ts](../../src/models/types.ts) ／ [使い方](effects.md)

<code>'eq' &#124; 'notEq' &#124; 'gt' &#124; 'gte' &#124; 'lt' &#124; 'lte' &#124; 'has' &#124; 'notHas'</code>

## EffectTiming

定義: [src/models/types.ts](../../src/models/types.ts) ／ [使い方](effects.md)

<code>typeof EFFECT_TIMINGS[keyof typeof EFFECT_TIMINGS]</code>

## HpDrainValue

定義: [src/models/types.ts](../../src/models/types.ts) ／ [使い方](effects.md)

<code>number &#124; 'targetMaxEp'</code>

## EpRatioBase

定義: [src/models/types.ts](../../src/models/types.ts) ／ [使い方](effects.md)

<code>'playerMaxEp' &#124; 'playerCurrentEp' &#124; 'playerEpReserve'</code>

## EffectPercentOf

定義: [src/models/types.ts](../../src/models/types.ts) ／ [使い方](effects.md)

<code>'playerMaxHp' &#124; 'playerMaxEp' &#124; 'playerBaseMaxEp' &#124; 'selfCurrentHp' &#124; 'selfMaxEp' &#124; 'targetMaxEp'</code>

## CardAddVariant

定義: [src/models/types.ts](../../src/models/types.ts) ／ [使い方](effects.md)

<code>'default' &#124; 'purgeForStatusOwner' &#124; 'pulloutForStatusOwner' &#124; 'wriggleFreeForStatusOwner'</code>

## StatusApplication

定義: [src/models/types.ts](../../src/models/types.ts) ／ [使い方](effects.md)

関連する型: [StatusEffect](reference-types.md#statuseffect)

| 項目 | 必須／任意 | 型・選択肢 | 参照・注意 |
| --- | --- | --- | --- |
| <code>effect</code> | 必須 | <code>StatusEffect</code> | StatusEffectから選ぶ初期付与状態ID。 |
| <code>stacks</code> | 必須 | <code>number</code> |  |

## BattleFlavorLine

定義: [src/models/types.ts](../../src/models/types.ts) ／ [使い方](effects.md)

関連する型: [BattleLogKind](reference-types.md#battlelogkind) / [LocalizedText](reference-types.md#localizedtext)

| 項目 | 必須／任意 | 型・選択肢 | 参照・注意 |
| --- | --- | --- | --- |
| <code>kind</code> | 必須 | <code>BattleLogKind</code> |  |
| <code>text</code> | 必須 | <code>LocalizedText</code> | LocalizedText（l(en, ja)） |

## BattleFlavorVariant

定義: [src/models/types.ts](../../src/models/types.ts) ／ [使い方](effects.md)

関連する型: [ConditionDefinition](reference-types.md#conditiondefinition) / [BattleLogKind](reference-types.md#battlelogkind) / [BattleFlavorLine](reference-types.md#battleflavorline)

| 項目 | 必須／任意 | 型・選択肢 | 参照・注意 |
| --- | --- | --- | --- |
| <code>conditions</code> | 任意 | <code>ConditionDefinition[]</code> | ConditionDefinition[]（AND） |
| <code>suppressKinds</code> | 任意 | <code>BattleLogKind[]</code> | 条件成立時、この種類の後続候補を抑止。既に先行候補が選ばれた種類は維持。 |
| <code>lines</code> | 必須 | <code>BattleFlavorLine[]</code> |  |

## BattleFlavorEntry

定義: [src/models/types.ts](../../src/models/types.ts) ／ [使い方](effects.md)

関連する型: [BattleFlavorLine](reference-types.md#battleflavorline) / [BattleFlavorVariant](reference-types.md#battleflavorvariant)

<code>BattleFlavorLine &#124; BattleFlavorVariant</code>

## BattleFlavorSet

定義: [src/models/types.ts](../../src/models/types.ts) ／ [使い方](effects.md)

関連する型: [BattleFlavorEvent](reference-types.md#battleflavorevent) / [BattleFlavorEntry](reference-types.md#battleflavorentry)

<code>Partial&lt;Record&lt;BattleFlavorEvent, BattleFlavorEntry[]&gt;&gt;</code>

## ConditionDefinition

定義: [src/models/types.ts](../../src/models/types.ts) ／ [使い方](effects.md)

関連する型: [ConditionKind](reference-types.md#conditionkind) / [ConditionOperator](reference-types.md#conditionoperator) / [ConditionTarget](reference-types.md#conditiontarget) / [StatusEffect](reference-types.md#statuseffect) / [StatusApplication](reference-types.md#statusapplication) / [EnemyTrait](reference-types.md#enemytrait) / [EpDamagePart](reference-types.md#epdamagepart) / [BodyPartStatusKind](reference-types.md#bodypartstatuskind)

| 項目 | 必須／任意 | 型・選択肢 | 参照・注意 |
| --- | --- | --- | --- |
| <code>kind</code> | 必須 | <code>ConditionKind</code> |  |
| <code>operator</code> | 必須 | <code>ConditionOperator</code> |  |
| <code>target</code> | 任意 | <code>ConditionTarget</code> |  |
| <code>status</code> | 任意 | <code>StatusEffect</code> | statuses.ts / STATUS_DESCRIPTIONS（StatusEffect） |
| <code>statuses</code> | 任意 | <code>StatusEffect[]</code> | StatusEffect。所有者別の初期状態はStatusApplication |
| <code>enemyTrait</code> | 任意 | <code>EnemyTrait</code> |  |
| <code>enemyTraits</code> | 任意 | <code>EnemyTrait[]</code> |  |
| <code>parts</code> | 任意 | <code>EpDamagePart[]</code> | types.ts / EP_DAMAGE_PARTS |
| <code>bodyPartStatusKinds</code> | 任意 | <code>BodyPartStatusKind[]</code> |  |
| <code>relicId</code> | 任意 | <code>string</code> | 所持relicIds内のID（新規登録はキーとidを一致） |
| <code>relicIds</code> | 任意 | <code>string[]</code> | 所持レリックID配列 |
| <code>value</code> | 任意 | <code>number &#124; boolean</code> |  |
| <code>valueKey</code> | 任意 | <code>string</code> |  |
| <code>causeStatus</code> | 任意 | <code>StatusEffect</code> | StatusEffect |

## CardDisplayNameRule

定義: [src/models/types.ts](../../src/models/types.ts) ／ [使い方](cards.md)

関連する型: [ConditionDefinition](reference-types.md#conditiondefinition) / [LocalizedText](reference-types.md#localizedtext)

| 項目 | 必須／任意 | 型・選択肢 | 参照・注意 |
| --- | --- | --- | --- |
| <code>conditions</code> | 必須 | <code>ConditionDefinition[]</code> | ConditionDefinition[]（AND） |
| <code>name</code> | 必須 | <code>LocalizedText</code> | LocalizedText（l(en, ja)） |

## EffectDefinition

定義: [src/models/types.ts](../../src/models/types.ts) ／ [使い方](effects.md)

関連する型: [ConditionDefinition](reference-types.md#conditiondefinition) / [EpDamagePart](reference-types.md#epdamagepart) / [EffectKind](reference-types.md#effectkind) / [EffectTarget](reference-types.md#effecttarget) / [EffectPercentOf](reference-types.md#effectpercentof) / [EpRatioBase](reference-types.md#epratiobase) / [StatusEffect](reference-types.md#statuseffect) / [AttackAttribute](reference-types.md#attackattribute) / [EpDamagePartMode](reference-types.md#epdamagepartmode) / [CardAddVariant](reference-types.md#cardaddvariant) / [ConditionTarget](reference-types.md#conditiontarget) / [BattleFlavorSet](reference-types.md#battleflavorset)

| 項目 | 必須／任意 | 型・選択肢 | 参照・注意 |
| --- | --- | --- | --- |
| <code>targetConditions</code> | 任意 | <code>ConditionDefinition[]</code> | 対象ごとに判定する追加条件。selectedEnemyは現在解決する敵。 |
| <code>sensitivityPart</code> | 任意 | <code>EpDamagePart</code> | copyEpSensitivity用: プレイヤー倍率の参照部位。 |
| <code>textId</code> | 任意 | <code>string</code> | 同一対象・効果が複数ある時の説明参照名。カード内で一意。{effect.名前.amount}等で使用。 |
| <code>kind</code> | 必須 | <code>EffectKind</code> | 必須: 効果の種類。専用オプション・例外はEffectKindの各行を参照。 |
| <code>target</code> | 必須 | <code>EffectTarget</code> | 必須: 効果対象。プレイヤー専用効果にはplayerを指定。 |
| <code>amount</code> | 必須 | <code>number</code> | 必須: 基本量（通常0以上）。割合設定は0～1、energyGainは負数可。未使用の効果は0。 |
| <code>times</code> | 必須 | <code>number</code> | 直書きでは必須。effect()のoptionsでは任意、省略1。一部kindは繰返し対象外。 |
| <code>percentOf</code> | 任意 | <code>EffectPercentOf</code> | 基準値×amountを切上げて効果量にする。直接割合設定の2種には使用しない。 |
| <code>ratioBase</code> | 任意 | <code>EpRatioBase</code> | setEpRatio/setEpReserveRatio専用。省略時playerMaxEp。選択した基準値×amountを切捨て、繰返し時は毎回再取得。 |
| <code>status</code> | 任意 | <code>StatusEffect</code> | statuses.ts / STATUS_DESCRIPTIONS（StatusEffect）。status時必須。removeStatusの解除対象、部位別追加カードの原因状態にも使用。 |
| <code>statusGroup</code> | 任意 | <code>string</code> | removeStatus用: 状態定義のexclusiveGroupに一致する状態をまとめて解除。 |
| <code>stacks</code> | 任意 | <code>number</code> | status用: 正の整数。省略時は計算済みamountを付与数とする。 |
| <code>attackAttribute</code> | 任意 | <code>AttackAttribute</code> | types.ts / AttackAttribute → DAMAGE_SPRITE_EFFECTS。攻撃演出の属性。strike/slash/slice/love/mucus/aphrodisiacMucus。 |
| <code>epDamageParts</code> | 任意 | <code>EpDamagePart[]</code> | types.ts / EP_DAMAGE_PARTS。EP攻撃の部位: A/B/C/V/M。複数指定可。 |
| <code>epDamagePartRules</code> | 任意 | <code>オブジェクト配列（下位項目参照）</code> | 最初に条件が一致した部位を使用。未一致なら通常の部位設定を使用。 |
| <code>epDamagePartRules[].conditions</code> | 親を設定時必須 | <code>ConditionDefinition[]</code> | ConditionDefinition[]（AND） |
| <code>epDamagePartRules[].parts</code> | 親を設定時必須 | <code>EpDamagePart[]</code> | types.ts / EP_DAMAGE_PARTS |
| <code>epDamagePartMode</code> | 任意 | <code>EpDamagePartMode</code> | static=指定部位 / actorIntruded=実行主体の侵入部位 / lastPlayerEpDamageParts=直前の被EP攻撃部位。 |
| <code>cardId</code> | 任意 | <code>string</code> | cards.ts / CARD_DEFINITIONSのキー。addCardToHand時必須: CARD_DEFINITIONSの登録キー。 |
| <code>cardAddVariant</code> | 任意 | <code>CardAddVariant</code> | addCardToHand用: default=通常 / *ForStatusOwner=原因状態に合わせて除去カードを生成。 |
| <code>perStack</code> | 任意 | <code>boolean</code> | 状態triggerからの実行時、計算済み効果量×statusStacks。直接割合設定・ドロー・手札追加には使用しない。 |
| <code>onlyDuringPlayerTurn</code> | 任意 | <code>boolean</code> | trueならプレイヤーターン中のみ実行。省略時は制限なし。 |
| <code>chance</code> | 任意 | <code>number</code> | 0～1（1=100%）。省略時は必ず実行。ドロー・手札追加には使用しない。 |
| <code>chancePerStack</code> | 任意 | <code>boolean</code> | trueなら発動元状態の各スタックで独立抽選した「1回以上成功」の確率を使用。chance必須、効果は1回だけ実行。 |
| <code>chanceBonusStatus</code> | 任意 | <code>StatusEffect</code> | StatusEffect。chance指定時、確率にスタック補正を加える状態。 |
| <code>chanceBonusTarget</code> | 任意 | <code>ConditionTarget</code> | 補正スタックを読む対象。省略時player。 |
| <code>chanceBonusPerStack</code> | 任意 | <code>number</code> | chanceへの1スタック当たり加算（負数可）。最終確率は0～1に制限。 |
| <code>randomAmount</code> | 任意 | <code>オブジェクト（下位項目参照）</code> |  |
| <code>randomAmount.min</code> | 親を設定時必須 | <code>number</code> | 最小値を含む（切上げ）。通常0以上、energyGainは負数可。 |
| <code>randomAmount.max</code> | 親を設定時必須 | <code>number</code> | 最大値を含む（切上げ）。min以上。 |
| <code>flavors</code> | 任意 | <code>BattleFlavorSet</code> | types.ts / FLAVOR_EVENTS → BattleFlavorSet。effect.trigger/chanceSuccess/chanceFailure/randomAmount*等の文章。ドロー・手札追加は共通フレーバーを使用。 |

## RelicTriggerDefinition

定義: [src/models/types.ts](../../src/models/types.ts) ／ [使い方](effects.md)

関連する型: [EffectTiming](reference-types.md#effecttiming) / [EffectDefinition](reference-types.md#effectdefinition) / [ConditionDefinition](reference-types.md#conditiondefinition) / [BattleFlavorSet](reference-types.md#battleflavorset)

| 項目 | 必須／任意 | 型・選択肢 | 参照・注意 |
| --- | --- | --- | --- |
| <code>orgasmInterval</code> | 任意 | <code>number</code> | playerOrgasm用。ラン累計絶頂回数がこの正整数の倍数を通過するごとに発動。 |
| <code>orgasmPhase</code> | 任意 | <code>'damage'</code> | playerOrgasmの敵EP攻撃用。自分の絶頂 HPダメージと同時、連続省略分は各回の補正後の量を合算。 |
| <code>timing</code> | 必須 | <code>EffectTiming</code> | types.ts / EFFECT_TIMINGS（所有者別の対応は効果章） |
| <code>effects</code> | 必須 | <code>EffectDefinition[]</code> |  |
| <code>conditions</code> | 任意 | <code>ConditionDefinition[]</code> | ConditionDefinition[]（AND） |
| <code>chance</code> | 任意 | <code>number</code> |  |
| <code>flavors</code> | 任意 | <code>BattleFlavorSet</code> | types.ts / FLAVOR_EVENTS → BattleFlavorSet |

## EnemyReactionRule

定義: [src/models/types.ts](../../src/models/types.ts) ／ [使い方](combatants.md)

関連する型: [EnemyReactionTrigger](reference-types.md#enemyreactiontrigger) / [EffectDefinition](reference-types.md#effectdefinition) / [EnemyReactionVariant](reference-types.md#enemyreactionvariant) / [ConditionDefinition](reference-types.md#conditiondefinition) / [EnemyReactionTiming](reference-types.md#enemyreactiontiming) / [BattleFlavorSet](reference-types.md#battleflavorset)

| 項目 | 必須／任意 | 型・選択肢 | 参照・注意 |
| --- | --- | --- | --- |
| <code>id</code> | 必須 | <code>string</code> |  |
| <code>trigger</code> | 必須 | <code>EnemyReactionTrigger</code> |  |
| <code>effects</code> | 任意 | <code>EffectDefinition[]</code> |  |
| <code>variants</code> | 任意 | <code>EnemyReactionVariant[]</code> |  |
| <code>conditions</code> | 任意 | <code>ConditionDefinition[]</code> | ConditionDefinition[]（AND） |
| <code>priority</code> | 任意 | <code>number</code> |  |
| <code>timing</code> | 任意 | <code>EnemyReactionTiming</code> | types.ts / EFFECT_TIMINGS（所有者別の対応は効果章） |
| <code>flavors</code> | 任意 | <code>BattleFlavorSet</code> | types.ts / FLAVOR_EVENTS → BattleFlavorSet |

## EnemyReactionVariant

定義: [src/models/types.ts](../../src/models/types.ts) ／ [使い方](combatants.md)

関連する型: [EffectDefinition](reference-types.md#effectdefinition) / [ConditionDefinition](reference-types.md#conditiondefinition) / [BattleFlavorSet](reference-types.md#battleflavorset)

| 項目 | 必須／任意 | 型・選択肢 | 参照・注意 |
| --- | --- | --- | --- |
| <code>id</code> | 必須 | <code>string</code> |  |
| <code>effects</code> | 必須 | <code>EffectDefinition[]</code> |  |
| <code>conditions</code> | 任意 | <code>ConditionDefinition[]</code> | ConditionDefinition[]（AND） |
| <code>flavors</code> | 任意 | <code>BattleFlavorSet</code> | types.ts / FLAVOR_EVENTS → BattleFlavorSet |

## EnemyReactionTrigger

定義: [src/models/types.ts](../../src/models/types.ts) ／ [使い方](combatants.md)

関連する型: [EpDamagePart](reference-types.md#epdamagepart) / [CardCategory](reference-types.md#cardcategory)

| 項目 | 必須／任意 | 型・選択肢 | 参照・注意 |
| --- | --- | --- | --- |
| <code>kind</code> | 必須 | <code>'playerSelfEpDamage'</code> |  |
| <code>parts</code> | 任意 | <code>EpDamagePart[]</code> | types.ts / EP_DAMAGE_PARTS |
| <code>minBaseAmount</code> | 任意 | <code>number</code> |  |
| <code>cardIds</code> | 任意 | <code>string[]</code> | カード登録キー（ドロー前追加）／定義内id（反応条件） |
| <code>categories</code> | 任意 | <code>CardCategory[]</code> | types.ts / CardCategory |

## EnemyReactionTiming

定義: [src/models/types.ts](../../src/models/types.ts) ／ [使い方](combatants.md)

<code>'beforePlayerSelfEpDamage' &#124; 'afterPlayerSelfEpDamage'</code>

## StatusModifierDefinition

定義: [src/models/types.ts](../../src/models/types.ts) ／ [使い方](effects.md)

関連する型: [StatusModifierKind](reference-types.md#statusmodifierkind) / [EffectTarget](reference-types.md#effecttarget)

| 項目 | 必須／任意 | 型・選択肢 | 参照・注意 |
| --- | --- | --- | --- |
| <code>kind</code> | 必須 | <code>StatusModifierKind</code> |  |
| <code>amount</code> | 必須 | <code>number</code> |  |
| <code>target</code> | 必須 | <code>EffectTarget &#124; 'statusOwner'</code> | statusOwnerなら状態を所持する側へ適用。EP被ダメージ倍率はプレイヤー・敵共通の1値で設定。 |

## StatusTriggerDefinition

定義: [src/models/types.ts](../../src/models/types.ts) ／ [使い方](effects.md)

関連する型: [EffectTiming](reference-types.md#effecttiming) / [EffectDefinition](reference-types.md#effectdefinition) / [StatusModifierDefinition](reference-types.md#statusmodifierdefinition) / [StatusVisualKey](reference-types.md#statusvisualkey) / [PortraitEvent](reference-types.md#portraitevent) / [StatusConsumeRule](reference-types.md#statusconsumerule) / [ConditionDefinition](reference-types.md#conditiondefinition) / [BattleFlavorSet](reference-types.md#battleflavorset)

| 項目 | 必須／任意 | 型・選択肢 | 参照・注意 |
| --- | --- | --- | --- |
| <code>timing</code> | 必須 | <code>EffectTiming</code> | types.ts / EFFECT_TIMINGS（所有者別の対応は効果章） |
| <code>effects</code> | 必須 | <code>EffectDefinition[]</code> |  |
| <code>modifiers</code> | 任意 | <code>StatusModifierDefinition[]</code> |  |
| <code>visuals</code> | 任意 | <code>StatusVisualKey[]</code> | types.ts / StatusVisualKey |
| <code>portraitEvent</code> | 任意 | <code>PortraitEvent</code> | types.ts / PortraitEvent → portraitFactors.ts。プレイヤーのトリガー処理開始から消費・全反復演出の完了まで有効な立ち絵要因。 |
| <code>consumeRule</code> | 任意 | <code>StatusConsumeRule</code> | none=消費なし / one=1消費 / allWhileEnergy=エナジーが残る間、まとめて消費しeffectsを反復。 |
| <code>stacksPerEnergy</code> | 任意 | <code>number</code> | allWhileEnergy用: 1回に消費するスタック数（1以上の整数、既定1）。端数も消費して1回実行。 |
| <code>initialFreeStacks</code> | 任意 | <code>number</code> | allWhileEnergy用: 反復前にエナジー・effects消費なしで減らす数（非負整数、既定0）。エナジー0でも実行。 |
| <code>initialVisuals</code> | 任意 | <code>StatusVisualKey[]</code> | initialFreeStacksを実際に消費した時だけ再生する演出。省略時なし。 |
| <code>conditions</code> | 任意 | <code>ConditionDefinition[]</code> | ConditionDefinition[]（AND）。全条件が成立した場合のみ実行（AND）。省略/空配列は無条件。 |
| <code>chance</code> | 任意 | <code>number</code> |  |
| <code>order</code> | 任意 | <code>number</code> |  |
| <code>flavors</code> | 任意 | <code>BattleFlavorSet</code> | types.ts / FLAVOR_EVENTS → BattleFlavorSet |

## StatusDefinition

定義: [src/models/types.ts](../../src/models/types.ts) ／ [使い方](combatants.md)

関連する型: [StatusEffect](reference-types.md#statuseffect) / [LocalizedText](reference-types.md#localizedtext) / [StatusOwner](reference-types.md#statusowner) / [ConditionDefinition](reference-types.md#conditiondefinition) / [EpDamagePart](reference-types.md#epdamagepart) / [StatusTriggerDefinition](reference-types.md#statustriggerdefinition) / [EnemyTrait](reference-types.md#enemytrait) / [BattleLogKind](reference-types.md#battlelogkind) / [StatusNoticeLevel](reference-types.md#statusnoticelevel) / [BattleFlavorSet](reference-types.md#battleflavorset)

| 項目 | 必須／任意 | 型・選択肢 | 参照・注意 |
| --- | --- | --- | --- |
| <code>preventEnergyRecovery</code> | 任意 | <code>boolean</code> | 正のエナジー回復を全て阻止する。 |
| <code>turnStartEnergy</code> | 任意 | <code>number</code> | ターン開始時の回復先エナジーの上限。 |
| <code>preventTurnStartDraw</code> | 任意 | <code>boolean</code> | ターン開始時の通常ドローのみ阻止（カード追加・効果ドローは対象外）。 |
| <code>receivedEpDamage</code> | 任意 | <code>number</code> | 正の被EPダメージを固定。敵予告は変更しない。手札のEP自傷予測は反映。 |
| <code>removeAboveHpRatio</code> | 任意 | <code>number</code> | HP/最大HPがこの値を超えた時に解除。 |
| <code>hpDrainProgress</code> | 任意 | <code>オブジェクト（下位項目参照）</code> | 正のHPドレインの実行回数で変化・解除。回復量が0でも吸収成功なら数える。 |
| <code>hpDrainProgress.count</code> | 親を設定時必須 | <code>number</code> |  |
| <code>hpDrainProgress.nextStatus</code> | 任意 | <code>StatusEffect</code> | statuses.ts / STATUS_DESCRIPTIONS |
| <code>name</code> | 必須 | <code>LocalizedText</code> | LocalizedText（l(en, ja)） |
| <code>description</code> | 必須 | <code>LocalizedText</code> | LocalizedText（l(en, ja)） |
| <code>descriptionsByOwner</code> | 任意 | <code>Partial&lt;Record&lt;StatusOwner, LocalizedText&gt;&gt;</code> | 所有者別のTips本文。player/enemyを指定し、省略側はdescriptionを使用。 |
| <code>remain</code> | 必須 | <code>0 &#124; 1</code> |  |
| <code>consumeEachTurn</code> | 必須 | <code>0 &#124; 1</code> |  |
| <code>allowedOwners</code> | 必須 | <code>StatusOwner[]</code> |  |
| <code>applyConditions</code> | 任意 | <code>ConditionDefinition[]</code> | ConditionDefinition[]（AND） |
| <code>epDamageParts</code> | 任意 | <code>EpDamagePart[]</code> | types.ts / EP_DAMAGE_PARTS |
| <code>triggers</code> | 必須 | <code>StatusTriggerDefinition[]</code> |  |
| <code>iconImage</code> | 任意 | <code>StatusEffect</code> | 任意。画像を共有する状態異常ID（拡張子不要）。省略時は自身のID.png。参照の連鎖可、循環不可。 |
| <code>iconText</code> | 任意 | <code>LocalizedText</code> | 画像未配置・読込失敗時の代替文字。文字列または日英テキスト。 |
| <code>iconColor</code> | 任意 | <code>number</code> | 画像未配置・読込失敗時の代替背景色。 |
| <code>exclusiveGroup</code> | 任意 | <code>string</code> |  |
| <code>groupRank</code> | 任意 | <code>number</code> |  |
| <code>singleStack</code> | 任意 | <code>boolean</code> |  |
| <code>durationTurns</code> | 任意 | <code>number</code> | 固定持続ターン数（1以上）。再付与で残り時間を更新し、重複加算しない。 |
| <code>requiresEp</code> | 任意 | <code>boolean</code> | trueなら最大EPが0以下の対象に付与不可。 |
| <code>blockedEnemyTraits</code> | 任意 | <code>EnemyTrait[]</code> | EnemyTrait。いずれかの性質を持つ敵には付与不可。プレイヤーには適用しない。 |
| <code>preventTurnStartEpRecovery</code> | 任意 | <code>boolean</code> | プレイヤーのターン開始時のEP自然減少を止める。 |
| <code>trackActiveTurns</code> | 任意 | <code>boolean</code> | 有効だったプレイヤーターン数をラン全体で記録する。 |
| <code>idleOrgasmsRule</code> | 任意 | <code>オブジェクト（下位項目参照）</code> | 直前の指定ターン数に絶頂がない場合、開始時に状態を付与。 |
| <code>idleOrgasmsRule.turns</code> | 親を設定時必須 | <code>number</code> |  |
| <code>idleOrgasmsRule.status</code> | 親を設定時必須 | <code>StatusEffect</code> | statuses.ts / STATUS_DESCRIPTIONS（StatusEffect） |
| <code>idleOrgasmsRule.stacks</code> | 親を設定時必須 | <code>number</code> |  |
| <code>spreadRule</code> | 任意 | <code>オブジェクト（下位項目参照）</code> |  |
| <code>spreadRule.appliedStatuses</code> | 任意 | <code>StatusEffect[]</code> | プレイヤー所持中、この状態が敵へ付与されたら同じ状態を伝播。 |
| <code>spreadRule.cardSelfEpDamageParts</code> | 任意 | <code>EpDamagePart[]</code> | この部位への正のEP自傷カード効果で伝播。補正後0でも対象。 |
| <code>spreadRule.cardTarget</code> | 任意 | <code>'selectedEnemy' &#124; 'cardDamagedEnemies' &#124; 'allEnemies' &#124; 'connectedEnemies'</code> | カードによる伝播先。省略時はカード解決対象の敵。 |
| <code>blockedFlavorKinds</code> | 任意 | <code>BattleLogKind[]</code> |  |
| <code>noticeLevel</code> | 任意 | <code>StatusNoticeLevel</code> |  |
| <code>flavors</code> | 任意 | <code>BattleFlavorSet</code> | types.ts / FLAVOR_EVENTS → BattleFlavorSet |

## CardTextSection

定義: [src/models/types.ts](../../src/models/types.ts) ／ [使い方](cards.md)

<code>'description' &#124; 'conditions' &#124; 'effects' &#124; 'categories' &#124; 'vanish' &#124; 'temporary'</code>

## CardTextOrder

定義: [src/models/types.ts](../../src/models/types.ts) ／ [使い方](cards.md)

関連する型: [CardTextSection](reference-types.md#cardtextsection)

<code>CardTextSection &#124; &#96;effect.${string}&#96;</code>

## EnemyDeathNarration

定義: [src/models/types.ts](../../src/models/types.ts) ／ [使い方](combatants.md)

関連する型: [EnemyDeathCause](reference-types.md#enemydeathcause) / [LocalizedText](reference-types.md#localizedtext) / [StatusEffect](reference-types.md#statuseffect)

| 項目 | 必須／任意 | 型・選択肢 | 参照・注意 |
| --- | --- | --- | --- |
| <code>cause</code> | 必須 | <code>EnemyDeathCause</code> |  |
| <code>text</code> | 必須 | <code>LocalizedText</code> | LocalizedText（l(en, ja)） |
| <code>requiredStatuses</code> | 任意 | <code>StatusEffect[]</code> | StatusEffect[] |
| <code>intentIds</code> | 任意 | <code>string[]</code> | 同じ敵の行動定義id |

## EnemySpriteRule

定義: [src/models/types.ts](../../src/models/types.ts) ／ [使い方](assets.md)

関連する型: [ConditionDefinition](reference-types.md#conditiondefinition)

| 項目 | 必須／任意 | 型・選択肢 | 参照・注意 |
| --- | --- | --- | --- |
| <code>sprite</code> | 必須 | <code>string</code> | enemySprites.ts / ENEMY_SPRITESのキー |
| <code>conditions</code> | 任意 | <code>ConditionDefinition[]</code> | ConditionDefinition[]（AND） |
| <code>intentIds</code> | 任意 | <code>string[]</code> | 同じ敵の行動定義id |

## CharacterPortraitPlacement

定義: [src/models/types.ts](../../src/models/types.ts) ／ [使い方](assets.md)

| 項目 | 必須／任意 | 型・選択肢 | 参照・注意 |
| --- | --- | --- | --- |
| <code>displayHeight</code> | 必須 | <code>number</code> | 倍率1での高さ。幅は画像の比率から計算。 |
| <code>offsetX</code> | 任意 | <code>number</code> |  |
| <code>offsetY</code> | 任意 | <code>number</code> |  |

## PortraitEvent

定義: [src/models/types.ts](../../src/models/types.ts) ／ [使い方](assets.md)

<code>'HPdamage' &#124; 'EPdamage' &#124; 'orgasm' &#124; 'AftershockBreath'</code>

## PortraitInteraction

定義: [src/models/types.ts](../../src/models/types.ts) ／ [使い方](assets.md)

<code>'hover'</code>

## PortraitPercentStat

定義: [src/models/types.ts](../../src/models/types.ts) ／ [使い方](assets.md)

<code>'HP' &#124; 'EP'</code>

## PortraitState

定義: [src/models/types.ts](../../src/models/types.ts) ／ [使い方](assets.md)

<code>'Death'</code>

## PortraitConnection

定義: [src/models/types.ts](../../src/models/types.ts) ／ [使い方](assets.md)

<code>'hasInserted' &#124; 'hasIntruded'</code>

## PortraitFactorRules

定義: [src/models/types.ts](../../src/models/types.ts) ／ [使い方](assets.md)

関連する型: [PortraitState](reference-types.md#portraitstate) / [StatusEffect](reference-types.md#statuseffect) / [StatusApplication](reference-types.md#statusapplication) / [PortraitConnection](reference-types.md#portraitconnection) / [PortraitEvent](reference-types.md#portraitevent) / [PortraitPercentStat](reference-types.md#portraitpercentstat) / [PortraitInteraction](reference-types.md#portraitinteraction)

| 項目 | 必須／任意 | 型・選択肢 | 参照・注意 |
| --- | --- | --- | --- |
| <code>states</code> | 必須 | <code>PortraitState[]</code> | 基本状態。前ほど優先。 |
| <code>statuses</code> | 必須 | <code>StatusEffect[]</code> | StatusEffect。所有者別の初期状態はStatusApplication。前ほど優先。ファイル名で個数/残りターン数の閾値を指定可能。 |
| <code>connections</code> | 必須 | <code>PortraitConnection[]</code> | 敵全体の接続状態。前ほど優先。 |
| <code>relics</code> | 必須 | <code>string[]</code> | relics.tsのID。前ほど優先。 |
| <code>events</code> | 必須 | <code>PortraitEvent[]</code> | 前ほど優先。既定では絶頂をEPdamageより前に置く。 |
| <code>cards</code> | 必須 | <code>string[]</code> | cards.tsのID。そのターン最後に使ったカード。他カード使用または次ターン開始まで有効。 |
| <code>percentComparisons</code> | 必須 | <code>PortraitPercentStat[]</code> | 有効な割合比較対象。前ほど優先。 |
| <code>interactions</code> | 必須 | <code>PortraitInteraction[]</code> | マウス操作の要因。優先度はdata側の配列位置で指定。 |
| <code>ThresholdOrder</code> | 必須 | <code>'stricter' &#124; 'looser'</code> | 同じ要因・同方向の閾値が競合する場合の優先順。配列でない設定の記述位置は優先度に影響しない。 |

## SpriteDefinition

定義: [src/models/types.ts](../../src/models/types.ts) ／ [使い方](assets.md)

| 項目 | 必須／任意 | 型・選択肢 | 参照・注意 |
| --- | --- | --- | --- |
| <code>textureKey</code> | 必須 | <code>string</code> |  |
| <code>animationKey</code> | 必須 | <code>string</code> |  |
| <code>source</code> | 必須 | <code>string</code> |  |
| <code>frameWidth</code> | 必須 | <code>number</code> |  |
| <code>frameHeight</code> | 必須 | <code>number</code> |  |
| <code>frameCount</code> | 必須 | <code>number</code> |  |
| <code>frameRate</code> | 必須 | <code>number</code> |  |
| <code>repeat</code> | 任意 | <code>number</code> |  |
| <code>displayWidth</code> | 必須 | <code>number</code> |  |
| <code>displayHeight</code> | 必須 | <code>number</code> |  |

## EnemySpriteDefinition

定義: [src/models/types.ts](../../src/models/types.ts) ／ [使い方](assets.md)

関連する型: [SpriteDefinition](reference-types.md#spritedefinition)

継承元の項目も必要: <code>extends SpriteDefinition</code>

| 項目 | 必須／任意 | 型・選択肢 | 参照・注意 |
| --- | --- | --- | --- |
| <code>bodyOffsetY</code> | 任意 | <code>number</code> |  |
| <code>attackAnimationTimeScale</code> | 任意 | <code>number</code> |  |
| <code>opaqueBounds</code> | 必須 | <code>オブジェクト（下位項目参照）</code> |  |
| <code>opaqueBounds.left</code> | 親を設定時必須 | <code>number</code> |  |
| <code>opaqueBounds.right</code> | 親を設定時必須 | <code>number</code> |  |
| <code>opaqueBounds.top</code> | 親を設定時必須 | <code>number</code> |  |
| <code>opaqueBounds.bottom</code> | 親を設定時必須 | <code>number</code> |  |

## SpriteEffectDefinition

定義: [src/models/types.ts](../../src/models/types.ts) ／ [使い方](assets.md)

| 項目 | 必須／任意 | 型・選択肢 | 参照・注意 |
| --- | --- | --- | --- |
| <code>spriteIds</code> | 必須 | <code>string[]</code> | sprites.ts / EFFECT_SPRITESのキー |
| <code>depth</code> | 必須 | <code>number</code> |  |
| <code>alpha</code> | 必須 | <code>number</code> |  |
| <code>finish</code> | 必須 | <code>オブジェクト（下位項目参照）</code> |  |
| <code>finish.duration</code> | 親を設定時必須 | <code>number</code> |  |
| <code>finish.scaleMultiplier</code> | 親を設定時必須 | <code>number</code> |  |
| <code>finish.alpha</code> | 親を設定時必須 | <code>number</code> |  |
| <code>finish.ease</code> | 親を設定時必須 | <code>string</code> |  |
| <code>count</code> | 任意 | <code>オブジェクト（下位項目参照）</code> |  |
| <code>count.amountPerSprite</code> | 親を設定時必須 | <code>number</code> |  |
| <code>count.max</code> | 親を設定時必須 | <code>number</code> |  |
| <code>scatter</code> | 任意 | <code>オブジェクト（下位項目参照）</code> |  |
| <code>scatter.x</code> | 親を設定時必須 | <code>number</code> |  |
| <code>scatter.y</code> | 親を設定時必須 | <code>number</code> |  |
| <code>motion</code> | 任意 | <code>オブジェクト（下位項目参照）</code> |  |
| <code>motion.distanceRatio</code> | 親を設定時必須 | <code>number</code> |  |
| <code>motion.verticalRatio</code> | 親を設定時必須 | <code>number</code> |  |
| <code>motion.duration</code> | 親を設定時必須 | <code>number</code> |  |
| <code>motion.ease</code> | 親を設定時必須 | <code>string</code> |  |

## EnemyDefinition

定義: [src/models/types.ts](../../src/models/types.ts) ／ [使い方](combatants.md)

関連する型: [LocalizedText](reference-types.md#localizedtext) / [EnemySpriteRule](reference-types.md#enemyspriterule) / [EnemyTrait](reference-types.md#enemytrait) / [StatusEffect](reference-types.md#statuseffect) / [StatusTriggerDefinition](reference-types.md#statustriggerdefinition) / [EnemyReactionRule](reference-types.md#enemyreactionrule) / [ConditionDefinition](reference-types.md#conditiondefinition) / [EnemyDeathNarration](reference-types.md#enemydeathnarration)

| 項目 | 必須／任意 | 型・選択肢 | 参照・注意 |
| --- | --- | --- | --- |
| <code>id</code> | 必須 | <code>string</code> |  |
| <code>name</code> | 必須 | <code>LocalizedText</code> | LocalizedText（l(en, ja)） |
| <code>maxHp</code> | 必須 | <code>number</code> |  |
| <code>maxEp</code> | 必須 | <code>number</code> |  |
| <code>stages</code> | 必須 | <code>number[]</code> |  |
| <code>threat</code> | 必須 | <code>number</code> |  |
| <code>isGiant</code> | 任意 | <code>boolean</code> |  |
| <code>sprite</code> | 任意 | <code>string</code> | enemySprites.ts / ENEMY_SPRITESのキー |
| <code>spriteRules</code> | 任意 | <code>EnemySpriteRule[]</code> |  |
| <code>traits</code> | 任意 | <code>EnemyTrait[]</code> |  |
| <code>intrusionPart</code> | 任意 | <code>LocalizedText</code> |  |
| <code>statusTriggers</code> | 任意 | <code>Partial&lt;Record&lt;StatusEffect, StatusTriggerDefinition[]&gt;&gt;</code> |  |
| <code>reactionRules</code> | 任意 | <code>EnemyReactionRule[]</code> |  |
| <code>intentEConditions</code> | 必須 | <code>ConditionDefinition[]</code> |  |
| <code>intentBConditions</code> | 任意 | <code>ConditionDefinition[]</code> |  |
| <code>intents</code> | 必須 | <code>EnemyIntent[]</code> |  |
| <code>intents_E</code> | 必須 | <code>EnemyIntent[]</code> |  |
| <code>intents_B</code> | 任意 | <code>EnemyIntent[]</code> |  |
| <code>deathNarrations</code> | 任意 | <code>EnemyDeathNarration[]</code> |  |

## PlayerDefinition

定義: [src/models/types.ts](../../src/models/types.ts) ／ [使い方](combatants.md)

関連する型: [EpDamagePart](reference-types.md#epdamagepart) / [LocalizedText](reference-types.md#localizedtext)

| 項目 | 必須／任意 | 型・選択肢 | 参照・注意 |
| --- | --- | --- | --- |
| <code>initialEpProgress</code> | 任意 | <code>Record&lt;EpDamagePart, { epDamage: number; orgasmCount: number; }&gt;</code> |  |
| <code>id</code> | 必須 | <code>string</code> |  |
| <code>name</code> | 必須 | <code>LocalizedText</code> | LocalizedText（l(en, ja)） |
| <code>maxHp</code> | 必須 | <code>number</code> |  |
| <code>maxEp</code> | 必須 | <code>number</code> |  |
| <code>maxEnergy</code> | 必須 | <code>number</code> |  |
| <code>relics</code> | 必須 | <code>string[]</code> |  |
| <code>startingDeckIds</code> | 必須 | <code>string[]</code> | cards.ts / CARD_DEFINITIONSのキー |

## LocalizedText

定義: [src/models/localization.ts](../../src/models/localization.ts) ／ [使い方](effects.md)

<code>string &#124; { en: string; ja: string; }</code>

## BattleBackgroundConfig

定義: [src/data/battlePresentation.ts](../../src/data/battlePresentation.ts) ／ [使い方](presentation.md)

| 項目 | 必須／任意 | 型・選択肢 | 参照・注意 |
| --- | --- | --- | --- |
| <code>fallback</code> | 必須 | <code>string</code> | image/background内のファイル名。未設定のステージで使用。 |
| <code>stages</code> | 必須 | <code>Record&lt;number, string&gt;</code> | ステージ番号 → 背景ファイル名。 |
| <code>events</code> | 必須 | <code>Record&lt;string, string&gt;</code> | イベント戦闘ID → 背景ファイル名。ステージ設定より優先。 |

## BattleEntranceConfig

定義: [src/data/battlePresentation.ts](../../src/data/battlePresentation.ts) ／ [使い方](presentation.md)

| 項目 | 必須／任意 | 型・選択肢 | 参照・注意 |
| --- | --- | --- | --- |
| <code>playerDuration</code> | 必須 | <code>number</code> | 横方向に1回転しながらフェードインする時間ms。0で即時。 |
| <code>enemyDuration</code> | 必須 | <code>number</code> | 敵1体を下から描画する時間ms。0で即時。 |
| <code>nextEnemyProgress</code> | 必須 | <code>number</code> | 前の敵がこの割合まで現れたら次を開始。0〜1。 |
| <code>enemyOrder</code> | 必須 | <code>Record&lt;number, number[]&gt;</code> | 敵数 → 左から数えた0始まりの登場順。未設定は左から順。 |

## BodyPartAlias

定義: [src/data/bodyParts.ts](../../src/data/bodyParts.ts) ／ [使い方](effects.md)

<code>typeof BODY_PART_ALIASES[number]</code>

## BodyPartToken

定義: [src/data/bodyParts.ts](../../src/data/bodyParts.ts) ／ [使い方](effects.md)

<code>typeof BODY_PART_TOKENS[number]</code>

## BodyPartNameLevel

定義: [src/data/bodyParts.ts](../../src/data/bodyParts.ts) ／ [使い方](effects.md)

<code>0 &#124; 1 &#124; 2 &#124; 3 &#124; 4 &#124; 5</code>

## BodyPartNameConfig

定義: [src/data/bodyParts.ts](../../src/data/bodyParts.ts) ／ [使い方](effects.md)

関連する型: [BodyPartToken](reference-types.md#bodyparttoken) / [BodyPartNameLevel](reference-types.md#bodypartnamelevel) / [LocalizedText](reference-types.md#localizedtext)

| 項目 | 必須／任意 | 型・選択肢 | 参照・注意 |
| --- | --- | --- | --- |
| <code>part</code> | 必須 | <code>BodyPartToken</code> |  |
| <code>names</code> | 必須 | <code>Record&lt;BodyPartNameLevel, LocalizedText&gt;</code> |  |

## BodyPartDefaultNameConfig

定義: [src/data/bodyParts.ts](../../src/data/bodyParts.ts) ／ [使い方](effects.md)

関連する型: [BodyPartToken](reference-types.md#bodyparttoken) / [LocalizedText](reference-types.md#localizedtext)

| 項目 | 必須／任意 | 型・選択肢 | 参照・注意 |
| --- | --- | --- | --- |
| <code>part</code> | 必須 | <code>BodyPartToken</code> |  |
| <code>name</code> | 必須 | <code>LocalizedText</code> | LocalizedText（l(en, ja)） |

## CardArtwork

定義: [src/data/cardAppearance.ts](../../src/data/cardAppearance.ts) ／ [使い方](assets.md)

| 項目 | 必須／任意 | 型・選択肢 | 参照・注意 |
| --- | --- | --- | --- |
| <code>focusX</code> | 任意 | <code>number</code> | カード中心に合わせる元画像のX座標px。省略時は画像中央。 |
| <code>focusY</code> | 任意 | <code>number</code> | カード中心に合わせる元画像のY座標px。省略時は画像中央。 |
| <code>scale</code> | 任意 | <code>number</code> | 元画像1pxをカード等倍時の何pxで描くか。正の値。省略時は領域を覆う倍率。 |
| <code>offsetX</code> | 任意 | <code>number</code> | カード中心からの位置補正px。省略時0、右が正。 |
| <code>offsetY</code> | 任意 | <code>number</code> | カード中心からの位置補正px。省略時0、下が正。 |
| <code>rotation</code> | 任意 | <code>number</code> | 時計回りの角度（度）。focus位置を回転中心とする。省略時0。 |
| <code>edgeFade</code> | 任意 | <code>number</code> | 画像の端を透明にする幅。カード等倍時px。省略時CARD_FRAME.imageEdgeFade、0で無効。 |

## CardArtworkSet

定義: [src/data/cardAppearance.ts](../../src/data/cardAppearance.ts) ／ [使い方](assets.md)

関連する型: [CardArtwork](reference-types.md#cardartwork)

<code>Record&lt;string, CardArtwork&gt;</code>

## CardArtworkEntry

定義: [src/data/cardAppearance.ts](../../src/data/cardAppearance.ts) ／ [使い方](assets.md)

関連する型: [CardArtworkSet](reference-types.md#cardartworkset)

<code>CardArtworkSet &#124; string</code>

## CardRarityFinish

定義: [src/data/cardAppearance.ts](../../src/data/cardAppearance.ts) ／ [使い方](assets.md)

| 項目 | 必須／任意 | 型・選択肢 | 参照・注意 |
| --- | --- | --- | --- |
| <code>base</code> | 必須 | <code>number</code> | 0xRRGGBB。 |
| <code>shadow</code> | 必須 | <code>number</code> | 暗い部分。0xRRGGBB。 |
| <code>highlight</code> | 必須 | <code>number</code> | 光沢部分。0xRRGGBB。同色にすると単色になる。 |

## ColoredCardCategory

定義: [src/data/cardCategories.ts](../../src/data/cardCategories.ts) ／ [使い方](cards.md)

関連する型: [CardCategory](reference-types.md#cardcategory)

<code>Exclude&lt;CardCategory, 'noMotion'&gt;</code>

## ConversationDesign

定義: [src/data/conversationAppearance.ts](../../src/data/conversationAppearance.ts) ／ [使い方](presentation.md)

<code>'graphite' &#124; 'paper' &#124; 'night'</code>

## ConversationTheme

定義: [src/data/conversationAppearance.ts](../../src/data/conversationAppearance.ts) ／ [使い方](presentation.md)

関連する型: [LocalizedText](reference-types.md#localizedtext)

| 項目 | 必須／任意 | 型・選択肢 | 参照・注意 |
| --- | --- | --- | --- |
| <code>name</code> | 必須 | <code>LocalizedText</code> | LocalizedText（l(en, ja)） |
| <code>surface</code> | 必須 | <code>number</code> |  |
| <code>accent</code> | 必須 | <code>number</code> |  |
| <code>progressColor</code> | 必須 | <code>number</code> | オート経過バーの色。 |
| <code>ink</code> | 必須 | <code>オブジェクト（下位項目参照）</code> |  |
| <code>ink.quote</code> | 親を設定時必須 | <code>string</code> |  |
| <code>ink.narration</code> | 親を設定時必須 | <code>string</code> |  |
| <code>ink.user</code> | 親を設定時必須 | <code>string</code> |  |
| <code>outline</code> | 必須 | <code>string</code> |  |

## ConversationBackgroundTransition

定義: [src/data/conversationTransitions.ts](../../src/data/conversationTransitions.ts) ／ [使い方](events.md)

| 項目 | 必須／任意 | 型・選択肢 | 参照・注意 |
| --- | --- | --- | --- |
| <code>type</code> | 必須 | <code>'radial' &#124; 'flash' &#124; 'pageTurn' &#124; 'fade' &#124; 'blink'</code> | 円形ぼかし／連続白フラッシュ／横ページめくり／黒暗転／まばたき。 |
| <code>duration</code> | 任意 | <code>number</code> | 演出全体の時間。0なら即時切り替え。 |
| <code>showText</code> | 任意 | <code>boolean</code> | 切り替え中も次ページのテキストを表示する。省略時true。 |
| <code>originX</code> | 任意 | <code>number</code> | radialの中心X。0=左端、1=右端。 |
| <code>originY</code> | 任意 | <code>number</code> | radialの中心Y。0=上端、1=下端。 |
| <code>feather</code> | 任意 | <code>number</code> | radialの円半径に対するぼかし幅（0〜0.9）。 |

## ConversationPage

定義: [src/data/conversations.ts](../../src/data/conversations.ts) ／ [使い方](events.md)

関連する型: [LocalizedText](reference-types.md#localizedtext) / [ConversationBackgroundTransition](reference-types.md#conversationbackgroundtransition)

| 項目 | 必須／任意 | 型・選択肢 | 参照・注意 |
| --- | --- | --- | --- |
| <code>text</code> | 必須 | <code>LocalizedText</code> | LocalizedText（l(en, ja)） |
| <code>speaker</code> | 必須 | <code>'quote' &#124; 'narration' &#124; 'user'</code> |  |
| <code>portrait</code> | 任意 | <code>string</code> | characterPortraits.ts / 拡張子なし画像ID（自動検出も可）。image/character内のファイル名（自動検出）、または登録ID。空欄は既存の立ち絵を制御しない。 |
| <code>backgroundDim</code> | 任意 | <code>number</code> | 背景の暗さ。0=通常、1=黒。省略時0。 |
| <code>background</code> | 任意 | <code>string</code> | image/からの相対パス。image内の相対ファイル名。空欄は表示なし。 |
| <code>backgroundTransition</code> | 任意 | <code>ConversationBackgroundTransition</code> | このページに進んだ時の背景演出。同じ画像でも実行する。初回・空欄では実行しない。 |

## NovelInputBinding

定義: [src/data/conversations.ts](../../src/data/conversations.ts) ／ [使い方](events.md)

| 項目 | 必須／任意 | 型・選択肢 | 参照・注意 |
| --- | --- | --- | --- |
| <code>keys</code> | 必須 | <code>string[]</code> | KeyboardEvent.code（例：KeyZ、Enter、Space）。 |
| <code>buttons</code> | 必須 | <code>number[]</code> | 0=左、1=中、2=右、3=戻る、4=進む。 |
| <code>wheel</code> | 必須 | <code>'up' &#124; 'down' &#124; 'none'</code> |  |

## NovelControls

定義: [src/data/conversations.ts](../../src/data/conversations.ts) ／ [使い方](events.md)

関連する型: [NovelInputBinding](reference-types.md#novelinputbinding)

| 項目 | 必須／任意 | 型・選択肢 | 参照・注意 |
| --- | --- | --- | --- |
| <code>advance</code> | 必須 | <code>NovelInputBinding</code> |  |
| <code>log</code> | 必須 | <code>NovelInputBinding</code> |  |
| <code>hide</code> | 必須 | <code>NovelInputBinding</code> |  |
| <code>skip</code> | 必須 | <code>オブジェクト（下位項目参照）</code> |  |
| <code>skip.keys</code> | 親を設定時必須 | <code>string[]</code> |  |
| <code>skip.intervalMs</code> | 親を設定時必須 | <code>number</code> |  |

## CardCategories

定義: [src/data/effectBuilders.ts](../../src/data/effectBuilders.ts) ／ [使い方](cards.md)

関連する型: [ColoredCardCategory](reference-types.md#coloredcardcategory) / [CardCategory](reference-types.md#cardcategory)

<code>readonly [ ColoredCardCategory, ...CardCategory[] ]</code>

## CardDefinitionInput

定義: [src/data/effectBuilders.ts](../../src/data/effectBuilders.ts) ／ [使い方](cards.md)

関連する型: [LocalizedText](reference-types.md#localizedtext) / [Rarity](reference-types.md#rarity) / [CardCategories](reference-types.md#cardcategories) / [CardCategory](reference-types.md#cardcategory) / [CardTextOrder](reference-types.md#cardtextorder) / [EffectDefinition](reference-types.md#effectdefinition) / [ConditionDefinition](reference-types.md#conditiondefinition) / [CardPlayCondition](reference-types.md#cardplaycondition) / [AttackAttribute](reference-types.md#attackattribute) / [StatusEffect](reference-types.md#statuseffect) / [CardDisplayNameRule](reference-types.md#carddisplaynamerule) / [BattleFlavorSet](reference-types.md#battleflavorset)

| 項目 | 必須／任意 | 型・選択肢 | 参照・注意 |
| --- | --- | --- | --- |
| <code>id</code> | 必須 | <code>string</code> |  |
| <code>name</code> | 必須 | <code>import("C:/Git/repos/SttS/src/models/localization").LocalizedText</code> | LocalizedText（l(en, ja)） |
| <code>rarity</code> | 必須 | <code>import("C:/Git/repos/SttS/src/models/types").Rarity</code> | types.ts / Rarity |
| <code>categories</code> | 必須 | <code>CardCategories</code> | types.ts / CardCategory |
| <code>cost</code> | 必須 | <code>number</code> |  |
| <code>description</code> | 任意 | <code>import("C:/Git/repos/SttS/src/models/localization").LocalizedText &#124; undefined</code> | LocalizedText（l(en, ja)） |
| <code>textOrder</code> | 任意 | <code>import("C:/Git/repos/SttS/src/models/types").CardTextOrder[] &#124; undefined</code> |  |
| <code>effects</code> | 必須 | <code>EffectDefinition[]</code> |  |
| <code>conditions</code> | 任意 | <code>ConditionDefinition[]</code> | ConditionDefinition[]（AND） |
| <code>playCondition</code> | 任意 | <code>import("C:/Git/repos/SttS/src/models/types").CardPlayCondition</code> |  |
| <code>vanish</code> | 任意 | <code>boolean</code> |  |
| <code>temporary</code> | 任意 | <code>boolean</code> |  |
| <code>attackAttribute</code> | 任意 | <code>AttackAttribute</code> | types.ts / AttackAttribute → DAMAGE_SPRITE_EFFECTS |
| <code>relatedEnemyName</code> | 任意 | <code>import("C:/Git/repos/SttS/src/models/localization").LocalizedText &#124; undefined</code> |  |
| <code>relatedIntrusionPart</code> | 任意 | <code>import("C:/Git/repos/SttS/src/models/localization").LocalizedText &#124; undefined</code> |  |
| <code>purgeTargetName</code> | 任意 | <code>string</code> |  |
| <code>purgeStatus</code> | 任意 | <code>StatusEffect</code> | StatusEffect（生成した除去カードの原因） |
| <code>displayNameRules</code> | 任意 | <code>CardDisplayNameRule[]</code> |  |
| <code>flavors</code> | 任意 | <code>BattleFlavorSet</code> | types.ts / FLAVOR_EVENTS → BattleFlavorSet |

## EnemyIntentInput

定義: [src/data/effectBuilders.ts](../../src/data/effectBuilders.ts) ／ [使い方](combatants.md)

関連する型: [LocalizedText](reference-types.md#localizedtext) / [EffectDefinition](reference-types.md#effectdefinition) / [ConditionDefinition](reference-types.md#conditiondefinition) / [StatusEffect](reference-types.md#statuseffect) / [AttackAttribute](reference-types.md#attackattribute) / [ConditionTarget](reference-types.md#conditiontarget) / [BattleFlavorSet](reference-types.md#battleflavorset)

| 項目 | 必須／任意 | 型・選択肢 | 参照・注意 |
| --- | --- | --- | --- |
| <code>id</code> | 任意 | <code>string</code> |  |
| <code>label</code> | 必須 | <code>import("C:/Git/repos/SttS/src/models/localization").LocalizedText</code> |  |
| <code>effects</code> | 必須 | <code>EffectDefinition[]</code> |  |
| <code>conditions</code> | 任意 | <code>ConditionDefinition[]</code> | ConditionDefinition[]（AND） |
| <code>timesLimit</code> | 任意 | <code>number</code> |  |
| <code>enemyStatusLimit</code> | 任意 | <code>StatusEffect[]</code> |  |
| <code>enemyStatusLimitN</code> | 任意 | <code>StatusEffect[]</code> |  |
| <code>attackAttribute</code> | 任意 | <code>AttackAttribute</code> | types.ts / AttackAttribute → DAMAGE_SPRITE_EFFECTS |
| <code>chance</code> | 任意 | <code>number</code> |  |
| <code>chanceBonusStatus</code> | 任意 | <code>StatusEffect</code> | StatusEffect |
| <code>chanceBonusTarget</code> | 任意 | <code>import("C:/Git/repos/SttS/src/models/types").ConditionTarget &#124; undefined</code> |  |
| <code>chanceBonusPerStack</code> | 任意 | <code>number</code> |  |
| <code>flavors</code> | 任意 | <code>BattleFlavorSet</code> | types.ts / FLAVOR_EVENTS → BattleFlavorSet |

## RelicDefinitionInput

定義: [src/data/effectBuilders.ts](../../src/data/effectBuilders.ts) ／ [使い方](combatants.md)

関連する型: [LocalizedText](reference-types.md#localizedtext) / [Rarity](reference-types.md#rarity) / [RelicTriggerDefinition](reference-types.md#relictriggerdefinition) / [StatusEffect](reference-types.md#statuseffect) / [BattleFlavorSet](reference-types.md#battleflavorset)

| 項目 | 必須／任意 | 型・選択肢 | 参照・注意 |
| --- | --- | --- | --- |
| <code>id</code> | 必須 | <code>string</code> |  |
| <code>iconImage</code> | 任意 | <code>string &#124; undefined</code> |  |
| <code>iconText</code> | 任意 | <code>import("C:/Git/repos/SttS/src/models/localization").LocalizedText &#124; undefined</code> |  |
| <code>iconColor</code> | 任意 | <code>number &#124; undefined</code> |  |
| <code>name</code> | 必須 | <code>import("C:/Git/repos/SttS/src/models/localization").LocalizedText</code> | LocalizedText（l(en, ja)） |
| <code>rarity</code> | 必須 | <code>import("C:/Git/repos/SttS/src/models/types").Rarity</code> | types.ts / Rarity |
| <code>description</code> | 必須 | <code>import("C:/Git/repos/SttS/src/models/localization").LocalizedText</code> | LocalizedText（l(en, ja)） |
| <code>triggers</code> | 必須 | <code>RelicTriggerDefinition[]</code> |  |
| <code>statusConsumptionBonus</code> | 任意 | <code>Partial&lt;Record&lt;StatusEffect, number&gt;&gt; &#124; undefined</code> |  |
| <code>epDamageTakenMultiplierPerOrgasm</code> | 任意 | <code>number &#124; undefined</code> |  |
| <code>idleOrgasmsRule</code> | 任意 | <code>{ turns: number; status: StatusEffect; stacks: number; } &#124; undefined</code> |  |
| <code>counter</code> | 任意 | <code>number</code> |  |
| <code>flavors</code> | 任意 | <code>BattleFlavorSet</code> | types.ts / FLAVOR_EVENTS → BattleFlavorSet |

## EventBattleDefinition

定義: [src/data/eventBattles.ts](../../src/data/eventBattles.ts) ／ [使い方](events.md)

関連する型: [ConditionDefinition](reference-types.md#conditiondefinition) / [StatusApplication](reference-types.md#statusapplication) / [StatusEffect](reference-types.md#statuseffect)

| 項目 | 必須／任意 | 型・選択肢 | 参照・注意 |
| --- | --- | --- | --- |
| <code>introConversationId</code> | 任意 | <code>string</code> | CONVERSATIONSのキー。戦闘前のノベル会話。終了後にこのイベント戦闘を開始。 |
| <code>victoryConversationId</code> | 任意 | <code>string</code> | CONVERSATIONSのキー。勝利後に表示する会話。終了後はvictoryで指定した遷移へ進む。 |
| <code>defeatConversations</code> | 任意 | <code>オブジェクト配列（下位項目参照）</code> |  |
| <code>defeatConversations[].conditions</code> | 任意 | <code>ConditionDefinition[]</code> | ConditionDefinition[]（AND）。省略時は常に一致（最後のフォールバック用）。 |
| <code>defeatConversations[].conversationId</code> | 親を設定時必須 | <code>string</code> | conversations.ts / CONVERSATIONSのキー |
| <code>excludedRelicIds</code> | 任意 | <code>string[]</code> | relics.ts / RELIC_DEFINITIONSのキー配列（イベント開始時の初期所持から除外）。PLAYER_DEFINITION.relicsからこの戦闘の間だけ除外するRELIC_DEFINITIONSキー。 |
| <code>initialHp</code> | 必須 | <code>number</code> |  |
| <code>initialEp</code> | 必須 | <code>number</code> |  |
| <code>deckIds</code> | 必須 | <code>string[]</code> | cards.ts / CARD_DEFINITIONSのキー |
| <code>statuses</code> | 必須 | <code>StatusApplication[]</code> | StatusEffect。所有者別の初期状態はStatusApplication |
| <code>enemyIds</code> | 必須 | <code>string[]</code> | enemies.ts / ENEMY_DEFINITIONSのキー |
| <code>beforeDrawEvents</code> | 必須 | <code>オブジェクト配列（下位項目参照）</code> |  |
| <code>beforeDrawEvents[].turn</code> | 親を設定時必須 | <code>number</code> | 発生ターン。繰り返しの場合は開始ターン。 |
| <code>beforeDrawEvents[].conversationId</code> | 任意 | <code>string</code> | conversations.ts / CONVERSATIONSのキー。省略すると会話なしでカード追加のみ実行。 |
| <code>beforeDrawEvents[].repeatWhileStatus</code> | 任意 | <code>StatusEffect</code> | StatusEffect。この状態中、開始ターン以降の各ターンに1回実行。省略時は単発。 |
| <code>beforeDrawEvents[].cardIds</code> | 任意 | <code>string[]</code> | カード登録キー（ドロー前追加）／定義内id（反応条件）。省略・空配列ならカード追加なし。会話のみのイベントも可能。 |
| <code>victory</code> | 必須 | <code>'newGame'</code> |  |

## SensitivityLevel

定義: [src/data/statuses.ts](../../src/data/statuses.ts) ／ [使い方](combatants.md)

<code>1 &#124; 2 &#124; 3 &#124; 4 &#124; 5</code>

## SensitivityLevelConfig

定義: [src/data/statuses.ts](../../src/data/statuses.ts) ／ [使い方](combatants.md)

| 項目 | 必須／任意 | 型・選択肢 | 参照・注意 |
| --- | --- | --- | --- |
| <code>requiredOrgasmCount</code> | 必須 | <code>number</code> |  |
| <code>requiredEpDamage</code> | 必須 | <code>number</code> |  |
| <code>conditionMode</code> | 必須 | <code>'or' &#124; 'and'</code> |  |
| <code>epDamageMultiplier</code> | 必須 | <code>number</code> |  |

## SensitivityStatusEffect

定義: [src/data/statuses.ts](../../src/data/statuses.ts) ／ [使い方](combatants.md)

関連する型: [StatusEffect](reference-types.md#statuseffect) / [EpDamagePart](reference-types.md#epdamagepart) / [SensitivityLevel](reference-types.md#sensitivitylevel)

<code>Extract&lt;StatusEffect, &#96;${EpDamagePart}SensitivityLv${SensitivityLevel}&#96;&gt;</code>

## TutorialTipEvent

定義: [src/data/tutorialTips.ts](../../src/data/tutorialTips.ts) ／ [使い方](events.md)

<code>'enemyOrgasmDrain'</code>

## TutorialEnemyState

定義: [src/data/tutorialTips.ts](../../src/data/tutorialTips.ts) ／ [使い方](events.md)

<code>'inserted' &#124; 'orgasmAftershocks'</code>

## TutorialTipPage

定義: [src/data/tutorialTips.ts](../../src/data/tutorialTips.ts) ／ [使い方](events.md)

関連する型: [LocalizedText](reference-types.md#localizedtext) / [StatusEffect](reference-types.md#statuseffect)

| 項目 | 必須／任意 | 型・選択肢 | 参照・注意 |
| --- | --- | --- | --- |
| <code>text</code> | 必須 | <code>LocalizedText</code> | LocalizedText（l(en, ja)） |
| <code>position</code> | 必須 | <code>オブジェクト（下位項目参照）</code> |  |
| <code>position.anchor</code> | 親を設定時必須 | <code>'endTurn' &#124; 'card' &#124; 'enemyIntent' &#124; 'enemy' &#124; 'playerEp' &#124; 'screen'</code> |  |
| <code>position.cardId</code> | 任意 | <code>string</code> | cards.ts / CARD_DEFINITIONSのキー。card時に必須。手札内の同IDカードを基準にする。 |
| <code>position.x</code> | 親を設定時必須 | <code>number</code> | screen時は画面座標。それ以外は基準位置からの補正px。 |
| <code>position.y</code> | 親を設定時必須 | <code>number</code> |  |
| <code>highlightCardId</code> | 任意 | <code>string</code> | cards.ts / CARD_DEFINITIONSのキー。同IDの手札カードをすべて暗転から除外。 |
| <code>highlightPlayerBars</code> | 任意 | <code>('hp' &#124; 'ep')[]</code> | プレイヤーの指定バーを数値・下限・ブロック表示ごと強調。 |
| <code>highlightPlayerStatuses</code> | 任意 | <code>StatusEffect[]</code> | 指定の状態アイコンを強調し、Tips表示中もホバー説明を確認可能にする。 |
| <code>highlightEnemyBars</code> | 任意 | <code>('hp' &#124; 'ep')[]</code> | 条件またはイベント対象の敵の指定バーを強調。 |
| <code>highlightEnemy</code> | 任意 | <code>boolean</code> | 条件に一致した敵のSpriteを暗転から除外。 |

## TutorialTipDefinition

定義: [src/data/tutorialTips.ts](../../src/data/tutorialTips.ts) ／ [使い方](events.md)

関連する型: [TutorialTipEvent](reference-types.md#tutorialtipevent) / [TutorialEnemyState](reference-types.md#tutorialenemystate) / [TutorialTipPage](reference-types.md#tutorialtippage)

| 項目 | 必須／任意 | 型・選択肢 | 参照・注意 |
| --- | --- | --- | --- |
| <code>id</code> | 必須 | <code>string</code> | 1戦につき1回。配列の上から優先して表示。 |
| <code>battleId</code> | 必須 | <code>string</code> | normalで通常戦闘全体。イベント戦闘はeventBattles.tsのID（例：tutorial）。 |
| <code>turn</code> | 任意 | <code>number</code> | 省略時は全ターン。 |
| <code>delayMs</code> | 任意 | <code>number</code> | そのターンで操作可能になってからのゲーム内時間。Ctrl早送り対象。メニュー・Tips中は数えない。 |
| <code>event</code> | 任意 | <code>TutorialTipEvent</code> | 指定イベントの完了時に表示。通常の操作可能待ちは行わない。 |
| <code>enemyState</code> | 任意 | <code>TutorialEnemyState</code> | 生存敵のうち、この状態の敵が初めている操作可能時点。 |
| <code>pages</code> | 必須 | <code>TutorialTipPage[]</code> | 1ページ以上。文章・位置・強調をページごとに設定。 |

## CrayonAnimationConfig

定義: [src/data/ui.ts](../../src/data/ui.ts) ／ [使い方](presentation.md)

| 項目 | 必須／任意 | 型・選択肢 | 参照・注意 |
| --- | --- | --- | --- |
| <code>redrawDuration</code> | 必須 | <code>number</code> | 描き替え全体の秒数。0で即時切替、0以上。Ctrl早送りの対象。 |

## CardTextResolutionPoint

定義: [src/data/ui.ts](../../src/data/ui.ts) ／ [使い方](presentation.md)

| 項目 | 必須／任意 | 型・選択肢 | 参照・注意 |
| --- | --- | --- | --- |
| <code>cardScale</code> | 必須 | <code>number</code> | カードの表示倍率。通常手札の160×232を1とする。 |
| <code>resolution</code> | 必須 | <code>number</code> | 文字の内部描画倍率。1以上、小数可。 |

## CardTextRenderingConfig

定義: [src/data/ui.ts](../../src/data/ui.ts) ／ [使い方](presentation.md)

関連する型: [CardTextResolutionPoint](reference-types.md#cardtextresolutionpoint)

| 項目 | 必須／任意 | 型・選択肢 | 参照・注意 |
| --- | --- | --- | --- |
| <code>scaleResolutions</code> | 必須 | <code>CardTextResolutionPoint[]</code> | 最も近いcardScaleの解像度を使用。配列順は不問。 |
