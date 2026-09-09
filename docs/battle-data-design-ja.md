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
- 能力値操作: 最大HP、現在HP、最大EP、現在EP、EPリセット下限、最大エナジー、現在エナジー、部位別累計EPダメージ量 `A/B/C/V/M`、部位別累計EP Peak回数 `A/B/C/V/M`、部位別最近EP Peak回数 `A/B/C/V/M` を確認・変更する。
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
- `causedEpPeak`, `purgeCausedEpPeak`, `purgeWillCauseEpPeak`: EP PeakやPurge成功失敗などの結果フラグ。`purgeWillCauseEpPeak` はPurgeカード使用時、カード効果処理前に現在EPと自己EPダメージ見込みからPeakしそうかを判定する。
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
- `purgeWillCauseEpPeak`: Purge使用時、これから発生する自己EPダメージが現在EPから最大EPに届く見込みか。Purgeのプレイ時flavorで、解除を試みる前の台詞分岐に使う。
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
  プレイヤー対象かつ `percentOf` なしの固定値EPダメージは小数を定義できます。この場合は各種倍率を適用した後、整数未満なら実際のダメージ・ログ・カード面表示を発生させず、整数以上になった時だけ通常のEPダメージとして処理します。舌技のように「通常時は自傷なしだが、部位倍率が上がると自傷が出る」カードに使います。
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
- `cardAddVariant`: 特殊な生成方法。現状は `purgeForStatusOwner`, `pulloutForStatusOwner`, `wriggleFreeForStatusOwner` があります。状態異常を持つ敵名と対象状態を入れたPurge / Pullout / Wriggle Freeカードを生成します。

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
例: `chance: 0.4`, `chanceBonusStatus: 'Aftershocks'`, `chanceBonusTarget: 'player'`, `chanceBonusPerStack: 0.01` なら、基本40%にプレイヤーのAftershocks 1スタックごとに1%を加えます。
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
- `relatedEnemyName`: 戦闘中生成カード用。対象敵の表示名。
- `relatedIntrusionPart`: 戦闘中生成Purge / Pullout用。対象敵の `intrusionPart` を、その時点の敵表示名込みで解決した表示名。カード本文の「成功時、○○を排出/引き抜く」やログ置換に使います。
- `purgeTargetName`: 戦闘中生成Purge / Pullout用。対象敵の表示名。使用時の対象固定にも使います。
- `purgeStatus`: 戦闘中生成Purge / Pullout用。解除対象状態。


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

### 状態・行動によるスプライト切り替え

- 画像・アニメーション設定は `src/data/enemySprites.ts` の `ENEMY_SPRITES` に登録する。画像URL、フレームサイズ・枚数・速度、表示サイズ、不透明範囲（全フレームのalpha > 8、端を含む座標）を指定する。登録済み画像の読み込みとループアニメーション生成は共通処理で行う。
- 敵の `sprite` は通常画像の登録キー。省略時は敵IDと同じキーを使う。画像切り替えを使う敵には通常画像も登録する。
- `spriteRules` は上から順に評価し、最初に一致したルールの `sprite` を使う。一致するルールがなくなると通常画像へ戻る。未登録キーは通常画像へフォールバックする。
- 各ルールの `conditions` は共通条件式のAND評価。`target: 'self'` はその敵自身、`target: 'player'` はプレイヤーを指す。`status` 条件の `statuses` はいずれか1つを持てば一致する。
- `intentIds` は現在の行動の `id` のいずれかと一致する条件。表示名や言語には依存しない。`conditions` と両方指定した場合はAND、ORにしたい場合はルールを分ける。
- 行動は行動予告と共通の確定済みデータを参照し、画像判定のための再抽選は行わない。行動実行中は実行中の行動を維持し、状態条件は更新する。同じ画像のままならアニメーションを再開始しない。
- 切り替え時は下端基準を保ち、影・当たり判定・行動予告・エフェクト基準を新画像の不透明範囲に合わせる。既存の戦闘モーションのコンテナは維持する。
- Sprite定義の `attackAnimationTimeScale` は、そのSpriteでHP/EP攻撃演出を行っている間だけループアニメーションへ適用する速度倍率。省略時は速度を変えない。画像を切り替えず攻撃中だけ動きを速めたい場合にも使える。

