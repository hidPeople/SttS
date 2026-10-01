# 画像・スプライト・立ち絵

[目次](README.md) / [全項目](reference-types.md) / [描画品質・演出時間](presentation.md)

## カードの画像とレアリティ縁

[cardAppearance.ts](../../src/data/cardAppearance.ts) を編集します。画像は `image/card/カードID_バトルID.png` に置きます。通常戦闘のバトルIDは `normal`、特殊戦闘は `EVENT_BATTLES` のIDです。画像ファイル名をソース内に指定する必要はありません。

`CARD_ARTWORK` はカードID → バトルID → 配置設定の順です。特殊戦闘用の画像があればその画像とそのバトルの配置を使い、なければ `normal` の画像と配置へ戻ります。両方の画像がなければ黒い背景のままです。配置未登録の画像も、画像中央・自動倍率で使えます。画像をまだ置かず、配置だけ先に登録してもエラーにはなりません。手札・山札・捨て札・拡大表示・報酬で同じ選択方法を使います。

別カードと画像・配置を共有する場合は、配置一覧の代わりに`CARD_ARTWORK`の登録キーを文字列で指定します。

```ts
rubOne: 'rubOneOut',
```

この場合は全戦闘区分で`rubOneOut`の画像と配置を使います。参照先のtutorial画像がなければ、参照先のnormal画像・配置へ戻ります。カード名・効果・コスト・レアリティは参照しません。参照の連鎖も使用できますが、参照先の登録は必須で、循環参照はできません。参照元の設定変更は共有先にも反映され、画像ファイルのコピーは不要です。

カードIDは `defineCard` 内の `id` です。登録キーと異なるカードもあるため、その場合は `id` を使います（例：三日月斬りは `Crescent Slash_normal.png`）。

~~~ts
exampleCard: {
  normal: { offsetX: 0, offsetY: 0, rotation: 0 },
  tutorial: { focusX: 500, focusY: 500, scale: 0.25, rotation: 0 },
},
~~~

| 画像設定項目 | 必須 | 意味・省略時 |
| --- | --- | --- |
| focusX / focusY | 任意 | カード中心に合わせる元画像上の座標px。左上原点。省略した軸は画像中央 |
| scale | 任意 | 元画像pxに対する等倍カード内の倍率。正の数。省略時は画像領域を覆う倍率 |
| offsetX / offsetY | 任意 | 中央からの位置補正px。右／下が正。省略時0 |
| rotation | 任意 | focus位置を中心とした時計回りの回転角度。度。省略時0 |
| edgeFade | 任意 | 画像四辺を透明にぼかす幅。等倍カード内px、非負。0で無効。省略時CARD_FRAME.imageEdgeFade |

画像は外枠飾りの内側全体に配置され、名前欄・説明欄はその上に重なります。画像は枠内に切り抜かれ、画像の端が枠内にある場合は黒地になじみます。倍率や回転で画像が覆わなくなった部分も黒地です。画像は表示時に読み込み、同じ配置は加工済みテクスチャを再利用します。新規ファイル追加後は開発サーバーの再読み込み／配布ビルドが必要です。

### 編集ツールでの配置調整

「最新の情報に更新」後、「カード画像・レアリティ縁」タブ → `CARD_ARTWORK` → カードIDを選択します。カード編集タブの「カード画像の配置へ」からも移動できます。プレビューの戦闘区分を選び、画像のドラッグで左右・上下位置を変更するか、基準座標・倍率・回転・ぼかし幅を入力します。空欄は省略時の値です。名前・説明欄の重ね表示は切り替え可能で、文字のみ簡略表示です。画像の配置・切り抜き・端のぼかしは本体と同じ処理です。

「画像・配置を参照する」で参照先を選択できます。参照中の配置プレビューは読み取り専用です。画像下の参照元リンクから編集先へ移動してください。「参照をやめて個別配置を設定」は参照元の配置をコピーしますが、その後は自分のカードIDの画像ファイルが必要です。未登録・循環参照は本体適用前に検出します。

