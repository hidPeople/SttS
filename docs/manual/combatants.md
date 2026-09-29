# プレイヤー・敵・状態異常・レリック

[目次](README.md) / [全項目](reference-types.md) / [効果・条件](effects.md)

## プレイヤー

[player.ts](../../src/data/player.ts) のPLAYER_DEFINITIONを編集します。

| 項目 | 必須 | 意味・参照 |
| --- | --- | --- |
| id / name | 必須 | 立ち絵ファイル名の先頭にも使うID／日英名 |
| maxHp / maxEp / maxEnergy | 必須 | 通常の最大値。正の数、エナジーは整数 |
| relics / startingDeckIds | 必須 | RELIC_DEFINITIONS / CARD_DEFINITIONSのキー配列。空配列可、デッキの重複は枚数 |
| initialEpProgress | 任意 | EP_DAMAGE_PARTS全キーにepDamageとpeakCount。非負の累計値。省略時0 |

初期累計から成長閾値を評価するため、該当するレベルは戦闘開始時から有効です。通常の戦闘開始エナジーはターン開始回復を経て設定され、回復阻止状態も適用されます。効果によるエナジー回復はmaxEnergyを超えてよく、次ターンには通常の回復先へ戻り、超過分を持ち越しません。

PLAYER_PORTRAIT.battleScaleは画像全体の共通倍率です。[立ち絵設定](assets.md) を参照してください。

## 敵と行動プール

[enemies.ts](../../src/data/enemies.ts) のENEMY_DEFINITIONSへEnemyDefinitionを登録します。

| 項目 | 必須 | 意味・参照 |
| --- | --- | --- |
| id / name / maxHp / maxEp | 必須 | キーと同じID、日英名、最大値。maxEpが0の敵はEPを持たない |
| stages / threat | 必須 | 通常出現を許可するステージ配列と抽選用脅威度。stages空配列なら通常抽選から除外 |
| intentEConditions / intents / intents_E | 必須 | Eプール条件、通常プール、Eプール。空配列可 |
| intentBConditions / intents_B | 任意 | Bプール条件・行動。Eより優先 |
| isGiant | 任意 | 巨大敵の編成扱い。省略false |
| sprite / spriteRules | 任意 | ENEMY_SPRITESキー／条件差し替え。詳細は素材章 |
| traits | 任意 | EnemyTrait配列。反応や状態付与制限に利用 |
| intrusionPart | 任意 | 原因部位のLocalizedText。共通変数参照も可 |
| statusTriggers | 任意 | 状態ID→この敵で使うStatusTriggerDefinition配列 |
| reactionRules | 任意 | プレイヤーEP自傷に反応するルール |
| deathNarrations | 任意 | causeとtextが必須。requiredStatuses・intentIdsで限定可能 |

通常抽選の編成計算自体はScene側です。イベント専用敵はstagesを空にし、EVENT_BATTLES.enemyIdsから参照します。通常行動、E行動、B行動は別プールで、ID重複チェックも各プール内です。

行動はdefineEnemyIntentを使います。labelとeffectsが必須。任意項目はid、conditions、timesLimit、enemyStatusLimit、enemyStatusLimitN、attackAttribute、chance、chanceBonusStatus、chanceBonusTarget、chanceBonusPerStack、flavorsです。省略conditionsは無条件、attackAttributeはstrike、chanceは追加抽選なし。chanceは予告済み行動を実行する際の成否確率で、行動選択の重みではありません。補正はchanceBonusStatus・chanceBonusPerStackを組にし、chanceBonusTarget省略時はplayerを参照します。timesLimitは正のとき使用回数制限になります。旧enemyStatusLimit系はconditionsへ変換されます。新規ではconditionsによる記述を推奨します。

B→E→強制Peak余韻行動→通常の順で候補を決めます。intents_Eが空の敵は誘惑の対象効果を受けません。状態が変われば行動予告の選択も更新されます。行動に派生するダメージ集計値は手入力しません。

### 反応ルール

EnemyReactionRuleはid・trigger必須、effectsまたはvariantsで結果を指定します。trigger.kindはplayerSelfEpDamage。parts、minBaseAmount、cardIds（定義内id）、categoriesで発生を限定できます。minBaseAmountは**補正前の量**です。

conditionsは追加条件、priorityは大きい順（省略0）、timingはbeforePlayerSelfEpDamageまたはafterPlayerSelfEpDamage（省略時）です。高優先の成立ルールを1件実行して終了します。variantsはid・effects必須、conditions・flavors任意。成立したvariantsからランダム選択します。フレーバーの先頭一致方式とは異なります。新しい反応種類を増やすには実行器対応も必要です。

## 状態異常

[statuses.ts](../../src/data/statuses.ts) のSTATUS_DESCRIPTIONSが正本です。キーは [types.ts](../../src/models/types.ts) のStatusEffectにも定義します。既存状態IDを新しい状態へ流用しないでください。生成される感度状態は生成元設定を編集します。

