# データ駆動化ToDo

この文書は、未完了のデータ駆動化課題を管理するためのものです。完了した項目は削除せず、[data-driven-done-archive-ja.md](./data-driven-done-archive-ja.md) へ移します。

現行仕様は [battle-data-design-ja.md](./battle-data-design-ja.md) を参照してください。

## 優先度高

### 状態異常の効果をデータ化する

現状の問題:

- `STATUS_DESCRIPTIONS` は名前、説明、timing、remainを持つ。
- しかし状態異常の実効果は `BattleScene` に専用実装されているものが多い。
- 例: Horny/Heat/FrustratedのEPダメージ倍率、RubOneOut追加、EP Peak時解除、Infestedのターン開始EPダメージ、IntrudedのPurge追加。

やること:

- 状態にも `effects` または `triggers` を持たせる。
- `timing` ごとに状態効果を共通実行器で処理する。
- 「EP Peak時に解除」「ターン経過で消費しない」「エナジーがある限り消費」などの消費ルールをデータ化する。

追加したい項目候補:

- `stackConsumeRule: 'none' | 'onePerTurn' | 'allWhileEnergy' | 'onTrigger'`
- `clearOn: EffectTiming[]`
- `epDamageMultiplier`
- `addCardToHand`
- `addCardCount`
- `damageOnTurnStart`
- `removeWhenPurgeSucceeds`

### 共通Effect実行器をカード・敵行動にも本格適用する

現状の問題:

- カードと敵行動は `effects` で定義されるようになった。
- ただし戦闘処理はまだ `defineCard` / `defineEnemyIntent` が生成する互換フィールドを主に参照している。

やること:

- カード使用処理を `effects` 直接実行へ寄せる。
- 敵行動処理を `effects` 直接実行へ寄せる。
- 互換フィールドを段階的に廃止する。
- `EffectDefinition` の `target` と `percentOf` の実行仕様をカード・敵行動・レリックで揃える。

### フックのコンテキストを標準化する

現状の問題:

- `RelicHookContext` は `enemy`, `player`, `card`, `amount` 程度しか持っていない。
- どのダメージ種別か、実ダメージかブロック後ダメージか、EP Peakしたか、使用カードか敵行動かなどが不足している。

やること:

- 共通の `BattleEventContext` を作る。
- フックごとに渡される値を整理する。
- レリック、状態、将来のカード反応効果が同じコンテキストを読めるようにする。

候補項目:

- `source`: `card` / `enemyIntent` / `relic` / `status`
- `sourceId`
- `actor`
- `target`
- `damageType`
- `rawAmount`
- `modifiedAmount`
- `actualHpDamage`
- `blockedAmount`
- `causedEpPeak`
- `cardDefinition`
- `enemyIntent`
- `statusEffect`

## 優先度中

### 使用条件式の汎用化

現状の問題:

- 敵行動には `timesLimit`, `enemyStatusLimit`, `enemyStatusLimitN` がある。
- カードやレリックには同様の条件式がない。
- 「HP50%以下」「EPが一定以上」「手札枚数がN枚以上」などはまだ表現できない。

やること:

- `conditions` 配列を設計する。
- 敵行動、カード、レリックで共通利用できるようにする。

### 報酬抽選ルールのデータ化

現状の問題:

- 報酬カード枚数、レリック提示数、除外レアリティ、重複除外ルールが `RewardScene` 側にある。
- レアリティ出現率だけが `data/rarities.ts` にある。

やること:

- 報酬設定モジュールを作る。
- ステージやマップ深度ごとの報酬テーブルを定義できるようにする。

### 敵抽選ルールのデータ化

現状の問題:

- 敵抽選は脅威度とステージを使うが、合計脅威度や重み付け計算はロジック側にある。
- 「特定敵は単体でしか出ない」「特定敵同士は同時出現しない」などは表現できない。

やること:

- エンカウント設定データを追加する。
- 敵側にも出現制約を追加する。

## 優先度低

### 表示用データの分離

現状の問題:

- カード色、状態アイコン色、略称、レリックアイコン文字などがロジック側にある。
- 外部ツールで見た目を確認・編集しにくい。

やること:

- 状態定義に `iconText`, `iconColor`, `textColor` を追加する。
- レリック定義に `iconText`, `iconColor` を追加する。
- カード定義に `category` や `displayColor` を追加するか検討する。

### 演出指定のデータ化

現状の問題:

- `attackAttribute` による演出選択はある。
- それ以外の回復、ドレイン、盾、MISSなどはロジック固定。

やること:

- 効果ごとに演出キーを持てるようにする。
- 状態付与時、解除時、特殊成功時、失敗時の演出もデータ化する。

## 追加検討したいフックtiming

### 戦闘進行

- `battleEnd`
- `victory`
- `defeat`
- `turnEnd`
- `enemyTurnStart`
- `enemyTurnEnd`

### カード関連

- `cardPlayed`
- `cardResolved`
- `cardExhausted`
- `cardDiscarded`
- `handFullCardDiscarded`
- `cardAddedToHand`
- `cardAddedToDeck`

### ダメージ関連

- `beforeDamageCalculation`
- `afterDamageCalculation`
- `beforeHpDamage`
- `afterHpDamage`
- `beforeEpDamage`
- `afterEpDamage`
- `blockedDamage`
- `blockBroken`
- `hpHealed`
- `epHealed`
- `drainResolved`

### EP Peak関連

- `beforePlayerEpPeak`
- `afterPlayerEpPeak`
- `beforeEnemyEpPeak`
- `afterEnemyEpPeak`
- `epReserveChanged`

### 状態関連

- `statusApplied`
- `statusRemoved`
- `statusStackChanged`
- `statusConsumed`

### 敵関連

- `enemySpawned`
- `enemyIntentSelected`
- `enemyIntentResolved`
- `enemyDefeated`
- `allEnemiesDefeated`

### 報酬関連

- `rewardGenerated`
- `rewardSelected`
- `rewardConfirmed`
