# 戦闘データ設計書

この文書は、戦闘と報酬画面で使うデータ定義を説明するための設計書です。
今後、カード、レリック、敵、状態異常をUIベースの外部ツールで編集し、その結果を `src/data` 配下の定義へ反映する想定です。

タイトル画面、敗北後ADV画面、マップ遷移などはプロトタイプ実装のため、この文書では扱いません。

## 基本方針

- カード、敵、敵行動、レリック、状態異常、プレイヤー初期値、レアリティは `src/data` に分離する。
- 新しい定義を追加する時、可能な限りロジックを変更せず、データ追加だけで挙動を増やせる構造にする。
- 効果は共通の `EffectDefinition` を中心に記述する。
- レリックと状態異常は `triggers[]` により、「どのタイミングで何をするか」を定義する。
- カードと敵行動は `effects` を持つが、現状は互換用フィールドも生成しており、完全な共通Effect実行へは移行途中。
- 演出はデータ側に実装を書かず、演出キーを選ぶ。実際のPhaser演出処理はScene側に置く。

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

カードと敵行動では、現行戦闘ロジックとの互換のため、`effects` から `hpDamage`, `epDamage`, `playerStatuses`, `enemyStatuses` なども生成します。

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

## 共通効果 `EffectDefinition`

`EffectDefinition` は、カード、敵行動、レリック、状態異常で共有する効果定義です。

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
- `removeStatus`: 状態異常解除。
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

主な項目:

- `id`: カードID。
- `name`: 表示名。
- `rarity`: レアリティ。
- `cost`: 使用エナジー。
- `description`: 説明文。
- `effects`: カード効果。
- `exhaust`: 使用後に捨て札へ行かず消滅する。
- `temporary`: 使用後に消滅し、未使用でもターン終了時に消滅する。
- `purgeTargetName`: 戦闘中生成Purge用。対象敵の表示名。
- `purgeStatus`: 戦闘中生成Purge用。解除対象状態。

## 敵定義

敵は `EnemyDefinition` で定義します。

- `id`: 敵ID。
- `name`: 表示名。
- `maxHp`: 最大HP。
- `maxEp`: 最大EP。0ならEPゲージを持たず、EP攻撃はMISSになる。
- `stages`: 出現ステージ。
- `threat`: 脅威度。戦闘ごとの合計脅威度に収まるよう敵抽選に使う。
- `intents`: 通常行動。
- `intents_E`: Charm時行動。空ならCharmは効かない。

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

主な項目:

- `label`: 敵の頭上に表示する行動名。
- `effects`: 行動効果。
- `timesLimit`: 使用回数制限。0なら無制限。
- `enemyStatusLimit`: 敵がこの中のいずれかの状態を持つ時だけ使用可能。
- `enemyStatusLimitN`: 敵がこの中のいずれかの状態を持つ時は使用不可。

敵行動では、プレイヤーへの効果は `target: 'player'`、敵自身への効果は `target: 'self'` を使います。

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

## 状態異常定義

状態異常は `STATUS_DESCRIPTIONS` に定義します。

```ts
{
  name: 'Lingering',
  description: 'Lingering: At the start of your turn, lose 1 energy per stack while energy remains.',
  remain: 0,
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
- `allowedOwners`: 付与可能対象。`player`, `enemy` を指定する。
- `iconText`: アイコン内の白文字。
- `iconColor`: アイコン背景色。
- `exclusiveGroup`: 同時に1種類だけ存在できる状態グループ。例: `arousal`。
- `groupRank`: `exclusiveGroup` 内の段階。Horny/Heat/Frustratedの進行に使う。
- `triggers`: タイミング別の効果セット。

### `allowedOwners`

状態異常がプレイヤー用か敵用かを制限するための項目です。
不正な対象に付与しようとした場合、その状態は付与されません。

例:

- `Lingering`: `['player']`
- `Horny`: `['player']`
- `IntrudedA`: `['enemy']`
- `Charm`: `['enemy']`

### `triggers`

状態異常がどのタイミングで何をするかを定義します。

```ts
type StatusTriggerDefinition = {
  timing: EffectTiming;
  effects: EffectDefinition[];
  modifiers?: StatusModifierDefinition[];
  visuals?: StatusVisualKey[];
  consumeRule?: StatusConsumeRule;
  conditions?: StatusTriggerCondition;
  order?: number;
};
```

- `timing`: 発火タイミング。
- `effects`: 実行する効果。
- `modifiers`: ダメージ計算などに使う補正。
- `visuals`: 呼び出す演出キー。
- `consumeRule`: スタック消費ルール。
- `conditions`: 発火条件。
- `order`: 同じtiming内の実行順。小さいほど先に実行。

### `modifiers`

現状は `epDamageTakenMultiplier` を使います。
Horny/Heat/Frustratedの「受けるEPダメージ倍率」は、`damageCalculation` timingのmodifierとして定義します。

### `visuals`

状態異常データから選べる演出キーです。
演出の実体は `BattleScene` 側にあります。

現状のキー:

- `breathAndEnergyPulse`: プレイヤーが息を整えるように上下し、エナジー枠が脈動する。
- `addCardFromPlayerFadeIn`: プレイヤー位置からカードがフェードインして手札に加わる。

### `consumeRule`

スタック消費ルールです。

- `none`: 自動消費しない。
- `allWhileEnergy`: エナジーがある限り、1スタックずつ消費して効果を実行する。Lingering用。

## レアリティと報酬

`Rarity` は以下です。

- `starter`: 初期デッキ、初期所持用。通常報酬には出ない。
- `common`: 通常報酬の基本枠。
- `uncommon`: 中レア枠。
- `rare`: 高レア枠。
- `event`: 戦闘中生成カードなど。通常報酬には出ない。

報酬画面では `common`, `uncommon`, `rare` が `REWARD_RARITY_DROP_RATES` に従って抽選されます。

## フックタイミング

### `passive`

常時効果です。
現状では、`epDamage` / `selectedEnemy` の効果が敵EPダメージ補正として参照されます。

### `battleStart`

戦闘開始直後です。
レリックtriggerが実行されます。

### `turnStart`

プレイヤーターン開始時です。
状態異常triggerを先に実行し、その後レリックtriggerを実行します。

### `enemyEpPeak`

敵EPが最大値に達した時です。
現状ではDrain系レリックがこのタイミングで動きます。

### `playerEpPeak`

プレイヤーEPが最大値に達した時です。
Horny/Heat/Frustratedの解除やエナジー+1に使います。

### `damageCalculation`

ダメージ値計算時です。
現状では、プレイヤーが受けるEPダメージ倍率の状態異常modifierに使います。

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
IntrudedA/IntrudedVの解除判定と追加EPダメージに使います。

## 外部ツール向け注意

- 基本編集対象は `effects` と `triggers` です。
- カードと敵行動の互換フィールドはビルダー生成値なので、外部ツールでは直接編集対象にしない方が安全です。
- `starter` と `event` は通常報酬に出ないことをUI上で明示してください。
- `allowedOwners` により、状態異常の付与対象候補をUIで制限してください。
- `maxEp: 0` の敵はEPゲージを持たず、敵へのEP攻撃はMISSになります。
- 状態異常の演出は `visuals` のキー選択までをデータ編集対象にし、演出実装そのものはコード側に置いてください。
