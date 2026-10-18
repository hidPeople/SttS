# カードと説明文

[目次](README.md) / [全入力項目](reference-types.md#carddefinitioninput) / [効果](effects.md)

## カードを登録する

カード上の用語Tips（状態・ブロック・不動・一時カード・消滅）は各定義のnameと説明本文から「名称：本文」を組み立てます。cardText.tsのCARD_SYSTEM_TERMSのdescriptionとCARD_BLOCK_CARRY_DESCRIPTIONには名称を含めません。ブロック持ち越し時もnameはCARD_SYSTEM_TERMS.block.nameを使用します。カード自体の説明生成・textOrderとは別の規則です。

編集先は [cards.ts](../../src/data/cards.ts) の CARD_DEFINITIONS。登録キーがカードIDになり、値は defineCard({...}) で作ります。defineCard内へidを重ねて書く必要はありません。

| 項目 | 必須 | 設定と意味 |
| --- | --- | --- |
| 登録キー / name | 必須 | 一意なカードID、日英表示名 |
| rarity | 必須 | types.ts の Rarity。報酬抽選区分 |
| categories | 必須 | CardCategory配列。先頭は色付きカテゴリ。noMotionは2番目以降 |
| cost | 必須 | 消費エナジー。0以上の整数 |
| effects | 必須 | effect(...)配列。効果がなければ空配列 |
| conditions | 任意 | 使用可能条件。省略／空配列は追加制限なし |
| availability | 任意 | 山札・生成手札・対象条件による追加の使用制限と、使用不可時の日英ログ。詳細は下記 |
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
  name: l('Sample', '例'),
  rarity: 'common',
  categories: ['attack'],
  cost: 1,
  effects: [effect('hpDamage', 'selectedEnemy', 6)],
}),
~~~

カテゴリの表示色は [cardCategories.ts](../../src/data/cardCategories.ts) の CARD_CATEGORY_COLORS、快楽渇望中に使用可能なカテゴリは同ファイルの CRAVING_PLAYABLE_CARD_CATEGORIES です。noMotionは拘束中の使用可否にも関係します。新カテゴリの追加には型・色・必要な制限処理を揃えます。

## 選択・生成カード・戦闘中の成長

`availability`を置く場合、`message: l(en, ja)`は必須です。`conditions`（任意）は通常の条件配列、`drawPileNotEmpty`（任意）は山札が空でないこと、`generatedHandCard`（任意）は使用するカード自身と変換先IDを除いた生成カードが手札にあることを確認します。指定した制限はANDです。使用不可時の半透明表示・選択発光・クリック時の拒否・End Turn誘導は同じ判定を使います。`conditions`不成立の拒否ログにもこのmessageを使います。エナジー不足や拘束による拒否は既存ログを優先します。

戦闘中に追加されたカードは、レアリティや一時カード指定とは独立した`CardInstance.generated`で管理します。同じIDでも初期デッキのカードは対象になりません。「寝落ち」は全ゾーンの生成カードを除外してからFaintedを付与します。Faintedによる残り手札の破棄後も、自動でターン終了はせずEnd Turnを押します。

選択・除外・変換は[共通効果](effects.md)の専用kindを使います。「したたか」は手札取得枠を先に埋め、残りから任意枚数を捨て札枠へ移します。選択済みカードを再クリックすると取り消せます。必要取得枚数を選ぶと確定可能になりますが、全候補を振り分けても自動終了しません。山札が閲覧枚数より少なくても捨て札は混ぜず、残りの候補だけを使います。「整理整頓」は手札のまま任意枚数を選んで確定します。0枚も選べます。

`chooseEffect`の`choices`はplayer対象のdrawCards・block・energyGainから2～3件です。`textId`が成長記録のキーなのでカード内で一意にします。`growthUses`は成長する使用回数（任意、省略0）。1回使うたび、未選択の選択肢へそれぞれの基本amountを加算します。使用回数が上限に達した後は全値を固定します。成長はカード個体別に保持し、手札・山札・捨て札・セーブをまたいで保持、次の戦闘でリセットします。報酬や編集ツールでは初期値、戦闘中の一覧ではその個体の成長値を表示します。

