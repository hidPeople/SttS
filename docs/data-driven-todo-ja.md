# データ駆動化ToDo

この文書は、戦闘要素を「データを追加・変更するだけで新しいカード、レリック、敵を作れる状態」へ近づけるための課題メモです。

現状の仕様説明は [battle-data-design-ja.md](./battle-data-design-ja.md) を参照してください。

## 目標

理想は、`src/data/cards.ts`、`src/data/relics.ts`、`src/data/enemies.ts`、`src/data/statuses.ts` へ新しいコンフィグを追加した時、`BattleScene` のロジックを変更しなくても基本的な新効果が動く状態です。

現状、カードと敵行動はかなり近い状態ですが、レリックと状態異常は専用ロジックが多く、データだけでは表現できない効果がまだ多くあります。

## 優先度高

### レリック効果の汎用実行器を作る

現状の問題:

- `RelicDefinition` はカードに近い多数の効果値を持っている。
- しかし `timing` ごとに、どの値をどう適用するかが汎用化されていない。
- 例として、`timing: 'turnStart'`, `hpDamage: 1` のレリックを作っても、現在は「毎ターン開始時に敵全体へ1HPダメージ」として自動実行されない。

やること:

- `applyRelicEffect(relic, context)` のような共通関数を作る。
- `hpDamage`, `epDamage`, `hpHeal`, `epHeal`, `block`, `drawCards`, `energyGain`, `playerStatuses`, `enemyStatuses`, `hpDrain` などを、対象ルールに従って処理する。
- `RelicDefinition` に対象指定を追加する。
  - 例: `target: 'player' | 'selectedEnemy' | 'triggerEnemy' | 'allEnemies' | 'randomEnemy'`
  - 例: `statusTarget: 'player' | 'triggerEnemy' | 'allEnemies'`
- `timing` ごとに「使える対象」が変わるため、外部ツールでも対象候補を制限できるようにする。

### カード・敵行動・レリックの効果項目を共通化する

現状の問題:

- カード、敵行動、レリックが似た効果項目を別々に持っている。
- 項目の意味が微妙に違うものがある。
  - 例: `epDamage` はカードでは敵へのEPダメージ、レリックの `passive` ではEPダメージ加算値として使われている。
- `selfHpDamageTimes` はカードにはあるが敵行動にはない、など完全には揃っていない。

やること:

- 共通の `EffectDefinition` を設計する。
- カードは `effects: EffectDefinition[]` を持つ形へ段階移行する。
- 敵行動も `effects: EffectDefinition[]` を持つ形へ段階移行する。
- レリックも `effects: EffectDefinition[]` と `timing` の組み合わせで動くようにする。
- 既存のフラットな数値項目は、移行期間中だけ互換用として残す。

候補例:

```ts
type EffectDefinition = {
  kind: 'hpDamage' | 'epDamage' | 'hpHeal' | 'epHeal' | 'block' | 'draw' | 'energy' | 'status' | 'drain';
  target: 'player' | 'self' | 'selectedEnemy' | 'triggerEnemy' | 'allEnemies';
  amount: number;
  percentOf?: 'playerMaxHp' | 'playerMaxEp' | 'selfCurrentHp' | 'selfMaxEp' | 'targetMaxEp';
  times: number;
  status?: StatusEffect;
  stacks?: number;
};
```

### 状態異常の効果をデータ化する

現状の問題:

- `STATUS_DESCRIPTIONS` は名前、説明、timing、remainを持つ。
- しかし状態異常の実際の効果は `BattleScene` に直書きされているものが多い。
- 例: Horny/Heat/FrustratedのEPダメージ倍率、RubOneOut追加、EP Peak時解除、Infestedのターン開始EPダメージ、IntrudedのPurge追加など。

やること:

- 状態にも `effects` を持たせる。
- `timing` ごとに状態効果を共通実行器で処理する。
- 「EP Peak時に解除」「ターン経過で消費しない」「エナジーがある限り消費」などの消費ルールをデータ化する。

追加したい項目候補:

- `stackConsumeRule: 'none' | 'onePerTurn' | 'allWhileEnergy' | 'onTrigger'`
- `clearOn: EffectTiming[]`
- `epDamageMultiplier`
- `addCardToHand`
- `addCardCount`
- `addCardTemporary`
- `damageOnTurnStart`
- `removeWhenPurgeSucceeds`

