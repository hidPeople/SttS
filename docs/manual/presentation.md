# UI・演出・入力設定

[目次](README.md) / [全設定パス](reference-config.md)

この章の定数オブジェクトは共通設定です。特記のない数値時間はms、座標と寸法はゲーム画面内px、alphaは0透明～1不透明、数値色は0xRRGGBB、文字列色は#RRGGBBです。現在の値は各ソースを正本とします。

## 戦闘背景と登場演出

[battlePresentation.ts](../../src/data/battlePresentation.ts) を編集します。

| 設定パス | 意味 |
| --- | --- |
| BATTLE_BACKGROUNDS.fallback | 既定の背景ファイル。image/background/内の名前 |
| BATTLE_BACKGROUNDS.stages[ステージ番号] | ステージごとの背景 |
| BATTLE_BACKGROUNDS.events[イベントID] | EVENT_BATTLESのIDに対応する背景。ステージ設定より優先 |
| BATTLE_ENTRANCE.playerDuration | プレイヤー立ち絵の回転・フェード時間 |
| BATTLE_ENTRANCE.enemyDuration | 敵1体の下からの出現時間 |
| BATTLE_ENTRANCE.nextEnemyProgress | 前の敵がこの比率まで出現したら次を開始。0～1 |
| BATTLE_ENTRANCE.enemyOrder[敵数] | 画面左から数えた0始まりインデックスを並べた順序 |

両定数の上記トップレベル項目は必須です。stages/eventsに該当キーがなければfallbackへ、enemyOrderに該当する人数がなければ通常順へ戻ります。登場演出は初期状態付与・カードドローと並行し、完了を待って戦闘初期化する方式ではありません。

## UI設定 ui.ts

[ui.ts](../../src/data/ui.ts) の各項目は共通設定として必須です。

| 定数・項目 | 意味・範囲 |
| --- | --- |
| ENEMY_INTENT_COLORS.hpDamage / epDamage | 敵行動予告のHP／EP数値色。攻撃と敵自傷で共通、#RRGGBB |
| ENEMY_INTENT_TEXT.fontSize / numberFontSize | 行動名・区切り／数値の文字サイズpx |
| CRAYON_ANIMATION.redrawDuration | 描き替え全体の**秒数**。非負、0即時 |
| PLAYER_PORTRAIT_RENDERING.transitionDuration | 立ち絵の切り替え全体ms。前半新画像フェードイン、後半旧画像フェードアウト |
| PLAYER_PORTRAIT_RENDERING.smoothingPixels | 表示時平滑化幅px。0無効、大きいほどぼける |
| CARD_TEXT_RENDERING.scaleResolutions | CardTextResolutionPoint配列。cardScaleとresolutionが必須 |
| SELECTION_GLOW.card.usableColor / unusableColor | 選択中の手札が使用可能／使用不可の時の外側発光色。0xRRGGBB |
| SELECTION_GLOW.card.spread | カード等倍時の外側への広がりpx。正の値 |
| SELECTION_GLOW.card.maxAlpha / minAlpha | 脈動の山／谷の不透明度。0～1、minAlphaはmaxAlpha以下 |
| SELECTION_GLOW.card.dimmedMultiplier | 透過カードの光をさらに弱める倍率。0～1。カード本体の透過率も適用 |
| SELECTION_GLOW.card.pulseDuration | 光が弱まり再び強まる1周期。正のms |
| SELECTION_GLOW.enemy.color / spread / strength | 敵の輪郭発光色（0xRRGGBB）／広がり（正のpx）／強さ（非負、0で無効） |
| SELECTION_GLOW.enemy.riseDuration / fadeDuration | 敵の光が広がる時間／消える時間。各々正のms |
| RELIC_HUD_LAYOUT.x / y / iconSize | レリック列の座標とアイコン寸法 |
| PLAYER_STATUS_HUD_LAYOUT.x / y / iconSize | プレイヤー状態欄。下端が立ち絵の基準Yにもなる |
| PLAYER_PORTRAIT_HOVER.delayMs | ホバー開始／解除の安定待ち実時間。0即時、Ctrl短縮なし |
| TUTORIAL_TIP_PRESENTATION.fadeInDuration | 初回の暗転とTipsの出現時間、0即時 |
| TUTORIAL_TIP_PRESENTATION.inputLockDuration | 初回表示からページ送り・終了を禁止する実時間。Ctrl短縮なし |

scaleResolutionsのcardScaleはカード通常表示を1とする倍率、resolutionは1以上の内部文字解像度です。**最も近いcardScaleの設定**を使い、線形補間はしません。配列順は不問です。表示サイズそのものを変える設定ではありません。

