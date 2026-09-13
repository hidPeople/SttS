# SttS Battle Prototype

Phaser 3 + TypeScript + Vite で作成した、デッキ構築型ローグライクの戦闘画面プロトタイプです。

## 起動方法

```bash
npm install
npm run dev
```

起動後、表示されたローカル URL をブラウザで開きます。通常は `http://127.0.0.1:5173/` です。

## ビルド

```bash
npm run build
```

## 主要ファイル

- `src/main.ts`: Phaser のゲーム設定。画面サイズは 1280x720。
- `src/scenes/BattleScene.ts`: 戦闘画面、HUD、カード表示、Tween 演出、ターン進行。
- `src/data/cards.ts`: カード定義と初期デッキ順。
- `src/models/Combatants.ts`: Player / Enemy の HP、EP、ブロック、状態異常処理。
- `src/models/Deck.ts`: 山札、手札、捨て札、ドロー、捨て札シャッフル処理。

## キーボード操作

- 矢印 / WASD：選択。Enter / Z：確定。マウスホバーも同じ選択として扱い、そこからキーで移動できます。
- Ctrl（左右どちらでも）：押している間は2倍速。Sprite・カード・バー・点滅・フェード・待機時間が対象です。
- 戦闘の初回選択は手札左端。左右でカードを移動し、端の外側はターンエンド。ターンエンドから右で左端、左で右端へ戻ります。
- 手札から上で敵選択、敵から上で状態異常・レリックの巡回。下で1段戻ります。敵から戻る手札位置は左端です。
- 手札から下で山札・捨て札を選択。上で手札左端へ戻ります。
- 一覧は左右で1枚、上下で6枚移動し、選択カードが見える位置へ自動スクロール。端の外側は並べ替え・閉じるボタンへ移動します。
- Esc：設定を開く／開いている一覧・設定を閉じる。報酬・設定・確認ダイアログも矢印 / WASDとEnter / Zで操作できます。

入力・速度の実ブラウザ確認は `tests/keyboard-speed.cjs`。Viteをポート5175で起動し、Playwrightとブラウザが使える環境で `node tests/keyboard-speed.cjs` を実行します。`GAME_TEST_URL`、`PLAYWRIGHT_MODULE`、`BROWSER_EXECUTABLE` で接続先・既存Playwright・ブラウザを指定できます。検証データはブラウザ内だけで作成し、本体データを書き換えません。