Gruntは `grunt` を通常画像とし、次のいずれかで `gruntCharm`（`Sprite/grunt_charm.png`、4×4・200×200px/フレーム）に切り替える。

1. 自身が `Charm`、`InsertA`、`InsertV`、`InsertM` のいずれかを持つ。
2. 現在の行動IDが `peakAftershocks`（Peak余韻）。

プレイヤーの拘束・気絶だけで誘惑時行動プールに入った場合は、上の条件に一致しない限り通常画像のままとする。

ピークマシンは通常画像 `PeakMachine` の `attackAnimationTimeScale: 6` により、攻撃演出中だけ `peak_machine_idle.png` の再生速度を6倍にする。Scene側では敵IDを判定せず、現在選択されているSpriteの設定を共通処理で参照する。

### 基本項目

- `id`: 敵ID。
- `name`: 表示名。
- `maxHp`: 最大HP。
- `maxEp`: 最大EP。0ならEPゲージを持たず、EP攻撃はMISSになる。
- `stages`: 出現ステージ。
- `threat`: 脅威度。戦闘ごとの合計脅威度に収まるよう敵抽選に使う。
- `isGiant`: 巨大敵フラグ。`true` の敵は単独出現専用になり、他の敵と同時に抽選されません。表示時も通常の複数敵配置ではなく、巨大敵用の大きなスプライト位置・サイズ・エフェクト中心を使います。
- `traits`: 敵の性質。現状は `male`, `softBody`, `sexToy` があります。行動そのものではなく、プレイヤーの特定行動へ敵がどう反応できるかを示す分類です。
- `intrusionPart`: その敵が侵入・挿入系状態を付与した時、実際にプレイヤーへ入っている部位・物体の表示名。敵ごとに1種類だけ定義し、`l(en, ja)` で持ちます。Purge / Pullout使用時や解除時のログでは、対象敵のこの値が `{intrusionPart}` として参照されます。`intrusionPart` の文中には `{enemy}` や `{player}` も使用できます。
- `statusTriggers`: 敵が特定の状態異常を持っている時だけ追加で発動するtrigger定義。キーは `Binding` などの状態異常ID、値は `StatusTriggerDefinition[]` です。共通の状態異常定義を増やさず、敵ごとの拘束中効果や敵固有の状態効果をenemyデータ側に寄せたい時に使います。実行順は通常の状態異常triggerと同じく `order` で制御します。
- `reactionRules`: プレイヤーの行動に対する敵の即時反応です。現状は「プレイヤーが自身にEPダメージを発生させるカードを使った時」に、敵の性質や対象部位に応じてIntruded / Insertなどへ発展させる用途で使います。
- `intentEConditions`: `intents_E` を使う条件。`ConditionDefinition[]` で定義します。例: 敵自身がCharmを持つ、プレイヤーがFaintedやBoundを持つ。
- `intentBConditions`: `intents_B` を使う条件。現状は敵自身が `Binding` を持つ時の拘束中行動に使います。
- `intents`: 通常行動。
- `intents_E`: 特殊行動。空なら特殊行動条件を満たしても通常行動になります。
- `intents_B`: 拘束中など、E行動とは別の特殊行動プール。条件成立時は `intents_E` より優先してランダム選択されます。

男性かつ性玩具ではない敵は、EP Peakした時に次行動が `ENEMY_PEAK_AFTERSHOCKS_INTENT` に差し替わります。
これは敵定義内の通常行動テーブルを進めるものではなく、1回だけ使われる強制次行動です。
ただし、敵がCharm状態の場合は `intents_E` が優先され、Peak余韻行動は予約されません。
すでにPeak余韻行動が予約されている敵をさらにEP Peakさせた場合は、Peak余韻行動を消して敵にCharmを付与します。
Peak余韻行動そのものの名称とログは `src/data/enemies.ts` の `ENEMY_PEAK_AFTERSHOCKS_INTENT` に定義します。

