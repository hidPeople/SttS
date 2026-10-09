# ノベル会話生成ガイド

このガイドはCONVERSATIONSの固定ページ列を作るためのものです。人物・日英規約は01-authoring-knowledge.md、既存会話IDは02-current-reference.mdを参照します。フレーバー生成ガイドを読む必要はありません。

## AIが決める項目

- 会話ID。未指定なら内容に合う未使用のlowerCamelCase名を付ける。
- ページの順序とspeaker。
- 各ページの日英text。
- 暗くする演出を指定された場合のbackgroundDim。

各ページの `portrait: '', background: ''` は固定フォーマットです。必ずこのまま書き、用途の推測・説明・値の提案をしません。新しい値を探すために質問したり、素材の一覧を参照したりしません。ページの任意項目として書けるからといって、出力から省略しません。

## 標準の完成フォーマット

貼り付け先: `src/data/conversations.ts` のCONVERSATIONS内へ、次のような1項目を追加します。

```ts
exampleWarning: [
  {
    speaker: 'narration',
    text: l('Footsteps echo beyond the door.', '扉の向こうで足音が響いた。'),
    portrait: '', background: '',
  },
  {
    speaker: 'user',
    text: l('<<--Stay alert.-->>', '≪――気を抜くな――≫'),
    portrait: '', background: '',
  },
  {
    speaker: 'quote',
    text: l('"I know! Just watch me."', '「わかってるって！ あたしに任せてよ」'),
    portrait: '', background: '',
  },
],
```

最低出力単位は `会話ID: [全ページ],` です。本文は非露骨な範囲で書きます。ページ単体や台詞だけで終えず、結末まで含む1つ以上の完成ブロックを出します。上の例は具体的なサンプルで、同じIDや本文を毎回使う指示ではありません。

各ページの項目順は `speaker` → `text` → 固定2欄 → 必要時だけ `backgroundDim`・`showWhen` です。既存importに `text as l` があれば、そのまま使えます。通常、importやCONVERSATIONS全体の宣言を出し直す必要はありません。

## speakerの選び方

| 値 | 書く内容 |
| --- | --- |
| quote | サキュバスちゃんの発声・明示した心の声 |
| user | 操作者である上位存在の言葉 |
| narration | 基本三人称の地の文。名前欄なし |

サキュバスちゃんの一人称は常に「あたし」。声に出す言葉は「……」、心の声は「（……）」と書き分けます。操作者には思考も見えます。主人公の声は≪――……――≫です。本文に表示する括弧は自動挿入されません。

それ以外の登場人物は `narration` の本文に `兵士: 「……」` などと書きます。任意のspeaker名、`kind: 'quote'`、`lines`は使いません。

## 状態指定は脚本の前提

「〜の状態で進む」「〜な態度」は、開始状態と描写の指示です。条件コードを求められていない限り、状態IDや戦闘の発火条件が不明でも会話を作ります。前提となる状態は、明示された展開なしに途中で消しません。

1. 開始状態・登場人物・態度・出来事・結末を読み取る。
2. 一連の出来事を順序どおりページへ分ける。
3. speakerと日英textを埋め、全ページに固定2欄を付ける。
4. 指定された暗さをbackgroundDimへ設定する。
5. 完成ブロックを先に出し、接続の注意があれば最後に短く添える。

ページは表示対象を上から順に読みます。条件ごとの候補抽選、ページごとのconditions、FLAVOR_EVENTS、suppressKindsはありません。戦闘のFaintedによるquote抑止もページには適用されないので、脚本の状態に合わせて自分でspeakerと文章を選びます。

描写を書いても、実際のゲームの数値や状態は変化しません。「この状態の時だけこの会話を表示する」と明示された場合だけ、呼出し条件を本文とは別ブロックで作ります。途中の選択肢・showWhenの範囲外の条件分岐・実際の状態変更が必要なら、その追加処理だけを引き継ぎます。

### 特定ターンだけ表示するページ

明示的に依頼された場合は、ページの固定2欄の後へ `showWhen: { minBattleTurn: 3 }` を追加できます。`minBattleTurn`（下限）・`maxBattleTurn`（上限）は境界を含む0以上の整数で、どちらも任意です。両方あればAND、下限は上限以下とします。showWhenの省略・空オブジェクトは常時表示です。

