# 戦闘データ設計書

この文書は、戦闘と報酬画面で使うデータ定義を説明するための設計書です。
今後、カード、レリック、敵、状態異常をUIベースの外部ツールで編集し、その結果を `src/data` 配下の定義へ反映する想定です。

タイトル画面、敗北後ADV画面、マップ遷移などはプロトタイプ実装のため、この文書では扱いません。

## 基本方針

- カード、敵、敵行動、レリック、状態異常、プレイヤー初期値、レアリティは `src/data` に分離する。
- 新しい定義を追加する時、可能な限りロジックを変更せず、データ追加だけで挙動を増やせる構造にする。
- 効果は共通の `EffectDefinition` を中心に記述する。
- 効果や条件の判定に必要な文脈は、共通の `BattleEventContext` に集約する。
- 使用条件、敵行動条件、trigger発火条件は、共通の `ConditionDefinition` を中心に記述する。
- レリックと状態異常は `triggers[]` により、「どのタイミングで何をするか」を定義する。
- カード、敵行動、レリック、状態異常の効果実行は、戦闘画面内の共通Effect実行器を通して `effects` を順番に解決する。
- カードと敵行動では互換用フィールドも生成しているが、これは移行補助と一部表示用の派生値であり、外部編集ツールの直接編集対象にはしない。
- 演出はデータ側に実装を書かず、演出キーを選ぶ。実際のPhaser演出処理はScene側に置く。

## デバッグモード

デバッグモードは、戦闘検証を速くするための開発用機能です。
通常のゲーム仕様や本番向けデータ駆動設計とは分離して扱います。

実装上の書き分け:

- デバッグ用の実体は `src/debug/debugMode.ts` に隔離する。
- 既存Scene側へ追加するデバッグ関連処理は、必ず `// DEBUG_MODE_START` と `// DEBUG_MODE_END` のコメントで挟む。
- デバッグ処理は `DEBUG_FEATURES_AVAILABLE` と `DEBUG_STATE.enabled` の両方でガードする。
- `DEBUG_FEATURES_AVAILABLE` を `false` にすると、タイトル画面の隠し入力や設定メニューのデバッグ項目は動作しない。
- `DEBUG_STATE.enabled` は起動直後 `false`。タイトル画面で `上上下下左右左右AB` を入力すると `true` になる。

現在のデバッグモード機能:

- 設定メニュー外にデバッグ専用ボタンを追加する。
- デッキ操作: 実装済みカードプールからデッキへ追加、または現在のデッキ/手札/捨て札から削除する。
- 能力値操作: 最大HP、現在HP、最大EP、現在EP、EPリセット下限、最大エナジー、現在エナジー、部位別累計EPダメージ量 `A/B/C/V/M`、部位別EP Peak回数 `A/B/C/V/M` を確認・変更する。
- 状態異常操作: プレイヤーまたは敵に対して、実装済み状態異常を追加・削除する。`allowedOwners` が対象に合わない状態異常と撃破済みの敵はグレーアウトし、操作できない。
- レリック操作: 実装済みレリックプールから現在の所持レリックへ追加、または所持レリックから削除する。操作時は現在戦闘中のプレイヤー所持レリックとラン全体の所持レリックを同期する。
- ステージ脅威度操作: 現在の通常脅威度を確認し、次回戦闘生成に使う脅威度を上書きする。
- 敵操作: 実装済み敵プールから現在戦闘中の敵へ追加、または現在出現中の敵を削除する。敵を変更した場合は、既存の敵ビュー生成処理を使って表示とHUDを再構築する。最後の生存敵を削除しようとした場合は確認ダイアログを出し、承諾時はメニューを閉じて対象敵を倒した扱いにし、通常の勝利処理へ進める。

注意:

- デバッグモードの値変更は検証補助であり、正式なゲーム進行データとして扱わない。
- データ定義そのものを恒久的に変更したい場合は、`src/data` 配下の定義を編集する。
- デバッグUIで新しい検証項目を増やす場合も、通常処理へ直接混ぜず、`src/debug/debugMode.ts` に実体を置き、Scene側は呼び出しだけにする。

## 主なモジュール

### `src/models/types.ts`

戦闘データの型定義を置くモジュールです。
外部編集ツールの入力項目は、基本的にここの型を基準にします。

### `src/data/effectBuilders.ts`

データ定義用のビルダーを置くモジュールです。

- `effect`: `EffectDefinition` を作る。
- `defineCard`: カード定義を作る。
- `defineEnemyIntent`: 敵行動定義を作る。
- `defineRelic`: レリック定義を作る。

カードと敵行動では、移行補助のため `effects` から `hpDamage`, `epDamage`, `playerStatuses`, `enemyStatuses` などの互換フィールドも生成します。
ただし、戦闘中の効果解決は `effects` を共通Effect実行器で処理するため、外部編集ツールでは互換フィールドを直接編集しない想定です。

### `src/data/cards.ts`

カード定義を `CARD_DEFINITIONS` にまとめます。
カードは `defineCard({...})` で定義します。

### `src/data/enemies.ts`

敵定義を `ENEMY_DEFINITIONS` にまとめます。
敵行動は `defineEnemyIntent({...})` で定義します。