| 項目 | 必須 | 意味・省略時 |
| --- | --- | --- |
| name / description | 必須 | 名称とTips。説明は名称から書き始める運用。自動で効果文を生成しない |
| remain | 必須 | 0=戦闘後解除、1=引継ぎ |
| consumeEachTurn | 必須 | 0=通常のターン消費なし、1=通常のターン消費あり |
| allowedOwners | 必須 | player / enemyの許可配列 |
| triggers | 必須 | タイミング処理。処理がなければ空配列 |
| descriptionsByOwner | 任意 | player/enemy別のTips。省略した側はdescription |
| applyConditions / requiresEp / blockedEnemyTraits | 任意 | 追加条件／EP所持必須／付与を拒否する敵属性。省略は追加制限なし |
| epDamageParts | 任意 | 関連する部位ID配列 |
| iconText / iconColor | 任意 | アイコン文字／数値色。未指定時はUIの代替表示 |
| exclusiveGroup / groupRank | 任意 | 同系列の排他・段階管理。高いrankへの強化に利用 |
| singleStack / durationTurns | 任意 | 単一化／固定持続ターン。durationTurnsは正の整数、再付与は時間更新 |
| noticeLevel | 任意 | normal / important。省略normal。付与・変化・解除の通知種類 |
| blockedFlavorKinds / flavors | 任意 | 抑制するログ種類／この状態の文章 |

単一状態、固定持続、排他段階、通常スタックは別の概念です。durationTurnsがある状態の数量は残りターンとして扱います。triggerで消費する状態にconsumeEachTurnも設定すると追加の消費が起こり得るため、目的に応じて選びます。

### 制限・解除・伝播（全て任意）

| 項目 | 設定内容と効果 |
| --- | --- |
| preventEnergyRecovery | trueで正のエナジー回復を全て阻止 |
| turnStartEnergy | 非負整数。ターン開始回復先の上限 |
| preventTurnStartDraw | trueで通常のターン開始ドローを止める。特殊追加・効果ドローは対象外 |
| receivedEpDamage | 正の被EPダメージ最終値を固定。敵行動予告は元のまま。手札のEP自傷予測では考慮される |
| removeAboveHpRatio | HP÷最大HPが指定比率を**超える**と解除 |
| hpDrainProgress | count必須（正の回数）。nextStatus任意。達成時、指定状態へ変化、未指定なら解除 |
| preventTurnStartEpRecovery | trueでターン開始時のEPと下限の自然減少を止める |
| trackActiveTurns | 有効だったプレイヤーターン数をラン全体で累計 |
| idlePeakRule | turns・status・stacks全て必須。直前の指定ターン数にPeakがなければ付与 |
| spreadRule.appliedStatuses | プレイヤーがこの状態の間、指定状態が敵へ付いたら伝播 |
| spreadRule.cardSelfEpDamageParts | 指定部位への正のEP自傷カードで伝播。補正後0でも対象 |
| spreadRule.cardTarget | selectedEnemy / cardDamagedEnemies / allEnemies / connectedEnemies。省略時カード解決対象 |

hpDrainProgressは正の吸収が実行された回数です。プレイヤーHPが満タンで回復量0でも数えます。解除・段階変化通知は共通経路を通り、important指定も適用します。

### triggerの項目

timingとeffectsは必須。modifiers、visuals、portraitEvent、consumeRule、stacksPerEnergy、conditions、chance、order、flavorsは任意です。

- modifiers：kind・amount・target必須。epDamageTakenMultiplier、hpDamageTakenMultiplier、epMaxMultiplierの倍率。所有者を指すにはstatusOwner。主にpassive／damageCalculationで参照します。
- visuals：StatusVisualKeyの演出キー。新しい文字列を追加するだけでは演出は作られません。
- portraitEvent：プレイヤーtrigger開始から消費・繰り返し演出完了までの立ち絵要因。
- consumeRule：none消費なし、oneは1、allWhileEnergyはエナジーがある間反復。省略は消費なし。stacksPerEnergyはallWhileEnergyの1回消費数、正の整数、省略1。残数が満たなくても全残数を消費して1回実行。
- conditions：全て成立時のみ。chance：0～1、省略は追加確率なし。order：小さい順の処理順（省略時100）。

Aftershocksの消費量は該当turnStart triggerのstacksPerEnergyです。説明は {aftershocksStacksPerEnergy} を使えば設定変更に追従します。

この節の回復・ドロー制限、固定被EP量、HP回復による解除、ドレイン進行、ターン累計・伝播はプレイヤー向けの処理です。allowedOwnersへenemyを追加しても同じ制限処理が自動適用されるわけではありません。

## 部位ごとの成長

PART_SENSITIVITY_LEVELSの各レベルにrequiredPeakCount、requiredEpDamage、conditionMode、epDamageMultiplierを全て指定します。conditionModeはor（どちらか）／and（両方）。閾値は非負、倍率は正。現在値の一覧を文書へ複製せず、この表を直接編集します。

部位ごとの累計Peak回数と累計EPダメージはランで保持します。正のEPダメージが最終値1未満で無効でも、成長累計には切上げで最低1加算されます。初期値はPLAYER_DEFINITION.initialEpProgressから設定します。

## レリックと報酬

[relics.ts](../../src/data/relics.ts) のRELIC_DEFINITIONSでdefineRelicを使います。id・name・rarity・description・triggersが必須。counterとflavorsは任意。counterはアイコンに出す数値で、省略時は表示しません。自動的に回数を数える機能ではありません。triggerはtiming・effects必須、conditions・chance・flavors任意です。敵文脈が必要な効果は、対応するイベントで使います。

[rarities.ts](../../src/data/rarities.ts) のREWARD_RARITY_DROP_RATESはRarityに対する**抽選重み**です。0～1の発動確率とは異なり、重みの合計を基に抽選します。報酬枚数、除外レアリティ、重複排除の規則はRewardScene側にあり、この表だけでは変更できません。