戦闘中および勝敗後の会話では呼出し時の戦闘ターンを用い、開始時に表示ページを確定します。敗北会話は敗北確定時のターンです。ページ数・ログ・終了判定・セーブの再開位置も表示対象だけで扱われます。イベント一覧やターン情報なしの旧セーブは全ページを表示します。任意の状態IDやフレーバー用conditionsをshowWhen内に入れません。

例: Badend1の先頭と7ページ目に `showWhen: { minBattleTurn: 3 }` を付けると、2ターン目以前の敗北は6ページ、3ターン目以降とイベント一覧は8ページになります。条件を記すだけで会話の呼出し自体を作る機能ではありません。

## 最終ページを暗くする

暗めにする指定なら該当ページへ `backgroundDim: 0.6`、完全に黒くする指定なら1を入れます。数値が明示されていれば従います。暗転のためだけの空ページは増やしません。

backgroundDimは黒を重ねる量で、0が通常、0.6が60%、1が100%です。ページ間で値が変わると共通のbackgroundDimDuration（現行500ms）で補間します。最初のページは即時適用です。省略すると0に戻るため、複数ページで暗さを維持するなら毎ページ書きます。本文は暗さの上に残ります。

本文まで消す画面全体のフェードや、暗転後の自動終了は別処理です。そこまで依頼された場合だけ、プロジェクト側の終了演出へ引き継ぎます。`end`や`fadeOut`など未対応のページ項目は作りません。

## 状態と結末を指定した完成例

入力例: 「敗北後、消耗して立てない。最初は強がるが、最後には意識が途切れて暗くなる。短めのノベル会話を作って」

貼り付け先: `src/data/conversations.ts` のCONVERSATIONS内へ1項目追加。

```ts
afterDefeatExhaustion: [
  {
    speaker: 'narration',
    text: l('She braces a hand against the floor, but her legs will not support her.', '彼女は床に手をついた。けれど、脚にはもう力が入らない。'),
    portrait: '', background: '',
  },
  {
    speaker: 'quote',
    text: l('"I am just... taking a break. That is all."', '「ちょっと……休んでるだけよ。それだけ」'),
    portrait: '', background: '',
  },
  {
    speaker: 'narration',
    text: l('Her attempt at a smirk fades as her arm begins to tremble.', '口元に浮かべかけた笑みが、腕の震えとともに消えていく。'),
    portrait: '', background: '',
  },
  {
    speaker: 'quote',
    text: l('"(Why...? I cannot even stand.)"', '「（なんで……立つことも、できないの）」'),
    portrait: '', background: '',
  },
  {
    speaker: 'quote',
    text: l('"Hey... do not leave me here..."', '「ねえ……あたしを、置いていかないで……」'),
    portrait: '', background: '',
  },
  {
    speaker: 'narration',
    text: l('Her hand slips. The last thing she feels is the cold floor beneath her cheek.', '支えていた手が滑る。頬に触れた床の冷たさを最後に、彼女の意識は途切れた。'),
    portrait: '', background: '',
    backgroundDim: 0.6,
  },
],
```

このブロックは固定の全6ページで、状態ごとの抽選候補ではありません。最後の暗さも指定済みです。呼出し先が未定なら、その接続だけをプロジェクト側へ引き継ぎます。本文中にTODOや仮ページを残しません。

## 呼出し条件まで依頼された場合だけ行うこと

通常の会話依頼ではこの節を出力に追加する必要はありません。

イベント戦闘の `defeatConversations` は先頭一致です。たとえば「プロローグのStarvation所持時に上の会話、それ以外は既存prologueDefeat2」と依頼された場合、EVENT_BATTLES.prologueの該当項目へ次を設定できます。

```ts
defeatConversations: [
  {
    conditions: [condition('status', 'has', { target: 'player', status: 'Starvation' })],
    conversationId: 'afterDefeatExhaustion',
  },
  { conversationId: 'prologueDefeat2' },
],
```

これは `src/data/eventBattles.ts` に入る別ブロックであり、会話ページには入れません。条件省略は常に一致するので末尾へ置きます。既存の他分岐を保持する依頼なら、提供された既存ブロックへ統合するか、新規挿入位置だけを示します。

呼出し先にはintroConversationId、battleStartConversationId、beforeDrawEvents、victoryConversationIdもあります。必要な場合だけ02・03の該当契約を確認します。通常戦闘の新しい敗北原因や途中分岐は、キーを作るだけでは実行されません。

一覧登録まで依頼された場合は、CONVERSATION_EVENTSへ次を追加できます。

