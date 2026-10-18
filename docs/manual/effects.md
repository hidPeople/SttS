# 効果・条件・フレーバー

[目次](README.md) / [全項目・選択肢](reference-types.md)

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
| inspectDeck | 閲覧枚数1～10、player、takeCount必須 | 上から閲覧しtakeCount枚を手札、残りを任意枚数捨て札へ。候補不足なら存在枚数まで。確定ボタンで反映。選ばないカードの順番は維持 |
| exhaustHandDraw | 0、player | 手札から任意枚数を戦闘中除外し、同枚数を通常ドロー。選択0も可 |
| removeGeneratedCards | 0、player | 手札・山札・捨て札から戦闘中生成されたカード個体を除外。一時カード指定やレアリティとは独立 |
| transformGeneratedCards | 0、player、cardId必須 | 手札の生成カードを指定IDへ変換。同IDは除外。生成情報を維持し、元の敵との紐付け・個体成長は破棄 |
| chooseEffect | 0、player、choicesとtextId必須 | player対象のdrawCards・block・energyGainを2～3件から選択。任意のgrowthUses回まで未選択効果に基本amountを加算。カード個体の成長にはカード使用文脈が必要 |
| clearConnections | 0、敵対象、connectionParts必須 | M/V/Aの指定部位の挿入・侵入を全解除。解除状態に紐付く引き抜く・排出も全ゾーンから除外 |
| addCardToHand | 非負の整数、player、cardId必須 | 指定カードを追加。特殊派生はcardAddVariant |
| status | 正の付与量、status必須 | stacksがあればamountより優先。状態定義の付与制約に従う |
| removeStatus | 0、statusまたはstatusGroup | 指定状態／排他グループを解除。状態trigger文脈では元状態を使う省略形も可 |
| discardHand | 0、player | 手札全体を捨てる |
| setEp / setEpReserve | 非負、player | 現在EP／下限を固定値へ。切上げ後に有効最大EPまで制限 |
| setEpRatio / setEpReserveRatio | 0～1、player | ratioBaseの値×amountを切捨てて設定。省略基準はplayerMaxEp |
| retainBlock | 0、player | ターンをまたぐブロック保持 |

EP直接設定は絶頂を発生させません。現在EPを下限より下へ変更すると下限も下がり、下限を現在EPより上へ変更すると現在EPも上がります。ratioBaseは playerMaxEp / playerCurrentEp / playerEpReserve（いずれも実行直前の値）。繰り返しなら毎回基準値を取得します。

### 効果の追加項目

上記の選択・生成カード操作・接続解除の6効果は、`times`を省略または1にします。chance・perStack・percentOf・randomAmountは使いません。`takeCount`は1～閲覧枚数の整数、`growthUses`は0以上の整数（省略0）、`connectionParts`はM/V/Aから1件以上を指定します。

| options内の項目（全て型上任意） | 意味・省略時・参照先 |
| --- | --- |
| targetConditions | 対象ごとのConditionDefinition配列（AND）。省略時制限なし。selectedEnemyは解決対象の敵 |
| sensitivityPart | copyEpSensitivityで参照するEP_DAMAGE_PARTSの単一部位 |
| textId | カード内一意の説明用ID。[カード説明](cards.md)で参照 |
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

共通文は [flavorCatalog.ts](../../src/data/flavorCatalog.ts) のGLOBAL_FLAVORS、個別文はカード・敵行動・状態・レリック・trigger・effectのflavorsへ設定します。キーは [types.ts](../../src/models/types.ts) のFLAVOR_EVENTS。全イベント名は [定数リファレンス](reference-config.md) を参照してください。

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

レリックの`comboRules`から実行キューへ積まれる効果も、初回適用時に定義側の`Relic.Trigger`を呼びます。全体対象では1回、ランダム対象では選ばれた敵を`selectedEnemy`に渡します。対象となるルールと表示単位は[レリックのコンボ設定](combatants.md)を参照してください。

`generatedExhaustDamage`は複数枚を一括除外してもフレーバーを除外処理ごとに1回へまとめます。最初に効果が適用された敵が`selectedEnemy`となり、各枚数分のEP攻撃・抽選はそのまま実行します。

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
| Card.Play | enemyWillOrgasm、playerWillOrgasm、playerSelfEpDamage、playerOrgasmsThisTurn（0以上の整数） |
| Card.Resolved | playerCummed（プレイヤーが実際に絶頂したか）、enemyCummed（いずれかの敵が実際に絶頂したか）。いずれも真偽値 |
| Battle.EnemyOrgasm（カード側flavors） | 実際に敵絶頂を起こしたカードの文章。対象はその敵。Card.Play時のplayerWillOrgasm等の予測値を引き継ぐ |