### `src/data/relics.ts`

レリック定義を `RELIC_DEFINITIONS` にまとめます。
レリックは `triggers[]` を持ち、タイミングごとに `effects[]` を実行します。

### `src/data/statuses.ts`

状態異常定義を `STATUS_DESCRIPTIONS` にまとめます。
状態異常は、説明、表示、所有可能対象、持ち越し可否、発火タイミング、効果、補正、演出キーを持ちます。

### `src/data/player.ts`

プレイヤー初期値を定義します。
最大HP、最大EP、最大エナジー、初期レリック、初期デッキを持ちます。

### `src/data/rarities.ts`

報酬抽選で使うレアリティ出現率を定義します。

## 共通文脈 `BattleEventContext`

`BattleEventContext` は、カード、敵行動、レリック、状態異常triggerが効果や条件を解決する時に読む共通の文脈です。
対象指定や条件式は、この文脈から `player`, `actor`, `selectedEnemy`, `triggerEnemy`, `statusOwner` などを参照します。

主な項目:

- `source`: 発生源。`card`, `enemyIntent`, `relic`, `status`, `system`。
- `sourceName`: メッセージ表示用の発生源名。
- `sourceId`: 発生源ID。カードID、敵IDなど。
- `player`: プレイヤー。
- `enemies`: 現在戦闘中の敵一覧。
- `actor`: 効果や条件を発生させた主体。カードならプレイヤー、敵行動なら行動中の敵、状態異常triggerなら状態異常の所有者。
- `target`: 個別効果処理中の対象。
- `selectedEnemy`: カード対象などで選択されている敵。
- `triggerEnemy`: レリックや状態異常の発火元になった敵。
- `statusOwner`: 状態異常triggerの場合、その状態異常を持っている対象。
- `card`, `intent`, `relic`, `status`, `statusTrigger`: 発生源に応じた詳細データ。
- `intentKey`, `intentUsageCount`: 敵行動の使用回数制限判定に使う値。
- `amount`, `rawAmount`, `modifiedAmount`, `actualHpDamage`, `blockedAmount`: ダメージや回復などの処理中に必要になる値。
- `causedEpPeak`, `purgeCausedEpPeak`: EP PeakやPurge成功失敗などの結果フラグ。
- `cardsPlayedThisTurn`: このターン中に使用したカード枚数。
- `isPlayerTurn`: 現在がプレイヤーターンかどうか。

外部編集ツールでは、条件や効果の対象選択がこの文脈上のどの対象を参照するかをUIで選ばせる想定です。

## 共通条件 `ConditionDefinition`

`ConditionDefinition` は、カード使用条件、敵行動の使用条件、特殊行動プールの使用条件、レリックtrigger条件、状態異常trigger条件で共通利用する条件式です。

```ts
type ConditionDefinition = {
  kind: ConditionKind;
  operator: ConditionOperator;
  target?: ConditionTarget;
  status?: StatusEffect;
  statuses?: StatusEffect[];
  value?: number | boolean;
  causeStatus?: StatusEffect;
};
```

### `kind`

条件の種類です。

- `status`: 対象が特定状態を持つかどうか、または状態スタック数。
- `cardsPlayedThisTurn`: このターン中に使用したカード枚数。
- `intentUsageCount`: その敵行動の使用回数。
- `purgeCausedEpPeak`: Purge使用時にプレイヤーEP Peakが発生したか。
- `isPlayerTurn`: プレイヤーターン中か。
- `hp`: 対象の現在HP。
- `hpPercent`: 対象の現在HP割合。0から100の数値。
- `ep`: 対象の現在EP。
- `epPercent`: 対象の現在EP割合。0から100の数値。最大EPが0の対象は0扱い。
- `block`: 対象のBlock値。
- `aliveEnemyCount`: 生存中の敵数。

### `operator`

比較方法です。

- `eq`: 等しい。
- `notEq`: 等しくない。
- `gt`: より大きい。
- `gte`: 以上。
- `lt`: より小さい。
- `lte`: 以下。
- `has`: `status` 用。指定状態のいずれかを持つ。
- `notHas`: `status` 用。指定状態をどれも持たない。

### `target`

条件が参照する対象です。

- `player`: プレイヤー。
- `actor` / `self`: 発生主体。
- `selectedEnemy`: 選択中の敵。
- `triggerEnemy`: 発火元の敵。
- `statusOwner`: 状態異常triggerの所有者。

### `status` / `statuses`

`kind: 'status'` 用です。
単一状態を見る場合は `status`、複数状態のいずれかを見る場合は `statuses` を使います。

### `value`

数値や真偽値の比較に使う値です。
例として、`cardsPlayedThisTurn == 0`、`hpPercent <= 50`、`purgeCausedEpPeak == false` などを表現します。

### `causeStatus`

敵の特殊行動プールなど、条件成立の原因になった状態異常名を表示したい場合に使います。
例として、CharmでE行動へ切り替わった時は `causeStatus: 'Charm'` を指定すると、敵行動表示の頭に `Charm: ` が付きます。

## 共通効果 `EffectDefinition`