### `traits` と `reactionRules`

`reactionRules` は、敵行動ターンではなくプレイヤーのカード処理中に発生する反応を定義します。
今の用途は、プレイヤー自身へのEPダメージを持つカードを使った時、そのカードが身体接触を伴うものとして敵側の侵入・挿入反応を発生させることです。

```ts
reactionRules: [
  {
    id: 'softBodyIntrusionV',
    trigger: {
      kind: 'playerSelfEpDamage',
      parts: ['V'],
      minBaseAmount: 0.1,
      categories: ['caress'],
    },
    conditions: [
      condition('status', 'notHas', { target: 'self', statuses: ['IntrudedA', 'IntrudedV', 'IntrudedM'] }),
    ],
    effects: [
      effect('epDamage', 'player', 4, { attackAttribute: 'love', epDamageParts: ['V'] }),
      effect('status', 'self', 1, { status: 'IntrudedV', stacks: 1 }),
    ],
  },
]
```

主な項目:

- `id`: 反応ルールID。
- `trigger.kind`: 現状は `playerSelfEpDamage` のみ。プレイヤー自身へのEPダメージを持つ効果に反応します。
- `trigger.parts`: 反応するEPダメージ部位。例: `['V']` ならV自傷にだけ反応します。
- `trigger.minBaseAmount`: 反応に必要な自傷EPダメージの下限です。ここでは補正後の実効値ではなく、カード定義上の生の自傷値を見ます。倍率や軽減で0になっても、そのカードが自傷EPを発生し得る行動なら反応対象になります。
- `trigger.cardIds`: 特定カードIDだけに反応させたい時に使います。
- `trigger.categories`: 特定カテゴリのカードだけに反応させたい時に使います。
- `conditions`: 敵自身やプレイヤーの状態による追加条件。
- `effects`: 条件を満たした時に実行する効果。
- `variants`: 複数候補からランダムに1つ選びたい時に使います。Peak MachineのRubOneOut反応では、InsertV / InsertAのどちらかをランダムに付与します。
- `timing`: 反応を実行するタイミング。未指定時は `afterPlayerSelfEpDamage` です。
  - `beforePlayerSelfEpDamage`: カード効果処理の先頭で実行します。男性敵のInsert反応のように、プレイヤーが自傷EP行動を始める前にログや状態変化を出したい時に使います。
  - `afterPlayerSelfEpDamage`: プレイヤー自身へのEPダメージ処理後に実行します。軟体系のIntruded反応や性玩具のRubOneOut反応のように、カード本来の処理後に敵反応を出したい時に使います。
- `flavors`: 反応時のログ。通常の `flavors` と同じ形式です。

現状の性質ごとの使い方:

- `male`: V自傷カードに反応し、カード効果処理の先頭で敵自身へ `InsertV` を付与します。
- `softBody`: A/V/M自傷カードに反応し、プレイヤーの対象部位へ4EPダメージを与えた上で、敵自身へ対応する `IntrudedA` / `IntrudedV` / `IntrudedM` を付与します。B自傷ではCling系の反応を定義できます。
- `sexToy`: RubOneOut系カードに反応し、敵自身へ `InsertA` または `InsertV` をランダム付与します。カード表示名は対象敵が `sexToy` の時だけ `RubOneOut (Toy)` / `慰め(性玩具)` になります。

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

`flavors` は、カード使用、敵行動、レリック発火、状態異常発火、効果発生などで戦闘ログへ文章を出すための定義です。
現在は旧 `onPlay` / `onTrigger` 形式を廃止し、`FLAVOR_EVENTS` のイベントIDをキーにします。
英語と日本語は `l(en, ja)` で並べて定義します。

基本形:

```ts
import { FLAVOR_EVENTS } from '../models/types';

flavors: {
  [FLAVOR_EVENTS.Card.Play]: [
    { kind: 'narration', text: l('English text.', '日本語テキスト。') },
  ],
}
```

