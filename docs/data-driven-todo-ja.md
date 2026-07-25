# データ駆動化ToDo

この文書は、未完了のデータ駆動化課題を管理するためのものです。
完了した項目は削除せず、[data-driven-done-archive-ja.md](./data-driven-done-archive-ja.md) へ移動します。
現行仕様は [battle-data-design-ja.md](./battle-data-design-ja.md) を参照してください。

## 優先度高

### BattleEventContextを標準化する

現状:

- レリック用、状態異常用に近い文脈情報を別々に渡している。
- ダメージ前後、カード使用、敵行動、Purge成功失敗などで必要な値が増えている。

やること:

- 共通の `BattleEventContext` を作る。
- レリック、状態異常、将来のカード反応効果が同じコンテキストを読めるようにする。

候補項目:

- `source`: `card` / `enemyIntent` / `relic` / `status`
- `sourceId`
- `actor`
- `target`
- `statusOwner`
- `damageType`
- `rawAmount`
- `modifiedAmount`
- `actualHpDamage`
- `blockedAmount`
- `causedEpPeak`
- `cardDefinition`
- `enemyIntent`
- `statusEffect`

### 条件式の汎用化

現状:

- 敵行動には `timesLimit`, `enemyStatusLimit`, `enemyStatusLimitN` がある。
- 状態異常triggerには最低限の `conditions` がある。
- カードやレリックには共通条件式がまだない。

やること:

- `conditions` 配列を設計する。
- カード、敵行動、レリック、状態異常で共通利用できるようにする。
- HP/EP割合、Block有無、状態異常有無、敵数、使用カード種別などを表現できるようにする。

## 優先度中

### 状態異常の特殊処理をさらにEffectへ寄せる

現状:

- 状態異常は `triggers`, `effects`, `modifiers`, `visuals`, `allowedOwners` を持つ。
- Lingering、Infested、Horny/Heat/Frustrated、Intruded/Purge の主効果はデータ定義から実行される。
- ただし、Charmによる敵行動プール変更や、プレイヤーEP Peak時のLingering付与はまだ戦闘ロジック側に専用実装がある。

やること:

- Charmの「敵行動プール変更」を状態異常trigger/effectとして表現できるか検討する。
- EP Peak時のLingering付与を、状態またはプレイヤー定義側のtriggerへ移せるか検討する。
- `exclusiveGroup` / `groupRank` 以外の状態変化ルールが必要になった場合、汎用的な変換定義を増やす。

### 表示用データの分離

現状:

- 状態異常のアイコン文字・色は `statuses.ts` に寄った。
- カード色、レリックアイコン、演出の一部はまだロジック側にある。

やること:

- カード定義に `category` または `displayColor` を追加するか検討する。
- レリック定義に `iconText`, `iconColor` を追加する。
- 演出キーと表示色をデータ編集ツールで扱いやすい形にする。

### 演出指定のデータ化を広げる

現状:

- 状態異常triggerは `visuals` で演出キーを選べる。
- 実際の演出関数は `BattleScene` 側にある。

やること:

- 状態付与時、状態解除時、特殊成功時、特殊失敗時の演出キーを追加する。
- カード、レリック、敵行動にも同じ演出キー指定を広げる。
- 演出のパラメータ、例えば色、サイズ、回数、発生位置補正などをデータ化する。

### 報酬抽選ルールのデータ化

現状:

- 報酬カード枚数、レリック提示数、除外レアリティ、重複除外ルールは `RewardScene` 側にある。
- レアリティ出現率だけが `data/rarities.ts` にある。

やること:

- 報酬設定モジュールを作る。
- ステージ、深度、イベント種別ごとの報酬テーブルを定義できるようにする。

### 敵抽選ルールのデータ化

現状:

- 敵定義には `stages`, `threat` がある。
- 合計脅威度と重み付け計算はロジック側にある。

やること:

- エンカウント設定データを追加する。
- 特定敵は単体でしか出ない、同名敵同士は同時出現しない、などの制約を表現できるようにする。

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
