# データ駆動化 完了済みアーカイブ

この文書は、完了したデータ駆動化ToDoを削除せず保管するためのアーカイブです。

## 2026-07-07 完了

### レリック定義を本体情報とタイミング別効果に分離

対応内容:

- `RelicDefinition` から、横並びの `timing`, `hpDamage`, `epDamage`, `hpDrain`, `playerStatuses`, `enemyStatuses` などを廃止。
- レリック本体は `id`, `name`, `rarity`, `description`, `counter`, `triggers` を持つ形に変更。
- `triggers[]` に `timing` と `effects[]` を持たせる構造へ変更。

現在の形:

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
        effect('hpDamage', 'allEnemies', 1),
      ],
    },
  ],
})
```

### 共通 `EffectDefinition` を導入

対応内容:

- カード、敵行動、レリックで共有する効果単位として `EffectDefinition` を追加。
- `kind`, `target`, `amount`, `times`, `percentOf`, `status`, `stacks`, `attackAttribute` を持つ形にした。
- `effect()` ヘルパーでデータ定義しやすくした。

対応した主な効果:

- `hpDamage`
- `epDamage`
- `hpHeal`
- `epHeal`
- `epReserveHeal`
- `block`
- `drawCards`
- `energyGain`
- `status`
- `hpDrain`

### カード定義を `effects` 中心へ移行

対応内容:

- `src/data/cards.ts` のカード定義を `defineCard` と `effects` 形式へ変更。
- 現行戦闘ロジックとの互換のため、`defineCard` が `hpDamage`, `epDamage`, `playerStatuses`, `enemyStatuses` などの旧フィールドを生成する。

補足:

- 戦闘処理はまだ旧互換フィールドを多く参照している。
- そのため「完全にeffectsを直接実行する形」への移行は未完了ToDoとして残す。

### 敵行動定義を `effects` 中心へ移行

対応内容:

- `src/data/enemies.ts` の敵行動を `defineEnemyIntent` と `effects` 形式へ変更。
- 敵行動の条件、使用回数制限、行動名は行動メタ情報として残した。
- 現行戦闘ロジックとの互換のため、`defineEnemyIntent` が `hpDamage`, `epDamage`, `playerStatuses`, `enemyStatuses` などの旧フィールドを生成する。

補足:

- 戦闘処理はまだ旧互換フィールドを多く参照している。
- そのため「完全にeffectsを直接実行する形」への移行は未完了ToDoとして残す。

### レリックtriggerの共通Effect実行器を追加

対応内容:

- `BattleScene` に `applyRelicTriggerEffects` と `applyRelicEffect` を追加。
- `battleStart`, `turnStart`, `enemyEpPeak`, `enemyDamaged`, `cardDrawn`, `blockGained` から、該当timingのレリックtriggerを実行するように変更。
- `passive` は、現状では `epDamage` / `selectedEnemy` の効果を敵EPダメージ補正として集計する。

補足:

- レリックはカード・敵行動より先に `effects` を実行する構造へ移行済み。
- ただしフックコンテキストはまだ薄いため、複雑な条件や詳細なダメージ反応は今後の課題。

### レリック効果の対象指定を初期対応

対応内容:

- `EffectTarget` に以下を用意。
  - `player`
  - `self`
  - `selectedEnemy`
  - `triggerEnemy`
  - `allEnemies`
- レリック効果では `player`, `selectedEnemy`, `triggerEnemy`, `allEnemies` を処理可能にした。

補足:

- `self` は主に敵行動用で、レリックでは現状プレイヤー扱いにしている。
- 将来、レリック自身や発動主体を明示する必要が出たら再設計する。
## 状態異常の効果をデータ化する

完了日: 2026-07-08

完了内容:

- `StatusDefinition` を `src/models/types.ts` に追加し、状態異常が `allowedOwners`, `remain`, `triggers`, `iconText`, `iconColor`, `exclusiveGroup`, `groupRank` を持てるようにした。
- `StatusTriggerDefinition` を追加し、状態異常が `timing`, `effects`, `modifiers`, `visuals`, `consumeRule`, `conditions`, `order` を持てるようにした。
- `src/data/statuses.ts` を trigger/effects 形式へ移行した。
- Lingeringのターン開始時エナジー消費と専用演出を、状態異常データの `turnStart` trigger から実行するようにした。
- Horny/Heat/Frustratedのターン開始時RubOneOut追加、EPダメージ倍率、EP Peak時解除、エナジー+1を状態異常データから実行するようにした。
- IntrudedA/IntrudedVのターン開始時Purge追加、Purge成功時解除、プレイヤーEPダメージを状態異常データから実行するようにした。
- InfestedA/InfestedVのターン開始時EPダメージを状態異常データから実行するようにした。
- 状態異常のアイコン文字と色を `statuses.ts` に移した。
- `allowedOwners` により、プレイヤー専用/敵専用の状態異常を定義できるようにした。
- 状態異常triggerの `visuals` から、既存演出キーを選択して呼び出せるようにした。

残した理由のある専用処理:

- Charmによる敵行動プール変更は、敵AIの行動選択と密接に結びついているため、今回は `Enemy.currentIntent()` 側に残した。
- プレイヤーEP Peak時にLingeringを付与する処理は、EP Peakそのものの基本仕様として `Player.recoverFromEpPeak()` 側に残した。
- カード・敵行動はまだ互換フィールド経由の処理が多いため、完全な共通Effect実行器への移行は未完了ToDoに残した。

## 共通Effect実行器をカード・敵行動にも本格適用する

完了日: 2026-07-25

完了内容:

- `BattleScene` に `executeEffects` / `executeEffect` を追加し、カード、敵行動、レリック、状態異常triggerの効果解決入口を共通化した。
- レリックtriggerは `applyRelicTriggerEffects` から共通Effect実行器を呼ぶ形へ変更した。
- 状態異常triggerは、消費ルールや演出キーを維持しつつ、効果本体を共通Effect実行器で処理する形へ変更した。
- カード使用処理は `CardDefinition.effects` を実行する形へ変更した。
- 敵行動処理は `EnemyIntent.effects` を実行する形へ変更し、自己効果、プレイヤーへの効果、自傷を同じEffect列から解決するようにした。
- カード色、カード説明、敵の次行動表示、敵対象判定の主要部分を `effects` から読むようにした。
- `times` による複数回効果を共通Effect実行器側で処理するようにした。

残した理由のある専用処理:

- PhaserのTween、ダメージ数字、HP/EPバー、手札アニメーションなどの実体はSceneに強く依存するため、共通Effect実行器は `BattleScene` 内に置いた。
- `hpDamage`, `epDamage`, `playerStatuses`, `enemyStatuses` などの互換フィールドは、型互換と段階移行のためまだ `defineCard` / `defineEnemyIntent` で生成している。
- `manualOfBrothel` のような `passive` 補正は、現在も計算関数側でpassive effectを集計して扱っている。
- Charmによる敵行動プール変更、EP Peakの基本処理、Purge成功/失敗判定は、ゲームルールと強く結びつくため専用処理を残している。