`EffectDefinition` は、カード、敵行動、レリック、状態異常で共有する効果定義です。
戦闘中は、カード使用、敵行動、レリックtrigger、状態異常triggerのいずれも `EffectDefinition[]` が共通Effect実行器へ渡され、配列順に解決されます。
カード効果だけは既存仕様維持のため、実行前に `status` 効果を先に処理し、その後に攻撃・自傷・回復などを処理します。
効果量、対象、条件分岐に必要な文脈は `BattleEventContext` から参照されます。

```ts
type EffectDefinition = {
  kind: EffectKind;
  target: EffectTarget;
  amount: number;
  times: number;
  percentOf?: EffectPercentOf;
  status?: StatusEffect;
  statusGroup?: string;
  stacks?: number;
  attackAttribute?: AttackAttribute;
  cardId?: string;
  cardAddVariant?: CardAddVariant;
  perStack?: boolean;
  onlyDuringPlayerTurn?: boolean;
  chance?: number;
  randomAmount?: { min: number; max: number };
};
```

### `kind`

効果種別です。

- `hpDamage`: HPダメージ。
- `epDamage`: EPダメージ。EPはダメージで増え、最大値到達でPeakする。
- `hpHeal`: HP回復。
- `epHeal`: EP回復。EPは低いほど回復している扱いのため、現在EPを下げる。
- `epReserveHeal`: EP reset floorの回復。
- `block`: Block獲得。
- `drawCards`: 山札からカードを引く。
- `addCardToHand`: 指定カードを生成して手札に加える。
- `energyGain`: エナジー増減。負の値なら消費。
- `status`: 状態異常付与。
- `removeStatus`: 指定状態または状態グループを全スタック解除する。
- `discardHand`: プレイヤーの手札をすべて捨てる。
- `setEpReserveRatio`: プレイヤーのEP reset floorを最大EPに対する割合で直接設定する。
- `setEp`: プレイヤーの現在EPを指定値へ直接設定する。
- `retainBlock`: ターン開始時のBlock消去を抑止する。主にターン開始trigger内で使う。
- `hpDrain`: 対象のHPを減らし、プレイヤーHPを回復する。

### `target`

効果対象です。

- `player`: プレイヤー。
- `self`: 効果を発生させた本人。敵行動では敵自身を指す。
- `selectedEnemy`: 現在選択中の敵。
- `triggerEnemy`: フックや状態異常の発生元になった敵。
- `allEnemies`: 生存中の全敵。

### `amount`

効果量です。
通常は整数値です。`percentOf` がある場合は、`0.2` のような割合値として扱います。

### `times`

効果回数です。未指定時は1です。
カードや敵行動の複数回攻撃に使います。

### `percentOf`

割合参照元です。

- `playerMaxHp`: プレイヤー最大HP。
- `playerMaxEp`: プレイヤー最大EP。
- `playerBaseMaxEp`: 状態異常などで補正される前のプレイヤー基礎最大EP。
- `selfCurrentHp`: 自分の現在HP。
- `selfMaxEp`: 自分の最大EP。
- `targetMaxEp`: 対象敵の最大EP。

### `status` / `statusGroup` / `stacks`

状態異常関連の値です。

- `status`: 付与または解除する状態異常。
- `statusGroup`: グループ単位で解除する時に使う。例: `arousal`。
- `stacks`: 付与スタック数。未指定時は `amount` を使います。

### `cardId` / `cardAddVariant`

`addCardToHand` 用です。

- `cardId`: 追加するカードID。
- `cardAddVariant`: 特殊な生成方法。現状は `purgeForStatusOwner` があり、状態異常を持つ敵名と対象状態を入れたPurgeカードを生成します。

### `perStack`

状態異常のスタック数を効果量に掛けるかどうかです。
例: `InfestedA` が3スタックあり、`amount: 1`, `perStack: true` なら3EPダメージになります。

### `onlyDuringPlayerTurn`

プレイヤーターン中だけ実行する効果です。
例: Horny/Heat/FrustratedのEP Peak時エナジー+1は、プレイヤーターン中だけ有効です。

### `chance`

効果ごとの発生確率です。0から1の小数で指定します。
例: `chance: 0.1` なら10%の確率でその効果を実行します。
`target: 'allEnemies'` のように複数対象がある場合は、対象ごとに判定します。

### `chanceBonusStatus` / `chanceBonusTarget` / `chanceBonusPerStack`

`chance` に状態異常スタック数による補正を足す設定です。
例: `chance: 0.4`, `chanceBonusStatus: 'Lingering'`, `chanceBonusTarget: 'player'`, `chanceBonusPerStack: 0.01` なら、基本40%にプレイヤーのLingering 1スタックごとに1%を加えます。
最終確率は0から1の範囲に丸められます。敵行動にも同じ項目があり、行動全体の成功率として扱います。

### `randomAmount`

効果量を範囲内のランダム値にする設定です。
`{ min: 1, max: 3 }` のように指定すると、効果実行時に1から3の整数を抽選して `amount` の代わりに使います。
`percentOf` と同時に使う運用は避け、固定範囲のランダム効果に使ってください。

## カード定義

カードは `defineCard` で定義します。

```ts
defineCard({
  id: 'sample',
  name: 'Sample',
  rarity: 'common',
  categories: ['attack'],
  cost: 1,
  description: 'Deal 6 HP damage.',
  effects: [
    effect('hpDamage', 'selectedEnemy', 6, { attackAttribute: 'strike' }),
  ],
})
```

