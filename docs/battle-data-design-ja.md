# 戦闘データ設計書

この文書は、戦闘と報酬画面で使うデータ定義を説明するための設計書です。今後、カード・レリック・敵などをUIベースの外部ツールで編集し、その結果を `src/data` 配下へ反映する想定で、各値の意味と動作を中心にまとめます。

タイトル画面、敗北後ADV画面、マップ遷移などはプロトタイプ用の仮実装であり、この文書では扱いません。

## 基本方針

- カード、敵、レリック、状態、プレイヤー初期値、レアリティは `src/data` に分離する。
- カード・敵行動・レリック効果は、共通の `EffectDefinition` を中心に記述する。
- カードと敵行動は、現行戦闘ロジックとの互換のため、`defineCard` / `defineEnemyIntent` で旧形式の数値フィールドも自動生成する。
- レリックは、レリック本体情報と「いつ何をするか」を分離し、`triggers[]` にタイミング別効果を持つ。
- 状態異常は `timing` と `remain` を持つが、複雑な挙動はまだ一部 `BattleScene` 側に専用処理がある。

## 主なモジュール

### `src/models/types.ts`

カード、敵、レリック、状態、共通効果の型定義を置くモジュールです。外部編集ツールの入力項目は、基本的にこの型を元にします。

### `src/data/effectBuilders.ts`

データ定義用のビルダーを置くモジュールです。

- `defineCard`: `effects` から `CardDefinition` を生成する。
- `defineEnemyIntent`: `effects` から `EnemyIntent` を生成する。
- `defineRelic`: `RelicDefinition` を生成する。
- `effect`: `EffectDefinition` を簡潔に作る。

カードと敵行動は、内部互換用に `hpDamage`, `epDamage`, `playerStatuses`, `enemyStatuses` なども生成されます。外部ツールでは、原則として `effects` を編集対象にします。

### `src/data/cards.ts`

カード定義を `CARD_DEFINITIONS` にまとめます。各カードは `defineCard({...})` で定義します。

### `src/data/enemies.ts`

敵定義を `ENEMY_DEFINITIONS` にまとめます。敵行動は `defineEnemyIntent({...})` で定義します。

### `src/data/relics.ts`

レリック定義を `RELIC_DEFINITIONS` にまとめます。各レリックは `triggers[]` を持ち、タイミングごとに `effects` を設定します。

### `src/data/statuses.ts`

状態の説明、発火タイミング、戦闘をまたいで残るかを定義します。

### `src/data/player.ts`

プレイヤー初期値を定義します。最大HP、最大EP、最大エナジー、初期レリック、初期デッキを持ちます。

### `src/data/rarities.ts`

報酬画面で使うレアリティ別出現率を定義します。

### `src/models/Deck.ts`

山札、手札、捨て札、ドロー、手札追加、廃棄を管理します。

### `src/models/Combatants.ts`

プレイヤーと敵の戦闘中ステータス、敵行動順、敵行動の使用回数を管理します。

### `src/models/RunState.ts`

連戦中に持ち越すデッキ、所持レリック、プレイヤーHP/EP、残存状態などを保持します。

### `src/scenes/BattleScene.ts`

戦闘画面本体です。データ定義を実際の挙動へ変換し、カード使用、敵行動、レリックtrigger、状態処理、HUD、演出を処理します。

### `src/scenes/RewardScene.ts`

戦闘勝利後の報酬画面です。カード3枚、レリック2個をレアリティに応じて抽選し、選択された報酬を `RunState` に追加します。

## 共通効果 `EffectDefinition`

`EffectDefinition` は、カード・敵行動・レリックで共有する効果1個分の定義です。

```ts
type EffectDefinition = {
  kind: EffectKind;
  target: EffectTarget;
  amount: number;
  times: number;
  percentOf?: EffectPercentOf;
  status?: StatusEffect;
  stacks?: number;
  attackAttribute?: AttackAttribute;
};
```

### `kind`

効果の種類です。

