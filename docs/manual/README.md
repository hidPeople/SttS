# ユーザーズマニュアル — 設定を調べる

[文書全体](../README.md) / [編集ツールを起動する](editor.md)

## やりたいことから探す

| 設定したいこと | 編集先（src/data） | 主な定義 | 説明 |
| --- | --- | --- | --- |
| カード追加・コスト・効果・台詞 | [cards.ts](../../src/data/cards.ts) | CARD_DEFINITIONS / defineCard | [カード](cards.md) |
| カードの自動説明・システム用語Tips | [cardText.ts](../../src/data/cardText.ts) | CARD_EFFECT_TEXT、CARD_TEXT_PHRASES、CARD_SYSTEM_TERMS | [カード](cards.md) |
| カテゴリ色・使用可能カテゴリ | [cardCategories.ts](../../src/data/cardCategories.ts) | CARD_CATEGORY_COLORS、CRAVING_PLAYABLE_CARD_CATEGORIES | [カード](cards.md) |
| 効果・条件の記法 | [effectBuilders.ts](../../src/data/effectBuilders.ts) | effect、condition、defineCard等 | [効果・条件](effects.md) |
| 敵・行動・出現ステージ | [enemies.ts](../../src/data/enemies.ts) | ENEMY_DEFINITIONS | [戦闘参加者](combatants.md) |
| プレイヤー・初期デッキ・初期累計 | [player.ts](../../src/data/player.ts) | PLAYER_DEFINITION | [戦闘参加者](combatants.md) |
| 状態異常・成長閾値 | [statuses.ts](../../src/data/statuses.ts) | STATUS_DESCRIPTIONS、PART_SENSITIVITY_LEVELS | [状態異常](combatants.md) |
| レリック | [relics.ts](../../src/data/relics.ts) | RELIC_DEFINITIONS | [レリック](combatants.md) |
| 報酬レアリティの重み | [rarities.ts](../../src/data/rarities.ts) | REWARD_RARITY_DROP_RATES | [報酬](combatants.md) |
| 共通ログ文章 | [flavorCatalog.ts](../../src/data/flavorCatalog.ts) | GLOBAL_FLAVORS | [フレーバー](effects.md) |
| 部位名・別名・置換 | [bodyParts.ts](../../src/data/bodyParts.ts) | BODY_PART_NAMES、BODY_PART_DEFAULT_NAMES、BODY_PART_STAT_PART | [文章の置換](effects.md) |
| 特殊戦闘の初期状態・進行 | [eventBattles.ts](../../src/data/eventBattles.ts) | EVENT_BATTLES | [イベント](events.md) |
| 会話ページ・ノベル操作 | [conversations.ts](../../src/data/conversations.ts) | CONVERSATIONS、DEFEAT_CONVERSATIONS、NOVEL_CONTROLS | [会話](events.md) |
| 会話背景の切り替え | [conversationTransitions.ts](../../src/data/conversationTransitions.ts) | CONVERSATION_TRANSITIONS | [背景遷移](events.md) |
| 会話デザイン・オート | [conversationAppearance.ts](../../src/data/conversationAppearance.ts) | CONVERSATION_THEMES、CONVERSATION_APPEARANCE、NOVEL_AUTO | [UI](presentation.md) |
| 自動表示する説明Tips | [tutorialTips.ts](../../src/data/tutorialTips.ts) | TUTORIAL_TIPS | [Tips](events.md) |
| ステージ背景・登場順 | [battlePresentation.ts](../../src/data/battlePresentation.ts) | BATTLE_BACKGROUNDS、BATTLE_ENTRANCE | [UI](presentation.md) |
| 敵アニメ素材 | [enemySprites.ts](../../src/data/enemySprites.ts) | ENEMY_SPRITES | [素材](assets.md) |
| 攻撃・UIアニメ素材 | [sprites.ts](../../src/data/sprites.ts) | EFFECT_SPRITES、UI_SPRITES、DAMAGE_SPRITE_EFFECTS | [素材](assets.md) |
| 立ち絵の配置・画像参照 | [characterPortraits.ts](../../src/data/characterPortraits.ts) | CHARACTER_PORTRAITS、DEFAULT_CHARACTER_PLACEMENT | [立ち絵](assets.md) |
| 立ち絵条件・優先順 | [portraitFactors.ts](../../src/data/portraitFactors.ts) | PORTRAIT_FACTORS | [立ち絵](assets.md) |
| ブロック演出 | [blockPresentation.ts](../../src/data/blockPresentation.ts) | BLOCK_PRESENTATION | [UI](presentation.md) |
| 行動予告色・描画品質・ホバー・HUD | [ui.ts](../../src/data/ui.ts) | 各設定定数 | [UI](presentation.md) |

## 必須・任意の読み方

- **必須**：オブジェクトを作るとき省略不可。配列が必須でも、その機能が不要なら空配列を指定できる項目があります。
- **任意**：省略可能。ただし「status効果ならstatusが必要」などの**条件付き必須**は各章に記載します。
- 任意オブジェクト内部の必須項目は、そのオブジェクトを追加したとき必要です。配列の要素内の必須項目も同じです。
- **入力型**と**実行時型**は別です。カードは CardDefinitionInput、敵行動は EnemyIntentInput が入力契約です。生成済みの hpDamage 等を手入力しません。
- 設定定数の必須項目は「その定数を定義する際の必須」です。個別データの任意上書き欄とは区別してください。
- TypeScriptの string は必ずしも自由な文章ではありません。cardId、sprite、conversationId等は登録キー参照です。対応表と全項目表の「参照」を確認してください。

## 共通の書式

~~~ts
import { text as l } from '../models/localization';
// l(英語, 日本語)。明示改行は文字列内に "\n" を書く。
const label = l('Example', '例');
~~~

LocalizedText は共通文字列、または en / ja の両方を持つオブジェクトです。通常は l(en, ja) を使います。数値は文字列にせず数値で記述し、真偽値は true / false、未使用の任意項目は削除できます。日本語キーは ja であり jp ではありません。

IDは表示名と別です。新規ではレコードのキーと定義内idを一致させてください。既存データで異なるものは一括改名せず、登録キー参照か定義内id比較かを確認して参照元も同時に修正します。敵行動IDの一意性は**同一敵の同一行動プール内**です。別の敵や intents と intents_E で同名でも問題ありません。

確率・倍率は通常 0～1 または倍率値、HP/EPの**条件の百分率と立ち絵ファイル名の閾値は0～100**です。時間は基本msですが、クレヨン描き替えは秒、スプライト速度はfpsです。個別表の単位を優先してください。

## 全項目を調べる

[入力型リファレンス](reference-types.md) は型定義から必須／任意と下位項目を抽出します。[設定定数リファレンス](reference-config.md) は各データファイルの公開定義を網羅します。意味・省略時の扱い・対応していない組合せは各章を併読してください。

新しい値を既存のID配列やレコードに追加する作業と、新しい効果種別・タイミングそのものを実装する作業は別です。型を増やすだけでは実行器は増えません。[対応範囲と未実装項目](../data-driven-todo-ja.md) を確認してください。
