# 会話とメッセージログの内部設計

[文書一覧](README.md) / [会話設定](manual/events.md) / [外観・操作設定](manual/presentation.md)

## データと表示の責務

CONVERSATIONSは会話IDからページ配列を引く。ページ数、話者、本文、立ち絵、背景、暗さ、遷移指定をデータに持ち、進行処理は固定ページ数を知らない。EVENT_BATTLESとDEFEAT_CONVERSATIONSは会話を選ぶ側で、本文を持たない。

[conversation.ts](../src/ui/conversation.ts) が開閉・ページ進行・表示の寿命を管理する。[conversationControls.ts](../src/ui/conversationControls.ts) が操作部、[conversationLog.ts](../src/ui/conversationLog.ts) が会話履歴、[novelPlayback.ts](../src/models/novelPlayback.ts) が送りの判定を扱う。戦闘中常設ログとは別の履歴UIとする。

戦闘開始会話（battleStartConversationId）は初期状態異常の付与通知とBattleStart効果を待ち、初回のターンカウンタ更新・回復より前に表示する。ドロー前会話とはタイミングを分離し、会話の中断やシーン終了時は後続の戦闘処理を再開しない。

## 入力と進行状態

開閉中、背景遷移で本文非表示中、ログ表示中、設定画面中など、メッセージを進められない状態を明示する。入力イベントを会話・戦闘の両方へ配信しない。非表示からの復帰とページ送り、オート停止とページ送りを同じ操作で同時に行わない。

オートは重み付き文字数と設定時間から実時間の待機を計算する。ボタンスキップは押下中Ctrlのスキップと同様の進行へ合流し、停止時に速度状態を解放する。ゲーム速度に追従する暗転と、文字送りの待機を二重に加速しない。

履歴には既読ページを保存する。過去ページの閲覧はゲーム状態や会話条件を再実行しない。ログは枠外クリックと閉じる操作で閉じ、閉じるクリックで本文を進めない。

## デザインと広い背景の描画

[conversationSurface.ts](../src/ui/conversationSurface.ts) と [conversationPaint.ts](../src/ui/conversationPaint.ts) がテーマ別の背景を描く。テーマ選択は本文ウインドウと会話ログで共有し、ログ本文の可変行高にノート罫線を流用しない。

A案の広いクレヨンは [conversationGraphite.ts](../src/ui/conversationGraphite.ts) が事前生成alpha素材を読む。ウインドウ表示ごとの粒子・筆跡生成は行わない。色付きテクスチャは素材・色ごとにキャッシュし、ウインドウ破棄で共有テクスチャを破棄しない。CanvasRendererでも同じ素材を使う。

寸法や筆跡素材を変更する開発作業では、tools/artwork/bake-conversation-graphite.mjsを更新して実行し（@napi-rs/canvasが必要。既存環境を使う場合はCANVAS_MODULEを指定）、src/ui/assetsの生成画像とGRAPHITE_PANELSを対応させる。未生成の寸法を指定するとエラーになる。単なる文章・配色変更の度に焼き直す必要はない。

## 背景・立ち絵の遷移

[conversationBackgroundTransition.ts](../src/ui/conversationBackgroundTransition.ts) と [conversationTransition.ts](../src/models/conversationTransition.ts) がページ切り替え演出を扱う。指定は遷移先ページに属し、同一画像でも有効。初回表示、背景なし、通常交換を区別する。

背景のdimと画像交換のマスク、シーン全体の暗転を混同しない。showTextがfalseの遷移中はテキストを閉じ、完了後に新ページを表示する。終了・スキップ・シーン破棄時はTween、マスク、一時画像、入力リスナーを解放する。

会話側で立ち絵を指定した場合だけ戦闘画像を一時的に隠す。会話背景・立ち絵・本文・設定の順序を保ち、戦闘のカードやクリック領域より前に表示する。