`flavors` の各イベントには配列を指定します。
同じ `kind` の文章が複数ある場合、その `kind` の中からランダムに1つだけ表示されます。
種類が異なる文章、例えば `quote` と `narration` が同時にある場合は、それぞれ1つずつ選ばれて連続表示されます。

### FlavorEvent

主なイベントIDは `src/models/types.ts` の `FLAVOR_EVENTS` に定義します。
文字列を直接書かず、必ず `FLAVOR_EVENTS.Card.Play` のように参照してください。
これにより、誤字をビルド時に検出しやすくします。

主なイベント:

- `FLAVOR_EVENTS.Card.Play`: カードを使用した時。
- `FLAVOR_EVENTS.Card.PurgeFailed`: PurgeがPeakにより失敗した時。
- `FLAVOR_EVENTS.Enemy.Intent`: 敵行動を実行した時。
- `FLAVOR_EVENTS.Enemy.IntentWarning`: プレイヤー行動開始前に敵の予告行動へ警告を出す時。
- `FLAVOR_EVENTS.Enemy.IntentFallback`: 敵行動に個別ナレーションがない時の汎用ログ。
- `FLAVOR_EVENTS.Enemy.IntentFailed`: 確率付き敵行動が失敗した時。
- 敵のPeak余韻ナレーションは、行動予約時ではなく実際の行動時に `FLAVOR_EVENTS.Enemy.Intent` から出力します。
- `FLAVOR_EVENTS.Enemy.PeakAftershocksOverload`: Peak余韻中の敵をさらにEP Peakさせ、Charmへ変化させた時。
- `FLAVOR_EVENTS.Status.Apply`: 状態異常が付与された時。
- `FLAVOR_EVENTS.Status.ApplyImportant`: 重要通知として状態異常が付与された時。
- `FLAVOR_EVENTS.Status.Infest`: 寄生系状態異常が付与された時。
- `FLAVOR_EVENTS.Status.Change`: 状態異常が別の状態異常へ変化した時。
- `FLAVOR_EVENTS.Status.ChangeImportant`: 重要通知として状態異常が変化した時。
- `FLAVOR_EVENTS.Status.Remove`: 状態異常が解除された時。
- `FLAVOR_EVENTS.Status.Trigger`: 状態異常triggerが発火した時。
- `FLAVOR_EVENTS.Relic.Trigger`: レリックtriggerが発火した時。
- `FLAVOR_EVENTS.Effect.Trigger`: 個別effectが発火した時。
- `FLAVOR_EVENTS.Effect.ChanceSuccess`: `chance` 付きeffect/trigger/intentが成功した時。
- `FLAVOR_EVENTS.Effect.ChanceFailure`: `chance` 付きeffect/trigger/intentが失敗した時。
- `FLAVOR_EVENTS.Effect.RandomAmountMin`: ランダム値が最小値だった時。
- `FLAVOR_EVENTS.Effect.RandomAmountMax`: ランダム値が最大値だった時。
- `FLAVOR_EVENTS.Effect.RandomAmountOther`: ランダム値が最小・最大以外だった時。
- `FLAVOR_EVENTS.Battle.PlayerEpDamageQuote`: プレイヤーがEPダメージを受けた時の反応台詞。
- `FLAVOR_EVENTS.Battle.PlayerEpPeakFirstQuote`: 1回のEP攻撃で最初にPlayer EP Peakした時の台詞。`PlayerEpPeakFirst` より先に出す。
- `FLAVOR_EVENTS.Battle.PlayerEpPeakFirst`: 1回のEP攻撃で最初にPlayer EP Peakした時のシステムログ。
- `FLAVOR_EVENTS.Battle.PlayerEpPeakRepeatQuote`: 同じEP攻撃内で2回目以降にPlayer EP Peakした時の台詞。`flashCount` で分岐し、`PlayerEpPeakRepeat` より先に出す。
- `FLAVOR_EVENTS.Battle.PlayerEpPeakRepeat`: 同じEP攻撃内で2回目以降にPlayer EP Peakした時のシステムログ。`flashCount` で分岐する。
- `FLAVOR_EVENTS.Battle.AftershocksAfterConsumption`: 余韻消費後の描写。
- `FLAVOR_EVENTS.Battle.SensitivityLevelUp`: 部位開発Lvが上がった時。

