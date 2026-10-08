# 設定マニュアル保存版

文章生成に関わる設定を落とさないため、関連する現行マニュアル7章を全文保存しています。生成の手順はフレーバー用 `04-flavor-guide.md` と会話用 `05-conversation-guide.md` に分離しています。この保存版は詳細を確認するときの資料です。相対リンクだけをこの保存先に合わせて付け替えています。リンク先はリポジトリ内なので、添付ファイルだけのAIは開けません。入力型・IDは `02-current-reference.md` に収録しています。元マニュアルと実装で差がある箇所は専用ガイドの注意を優先してください。UI調整・戦闘バランスなどは通常の台詞生成で変更しません。

---

元ファイル: `docs/manual/effects.md`

# 効果・条件・フレーバー

[目次](../manual/README.md) / [全項目・選択肢](../manual/reference-types.md)

## 共通効果 effect

[effectBuilders.ts](../../src/data/effectBuilders.ts) の effect(kind, target, amount, options?) を使います。前3引数は必須。optionsは省略可能ですが効果に応じて必須の内部項目があります。直にEffectDefinitionを書く場合のtimesは必須、effect()なら省略時1です。

対象は player（プレイヤー）、self（実行主体）、selectedEnemy（解決対象敵）、triggerEnemy（フックを発火させた敵）、allEnemies（生存敵全員）。フックに存在しない対象を指定しても敵は生成されません。プレイヤー専用効果にはplayerを指定します。

| kind | amountと必須オプション | 動作・制限 |
| --- | --- | --- |
| hpDamage | 非負の基本量 | HP攻撃。ブロックと補正を適用 |
| epDamage | 非負の基本量。部位指定はepDamageParts等 | EPを増やす。プレイヤーは最終値1未満を実ダメージにしない |
| shareEpDamage | 0、敵対象 | 次の自分のターン開始まで実被EP量を相互共有。再共有・受け手側の倍率や固定被EP量の補正なし。EPなしには無効 |
| copyEpSensitivity | 0、敵対象、sensitivityPart必須 | 次の自分のターン開始まで、敵の被EP倍率を指定部位のプレイヤー倍率で置換。攻撃の直前に再計算し、敵自身の倍率とは重複乗算しない |
| hpHeal | 非負の基本量 | HPを最大値まで回復 |
| epHeal | 非負の基本量 | EPを減らす。プレイヤーが下限を割ると下限も下げる |
| epReserveHeal | 非負の基本量、player | EPリセット下限を減らす |
| block | 非負の基本量 | ブロックを加算 |
| hpDrain | 非負の基本量、敵対象 | 敵HPを吸収してプレイヤーを回復 |
| energyGain | 符号付き整数、player | 正なら回復、負なら消費。通常最大値を超えて蓄積可 |
| drawCards | 非負の整数、player | 山札から引く |
| addCardToHand | 非負の整数、player、cardId必須 | 指定カードを追加。特殊派生はcardAddVariant |
| status | 正の付与量、status必須 | stacksがあればamountより優先。状態定義の付与制約に従う |
| removeStatus | 0、statusまたはstatusGroup | 指定状態／排他グループを解除。状態trigger文脈では元状態を使う省略形も可 |
| discardHand | 0、player | 手札全体を捨てる |
| setEp / setEpReserve | 非負、player | 現在EP／下限を固定値へ。切上げ後に有効最大EPまで制限 |
| setEpRatio / setEpReserveRatio | 0～1、player | ratioBaseの値×amountを切捨てて設定。省略基準はplayerMaxEp |
| retainBlock | 0、player | ターンをまたぐブロック保持 |

EP直接設定は絶頂を発生させません。現在EPを下限より下へ変更すると下限も下がり、下限を現在EPより上へ変更すると現在EPも上がります。ratioBaseは playerMaxEp / playerCurrentEp / playerEpReserve（いずれも実行直前の値）。繰り返しなら毎回基準値を取得します。

### 効果の追加項目

| options内の項目（全て型上任意） | 意味・省略時・参照先 |
| --- | --- |
| targetConditions | 対象ごとのConditionDefinition配列（AND）。省略時制限なし。selectedEnemyは解決対象の敵 |
| sensitivityPart | copyEpSensitivityで参照するEP_DAMAGE_PARTSの単一部位 |
| textId | カード内一意の説明用ID。[カード説明](../manual/cards.md)で参照 |
| times | 繰り返し回数、1以上の整数。省略1。ただしstatus／ドロー／手札追加では使用しない |
| percentOf | amountを倍率として基準値×amountを切上げ。EffectPercentOfから選択 |
| ratioBase | EP割合直接設定専用。上記の3種。他の効果には使わない |
| status / statusGroup / stacks | statuses.tsの状態ID／exclusiveGroup名／正の付与数 |
| attackAttribute | types.tsのAttackAttribute。攻撃素材はsprites.tsのDAMAGE_SPRITE_EFFECTS |
| epDamageParts | EP_DAMAGE_PARTSの配列。複数部位可 |
| epDamagePartRules | 各要素にconditionsとpartsが必須。最初に一致した部位を採用、なければ通常指定 |
| epDamagePartMode | static（指定部位）、actorIntruded（主体の侵入部位）、lastPlayerEpDamageParts（直前の被EP部位） |
| cardId | CARD_DEFINITIONSのキー。addCardToHandで必須 |
| cardAddVariant | defaultまたは原因状態別の除去カード生成。*ForStatusOwnerは原因状態・所有者文脈が必要 |
| perStack | 状態triggerのstatusStacksを効果量に掛ける。省略false |
| onlyDuringPlayerTurn | trueならプレイヤーターンのみ。省略false |
| chance | 発動確率0～1。省略は常時 |
| chancePerStack | 状態スタック毎に抽選し1回以上成功する確率を使う。chance必須。効果実行は1回 |
| chanceBonusStatus / chanceBonusTarget / chanceBonusPerStack | 補正状態ID、読む対象（省略player）、1スタックごとの確率加算。最終確率は0～1 |
| randomAmount | min/max両方必須。切上げた両端を含む整数抽選、max>=min。通常非負、energyGainは負可 |
| flavors | この効果のFlavorEvent候補 |

percentOfの基準は playerMaxHp / playerMaxEp（補正後）/ playerBaseMaxEp（補正前）/ selfCurrentHp / selfMaxEp / targetMaxEp。self*とtargetMaxEpは実行器の効果対象を参照するため、敵自身や対象敵に対する効果として指定してください。

randomAmountは基本量・percentOfに優先します。直接割合設定2種にpercentOf・randomAmount・perStackは使いません。drawCards・addCardToHandは共通の追加経路を通り、times・chance・perStack・効果固有flavorsに対応していません（onlyDuringPlayerTurn、randomAmountは使用可）。型に欄があっても全kindで使えるわけではありません。

## 条件 condition

condition(kind, operator, options?) のkindとoperatorは必須。複数条件を配列に並べると**AND**です。status/relic/traitの複数候補は**OR**です。

~~~ts
// AまたはBがある
condition('status', 'has', { target: 'player', statuses: ['InHeat', 'Frustrated'] })
// AかつBが必要なら、statusを1個ずつ指定したconditionを2行並べる。
~~~

| kind | 必要な追加指定・比較対象 |
| --- | --- |
| status | statusまたはstatuses。hasはいずれか所持、notHasは全て非所持。数量比較はvalue |
| hasEp | targetの最大EPが正か。eq/notEqとvalue:boolean |
| relic | relicIdまたはrelicIds。RELIC_DEFINITIONSのキー。プレイヤーの所持品 |
| enemyTrait | enemyTraitまたはenemyTraits。EnemyTraitから選択 |
| bodyPartStatus | parts必須。bodyPartStatusKindsはinsert/intruded、省略は両方。target省略は生存敵全体 |
| enemyHasBindingAction | 対象敵が拘束付与を含む行動を持つか。現在その行動が使えるかの判定ではない |
| enemyHasEIntents | 対象敵にintents_Eがあるか |
| enemyOrgasmAftershocks | 敵の絶頂余韻中か。誘惑で行動を上書きした後も次の敵行動まで認識 |
| hp / ep / block | 対象の現在値とvalueを比較 |
| hpPercent / epPercent | 対象の現在値÷最大値×100とvalueを比較 |
| cardsPlayedThisTurn | 今ターンの使用枚数とvalue |
| intentUsageCount | その行動の使用回数とvalue |
| playerOrgasmsThisBattle | この戦闘中のプレイヤー絶頂回数とvalue |
| aliveEnemyCount | 生存敵数とvalue |
| isPlayerTurn / purgeCausedOrgasm / purgeWillCauseOrgasm | 真偽判定。後2つは除去カードの文脈が必要 |
| flavorValue | valueKeyとvalue必須。発火時に渡された数値／真偽値を比較 |

operatorはeq（等しい）、notEq、gt（超）、gte（以上）、lt（未満）、lte（以下）、has、notHasです。値比較にはvalue、所持判定には対象IDを指定します。真偽条件はeq/notEqとvalue: true/falseで記述します。statusesの数値比較は候補状態の合計スタック数、relicIdsやenemyTraitsは該当個数との比較です。

targetはplayer / actor / self / selectedEnemy / triggerEnemy / statusOwner。statusは通常actor、敵専用条件は通常selectedEnemyを基準にします。曖昧さを避けたい場合は明示してください。causeStatusは条件成立後の行動切り替え等で「どの状態に起因するか」を渡すメタ情報です。これ自体は条件を追加せず、状態の有無の評価にはstatus／statusesを使います。未提供のflavorValueは条件不成立です。

## フックと文章イベントを区別する

EffectTimingは効果を実行するタイミング、FLAVOR_EVENTSは文章を表示するタイミングです。例えばCard.Resolvedは文章用で、同名の効果triggerを追加できるわけではありません。

| EffectTiming | 現在の主な実行／参照経路 |
| --- | --- |
| passive | 常時計算。レリックの敵EP攻撃補正、状態modifier等。任意効果の自動反復ではない |
| battleStart | レリックの戦闘開始処理 |
| turnStart | プレイヤーターン開始。状態triggerの後にレリック |
| playerActionStart | 通常ドロー・開始処理後、操作開始前の状態trigger |
| enemyOrgasm | 敵絶頂時のレリックtrigger |
| playerOrgasm | プレイヤー絶頂のレリック／状態処理。下限回復は専用集計を経る |
| playerOrgasmRecovered | EPが下限に戻った後の状態trigger |
| damageCalculation | 状態modifierの計算時参照 |
| statusApplied | 状態付与直後の状態trigger |
| enemyDamaged / cardDrawn / blockGained | 敵被ダメージ／ドロー／ブロック取得後のレリックtrigger |
| purgePlayed | 除去カード使用に紐づく状態trigger |

型が共通でも全timingを全所有者へ配信しているわけではありません。新しい組合せは実行箇所の追加が必要です。

## フレーバーを設定する

共通文は [flavorCatalog.ts](../../src/data/flavorCatalog.ts) のGLOBAL_FLAVORS、個別文はカード・敵行動・状態・レリック・trigger・effectのflavorsへ設定します。キーは [types.ts](../../src/models/types.ts) のFLAVOR_EVENTS。全イベント名は [定数リファレンス](../manual/reference-config.md) を参照してください。

~~~ts
flavors: {
  [FLAVOR_EVENTS.Card.Play]: [
    { conditions: [condition('status', 'has', { target: 'player', status: 'Starvation' })],
      lines: [{ kind: 'quote', text: l('...', '…') }] },
    { kind: 'quote', text: l('...', '…') },
  ],
},
~~~

単純候補はkind・text必須。条件候補はlines必須、conditions省略は無条件。kindはsystem / status / important / narration / quote。条件候補にsuppressKindsを付けると、指定した種類の後続候補を抑止できます。

**種類ごとに最初の成立候補**を採用し、その候補内の同じkindのlinesからランダムに1行選びます。quoteとnarrationは別々に選ばれます。狭い条件を先、無条件を最後に置いてください。先に選ばれた種類は後の候補では上書きしません。

### 大まかなプレイヤー状態

[playerStates.ts](../../src/data/playerStates.ts) の `PLAYER_STATE_CONDITIONS` は、複数の具体条件をフレーバー向けの状態名へまとめます。`anyOf` の外側はOR、各グループ内はANDです。新しい状態は同じオブジェクトへキーを追加すれば `condition('playerState', 'has', { playerState: '状態キー' })` の候補にも反映されます。

| 状態 | 成立条件（いずれか） |
| --- | --- |
| Breathless | 連続絶頂系状態あり / Aftershocks 10以上 |
| Aroused | EP 75%以上 / ムラムラ系状態あり / Aftershocks 1～9 |
| Gagged | 生存中の敵がMへ挿入中 / Mへ侵入中 |

`has` は状態成立、`notHas` は不成立を判定します。個別フレーバー側で具体的な状態配列を重複させず、この条件を参照してください。

### カードの予測値と確定値

| 文章イベント | 使用できる条件用値 |
| --- | --- |
| Card.Play | enemyWillOrgasm、playerWillOrgasm、playerSelfEpDamage |
| Card.Resolved | playerCummed（プレイヤーが実際に絶頂したか）、enemyCummed（いずれかの敵が実際に絶頂したか）。いずれも真偽値 |
| Battle.EnemyOrgasm（カード側flavors） | 実際に敵絶頂を起こしたカードの文章。対象はその敵。Card.Play時のplayerWillOrgasm等の予測値を引き継ぐ |

Card.Playの予測は現在の補正・確定する最小ダメージに基づき、確率効果や将来の連鎖を先に実行しません。Card.Resolvedはカード効果・反応・絶頂・除去処理等が終わった後です。そのカードの処理中に増えたプレイヤー／敵全体の戦闘絶頂回数で判定します。enemyCummedは選択中の敵以外や派生効果による絶頂も含み、過去のカードでの絶頂は含みません。実際の結果で分岐したい文章はこちらへ置きます。

例：`condition('flavorValue', 'eq', { valueKey: 'enemyCummed', value: false })` は、そのカードの処理中にどの敵も絶頂しなかった時に成立します。playerCummedの条件と同じconditions配列へ並べればAND条件になります。

Battle.EnemyOrgasmでも `condition('flavorValue', 'eq', { valueKey: 'playerWillOrgasm', value: true })` で予測に応じた文章を先に配置できます。この値はカード使用前の予測のままであり、敵絶頂時点の残り効果・連鎖から再計算した未来の確定結果ではありません。quoteとnarrationの両方を分岐させる場合は、条件付き候補に両方のkindを置き、後ろの無条件候補を不成立時に使います。

### 置換文字列と部位名

| 表記 | 参照・使用範囲 |
| --- | --- |
| {player} / {enemy} / {source} / {status} | 戦闘文脈の表示名。敵は実際の対象／発火元を優先 |
| {intrusionPart} | 敵定義intrusionPartまたは生成カード由来の部位表現 |
| {A}、{partA}等 | BODY_PART_TOKENSの部位名。成長段階に応じて選択 |
| {defaultA}、{defaultVI}等 | BODY_PART_DEFAULT_NAMESの固定名。共通テキストで利用可 |
| {part} / {defaultPart} | イベントがpartを渡した時の動的部位名／固定部位名 |
| {relicEpDamageMultiplier} | レリック説明用。当該レリックの設定倍率とラン累計絶頂回数から算出する現在の倍率 |
| {aftershocksStacksPerEnergy} | Aftershocksの消費設定から取得。Tipsの固定数値を避ける |
| {amount}、{target}、{card}等 | そのイベントのflavorValuesに渡される値のみ |

任意のキーを書けば値が生成されるわけではありません。未対応キーは文字列に残ることがあります。イベント固有値の正本は [BattleScene.ts](../../src/scenes/BattleScene.ts) のflavorValuesの構築箇所です。条件に使えるのは数値／真偽値であり、任意の文字列比較ではありません。