Card.Playの予測は現在の補正・確定する最小ダメージに基づき、確率効果や将来の連鎖を先に実行しません。Card.Resolvedはカード効果・反応・絶頂・除去処理等が終わった後です。そのカードの処理中に増えたプレイヤー／敵全体の戦闘絶頂回数で判定します。enemyCummedは選択中の敵以外や派生効果による絶頂も含み、過去のカードでの絶頂は含みません。実際の結果で分岐したい文章はこちらへ置きます。

`playerOrgasmsThisTurn`は直近の自分のターン開始でリセットされる回数をCard.Play直前に取得します。先行する敵反応で増えた分も含み、通常ドロー／絶頂による回収の経路は問いません。`flavorValue eq 0`で未絶頂、`gte 1`で絶頂済みを判定できます。カード由来の後続イベントにもPlay時点の値を引き継ぎ、カード効果中に増えた分で更新しません。他のイベントでは常時供給される値ではありません。

例：`condition('flavorValue', 'eq', { valueKey: 'enemyCummed', value: false })` は、そのカードの処理中にどの敵も絶頂しなかった時に成立します。playerCummedの条件と同じconditions配列へ並べればAND条件になります。

Battle.EnemyOrgasmでも `condition('flavorValue', 'eq', { valueKey: 'playerWillOrgasm', value: true })` で予測に応じた文章を先に配置できます。この値はカード使用前の予測のままであり、敵絶頂時点の残り効果・連鎖から再計算した未来の確定結果ではありません。quoteとnarrationの両方を分岐させる場合は、条件付き候補に両方のkindを置き、後ろの無条件候補を不成立時に使います。

### 置換文字列と部位名

英語の部位名は文中の名詞句として小文字開始で定義します。`localizeGameText`は置換位置が文頭（引用符の内側や改行後を含む）の場合だけ先頭を大文字化します。本文中の置換と、日本語の表記は変更しません。

| 表記 | 参照・使用範囲 |
| --- | --- |
| {player} / {enemy} / {source} / {status} | 戦闘文脈の表示名。敵は実際の対象／発火元を優先 |
| {intrusionPart} | 敵定義intrusionPartまたは生成カード由来の部位表現 |
| {A}、{partA}等 | BODY_PART_TOKENSの部位名。成長段階に応じて選択 |
| {defaultA}、{defaultVI}等 | BODY_PART_DEFAULT_NAMESの固定名。共通テキストで利用可 |
| {connectionParts} | 敵死亡時のInsert／Intruded部位を原因時点の記録からM/V/A順の既定名で列挙。死亡文以外では未提供 |
| {part} / {defaultPart} | イベントがpartを渡した時の動的部位名／固定部位名 |
| {relicEpDamageMultiplier} | レリック説明用。当該レリックの設定倍率とラン累計絶頂回数から算出する現在の倍率 |
| {aftershocksStacksPerEnergy} | Aftershocksの消費設定から取得。Tipsの固定数値を避ける |
| {amount}、{target}、{card}等 | そのイベントのflavorValuesに渡される値のみ |

任意のキーを書けば値が生成されるわけではありません。未対応キーは文字列に残ることがあります。イベント固有値の正本は [BattleScene.ts](../../src/scenes/BattleScene.ts) のflavorValuesの構築箇所です。条件に使えるのは数値／真偽値であり、任意の文字列比較ではありません。

[bodyParts.ts](../../src/data/bodyParts.ts) のBODY_PART_NAMESはpartとnames（段階0～5の全キー）が必須。BODY_PART_DEFAULT_NAMESはpartとnameが必須。別名の成長参照先はBODY_PART_STAT_PARTで対応付けます。別名追加時はBODY_PART_ALIASESと両方の名前定義・対応表を揃えます。動的なpartの固定名には {defaultPart} を使い、入れ子の {default{part}} は使いません。

### 繰り返し・反撃・資源変換

