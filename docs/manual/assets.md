# 画像・スプライト・立ち絵

[目次](README.md) / [全項目](reference-types.md) / [描画品質・演出時間](presentation.md)

## スプライトシート

敵は [enemySprites.ts](../../src/data/enemySprites.ts) のENEMY_SPRITES、演出は [sprites.ts](../../src/data/sprites.ts) のEFFECT_SPRITES、UI素材はUI_SPRITESです。共通のSpriteDefinitionを使います。

| 項目 | 必須 | 意味・単位 |
| --- | --- | --- |
| textureKey / animationKey | 必須 | 素材全体で衝突しない登録キー |
| source | 必須 | Viteで解決可能な画像URL。既存のnew URL記法を踏襲 |
| frameWidth / frameHeight | 必須 | シート内1コマのpx。正の整数 |
| frameCount | 必須 | 使うコマ数。左上から行順。シートのコマ総数以下 |
| frameRate | 必須 | fps、正の数 |
| displayWidth / displayHeight | 必須 | ゲーム内の表示px。両方指定、元の比率と違えば変形 |
| repeat | 任意 | 追加の再生回数。省略／0は1回、-1は無限 |

sourceの例：new URL('../../Sprite/example.png', import.meta.url).href。OS上の絶対パスは登録せず、バンドルされる素材パスを使います。敵用sprite(...)ヘルパーは共通シート値を補完します。違う仕様の素材は戻り値を上書きするか全項目を定義します。

### 敵固有設定

opaqueBoundsは必須で、left/right/top/bottom全てを**1フレーム内の座標**で指定します。全コマの不透明部分を含む外接範囲で、左右上下端を含みます。画像変更時は範囲も再測定してください。bodyOffsetY（px、省略0）、attackAnimationTimeScale（攻撃時速度倍率、省略時は速度変更なし）は任意です。

ゲーム実行中に全コマを走査しません。開発時に透明度alpha>8を基準として測定し、定数として保存します。素材チェッカーで設定を確認できます。

敵定義のspriteはENEMY_SPRITESキー。spriteRulesはsprite必須、conditionsとintentIds任意の配列です。両方あれば両方で絞り込み、先頭から成立する差し替えを使います。未成立なら通常spriteへ戻ります。

名前・バー・状態欄・予告・影は不透明範囲に合わせます。クリック範囲だけは行動予告上端～EPバー（なければHPバー）下端、幅は不透明範囲とHPバーの大きい方へ拡張します。画像の透明余白や敵列全体の幅ではありません。レティクルはダメージ振動から独立します。

### 攻撃属性への割り当て

DAMAGE_SPRITE_EFFECTS[AttackAttribute]のspriteIdsはEFFECT_SPRITESキー配列です。必須はspriteIds、depth、alpha、finish。finish内部はduration(ms)、scaleMultiplier、alpha、ease全て必須。

任意のcountはamountPerSprite・max、scatterはx・y、motionはdistanceRatio・verticalRatio・duration・easeをそれぞれ全て指定します。距離比率は表示寸法に対する比率。alphaは0～1、easeはPhaserのイージング名です。有限演出には無限ループ素材を割り当てないでください。

UI_SPRITESへ追加しただけでは画面に置かれません。再生するUI側からの呼び出しが別途必要です。

## プレイヤー立ち絵の登録と配置

素材はimage/characterへ置きます。[characterPortraits.ts](../../src/data/characterPortraits.ts) のCHARACTER_PORTRAITSは**拡張子なしファイル名**がキー。値は配置オブジェクトまたは別キーを指す文字列です。

~~~ts
Succubus_normal_idle_1: { displayHeight: 700, offsetX: 0, offsetY: 0 },
Succubus_Death_1: 'Succubus_tutorial_Starvation_EPdamage_1',
~~~

例の数値は現在の設定値の指定ではありません。

| 項目 | 必須 | 意味 |
| --- | --- | --- |
| displayHeight | 配置オブジェクトで必須 | 共通倍率1での高さpx。幅は元画像の縦横比から計算 |
| offsetX / offsetY | 任意、省略0 | 画像中心X／画像上端Yの補正。表示倍率を掛ける前の座標 |

通常の基準はプレイヤーの中心X、PLAYER_STATUS_HUD_LAYOUTのアイコン下端Y。共通倍率はplayer.tsのPLAYER_PORTRAIT.battleScale。上端基準で拡大します。ダメージ演出の発生位置は画像配置から独立しています。

未登録でも検出されたファイルにはDEFAULT_CHARACTER_PLACEMENTが使われます。この定数は新規追加時の既定値にも使います。登録済みオブジェクトの必須displayHeightを省略するための定数ではありません。

文字列参照は画像・配置を共有します。配置を変えるなら参照元を編集します。多段参照可、循環・存在しない参照は禁止。同じ画像をコピーせず別条件に対応できます。

CHARACTER_IMAGE_DIRECTORYとCHARACTER_IMAGE_EXTENSIONはパスの共通部分です。ただし素材列挙のVite globは静的記述のため、フォルダや拡張子を変える際はportraitAssets.tsとツールの列挙対象も併せて変更します。