[bodyParts.ts](../../src/data/bodyParts.ts) のBODY_PART_NAMESはpartとnames（段階0～5の全キー）が必須。BODY_PART_DEFAULT_NAMESはpartとnameが必須。別名の成長参照先はBODY_PART_STAT_PARTで対応付けます。別名追加時はBODY_PART_ALIASESと両方の名前定義・対応表を揃えます。動的なpartの固定名には {defaultPart} を使い、入れ子の {default{part}} は使いません。


---

元ファイル: `docs/manual/events.md`

# イベント戦闘・会話・チュートリアルTips

[目次](../manual/README.md) / [全項目](../manual/reference-types.md) / [会話の見た目と操作設定](../manual/presentation.md)

## イベント戦闘

[eventBattles.ts](../../src/data/eventBattles.ts) のEVENT_BATTLESにIDをキーとして登録します。通常と同じ戦闘システムを使い、開始状態と会話等の進行だけを指定します。

| 項目 | 必須 | 内容・参照 |
| --- | --- | --- |
| initialHp / initialEp | 必須 | 開始時の現在値。通常最大値の変更ではない |
| deckIds | 必須 | CARD_DEFINITIONSのキー配列。重複は枚数 |
| excludedRelicIds | 任意 | 初期所持から除外するRELIC_DEFINITIONSキー配列。省略時は除外なし。newGame遷移ではPLAYER_DEFINITION.relicsに戻る |
| statuses | 必須 | {effect: StatusEffect, stacks: 正の整数}配列 |
| enemyIds | 必須 | ENEMY_DEFINITIONSのキー配列。並びが配置順 |
| beforeDrawEvents | 必須 | ターン開始の通常ドロー前イベント。空配列可 |
| victory | 必須 | 現在の対応値はnewGame。通常初期値へ戻して通常1戦目 |
| battleStartConversationId | 任意 | CONVERSATIONSキー。初期状態異常の付与通知・戦闘開始効果の後、初回ターン開始処理の前に会話を表示。省略時は会話なし |
| introConversationId / victoryConversationId | 任意 | CONVERSATIONSキー。戦闘前／勝利後の会話 |
| defeatConversations | 任意 | conditions任意、conversationId必須の候補。先頭一致。終了後はタイトルへ戻る |

beforeDrawEventsの各要素はturnが必須（1始まり）。conversationId、repeatWhileStatus、cardIdsは任意です。repeatWhileStatusなしなら指定ターンのみ、あればそのターン以降、状態がある間毎ターン1回。cardIdsを省略すれば会話のみで、会話IDを省略すればカード追加のみです。両方ある場合は会話の後に特殊追加演出を行います。

~~~ts
beforeDrawEvents: [{ turn: 1, conversationId: 'opening' }],
~~~

新IDの登録だけでタイトルのメニュー項目は増えません。新たな開始導線にはTitleScene等の呼出し設定が必要です。背景はBATTLE_BACKGROUNDS.eventsの同じIDへ指定します。

## 会話データ

[conversations.ts](../../src/data/conversations.ts) のCONVERSATIONS[会話ID]はページ配列です。ページ数は配列から決まります。DEFEAT_CONVERSATIONSは敗北原因ID→会話ID、defaultが既定の会話です。新しい原因キーを記述するだけでは敗北検知処理は増えません。

Extraのイベント一覧へ出す独立イベントは、同じファイルのCONVERSATION_EVENTSへ会話IDをキーとして登録します。titleは一覧の表示名、categoryは現在`prologue`または`normal`、gallery=falseなら一覧から除外します。解放条件の文章はEVENT_BATTLESのintroConversationId／victoryConversationId／defeatConversationsとの参照関係と敗北条件から生成されるため、同じ条件を表示用に重複記述しません。サムネイルは会話内で最初に指定されたbackgroundを使います。

| ページ項目 | 必須 | 意味・省略時 |
| --- | --- | --- |
| text | 必須 | LocalizedText。明示改行は\n |
| speaker | 必須 | quote=プレイヤー名、user=You/あなた、narration=名前欄なし |
| portrait | 任意 | CHARACTER_PORTRAITSまたは自動検出画像の拡張子なしID。空欄は現在の戦闘立ち絵を制御しない |
| background | 任意 | image/からの相対パス（例event/example.png）。空欄はページ背景を表示しない |
| backgroundDim | 任意 | 0通常～1黒。省略0 |
| backgroundTransition | 任意 | 次の節。切り替え先ページに置く |

立ち絵を明示したページでは戦闘の立ち絵を一時非表示にし、指定画像を同じ配置規則で表示します。空欄なら戦闘側の立ち絵に影響しません。専用ノベルシーンには元の戦闘立ち絵がありません。背景は戦闘UIより前、立ち絵・会話・設定より後ろです。

本文の色はspeaker別のテーマ色、名前欄は同じ役割に従います。ページの演出時間はCONVERSATION_WINDOW、専用ノベルの開始・終了暗転はNOVEL_PRESENTATION。いずれもmsです。backgroundDimの変更はbackgroundDimDurationで補間します。

## 背景切り替え

[conversationTransitions.ts](../../src/data/conversationTransitions.ts) のConversationBackgroundTransitionをbackgroundTransitionに置きます。type必須、その他任意でCONVERSATION_TRANSITIONSの共通値を使います。

| type | 演出 | 特有の項目 |
| --- | --- | --- |
| radial | 中心から円状に新画像が広がる（Canvas描画時はクロスフェード） | originX/Yは左上基準0～1。featherは境界ぼかし比率0～0.9 |
| flash | 白フラッシュの途中で交換 | 共通flashFrames、flashSwitchAt |
| pageTurn | 横方向のページめくり | 共通pageFoldWidth(px)、pageFoldAlpha(0～1) |
| fade | 黒暗転して交換 | duration |
| blink | 上下の幕を閉じて交換 | duration |

共通のdurationは全体ms、0は即時。showText=falseで切り替え中の本文を隠します。省略時は共通showTextを使います。**画像が同じページでも指定演出は実行します**。最初のページや、背景画像がない箇所の遷移には適用しません。

~~~ts
background: 'event/example.png',
backgroundTransition: {
  type: 'radial', originX: 1 / 3, originY: 3 / 4,
  showText: false,
},
~~~

共通flashFramesの各点はat（全時間に対する0～1の位置）とalpha（白さ0～1）必須。at順に並べ、flashSwitchAtを白い期間に置きます。maskResolutionは円形ぼかし用マスクの解像度で、素材画像のサイズを変更しません。

## チュートリアルTips

[tutorialTips.ts](../../src/data/tutorialTips.ts) のTUTORIAL_TIPSへ追加します。通常戦闘でも使えます。

| 定義項目 | 必須 | 内容・省略時 |
| --- | --- | --- |
| id | 必須 | Tips内で一意。同じ戦闘では1回のみ |
| battleId | 必須 | normal=通常戦闘全体、それ以外はEVENT_BATTLESキー |
| pages | 必須 | 1ページ以上。各ページはtextとposition必須 |
| turn | 任意 | 指定ターンのみ。省略は全ターン |
| delayMs | 任意 | そのターンで操作可能になってからのゲーム内待機時間。省略は待機なし |
| enemyState | 任意 | inserted / orgasmAftershocks。該当する生存敵をアンカー・強調対象にする |
| event | 任意 | enemyOrgasmDrain。敵絶頂に伴う吸収演出完了後に表示 |

通常はプレイヤーが操作可能になった時点で条件を判定します。event指定はイベント完了箇所で判定し、通常のdelayMs・enemyStateによる待機／絞り込みを併用しません（battleId・turn・未表示IDで選びます）。配列の上にある候補ほど優先です。delayMsはCtrl早送り対象で、設定・Tips中は進みません。

### ページごとの位置・強調

positionはanchor・x・y必須。anchor=cardの場合だけcardIdも必須です。x/yは補正px、screenなら直接画面座標です。

| anchor | 基準 |
| --- | --- |
| endTurn | ターン終了ボタン |
| card | 指定IDの手札カード |
| enemyIntent | 条件／イベント対象敵の行動予告 |
| enemy | 条件／イベント対象敵 |
| playerEp | プレイヤーEPバー右側。Tips左下基準 |
| screen | Tips左下の画面座標 |

敵基準の位置やhighlightEnemyBarsを使う場合は、enemyStateまたはeventで対象敵を指定してください。必要なカードがまだない場合は表示を待ちます。

任意のhighlightCardIdは同じIDの手札を強調。highlightPlayerBars / highlightEnemyBarsはhp・epの配列でバーを強調。highlightEnemy=trueは対象敵のSpriteを強調します。**強調はページごとの指定**なので、次ページでも同じ箇所を残すなら各ページに記述します。

任意の`highlightPlayerStatuses`は、`statuses.ts`で定義された`StatusEffect`のID配列です（例：`['Starvation', 'ExtremeFatigue']`）。現在付与されている指定状態のアイコンを強調し、そのアイコン上で通常のホバーTipsを確認できます。省略時は状態アイコンを強調せず、他の操作も引き続き遮断します。ページ切替時にはホバーTipsを閉じます。

Tipsは枠内・枠外どちらの左クリックでも次ページへ進み、最終ページなら閉じます。1ページのみの場合も同様です。出現時の暗転と入力抑止はui.tsのTUTORIAL_TIP_PRESENTATION。演出時間はゲーム速度に追従しますが、入力抑止は実時間です。

Ctrlを押し直して保持すると、現在のTipsの全ページを順にスキップします。出現前から押していたCtrlでは進みません。次のTipsでも押し直しが必要です。キーとページ送り間隔（実時間ms）は`conversations.ts`の`NOVEL_CONTROLS.skip.keys`と`intervalMs`を共有し、出現直後の入力抑止中は進みません。


---

元ファイル: `docs/manual/combatants.md`

# プレイヤー・敵・状態異常・レリック

[目次](../manual/README.md) / [全項目](../manual/reference-types.md) / [効果・条件](../manual/effects.md)

## プレイヤー

[player.ts](../../src/data/player.ts) のPLAYER_DEFINITIONを編集します。

| 項目 | 必須 | 意味・参照 |
| --- | --- | --- |
| id / name | 必須 | 立ち絵ファイル名の先頭にも使うID／日英名 |
| maxHp / maxEp / maxEnergy | 必須 | 通常の最大値。正の数、エナジーは整数 |
| relics / startingDeckIds | 必須 | RELIC_DEFINITIONS / CARD_DEFINITIONSのキー配列。空配列可、デッキの重複は枚数 |
| initialEpProgress | 任意 | EP_DAMAGE_PARTS全キーにepDamageとorgasmCount。非負の累計値。省略時0 |

初期累計から成長閾値を評価するため、該当するレベルは戦闘開始時から有効です。通常の戦闘開始エナジーはターン開始回復を経て設定され、回復阻止状態も適用されます。効果によるエナジー回復はmaxEnergyを超えてよく、次ターンには通常の回復先へ戻り、超過分を持ち越しません。

PLAYER_PORTRAIT.battleScaleは画像全体の共通倍率です。[立ち絵設定](../manual/assets.md) を参照してください。

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

敵行動・反応行動の `status / self` による挿入・侵入（InsertA/V/M、IntrudedA/V/M）付与は、effects内の位置にかかわらずダメージより先に実行します。同時に複数付与する場合の付与同士の順序は配列順です。他の状態付与・解除の順序は変えません。接続時の状態伝播も先に発動するため、その後のEP計算・絶頂フックは接続後の状態を使います。行動成功率の抽選を通らない時は、先行付与も発生しません。


B→E→強制絶頂余韻行動→通常の順で候補を決めます。intents_Eが空の敵は誘惑の対象効果を受けません。状態が変われば行動予告の選択も更新されます。行動に派生するダメージ集計値は手入力しません。

### 反応ルール