### 対象選択ルールをデータ化する

現状の問題:

- カードは基本的に選択中の敵へ効果を与える。
- レリックは一部処理で全敵、トリガー敵、プレイヤーなどがハードコードされている。
- 敵行動はプレイヤーと敵自身に対する処理が固定。

やること:

- 効果ごとに対象を指定できるようにする。
- 複数敵対応のため、`selectedEnemy`, `triggerEnemy`, `allEnemies`, `randomEnemy`, `lowestHpEnemy` などを設計する。
- 外部ツールでは、効果種別に応じて選べる対象を制限する。

## 優先度中

### フックのコンテキストを標準化する

現状の問題:

- `RelicHookContext` は `enemy`, `player`, `card`, `amount` 程度しか持っていない。
- どのダメージ種別か、実ダメージかブロック後ダメージか、EP Peakしたか、使用カードか敵行動かなどが不足している。

やること:

- フックごとに使えるコンテキストを整理する。
- 共通の `BattleEventContext` を作る。

候補項目:

- `source`: `card` / `enemyIntent` / `relic` / `status`
- `sourceId`
- `actor`: `player` / `enemy`
- `target`
- `damageType`: `hp` / `ep`
- `rawAmount`
- `modifiedAmount`
- `actualHpDamage`
- `blockedAmount`
- `causedEpPeak`
- `cardDefinition`
- `enemyIntent`
- `statusEffect`

### 使用回数・条件式の汎用化

現状の問題:

- 敵行動には `timesLimit`, `enemyStatusLimit`, `enemyStatusLimitN` がある。
- カードやレリックには同様の条件式がない。
- 複雑な条件、たとえば「HP50%以下」「EPが一定以上」「手札枚数がN枚以上」などはまだ表現できない。

やること:

- `conditions` 配列を設計する。
- 敵行動、カード、レリックに共通で使えるようにする。

候補例:

```ts
type EffectCondition =
  | { kind: 'hasStatus'; target: 'player' | 'self' | 'enemy'; status: StatusEffect }
  | { kind: 'notHasStatus'; target: 'player' | 'self' | 'enemy'; status: StatusEffect }
  | { kind: 'hpBelowPercent'; target: 'player' | 'self' | 'enemy'; percent: number }
  | { kind: 'epAtLeast'; target: 'player' | 'self' | 'enemy'; amount: number }
  | { kind: 'handSizeAtLeast'; amount: number };
```

### 報酬抽選ルールのデータ化

現状の問題:

- 報酬カード枚数、レリック提示数、除外レアリティ、重複除外ルールが `RewardScene` 側にある。
- レアリティ出現率だけが `data/rarities.ts` にある。

やること:

- 報酬設定モジュールを作る。
- ステージやマップ深度ごとの報酬テーブルを定義できるようにする。

候補項目:

- `cardRewardCount`
- `relicRewardCount`
- `excludedCardRarities`
- `excludedRelicRarities`
- `allowDuplicateRelics`
- `stageRewardRates`

### 敵抽選ルールのデータ化

現状の問題:

- 敵抽選は脅威度とステージを使うが、合計脅威度や重み付け計算はロジック側にある。
- 「特定敵は単体でしか出ない」「特定敵同士は同時出現しない」などは表現できない。

やること:

- エンカウント設定データを追加する。
- 敵側にも出現制約を追加する。

候補項目:

- `maxCopies`
- `uniqueInEncounter`
- `cannotAppearWith`
- `encounterWeight`
- `minBattleIndex`
- `maxBattleIndex`
- `bossOnly`

## 優先度低

### 表示用データの分離

現状の問題:

- カード色、状態アイコン色、略称、レリックアイコン文字などがロジック側にある。
- 外部ツールで見た目を確認・編集しにくい。

やること:

- カードカテゴリ、色、アイコン、表示タグをデータ化する。
- 状態定義に `iconText`, `iconColor`, `textColor` を追加する。
- レリック定義に `iconText`, `iconColor` を追加する。

### 演出指定のデータ化

現状の問題:

- `attackAttribute` による演出選択はある。
- それ以外の回復、ドレイン、盾、MISSなどはロジック固定。

やること:

- 効果ごとに演出キーを持てるようにする。
- 状態付与時、解除時、特殊成功時、失敗時の演出もデータ化する。

候補:

- `effectVfx`
- `hitVfx`
- `successVfx`
- `failVfx`
- `statusApplyVfx`
- `statusRemoveVfx`

## 追加検討したいフックtiming

現状の `EffectTiming` に加えて、以下を検討するとデータ駆動化しやすくなります。

### 戦闘進行

- `battleEnd`: 戦闘終了時。
- `victory`: 勝利確定時。
- `defeat`: 敗北確定時。
- `turnEnd`: プレイヤーターン終了時。
- `enemyTurnStart`: 敵ターン開始時。
- `enemyTurnEnd`: 敵ターン終了時。

### カード関連

- `cardPlayed`: カード使用時。
- `cardResolved`: カード効果解決後。
- `cardExhausted`: カード廃棄時。
- `cardDiscarded`: カードが捨て札に送られた時。
- `handFullCardDiscarded`: 手札上限で引けず捨て札に送られた時。
- `cardAddedToHand`: カードが手札に追加された時。
- `cardAddedToDeck`: 報酬などでデッキに追加された時。

### ダメージ関連

- `beforeDamageCalculation`: ダメージ補正前。
- `afterDamageCalculation`: ダメージ補正後。
- `beforeHpDamage`: HPダメージ適用前。
- `afterHpDamage`: HPダメージ適用後。
- `beforeEpDamage`: EPダメージ適用前。
- `afterEpDamage`: EPダメージ適用後。
- `blockedDamage`: Blockでダメージを防いだ時。
- `blockBroken`: Blockが0になった時。
- `hpHealed`: HP回復時。
- `epHealed`: EP回復時。
- `drainResolved`: ドレイン完了時。

### EP Peak関連

- `beforePlayerEpPeak`: プレイヤーEP Peak処理前。
- `afterPlayerEpPeak`: プレイヤーEP Peak処理後。
- `beforeEnemyEpPeak`: 敵EP Peak処理前。
- `afterEnemyEpPeak`: 敵EP Peak処理後。
- `epReserveChanged`: EP下限領域が変化した時。

### 状態関連

- `statusApplied`: 状態が付与された時。
- `statusRemoved`: 状態が解除された時。
- `statusStackChanged`: 状態スタック数が変化した時。
- `statusConsumed`: 状態が消費された時。

### 敵関連

- `enemySpawned`: 敵が出現した時。
- `enemyIntentSelected`: 敵の次行動が決まった時。
- `enemyIntentResolved`: 敵行動が解決された時。
- `enemyDefeated`: 敵が倒れた時。
- `allEnemiesDefeated`: 全敵撃破時。

### 報酬関連

- `rewardGenerated`: 報酬候補が生成された時。
- `rewardSelected`: 報酬が選択された時。
- `rewardConfirmed`: 報酬取得が確定した時。

## 外部ツール向け設計メモ

外部ツールでは、最初からTypeScriptコードを直接編集させるより、以下のような中間JSONを出力して、それを `src/data` モジュールへ変換する形が安全です。

- 入力フォームは `types.ts` の型を元に生成する。
- 状態名、カードID、レリックID、敵ID、レアリティ、timing、attackAttribute はプルダウンにする。
- 数値項目は0を標準値にする。
- 配列項目は空配列を標準値にする。
- `starter` と `event` は通常報酬に出ないことをUI上に明記する。
- `maxEp: 0` の敵にはEP関連行動を設定できるが、敵へのEP攻撃はMISSになることを警告表示する。
- レリックについては、現在有効な `timing` と効果値の組み合わせだけを「実装済み」として表示する。

## 近い将来の実装順案

1. レリックの共通効果実行器を作る。
2. レリックに対象指定を追加する。
3. 状態異常の共通効果実行器を作る。
4. カード・敵行動・レリックを共通 `effects` 配列へ寄せる。
5. フックコンテキストを標準化する。
6. 報酬設定と敵抽選設定をデータ化する。
7. 表示用データと演出キーをdata側へ移す。