主な項目:

- `id`: カードID。
- `name`: 表示名。
- `rarity`: レアリティ。
- `categories`: カード種別。1つ目の種別でカード色が決まり、2つ目以降は使用条件などの補助タグとして使います。
- `cost`: 使用エナジー。
- `description`: 説明文。
- `conditions`: 使用条件。空配列ならカード固有条件なし。例: Faintは `cardsPlayedThisTurn == 0`。
- `playCondition`: 互換用の旧使用条件。外部編集ツールでは基本的に `conditions` を編集対象にしてください。
- `effects`: カード効果。
- `vanish`: 使用後に捨て札へ行かず消滅する。
- `temporary`: 使用後に消滅し、未使用でもターン終了時に消滅する。
- `purgeTargetName`: 戦闘中生成Purge用。対象敵の表示名。
- `purgeStatus`: 戦闘中生成Purge用。解除対象状態。


### `categories` とカード色

カード種別は `CardCategory` として定義します。現在の種別は `attack`, `utility`, `caress`, `lust`, `physiology`, `remedy`, `noMotion` です。

- `attack`: 攻撃カード。赤系。
- `utility`: 補助・準備・戦闘を有利にするカード。青系。
- `caress`: 敵への性感に繋がるカード。ピンク系。
- `lust`: 自分への性感に繋がるカード。紫系。
- `physiology`: 生理現象や条件反射のカード。白に近い薄灰。
- `remedy`: 障害の治療・排除カード。黄緑系。
- `noMotion`: 拘束中でも使えるカードを示す補助カテゴリ。色定義はありません。

複数カテゴリを持つカードは、1つ目のカテゴリで色を決めます。`noMotion` は色を持たないため、`categories: ['noMotion']` や `categories: ['noMotion', 'utility']` のように先頭へ置く定義は不可です。`defineCard` の型で先頭カテゴリを色つきカテゴリに制限しており、単独指定や先頭指定はビルドエラーになるようにしています。

拘束状態中は、`categories` に `noMotion` を含むカードだけが使用可能です。例えば `categories: ['remedy', 'noMotion']` は黄緑色の治療カードで、拘束中にも使えます。
## 敵定義

敵は `EnemyDefinition` で定義します。

- `id`: 敵ID。
- `name`: 表示名。
- `maxHp`: 最大HP。
- `maxEp`: 最大EP。0ならEPゲージを持たず、EP攻撃はMISSになる。
- `stages`: 出現ステージ。
- `threat`: 脅威度。戦闘ごとの合計脅威度に収まるよう敵抽選に使う。
- `isGiant`: 巨大敵フラグ。`true` の敵は単独出現専用になり、他の敵と同時に抽選されません。表示時も通常の複数敵配置ではなく、巨大敵用の大きなスプライト位置・サイズ・エフェクト中心を使います。
- `statusTriggers`: 敵が特定の状態異常を持っている時だけ追加で発動するtrigger定義。キーは `Binding` などの状態異常ID、値は `StatusTriggerDefinition[]` です。共通の状態異常定義を増やさず、敵ごとの拘束中効果や敵固有の状態効果をenemyデータ側に寄せたい時に使います。実行順は通常の状態異常triggerと同じく `order` で制御します。
- `intentEConditions`: `intents_E` を使う条件。`ConditionDefinition[]` で定義します。例: 敵自身がCharmを持つ、プレイヤーがFaintedやBoundを持つ。
- `intentBConditions`: `intents_B` を使う条件。現状は敵自身が `Binding` を持つ時の拘束中行動に使います。
- `intents`: 通常行動。
- `intents_E`: 特殊行動。空なら特殊行動条件を満たしても通常行動になります。
- `intents_B`: 拘束中など、E行動とは別の特殊行動プール。条件成立時は `intents_E` より優先してランダム選択されます。

## 敵行動定義

敵行動は `defineEnemyIntent` で定義します。

```ts
defineEnemyIntent({
  label: 'Ramming',
  effects: [
    effect('hpDamage', 'player', 3, { attackAttribute: 'strike' }),
    effect('epDamage', 'player', 1, { attackAttribute: 'strike' }),
  ],
  conditions: [
    condition('status', 'notHas', { target: 'self', statuses: ['IntrudedA', 'IntrudedV'] }),
  ],
})
```

主な項目:

- `label`: 敵の頭上に表示する行動名。
- `effects`: 行動効果。
- `conditions`: 行動使用条件。空配列なら条件なし。
- `timesLimit`: 使用回数制限。0なら無制限。
- `enemyStatusLimit`: 互換用。敵がこの中のいずれかの状態を持つ時だけ使用可能。
- `enemyStatusLimitN`: 互換用。敵がこの中のいずれかの状態を持つ時は使用不可。
- `chance`: 行動全体の成功率。未指定なら必ず成功。失敗した場合、その行動の `effects` は実行されません。
- `chanceBonusStatus` / `chanceBonusTarget` / `chanceBonusPerStack`: 行動成功率に状態異常スタック数補正を加える設定。