| kind | 対象 / amount | 条件付き必須 | 任意設定と動作 |
| --- | --- | --- | --- |
| repeatSequence | player / 最大巡回数（正の整数） | sequence（EffectDefinition配列、1件以上） | hpCostは1巡ごとの直接HP消費、省略0。statusCostはstatus（STATUS_DESCRIPTIONSのID）とamount（個数）の両方が必須。カードのconnectionで生存対象が見つかり、HPを払った後1以上残り、状態個数が足りる間だけ続行。sequenceは記載順で最後まで解決してから次巡を判定。繰り返しの入れ子は編集ツールで拒否 |
| blockToHpDamage | 敵 / 消費割合（0より大きく1以下） | なし | 自身の現在ブロック×割合を切り上げて一度消費。消費量を通常のHPダメージとして対象へ与える。敵のブロックは有効。attackAttributeで演出指定 |
| epReserveGain | player / 加算量 | なし | percentOfを付けると割合加算。リセット下限の上限まで増加し、現在EPがそれ未満なら同値へ上げる。EPダメージとして扱わず絶頂を起こさない |
| retaliation | 敵 / 反撃EP基本量 | selfAmount（反撃時の自身へのEP基本量） | 次の自分のターン開始まで、対象敵の行動によって実際にEPダメージを受けるたび反撃。同じ攻撃部位へ自傷。複数適用は独立に加算し、反撃自体では再発動しない。EPなしの敵には無効 |

`unlessPlayerOrgasm`は任意の真偽値。trueにしたカードの効果は通常効果の後へ並び、使用開始からその時点までにプレイヤーが絶頂していなければ実行します。説明にも条件を追加します。敵行動や単独レリックに付ける設定ではありません。

`repeatSequence.flavors[FLAVOR_EVENTS.Effect.Trigger]`は各巡の**コスト支払い前**に評価されます。HP条件は消費前のHPです。下位sequenceの効果にも通常どおりflavorsを設定できます。最大回数・途中終了条件を台詞で決める必要はありません。

自動説明テンプレートには`hpCost`・`statusCost`・`costStatus`・`sequence`・`selfAmount`が追加されています。sequenceは下位効果の共通説明、costStatusは状態名です。


`repeatSequence`本体の`times/chance/percentOf/perStack/randomAmount/targetConditions`は使用しません。対応する通常の子効果に設定します。`blockToHpDamage`は固定の消費割合を使い、`times/chance/percentOf/perStack/randomAmount`を使用しません。

### 発声制約のイベント別設定

Gaggedの判定は各イベントの発火時点で行います。Card.PlayだけでなくCard.Resolved、敵絶頂、共通EP反応、状態・敵行動・効果内のquoteも別々に対応します。通常時の発声条件を残した複合条件を置き、無言だった場面に無条件の声を足しません。口が塞がったままの長台詞は短い不明瞭な声か明示した心の声へ切り替え、飢え・脱出・ダメージ強度・連続段階の違いを保ちます。失敗時のsuppressKindsを優先し、quoteだけの差し替えで対象部位に合うnarrationを消しません。接続解除前の引き抜く口上と、解除成功後の発声は区別します。

実行器による一括の文字列変換は行いません。各flavorsへGaggedと既存の条件を組み合わせたquote候補を置きます。平坦なlines配列へ条件付き候補を追加する場合は、元の全候補を一つの無条件linesへまとめ、候補数と抽選対象を保ちます。Faintedによるquote抑止は従来どおりです。


### 個々の文章の条件とEP反応の発生源

`BattleFlavorLine.conditions`は個々の文章の抽選条件です。任意のAND配列で、省略・空配列なら常に候補に残ります。グループのconditionsと行のconditionsをともに満たす行だけを抽選します。あるkindの全行が不成立なら、そのkindは後続グループへ進みます。ただしsuppressKindsによる明示的な抑止は維持します。条件なしの平坦な配列も従来どおり全候補から抽選します。候補の一部だけを発生源で除外したい場合、グループ全体を複製する必要はありません。

`Battle.PlayerEpDamageQuote`では、`epDamageFromCard`／`epDamageFromEnemy`／`epDamageFromRelic`／`epDamageFromStatus`／`epDamageFromSystem`（すべて真偽値）で直接の発生源を区別できます。敵のカード反応はEnemy、レリック効果はRelic、状態効果はStatus、感覚共有の派生やタッチはSystemです。起点を記録するdamageOriginや、引き継がれたcardだけでは判定しません。元のflavorValuesは引き継がず、amount・epDamagePercentOfRangeとこの5値だけを渡します。他イベントではこれらの値を保証しません。

編集先はsrc/data/flavorCatalog.ts等の各flavors、入力型はBattleFlavorLineです。行の条件には通常のconditionを使えます。次の行は共通EP反応のlines内に置く例です。

```ts
{
  kind: 'quote',
  conditions: [condition('flavorValue', 'eq', { valueKey: 'epDamageFromEnemy', value: true })],
  text: l('"What was that!?"', '「なに今の！？」'),
},
```
