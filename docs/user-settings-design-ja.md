# ユーザー設定の保存

`models/userSettings.ts` が設定の型・検証・現在値・保存予約を所有し、`platform/userSettingsStorage.ts` が保存先を所有する。`RunState`、戦闘状態、将来の進捗セーブからは独立させる。起動時は設定読み込みとフォント読み込みを終えてからPhaserを開始し、言語や外観が初期値で一瞬表示されることを避ける。

保存形式は `{ version, settings }` のJSON。`settings` は `language`、`cardHoverLevel`、`conversation`、`gallery` の名前付き項目で構成する。`gallery.seenConversationIds`と`gallery.seenPortraitIds`はExtraの解放履歴、`forcedEventsUnlocked`と`forcedPortraitsUnlocked`は全解放操作の刻印で、ランの開始・終了とは独立して自動保存する。会話設定の省略値はdata側の既定値へフォールバックする。列挙値と数値を読み込み・更新時に検証し、不正な項目のみ初期値へ戻す。JSON破損・読み込み失敗でも通知して起動を継続する。その場合は元データを保護し、明示的な全削除まで自動書き込みを行わない。新しい版が保存した未知のversionは読み込まず、上書きもせず保持する。

UIは `USER_SETTINGS.update()` で更新する。言語の既存 `SETTINGS_STATE.language` は互換アクセサーとして同じストアへ接続する。スライダー・ホイールの連続入力は実時間の短いデバウンスでまとめ、書き込みは直列化して古い内容による上書きを防ぐ。ギャラリーの新規閲覧・解放はデバウンスを待たず保存し、ページ非表示・終了時もflushする。書き込み失敗時は現在値を保持し、次のflushで再試行できる状態にし、設定・閲覧履歴を保存できなかったことをダイアログで通知する。削除時も永続化先の削除成功後にメモリ上の設定を初期化する。

通常の静的Web配信はlocalStorageの `stts.user-settings` キーを使う。シークレットモード終了やサイトデータ削除に耐える保存先ではなく、オリジンも異なれば別領域になる。

Viteの開発・previewサーバーでは `scripts/user-settings-server.mjs` のローカル専用APIを利用し、Windowsは `%LOCALAPPDATA%/SttS/preferences/user-settings.json` を正本とする。環境変数がない場合はOSのホームディレクトリ配下のAppData/Localへ解決する。その他のOSではXDG_DATA_HOMEまたはホーム配下の.local/shareを利用する。リポジトリ、インストール先、作業ディレクトリ、ブラウザのプロファイル・ポートには依存しない。データは各Windowsユーザーに属し、配布物へ同梱しない。

起動時にAPIの正本を読み、正本が未作成の場合だけ既存のlocalStorageを移行する。正本の読み込み・書き込み失敗をブラウザ保存への黙った切り替えで隠さず、既存の失敗ダイアログへ渡す。localStorageにも成功した内容を複写するが、正本がある場合は上書き移行しない。全ユーザーデータ削除ではファイルにnullを保存し、別プロファイルに残る古い履歴が復活することを防ぐ。

APIはループバック接続とローカルHostのみを許可し、CORSを許可しない。同一オリジン検査とサーバー起動ごとのBearerトークンで書き込みを保護し、任意のパスは受け取らない。更新は直列化し、一時ファイルへの書き込み・flush・renameで置換する。タブ終了中も送信済みの小さい書き込みはfetchのkeepaliveで継続する。サーバー再起動時はトークンを再取得する。開発用APIを含むNode実装は製品のフロントエンドバンドルに入らない。

exe版でファイル保存を採用する際は `UserSettingsStorage.read/write/remove` を実装し、`initializeUserSettings(storage)` へ渡す。保存先はOSのユーザー別アプリ設定ディレクトリ内の `user-settings.json` とし、進捗セーブのファイル名・ディレクトリと分ける。全削除操作だけは両方を明示確認後に削除する。書き込みは一時ファイルと置換による原子的更新にし、アプリ終了イベントでflushの完了を待つ。現段階ではTauri依存やファイル権限を先行追加しない。

キー割当・音量などの追加は `UserSettings` に名前付き項目を追加し、検証関数とUI更新経路を追加する。既存項目の意味・構造を変える場合はversionを上げ、既知の旧版からの移行関数とテストを用意する。保存処理を個々のSceneへ複製しない。

ファイルAPIの認証・移行・終了時送信は `platform/hostedJsonStorage.ts` に共通化する。ランセーブは同基盤の別エンドポイント・別ファイルを使用し、ユーザー設定と保存内容や削除操作を混在させない。
