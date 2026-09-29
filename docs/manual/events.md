# イベント戦闘・会話・チュートリアルTips

[目次](README.md) / [全項目](reference-types.md) / [会話の見た目と操作設定](presentation.md)

## イベント戦闘

[eventBattles.ts](../../src/data/eventBattles.ts) のEVENT_BATTLESにIDをキーとして登録します。通常と同じ戦闘システムを使い、開始状態と会話等の進行だけを指定します。

| 項目 | 必須 | 内容・参照 |
| --- | --- | --- |
| initialHp / initialEp | 必須 | 開始時の現在値。通常最大値の変更ではない |
| deckIds | 必須 | CARD_DEFINITIONSのキー配列。重複は枚数 |
| statuses | 必須 | {effect: StatusEffect, stacks: 正の整数}配列 |
| enemyIds | 必須 | ENEMY_DEFINITIONSのキー配列。並びが配置順 |
| beforeDrawEvents | 必須 | ターン開始の通常ドロー前イベント。空配列可 |
| victory | 必須 | 現在の対応値はnewGame。通常初期値へ戻して通常1戦目 |
| introConversationId / victoryConversationId | 任意 | CONVERSATIONSキー。戦闘前／勝利後の会話 |
| defeatConversations | 任意 | conditions任意、conversationId必須の候補。先頭一致。終了後イベント再挑戦 |

beforeDrawEventsの各要素はturnが必須（1始まり）。conversationId、repeatWhileStatus、cardIdsは任意です。repeatWhileStatusなしなら指定ターンのみ、あればそのターン以降、状態がある間毎ターン1回。cardIdsを省略すれば会話のみで、会話IDを省略すればカード追加のみです。両方ある場合は会話の後に特殊追加演出を行います。

~~~ts
beforeDrawEvents: [{ turn: 1, conversationId: 'opening' }],
~~~

新IDの登録だけでタイトルのメニュー項目は増えません。新たな開始導線にはTitleScene等の呼出し設定が必要です。背景はBATTLE_BACKGROUNDS.eventsの同じIDへ指定します。

## 会話データ

[conversations.ts](../../src/data/conversations.ts) のCONVERSATIONS[会話ID]はページ配列です。ページ数は配列から決まります。DEFEAT_CONVERSATIONSは敗北原因ID→会話ID、defaultが既定の会話です。新しい原因キーを記述するだけでは敗北検知処理は増えません。

| ページ項目 | 必須 | 意味・省略時 |
| --- | --- | --- |
| text | 必須 | LocalizedText。明示改行は\n |
| speaker | 必須 | quote=プレイヤー名、user=You/あなた、narration=名前欄なし |
| portrait | 任意 | CHARACTER_PORTRAITSまたは自動検出画像の拡張子なしID。空欄は現在の戦闘立ち絵を制御しない |
| background | 任意 | image/からの相対パス（例event/example.png）。空欄はページ背景を表示しない |
| backgroundDim | 任意 | 0通常～1黒。省略0 |
| backgroundTransition | 任意 | 次の節。切り替え先ページに置く |

立ち絵を明示したページでは戦闘の立ち絵を一時非表示にし、指定画像を同じ配置規則で表示します。空欄なら戦闘側の立ち絵に影響しません。専用ノベルシーンには元の戦闘立ち絵がありません。背景は戦闘UIより前、立ち絵・会話・設定より後ろです。

本文の色はspeaker別のテーマ色、名前欄は同じ役割に従います。ページの演出時間はCONVERSATION_WINDOW、専用ノベルの開始・終了暗転はNOVEL_PRESENTATION。いずれもmsです。backgroundDimの変更はbackgroundDimDurationで補間します。

## 背景切り替え

[conversationTransitions.ts](../../src/data/conversationTransitions.ts) のConversationBackgroundTransitionをbackgroundTransitionに置きます。type必須、その他任意でCONVERSATION_TRANSITIONSの共通値を使います。

| type | 演出 | 特有の項目 |
| --- | --- | --- |
| radial | 中心から円状に新画像が広がる（Canvas描画時はクロスフェード） | originX/Yは左上基準0～1。featherは境界ぼかし比率0～0.9 |
| flash | 白フラッシュの途中で交換 | 共通flashFrames、flashSwitchAt |
| pageTurn | 横方向のページめくり | 共通pageFoldWidth(px)、pageFoldAlpha(0～1) |
| fade | 黒暗転して交換 | duration |
| blink | 上下の幕を閉じて交換 | duration |

共通のdurationは全体ms、0は即時。showText=falseで切り替え中の本文を隠します。省略時は共通showTextを使います。**画像が同じページでも指定演出は実行します**。最初のページや、背景画像がない箇所の遷移には適用しません。

~~~ts
background: 'event/example.png',
backgroundTransition: {
  type: 'radial', originX: 1 / 3, originY: 3 / 4,
  showText: false,
},
~~~

共通flashFramesの各点はat（全時間に対する0～1の位置）とalpha（白さ0～1）必須。at順に並べ、flashSwitchAtを白い期間に置きます。maskResolutionは円形ぼかし用マスクの解像度で、素材画像のサイズを変更しません。

## チュートリアルTips

[tutorialTips.ts](../../src/data/tutorialTips.ts) のTUTORIAL_TIPSへ追加します。通常戦闘でも使えます。

| 定義項目 | 必須 | 内容・省略時 |
| --- | --- | --- |
| id | 必須 | Tips内で一意。同じ戦闘では1回のみ |
| battleId | 必須 | normal=通常戦闘全体、それ以外はEVENT_BATTLESキー |
| pages | 必須 | 1ページ以上。各ページはtextとposition必須 |
| turn | 任意 | 指定ターンのみ。省略は全ターン |
| delayMs | 任意 | そのターンで操作可能になってからのゲーム内待機時間。省略は待機なし |
| enemyState | 任意 | inserted / peakAftershocks。該当する生存敵をアンカー・強調対象にする |
| event | 任意 | enemyPeakDrain。敵Peakに伴う吸収演出完了後に表示 |

通常はプレイヤーが操作可能になった時点で条件を判定します。event指定はイベント完了箇所で判定し、通常のdelayMs・enemyStateによる待機／絞り込みを併用しません（battleId・turn・未表示IDで選びます）。配列の上にある候補ほど優先です。delayMsはCtrl早送り対象で、設定・Tips中は進みません。

### ページごとの位置・強調

positionはanchor・x・y必須。anchor=cardの場合だけcardIdも必須です。x/yは補正px、screenなら直接画面座標です。

| anchor | 基準 |
| --- | --- |
| endTurn | ターン終了ボタン |
| card | 指定IDの手札カード |
| enemyIntent | 条件／イベント対象敵の行動予告 |
| enemy | 条件／イベント対象敵 |
| playerEp | プレイヤーEPバー右側。Tips左下基準 |
| screen | Tips左下の画面座標 |

敵基準の位置やhighlightEnemyBarsを使う場合は、enemyStateまたはeventで対象敵を指定してください。必要なカードがまだない場合は表示を待ちます。

任意のhighlightCardIdは同じIDの手札を強調。highlightPlayerBars / highlightEnemyBarsはhp・epの配列でバーを強調。highlightEnemy=trueは対象敵のSpriteを強調します。**強調はページごとの指定**なので、次ページでも同じ箇所を残すなら各ページに記述します。

1ページのTipsは範囲外クリックで閉じ、複数ページはクリックで次へ進み、最後に閉じます。出現時の暗転と入力抑止はui.tsのTUTORIAL_TIP_PRESENTATION。演出時間はゲーム速度に追従しますが、入力抑止は実時間です。