## 自動選択のファイル名

基本形は PlayerID_区分_要因_要因_No.png。区分はnormalまたはイベント戦闘ID。区分を省いた名前は共通候補です。Noは1以上の整数のバリエーション番号。要因IDにアンダーバーがあっても辞書で解析しますが、複数に解釈できる命名・同タグ重複・idleとイベントタグの同居は無効です。PlayerIDはPLAYER_DEFINITION.idと一致させます。

要因は [portraitFactors.ts](../../src/data/portraitFactors.ts) のPORTRAIT_FACTORSで有効化します。複数要因はANDです。idleはその区分の通常画像として使用します。

| 配列 | 登録値の参照先・有効な間 |
| --- | --- |
| states | PortraitState。DeathはHP<=0。HPの割合条件とは独立 |
| statuses | STATUS_DESCRIPTIONSのID。所持中／数量閾値成立中 |
| connections | hasInserted / hasIntruded。生存敵の誰かとの該当接続中 |
| relics | RELIC_DEFINITIONSのID。所持中 |
| events | PortraitEvent。HPdamage、EPdamage、peak、AftershockBreathの処理解決中 |
| cards | CARD_DEFINITIONSのID。そのターン最後に使用したカード。次カード使用／次ターンで解除 |
| percentComparisons | HP / EP。ファイル名に比較条件を後付け |
| interactions | hover。不透明部分へのマウスホバー。前面UIは貫通しない |

全配列とThresholdOrderは型上必須。使わない配列は空にできます。優先順位は**実データの項目を上から、各配列も前から**です。型定義の並び順ではありません。priorityという別数値はありません。

EPdamageは攻撃開始からバー・振動・Peak解決まで、peakは最大EP到達から下限へ戻るまで。AftershockBreathは対応triggerにportraitEventを指定した処理全体です。上位の成立要因に対応画像があれば割り込み、解消後はまだ成立している以前の候補へ戻ります。候補がない要因だけで画像を消すことはありません。

### 閾値の名前

- Aftershocksgte5 または Aftershocks_gte5：その状態のスタック／残りターンが5以上。statuses配列にはAftershocksだけを登録。
- EPgte50per または EP_gte50：現在EPが有効最大EPの50%以上。perは省略可能ですが数値は常に百分率。
- HP、EP共にgt / gte / lt / lteを使用。eqは非対応。
- Aftershocksだけなら所持の有無。HPだけには閾値がないので、有効な割合条件になりません。
- 状態閾値は状態を所持していることも必要。状態がないときのlte0判定には使いません。

ThresholdOrderは同じ要因・同じ方向の閾値同士でstricter（厳しい条件）／looser（緩い条件）を優先します。上位カテゴリを覆すものではありません。

同条件・同区分に複数番号があればランダムで選び、候補が複数なら直前と同じ画像を避けます。割り込みから戻る際は以前の画像を復帰させます。現在イベント区分の成立候補がなければnormalへ戻します。現在区分のidleが成立する場合、normal側のイベント画像へはフォールバックしません。その後、区分なし共通候補と条件優先度で比較し、同条件なら区分候補を優先します。

### ホバー・切り替え・素材追加

hover切り替え中は切り替え前と後の画像の当たり判定を保持し、両方から離れて解除します。安定待ち時間はPLAYER_PORTRAIT_HOVER.delayMs。待機後の切り替え時間はPLAYER_PORTRAIT_RENDERING.transitionDuration。新画像を前半でフェードインし、後半で旧画像をフェードアウトします。

画像一覧はビルド時にViteから取得します。開発中に素材を追加したらツールを更新し、配布版には再ビルドが必要です。ランタイムにOSフォルダを監視する仕組みではありません。命名しただけで新しい要因の評価器が増えるわけではなく、新しい要因種別には型・選択器・ツールの対応が必要です。

## 画像追加時の読み込み範囲

立ち絵は、現在のプレイヤーID・戦闘区分に対応する候補を戦闘開始前にまとめて読み込みます。normalのフォールバック候補と区分なしの共通候補も対象です。hover・状態異常・カードなどによる切替時に個別ロードはしません。別名参照の場合、参照元の画像名が別区分でも必要な画像として読み込まれます。

敵画像は、実際に登場する敵のspriteとspriteRulesで指定した差分のみを読み込みます。新しい敵をデバッグ追加するときも、読み込み完了後に表示されます。背景は現在の戦闘で選ばれた画像、会話は対象のCONVERSATIONS IDに含まれる背景・立ち絵のみが対象です。戦闘中の会話はbeforeDrawEventsに指定されたIDを先読みします。共通の攻撃エフェクト・UIスプライトは戦闘用に先読みします。

同じ画像・別名参照はテクスチャキーで共有されます。読み込み済み素材はゲームを閉じるまで再利用するため、再戦や再訪では再読み込みを省略します。フォルダへのファイル追加だけで無関係な戦闘の全画像読み込みが増えることはありませんが、同じ区分の立ち絵候補を増やした場合は、その区分の読み込み量が増えます。