敵行動では、プレイヤーへの効果は `target: 'player'`、敵自身への効果は `target: 'self'` を使います。
新しい条件は `conditions` に記述します。`timesLimit`, `enemyStatusLimit`, `enemyStatusLimitN` は `defineEnemyIntent` で互換用フィールドとして残していますが、内部的には `conditions` に変換して評価します。

## ログとフレーバーテキスト `flavors`

`flavors` は、カード使用、敵行動、レリックtrigger、状態異常triggerなどが発生した時に、戦闘ログへ文章を出すための定義です。
英語と日本語を `l(en, ja)` で並べて定義します。

基本形:

```ts
flavors: {
  onTrigger: [
    { kind: 'narration', text: l('English text.', '日本語テキスト。') },
  ],
}
```

`flavors` の各キーには配列を指定します。
配列に複数の文章を入れた場合、その中からランダムに1つだけ表示されます。
複数行を順番に全部出す用途ではなく、文章バリエーション用です。

### 条件付き `flavors` variant

特定の状態異常、HP/EP量、Block量などに応じて文章を切り替えたい場合は、`flavors` の各キーに条件付きvariantを書けます。
variantは上から順に評価されるため、優先度の高い条件を先に書きます。
`conditions` を省略したvariantは「それ以外」のフォールバックとして使えます。

```ts
flavors: {
  onIntent: [
    {
      conditions: [condition('status', 'has', { target: 'player', status: 'CravingForPeaks' })],
      lines: [
        { kind: 'quote', text: l('I cannot hold back.', 'もう我慢できない。') },
      ],
    },
    {
      conditions: [condition('status', 'gte', { target: 'player', status: 'Lingering', value: 3 })],
      lines: [
        { kind: 'quote', text: l('I cannot take any more.', 'これ以上は無理かも。') },
      ],
    },
    {
      lines: [
        { kind: 'quote', text: l('What if...', 'もし……。') },
      ],
    },
  ],
}
```

条件には既存の `ConditionDefinition` を使います。
状態異常の有無を見る場合は `condition('status', 'has', { target: 'player', status: 'Horny' })`、状態異常スタック数を見る場合は `condition('status', 'gte', { target: 'player', status: 'Lingering', value: 10 })` のように書きます。
複数状態異常のいずれかを見たい場合は `status` ではなく `statuses: ['Horny', 'Heat']` を使います。

variant評価は `kind` ごとに独立しています。
例えば同じ `onIntent` の中に `narration` 用variantと `quote` 用variantが混在している場合、`narration` は上から最初に一致したもの、`quote` も上から最初に一致したものを別々に選びます。
選ばれたvariant内に同じ `kind` の文章が複数ある場合は、その中からランダムに1つ表示されます。

従来通り、単純な文章バリエーションだけでよい場合は `{ kind, text }` の配列をそのまま書けます。
条件付きvariantを使う場合は、同じ `kind` で先に一致したvariantが優先されるため、フォールバックは下に置いてください。

### `kind`

ログの種別です。

- `system`: 数値や処理結果など、システム寄りの情報。
- `narration`: 状況描写、地の文。
- `quote`: プレイヤーやキャラクターの台詞、心情。

### 主な `BattleFlavorKey`

現時点で実際に呼ばれている主なキーは以下です。

- `onPlay`: カードを使用した時。カード定義の `flavors` に書く。
- `onIntent`: 敵行動を実行した時。敵行動定義の `flavors` に書く。
- `onTrigger`: レリックtrigger、状態異常triggerが発火した時。レリック本体、レリックtrigger、状態異常本体、状態異常triggerの `flavors` に書く。
- `onApply`: 状態異常が付与された時。状態異常本体の `flavors` に書く。
- `onRemove`: 状態異常がスタック消費で消えた時。状態異常本体または該当triggerの `flavors` に書く。
- `onChanceSuccess`: `chance` を持つtrigger/effectの確率判定に成功した時。
- `onChanceFailure`: `chance` を持つtrigger/effectの確率判定に失敗した時。

型としては `onBattleStart`, `onEffect` も存在しますが、現時点では汎用的な表示タイミングとしては未整備です。
通常の効果発生時にログを出したい場合は、カード本体、敵行動本体、またはtrigger側の `flavors` に書いてください。
ただし、`chance` を持つ `EffectDefinition` では、effect側の `flavors.onChanceSuccess` / `flavors.onChanceFailure` を使って、確率で効果が起きた時と起きなかった時の文章を分けられます。

### 書く場所の目安

- カードを使った瞬間に出したい: カード定義直下の `flavors.onPlay`。
- 敵がその行動をした時に出したい: `defineEnemyIntent({...})` 内の `flavors.onIntent`。
- レリックが特定timingで発火した時に出したい: `triggers[]` の各trigger内に `flavors.onTrigger`。
- レリックがどのtriggerで発火しても共通文章を出したい: レリック定義直下の `flavors.onTrigger`。
- 状態異常が付与された時に出したい: 状態異常定義直下の `flavors.onApply`。
- 状態異常の特定triggerで出したい: 状態異常の `triggers[]` 内に `flavors.onTrigger`。
- 確率付きeffectの成功/失敗で出し分けたい: effect定義内の `flavors.onChanceSuccess` / `flavors.onChanceFailure`。