PLAYER_PORTRAIT_FLASHはdamageColor、damageCycleDuration、damageFlashCount、orgasmColor、tintRatio、maxTintDurationを全て指定します。通常ダメージ色、周期ms、回数、絶頂色、1周期内の着色割合（0より大きく1未満）、着色時間上限msです。素の画像との点滅で、透明化ではありません。連続絶頂の周期が速くなると着色も短くなります。

クレヨンは初回に一括表示し、同じUIの色・内容・サイズ変更時に描き替えます。短時間に反復するホバー発光では形を作り直しません。Tipsは内容の幅・高さから背景を組み立て、上記定数で個々のTips本文を設定するものではありません。

`src/data/ui.ts` の `END_TURN_PROMPT` は、使用可能な手札がない時のEnd Turn背景の明滅を設定します。`cycleDuration`（必須、正のms）は元の色→濃い色→元の色の1周期で、Ctrl早送り対象です。`minBrightness`（必須、0～1）は最も濃い時の明るさで、1なら色変化なし。背景へのTintのみを変更し、文字色やクレヨンの形状は変更・再生成しません。

手札0枚、または全カードがエナジー不足・拘束・快楽渇望・カード固有条件などで使用不可の場合に明滅します。手札・エナジー・状態変化時にカードの使用可否と同時に判定を更新します。End Turnが押せない間、カード演出・ドロー中、会話・チュートリアルTips・モーダル表示中は明滅せず元の色に戻ります。End Turnへのマウスホバー中も明滅せず通常のホバー色になり、離れた後も条件を満たしていれば明滅を再開します。

## カードの詳細・長押し拡大

`src/data/ui.ts` の `CARD_INSPECTION` で設定します。全項目必須です。

| 項目 | 意味・単位 |
| --- | --- |
| detailScale | 一覧の詳細カードと手札長押しの共通倍率。正の値 |
| detailX / detailY | 山札・捨て札詳細カードの中心座標px。手札長押しは画面中央 |
| progressStartMs | 進捗円の表示開始。非負の実時間ms。これ未満で離すと通常のカード使用 |
| openMs | 長押しで拡大するまでの実時間ms。progressStartMsより大きい値 |
| progressRadius / progressWidth | カーソル周囲の進捗円の半径・線幅。正のpx |
| progressColor / progressAlpha | 進捗円の色0xRRGGBB、不透明度0～1 |
| progressShadow | 背面の影。colorは0xRRGGBB、alphaは不透明度0～1（0で非表示）、spreadは線の外側への広がり、blurは縁と端のぼかし範囲（共に非負px、blur=0でぼかしなし）、offsetX/Yは位置補正px。各子項目必須 |
| shadeAlpha | 拡大表示の背面暗転。不透明度0～1 |

進捗は押下開始から計算するため、表示開始時に途中まで進んだ円が現れます。表示開始後、拡大前に離した場合はカードを使用せずキャンセルします。長押しはCtrl早送りでは短縮しません。使用不可カードも確認可能ですが、ドロー中など操作ロック中は開始できません。

手札の拡大表示には手札と同じ計算済み説明を使用します。一覧は従来どおり基本値です。拡大後の最初のボタン解放は閉じる操作にせず、次のクリック（左右・中・サイド）やキー押下で閉じます。閉じる操作は背後の操作に渡しません。

拡大表示を閉じた後は、現在のマウス位置で手札ホバーを再判定します。カード上ならそのカードをホバーし、カード外ならピック状態を解除します。

## ブロック演出

[blockPresentation.ts](../../src/data/blockPresentation.ts) のBLOCK_PRESENTATIONは全項目必須です。

| 項目 | 意味 |
| --- | --- |
| gainDuration | 付与時の金属化と反射の全体ms |
| guardDuration / guardShieldDuration | 完全防御時の反射／盾・リング・火花の表示ms |
| breakLeadDuration / fragmentDuration | 亀裂からダメージ演出までの間／破片消失までのms |
| gainSilver / guardSilver / reflectionStrength | 付与時銀色／防御時銀色／反射光の強さ、0～1 |
| reflectionWidth / reflectionSlant | 反射帯の表示範囲に対する幅比／傾き |
| shieldSize | 盾の半幅px。立ち絵サイズから独立 |
| shieldFill / shieldEdge / highlight | 塗り／縁／光の数値色 |
| shieldFillAlpha / edgeWidth | 盾の不透明度／縁幅px |
| riseCount / riseDistance | 上昇光の本数（整数）／移動距離px |
| depth | Phaser表示深度 |

