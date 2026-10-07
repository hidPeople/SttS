# ユーザー設定の保存

`models/userSettings.ts` が設定の型・検証・現在値・保存予約を所有し、`platform/userSettingsStorage.ts` が保存先を所有する。`RunState`、戦闘状態、将来の進捗セーブからは独立させる。起動時は設定読み込みとフォント読み込みを終えてからPhaserを開始し、言語や外観が初期値で一瞬表示されることを避ける。

保存形式は `{ version, settings }` のJSON。`settings` は `language`、`cardHoverLevel`、`conversation`、`gallery` の名前付き項目で構成する。`gallery.seenConversationIds`と`gallery.seenPortraitIds`はExtraの解放履歴、`forcedEventsUnlocked`と`forcedPortraitsUnlocked`は全解放操作の刻印で、ランの開始・終了とは独立して自動保存する。会話設定の省略値はdata側の既定値へフォールバックする。列挙値と数値を読み込み・更新時に検証し、不正な項目のみ初期値へ戻す。JSON破損・読み込み失敗でも通知して起動を継続する。その場合は元データを保護し、明示的な全削除まで自動書き込みを行わない。新しい版が保存した未知のversionは読み込まず、上書きもせず保持する。

UIは `USER_SETTINGS.update()` で更新する。言語の既存 `SETTINGS_STATE.language` は互換アクセサーとして同じストアへ接続する。スライダー・ホイールの連続入力は実時間の短いデバウンスでまとめ、書き込みは直列化して古い内容による上書きを防ぐ。ページ非表示・終了時もflushする。書き込み失敗時は現在値を保持し、次のflushで再試行できる状態にし、設定・閲覧履歴を保存できなかったことをダイアログで通知する。削除時も永続化先の削除成功後にメモリ上の設定を初期化する。

Web版はlocalStorageの `stts.user-settings` キーを使う。インストールディレクトリや開発者の絶対パスには保存しない。WebViewでも同じアダプターを利用できるが、配布時には固定のアプリ識別子・オリジンを使うこと。開発サーバーのポートやプロトコルが違う場合は別の設定領域になる。

exe版でファイル保存を採用する際は `UserSettingsStorage.read/write/remove` を実装し、`initializeUserSettings(storage)` へ渡す。保存先はOSのユーザー別アプリ設定ディレクトリ内の `user-settings.json` とし、進捗セーブのファイル名・ディレクトリと分ける。全削除操作だけは両方を明示確認後に削除する。書き込みは一時ファイルと置換による原子的更新にし、アプリ終了イベントでflushの完了を待つ。現段階ではTauri依存やファイル権限を先行追加しない。

キー割当・音量などの追加は `UserSettings` に名前付き項目を追加し、検証関数とUI更新経路を追加する。既存項目の意味・構造を変える場合はversionを上げ、既知の旧版からの移行関数とテストを用意する。保存処理を個々のSceneへ複製しない。