- `hpDamage`: HPダメージ。
- `epDamage`: EPダメージ。
- `hpHeal`: HP回復。
- `epHeal`: EP回復。EPは低いほど回復している扱いなので、現在EPを下げる。
- `epReserveHeal`: EP下限領域の回復。
- `block`: Block獲得。
- `drawCards`: ドロー。
- `energyGain`: エナジー回復。
- `status`: 状態付与。
- `hpDrain`: HPドレイン。対象からHPを奪い、プレイヤーを回復する。

### `target`

効果対象です。

- `player`: プレイヤー。
- `self`: 効果を発生させた本人。カードでは通常使わず、敵行動では敵自身を指す。
- `selectedEnemy`: 現在選択中の敵。
- `triggerEnemy`: フックを発生させた敵。
- `allEnemies`: 生存中の全敵。

### `amount`

効果量です。通常は整数値です。`percentOf` を使う場合は `0.2` などの割合値として扱えます。

### `times`

効果回数です。省略時はビルダー側で1として扱います。

### `percentOf`

割合参照元です。

- `playerMaxHp`: プレイヤー最大HP。
- `playerMaxEp`: プレイヤー最大EP。
- `selfCurrentHp`: 自分の現在HP。
- `selfMaxEp`: 自分の最大EP。
- `targetMaxEp`: 対象敵の最大EP。

### `status` / `stacks`

`kind: 'status'` の時に使います。

- `status`: 付与する状態。
- `stacks`: 付与スタック数。未指定なら `amount` を使います。

### `attackAttribute`

攻撃演出属性です。

- `strike`: 打属性。
- `slash`: 斬属性。
- `love`: 愛属性。

## カード定義

カードは `defineCard` で定義します。

```ts
defineCard({
  id: 'sample',
  name: 'Sample',
  rarity: 'common',
  cost: 1,
  description: 'Deal 6 HP damage.',
  effects: [
    effect('hpDamage', 'selectedEnemy', 6, { attackAttribute: 'strike' }),
  ],
})
```

### 基本情報

- `id`: カードID。デッキや報酬で参照する一意の文字列。
- `name`: 表示名。
- `rarity`: 報酬抽選や初期カード判定に使うレアリティ。
- `cost`: 使用に必要なエナジー。
- `description`: 報酬画面などで使う説明文。
- `effects`: カード効果一覧。
- `exhaust`: 使用後に捨て札へ行かず消滅する。
- `temporary`: 使用後に消滅し、未使用でターン終了しても消滅する。
- `purgeTargetName`: 戦闘中生成Purge用。対象敵の表示名。
- `purgeStatus`: 戦闘中生成Purge用。解除対象状態。

### 対象の考え方

カードでは主に以下を使います。

- 敵へ与える効果: `target: 'selectedEnemy'`
- 自分へ与える効果: `target: 'player'`

`defineCard` は `effects` から、現行戦闘処理が使う互換フィールドを生成します。たとえば `effect('epDamage', 'selectedEnemy', 3)` は `epDamage: 3` としても扱われます。

## 敵定義

敵は `EnemyDefinition` で定義します。

- `id`: 敵ID。
- `name`: 表示名。同名敵が複数出た場合、表示上は `A`, `B`, `C` が付く。
- `maxHp`: 最大HP。
- `maxEp`: 最大EP。0の場合、その敵はEPゲージを持たない。
- `stages`: 出現可能ステージ。
- `threat`: 脅威度。戦闘ごとの合計脅威度を超えない範囲で敵抽選に使う。
- `intents`: 通常行動。
- `intents_E`: Charm時行動。

## 敵行動定義

敵行動は `defineEnemyIntent` で定義します。

```ts
defineEnemyIntent({
  label: 'Ramming',
  effects: [
    effect('hpDamage', 'player', 3, { attackAttribute: 'strike' }),
    effect('epDamage', 'player', 1, { attackAttribute: 'strike' }),
  ],
  enemyStatusLimitN: ['IntrudedA', 'IntrudedV'],
})
```

### 基本情報

- `label`: 敵の頭上に表示する行動名。
- `effects`: 行動効果一覧。
- `timesLimit`: 使用回数制限。0なら無制限。
- `enemyStatusLimit`: 敵がこの中のいずれかの状態を持つ時だけ使用可能。
- `enemyStatusLimitN`: 敵がこの中のいずれかの状態を持つ時は使用不可。

