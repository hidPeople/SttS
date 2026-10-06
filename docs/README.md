# ドキュメント案内

設定を変更する方は **[ユーザーズマニュアル](manual/README.md)** から探してください。設計書は実装を保守する方向けです。

## ユーザーズマニュアル

- [設定先の一覧・読み方](manual/README.md)
- [編集ツールの操作・保存・復旧](manual/editor.md)
- [カードと説明文](manual/cards.md)
- [効果・条件・フレーバー](manual/effects.md)
- [プレイヤー・敵・状態異常・レリック](manual/combatants.md)
- [イベント戦闘・会話・チュートリアルTips](manual/events.md)
- [画像・スプライト・立ち絵](manual/assets.md)
- [UI・演出・入力設定](manual/presentation.md)
- [入力型の全項目リファレンス](manual/reference-types.md) / [設定定数リファレンス](manual/reference-config.md)

## 内部設計

| 文書 | 責務 |
| --- | --- |
| [戦闘データ設計](battle-data-design-ja.md) | 入力と実行時モデル、効果実行、状態変更、拡張境界 |
| [カード説明設計](card-text-design-ja.md) | 共通生成経路、基礎値と予測値、用語と表示順 |
| [立ち絵設計](player-portraits-ja.md) | 素材発見、条件選択、復帰、描画所有権 |
| [会話ウインドウ設計](conversation-window-design-ja.md) | 会話状態、ログ、背景遷移、自動送り |
| [入力・速度設計](input-and-speed-design-ja.md) | 入力の優先順位、選択、ゲーム時計と実時間 |
| [ユーザー設定設計](user-settings-design-ja.md) | 端末設定の保存・検証、進捗セーブとの分離、配布先の保存アダプター |
| [UI描画設計](ui-style-ja.md) | クレヨン、Tips、表示レイヤ、演出 |
| [データ編集ツール設計](data-editor-design-ja.md) | スキーマ抽出、ソース編集、適用トランザクション |

[未実装・拡張候補](data-driven-todo-ja.md) と [完了記録](data-driven-done-archive-ja.md) は仕様書ではありません。完了記録の過去の記述を現在の設定方法として使用しないでください。

## 文書の更新方針

UIの採用案を比較する場合は [HP・EPバーのデザインコンペ](../tools/ui-competition/README.md) を参照してください。ゲーム本体とは独立した試作画面です。

現在の数値・本文・登録IDの一覧はソースを正本にします。文書には意味、単位、許容範囲、参照先、省略時の動作、実装の制約を書きます。例の数値は記法説明用で、現在のバランス設定を保証しません。

設定契約を変更したら該当マニュアル、内部責務を変更したら該当設計書を更新します。型・設定一覧の再生成はルートで次を実行します。

~~~sh
node tools/docs/generate-reference.mjs
node tools/docs/generate-reference.mjs --check
~~~

生成器は型・設定ファイルの追加も検出します。意味や動作は自動で検証できないため、変更した項目の説明を実装と照合してください。