### 書く場所の目安

- カード固有の使用時描写: カード定義直下の `flavors[FLAVOR_EVENTS.Card.Play]`。
- 敵行動固有の描写: 敵行動定義内の `flavors[FLAVOR_EVENTS.Enemy.Intent]`。
- 敵行動の警告: 敵行動定義内の `flavors[FLAVOR_EVENTS.Enemy.IntentWarning]`。
- レリック発火時の共通描写: レリック本体またはtrigger内の `flavors[FLAVOR_EVENTS.Relic.Trigger]`。
- 状態異常triggerの描写: 状態異常trigger内の `flavors[FLAVOR_EVENTS.Status.Trigger]`。
- 状態異常付与時の描写: 状態異常本体の `flavors[FLAVOR_EVENTS.Status.Apply]`。
- 確率成功/失敗で出し分ける文章: chanceを持つeffect/trigger/intent側の `FLAVOR_EVENTS.Effect.ChanceSuccess` / `ChanceFailure`。
- ランダム値の最小/最大/その他で出し分ける文章: randomAmountを持つeffect側の `RandomAmountMin` / `RandomAmountMax` / `RandomAmountOther`。

汎用ログは `src/data/flavorCatalog.ts` の `GLOBAL_FLAVORS` に集約します。
HP/EPダメージ、Block、Heal、カード追加、ドロー、Peak、余韻消費後描写など、特定カードや敵に属さない文章はここへ置きます。
`BattleScene` 側では文章を直接持たず、イベントIDと文脈値を渡して発火します。

### 条件付きvariant

特定の状態異常、HP/EP量、Block量、文脈値などに応じて文章を切り替えたい場合は、条件付きvariantを書きます。
variantは上から順に評価され、`kind` ごとに最初に一致したvariantが使われます。
フォールバックは `conditions` を省略して一番下に置きます。