レリックや状態異常では、本体側の `flavors.onTrigger` とtrigger側の `flavors.onTrigger` の両方がある場合、両方が発火候補になります。`system` / `narration` / `quote` のように種類が異なる文章はそれぞれ出力候補になり、同じ種類の文章が複数ある場合はその種類の中からランダムに1つ選ばれます。

### プレースホルダ

フレーバーテキスト内では、以下のプレースホルダを使えます。

- `{player}`: 現在のプレイヤー名。
- `{source}`: 発火元名。
- `{status}`: 対象状態異常名。

例:

```ts
flavors: {
  onRemove: [
    { kind: 'narration', text: l('{player} wakes up.', '{player}は目を覚ました。') },
  ],
}
```

### 確率付きeffectの成功/失敗例

Craving for Peaksのように「10%で状態異常が解除される。解除された時とされなかった時で文章を変える」場合は、`chance` を持つeffect側に `flavors` を書きます。

```ts
effect('removeStatus', 'player', 1, {
  status: 'CravingForPeaks',
  chance: 0.1,
  flavors: {
    onChanceSuccess: [
      { kind: 'narration', text: l('The desire is satisfied.', '欲求が満たされ満足した。') },
    ],
    onChanceFailure: [
      { kind: 'narration', text: l('The craving for Peak is not satisfied.', 'Peakへの渇望は満たされない。') },
    ],
  },
})
```

この書き方では、確率判定に成功した時だけ `removeStatus` が実行され、`onChanceSuccess` から1文が表示されます。
失敗した時は `removeStatus` は実行されず、`onChanceFailure` から1文が表示されます。

### Living Clothesにナレーションを入れる例

Living Clothesの「ターン開始時、Blockがある時にEPダメージを受ける」triggerでナレーションを出す場合は、trigger内に `flavors.onTrigger` を書きます。

```ts
livingClothes: defineRelic({
  id: 'livingClothes',
  name: l('Living Clothes', '触手服'),
  rarity: 'rare',
  description: l(
    'At turn start, if you have Block, keep that Block and take 1-3 EP damage.',
    'ターン開始時にBlockがあるならBlockを維持し、1〜3EPダメージを受ける。',
  ),
  triggers: [
    {
      timing: EFFECT_TIMINGS.TurnStart,
      conditions: [condition('block', 'gt', { target: 'player', value: 0 })],
      effects: [
        effect('retainBlock', 'player', 1),
        effect('epDamage', 'player', 1, {
          randomAmount: { min: 1, max: 3 },
          attackAttribute: 'love',
          epDamageParts: ['B', 'C', 'V', 'A'],
        }),
      ],
      flavors: {
        onTrigger: [
          { kind: 'narration', text: l( 'The living clothes cling to the entire body and jiggle.', '触手服が全身に密着し、舐めるように蠢く。', ), },
        ],
      },
    },
  ],
})
```

この例では、Blockがあるという `conditions` を満たしてtriggerが発火した時だけ文章が出ます。
EPダメージeffect単体に文章を結びつけるのではなく、「Living Clothesのこのtriggerが発火した」という単位で文章を出します。

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

主な項目:

- `id`: レリックID。
- `name`: 表示名。
- `rarity`: レアリティ。
- `description`: Tooltip表示用説明文。
- `counter`: 任意。アイコン右下に表示するカウンタ用。
- `triggers`: タイミング別効果セット。
- `triggers[].conditions`: trigger発火条件。空または未指定なら常に発火。
- `triggers[].chance`: trigger全体の発生確率。0から1の小数で指定します。成立しなかった場合、そのtrigger内の効果はすべて実行されません。

## 状態異常定義

状態異常は `STATUS_DESCRIPTIONS` に定義します。

```ts
{
  name: 'Lingering',
  description: 'Lingering: At the start of your turn, lose 1 energy per stack while energy remains.',
  remain: 0,
  consumeEachTurn: 1,
  allowedOwners: ['player'],
  iconText: 'Li',
  iconColor: 0x9b6ef3,
  triggers: [
    {
      timing: 'turnStart',
      consumeRule: 'allWhileEnergy',
      order: 10,
      effects: [
        effect('energyGain', 'player', -1),
      ],
      visuals: ['breathAndEnergyPulse'],
    },
  ],
}
```

### 基本項目

- `name`: 状態異常名。
- `description`: Tooltip表示用説明文。
- `remain`: 1なら戦闘終了後も次戦闘へ持ち越す。0なら戦闘終了時に消える。
- `consumeEachTurn`: 1なら、その状態異常がターン中の行動原因として使われた時に1スタック消費する。0ならターン経過や行動原因では自動消費しない。
- `allowedOwners`: 付与可能対象。`player`, `enemy` を指定する。
- `singleStack`: trueなら、その状態異常が既に付与されている時の再付与を無視する。未指定またはfalseなら通常通りスタックする。
- `iconText`: アイコン内の白文字。
- `iconColor`: アイコン背景色。
- `exclusiveGroup`: 同時に1種類だけ存在できる状態グループ。例: `arousal`。
- `groupRank`: `exclusiveGroup` 内の段階。Horny/Heat/Frustratedの進行に使う。
- `triggers`: タイミング別の効果セット。

補足:

- `arousal` グループは、Horny系の段階状態に使います。同じグループ内では1種類だけが残り、再付与時は `groupRank` に従って上位段階へ進みます。
- `CravingForPeaks` は `arousal` グループの上位段階です。通常triggerはデータ定義で管理しますが、「自身にEPダメージを持つカードしか使えない」というカード使用制限は、現時点では `BattleScene` 側の補助ロジックで判定します。

### `allowedOwners`

状態異常がプレイヤー用か敵用かを制限するための項目です。
不正な対象に付与しようとした場合、その状態は付与されません。

`applyConditions` は、対象種別ではなく現在の戦闘状態で付与可否を制御します。例えば `Horny` は `applyConditions: [condition('status', 'notHas', { target: 'player', status: 'Fainted' })]` と定義することで、失神中のプレイヤーには付与されません。

例:

- `Lingering`: `['player']`
- `Horny`: `['player']`
- `IntrudedA` / `IntrudedV` / `IntrudedM`: `['enemy']`
- `Charm`: `['enemy']`
- `Bound`: `['player']`
- `Escaping`: `['player']`
- `Binding`: `['enemy']`

### `triggers`

状態異常がどのタイミングで何をするかを定義します。

```ts
type StatusTriggerDefinition = {
  timing: EffectTiming;
  effects: EffectDefinition[];
  modifiers?: StatusModifierDefinition[];
  visuals?: StatusVisualKey[];
  consumeRule?: StatusConsumeRule;
  conditions?: ConditionDefinition[];
  chance?: number;
  order?: number;
};
```

- `timing`: 発火タイミング。
- `effects`: 実行する効果。
- `modifiers`: ダメージ計算などに使う補正。
- `visuals`: 呼び出す演出キー。
- `consumeRule`: スタック消費ルール。
- `conditions`: 発火条件。`ConditionDefinition[]` で定義します。
- `chance`: trigger全体の発生確率。複数効果を同じ確率判定でまとめたい時に使います。
- `order`: 同じtiming内の実行順。小さいほど先に実行。

### `modifiers`

現状は以下の補正を使います。

- `epDamageTakenMultiplier`: プレイヤーが受けるEPダメージ倍率。
- `hpDamageTakenMultiplier`: プレイヤーが受けるHPダメージ倍率。
- `epMaxMultiplier`: プレイヤー最大EP倍率。ゲージ幅は変えず、EP数値の最大値側を増減させる用途です。

倍率系の補正は、`damageCalculation` や `passive` timingのmodifierとして定義します。

### `visuals`

状態異常データから選べる演出キーです。
演出の実体は `BattleScene` 側にあります。

現状のキー:

- `breathAndEnergyPulse`: プレイヤーが息を整えるように上下し、エナジー枠が脈動する。
- `addCardFromPlayerFadeIn`: プレイヤー位置からカードがフェードインして手札に加わる。
- `faintedDrop`: プレイヤーを下方向へ落とし、気絶中の基準座標を下げる。

### `consumeRule`

スタック消費ルールです。

- `none`: 自動消費しない。
- `one`: trigger実行後に1スタック消費する。
- `allWhileEnergy`: エナジーがある限り、1スタックずつ消費して効果を実行する。Lingering用。

`consumeEachTurn` は状態異常全体の消費可否、`consumeRule` は特定trigger内での消費方法です。
例として、Charmは `consumeEachTurn: 1` によりCharm行動を発生させた時に1スタック消費します。
Faintedは `turnStart` triggerの `consumeRule: 'one'` により、ターン開始時に1スタック消費します。最後の1スタックがこのタイミングで消えた場合、その後の行動開始時手札破棄は発生しません。
IntrudedA/IntrudedV/IntrudedMは `consumeEachTurn: 0` のためターン経過では消えず、`purgePlayed` trigger内の `removeStatus` 効果が成功した時だけ消えます。IntrudedMのように、同じ `turnStart` trigger内へPurge追加以外のHPダメージやフレーバーも定義できます。

MultiplePeakやPeakHellのように1つだけ持つ状態は `singleStack: true` で定義します。
上位状態へ移行する場合は、上位状態の `statusApplied` triggerに `removeStatus` を入れることで、下位状態を消して置き換えます。

複数の敵が同じIntruded状態を持つ場合、`addCardToHand` の `cardAddVariant: 'purgeForStatusOwner'` により、状態異常を持つ敵ごとに対象敵名入りのPurgeが生成されます。Intruded系は `epDamageParts` を持たせることで、生成されたPurgeの自傷EPダメージ部位にも反映できます。
そのPurgeは `purgeTargetName` で対象敵を固定するため、スライムA/Bが同じ状態を持っていても、該当Purgeを使った対象の状態だけが解除されます。

拘束系も同じ考え方です。敵が `Binding` を持つと、共通の `Binding` 定義の `turnStart` triggerで `cardAddVariant: 'resistBindingForStatusOwner'` を使い、拘束元の敵名を持つ `Resist Binding` カードを生成します。
`Escaping` の成功triggerでは、プレイヤーの `Bound` と拘束元敵の `Binding` を同時に解除します。

