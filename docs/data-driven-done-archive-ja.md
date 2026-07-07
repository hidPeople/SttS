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