```ts
flavors: {
  [FLAVOR_EVENTS.Enemy.Intent]: [
    {
      conditions: [condition('status', 'has', { target: 'player', status: 'CravingForPeaks' })],
      lines: [
        { kind: 'quote', text: l('I cannot hold back.', 'もう我慢できない。') },
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
状態異常の有無を見る場合は `condition('status', 'has', { target: 'player', status: 'Horny' })`、状態異常スタック数を見る場合は `condition('status', 'gte', { target: 'player', status: 'Aftershocks', value: 10 })` のように書きます。
複数状態異常のいずれかを見たい場合は `status` ではなく `statuses: ['Horny', 'Heat']` を使います。

`condition('flavorValue', ...)` は、BattleSceneから渡される文脈値を参照する条件です。
例として、プレイヤーEPダメージ反応では `epDamagePercentOfRange`、余韻消費後描写では `remainingStacks` や `playerEnergy`、Peakログでは `flashCount` を使います。

### kind

ログの種別です。

- `system`: 数値や処理結果など、システム寄りの情報。
- `status`: 状態異常の付与、変化、解除など、状態の変化を示す情報。濃いピンクで表示します。
- `important`: 重要通知。濃いピンクかつ太字で表示し、表示時に一度1.1倍程度で出て通常サイズへ戻る演出を入れます。重要通知が出た時は、内容を読めるように約1秒進行を止めます。
- `narration`: 状況描写、地の文。
- `quote`: プレイヤーやキャラクターの台詞、心情。

失神などで `blockedFlavorKinds: ['quote']` が設定されている場合、`quote` は表示されません。

### プレースホルダ

フレーバーテキスト内では、以下のプレースホルダを使えます。

- `{player}`: 現在のプレイヤー名。
- `{enemy}`: 文脈上の敵名。敵行動、敵状態異常、対象敵つきカードなどで使います。
- `{target}`: 文脈上の対象名。HP/EPダメージや回復ログなどで使います。
- `{source}`: 発火元名。カード名、レリック名、状態異常名など。
- `{status}`: 対象状態異常名。
- `{intrusionPart}`: 文脈上の敵定義 `EnemyDefinition.intrusionPart`。
- `{card}`: カード名。
- `{intent}`: 敵行動名。
- `{amount}`: 効果量。
- `{signedAmount}`: +1 / -1 のような符号付き効果量。
- `{actualHpDamage}`: Block計算後に実際に入ったHPダメージ。
- `{incomingHpDamage}`: Block計算前のHPダメージ。
- `{fromStatus}` / `{toStatus}`: 状態異常変化ログ用。
- `{part}`: 文脈値 `flavorValues.part` に入っている部位名。部位名は現在の部位状態に応じて前置詞つきで解決される。
- `{partA}` / `{partB}` / `{partC}` / `{partV}` / `{partM}`: 指定部位名。短縮形として `{A}` / `{B}` / `{C}` / `{V}` / `{M}` も使えます。
- `{partN}` / `{partT}` / `{partU}`: 表示専用の部位別名。短縮形として `{N}` / `{T}` / `{U}` も使えます。内部数値はそれぞれ `N -> B`, `T -> M`, `U -> V` を参照します。
- `{defaultA}` / `{defaultB}` / `{defaultC}` / `{defaultV}` / `{defaultM}` / `{defaultN}` / `{defaultT}` / `{defaultU}`: 状態による前置詞や開発Lvを反映しない、素の部位名です。

上記以外にも、BattleSceneが `flavorValues` に渡したキーはプレースホルダとして使用できます。

### 部位名プレースホルダ

部位名は `src/data/bodyParts.ts` で管理します。
`BODY_PART_NAMES` は、`A/B/C/V/M/N/T/U` の各部位についてLv0からLv5までの日英表示名を持つ設定配列です。現在は全箇所に既存の部位記号をベタ書きしています。
部位名を変更する場合は、対象 `part` の `names` 内にある対象Lvの `l('English name', '日本語名')` を編集します。名称変更では、表示用トークンを内部集計部位へ対応付ける `BODY_PART_STAT_PART` は変更しません。

`BODY_PART_DEFAULT_NAMES` は、`{defaultV}` のようなプレースホルダで参照する素の部位名です。
こちらは開発Lv、最近Peak回数、EP割合、侵入・挿入状態、ムラムラ系状態異常による前置詞を一切付けず、常に設定した名称だけを返します。
「文章上は状況描写つきの部位名ではなく、固定の部位名を出したい」場合に使います。

部位名には、現在のプレイヤー状態に応じて以下の前置詞が順に付与されます。最近Peak回数の3段階とEP割合の3段階は、それぞれ成立する最上位の表現だけを付けます。ムラムラ系状態、段階表現、侵入・挿入系状態は互いに連結されます。

- ムラムラ系状態異常がある時: `発情した、`
- その部位の最近Peak回数が1以上: `Peakしたばかりの`
- その部位の最近Peak回数が4以上: `何度もPeakさせられた`
- その部位の最近Peak回数が10以上: `Peakしっぱなしの`
- 最近Peak回数が0で、現在EPが最大EPの25%より多い時: Vは `湿った`、それ以外は `甘く疼く`
- 最近Peak回数が0で、現在EPが最大EPの55%より多い時: Vは `熱く濡れた`、N/Cは `ピンと主張する`、それ以外は `ジンジンと疼く`
- 最近Peak回数が0で、現在EPが最大EPの80%より多い時: `今にもPeakしそうな`
- その部位に侵入・挿入系状態がある時: `ぎちぎちの`
- 開発Lvが0で、他の前置詞が何もない時: Bは `綺麗な`、Nは `ピンクの`、Cは `隠れた`、Vは `びっちりと閉じた`、Uは `未開発の`、Aは `キュッと閉じた`、Mは `狭い`、Tは `健康な`

最近Peak回数は累計Peak回数とは別に `Player.recentEpPeakByPart` に保持します。
EP Peakが発生した時、その原因になったEPダメージ部位ごとに加算されます。
ターン開始時点でAftershocksを持っていない場合のみリセットされます。
ターン開始時点でAftershocksを持っており、Aftershocks消費の結果0になった場合は、余韻を持ち越した扱いとしてリセットしません。

### 確率付きeffectの成功/失敗例

Craving for Peaksのように「確率で状態異常が解除される。解除された時とされなかった時で文章を変える」場合は、chanceを持つeffect側にイベントを定義します。

```ts
effect('removeStatus', 'player', 1, {
  status: 'CravingForPeaks',
  chance: 0.1,
  flavors: {
    [FLAVOR_EVENTS.Effect.ChanceSuccess]: [
      { kind: 'narration', text: l('The desire is satisfied.', '欲求が満たされ満足した。') },
    ],
    [FLAVOR_EVENTS.Effect.ChanceFailure]: [
      { kind: 'narration', text: l('The craving for Peaks is not satisfied.', 'Peakへの渇望は満たされない。') },
    ],
  },
})
```

この書き方では、確率判定に成功した時だけeffect本体が実行され、`ChanceSuccess` から1文が表示されます。
失敗した時はeffect本体は実行されず、`ChanceFailure` から1文が表示されます。

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
  name: 'Aftershocks',
  description: 'Aftershocks: At the start of your turn, lose 1 energy per stack while energy remains.',
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
- `noticeLevel`: 状態異常の付与・変化ログを強調するための重要度。`important` を指定すると、該当状態異常の付与や昇格ログが重要通知として表示されます。未指定の場合は通常の `status` ログです。
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

- `Aftershocks`: `['player']`
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
- `allWhileEnergy`: エナジーがある限り、1スタックずつ消費して効果を実行する。Aftershocks用。

`consumeEachTurn` は状態異常全体の消費可否、`consumeRule` は特定trigger内での消費方法です。
例として、Charmは `consumeEachTurn: 1` によりCharm行動を発生させた時に1スタック消費します。
Faintedは `turnStart` triggerの `consumeRule: 'one'` により、ターン開始時に1スタック消費します。最後の1スタックがこのタイミングで消えた場合、その後の行動開始時手札破棄は発生しません。
IntrudedA/IntrudedV/IntrudedMは `consumeEachTurn: 0` のためターン経過では消えず、`purgePlayed` trigger内の `removeStatus` 効果が成功した時だけ消えます。IntrudedMのように、同じ `turnStart` trigger内へPurge追加以外のHPダメージやフレーバーも定義できます。

MultiplePeakやPeakHellのように1つだけ持つ状態は `singleStack: true` で定義します。
上位状態へ移行する場合は、上位状態の `statusApplied` triggerに `removeStatus` を入れることで、下位状態を消して置き換えます。

複数の敵が同じIntruded状態を持つ場合、`addCardToHand` の `cardAddVariant: 'purgeForStatusOwner'` により、状態異常を持つ敵ごとに対象敵名入りのPurgeが生成されます。Intruded系は `epDamageParts` を持たせることで、生成されたPurgeの自傷EPダメージ部位にも反映できます。
そのPurgeは `purgeTargetName` で対象敵を固定するため、スライムA/Bが同じ状態を持っていても、該当Purgeを使った対象の状態だけが解除されます。

InsertA/InsertV/InsertMも同じ構造です。違いは `cardAddVariant: 'pulloutForStatusOwner'` でPulloutを生成し、Pullout成功時にInsert系状態を解除する点です。
Pulloutも生成元敵を対象として固定するため、使用時にレティクルを別の敵へ動かしても解除対象は変わりません。

拘束系も同じ考え方です。敵が `Binding` を持つと、共通の `Binding` 定義の `turnStart` triggerで `cardAddVariant: 'wriggleFreeForStatusOwner'` を使い、拘束元の敵名を持つ `Wriggle Free` カードを生成します。
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

