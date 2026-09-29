# 効果・条件・フレーバー

[目次](README.md) / [全項目・選択肢](reference-types.md)

## 共通効果 effect

[effectBuilders.ts](../../src/data/effectBuilders.ts) の effect(kind, target, amount, options?) を使います。前3引数は必須。optionsは省略可能ですが効果に応じて必須の内部項目があります。直にEffectDefinitionを書く場合のtimesは必須、effect()なら省略時1です。

対象は player（プレイヤー）、self（実行主体）、selectedEnemy（解決対象敵）、triggerEnemy（フックを発火させた敵）、allEnemies（生存敵全員）。フックに存在しない対象を指定しても敵は生成されません。プレイヤー専用効果にはplayerを指定します。

| kind | amountと必須オプション | 動作・制限 |
| --- | --- | --- |
| hpDamage | 非負の基本量 | HP攻撃。ブロックと補正を適用 |
| epDamage | 非負の基本量。部位指定はepDamageParts等 | EPを増やす。プレイヤーは最終値1未満を実ダメージにしない |
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

EP直接設定はPeakを発生させません。現在EPを下限より下へ変更すると下限も下がり、下限を現在EPより上へ変更すると現在EPも上がります。ratioBaseは playerMaxEp / playerCurrentEp / playerEpReserve（いずれも実行直前の値）。繰り返しなら毎回基準値を取得します。

### 効果の追加項目

| options内の項目（全て型上任意） | 意味・省略時・参照先 |
| --- | --- |
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
| relic | relicIdまたはrelicIds。RELIC_DEFINITIONSのキー。プレイヤーの所持品 |
| enemyTrait | enemyTraitまたはenemyTraits。EnemyTraitから選択 |
| bodyPartStatus | parts必須。bodyPartStatusKindsはinsert/intruded、省略は両方。target省略は生存敵全体 |
| enemyHasBindingAction | 対象敵が拘束付与を含む行動を持つか。現在その行動が使えるかの判定ではない |
| enemyHasEIntents | 対象敵にintents_Eがあるか |
| enemyPeakAftershocks | 敵のPeak余韻中か。誘惑で行動を上書きした後も次の敵行動まで認識 |
| hp / ep / block | 対象の現在値とvalueを比較 |
| hpPercent / epPercent | 対象の現在値÷最大値×100とvalueを比較 |
| cardsPlayedThisTurn | 今ターンの使用枚数とvalue |
| intentUsageCount | その行動の使用回数とvalue |
| playerEpPeaksThisBattle | この戦闘中のプレイヤーPeak回数とvalue |
| aliveEnemyCount | 生存敵数とvalue |
| isPlayerTurn / purgeCausedEpPeak / purgeWillCauseEpPeak | 真偽判定。後2つは除去カードの文脈が必要 |
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
| enemyEpPeak | 敵Peak時のレリックtrigger |
| playerEpPeak | プレイヤーPeakのレリック／状態処理。下限回復は専用集計を経る |
| playerEpPeakRecovered | EPが下限に戻った後の状態trigger |
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

### カードの予測値と確定値

| 文章イベント | 使用できる条件用値 |
| --- | --- |
| Card.Play | enemyWillPeak、playerWillPeak、playerSelfEpDamage |
| Card.Resolved | playerPeaked（カードによって実際にPeakしたか） |
| Battle.EnemyEpPeak（カード側flavors） | 実際に敵Peakを起こしたカードの文章。対象はその敵 |

Card.Playの予測は現在の補正・確定する最小ダメージに基づき、確率効果や将来の連鎖を先に実行しません。Card.Resolvedはカード効果・反応・Peak等が終わった後です。その間のプレイヤー戦闘Peak回数の増分を使います。実際の結果で分岐したい文章はこちらへ置きます。

### 置換文字列と部位名

| 表記 | 参照・使用範囲 |
| --- | --- |
| {player} / {enemy} / {source} / {status} | 戦闘文脈の表示名。敵は実際の対象／発火元を優先 |
| {intrusionPart} | 敵定義intrusionPartまたは生成カード由来の部位表現 |
| {A}、{partA}等 | BODY_PART_TOKENSの部位名。成長段階に応じて選択 |
| {defaultA}、{defaultVI}等 | BODY_PART_DEFAULT_NAMESの固定名。共通テキストで利用可 |
| {part} / {defaultPart} | イベントがpartを渡した時の動的部位名／固定部位名 |
| {relicEpDamageMultiplier} | レリック説明用。当該レリックの設定倍率とラン累計Peak回数から算出する現在の倍率 |
| {aftershocksStacksPerEnergy} | Aftershocksの消費設定から取得。Tipsの固定数値を避ける |
| {amount}、{target}、{card}等 | そのイベントのflavorValuesに渡される値のみ |

任意のキーを書けば値が生成されるわけではありません。未対応キーは文字列に残ることがあります。イベント固有値の正本は [BattleScene.ts](../../src/scenes/BattleScene.ts) のflavorValuesの構築箇所です。条件に使えるのは数値／真偽値であり、任意の文字列比較ではありません。

[bodyParts.ts](../../src/data/bodyParts.ts) のBODY_PART_NAMESはpartとnames（段階0～5の全キー）が必須。BODY_PART_DEFAULT_NAMESはpartとnameが必須。別名の成長参照先はBODY_PART_STAT_PARTで対応付けます。別名追加時はBODY_PART_ALIASESと両方の名前定義・対応表を揃えます。動的なpartの固定名には {defaultPart} を使い、入れ子の {default{part}} は使いません。