```ts
afterDefeatExhaustion: { title: l('Too Exhausted', '力尽きて'), category: 'prologue', gallery: true },
```

これは `src/data/conversations.ts` 内の別の定義です。会話ページには入れません。一覧登録だけではゲーム中の呼出しは増えません。

## 出力前チェック

- 会話IDと全ページがあり、指定された結末まで書き切っている。
- 各ページにspeaker、日英text、固定の `portrait: '', background: ''` がある。
- 固定2欄の値を生成・推測していない。ページ本文へフレーバー文法を混ぜていない。
- 脚本の開始状態と態度が維持され、一人称は「あたし」。通常の地の文は三人称。
- 指定された暗さをbackgroundDimで反映し、本文ブロックでできない接続だけ短く引き継いでいる。

## 詳細仕様の扱い

ページ型の任意項目、共通演出設定、操作、一覧、素材設定の詳しい仕様は02・03へ保存しています。通常生成では、このガイドの固定フォーマットを優先します。詳細資料に別の設定例があっても、それを理由に固定2欄を変更したり、任意項目を増やしたりしません。

<!-- official-example:start -->

## 現行の正式記載例 prologueAfterBattle

`src/data/conversations.ts` の `CONVERSATIONS.prologueAfterBattle` を、会話IDと全ページを含め原文のまま収録しています。日英本文・話者・順序・各設定値を変更していません。既存の正式文章とページ構成を参照するための例で、新しい本文や続きを追加する指示ではありません。

原文には空文字以外の固定2欄、追加の設定項目があります。転載部分は修正せず保持しますが、新規生成では各ページの `portrait: '', background: ''` を優先します。原文の値や追加項目を新規ページへ自動転用しません。

