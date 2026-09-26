# カード説明のデータ定義

## 共通の表示経路

手札・山札・捨て札・拡大表示・報酬は `src/models/cardDescription.ts` の同じ生成器を使う。日英の文章、対象名、数値の基準、用語Tipsは `src/data/cardText.ts` で編集する。効果種別を追加した時は `CARD_EFFECT_TEXT` にも文章を追加する（未対応は型エラー）。

一覧と報酬は基本値、手札は現在の対象・状態・レリックによる補正値を使う。割合を単に数値へ換算しただけでは太字にせず、補正前後で変化した数字だけ太字にする。数値・用語はセグメントとして保持し、全置換後に共通のカード描画処理で折り返す。

## 自動文と任意文

通常は `description` が不要。`conditions`、`effects`、`categories` の `noMotion`、`vanish`、`temporary` から文章を作る。付与状態の細かな効果は状態のTipsに任せ、状態の全triggerをカードに展開しない。

独自の文章を追加したい場合だけ `description: l(en, ja)` を書く。効果を参照しない文章は補足として追加する。数値や状態名の参照を含む場合は、その効果の自動文だけを置き換える。他の効果・使用条件・カード用語は残る。

```ts
description: l(
  'Slashes with its tail, dealing {selectedEnemy.hpDamage.amount} HP damage.',
  '尻尾で斬りつけ、HPに{selectedEnemy.hpDamage.amount}ダメージ。',
),
effects: [effect('hpDamage', 'selectedEnemy', 15)],
```

参照は `{対象.効果種別.値}`。同じ対象・同種の効果が複数ある場合は、効果のoptionsにカード内で一意な `textId` を付け、`{effect.参照名.値}` とする。配列番号は使用しない。`textId` に空白・ピリオド・波括弧は使用しない。

```ts
description: l(
  'Deal {effect.main.amount} damage, then {effect.followup.amount} damage.',
  '{effect.main.amount}ダメージ、続けて{effect.followup.amount}ダメージ。',
),
effects: [
  effect('hpDamage', 'selectedEnemy', 10, { textId: 'main' }),
  effect('hpDamage', 'selectedEnemy', 3, { textId: 'followup' }),
],
```

| 値の名前 | 内容 |
| --- | --- |
| `amount` | 基本値／手札の補正値。ランダム量は「ランダムに最小～最大」、基本表示のpercentOfは割合式 |
| `times` | 実行回数（status・ドロー・手札追加は実行仕様に従い1） |
| `status` | 付与・解除する状態名。手札のarousal強化時は強化後の状態 |
| `stacks` | 付与スタック数（stacks指定がamountに優先） |
| `ratio` | setEpRatio等の割合を0～100の数値で表示。%は文章に書く |
| `base` | 割合の基準名（現在EP、最大EPなど） |
| `chance` | 発動率を0～100の数値で表示。%は文章に書く |
| `text` | 対象効果の自動文全体。確率・回数・ターン制限を含む |

独自文で参照されていない確率・回数・ターン制限は短い補足行として残す。`{amount}` 単独や存在しない／重複する参照はツールの適用前検証でエラーになる。

排出・引き抜く・拘束抵抗の生成カードは `{relatedEnemyName}` / `{relatedIntrusionPart}` に生成時の情報を渡す。部位の `{defaultVI}` 等、既存の共通名称置換も使用可能。生成処理でdescriptionを書き直さない。

## 表示順と実行順

`defineCard({...})` の項目の記述順を説明セクションの順序として使う。`effects` セクション内は記載順。`playCondition` は `conditions` に対応する。

表示だけを並べ替える時は `textOrder` を指定する。`conditions`、`description`、`effects`、`categories`、`vanish`、`temporary` のセクション名、または `effect.参照名` を並べる。未指定の本文セクションは末尾に補完する。不動・消滅・一時カードは記載順やtextOrderに関わらず、本文の後の最終行へこの順にまとめる。複数ある場合は日本語「、」／英語「, 」で区切り、各用語の青色Tipsを維持する。幅が足りない時はこの行を横方向に縮小して1行に収める。categories・vanish・temporaryの順序指定は互換用として受け付けるが、末尾固定を優先する。個別配置した効果は `effects` に重複させない。

```ts
textOrder: ['conditions', 'effect.followup', 'effect.main', 'categories', 'temporary'],
```

これは説明だけの指定で、実行用effects配列と `cardEffectsInExecutionOrder` を変更しない。実行は従来の種類別優先順に従う。同優先度のeffectsを直接並べ替えると実行順にも影響するため、説明のみの調整には `textOrder` を使う。descriptionで置き換えた効果文はdescription内の参照位置に表示される。

## 手札の予測と用語

- `arousal` グループの状態を単一対象へ付与する時は、現在の状態と既存のgroupRank/付与条件から強化先を表示する。例：自身のムラムラを火照りに強化する。上限段階や付与不可も表示する。
- 手札のEPダメージは実行側の割合計算・倍率計算・強制被ダメージ値を使用する。慰めの自己付与状態の先読みも維持する。複数対象の数値が異なる場合は範囲を表示する。
- randomAmountは乱数を引かず最小～最大を表示する。chanceは成功率を表示する。プレビューで戦闘状態を変更しない。
- ブロック吸収後のHP減少量や、途中のPeak・敵反応・レリック連鎖までの完全な結果予測ではない。割合設定は意図が分かる基準付きの式を維持する。
- 状態異常名は従来のピンクと下線。ブロック・不動・一時カード・消滅は `CARD_SYSTEM_TERM_COLOR`（青）と下線。全画面で同じTipsを使う。ブロックの持越し説明は触手服の所持に連動する。

## 編集ツール

カード画面の「カード説明プレビュー（日英・基本値）」で下書きの文面を確認する。UIからの入力は保存待ち後に反映。TS欄は先に下書きへ反映する。戦闘中の状態を必要とする補正値とカード枠内の改行はゲームで確認する。

ツールは本体の共通説明生成器を使用するが、本体からツールは参照しない。下書きは構文木から値のみ読み取り、入力したJavaScriptを実行しない。リテラル・四則演算・既存ビルダーに対応し、任意関数を使った式などはプレビュー不可として通知する。共通の部位トークン等、ツールで展開していない置換はそのまま表示する。

実装検証はビルド・型・ロジックテストで行う。日英の表示密度、折り返し、太字、用語のホバー操作はユーザーが画面確認する。