これは演出だけの設定です。ブロック値・保持条件はカードや状態・レリックのeffectで指定します。破片の消失はダメージ演出と並行します。

手札はマウスホバー・キーボード選択のどちらでも同じ発光を使い、選択中にエナジーや使用条件が変われば色も更新します。敵はクリック・キーボード操作で選択先を切り替えた時に一度発光します。敵の輪郭発光はWebGL表示で有効です。これらの演出時間はCtrl早送りに追従します。

## 会話のデザイン・透過度・オート

[conversationAppearance.ts](../../src/data/conversationAppearance.ts) を編集します。

| 定数・項目 | 必須 | 意味 |
| --- | --- | --- |
| CONVERSATION_APPEARANCE.design | 必須 | graphite / paper / night |
| CONVERSATION_APPEARANCE.backgroundOpacity | 必須 | 0透明～1不透明。UIの「透過度」はこれの逆 |
| CONVERSATION_APPEARANCE.showDesignSelector | 必須 | デザイン切替ボタンを表示するか |
| CONVERSATION_THEMES[design].name | 必須 | 管理用日英名 |
| surface / accent / progressColor | 各テーマ必須 | 背景・アクセント・オート進行バーの数値色 |
| ink.quote / narration / user | 各テーマ必須 | 話者別の文字列色 |
| outline | 各テーマ必須 | 文字の縁色 |
| NOVEL_AUTO.baseMs / perCharacterMs | 必須 | 基本待機ms／重み付き1文字あたり追加ms |
| NOVEL_AUTO.latinWeight / japaneseWeight | 必須 | 英字等／日本語等の文字重み |

オート時間はbaseMs + 重み付き文字数×perCharacterMs（実時間）。改行は文字数に含めません。オート・ボタンスキップ中の操作は停止に使い、そのクリックでは次へ進みません。戦闘中の会話にはオート／スキップボタンを出しません。透過度が半分以上になると操作部を隠し、ポインターが近づくと表示します。

会話ログも同じテーマになります。ログは本文と別の表示領域で、閉じるボタン・枠外クリックで閉じます。戦闘中常設のフレーバーログにはこのテーマ設定を適用しません。

形状はソースのUI実装です。Aの広いクレヨン背景は事前生成素材を使用します。形状そのものを変える場合は [会話設計](../conversation-window-design-ja.md) の再生成手順を参照してください。

## 会話操作・時間

[conversations.ts](../../src/data/conversations.ts) のCONVERSATION_WINDOW.openDuration / closeDuration / backgroundDimDuration、NOVEL_PRESENTATION.fadeInDuration / fadeOutDurationは必須のms設定です。

NOVEL_CONTROLSのadvance・log・hideはそれぞれkeys、buttons、wheelが必須。keysはKeyboardEvent.codeの配列（KeyZ、Enter等）、buttonsは0左・1中・2右・3戻る・4進むの配列、wheelはup / down / none。skipにはkeysとintervalMsが必須です。これはノベル操作の割当であり、戦闘操作全体の割当ではありません。

標準の役割は、進む・ログ・ウインドウを隠す・押下中スキップです。非表示中の進むはまず本文を復帰し、ログ表示要求なら復帰してログを開きます。ログ中の隠す操作はログだけを閉じます。スキップ中はページを早送りし、シーン暗転等はゲーム速度に追従します。

戦闘の選択・確定は左クリック。右クリックは設定／戻る／確認ダイアログの「いいえ」。会話が開いているときは会話操作が優先します。キーボード選択の枠はキーボード操作時だけ表示します。

## data以外にある見た目の設定

| 対象 | 定義先 | 注意 |
| --- | --- | --- |
| フォント | [fonts.ts](../../src/ui/fonts.ts)、fontフォルダ | ロード定義と共通フォント名を揃える |
| カード寸法・パーツ配置 | [cardPresentation.ts](../../src/ui/cardPresentation.ts)、[layout.ts](../../src/ui/layout.ts) | 素材設定だけで変更できないレイアウトもある |
| 戦闘ログ種類別の色 | [battleLogStyle.ts](../../src/ui/battleLogStyle.ts) | 会話テーマ色と別 |
| ゲーム速度 | [gameSpeed.ts](../../src/ui/gameSpeed.ts) | 演出時計と入力安定待ちを区別 |

これらは実装側の共通定義です。データ編集ツールのsrc/data用フォームから全てを編集できるわけではありません。