敵ごとに拘束中の追加効果を変えたい場合は、enemyデータ側の `statusTriggers.Binding` に `StatusTriggerDefinition[]` を定義します。これにより、状態異常データ側へ敵固有処理を増やさず、「この敵に拘束されている時だけ毎ターンEPダメージを受ける」のような効果を敵定義だけで管理できます。
例えばスライム群生体では、`statusTriggers.Binding` に `timing: EFFECT_TIMINGS.TurnStart`、`order: 41`、`effect('epDamage', 'player', 4, { epDamageParts: ['B', 'C'] })` を定義しています。共通の `Binding` カード追加triggerは `order: 40`、`Escaping` の脱出判定は `order: 4` のため、脱出判定が最優先、その後に拘束抵抗カード追加、最後に敵固有の拘束中効果という順になります。脱出に成功して `Binding` が消えた場合、後続の `Binding` triggerは実行されません。

## レアリティと報酬

`Rarity` は以下です。

- `starter`: 初期デッキ、初期所持用。通常報酬には出ない。
- `common`: 通常報酬の基本枠。
- `uncommon`: 中レア枠。
- `rare`: 高レア枠。
- `event`: 戦闘中生成カードなど。通常報酬には出ない。

報酬画面では `common`, `uncommon`, `rare` が `REWARD_RARITY_DROP_RATES` に従って抽選されます。

## フックタイミング

タイミング名は `src/models/types.ts` の `EFFECT_TIMINGS` に定義します。
カード、レリック、状態異常などのデータ定義では、`'turnStart'` のような文字列を直接書かず、`EFFECT_TIMINGS.TurnStart` のように参照してください。
これにより、タイミング名の誤字をTypeScriptのビルド時に検出しやすくします。

### `passive`

常時効果です。
現状では、`epDamage` / `selectedEnemy` の効果が敵EPダメージ補正として参照されます。

### `battleStart`

戦闘開始直後です。
レリックtriggerが実行されます。

### `turnStart`

プレイヤーターン開始時です。
状態異常triggerを先に実行し、その後レリックtriggerを実行します。
戦闘開始直後の最初のプレイヤーターンも `turnStart` として扱います。

### `enemyEpPeak`

敵EPが最大値に達した時です。
現状ではDrain系レリックがこのタイミングで動きます。

### `playerEpPeak`

プレイヤーEPが最大値に達した時です。
Horny/Heat/Frustratedの解除やエナジー+1に使います。
プレイヤーターン開始時から次のプレイヤーターン開始時までの1サイクル内でEP Peak回数を数え、一定回数以上でPeak過多系の状態異常を付与します。
このtimingに含まれる `epReserveHeal` は、通常のEP reset floor増加後に先取り計算され、その最終位置までfloor領域をアニメーションします。
その後、`epReserveHeal` 以外の状態異常効果を実行し、EPが最終floorまで下がります。

### `playerEpPeakRecovered`

プレイヤーEP Peak処理で、EPがEP reset floorまで戻った直後です。
Peakが成立した後、floorへ戻った状態を前提にした状態解除や反動効果に使います。
このタイミングの状態異常triggerには `chance` を設定できるため、「一定確率で解除され、解除された時だけ追加効果が出る」といった効果を1つの判定で扱えます。

### `statusApplied`

状態異常が付与された直後です。
付与直後に手札を捨てる、姿勢を変えるなど、状態に入った瞬間の処理に使います。

### `playerActionStart`

ターン開始処理、状態異常によるカード追加、通常ドローが終わり、カードを操作可能にする直前です。
行動開始前に手札を捨てる、行動開始時だけ状態を消費する、といった処理に使います。
InfestedA/InfestedVのEPダメージもこのタイミングで実行します。

### `damageCalculation`

ダメージ値計算時です。
現状では、プレイヤーが受けるEPダメージ倍率やHPダメージ倍率の状態異常modifierに使います。

### `enemyDamaged`

敵がダメージを受けた後です。
該当レリックtriggerを実行します。

### `cardDrawn`

カードを引いた後です。
該当レリックtriggerを実行します。

### `blockGained`

Block獲得後です。
該当レリックtriggerを実行します。

### `purgePlayed`

Purge使用時です。
IntrudedA/IntrudedV/IntrudedMの解除判定と追加EPダメージに使います。

## 外部ツール向け注意

- 基本編集対象は `effects` と `triggers` です。
- 条件の基本編集対象は `conditions` です。カード、敵行動、レリックtrigger、状態異常triggerで同じ形式を使います。
- カードと敵行動の互換フィールドはビルダー生成値なので、外部ツールでは直接編集対象にしない方が安全です。
- `starter` と `event` は通常報酬に出ないことをUI上で明示してください。
- `allowedOwners` により、状態異常の付与対象候補をUIで制限してください。
- `conditions` により使用できない手札カードは、UI上でグレーアウトして使用不可にしてください。エナジー不足はカード固有条件ではないため、カード全体ではなくコスト表示側で示します。
- `intentEConditions` は特殊行動プールを使う条件です。`ConditionDefinition[]` として編集してください。
- `maxEp: 0` の敵はEPゲージを持たず、敵へのEP攻撃はMISSになります。
- 状態異常の演出は `visuals` のキー選択までをデータ編集対象にし、演出実装そのものはコード側に置いてください。