```ts
  prologueAfterBattle: [
    { speaker: 'quote', text: l(
      '"...Haah♡ ...Haah♡ ............Haa...h♡"', 
      '「……はぁっ♡ ……はぁっ♡ …………っはあ…っ♡」'), portrait: 'Succubus_prologue_Aftershocksgte2_1', background: 'background/Prison_cell.png' },
    { speaker: 'narration', text: l(
      'While being forced to cum again and again, \nthe succubus lost herself in draining the three men of their essence. \nBefore she knew it, she had fully recovered.', 
      '何度もイかされながら、\nサキュバスは夢中で3人の男達から精気を吸いつくし、\n気が付くと完全に復活していた。'), portrait: 'Succubus_prologue_Aftershocksgte2_1', background: 'background/Prison_cell.png' },
    { speaker: 'quote', text: l(
      '"This is the first time I\'ve absorbed this much... Could this be... the Lewd God\'s power?"', 
      '「あたし…こんなに吸ったの初めて……もしかしてこれって……淫神さまの力なの？」'), portrait: 'Succubus_prologue_Aftershocksgte2_hover_novel_1', background: 'background/Prison_cell.png' },
    { speaker: 'user', text: l(
      '<<--I have temporarily granted you a portion of my power-->>', 
      '≪――貴様に一時的に我が力を与えた――≫'), portrait: 'Succubus_prologue_Aftershocksgte2_hover_novel_1', background: 'background/Prison_cell.png', backgroundDim: 0.6 },
    { speaker: 'quote', text: l(
      '"Wah! Straight into my head again!? ...That feels so weird~"', 
      '「わわっ、また頭の中に直接っ！？ ……変な感じ～」'), portrait: 'Succubus_prologue_hover_1', background: 'background/Prison_cell.png' },
    { speaker: 'quote', text: l(
      '"Hey~ God~ Please! Won\'t you help me get out of here...?"', 
      '「ねぇ～神さま～、お願いっ！ ここから出るの、手伝ってくれたりとか……しない？」'), portrait: 'Succubus_prologue_Hunger_hover_1', background: 'background/Prison_cell.png' },
    { speaker: 'user', text: l(
      '<<--Any further aid requires a demon\'s contract. Accept the curse into your body...-->>', 
      '≪――これ以上は悪魔の契約が必要だ。その身に呪いを受け入れ…――≫'), portrait: 'Succubus_prologue_idle_1', background: 'background/Prison_cell.png', backgroundDim: 0.6 },
    { speaker: 'quote', text: l(
      '"Hmm, I don\'t really get it, but please! It\'ll make me stronger, right?"', 
      '「う～ん、よくわかんないけどお願い！強くなれるんでしょっ？」'), portrait: 'Succubus_prologue_hover_2', background: 'background/Prison_cell.png' },
    { speaker: 'user', text: l(
      '<<--............Confirmed. I shall inscribe the Contract\'s Lewd Crest-->>', 
      '≪――…………確認した。契約の淫紋を刻印する――≫'), portrait: 'Succubus_prologue_hover_2', background: 'background/Prison_cell.png', backgroundDim: 0.6 },
    { speaker: 'quote', text: l(
      '"...Nn♡ Something\'s... deep in my belly... feels weird..."', 
      '「…んっ♡ なんか……お腹の奥がっ……へん…」'), portrait: '', background: 'event/prologue_inmon1.png' },
    { speaker: 'narration', text: l(
      'Ignoring the succubus\'s will, her body suddenly reaches climax, convulsing and twitching violently.', 
      'サキュバスの意志を無視して、唐突に身体が絶頂を迎え、びくびくと痙攣する。'), portrait: '', background: 'event/prologue_inmon1a.png',
      backgroundTransition: { type: 'flash', duration: 1000, showText: false } },
    { speaker: 'narration', text: l(
      'At the same time, her lower abdomen begins to glow faintly.', 
      '同時に下腹部が淡く輝き始めた。'), portrait: '', background: 'event/prologue_inmon1a.png' },
    { speaker: 'quote', text: l(
      '"——What is this♡ I\'m cumming......~~~~♡♡♡"', 
      '「――なにっこれ♡、あたし、イって……～～～～っ♡♡♡」'), portrait: '', background: 'event/prologue_inmon2.png',
      backgroundTransition: { type: 'radial', duration: 1000, originX: 0.37, originY: 0.8, feather: 0.16, showText: false } },
    { speaker: 'quote', text: l(
      '"...♡ ...Haah♡ ............Haah♡"', 
      '「……っ♡ ……はぁっ♡ …………はぁっ♡」'), portrait: '', background: 'event/prologue_inmon3.png',
      backgroundTransition: { type: 'flash', duration: 1800, showText: false } },
    { speaker: 'user', text: l(
      '<<--It seems your body could not withstand the inscription of the crest-->>', 
      '≪――淫紋の刻印に身体が耐えられなかったようだ――≫'), portrait: '', background: 'event/prologue_inmon3.png', backgroundDim: 0.6 },
    { speaker: 'quote', text: l(
      '"♡ You never told me about this! ...And what\'s with these clothes!?"', 
      '「っ♡ こんなの、聞いてないよっ！……それにこの服、これは何！？」'), portrait: '', background: 'event/prologue_inmon4.png' },
    { speaker: 'narration', text: l(
      'The moment her body climaxed on its own, a deep ache spread from her womb, heat flooding her entire body.', 
      '身体が勝手に絶頂をむかえると、子宮が疼き火照りが全身に広がっていった。'), portrait: '', background: 'event/prologue_inmon4.png' },
    { speaker: 'narration', text: l(
      'Apparently, with her powers as a succubus heightened, she had gained the ability to manifest the clothing she desired.', 
      '――話によると、どうやらサキュバスとしての力が高まったことにより、自身が望んだ衣装を再現できるようになったらしい。'), portrait: '', background: 'event/prologue_inmon4.png' },
    { speaker: 'user', text: l(
      '<<--The curse will strengthen with every climax. Be warned-->>', 
      '≪――絶頂を重ねる毎に呪いは強化される。注意せよ――≫'), portrait: '', background: 'event/prologue_inmon4.png', backgroundDim: 0.6 },
    { speaker: 'quote', text: l(
      '".........Nn? ...??"', 
      '「…………ん？ ……？？」'), portrait: '', background: 'event/prologue_inmon5.png' },
    { speaker: 'user', text: l(
      '<<--I shall directly control your actions from now on-->>', 
      '≪――汝の行動は私が直々に制御しよう――≫'), portrait: '', background: 'event/prologue_inmon5.png', backgroundDim: 0.6 },
    { speaker: 'quote', text: l(
      '".........Nnah? ...Does that mean I\'m being controlled?"', 
      '「…………んあ？ ……それって操られてるって言うんじゃ」'), portrait: '', background: 'event/prologue_inmon5.png' },
    { speaker: 'quote', text: l(
      '"......"', 
      '「……」'), portrait: '', background: 'event/prologue_inmon5.png', backgroundDim: 0.8 },
  ],
```

<!-- official-example:end -->
