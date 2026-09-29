# カードと説明文

[目次](README.md) / [全入力項目](reference-types.md#carddefinitioninput) / [効果](effects.md)

## カードを登録する

編集先は [cards.ts](../../src/data/cards.ts) の CARD_DEFINITIONS。値は defineCard({...}) で作ります。

| 項目 | 必須 | 設定と意味 |
| --- | --- | --- |
| id / name | 必須 | 登録キーと同じid、日英表示名 |
| rarity | 必須 | types.ts の Rarity。報酬抽選区分 |
| categories | 必須 | CardCategory配列。先頭は色付きカテゴリ。noMotionは2番目以降 |
| cost | 必須 | 消費エナジー。0以上の整数 |
| effects | 必須 | effect(...)配列。効果がなければ空配列 |
| conditions | 任意 | 使用可能条件。省略／空配列は追加制限なし |
| playCondition | 任意 | 互換用の旧指定。新規はconditions推奨 |
| attackAttribute | 任意 | 個別効果に指定がない時の攻撃属性。省略時strike |
| vanish / temporary | 任意 | 使用時消滅／使用後や手札破棄時に消える一時カード。省略時false |
| description | 任意 | 自動生成以外の文章、または効果参照を含む任意文 |
| textOrder | 任意 | 説明の並び。省略時は入力オブジェクトの記述順から生成 |
| displayNameRules | 任意 | conditionsとnameの組。条件一致による名称上書き |
| flavors | 任意 | イベント別の文章。未指定なら個別追加なし |
| relatedEnemyName / relatedIntrusionPart | 任意 | 原因敵・部位に応じて生成されるカードの表示情報 |
| purgeTargetName / purgeStatus | 任意 | 除去カードの対象名・原因状態ID。通常カードでは不要 |

HP/EPダメージ、回数、自傷、回復、ブロック等の内部集計値はeffectsから生成されます。CardDefinitionに存在するからといって hpDamage や selfEpDamage を追記しません。

例（値は記法説明用）：

~~~ts
sample: defineCard({
  id: 'sample', name: l('Sample', '例'), rarity: 'common',
  categories: ['attack'], cost: 1,
  effects: [effect('hpDamage', 'selectedEnemy', 6)],
}),
~~~

カテゴリの表示色は [cardCategories.ts](../../src/data/cardCategories.ts) の CARD_CATEGORY_COLORS、快楽渇望中に使用可能なカテゴリは同ファイルの CRAVING_PLAYABLE_CARD_CATEGORIES です。noMotionは拘束中の使用可否にも関係します。新カテゴリの追加には型・色・必要な制限処理を揃えます。

## 自動説明と任意文

効果、条件、カード挙動から同じ生成器が説明を組み立てます。山札・捨て札・報酬・編集ツールは基礎値、手札は戦闘状況を反映した予測値です。変化した数値だけが強調されます。ランダムは範囲表示し、乱数を先に引きません。

descriptionは任意です。既に効果から書かれる内容を固定文で二重記載しないでください。効果を任意の文章に組み込むには次の参照を使います。

| 記法 | 意味 |
| --- | --- |
| {selectedEnemy.hpDamage.amount} | 対象と効果種別で1件に決まる効果の量 |
| {effect.main.amount} | options.textIdをmainにした効果の量 |
| {effect.main.text} | その効果の自動文全体 |
| amount / times / status / stacks / ratio / base / chance / text | 参照の末尾に使えるフィールド |

~~~ts
// 同種の効果が複数あるときはtextIdで区別。
description: l('Strike for {effect.main.amount} HP damage.',
               '鋭く斬り、{effect.main.amount}HPダメージ。'),
effects: [effect('hpDamage', 'selectedEnemy', 6, { textId: 'main' })],
~~~

任意文で参照した効果の自動文は重複出力されません。参照しなかった効果は自動表示されます。回数・確率・ターン制限など、任意文で未参照の補足は残ります。同一対象・同種効果が複数ある場合はtextIdを一意にしてください。カードの値参照とログの {amount} は別の仕組みです。textIdに空白・ピリオド・波括弧は使えません。

textOrderは description / conditions / effects / categories / vanish / temporary または effect.textId の配列です。**説明順だけを変え、効果の実行順は変えません**。effects配列自体を並べ替えると同じ実行優先度内の順序に影響するので、見た目の並び替えにはtextOrderを使います。

不動・消滅・一時カードは常に説明の末尾にまとめます。複数語は日英それぞれの区切りで1行にします。

## 手札での補正と注意点

- arousalグループの状態付与は、現在状態からの強化・据え置き・付与不能まで予測して説明します。状態は予測で変更しません。
- 手札で最終的なEP自傷が0の場合、その自動説明行を表示しません。基礎値表示では、固定の正のEP自傷が1未満なら切り捨ての注記を付けます。割合係数そのものはこの判定の対象外です。
- description内に直接書いた固定文は、自傷が0でも自動削除されません。全体の出し分けが必要なら効果の自動文またはtext参照を使います。
- 予測は現在の文脈による値です。未確定の確率成功や未来の連鎖を確定結果として表示しません。

## 用語・文章テンプレートを変える

[cardText.ts](../../src/data/cardText.ts) で表示文を調整します。各定数の下位項目は [設定リファレンス](reference-config.md) にあります。

| 定義 | 編集対象 |
| --- | --- |
| CARD_EFFECT_TEXT | EffectKindごとの自動文。既存の置換キーを維持 |
| CARD_TEXT_TARGETS / CARD_VALUE_BASES | 対象・割合基準の表示名 |
| CARD_TEXT_PHRASES | ランダム、回数、確率、条件、切り捨て等の補足 |
| CARD_CONDITION_NAMES / CARD_CONDITION_OPERATORS | 条件説明の名称と比較語 |
| CARD_SYSTEM_TERMS | block / noMotion / temporary / vanish のname・description |
| CARD_SYSTEM_TERM_COLOR | システム用語色。状態異常用語色とは別 |
| CARD_BLOCK_CARRY_DESCRIPTION | ブロック持越しが有効な時のTips |

状態異常名とTipsはstatuses.tsを参照します。説明欄の改行・用語ホバー処理は表示箇所で共有され、全置換後の文章を折り返します。

### 自動文テンプレート内の差し込み値

CARD_EFFECT_TEXTは次の値を受け取ります。これはdescriptionで使う3要素の参照記法とは別で、テンプレート内では単に {amount} 等と書きます。

| 差し込み値 | 内容 |
| --- | --- |
| amount | 基本量／手札での補正量。ランダム・対象差は範囲になる |
| target | CARD_TEXT_TARGETSによる対象名 |
| times / repeat | 回数／複数回の場合の乗算付き表記 |
| status / stacks / stackSuffix | 状態名／付与数／複数スタック用の補足 |
| from | 強化前の状態名（upgrade文） |
| ratio / base | 割合設定の百分率／基準名 |
| chance | 百分率に換算された発動確率 |
| card / block | 追加するカード名／ブロックの用語 |

CARD_TEXT_PHRASESは用途に応じて差し込み値が異なります。

| 項目 | 使用する値 |
| --- | --- |
| random / chance / probability / repetitions / condition | value |
| percent | value、base |
| supplement | target、value |
| upgrade | target、from、status |
| unchanged / blocked | target、status |
| energyGain / energyLoss | amount、repeat |
| fractionalSelfEpDamage / keywordSeparator / turnOnly / turnStart | 差し込みなし |

CARD_SYSTEM_TERMSのnameとdescriptionは両方必須です。CARD_CONDITION_NAMESとCARD_CONDITION_OPERATORSは該当型の全キーに表示文を定義します。

### HP・EP割合の使用条件

hpPercent／epPercent条件のvalueは百分率で指定します。たとえばvalue: 50は50%の条件として評価され、カード説明にも50%と表示されます。日本語の大小比較は「HP割合 50% 以下」のように数値の後へ比較語を置き、英語や等号・不等号記号は演算子を数値の前に置きます。効果の割合指定（setEpRatio等の0～1）とは単位が異なります。