`CARD_TACTICS_UI`（`src/data/cardTacticsUi.ts`）で選択画面の文言・暗転・カード倍率・出現／変換時間を設定します。時間はms、倍率は正数、不透明度は0～1です。変換は旧カードを横に縮めてから新カードを広げる演出で、手札枚数・並び順を維持します。

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
| each | 手札で対象が複数の場合の「それぞれ」。対象数は攻撃回数とは別に扱う |
| times / repeat | 回数／複数回の場合の乗算付き表記 |
| status / stacks / stackSuffix | 状態名／付与数／複数スタック用の補足 |
| from | 強化前の状態名（upgrade文） |
| ratio / base | 割合設定の百分率／基準名 |
| chance | 百分率に換算された発動確率 |
| card / block | 追加するカード名／ブロックの用語 |
| connections | connectionPartsの挿入・侵入状態名（Tips付き）。M/V/A全指定時はallConnectionsの汎用表記 |

CARD_TEXT_PHRASESは用途に応じて差し込み値が異なります。

| 項目 | 使用する値 |
| --- | --- |
| random / chance / probability / repetitions / repeat / condition | value |
| percent | value、base |
| supplement | target、value |
| upgrade | target、from、status |
| unchanged / blocked | target、status |
| energyGain / energyLoss | amount、repeat |
| blockToHpDamageAmount | amount（消費ブロックと同量のHP攻撃）、target。手札の計算済み表示専用 |
| fractionalSelfEpDamage / keywordSeparator / turnOnly / turnStart / eachTarget / allConnections | 差し込みなし |

CARD_SYSTEM_TERMSのnameとdescriptionは両方必須です。CARD_CONDITION_NAMESとCARD_CONDITION_OPERATORSは該当型の全キーに表示文を定義します。

### HP・EP割合の使用条件

hpPercent／epPercent条件のvalueは百分率で指定します。たとえばvalue: 50は50%の条件として評価され、カード説明にも50%と表示されます。日本語の大小比較は「HP割合 50% 以下」のように数値の後へ比較語を置き、英語や等号・不等号記号は演算子を数値の前に置きます。効果の割合指定（setEpRatio等の0～1）とは単位が異なります。


### カード選択画面と除外札の確認

`CARD_TACTICS_UI.inspectGroupGap`は取得枠と捨て札枠の追加間隔（px、0以上）です。`takeColor`・`discardColor`は見出しと点線の色（0xRRGGBB）。捨て札の分母には`(max)`を付け、任意枚数であることを示します。手札除外で選択したカードは`selectedColor`・`selectedAlpha`（0～1）の発光を点灯し続けます。通常のカードと同じ重なり順で、前面のカードに隠れる部分は隠れます。これらは共通UI定義の必須項目で、カードごとの追加設定は不要です。

右下の「除外済」は、この戦闘で除外・消滅したカードの枚数です。クリックすると捨て札と同じ形式の一覧・詳細・Tipsを確認できます。一時カードの消滅、接続先の敵撃破によるカード消滅も含みます。カード変換の変換前画像や単なるゾーン移動は含まず、除外札はシャッフルで戻りません。戦闘セーブで保存し、新しい戦闘では空に戻ります。追加前の古いセーブは空の一覧から再開します。

### 接続型カード・捨て札からの回収

`defineCard`の任意設定`connection`は、カードIDに依存しない接続対象ルールです。`parts`（必須）はM/V/Aの配列で、指定順に挿入状態を持つ生存敵を選び、同じ敵は重複させません。`fallbackPart`（任意）は未接続時の自傷部位です。指定すると未接続時は選択敵を対象にし、省略すると接続中しか使用できません。侵入状態は含みません。既存の敵側`reactionRules`による接続処理を共用します。

接続カードのplayer向けepDamageは接続対象数だけ繰り返し、部位はparts順です。使用開始時の敵反応（beforePlayerSelfEpDamage）が完了した後の回数と部位を保持するため、反応によるAへの接続を反映し、途中の撃破では自傷を中止しません。`repeatSequence`の場合は各巡の開始時に保存し直します。

`targetOccupancy`（任意）は、選択した敵にカードを使えるかを部位の占有状態から制限します。編集先は`src/data/cards.ts`のdefineCard入力、型は`CardDefinition.targetOccupancy`です。省略時はこの制限を行いません。