「プレビュー値を下書きへ反映」で編集した戦闘区分をまとめて下書き保存し、「本体へ適用・ビルド」で本体へ適用します。プレビュー内の調整だけでは本体を書き換えません。選んだ戦闘用の画像がない時、プレビューは黒地と不足ファイル名を表示します。フォームやTS欄を変更した後は「プレビューを再読込」で読み直してください。この操作やカード／タブの移動では、まだ下書きへ反映していないプレビュー調整は破棄されます。

`CARD_FRAME` の全項目は必須です。`cornerRadius` は角丸半径px、`rimWidth` は四辺共通の縁幅px、`decorationWidth` は内側飾りの線幅px（いずれも非負、カードの半寸法未満）。`background` は背景色0xRRGGBB、`imageEdgeFade` は既定ぼかし幅px（非負）、`textureResolution` は画像・枠の内部描画倍率（正の整数、文字解像度とは独立）です。

`CARD_RARITY_FINISH` は `Rarity` の全種類が必須です。各項目の `base`・`shadow`・`highlight` は必須の数値色0xRRGGBB。斜め方向の濃淡で金属の光沢を表し、同色なら単色になります。

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
| events | PortraitEvent。HPdamage、EPdamage、orgasm、AftershockBreathの処理解決中 |
| cards | CARD_DEFINITIONSのID。そのターン最後に使用したカード。次カード使用／次ターンで解除 |
| percentComparisons | HP / EP。ファイル名に比較条件を後付け |
| interactions | hover。不透明部分へのマウスホバー。前面UIは貫通しない |

全配列とThresholdOrderは型上必須。使わない配列は空にできます。優先順位は**実データの項目を上から、各配列も前から**です。型定義の並び順ではありません。priorityという別数値はありません。

EPdamageは攻撃開始からバー・振動・絶頂解決まで、絶頂は最大EP到達から下限へ戻るまで。AftershockBreathは対応triggerにportraitEventを指定した処理全体です。上位の成立要因に対応画像があれば割り込み、解消後はまだ成立している以前の候補へ戻ります。候補がない要因だけで画像を消すことはありません。

Aftershocksの所持・個数条件で表示されている立ち絵は、ターン開始時のAftershocks消費演出中、消費前の個数で判定を維持します。例：`Aftershocksgte5`（`Aftershocks_gte5`も同じ）は演出中に5未満になっても、その理由では切り替わりません。全消費演出終了後に現在の個数で再判定します。追加設定は不要です。AftershockBreathなど他の要因は通常の優先順位に従います。

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

戦闘開始時の立ち絵は、現在のプレイヤー・戦闘区分・状態異常・レリック・HP/EPから選ばれる条件集合と、そのhover候補だけを先読みします。番号違いのランダム候補が同じ集合に複数ある場合は一緒に読み込みます。他の状態の立ち絵は必要になるまで読み込みません。normalや区分なし共通画像は、実際に選択候補になったときだけ対象になります。別名参照の参照元も同じ仕組みで扱います。

敵ターンに入る際と敵行動の実行直前、カード使用が成立した際に、ダメージ演出・状態付与等の効果から候補を先読みします。HP/EP割合の変化は実際のダメージ・回復・数値設定時に判定します。複雑な条件・連鎖効果などで予測できなかった場合も、切替時に必要な画像を読み込みます。待機中は前の立ち絵を残し、完了後に既存のフェードで切り替えます。待機中に要因が解消した画像へ遅れて切り替わることはありません。初めての画像は環境によって表示開始が遅れることがあります。

敵画像は、実際に登場する敵のspriteとspriteRulesで指定した差分のみを読み込みます。新しい敵をデバッグ追加するときも、読み込み完了後に表示されます。背景は現在の戦闘で選ばれた画像、会話は対象のCONVERSATIONS IDに含まれる背景・立ち絵のみが対象です。戦闘中の会話はbeforeDrawEventsに指定されたIDを先読みします。共通の攻撃エフェクト・UIスプライトは戦闘用に先読みします。

同じ画像・別名参照はテクスチャキーで共有されます。読み込み済み素材はゲームを閉じるまで再利用するため、再戦や再訪では再読み込みを省略します。フォルダへのファイル追加だけで無関係な戦闘の全画像読み込みが増えることはありませんが、その場で必要になる条件集合やランダム候補を増やした場合は、対応する場面の読み込み量が増えます。