### 対象の考え方

敵行動では主に以下を使います。

- プレイヤーへ与える効果: `target: 'player'`
- 敵自身へ与える効果: `target: 'self'`

`defineEnemyIntent` は `effects` から、現行戦闘処理が使う互換フィールドを生成します。

## レリック定義

レリックは `defineRelic` で定義します。

```ts
defineRelic({
  id: 'sampleRelic',
  name: 'Sample Relic',
  rarity: 'common',
  description: 'At turn start, deal 1 HP damage to all enemies.',
  triggers: [
    {
      timing: 'turnStart',
      effects: [
        effect('hpDamage', 'allEnemies', 1, { attackAttribute: 'strike' }),
      ],
    },
  ],
})
```

### 基本情報

- `id`: レリックID。
- `name`: 表示名。
- `rarity`: 報酬抽選に使うレアリティ。
- `description`: Tooltip表示用説明文。
- `counter`: 任意。アイコン右下に小さく表示するカウンタ用。
- `triggers`: タイミング別効果セット。

### `triggers`

`triggers` は、レリックがどのタイミングで何をするかを表します。

```ts
type RelicTriggerDefinition = {
  timing: EffectTiming;
  effects: EffectDefinition[];
};
```

1つのレリックが複数の `trigger` を持てます。たとえば「戦闘開始時に状態付与」「ターン開始時にダメージ」の両方を同じレリックに持たせられます。

## 状態定義

状態は `STATUS_DESCRIPTIONS` で定義します。

- `name`: 状態名。
- `description`: Tooltip表示用説明文。
- `timing`: 関連する発火タイミング。
- `remain`: 0なら戦闘終了時に消える。1なら次戦闘へ持ち越す。

注意: 状態の説明とtimingはデータ化されていますが、複雑な実効果はまだ一部 `BattleScene` に専用実装があります。

## レアリティと報酬

`Rarity` は以下です。

- `starter`: 初期デッキ・初期所持用。通常報酬には出ない。
- `common`: 通常報酬の基本枠。
- `uncommon`: 通常報酬の中レア枠。
- `rare`: 通常報酬の高レア枠。
- `event`: 戦闘中生成カードなど。通常報酬には出ない。

報酬画面では `common`, `uncommon`, `rare` が `REWARD_RARITY_DROP_RATES` に従って抽選されます。

## フックタイミング

### `passive`

常時効果です。現状では、`epDamage` / `selectedEnemy` の効果が敵EPダメージ補正として参照されています。

### `battleStart`

戦闘開始直後です。レリックtriggerを実行します。

### `turnStart`

プレイヤーターン開始時です。状態の専用処理後、レリックtriggerを実行します。

### `enemyEpPeak`

敵のEPが最大に達した時です。現在は `hpDrain` レリックがこのタイミングで動きます。

### `playerEpPeak`

プレイヤーEP Peakに関連する状態処理用です。現状はHorny/Heat/Frustratedの解除などに使われています。

### `damageCalculation`

ダメージ値計算時です。現状はプレイヤー被EPダメージ倍率の状態処理に使われています。

### `enemyDamaged`

敵がダメージを受けた後です。該当レリックtriggerを実行します。

### `cardDrawn`

カードを引いた後です。該当レリックtriggerを実行します。

### `blockGained`

Block獲得後です。該当レリックtriggerを実行します。

### `purgePlayed`

Purge使用時に関連します。IntrudedA/IntrudedVの解除判定に使います。

## 外部ツール向け注意点

- 基本編集対象は `effects` と `triggers` です。
- カードと敵行動の旧形式フィールドはビルダー生成値なので、外部ツールでは直接編集対象にしない方がよいです。
- レリックは `triggers[]` を編集対象にします。
- `starter` と `event` は通常報酬に出ないことをUI上に明記してください。
- `maxEp: 0` の敵はEPゲージを持たず、敵へのEP攻撃はMISSになります。
- 状態異常は、現状まだ専用ロジック依存のものがあるため、完全な汎用効果としては扱わないでください。