EnemyReactionRuleはid・trigger必須、effectsまたはvariantsで結果を指定します。trigger.kindはplayerSelfEpDamage。parts、minBaseAmount、cardIds（CARD_DEFINITIONSの登録キー）、categoriesで発生を限定できます。minBaseAmountは**補正前の量**です。

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
| visuals.applied | 任意 | 実際の付与・昇格時のSprite演出。effectは`AttackAttribute`（`DAMAGE_SPRITE_EFFECTS`を参照）、countは固定個数・`addedStacks`（追加数）・`groupRank`（昇格先ランク、省略ランクは1）。この2項目はapplied内で必須。ownersは任意の`StatusOwner[]`、省略時は両者。付与不成立・同じ状態の維持では再生しない。専用プレビューは本体で確認する |
| iconImage | 任意 | 画像を共有するStatusEffectのID（拡張子不要）。省略時は自身のID.png。詳しくは[状態異常アイコン](../manual/assets.md#状態異常アイコン) |
| iconText / iconColor | 任意 | 画像未配置・読込失敗時のアイコン文字／数値色。未指定時はUIの代替表示 |
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
| idleOrgasmsRule | turns・status・stacks全て必須。直前の指定ターン数に絶頂がなければ付与 |
| spreadRule.appliedStatuses | プレイヤーがこの状態の間、指定状態が敵へ付いたら伝播 |
| spreadRule.cardSelfEpDamageParts | 指定部位への正のEP自傷カードで伝播。補正後0でも対象 |
| spreadRule.cardTarget | selectedEnemy / cardDamagedEnemies / allEnemies / connectedEnemies。省略時カード解決対象 |

hpDrainProgressは正の吸収が実行された回数です。プレイヤーHPが満タンで回復量0でも数えます。解除・段階変化通知は共通経路を通り、important指定も適用します。

### triggerの項目

timingとeffectsは必須。modifiers、visuals、portraitEvent、consumeRule、stacksPerEnergy、initialFreeStacks、initialVisuals、conditions、chance、order、flavorsは任意です。

- modifiers：kind・amount・target必須。epDamageTakenMultiplier、hpDamageTakenMultiplier、epMaxMultiplierの倍率。所有者を指すにはstatusOwner。主にpassive／damageCalculationで参照します。
- visuals：StatusVisualKeyの演出キー。新しい文字列を追加するだけでは演出は作られません。
- portraitEvent：プレイヤーtrigger開始から消費・繰り返し演出完了までの立ち絵要因。
- consumeRule：none消費なし、oneは1、allWhileEnergyはエナジーがある間反復。省略は消費なし。stacksPerEnergyはallWhileEnergyの1回消費数、正の整数、省略1。残数が満たなくても全残数を消費して1回実行。
- initialFreeStacks：allWhileEnergyの反復前に、1回だけ無料で消費する数。非負整数、省略0。エナジーが0でも実行し、残数まで消費します。effectsは実行せず、statusConsumptionBonusも加算しません。
- initialVisuals：無料消費が実際に行われた場合だけ再生するStatusVisualKey配列。省略時なし。playerTrembleはHP被弾と同じ横振動のみで、点滅・HPdamage立ち絵への変更・ダメージはありません。breathAndEnergyPulseは従来の上下動とエナジー欄の演出です。
- conditions：全て成立時のみ。chance：0～1、省略は追加確率なし。order：小さい順の処理順（省略時100）。

Aftershocksの無料消費数は該当turnStart triggerのinitialFreeStacks、その後の1エナジー当たりの消費数はstacksPerEnergyです。説明には {aftershocksInitialFreeStacks} と {aftershocksStacksPerEnergy} を使えば設定変更に追従します。無料消費だけで全スタックがなくなった場合もinitialVisualsを最後まで再生します。立ち絵のAftershockBreathと消費前のAftershocks条件は、無料消費開始から通常消費演出の終了まで維持します。

この節の回復・ドロー制限、固定被EP量、HP回復による解除、ドレイン進行、ターン累計・伝播はプレイヤー向けの処理です。allowedOwnersへenemyを追加しても同じ制限処理が自動適用されるわけではありません。

## 部位ごとの成長

PART_SENSITIVITY_LEVELSの各レベルにrequiredOrgasmCount、requiredEpDamage、conditionMode、epDamageMultiplierを全て指定します。conditionModeはor（どちらか）／and（両方）。閾値は非負、倍率は正。現在値の一覧を文書へ複製せず、この表を直接編集します。

部位ごとの累計絶頂回数と累計EPダメージはランで保持します。正のEPダメージが最終値1未満で無効でも、成長累計には切上げで最低1加算されます。初期値はPLAYER_DEFINITION.initialEpProgressから設定します。

## レリックと報酬

[relics.ts](../../src/data/relics.ts) のRELIC_DEFINITIONSでdefineRelicを使います。登録キーが一意なレリックIDになり、defineRelic内へidを重ねて書く必要はありません。name・rarity・description・triggersが必須。counter・flavors・epDamageTakenMultiplierPerOrgasm・idleOrgasmsRuleは任意。counterはアイコンに出す数値で、省略時は表示しません。自動的に回数を数える機能ではありません。triggerはtiming・effects必須、conditions・chance・flavors任意です。敵文脈が必要な効果は、対応するイベントで使います。

アイコン用の`iconText`（文字列または日英テキスト）・`iconColor`（0xRRGGBB）・`iconImage`（画像を共有するレリックid）は任意です。画像は`image/icon/Relic/id.png`を自動検出し、画像未配置・読込失敗時は代替文字と背景色を使用します。省略値や参照方法は[レリックアイコン](../manual/assets.md#レリックアイコン)を参照してください。

発動時の拡大・発光は、条件・確率判定を通過し、実際に効果が適用されたときに始まります。`trigger.chance`だけでなく、対応する効果の`chance`・`targetConditions`・`onlyDuringPlayerTurn`も判定した結果を使い、演出のための再抽選はしません。状態付与が無効、回復量が0など、効果が成立しなかった場合は発光しません。同一フックの同一レリックは複数の対象や効果が成功しても一度だけ演出します。演出終了を待たず、効果は定義順に処理します。

通常フック以外も、`orgasmPhase: 'damage'`は実際のダメージ表示時（省略分は合算時）、`statusConsumptionBonus`は基本消費数を超えて消費したとき、`epDamageTakenMultiplierPerOrgasm`は絶頂回数の加算時に演出します。`Passive`の敵EPダメージ加算は実際のカード攻撃時、`idleOrgasmsRule`は状態の付与成功時に演出します。説明文・行動予告・ダメージプレビューの計算では演出しません。

- statusConsumptionBonus：状態IDをキー、非負整数を値とする任意レコード。allWhileEnergyで1エナジー当たりに消費する数へ加算します。複数レリックは加算合計。端数は残り全てを消費し1回実行します。
- trigger.orgasmInterval：playerOrgasm専用の任意の正整数。ラン累計絶頂回数が倍数を通過した数で発動回数を決めます。通常は1回ずつ、連続絶頂の省略分は通過数をamountに乗算してまとめて解決します。hpHeal・energyGain等の加算型効果向けです。未指定の通常フックは従来通り1バッチ1回です。
- trigger.orgasmPhase：playerOrgasm専用でdamageを指定すると、敵対象epDamageをプレイヤーの絶頂時HPダメージエフェクトと同時に実行します。対象・倍率・端数を各絶頂時に確定し、省略分は最終ダメージを合計。対象制限にはeffect.targetConditionsを使います。プレイヤーにHPダメージが発生しない場合も発動します。未指定なら通常フック。

- epDamageTakenMultiplierPerOrgasm：正の数値、省略1。被EPダメージへ「設定倍率 ** プレイヤーのラン累計絶頂回数」を乗算します。部位別の初期絶頂回数とは独立し、戦闘を越えて保持、newGameでリセットします。カード自傷にも適用され、既存の丸め規則・receivedEpDamageによる固定値処理は維持します。
説明文には {relicEpDamageMultiplier} を記述でき、当該レリックの現在倍率に置換します（戦闘・報酬画面共通、小数点以下3桁まで、不要な末尾0は省略）。実ダメージの計算精度は変更しません。倍率用のラン累計絶頂回数は部位別絶頂合計とは別で、複数部位の同時絶頂でも1回加算します。デバッグの「能力値操作」→「累計絶頂回数（感度倍率用）」で直接編集でき、部位別の成長記録は変更しません。

- idleOrgasmsRule：turns・status・stacksを指定（回数・量は正の整数）。現在の戦闘で直前の指定数の完了ターン全てに絶頂がなければ、未付与の状態をターン開始時に付与します。履歴不足では発動せず、履歴は次の戦闘に持ち越しません。付与は状態のturnStartフックより前なので、新しい状態もそのターンから発動します。

発情状態の継続・解除はSTATUS_DESCRIPTIONS.TurnedOnで編集します。remainによる戦闘間引継ぎ、consumeEachTurnによる自然消費、singleStackによる再付与防止を組み合わせ、turnStartで状態付与、playerOrgasmで自身をremoveStatusする構成です。契約の淫紋の効果量・判定はRELIC_DEFINITIONS.contractSigil、初期所持順はPLAYER_DEFINITION.relics、チュートリアル中の除外はEVENT_BATTLES.prologue.excludedRelicIdsで設定します。

[rarities.ts](../../src/data/rarities.ts) のREWARD_RARITY_DROP_RATESはRarityに対する**抽選重み**です。0～1の発動確率とは異なり、重みの合計を基に抽選します。報酬枚数、除外レアリティ、重複排除の規則はRewardScene側にあり、この表だけでは変更できません。

## デバッグで状態を設定する

デバッグモード中は戦闘の設定メニュー右側から操作します。設定結果は実行中のゲーム状態に反映され、`src/data`の初期設定ファイルは書き換えません。

- **能力値操作**：数値欄をクリックして選択します。Ctrl（MacではCommand）で個別に追加・解除、Shiftで最後に通常選択した欄からの連続範囲を選択、Ctrl+Shiftで範囲を追加します。選択中の行の増減ボタンは選択した全項目に作用します。Ctrl+Cで最後に選択した値をコピーし、Ctrl+Vで選択項目へ一括入力できます。
- **状態異常操作**：Player・敵の対象タブはスクロールしても上部に残ります。開発レベルを変更すると、その部位の累計絶頂回数と累計EPダメージを`PART_SENSITIVITY_LEVELS`の選択レベルの閾値へ合わせます。レベルを下げた場合も両方の累計値を下げ、Lv0では両方を0にします。契約の淫紋用の独立した累計絶頂回数は変更しません。
- **つよつよ**：現在HP・最大HPと現在エナジー・最大エナジーを一括設定します。
- **感度最大**：全部位の開発レベルと前提の累計値、快楽渇望、契約の淫紋用の累計絶頂回数を一括設定します。下位のムラムラ系状態は取り除き、繰り返し押しても重複しません。
- **フルレリック**：`RELIC_DEFINITIONS`に登録されている全レリックを所持します。追加済みのものを重複させず、ランの所持情報と戦闘中の効果・表示も更新します。今後追加した定義も自動で対象になります。

一括設定の数値・状態IDは、デバッグ専用の[debugMode.ts](../../src/debug/debugMode.ts)の`DEBUG_PRESETS`で変更できます。開発レベルの前提値は通常の成長設定から取得するため、デバッグ側に閾値を複製する必要はありません。


---

元ファイル: `docs/manual/cards.md`

# カードと説明文

[目次](../manual/README.md) / [全入力項目](../manual/reference-types.md#carddefinitioninput) / [効果](../manual/effects.md)

## カードを登録する

編集先は [cards.ts](../../src/data/cards.ts) の CARD_DEFINITIONS。登録キーがカードIDになり、値は defineCard({...}) で作ります。defineCard内へidを重ねて書く必要はありません。

| 項目 | 必須 | 設定と意味 |
| --- | --- | --- |
| 登録キー / name | 必須 | 一意なカードID、日英表示名 |
| rarity | 必須 | types.ts の Rarity。報酬抽選区分 |
| categories | 必須 | CardCategory配列。先頭は色付きカテゴリ。noMotionは2番目以降 |
| cost | 必須 | 消費エナジー。0以上の整数 |
| effects | 必須 | effect(...)配列。効果がなければ空配列 |
| conditions | 任意 | 使用可能条件。省略／空配列は追加制限なし |
| playCondition | 任意 | 互換用の旧指定。新規はconditions推奨 |
| attackAttribute | 任意 | 個別効果に指定がない時の攻撃属性。省略時strike |
| vanish / temporary | 任意 | 使用時消滅／使用後や手札破棄時に消える一時カード。省略時false |
| description | 任意 | 自動生成以外の文章、または効果参照を含む任意文 |
| textOrder | 任意 | 説明の並び。省略時は入力オブジェクトの記述順から生成 |
| displayNameRules | 任意 | conditionsとnameの組。条件一致による名称上書き |
| flavors | 任意 | イベント別の文章。未指定なら個別追加なし |
| relatedEnemyName / relatedIntrusionPart | 任意 | 原因敵・部位に応じて生成されるカードの表示情報 |
| purgeTargetName / purgeStatus | 任意 | 除去カードの対象名・原因状態ID。通常カードでは不要 |

HP/EPダメージ、回数、自傷、回復、ブロック等の内部集計値はeffectsから生成されます。CardDefinitionに存在するからといって hpDamage や selfEpDamage を追記しません。

例（値は記法説明用）：

~~~ts
sample: defineCard({
  name: l('Sample', '例'),
  rarity: 'common',
  categories: ['attack'],
  cost: 1,
  effects: [effect('hpDamage', 'selectedEnemy', 6)],
}),
~~~

カテゴリの表示色は [cardCategories.ts](../../src/data/cardCategories.ts) の CARD_CATEGORY_COLORS、快楽渇望中に使用可能なカテゴリは同ファイルの CRAVING_PLAYABLE_CARD_CATEGORIES です。noMotionは拘束中の使用可否にも関係します。新カテゴリの追加には型・色・必要な制限処理を揃えます。

## 自動説明と任意文

効果、条件、カード挙動から同じ生成器が説明を組み立てます。山札・捨て札・報酬・編集ツールは基礎値、手札は戦闘状況を反映した予測値です。変化した数値だけが強調されます。ランダムは範囲表示し、乱数を先に引きません。

descriptionは任意です。既に効果から書かれる内容を固定文で二重記載しないでください。効果を任意の文章に組み込むには次の参照を使います。

| 記法 | 意味 |
| --- | --- |
| {selectedEnemy.hpDamage.amount} | 対象と効果種別で1件に決まる効果の量 |
| {effect.main.amount} | options.textIdをmainにした効果の量 |
| {effect.main.text} | その効果の自動文全体 |
| amount / times / status / stacks / ratio / base / chance / text | 参照の末尾に使えるフィールド |

~~~ts
// 同種の効果が複数あるときはtextIdで区別。
description: l('Strike for {effect.main.amount} HP damage.',
               '鋭く斬り、{effect.main.amount}HPダメージ。'),
effects: [effect('hpDamage', 'selectedEnemy', 6, { textId: 'main' })],
~~~

任意文で参照した効果の自動文は重複出力されません。参照しなかった効果は自動表示されます。回数・確率・ターン制限など、任意文で未参照の補足は残ります。同一対象・同種効果が複数ある場合はtextIdを一意にしてください。カードの値参照とログの {amount} は別の仕組みです。textIdに空白・ピリオド・波括弧は使えません。

textOrderは description / conditions / effects / categories / vanish / temporary または effect.textId の配列です。**説明順だけを変え、効果の実行順は変えません**。effects配列自体を並べ替えると同じ実行優先度内の順序に影響するので、見た目の並び替えにはtextOrderを使います。

不動・消滅・一時カードは常に説明の末尾にまとめます。複数語は日英それぞれの区切りで1行にします。

## 手札での補正と注意点

- arousalグループの状態付与は、現在状態からの強化・据え置き・付与不能まで予測して説明します。状態は予測で変更しません。
- 手札で最終的なEP自傷が0の場合、その自動説明行を表示しません。基礎値表示では、固定の正のEP自傷が1未満なら切り捨ての注記を付けます。割合係数そのものはこの判定の対象外です。
- description内に直接書いた固定文は、自傷が0でも自動削除されません。全体の出し分けが必要なら効果の自動文またはtext参照を使います。
- 予測は現在の文脈による値です。未確定の確率成功や未来の連鎖を確定結果として表示しません。

## 用語・文章テンプレートを変える

[cardText.ts](../../src/data/cardText.ts) で表示文を調整します。各定数の下位項目は [設定リファレンス](../manual/reference-config.md) にあります。

| 定義 | 編集対象 |
| --- | --- |
| CARD_EFFECT_TEXT | EffectKindごとの自動文。既存の置換キーを維持 |
| CARD_TEXT_TARGETS / CARD_VALUE_BASES | 対象・割合基準の表示名 |
| CARD_TEXT_PHRASES | ランダム、回数、確率、条件、切り捨て等の補足 |
| CARD_CONDITION_NAMES / CARD_CONDITION_OPERATORS | 条件説明の名称と比較語 |
| CARD_SYSTEM_TERMS | block / noMotion / temporary / vanish のname・description |
| CARD_SYSTEM_TERM_COLOR | システム用語色。状態異常用語色とは別 |
| CARD_BLOCK_CARRY_DESCRIPTION | ブロック持越しが有効な時のTips |

状態異常名とTipsはstatuses.tsを参照します。説明欄の改行・用語ホバー処理は表示箇所で共有され、全置換後の文章を折り返します。

### 自動文テンプレート内の差し込み値

CARD_EFFECT_TEXTは次の値を受け取ります。これはdescriptionで使う3要素の参照記法とは別で、テンプレート内では単に {amount} 等と書きます。

| 差し込み値 | 内容 |
| --- | --- |
| amount | 基本量／手札での補正量。ランダム・対象差は範囲になる |
| target | CARD_TEXT_TARGETSによる対象名 |
| each | 手札で対象が複数の場合の「それぞれ」。対象数は攻撃回数とは別に扱う |
| times / repeat | 回数／複数回の場合の乗算付き表記 |
| status / stacks / stackSuffix | 状態名／付与数／複数スタック用の補足 |
| from | 強化前の状態名（upgrade文） |
| ratio / base | 割合設定の百分率／基準名 |
| chance | 百分率に換算された発動確率 |
| card / block | 追加するカード名／ブロックの用語 |

CARD_TEXT_PHRASESは用途に応じて差し込み値が異なります。

| 項目 | 使用する値 |
| --- | --- |
| random / chance / probability / repetitions / repeat / condition | value |
| percent | value、base |
| supplement | target、value |
| upgrade | target、from、status |
| unchanged / blocked | target、status |
| energyGain / energyLoss | amount、repeat |
| fractionalSelfEpDamage / keywordSeparator / turnOnly / turnStart / eachTarget | 差し込みなし |

CARD_SYSTEM_TERMSのnameとdescriptionは両方必須です。CARD_CONDITION_NAMESとCARD_CONDITION_OPERATORSは該当型の全キーに表示文を定義します。

### HP・EP割合の使用条件

hpPercent／epPercent条件のvalueは百分率で指定します。たとえばvalue: 50は50%の条件として評価され、カード説明にも50%と表示されます。日本語の大小比較は「HP割合 50% 以下」のように数値の後へ比較語を置き、英語や等号・不等号記号は演算子を数値の前に置きます。効果の割合指定（setEpRatio等の0～1）とは単位が異なります。


---

元ファイル: `docs/manual/assets.md`

# 画像・スプライト・立ち絵

[目次](../manual/README.md) / [全項目](../manual/reference-types.md) / [描画品質・演出時間](../manual/presentation.md)

## 立ち絵のEP演出・淫紋位置

[characterPortraits.ts](../../src/data/characterPortraits.ts) の `CHARACTER_PORTRAITS[画像ID]` に指定します。配置の `displayHeight` は引き続き必須で、以下は任意です。

| 項目 | 指定内容 | 省略時 |
| --- | --- | --- |
| epPoints | 部位ID M/B1/B2/C/V/A → `{ x, y }`。部位ごとに省略可能 | 省略部位は同ファイルの `DEFAULT_PORTRAIT_EP_POINTS`（画面基準）。B1/B2はBの既定位置 |
| sigilPoint | `{ x, y }`。淫紋の中心位置 | 淫紋演出を表示しない |

個別に指定する `epPoints` / `sigilPoint` のx/yは両方必須で、画像左上を0,0、右下を1,1とする比率です。画像の実寸pxや画面座標ではありません。表示倍率・Offset・戦闘中の揺れや位置変化に追従します。文字列参照の立ち絵はこれらの位置も参照元と共有します。Bダメージのハート総数はB1/B2に同数ずつ分け、奇数時はB1を1個多くします。旧形式の `B` 座標はB1/B2の共通位置として互換表示します。チュートリアルなどで淫紋を出さない画像には `sigilPoint` を書かないでください。

未設定部位の既定位置は画像内ではなく、画面の立ち絵表示範囲を基準にします。Yは状態異常欄の下端から画面下端まで、Xの中央は立ち絵の基準X位置です。`DEFAULT_PORTRAIT_EP_POINTS` の比率で位置を決め、画像サイズ・倍率・Offset・揺れには追従しません。部位ごとに個別指定と既定位置を混在できます。

```ts
Example_normal_idle_1: {
  displayHeight: 700,
  epPoints: { M: { x: 0.48, y: 0.2 }, V: { x: 0.5, y: 0.66 } },
  sigilPoint: { x: 0.5, y: 0.6 },
},
```

ツールの「キャラクター立ち絵」→画像→「EP演出・淫紋の位置」でラジオボタンから対象を選び、**画像全体**の窓をクリックします。「B」はB1/B2、「C/V/A」はC・V・Aを同じ座標へまとめて設定し、その後に個別のラジオボタンで一部だけ上書きできます。右のゲーム画面にも位置マーカーが表示されます。未設定部位は画像全体の窓には表示せず、ゲーム画面側だけに既定位置を表示します。「淫紋位置を設定」をオフにすると淫紋位置を削除します。「選択部位を既定位置へ」は選択中の部位の上書きを削除し、淫紋を選択中なら淫紋を無効にします。

「EP演出・淫紋の位置」の便利機能は通常モード・部位指定モードの両方で使えます。

- **一つ上と同じにする**：`CHARACTER_PORTRAITS`の実装順で直前の立ち絵から、全EP部位と淫紋位置をプレビューへコピーします。検索による絞り込みは順序に影響しません。コピー元に編集中のプレビュー値があれば優先し、参照定義の場合は参照元の設定を使います。先頭項目では無効です。
- **設定値をコピー／設定値をペースト**：現在のプレビューの全EP部位と淫紋位置をツール内に保持し、別の立ち絵へ貼り付けます。コピーはページを再読み込みするまで保持します。未設定部位や淫紋なしもそのまま置き換えるため、貼り付け先にだけある指定は削除されます。倍率・Offsetはコピーしません。参照定義はコピーのみ可能で、変更する場合は参照元を編集してください。

どちらも本体・下書きへは即時保存しません。プレビューで確認して「プレビュー値を下書きへ反映」を押してください。

「部位指定モードへ」で画面を広く使う専用表示に切り替わります。左端に検索付きの項目一覧、その右に画像全体、右上は「移動・淫紋・M / B・B1・B2 / C/V/A・C・V・A」のラジオ選択と座標・淫紋有無、右下はゲーム画面と「実装値に戻す」です。一覧の幅は画像全体の窓を狭めて確保します。一覧のクリック・上下キーでモードを保ったまま別の立ち絵へ移動でき、項目選択時は一覧のスクロール位置を維持します（部位指定モードでは選択項目への自動スクロールはしません）。画像ごとの編集中の座標は保持されます。立ち絵以外の定義を選ぶと通常表示へ戻ります。画像はホイールでカーソル位置を中心に拡大縮小、右ドラッグで移動、「全体に合わせる」で表示倍率と移動をリセットできます。このズームは確認用で、保存するdisplayHeightや座標は変えません。左クリックで選択部位の座標を指定します。「移動」を選ぶと画像全体窓のカーソルが移動用になり、設定済みの座標マーカーを左ドラッグで動かせます。同じ座標の部位・淫紋はまとめて移動し、別の座標や未設定の部位は変更しません。移動範囲は画像内に制限し、ゲーム画面側のマーカーにも即時反映します。「通常モードへ」またはEscで戻れます。モード切り替えで編集中の座標は失われず、専用表示の下部からも「プレビュー値を下書きへ反映」を実行できます。


変更は画像ごとに一時保持されます。「プレビュー値を下書きへ反映」後、本体へ適用してください。「実装値に戻す」は配置と演出位置を本体の保存値へ戻します。ハートの大きさ・飛び方・淫紋の時間は [演出設定](../manual/presentation.md#epハートと立ち絵の淫紋) を参照してください。

### 戦闘中の立ち絵タッチ

戦闘中のタッチ対象には、その画像で明示した `epPoints` と `sigilPoint` だけを使います。`DEFAULT_PORTRAIT_EP_POINTS` へのフォールバックしかない画像・部位はタッチできません。Mより上の不透明部分は頭として扱い、Mの円形判定内はMを優先します。B1/B2はどちらもBタッチです。

判定半径や振動・沈み込み・淫紋の段階差は [portraitTouch.ts](../../src/data/portraitTouch.ts) の `PORTRAIT_TOUCH` で設定します。重なった範囲はポインターから近い座標を選び、完全な同距離は淫紋>M>B>C>V>A>頭の順です。タッチ可能な位置だけ指カーソルになります。淫紋・共通部位・頭の回数はそれぞれ戦闘開始時にリセットされ、部位の3回目以降は通常のEPダメージ経路を通るため、ハート・台詞・絶頂処理も通常通り発生します。

## カードの画像とレアリティ縁

[cardAppearance.ts](../../src/data/cardAppearance.ts) を編集します。画像は `image/card/カードID_バトルID.png` に置きます。通常戦闘のバトルIDは `normal`、特殊戦闘は `EVENT_BATTLES` のIDです。画像ファイル名をソース内に指定する必要はありません。

`CARD_ARTWORK` はカードID → バトルID → 配置設定の順です。特殊戦闘用の画像があればその画像とそのバトルの配置を使い、なければ `normal` の画像と配置へ戻ります。両方の画像がなければ黒い背景のままです。配置未登録の画像も、画像中央・自動倍率で使えます。画像をまだ置かず、配置だけ先に登録してもエラーにはなりません。手札・山札・捨て札・拡大表示・報酬で同じ選択方法を使います。

別カードと画像・配置を共有する場合は、配置一覧の代わりに`CARD_ARTWORK`の登録キーを文字列で指定します。

```ts
rubOne: 'rubOneOut',
```

この場合は全戦闘区分で`rubOneOut`の画像と配置を使います。参照先のprologue画像がなければ、参照先のnormal画像・配置へ戻ります。カード名・効果・コスト・レアリティは参照しません。参照の連鎖も使用できますが、参照先の登録は必須で、循環参照はできません。参照元の設定変更は共有先にも反映され、画像ファイルのコピーは不要です。

### 引き抜く・排出の部位別画像

`CARD_ARTWORK_VARIANTS`に、画像を分けるカードIDと部位の配列を設定します。`pullout`はV/A、`purge`はV/A/Mのひな形があります。部位はカード追加元の状態異常（`purgeStatus`）の`epDamageParts`先頭から判定し、敵の現在状態が変わってもそのカードの追加元部位を使います。

| 配置キー（CARD_ARTWORK内） | 引き抜くの画像例 | 排出の画像例 |
| --- | --- | --- |
| normalV / normalA / normalM | pulloutV_normal.png / pulloutA_normal.png | purgeV_normal.png / purgeA_normal.png / purgeM_normal.png |
| prologueV / prologueA / prologueM | pulloutV_prologue.png / pulloutA_prologue.png | purgeV_prologue.png / purgeA_prologue.png / purgeM_prologue.png |
| normal / prologue | pullout_normal.png / pullout_prologue.png | purge_normal.png / purge_prologue.png |

同じ戦闘区分で「該当部位 → 部位なし共通画像 → VARIANTSの配列順の他部位画像」を探し、見つからなければnormalでも同じ順に探します。部位が指定されていない一覧等では共通画像から探します。例：A用・共通画像がなくV用だけあれば、V用画像と`prologueV`の配置を使います。どの画像もなければ背景のみです。配置項目は全て任意で、実際に採用された画像の配置キーが未登録なら画像中央・自動倍率を使います。

ツールの戦闘区分・部位プルダウンで各配置を編集できます。選択した画像が未配置なら配置だけ準備でき、ゲームで使う代替画像・配置キーを案内します。参照カードのプレビューでは代替選択も反映します。

カードIDは `CARD_DEFINITIONS` の登録キーです。例えば `crescentSlash` の通常戦闘画像は `crescentSlash_normal.png` です。

~~~ts
exampleCard: {
  normal: { offsetX: 0, offsetY: 0, rotation: 0 },
  prologue: { focusX: 500, focusY: 500, scale: 0.25, rotation: 0 },
},
~~~

| 画像設定項目 | 必須 | 意味・省略時 |
| --- | --- | --- |
| focusX / focusY | 任意 | カード中心に合わせる元画像上の座標px。左上原点。省略した軸は画像中央 |
| scale | 任意 | 元画像pxに対する等倍カード内の倍率。正の数。省略時は画像領域を覆う倍率 |
| offsetX / offsetY | 任意 | 中央からの位置補正px。右／下が正。省略時0 |
| rotation | 任意 | focus位置を中心とした時計回りの回転角度。度。省略時0 |
| edgeFade | 任意 | 画像四辺を透明にぼかす幅。等倍カード内px、非負。0で無効。省略時CARD_FRAME.imageEdgeFade |

画像は外枠飾りの内側全体に配置され、名前欄・説明欄はその上に重なります。画像は枠内に切り抜かれ、画像の端が枠内にある場合は黒地になじみます。倍率や回転で画像が覆わなくなった部分も黒地です。画像は表示時に読み込み、同じ配置は加工済みテクスチャを再利用します。新規ファイル追加後は開発サーバーの再読み込み／配布ビルドが必要です。

### 編集ツールでの配置調整

「最新の情報に更新」後、「カード画像・レアリティ縁」タブ → `CARD_ARTWORK` → カードIDを選択します。カード編集タブの「カード画像の配置へ」からも移動できます。プレビューの戦闘区分を選び、画像のドラッグで左右・上下位置を変更するか、基準座標・倍率・回転・ぼかし幅を入力します。空欄は省略時の値です。名前・説明欄の重ね表示は切り替え可能で、文字のみ簡略表示です。画像の配置・切り抜き・端のぼかしは本体と同じ処理です。

「画像・配置を参照する」で参照先を選択できます。参照中の配置プレビューは読み取り専用です。画像下の参照元リンクから編集先へ移動してください。「参照をやめて個別配置を設定」は参照元の配置をコピーしますが、その後は自分のカードIDの画像ファイルが必要です。未登録・循環参照は本体適用前に検出します。

「プレビュー値を下書きへ反映」で編集した戦闘区分をまとめて下書き保存し、「本体へ適用・ビルド」で本体へ適用します。プレビュー内の調整だけでは本体を書き換えません。選んだ戦闘用の画像がない時、プレビューは黒地と不足ファイル名を表示します。フォームやTS欄を変更した後は「プレビューを再読込」で読み直してください。この操作やカード／タブの移動では、まだ下書きへ反映していないプレビュー調整は破棄されます。

`CARD_FRAME` の全項目は必須です。`cornerRadius` は角丸半径px、`rimWidth` は四辺共通の縁幅px、`decorationWidth` は内側飾りの線幅px（いずれも非負、カードの半寸法未満）。`background` は背景色0xRRGGBB、`imageEdgeFade` は既定ぼかし幅px（非負）、`textureResolution` は画像・枠の内部描画倍率（正の整数、文字解像度とは独立）です。

`CARD_RARITY_FINISH` は `Rarity` の全種類が必須です。各項目の `base`・`shadow`・`highlight` は必須の数値色0xRRGGBB。斜め方向の濃淡で金属の光沢を表し、同色なら単色になります。

## 状態異常アイコン

画像は`image/icon/Status/状態異常ID.png`に置きます。IDは[statuses.ts](../../src/data/statuses.ts)の`STATUS_DESCRIPTIONS`のキー（大文字小文字も一致）です。パスの登録は不要で、プレイヤー・敵・チュートリアルTipsの強調表示に共通で使います。画像は必要時に読み込み、縦横比を保って従来のアイコン枠内へ収めます。個数は画像の有無にかかわらず右端をアイコン右端に揃え、上方向にだけ半分はみ出して表示します。スタック数は2以上で「×個数」、残りターンは1から「T個数」です。durationTurnsを持つ状態、またはconsumeEachTurnが1でallWhileEnergy消費を持たない状態をターン制と判定します。数値上限はmaxDisplayedStacks、Tips・選択範囲は従来通りです。

各定義の`iconText`直前にある`アイコン画像: … / デザイン案: （ここに記入）`コメントを、画像制作の指示欄として編集できます。感度の開発レベルは`defineSensitivityStatuses`で生成されるため、その`iconText`直前に全画像名の記入欄があります。IDは`ASensitivityLv1`〜`ASensitivityLv5`のように部位（A/B/C/V/M）とLv（1〜5）の組合せで、`SensitivityLevel`自体は画像IDではありません。

画像の共有は、共有先の状態定義に任意項目`iconImage: '参照元の状態異常ID'`を追加します。例えば`Hunger`に`iconImage: 'Starvation'`を置くと`Starvation.png`を使います。参照するのは画像だけで、名称・説明・スタック数・代替表示は共有先自身の定義を使います。参照の連鎖も可能です。循環・未登録IDは不正な設定としてツールで検出し、本体では代替表示へ戻します。

画像が存在しない場合や読み込みに失敗した場合は、その状態自身の`iconText`・`iconColor`で表示します。これらも省略されていれば既存の代替文字・色を使います。画像未配置はエラーではありません。画像追加後は開発画面を再読み込みしてください。配布版へ反映する場合は再ビルドが必要です。

編集ツールでは`iconImage`を状態異常IDのプルダウンで指定し、「定義へ移動」で参照先を確認できます。生成される開発レベルIDも候補に含みます（移動先は生成を含む`STATUS_DESCRIPTIONS`）。画像の見た目は本体で確認します。

## レリックアイコン

画像は`image/icon/Relic/レリックID.png`に置きます。レリックIDは[relics.ts](../../src/data/relics.ts)の`RELIC_DEFINITIONS`登録キーです。状態異常は`image/icon/Status`に分かれているため、同名IDでも画像が衝突しません。フォルダ名の大文字小文字も合わせてください。

状態異常と同じく、`iconText`直前のコメントに画像名とデザイン案の記入欄があります。`iconImage: '参照元レリックのid'`で別レリックの画像を共有できます。状態異常への参照はできません。参照の連鎖は可能ですが、未登録ID・循環参照は不正です。ツールではレリックIDの選択と参照先への移動、適用前の検証に対応しています。

`iconText`・`iconColor`はいずれも任意で、画像がない／読み込めない時の代替文字・背景色です。`iconText`は文字列または`l('英語', '日本語')`、`iconColor`は0xRRGGBBの数値を指定します。省略時は名前の先頭文字と共通の既定色です。画像参照中でも代替表示は参照先ではなく自身の設定を使います。戦闘HUD、報酬画面の所持一覧と獲得候補は同じ画像・文字・色を使います。`counter`が設定されている場合は画像に重ねて表示します。画像未配置・読込失敗の扱いと素材追加後の再読み込みは状態異常と同じです。

### アイコン共通の見た目

[ui.ts](../../src/data/ui.ts)の`ICON_APPEARANCE`を編集します。`Status`・`Relic`ごとの`fallbackColor`は代替背景色、`borderColor`は枠色（0xRRGGBB）、`borderAlpha`は枠の不透明度（0〜1）、`fontSize`・`compactFontSize`は文字サイズpxです。画像読み込み中は個数表示も含めて何も表示しません。画像ファイルが存在しない、または読み込みに失敗したと確定した場合だけ代替表示に切り替え、個別の`iconColor`を優先します。画像を表示したら背景・枠は隠し、レリック画像には`relicGlow`の輪郭発光を付けます。`iconText`は状態異常でも日英テキストを指定できます。

共通の`borderWidth`は枠線幅px、`textColor`・`imageCountStrokeColor`はCSS色、`imageCountStrokeWidth`は画像上の数値の縁取り幅pxです。`fallbackTextLength`・`compactCountThreshold`・`maxDisplayedStacks`は非負整数で、それぞれ省略文字の文字数、文字サイズを小さくするスタック閾値、数値表示上限です。`relicCounter`は中心からの配置補正pxと文字サイズpx・文字色・背景色（CSS色）を設定します。`relicRewardSize`・`relicRewardFontSize`は報酬候補の画像枠サイズと文字サイズpxです。サイズと線幅は非負です。この定数内の項目は全て必須です。

`statusCounter`の`offsetX`・`offsetY`はアイコン右上からの補正px（負数可）、`fontSize`は文字サイズpx、`stackPrefix`・`turnPrefix`は個数・ターンの接頭辞です。`relicGlow.color`は0xRRGGBB、`spread`は通常アイコン表示時の発光距離px（拡大・縮小に追従）（0で無効、有効時は整数へ四捨五入し最小1px）、`angularSamples`は全周の計算方向数（8以上、4の倍数へ切上げ。増やすほど初回の発光画像生成の負荷が増加。描画中の計算量は不変）、`idleStrength`は常時の強度、`activeStrength`は効果発動中の発光ピークの強度（どちらも0以上、0で無発光）です。全項目必須です。画像の輪郭の外側だけに適用し、個数文字や入力用の矩形は発光しません。発動時は拡大を完了してから発光を強め、常時の強さへ戻した後に縮小します。同じイベントで発動条件を満たしたレリックは一度に演出します。戦闘・報酬画面で共通です。画像・表示サイズ・発光設定ごとに小さい発光画像を一度生成して共有し、描画中は不透明度だけを変えます。WebGL・Canvasの両方で表示します。

同じファイルの`ICON_HUD_LAYOUT`で横の隙間`gap`（px、状態異常・レリック共通）、状態異常の列数`statusColumns`（1以上の整数）、行の隙間`statusRowGap`（px）、敵状態アイコンの大きさ`enemyStatusSize`（px）を設定します。全項目必須です。列数を超えると下の行へ折り返します。プレイヤーの開始位置・サイズは`PLAYER_STATUS_HUD_LAYOUT`、レリックは`RELIC_HUD_LAYOUT`を使います。プレイヤー立ち絵の基準位置は折り返しで変動しません。

`relicActivation`は発動演出の設定です。`scale`は1以上の拡大倍率、`growDuration`・`glowRiseDuration`・`glowHoldDuration`・`glowFadeDuration`・`shrinkDuration`は拡大・発光上昇・発光維持・減光・縮小の時間ms（0以上）。全項目必須でCtrl早送りに対応します。演出は戦闘処理と並行して再生し、効果の適用は演出終了を待ちません。演出中の再発動はサイズを維持して現在の発光を終了し、発光を再開します。拡大・縮小途中なら現在のサイズから拡大を完了し、最後の発光が終了してから縮小します。効果の適用順は維持し、条件・確率・対象の判定を通り、効果が実際に成立した時点で演出します。演出専用の再抽選は行わず、同一発動イベント内の同一レリックは一度だけ拡大・発光します。

## スプライトシート

敵は [enemySprites.ts](../../src/data/enemySprites.ts) のENEMY_SPRITES、演出は [sprites.ts](../../src/data/sprites.ts) のEFFECT_SPRITES、UI素材はUI_SPRITESです。共通のSpriteDefinitionを使います。

| 項目 | 必須 | 意味・単位 |
| --- | --- | --- |
| textureKey / animationKey | 必須 | 素材全体で衝突しない登録キー |
| source | 必須 | Viteで解決可能な画像URL。既存のnew URL記法を踏襲 |
| frameWidth / frameHeight | 必須 | シート内1コマのpx。正の整数 |
| frameCount | 必須 | 使うコマ数。左上から行順。シートのコマ総数以下 |
| frameRate | 必須 | fps、正の数 |
| displayWidth / displayHeight | 必須 | ゲーム内の表示px。両方指定、元の比率と違えば変形 |
| repeat | 任意 | 追加の再生回数。省略／0は1回、-1は無限 |

sourceの例：new URL('../../Sprite/example.png', import.meta.url).href。OS上の絶対パスは登録せず、バンドルされる素材パスを使います。敵用sprite(...)ヘルパーは共通シート値を補完します。違う仕様の素材は戻り値を上書きするか全項目を定義します。

### 敵固有設定

opaqueBoundsは必須で、left/right/top/bottom全てを**1フレーム内の座標**で指定します。全コマの不透明部分を含む外接範囲で、左右上下端を含みます。画像変更時は範囲も再測定してください。bodyOffsetY（px、省略0）、attackAnimationTimeScale（攻撃時速度倍率、省略時は速度変更なし）は任意です。

ゲーム実行中に全コマを走査しません。開発時に透明度alpha>8を基準として測定し、定数として保存します。素材チェッカーで設定を確認できます。

敵定義のspriteはENEMY_SPRITESキー。spriteRulesはsprite必須、conditionsとintentIds任意の配列です。両方あれば両方で絞り込み、先頭から成立する差し替えを使います。未成立なら通常spriteへ戻ります。

名前・バー・状態欄・予告・影は不透明範囲に合わせます。クリック範囲だけは行動予告上端～EPバー（なければHPバー）下端、幅は不透明範囲とHPバーの大きい方へ拡張します。画像の透明余白や敵列全体の幅ではありません。レティクルはダメージ振動から独立します。

### 攻撃属性への割り当て

DAMAGE_SPRITE_EFFECTS[AttackAttribute]のspriteIdsはEFFECT_SPRITESキー配列です。必須はspriteIds、depth、alpha、finish。finish内部はduration(ms)、scaleMultiplier、alpha、ease全て必須。

任意のuniqueSpritesをtrueにすると、一回の同時発生内で同じ素材を選ばず、個数も候補の種類数を上限にします。省略時falseです。blackLove属性はこの設定で素材を重複させずにHPダメージ量に応じた個数を再生します。

任意のcountはamountPerSprite・max、scatterはx・y、motionはdistanceRatio・verticalRatio・duration・easeをそれぞれ全て指定します。距離比率は表示寸法に対する比率。alphaは0～1、easeはPhaserのイージング名です。有限演出には無限ループ素材を割り当てないでください。

UI_SPRITESへ追加しただけでは画面に置かれません。再生するUI側からの呼び出しが別途必要です。

## プレイヤー立ち絵の登録と配置

素材はimage/characterへ置きます。[characterPortraits.ts](../../src/data/characterPortraits.ts) のCHARACTER_PORTRAITSは**拡張子なしファイル名**がキー。値は配置オブジェクトまたは別キーを指す文字列です。

~~~ts
Succubus_normal_idle_1: { displayHeight: 700, offsetX: 0, offsetY: 0 },
Succubus_Death_1: 'Succubus_prologue_Starvation_EPdamage_1',
~~~

例の数値は現在の設定値の指定ではありません。

| 項目 | 必須 | 意味 |
| --- | --- | --- |
| displayHeight | 配置オブジェクトで必須 | 共通倍率1での高さpx。幅は元画像の縦横比から計算 |
| offsetX / offsetY | 任意、省略0 | 画像中心X／画像上端Yの補正。表示倍率を掛ける前の座標 |

通常の基準はプレイヤーの中心X、PLAYER_STATUS_HUD_LAYOUTのアイコン下端Y。共通倍率はplayer.tsのPLAYER_PORTRAIT.battleScale。上端基準で拡大します。ダメージ演出の発生位置は画像配置から独立しています。

未登録でも検出されたファイルにはDEFAULT_CHARACTER_PLACEMENTが使われます。この定数は新規追加時の既定値にも使います。登録済みオブジェクトの必須displayHeightを省略するための定数ではありません。

文字列参照は画像・配置を共有します。配置を変えるなら参照元を編集します。多段参照可、循環・存在しない参照は禁止。同じ画像をコピーせず別条件に対応できます。

CHARACTER_IMAGE_DIRECTORYとCHARACTER_IMAGE_EXTENSIONはパスの共通部分です。ただし素材列挙のVite globは静的記述のため、フォルダや拡張子を変える際はportraitAssets.tsとツールの列挙対象も併せて変更します。

## 自動選択のファイル名

基本形は PlayerID_区分_要因_要因_No.png。区分はnormalまたはイベント戦闘ID。区分を省いた名前は共通候補です。Noは1以上の整数のバリエーション番号。要因IDにアンダーバーがあっても辞書で解析しますが、複数に解釈できる命名・同タグ重複・idleとイベントタグの同居は無効です。PlayerIDはPLAYER_DEFINITION.idと一致させます。

要因は [portraitFactors.ts](../../src/data/portraitFactors.ts) のPORTRAIT_FACTORSで有効化します。複数要因はANDです。idleはその区分の通常画像として使用します。

| 配列 | 登録値の参照先・有効な間 |
| --- | --- |
| states | PortraitState。DeathはHP<=0。HPの割合条件とは独立 |
| statuses | STATUS_DESCRIPTIONSのID。所持中／数量閾値成立中 |
| connections | hasInserted / hasIntruded。生存敵の誰かとの該当接続中 |
| relics | RELIC_DEFINITIONSのID。所持中 |
| events | PortraitEvent。HPdamage、EPdamage、orgasm、AftershockBreathの処理解決中 |
| cards | CARD_DEFINITIONSのID。そのターン最後に使用したカード。次カード使用／次ターンで解除 |
| percentComparisons | HP / EP / EPReserve（EPリセット下限）。ファイル名に比較条件を後付け |
| interactions | hover。不透明部分へのマウスホバー。前面UIは貫通しない |

全配列とThresholdOrderは型上必須。使わない配列は空にできます。優先順位は**実データの項目を上から、各配列も前から**です。型定義の並び順ではありません。priorityという別数値はありません。

EPdamageは攻撃開始からバー・振動・絶頂解決まで、絶頂は最大EP到達から下限へ戻るまで。AftershockBreathは対応triggerにportraitEventを指定した処理全体です。上位の成立要因に対応画像があれば割り込み、解消後はまだ成立している以前の候補へ戻ります。候補がない要因だけで画像を消すことはありません。

Aftershocksの所持・個数条件で表示されている立ち絵は、ターン開始時のAftershocks消費演出中、消費前の個数で判定を維持します。例：`Aftershocksgte5`（`Aftershocks_gte5`も同じ）は演出中に5未満になっても、その理由では切り替わりません。全消費演出終了後に現在の個数で再判定します。追加設定は不要です。AftershockBreathなど他の要因は通常の優先順位に従います。

### 閾値の名前

- Aftershocksgte5 または Aftershocks_gte5：その状態のスタック／残りターンが5以上。statuses配列にはAftershocksだけを登録。
- EPgte50per または EP_gte50：現在EPが有効最大EPの50%以上。perは省略可能ですが数値は常に百分率。
- EPReservegte50per または EPReserve_gte50：EPリセット下限が有効最大EPの50%以上。現在EPとは別の値です。
- HP、EP、EPReserve共にgt / gte / lt / lteを使用。eqは非対応。小数の閾値も指定できます。
- Aftershocksだけなら所持の有無。HP・EP・EPReserveだけには閾値がないので、有効な割合条件になりません。
- 状態閾値は状態を所持していることも必要。状態がないときのlte0判定には使いません。

ThresholdOrderは同じ要因・同じ方向の閾値同士でstricter（厳しい条件）／looser（緩い条件）を優先します。上位カテゴリを覆すものではありません。

同条件・同区分に複数番号があればランダムで選び、候補が複数なら直前と同じ画像を避けます。割り込みから戻る際は以前の画像を復帰させます。現在イベント区分の成立候補がなければnormalへ戻します。現在区分のidleが成立する場合、normal側のイベント画像へはフォールバックしません。その後、区分なし共通候補と条件優先度で比較し、同条件なら区分候補を優先します。

### 同じ条件のファイル名を発動順で選び分ける

同じプレイヤー・区分・条件集合で、タグの並び順だけが違う画像（文字列参照も含む）がある場合、先に有効になった条件が前にある候補を優先します。番号は順序判定に含みません。

- `Succubus_prologue_Starvation_rubOneOut_Horny_1`：カード使用後、その効果などでHornyになった場合。
- `Succubus_prologue_Starvation_Horny_rubOneOut_1`：Hornyになってからカードを使った場合。

片方だけなら発動順を問わず使用します。通常の条件優先順位を決めてから同条件内の順序を比較するため、上位の状態異常やイベントへの割り込みを妨げません。全順列を用意する必要はなく、一致する順序がない場合は前後関係の逆転が最も少ない候補を使います。同点の候補・番号違いは従来の抽選と復帰履歴に従います。

戦闘開始時など同じ更新で有効になった条件同士は同時扱いです。一度無効になり再び有効になった条件は新しい発動として扱います。カードは同じカードの再使用でも使用開始時点で順番を更新し、次ターンでは従来どおりカード条件が消えます。`CHARACTER_PORTRAIT_CARD_ALIASES`も適用され、rubOne使用はrubOneOutタグの新しい発動になります。スタック増加で所持が続いているだけなら所持タグの順番は維持し、閾値タグは条件が成立した時点を使います。

追加設定は不要です。ツールの配置プレビューは選択画像を直接表示するため、戦闘中の発動順判定は行いません。順序候補の先読みでは同条件の順序違いも含め、実際の発動前にどちらの画像も準備します。

### ホバー・切り替え・素材追加

hover切り替え中は切り替え前と後の画像の当たり判定を保持し、両方から離れて解除します。安定待ち時間はPLAYER_PORTRAIT_HOVER.delayMs。待機後の切り替え時間はPLAYER_PORTRAIT_RENDERING.transitionDuration。新画像を前半でフェードインし、後半で旧画像をフェードアウトします。

画像一覧はビルド時にViteから取得します。開発中に素材を追加したらツールを更新し、配布版には再ビルドが必要です。ランタイムにOSフォルダを監視する仕組みではありません。命名しただけで新しい要因の評価器が増えるわけではなく、新しい要因種別には型・選択器・ツールの対応が必要です。

## 画像追加時の読み込み範囲

戦闘開始時の立ち絵は、現在のプレイヤー・戦闘区分・状態異常・レリック・HP/EPから選ばれる条件集合と、そのhover候補だけを先読みします。番号違いのランダム候補が同じ集合に複数ある場合は一緒に読み込みます。他の状態の立ち絵は必要になるまで読み込みません。normalや区分なし共通画像は、実際に選択候補になったときだけ対象になります。別名参照の参照元も同じ仕組みで扱います。

敵ターンに入る際と敵行動の実行直前、カード使用が成立した際に、ダメージ演出・状態付与等の効果から候補を先読みします。HP/EP割合の変化は実際のダメージ・回復・数値設定時に判定します。複雑な条件・連鎖効果などで予測できなかった場合も、切替時に必要な画像を読み込みます。待機中は前の立ち絵を残し、完了後に既存のフェードで切り替えます。待機中に要因が解消した画像へ遅れて切り替わることはありません。初めての画像は環境によって表示開始が遅れることがあります。

敵画像は、実際に登場する敵のspriteとspriteRulesで指定した差分のみを読み込みます。新しい敵をデバッグ追加するときも、読み込み完了後に表示されます。背景は現在の戦闘で選ばれた画像、会話は対象のCONVERSATIONS IDに含まれる背景・立ち絵のみが対象です。戦闘中の会話はbattleStartConversationIdとbeforeDrawEventsに指定されたIDを先読みします。共通の攻撃エフェクト・UIスプライトは戦闘用に先読みします。

同じ画像・別名参照はテクスチャキーで共有されます。読み込み済み素材はゲームを閉じるまで再利用するため、再戦や再訪では再読み込みを省略します。フォルダへのファイル追加だけで無関係な戦闘の全画像読み込みが増えることはありませんが、その場で必要になる条件集合やランダム候補を増やした場合は、対応する場面の読み込み量が増えます。

### カード条件をまとめて共有する立ち絵

`characterPortraits.ts`の`CHARACTER_PORTRAIT_CARD_ALIASES`に、`rubOne: 'rubOneOut'`のように「使用カードID: 立ち絵側のカードID」を登録できます。各組は任意で、未登録カードは自身のIDを使います。左右とも`PORTRAIT_FACTORS.cards`へ登録してください。参照の連鎖・循環は不可です。

この例では`rubOne`使用中も、ファイル名に`rubOneOut`が入った立ち絵を選択します。全プレイヤー・戦闘区分・状態異常・hover・ダメージ中・番号違いに共通で適用されます。`CHARACTER_PORTRAITS`には`rubOneOut`側の画像と配置だけを書けばよく、組み合わせごとの`rubOne`参照行や画像コピーは不要です。優先度は参照先カードの`PORTRAIT_FACTORS.cards`内の位置を使います。カード自体の効果・履歴は変更しません。

ツールでは「キャラクター立ち絵」タブの`CHARACTER_PORTRAIT_CARD_ALIASES`で編集します。項目名が使用カードID、値は参照先カードの選択肢です。配置プレビューと位置調整は`CHARACTER_PORTRAITS`の参照先画像で行います。この設定はカード条件の読み替えであり、会話のportraitに指定する架空の画像IDは生成しません。画像名単位の文字列参照は引き続き使用できます。


---

元ファイル: `docs/manual/presentation.md`

# UI・演出・入力設定

[目次](../manual/README.md) / [全設定パス](../manual/reference-config.md)

この章の定数オブジェクトは共通設定です。特記のない数値時間はms、座標と寸法はゲーム画面内px、alphaは0透明～1不透明、数値色は0xRRGGBB、文字列色は#RRGGBBです。現在の値は各ソースを正本とします。

## EPハートと立ち絵の淫紋

[epPresentation.ts](../../src/data/epPresentation.ts) を編集します。ツールでは「EPハート・立ち絵淫紋演出」タブです。

`EP_HEART_EFFECT` は全項目必須です。

| 項目 | 意味・制約 |
| --- | --- |
| imageSources | 静止画像URLの配列。1粒ごとにランダム選択。1件以上必須。素材を配布に含める場合は `new URL('../../image/ui/画像.png', import.meta.url).href` と記述 |
| size / burstRadius | ハート画像全体の表示幅（高さは縦横比を維持）・放射距離px。sizeは正数、burstRadiusは0以上 |
| singlePartMaxCount | 1部位から一度に出すハートの最大個数。敵へのEP攻撃にも適用。0以上の整数、0で非表示 |
| multiPartMaxCount | 2部位以上から同時に出す場合の各部位の最大個数。0以上の整数、0で非表示。同じ座標でも部位が異なれば複数部位として扱う |
| fanAngle | 真上中心の扇の開き角度（0～180度）。粒ごとに方向を分散 |
| curveHeight | 吸収軌道の膨らみpx（0以上） |
| burstEndVariation | 放射終了時点の粒ごとの差。0以上、burstEnd未満、burstEndとの和は0.8以下 |
| burstEnd | ハート移動時間に対する放射終了の割合。`0 < burstEnd <= 0.8` |
| travelDuration | ハート移動時間ms（正数）。EPバーの表示もこの時間だけ遅らせる |
| depth | ハートの描画順。大きいほど前面 |

プレイヤーは実EPダメージを重複しない部位数で割って切り上げた個数を各部位から、敵は実EPダメージを切り上げた個数を中心から出します。B部位の個数はB1/B2へ同数ずつ分け、奇数の余りはB1から1個多く出します。MAX到達で処理が分割されても攻撃全体の切り上げ差分を計算し、各放射時に上記の部位数別上限を適用します。上限は見た目の粒数だけを制限し、EPダメージ量・ゲージの増加時間は変えません。撃破などで適用されなかった残りダメージのハートは出しません。上向きの扇状に広がり、放射の減速中に吸収を重ね、停止せず曲線を描いて加速しバーへ移動します。方向・距離・曲がり・放射終了時刻は粒ごとに変わり、到着時刻は共通です。到着後にゲージが元の補間・速度で増えます。プレイヤーはEPリセット下限の右端、敵はEPバー左端が到着先です。EPが増えない攻撃や単なるEP設定・回復ではハートを出しません。EPの増加・点滅・下限・溢れ・数値表示をまとめて一定時間後に描画します。攻撃間隔やダメージ処理の待ち時間には加算せず、Ctrl早送りにも追従します。love以外の攻撃属性の演出はハートと併用します。

`PORTRAIT_SIGIL_EFFECT` は全項目必須です。`requiredRelic` は `RELIC_DEFINITIONS` のレリックID、`source` は画像URLです。`widthRatio` は表示中の立ち絵幅に対する画像幅の比率（正数）、`duration` は全体時間ms（正数）、`expansion` は終了時の拡大率（正数）、`alpha` は最大不透明度（0～1）です。所持中の絶頂開始時に発火し、[sigilPoint](../manual/assets.md#立ち絵のep演出淫紋位置) が未設定なら表示しません。通常処理と並行して進み、再発動時は前の演出を置き換えます。

立ち絵タッチは [portraitTouch.ts](../../src/data/portraitTouch.ts) の `PORTRAIT_TOUCH` を使います。`radii` は淫紋とM/B/C/V/Aそれぞれの画面px半径、`bodyShake.first/second` は部位1・2回目の横振動、`headSink` は頭の沈み込み、`sigilIntensity` は淫紋の段階ごとの拡大・濃度です。契約の淫紋によるTurnedOn付与でも同じ淫紋演出を再生します。タッチ由来のB部位EPダメージだけは、実際に触れたB1またはB2から全ハートを出します。通常のB部位EPダメージは従来どおりB1/B2へ分配します。

淫紋・EPハート・攻撃スプライト・ダメージ数値などの一時演出は、立ち絵のホバー判定を遮りません。エナジー表示、メッセージログ、状態異常アイコンなど常設UIは従来どおり遮ります。

状態付与時の従来のLoveスプライトは `Sprite/love1.png`～`love5.png` と `data/sprites.ts` の設定を使います。EPダメージの静止ハートとは別です。

位置マーカー以外の専用アニメーションプレビューはありません。ハートとゲージの見え方・淫紋の大きさは本体で確認してください。

## 戦闘背景と登場演出

[battlePresentation.ts](../../src/data/battlePresentation.ts) を編集します。

| 設定パス | 意味 |
| --- | --- |
| BATTLE_BACKGROUNDS.fallback | 既定の背景ファイル。image/background/内の名前 |
| BATTLE_BACKGROUNDS.stages[ステージ番号] | ステージごとの背景 |
| BATTLE_BACKGROUNDS.events[イベントID] | EVENT_BATTLESのIDに対応する背景。ステージ設定より優先 |
| BATTLE_ENTRANCE.playerDuration | プレイヤー立ち絵の回転・フェード時間 |
| BATTLE_ENTRANCE.enemyDuration | 敵1体の下からの出現時間 |
| BATTLE_ENTRANCE.nextEnemyProgress | 前の敵がこの比率まで出現したら次を開始。0～1 |
| BATTLE_ENTRANCE.enemyOrder[敵数] | 画面左から数えた0始まりインデックスを並べた順序 |

両定数の上記トップレベル項目は必須です。stages/eventsに該当キーがなければfallbackへ、enemyOrderに該当する人数がなければ通常順へ戻ります。登場演出は初期状態付与・カードドローと並行し、完了を待って戦闘初期化する方式ではありません。

## UI設定 ui.ts

[ui.ts](../../src/data/ui.ts) の各項目は共通設定として必須です。

| 定数・項目 | 意味・範囲 |
| --- | --- |
| ENEMY_INTENT_COLORS.hpDamage / epDamage | 敵行動予告のHP／EP数値色。攻撃と敵自傷で共通、#RRGGBB |
| ENEMY_INTENT_TEXT.fontSize / numberFontSize | 行動名・区切り／数値の文字サイズpx |
| CRAYON_ANIMATION.redrawDuration | 描き替え全体の**秒数**。非負、0即時 |
| PLAYER_PORTRAIT_RENDERING.transitionDuration | 立ち絵の切り替え全体ms。前半新画像フェードイン、後半旧画像フェードアウト |
| PLAYER_PORTRAIT_RENDERING.smoothingPixels | 表示時平滑化幅px。0無効、大きいほどぼける |
| CARD_TEXT_RENDERING.scaleResolutions | CardTextResolutionPoint配列。cardScaleとresolutionが必須 |
| SELECTION_GLOW.card.usableColor / unusableColor | 選択中の手札が使用可能／使用不可の時の外側発光色。0xRRGGBB |
| SELECTION_GLOW.card.spread | カード等倍時の外側への広がりpx。正の値 |
| SELECTION_GLOW.card.maxAlpha / minAlpha | 脈動の山／谷の不透明度。0～1、minAlphaはmaxAlpha以下 |
| SELECTION_GLOW.card.dimmedMultiplier | 透過カードの光をさらに弱める倍率。0～1。カード本体の透過率も適用 |
| SELECTION_GLOW.card.pulseDuration | 光が弱まり再び強まる1周期。正のms |
| SELECTION_GLOW.enemy.color / spread / strength | 敵の輪郭発光色（0xRRGGBB）／広がり（正のpx）／強さ（非負、0で無効） |
| SELECTION_GLOW.enemy.riseDuration / fadeDuration | 敵の光が広がる時間／消える時間。各々正のms |
| RELIC_HUD_LAYOUT.x / y / iconSize | レリック列の座標とアイコン寸法 |
| PLAYER_STATUS_HUD_LAYOUT.x / y / iconSize | プレイヤー状態欄。下端が立ち絵の基準Yにもなる |
| PLAYER_PORTRAIT_HOVER.delayMs | ホバー開始／解除の安定待ち実時間。0即時、Ctrl短縮なし |
| TUTORIAL_TIP_PRESENTATION.fadeInDuration | 初回の暗転とTipsの出現時間、0即時 |
| TUTORIAL_TIP_PRESENTATION.inputLockDuration | 初回表示からページ送り・終了を禁止する実時間。Ctrl短縮なし |

scaleResolutionsのcardScaleはカード通常表示を1とする倍率、resolutionは1以上の内部文字解像度です。**最も近いcardScaleの設定**を使い、線形補間はしません。配列順は不問です。表示サイズそのものを変える設定ではありません。

PLAYER_PORTRAIT_FLASHはdamageColor、damageCycleDuration、damageFlashCount、orgasmColor、tintRatio、maxTintDurationを全て指定します。通常ダメージ色、周期ms、回数、絶頂色、1周期内の着色割合（0より大きく1未満）、着色時間上限msです。素の画像との点滅で、透明化ではありません。連続絶頂の周期が速くなると着色も短くなります。

クレヨンは初回に一括表示し、同じUIの色・内容・サイズ変更時に描き替えます。短時間に反復するホバー発光では形を作り直しません。Tipsは内容の幅・高さから背景を組み立て、上記定数で個々のTips本文を設定するものではありません。

`src/data/ui.ts` の `END_TURN_PROMPT` は、使用可能な手札がない時のEnd Turn背景の明滅を設定します。`cycleDuration`（必須、正のms）は元の色→濃い色→元の色の1周期で、Ctrl早送り対象です。`minBrightness`（必須、0～1）は最も濃い時の明るさで、1なら色変化なし。背景へのTintのみを変更し、文字色やクレヨンの形状は変更・再生成しません。

手札0枚、または全カードがエナジー不足・拘束・快楽渇望・カード固有条件などで使用不可の場合に明滅します。手札・エナジー・状態変化時にカードの使用可否と同時に判定を更新します。End Turnが押せない間、カード演出・ドロー中、会話・チュートリアルTips・モーダル表示中は明滅せず元の色に戻ります。End Turnへのマウスホバー中も明滅せず通常のホバー色になり、離れた後も条件を満たしていれば明滅を再開します。

## HP・EP・ブロック（流体リボン）

`src/data/ui.ts` の `RIBBON_HUD` を編集します。下表の項目と各配列要素内の項目はすべて必須です。戦闘数値・効果・待機時間を変更する設定ではありません。

| 項目 | 意味・範囲 |
| --- | --- |
| resolution / fps | 内部描画倍率（1以上）／描画頻度（正の整数）。Canvasを再利用。Ctrl早送り対象 |
| nameGap | 名前本文下端とHP本体上端の間隔px（外側筆跡を除く）。バー・立ち絵の位置は変えない |
| hpColors / lowHpColors / epColors | 暗部・基色・光沢の順の3色。各色#RRGGBB。lowHpColorsはHP1/3未満 |
| reserveColors | EPリセット下限領域の上・中・下の3色。各色#RRGGBB |
| blockColors / retainedBlockColors | 通常／持ち越しブロックの光沢・基色・暗部の3色。各色#RRGGBB |
| blockTextColor / retainedBlockTextColor | 通常／持ち越しブロック数値の色、#RRGGBB。淡い縁取り付き |
| retainedBlockRelicIds | `relics.ts` のレリックID配列。どれかを所持すると持ち越し用配色。空配列で切替なし。効果そのものはレリック側で設定 |
| blockRowHeight / blockRowGap / blockTopOffset | ブロック各列の高さ（正のpx）／列間隔（非負px）／HP上端からの補正px（負で上） |
| shieldOffsetX | HPバー左端から盾中心までの横補正px（負で左） |
| blockDuration / blockBreakDuration | ブロック数値の補間／HUDの盾が割れて消える時間、正のms。立ち絵の金属化・盾演出は別途BLOCK_PRESENTATION |
| enemyReleaseDuration | 敵の放出速度の基準、正のms。最初の放出前の待機を省略してMAX到達から開始 |
| enemyPulses[].start / end / remaining | 放出開始／終了の全体比と、その回の放出後残量比。0～1、開始<終了、時間順かつ残量が減る順に並べ、最後の残量は0。配列は1件以上 |
| enemyEjection.streamCount / dropletCount | 放出の線／粒の数、正の整数 |
| enemyEjection.streamWidth / dropletRadius / reach / spread | 線幅／粒半径／右への距離／上下の広がり、非負px |
| playerDrain.fallDistance / outletCount / rightBias | 落下距離（非負px）／流出口数（正の整数）／右への偏り（正数、1で均等、1超で右寄り） |
| playerDrain.minDuration | 溢れ演出の最低時間、正のms。点滅が短くてもこの時間は流し、他の処理は待たせない。次の絶頂で上書き |
| playerDrain.delay / cycle | 流出口ごとの開始遅延（0～1）／周期（正数）。溢れ演出全体を1とする比率。各々 `[最小, 最大]` の2値 |
| playerDrain.radius / drift | 雫半径（正のpx）／横ぶれ（符号付きpx）。各々 `[最小, 最大]` の2値 |

ブロックはHPの上枠に重ね、HP数値の後ろに表示します。幅は最大HP比、最大HP超過分は同じ高さの2列目に折り返します。表示は最大2列で、さらに多い値は盾内の数値で確認します。0なら盾を非表示にします。触手服は持ち越し用の紫色です。

EP下限は斜線と境界線で示し、「下限 n」の追加行は出しません。プレイヤーMAX時は下限より右で雫が流れ、位置・量・開始順を毎回抽選します。下限の上昇で範囲が狭まると流出口が密集します。既存のMAX演出後は下限へ即時復帰します。敵MAX時は残量を右側に寄せて左から空け、右へ放出します。放出を待ってHPドレインを始める方式ではなく、既存のタイミングで並行します。数値・Tipsはゲームの実際の値を示します。

ツールのUI演出タブから編集できます。専用の実戦プレビューはありません。[コンペ](../../tools/ui-competition/README.md) は比較資料として保持し、本体の下書き値には連動しません。

連続絶頂の溢れは、重要な状態変化や開発レベル上昇の通知待機・会話・Tips・設定画面の表示中には新しい周期を開始しません。流れ始めた分は流し切り、処理が再開したら次の周期から再開します。演出のために戦闘処理へ待ち時間を追加することはありません。

## カードの詳細・長押し拡大

手札ホバー中のホイール上回転で小→中→大、下回転で逆に切り替えます。段階はカード間・戦闘間・再起動後も共通のユーザー設定として維持します。カード外やモーダル表示中、操作できない演出中は切り替えません。連続操作は途中位置から最終サイズへ移り、中間サイズでの演出を待ちません。

`src/data/ui.ts` の `CARD_HOVER` は開発側の共通設定です。全項目必須です。`scales` は小・中・大の3倍率（正の値、昇順）。`bottomY` は小サイズ時の下端座標px、`bottomYStep` は1段階ごとの下端Y加算px（中は1倍、大は2倍を加算。正で下、負で上）、`resizeDuration` はホイール切替ms（非負、Ctrl早送り対象）、`overshoot` は拡大時に行き過ぎて戻る強さ（非負、0で超過なし）。周囲の手札の移動量はサイズによらず共通です。`crowdingStartCount`（非負整数）を超える手札では、超過1枚につき `leftShiftPerCard` px（非負）だけ大サイズを左へ寄せ、中サイズは拡大率に比例、小サイズは寄せません。

`src/data/ui.ts` の `CARD_INSPECTION` で設定します。全項目必須です。

| 項目 | 意味・単位 |
| --- | --- |
| detailScale | 一覧の詳細カードの倍率。正の値 |
| holdScale | 手札長押し表示の倍率。正の値。通常カードを1とする |
| detailX / detailY | 山札・捨て札詳細カードの中心座標px。手札長押しは画面中央 |
| progressStartMs | 進捗円の表示開始。非負の実時間ms。これ未満で離すと通常のカード使用 |
| openMs | 長押しで拡大するまでの実時間ms。progressStartMsより大きい値 |
| progressRadius / progressWidth | カーソル周囲の進捗円の半径・線幅。正のpx |
| progressColor / progressAlpha | 進捗円の色0xRRGGBB、不透明度0～1 |
| progressShadow | 背面の影。colorは0xRRGGBB、alphaは不透明度0～1（0で非表示）、spreadは線の外側への広がり、blurは縁と端のぼかし範囲（共に非負px、blur=0でぼかしなし）、offsetX/Yは位置補正px。各子項目必須 |
| shadeAlpha | 拡大表示の背面暗転。不透明度0～1 |

進捗は押下開始から計算するため、表示開始時に途中まで進んだ円が現れます。表示開始後、拡大前に離した場合はカードを使用せずキャンセルします。長押しはCtrl早送りでは短縮しません。使用不可カードも確認可能ですが、ドロー中など操作ロック中は開始できません。

手札の拡大表示には手札と同じ計算済み説明を使用します。一覧は従来どおり基本値です。拡大後の最初のボタン解放は閉じる操作にせず、次のクリック（左右・中・サイド）やキー押下で閉じます。閉じる操作は背後の操作に渡しません。

拡大表示を閉じた後は、現在のマウス位置で手札ホバーを再判定します。カード上ならそのカードをホバーし、カード外ならピック状態を解除します。

## 端末ごとのユーザー設定

言語、会話ウインドウのデザイン・透明度、手札ホバーのサイズ段階、Extraで解放済みのイベント・立ち絵は変更時に自動保存し、次の起動前に復元します。ニューゲーム・プロローグ・タイトルへの移動では初期化しません。ゲーム進捗の保存データとは独立しています。

現行Web版は同じブラウザ・同じサイトのローカル保存領域に `stts.user-settings` として保存します。別PCへ自動共有はしません。サイトデータを削除した場合は初期設定に戻ります。未設定の会話デザイン・透明度は引き続き `CONVERSATION_APPEARANCE` の初期値を使用し、ユーザーが選択済みなら保存値を優先します。保存領域が利用できない場合もゲームは続行し、その起動中は設定を維持します。

保存先の差し替え、設定追加、バージョン移行は [ユーザー設定設計](../user-settings-design-ja.md) を参照してください。

## ランのセーブ・ロードとExtra

戦闘・報酬・独立ノベルの設定メニューから、ランを1～99番へ保存できます。0番は戦闘開始時に更新される緑色の「AUTO SAVE」枠です。1ページは横5列・縦2列、全10ページで、各枠には設定メニューを閉じたゲーム画面の低解像度スナップショットと保存日時、層、HP、EP、該当時はターン数を表示します。画面種別のタイトルは表示しません。上書き、ロード、個別削除には確認が入り、「セーブして終了」は保存を確定した時だけタイトルへ戻ります。画面を開いた時は最後に手動保存した枠のページを表示します。タイトルの「セーブデータから続ける」は1件以上ある時だけ選択できます。

戦闘セーブはプレイヤー・敵・状態・山札／手札／捨て札・ターン・イベント進行・乱数状態を保持します。「戦闘をはじめからやり直す」と戦闘後画面の「直前の戦闘に再挑戦」は0番オートセーブをロードします。プロローグでは再挑戦ボタンを選択できません。セーブ一覧からロードした戦闘も、次の新しい戦闘の開始時オートセーブが成功するまで再挑戦できません（別ランのオートセーブへ戻らないため）。再挑戦そのものは繰り返せます。報酬セーブは提示中のカード・レリックと選択を、ノベルセーブは会話ID・ページ・背景・立ち絵・本文を保持します。現在未実装のマップ／ルート／ボス進捗とマップ用プレビューは将来の保存形式拡張対象です。

戦闘途中の保存では、対象敵に紐づく引き抜く／排出／脱出カード、感覚共有・感度転写、状態異常の期限、表示済みTipsも引き継ぎます。旧形式・補完が必要なセーブは確認を出し、同意後に読める情報を使って再開します。敵編成などが不足する場合は「戦闘開始からやり直す」と付記します。旧形式で対象敵の情報がない追加カードは除外されます。

保存が失敗すると、理由と対処方法をダイアログに表示します。「セーブして終了」でも終了せず、前の保存を残します。ブラウザ版はブラウザ内の保存領域を使うため、保存先パスの指定はありません。解読不能なデータは勝手に上書きしません。バックアップの復元または明示的な全削除が必要です。

確認ダイアログ表示中、キー選択の対象はそのダイアログ内のみです。Esc／右クリックはまず確認をキャンセルし、再度押すと元の画面へ戻ります。Extraの拡大画像もEsc／右クリックで閉じられます。

ニューゲームでは初期状態か、既存の通常ランセーブから「からだの状態」を引き継ぐかを選びます。後者は戦闘をまたぐ状態、部位別EPダメージ累計、部位別絶頂回数、淫紋用絶頂回数を引き継ぎ、HP・EP・エナジーは初期値です。プロローグのセーブしかない場合は選択できません。

Extraのイベント一覧は`CONVERSATION_EVENTS`を先に表示し、縮小サムネイルを後から読み込みます。未解放画像をぼかして画像上へ解放条件を常時表示し、再生終了後はイベント一覧へ戻ります。立ち絵一覧は実画像ファイルをイベント区分ごとの段に分け、一覧では縦横1/3のWebPサムネイルだけを順次読み込みます。中央を含む9枚を重ねて表示し、未表示画像をシルエットにします。左右ボタン・立ち絵上のホイール・左右キー／A・Dで同じ段、上下ボタン・背景上のホイール・上下キー／W・Sで段をアニメーション移動します。移動するのは立ち絵領域だけで、操作ボタンと達成率は固定されます。上下に見切れた隣の段はクリックでも移動できます。表示済みの中央立ち絵はクリック時だけ原寸画像を読み込み、画面内へ拡大表示します。表示条件のヒントは立ち絵ファイル名と状態定義から生成し、ノベル用画像には参照元のイベント名、状態の閾値にはターンまたはスタックの単位を表示します。

イベント・立ち絵一覧の左下には達成率を表示します。未解放項目がある間は右下から全項目を強制解放でき、確認後は「強制解放済み」の刻印を保存します。

セーブ・ロード画面右下の「セーブデータの全削除」は二段階の確認後にランセーブだけを削除します。その下の「ユーザーデータの全削除」は、二段階の確認後にランセーブと端末設定・Extra解放履歴をまとめて削除します。内部形式と保存先は [ランセーブ設計](../run-save-design-ja.md) と [ユーザー設定設計](../user-settings-design-ja.md) を参照してください。

## ブロック演出

[blockPresentation.ts](../../src/data/blockPresentation.ts) のBLOCK_PRESENTATIONは全項目必須です。

| 項目 | 意味 |
| --- | --- |
| gainDuration | 付与時の金属化と反射の全体ms |
| guardDuration / guardShieldDuration | 完全防御時の反射／盾・リング・火花の表示ms |
| breakLeadDuration / fragmentDuration | 亀裂からダメージ演出までの間／破片消失までのms |
| gainSilver / guardSilver / reflectionStrength | 付与時銀色／防御時銀色／反射光の強さ、0～1 |
| reflectionWidth / reflectionSlant | 反射帯の表示範囲に対する幅比／傾き |
| shieldSize | 盾の半幅px。立ち絵サイズから独立 |
| shieldFill / shieldEdge / highlight | 塗り／縁／光の数値色 |
| shieldFillAlpha / edgeWidth | 盾の不透明度／縁幅px |
| riseCount / riseDistance | 上昇光の本数（整数）／移動距離px |
| depth | Phaser表示深度 |

これは演出だけの設定です。ブロック値・保持条件はカードや状態・レリックのeffectで指定します。破片の消失はダメージ演出と並行します。

手札はマウスホバー・キーボード選択のどちらでも同じ発光を使い、選択中にエナジーや使用条件が変われば色も更新します。敵はクリック・キーボード操作で選択先を切り替えた時に一度発光します。敵の輪郭発光はWebGL表示で有効です。これらの演出時間はCtrl早送りに追従します。

## 会話のデザイン・透過度・オート

[conversationAppearance.ts](../../src/data/conversationAppearance.ts) を編集します。

| 定数・項目 | 必須 | 意味 |
| --- | --- | --- |
| CONVERSATION_APPEARANCE.design | 必須 | graphite / paper / night |
| CONVERSATION_APPEARANCE.backgroundOpacity | 必須 | 0透明～1不透明。UIの「透過度」はこれの逆 |
| CONVERSATION_APPEARANCE.showDesignSelector | 必須 | デザイン切替ボタンを表示するか |
| CONVERSATION_THEMES[design].name | 必須 | 管理用日英名 |
| surface / accent / progressColor | 各テーマ必須 | 背景・アクセント・オート進行バーの数値色 |
| ink.quote / narration / user | 各テーマ必須 | 話者別の文字列色 |
| outline | 各テーマ必須 | 文字の縁色 |
| NOVEL_AUTO.baseMs / perCharacterMs | 必須 | 基本待機ms／重み付き1文字あたり追加ms |
| NOVEL_AUTO.latinWeight / japaneseWeight | 必須 | 英字等／日本語等の文字重み |

オート時間はbaseMs + 重み付き文字数×perCharacterMs（実時間）。改行は文字数に含めません。オート・ボタンスキップ中の操作は停止に使い、そのクリックでは次へ進みません。戦闘中の会話にもオート／スキップボタンを表示し、通常会話と同じ操作で利用できます。透過度が半分以上になると操作部を隠し、ポインターが近づくと表示します。

会話ログも同じテーマになります。ログは本文と別の表示領域で、閉じるボタン・枠外クリックで閉じます。戦闘中常設のフレーバーログにはこのテーマ設定を適用しません。

形状はソースのUI実装です。Aの広いクレヨン背景は事前生成素材を使用します。形状そのものを変える場合は [会話設計](../conversation-window-design-ja.md) の再生成手順を参照してください。

## 会話操作・時間

[conversations.ts](../../src/data/conversations.ts) のCONVERSATION_WINDOW.openDuration / closeDuration / backgroundDimDuration、NOVEL_PRESENTATION.fadeInDuration / fadeOutDurationは必須のms設定です。

NOVEL_CONTROLSのadvance・log・hideはそれぞれkeys、buttons、wheelが必須。keysはKeyboardEvent.codeの配列（KeyZ、Enter等）、buttonsは0左・1中・2右・3戻る・4進むの配列、wheelはup / down / none。skipにはkeysとintervalMsが必須です。これはノベル操作の割当であり、戦闘操作全体の割当ではありません。

標準の役割は、進む・ログ・ウインドウを隠す・押下中スキップです。非表示中の進むはまず本文を復帰し、ログ表示要求なら復帰してログを開きます。ログ中の隠す操作はログだけを閉じます。スキップ中はページを早送りし、シーン暗転等はゲーム速度に追従します。

Ctrlを押し続けている場合、新しい会話やチュートリアルTipsが出ても押し直し不要でスキップを継続します。出現演出・入力保護・設定画面などで進行できない間は待機し、進行可能になれば自動再開します。Ctrlを離すか、ゲーム画面がフォーカスを失うと停止します。

戦闘の選択・確定は左クリック。右クリックは設定／戻る／確認ダイアログの「いいえ」。会話が開いているときは会話操作が優先します。キーボード選択の枠はキーボード操作時だけ表示します。

## data以外にある見た目の設定

| 対象 | 定義先 | 注意 |
| --- | --- | --- |
| フォント | [fonts.ts](../../src/ui/fonts.ts)、fontフォルダ | ロード定義と共通フォント名を揃える |
| カード寸法・パーツ配置 | [cardPresentation.ts](../../src/ui/cardPresentation.ts)、[layout.ts](../../src/ui/layout.ts) | 素材設定だけで変更できないレイアウトもある |
| 戦闘ログ種類別の色 | [battleLogStyle.ts](../../src/ui/battleLogStyle.ts) | 会話テーマ色と別 |
| ゲーム速度 | [gameSpeed.ts](../../src/ui/gameSpeed.ts) | 演出時計と入力安定待ちを区別 |

これらは実装側の共通定義です。データ編集ツールのsrc/data用フォームから全てを編集できるわけではありません。

### 一覧画面と透過度の操作

- 戦闘の設定画面を開いたままでも、演出やドローが完了し保存可能になると「セーブ」「セーブして終了」が有効になります。
- セーブ一覧は先に枠と情報を表示し、表示ページのサムネイルを後から表示します。
- Extraのイベント一覧は1ページ6件です。画像は縦横比を保って枠内に収め、下部の前／次ボタンでページを切り替えます。
- 会話ウインドウの透過度バー上では、ホイール下で透過度を5ポイント上げ、上で5ポイント下げます。この操作でメッセージは進まず、ログも開きません。ログ表示中のホイールは従来どおりログのスクロールを優先します。


---

元ファイル: `docs/manual/editor.md`

# 編集ツールの操作・保存・復旧

[マニュアル目次](../manual/README.md) / [内部設計](../data-editor-design-ja.md)

## 起動と編集

1. リポジトリ直下で npm install を済ませます。
2. tools/data-editor/start.cmd を実行するか、tools/data-editor で npm start を実行します。
3. コンソールに出たローカルURLを自分でブラウザに開きます。**ブラウザは自動起動しません**。ポート変更は環境変数 STTS_EDITOR_PORT です。
4. データ種別タブと左の定義一覧から対象を選びます。新規追加、複製、削除、並べ替えは下書きに反映されます。
5. フォームまたはTS欄を編集します。TS欄の内容を反映すると、対応する値はフォームにも逆引きされます。式や参照は無理に文字列へ変えず、定義へのリンクまたはTS欄を使います。
6. 下表からチェック・ビルド・適用を選びます。下書き保存と本体への適用は別です。

ツール更新後は、起動中のコンソールに **`rs` + Enter**（`restart`でも可）でサーバーを再起動できます。コマンドプロンプトの開き直しは不要です。保存・適用・ビルド中なら完了を待ち、保存済み下書きを再読込します。URLが再表示されたらブラウザを再読み込みしてください。プレビューのみの変更は再読み込みで消えるため、先に下書きへ反映してください。終了は `exit` + Enter またはCtrl+Cです。新しい起動方式を導入する最初の一度だけ、既存サーバーを終了してstart.cmdまたはnpm startで起動し直してください。

| 操作 | 対象と動作 |
| --- | --- |
| 入力内容整合チェック | 全下書きの型・必須項目・参照・組合せを検証。本体を書き換えません。 |
| ビルド実行 | 現在の本体ソースで `npm run build` を実行。下書きは適用しません。生成物は更新されます。 |
| ビルドして適用 | 全下書きを検証し、バックアップ・適用・ビルド。失敗時はソースを復元します。 |
| ビルドせず適用 | 全下書きをバックアップして本体へ適用。ビルド・全体整合チェック・生成物の更新を省略。外部変更検出は維持します。 |

ヘルプの「？」は即時表示します。ボタンの用途もホバーで確認できます。ただし左の編集項目一覧にはTipsを表示しません。左一覧をクリックしてフォーカスがある間は、上下キーで表示中の前後の編集項目を選択できます。先頭・末尾では停止し、新規追加・複製・削除の操作ボタンは飛ばします。選択後も左一覧のフォーカスを維持し、項目が見える範囲へだけスクロールします。「このファイルの下書きを破棄」は種別タブ列の右端にあります。破棄前に未反映内容を確認してください。

全タブ共通で、通常の数値・文章は入力確定時に局所保存します。ただし型定義・数値の選択肢・必須項目の自動追加に関わる入力や、構造の変更を含む編集は再解析します。変更後の値を必要とするプレビューや別ファイルを開く際にも解析が必要になる場合があります。配置数値のプレビュー反映でも全体の型チェックや無関係なタブの参照再収集は行いません。要素追加・kind変更は必要なフォーム構造を再解析します。登録キー・ID・表示名など参照候補に影響する変更では候補も更新します。

下書き反映・入力後の再解析・整合チェックなどの処理中も、全タブ共通でタブ切り替え、左一覧の項目選択・上下キー移動、検索、定義への移動、TS表示の切り替えを利用できます。保存は開始時のファイルへ続行され、完了しても移動先の選択を元に戻しません。一度開いたタブの情報は再利用します。初めて開くタブなど新たな解析が必要な表示には読み込み待ちが発生する場合があります。更新処理中の追加・削除・二重反映は制限します。通常の数値・文章の局所保存は従来どおり連続入力を受け付けます。

TS欄の入力はブラウザに保存するだけで、自動解析しません。「入力を解析してフォームへ反映」を押すと、その時点の内容をフォームと下書きへ反映します。未反映入力がある状態で別の項目・タブへ移る際は、破棄確認を表示します。ただし、既に解析・反映を実行中の入力は処理を続けたまま移動できます。承認すると未反映のTS入力だけを破棄して移動し、キャンセルすると入力と現在の表示を保ちます。同じ場所にある「未反映のTS入力を破棄」でも入力を取り消せます。フォームに反映済みの下書きはどちらでも残ります。入力を元の文章に戻した場合も未反映扱いを解除します。整合チェック・本体適用の前には、反映か破棄を選んでください。フォーム変更後にTS表示を見たい場合は「実装結果を更新」を押します。古いTS表示による上書きを防ぐため、表示更新まではTS欄を読み取り専用にします。

## 入力のガードと警告

必須欄の未入力、無効な参照、効果に必要な下位項目不足などは「入力内容整合チェック」「ビルドして適用」の検証対象です。「ビルドせず適用」はこれらを省略します。たとえばkindをstatusにすると状態選択欄が必要になります。ドロップダウンは型と登録データを参照します。

英語欄の日本語文字、台詞以外の括弧、文頭空白、範囲外数値等は警告として表示される場合があります。**警告がないことは、意図した動作を保証しません**。確率などは小数刻みで操作できます。一意性の範囲はデータごとに異なります。

ビルドエラーにはファイルや行位置から対象のタブ・定義へ移動するリンクがあります。解析できない診断はログで確認します。式から生成される定義は、生成結果ではなく生成元を編集します。

## 最新情報に更新

外部でソースや型を変更したら「最新の情報に更新」を使います。選択肢の追加は型・登録情報から取得します。構造の増減や変更は契約差分として通知され、変更ファイル・要素と修正依頼用の文章をコピーできます。

下書きの作成後に同じ本体ファイルが外部で変更されている場合、上書き適用は拒否されます。下書きを退避し、本体との差を確認して取り込んでください。新しい効果の実行ロジックまでツールが自動生成するわけではありません。

## 適用失敗と復旧

「ビルドして適用」は変更ファイルをバックアップしてからソースへ書き込み、ルートの npm run build を実行します。終了コードだけでなく、想定するビルドコマンドとViteの完了メッセージも確認します。失敗・タイムアウト・完了応答不足ならソースを復元し、入力内容は下書きに残してエラーログを表示します。

下書きの標準保存先は tools/data-editor/.state/drafts.json です。STTS_EDITOR_STATE_DIRで変更できるのはこの下書きフォルダです。バックアップは別にtools/data-editor/backupsへ保存します。

| 保存物 | 用途 |
| --- | --- |
| drafts.json | サーバー側の下書き |
| tools/data-editor/backups/配下の操作別フォルダ | 編集前ファイル、journal.json、ビルド実行時のbuild.log |
| ブラウザのlocalStorage | 未反映TS入力等の編集状態 |

復元中にさらに外部変更が見つかったファイルは、外部の編集を守るため自動上書きしません。競合を解消するまで次の適用は止まります。サーバー起動時にも未完了の適用記録を調べて復旧します。復元対象はソースです。生成物 dist 全体を元に戻す保証はありません。

イベント戦闘の `battleStartConversationId` は任意の会話IDです。汎用フォームの会話候補選択・定義移動と、整合チェック時の未登録ID検出に対応します。戦闘開始の再生プレビューはなく、表示タイミングは本体で確認してください。

`CONVERSATION_EVENTS`は汎用フォームでタイトル・区分・一覧表示有無を編集できます。登録キーは`CONVERSATIONS`の会話IDと一致させ、整合チェックで未登録会話と区分外の値を検出します。Extra画面のぼかし、サムネイル、解放条件文、カルーセルは本体専用表示のため、編集ツール内プレビューの対象外です。

## プレビュー

立ち絵のEP部位位置・淫紋位置も編集できます。部位を選んで画像全体の窓をクリックすると画像基準の比率座標を保存し、ゲーム画面窓へ変換して表示します。未設定部位の既定位置は画面基準で、ゲーム画面窓だけに表示します（画像倍率・Offsetに追従しません）。B1/B2とC/V/Aの一括・個別指定、淫紋位置なし、既定位置への復帰に対応します。演出位置も配置と同じく画像ごとに一時保持し、「実装値に戻す」「プレビュー値を下書きへ反映」の対象です。参照画像の演出位置は参照元へ移動して編集します。詳細は [立ち絵の演出位置](../manual/assets.md#立ち絵のep演出淫紋位置) を参照してください。

「EP演出・淫紋の位置」の便利機能は通常モード・部位指定モードの両方で使えます。

- **一つ上と同じにする**：`CHARACTER_PORTRAITS`の実装順で直前の立ち絵から、全EP部位と淫紋位置をプレビューへコピーします。検索による絞り込みは順序に影響しません。コピー元に編集中のプレビュー値があれば優先し、参照定義の場合は参照元の設定を使います。先頭項目では無効です。
- **設定値をコピー／設定値をペースト**：現在のプレビューの全EP部位と淫紋位置をツール内に保持し、別の立ち絵へ貼り付けます。コピーはページを再読み込みするまで保持します。未設定部位や淫紋なしもそのまま置き換えるため、貼り付け先にだけある指定は削除されます。倍率・Offsetはコピーしません。参照定義はコピーのみ可能で、変更する場合は参照元を編集してください。

どちらも本体・下書きへは即時保存しません。プレビューで確認して「プレビュー値を下書きへ反映」を押してください。

「部位指定モードへ」で画面を広く使う専用表示に切り替わります。左端に検索付きの項目一覧、その右に画像全体、右上は「移動・淫紋・M / B・B1・B2 / C/V/A・C・V・A」のラジオ選択と座標・淫紋有無、右下はゲーム画面と「実装値に戻す」です。一覧の幅は画像全体の窓を狭めて確保します。一覧のクリック・上下キーでモードを保ったまま別の立ち絵へ移動でき、項目選択時は一覧のスクロール位置を維持します（部位指定モードでは選択項目への自動スクロールはしません）。画像ごとの編集中の座標は保持されます。立ち絵以外の定義を選ぶと通常表示へ戻ります。画像はホイールでカーソル位置を中心に拡大縮小、右ドラッグで移動、「全体に合わせる」で表示倍率と移動をリセットできます。このズームは確認用で、保存するdisplayHeightや座標は変えません。左クリックで選択部位の座標を指定します。「移動」を選ぶと画像全体窓のカーソルが移動用になり、設定済みの座標マーカーを左ドラッグで動かせます。同じ座標の部位・淫紋はまとめて移動します。別の座標や未設定の部位は変更しません。移動範囲は画像内に制限し、ゲーム画面側のマーカーにも即時反映します。「通常モードへ」またはEscで戻れます。モード切り替えで編集中の座標は失われず、専用表示の下部からも「プレビュー値を下書きへ反映」を実行できます。


- スプライト：フレームサイズ、フレーム数、fps、表示寸法、不透明範囲を確認し、明示的に下書きへ反映します。素材用スプライトチェッカーは左の専用項目から開き、任意のローカル画像を試すだけで本体には保存しません。
- 立ち絵：画像全体の窓と、その約3倍幅のゲーム配置窓を並べます。ゲーム内の画像を左ドラッグするとoffsetX/Y、左の縦スライダーを動かすとdisplayHeightが変わります。数値欄でも入力できます。調整後の3値は立ち絵ごとに一時保持されます（ツール画面の再読込まで）。AからBへ移るとB自身の配置（調整済みならBの一時保持値）を表示し、Aへ戻るとAで調整中だった値を復元します。「実装値に戻す」は選択中の立ち絵だけを**本体ソースの配置**へ戻し、他の立ち絵の調整値は変えません。未適用の下書き値ではなく本体の値です。新規で本体に未登録なら本体の既定配置を使います。「プレビュー値を下書きへ反映」は現在選択中の立ち絵だけを更新します。参照画像は調整・比較はできますが、保存する場合は参照元へ移動してください。画像参照の説明は窓の下にあり、参照元名から元の配置編集へ移動できます。確認窓は配置の目安で、戦闘演出を完全再現するものではありません。
- カード：共通説明生成器による日英の基礎値プレビューです。実戦の全補正を再現するものではありません。
- カード画像・レアリティ縁：`CARD_ARTWORK`のカードを選び、戦闘区分ごとに配置・回転・倍率を調整します。枠とレアリティ色の下書きもプレビューへ反映します。`CARD_RARITY_FINISH`の各色と`CARD_FRAME.background`はカラーピッカーで設定できます。
- End Turnの明滅・ホバー拡大・長押し拡大：UI演出タブの`END_TURN_PROMPT`、`CARD_HOVER`、`CARD_INSPECTION`を編集します。全項目が必須で参照IDの選択はありません。`scales`は小・中・大の正の倍率3個を昇順で指定し、`openMs`は`progressStartMs`より大きくします。倍率の符号・不透明度・時間などの範囲外は警告、倍率の個数不足や長押し時刻の逆転は整合チェック対象です。進捗円と影の色はカラーピッカーでも指定できます。これらの動作専用プレビューはありません。立ち絵プレビューの手札は通常配置の簡略表示なのでホバー・長押し設定は反映しません。動作・サイズ・影はゲーム内で確認してください。
- 選択時発光：UI演出の`SELECTION_GLOW`を開くと、下書き値でカードの脈動と敵の一度きりの発光を確認できます。敵は仮の輪郭による概略表示です。ゲーム内のWebGL描画の確認は実機で行ってください。

チュートリアルTipsの`pages[].highlightPlayerStatuses`は状態異常IDを選択する配列です。「定義へ移動」で説明元へ移動できます。Tips全画面のプレビューはなく、強調・ホバー説明の動作はゲーム内で確認してください。`BattleEventContext.cardSelfEpDamagePlan`などの実行時情報は手入力する設定ではありません。

ファイル追加・変更時は周囲の引用符、キー表記、インライン／複数行形式をなるべく引き継ぎます。複雑な式を含む場合はTS表示も確認してください。ツールは単独フォルダとして削除可能で、本体の起動・ビルドには依存されません。

流体リボンはUI演出タブの `RIBBON_HUD` で設定します。汎用フォームで色配列・放出段階・ランダム範囲を編集でき、`retainedBlockRelicIds` はレリック選択と定義移動に対応します。色3個、範囲2値の順序、放出段階の時間順・減少順・最終残量は整合チェック対象です。数値の範囲外は警告します。単位・必須項目は [演出マニュアル](../manual/presentation.md) を参照してください。専用プレビューはなく、本体で確認します。保存済みのコンペは本体の変更に連動しません。

`RIBBON_HUD.playerDrain.minDuration` は溢れ演出の最低時間（必須、正のms）です。汎用数値フォームと範囲警告で編集でき、点滅後の継続と再発動時の上書きは本体で確認します。

## 本体変更後のツール追従確認（開発者向け）

`node tools/data-editor/check-contracts.mjs`は本体と対応済み定義の差分を表示する読み取り専用コマンドです。差分ありは終了コード1、差分なしは0です。フォーム・ヘルプ・参照・入力制約・保存形式・関連プレビューを確認し、必要な修正後に確認した項目だけ`schema-baseline.json`へ反映します。単位や意味だけの変更は定義差分では検出できないため、別途確認します。作業手順はリポジトリの`AGENT.md`に定めています。

状態異常の`visuals.applied`は汎用フォームから編集できます。静止ハート画像の配列・表示幅・放射距離・移動時間は「EPハート・立ち絵淫紋演出」タブで編集します。移動時間はEP表示の遅延にも適用されます。状態付与のLoveスプライトの再生設定は「エフェクト・UIスプライト」タブにあります。EPハートの吸収と状態付与演出の組み合わせは本体で確認してください。

EPハートの扇角度・曲線幅・放射終了時点のばらつきは「EPハート・立ち絵淫紋演出」で設定します。BlackLove属性とuniqueSprites（同時発生時の素材重複防止）は汎用フォームで編集でき、シート単体は既存のスプライトプレビューで再生できます。複数の飛行軌道・発生数の見え方は本体で確認します。