- `parts`（必須）: M/V/Aの重複しない配列、1件以上。確認する部位と拒否ログの優先順です。
- `kinds`（必須）: `insert`／`intruded`の重複しない配列、1件以上。指定した部位・種別の状態を持つ生存敵がいれば、そのいずれかだけを選択できます。
- `requireFreePart`（任意、既定false）: 上記の占有敵がいない場合、partsの全てが挿入または侵入で埋まっていれば使用を拒否します。既に挿入中の敵を選んだ場合は、新しい空き部位を要求しません。

この設定があるカードは、主対象を別の接続敵へ自動変更しません。`connection`の効果対象は引き続き挿入中の全対象です。拒否時はカード・エナジーを消費せず、既定部位名と占有敵の表示名、挿入／侵入をログに表示します。全て埋まっている場合は部位名を列挙して挿入不可を表示します。部位名は`defaultM`／`defaultV`／`defaultA`、名前は実際の占有敵を使用し、この拒否理由は`availability.message`より優先します。

フェラチオはMのinsert／intrudedを指定します。騎乗位・発情ピストンはV/AのinsertとrequireFreePartを指定します。Vだけが侵入で埋まっている場合は他の敵を選べ、既存の敵反応が対応していればAへ接続します。V/Aがともに侵入で埋まっていれば使用不可です。侵入中の敵自身も、もう一方が空いていれば選べますが、新たな接続が成立するかは敵反応の定義に従います。

`recallFromDiscard: 'playerOrgasm'`（任意）は、絶頂処理時に捨て札から同じ個体を手札へ戻します。手札上限まで捨て札順に回収します。使用中・除外済みのカードは対象外。回収演出は`cardTacticsUi.ts`の`CARD_TACTICS_UI.returnFromDiscard`で調整します（x/y/arcはpx、duration/staggerはms、angleは度）。新規ドロー扱いにはしません。

`availability.reserveRoomRatio`（任意、0～1）は、最大EPにこの割合を掛けた分をリセット下限へ加算できる余地がある場合に限り使用可にします。使用不可理由は同じavailability内の必須`message`へ日英で記載します。

カードの0コスト一時コピーは元の個体の成長を引き継ぎ、コピー後は独立して成長します。生成元レリックを記録し、そのレリックでの再コピーだけを抑止します。戦闘セーブはコピーのコスト・一時性・成長・敵への紐づけを保存します。

`CARD_TACTICS_UI.retain`はターン終了保留画面の説明です。保留選択も確定ボタンでのみ終了し、未選択確定でスキップできます。一時カードは半透明・選択不可。手札なし／対象なしでは画面を開きません。


### 使用条件の文章と長い説明

日本語の数値条件は「ブロック 5 以上」のように値を先に置きます。ただしブロック1以上（gte・value: 1）は「自身ブロックあり」の形式で表示します。状態の有無は「自身：発情状態」「自身：発情状態なし」の形式です。真偽値条件は`CARD_BOOLEAN_CONDITIONS`へ条件IDを任意登録し、必須の`yes`・`no`へ日英の成立／不成立文を書きます。`eq`・`notEq`と`value`から文章を選び、`＝ true`などの実装値を表示しません。未登録の条件は従来の汎用表記を使います。

`blockToHpDamage`の基本説明は`CARD_EFFECT_TEXT.blockToHpDamage`、手札の計算済み説明は`CARD_TEXT_PHRASES.blockToHpDamageAmount`で設定します。消費割合は効果の`amount`（0より大きく1以下）で指定し、手札では現在ブロックから切り上げ計算した消費量・HP攻撃量を同じ値で表示します。編集ツールのプレビューは戦闘状態を持たないため基本説明です。

`retaliation`にEPゲージの有無による使用制限は自動では付きません。EPのない敵への適用は反撃を登録せず、通常のEP攻撃と同様に0ダメージを表示します。使用を制限したいカードだけ`conditions`へ条件を書きます。

長い説明は文字サイズごとに全文を折り返し直し、説明領域に入る最大の文字サイズを選びます。カード作者が改行数や短縮文を別管理する必要はありません。
