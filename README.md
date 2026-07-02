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
