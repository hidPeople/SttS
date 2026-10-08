# 戦闘フレーバー生成ガイド

このガイドは戦闘ログに表示する短い文章専用です。共通の人物・日英規約は01-authoring-knowledge.mdを参照します。会話ページのspeakerや、ページを順に読む仕組みは使いません。

## 標準出力

カード・敵行動・状態・効果等の入力オブジェクトへ貼り付ける、`flavors: { ... },` 全体を必ず出します。`lines`やイベント項目だけを単独の成果物にしません。本文は非露骨な範囲で書きます。

カード使用時なら原則Card.Play、処理完了後の結果ならCard.Resolvedです。「Strike」は既存IDの`strike`へ対応します。カードのcost/effects等は出力へ含めず、既存の効果を変えません。新規生成分だけでも完成したflavorsブロックにします。

1. 表示タイミングと対象定義を決める。
2. 指定された状態を、playerの状態・攻撃対象敵の状態・生存敵全体の状態に分ける。
3. 文章を書き分ける必要がある箇所だけ条件分岐を作り、併発時の優先順位と各候補の日英本文を整える。
4. 無条件フォールバックを含め、flavors全体を出す。
5. 必要なら「既存flavorsへ統合」など接続の注意だけを短く添える。

「様々な状態」でも全状態・全組合せの網羅は不要です。明示された必須条件を押さえたうえで、文章を書き分ける必要がある場合だけ分岐を作ります。同じ文章で自然に成立する状態は共通の候補で扱い、条件の組合せが存在するという理由だけでは分岐を増やしません。発声制約や状態の併発によって共通文が不自然になる場合は、必要な分岐や優先順を設けます。無条件フォールバックも残します。発声制約、対象敵との関係、消耗、HP、集中等は分岐の選択肢であり、毎回すべてを含めるチェックリストではありません。

候補数の目安は設けません。数が明示されていなければ、各条件・各kindの候補数を揃える必要はなく、自然な候補が1つあれば十分です。数合わせの言い換えを追加しません。

必要な情報を短くまとめ、冗長な説明を避けます。特にnarrationは読み物として膨らませず、その瞬間の動作や状況を端的に伝えます。条件や実装から確定できない姿勢・動作・結果を付け足すほど画面と食い違いやすくなるため、描写は必要な範囲に留めます。

条件は台詞を選ぶための情報であり、その内容を台詞に説明させる必要はありません。状況説明に掛け声を機械的につなげず、その人物がその瞬間に口にしそうな自然な一言を優先します。短くするために不自然な語句の省略をしません。通常の掛け声がその状態でも自然なら、そのまま使って構いません。一方、専用台詞を求められた状態や人物らしい反応が必要な場面では、強がり・余裕・焦り等を自然な口調で残します。日英それぞれを単独の台詞として読み直し、説明文や直訳調になっていないか確認します。

例えば「届くとこ、くらえっ！」のように条件の説明を無理につなぐより、単に「くらえっ！」とする方が自然です。必要な状況説明はnarrationへ任せられます。ただし、これはすべての台詞を同じ掛け声に置き換える指示ではありません。

同じkindの候補は一度に1つしか選ばれないため、文言が似ていても構いません。候補ごとの差別化のために無理に表現をひねったり、異なる出来事や設定を追加したりしません。各候補が単独で自然に読めれば十分です。

既存flavorsを受け取った場合は、指定外のイベントや台詞を残した全体を返します。未提供でも確認待ちで止めず生成分を返し、統合はプロジェクト側で行えるようにします。既存flavorsのあるオブジェクトへ2つ目のflavorsキーを貼ってはいけません。

既存にquote以外のkindがあれば、それも保持します。掛け声の調整依頼だけを理由にnarration等を落としません。動作描写も求められた場合は、条件に合う短い三人称のnarrationを用意します。quoteとnarrationはkindごとに独立して選ばれるため、各分岐に両方を置く場合も互いの特定の一文を前提にしません。

GLOBAL_FLAVORSは外側のflavorsプロパティを持たない共通カタログです。汎用フレーバーの納品もflavors全体で揃え、共通カタログへ統合するときだけ外側を外して中のイベント項目を移します。この変換が必要な場合は貼り付け先の説明に明記します。下記の共通カタログ例は、統合先を理解するための参考断片です。

## 攻撃対象との関係を判定する

「自分へ侵入している敵を攻撃」は、カードの攻撃対象`selectedEnemy`にIntrudedA/V/Mのいずれかがあることです。「挿入している敵を攻撃」は同じ対象のInsertA/V/Mを見ます。生存敵の誰かにあることだけでは、そのカードの攻撃対象が当人とは限りません。

部位指定がなければA/V/Mを候補配列にまとめ、指定があればその部位だけに絞ります。単に「口が塞がっている間」はGaggedを使います。別の敵がMを占有していても発声制約は生じるため、発声制約と攻撃対象との関係を同時に指定する必要がある場合だけ両方の条件を併用します。

### GaggedとInsertM・IntrudedMの関係

Gaggedは独立して付与される状態異常ではありません。「生存敵の誰かにInsertMまたはIntrudedMがある」という同じ状況をまとめて判定するplayerStateです。Gaggedを、InsertM/IntrudedMとは別の原因や追加の出来事として描写しません。

| 判定 | 分かること |
| --- | --- |
| Gagged | 生存敵の誰かにInsertMまたはIntrudedMがあり、口が塞がっている |
| 生存するselectedEnemyにInsertM/IntrudedM | 口が塞がっており、その相手が今の攻撃対象でもある。Gaggedも成立する |
| GaggedかつselectedEnemyにInsertA/VやIntrudedA/V | 口の占有と、攻撃対象とのA/Vの関係が同時にある。Mの相手が同じ敵とは限らない |

発声制約だけを表すならGaggedで十分です。相手の特定やInsert/Intrudedの違いが文章に必要な場合だけ対象側の条件を使います。生存する攻撃対象のInsertM/IntrudedMを条件にしていれば、同じ口の状態を確認するためだけのGagged追加は不要です。

**同じkindでGaggedを先に置くと、後続のInsertM/IntrudedM専用候補は選ばれません。** M専用の文章が必要ならM専用候補→一般のGagged候補の順にします。書き分け不要ならGaggedへまとめます。A/V/MをまとめたInsert系・Intruded系候補がGaggedより後にある場合、その候補のM分は選ばれませんが、口が塞がっていないA/Vのケースでは選ばれます。これは発声制約を優先する意図なら正しい順序です。quoteのGagged候補がnarrationのM専用候補を妨げることはありません（明示的なsuppressKindsを除く）。

Insert系の掛け声は、基本的に本人が主導している余裕や得意げな態度を反映します。Breathlessが重なる場合は余裕を失った短い反応へ切り替え、複合条件を通常のInsert条件より先へ置きます。Gaggedでは発声しづらさと息苦しさを短い途切れや咳、必要なら明示した心の声で表し、長く流暢に話させません。

## Strike用の完成ブロック例

貼り付け先: `src/data/cards.ts` の `CARD_DEFINITIONS.strike` のdefineCard入力内。状態と対象の扱いを示す非露骨な新規提案例です。既存flavorsとの統合はプロジェクト側で行います。各分岐にquoteとnarrationを1候補ずつ置いています。指定があれば各kindの候補を増やします。

通常時は既存の `l('"Pow!"', '「えいっ！」')` をそのまま使います。他の分岐も一撃に添える短い掛け声を基準にし、状態を長台詞で説明しません。Gagged時は掛け声が言葉にならない反応を優先します。

通常時のnarrationも既存の `l('A direct blow lands cleanly.', '正面からの一撃がまっすぐに入る。')` を保持します。Intruded系では身体に取りついた相手へ、Insert系では密着した相手へ振り幅の小さい打撃を描きます。Gagged時は呼吸を求める切迫した手の動きとして、引っかくような打撃も使います。ただしGagged単独では攻撃対象がMを占有している当人とは限らないため、「口を塞いでいる相手を攻撃した」と決めつけません。打撃によって占有や状態が解除されたとも書きません。

```ts
flavors: {
  [FLAVOR_EVENTS.Card.Play]: [
    {
      conditions: [
        condition('playerState', 'has', { playerState: 'Gagged' }),
        condition('status', 'has', { target: 'selectedEnemy', statuses: ['IntrudedA', 'IntrudedV', 'IntrudedM'] }),
      ],
      lines: [
        { kind: 'quote', text: l('"(C-can’t breathe...!)"', '「（く、苦しい……っ！）」') },
        { kind: 'narration', text: l('Struggling for breath, she claws at the foe clinging to her.', '息を求め、身体に取りつく相手をかきむしるように打つ。') },
      ],
    },
    {
      conditions: [
        condition('playerState', 'has', { playerState: 'Gagged' }),
        condition('status', 'has', { target: 'selectedEnemy', statuses: ['InsertA', 'InsertV', 'InsertM'] }),
      ],
      lines: [
        { kind: 'quote', text: l('"...Kh—cough!"', '「……っ、げほっ！」') },
        { kind: 'narration', text: l('Short of breath, she rakes her hand across the foe pressed close against her.', '息が詰まり、密着した相手へ引っかくように手を振るう。') },
      ],
    },
    {
      conditions: [condition('playerState', 'has', { playerState: 'Gagged' })],
      lines: [
        { kind: 'quote', text: l('"...Cough...!"', '「……げほっ……！」') },
        { kind: 'narration', text: l('Struggling for breath, she lashes out at her target with a desperate swipe.', '息を求め、狙った相手へ必死に手を振り、引っかくような一撃を放つ。') },
      ],
    },
    {
      conditions: [condition('status', 'has', { target: 'selectedEnemy', statuses: ['IntrudedA', 'IntrudedV', 'IntrudedM'] })],
      lines: [
        { kind: 'quote', text: l('"Move!"', '「どいてっ！」') },
        { kind: 'narration', text: l('She strikes at the foe clinging to her body with a short swing of her fist.', '身体に取りついた相手へ、拳を短く振り下ろす。') },
      ],
    },
    {
      conditions: [
        condition('status', 'has', { target: 'selectedEnemy', statuses: ['InsertA', 'InsertV', 'InsertM'] }),
        condition('playerState', 'has', { playerState: 'Breathless' }),
      ],
      lines: [
        { kind: 'quote', text: l('"Hah... pow...!"', '「はぁ……えいっ……！」') },
        { kind: 'narration', text: l('Breathing raggedly, she manages a cramped blow at the foe pressed against her.', '息を乱しながら、密着した相手へ窮屈な一撃をなんとか打ち込む。') },
      ],
    },
    {
      conditions: [condition('status', 'has', { target: 'selectedEnemy', statuses: ['InsertA', 'InsertV', 'InsertM'] })],
      lines: [
        { kind: 'quote', text: l('"Here—pow!"', '「ほら、えいっ！」') },
        { kind: 'narration', text: l('With a confident grin, she drives a compact blow into the foe pressed against her.', '得意げに笑い、密着した相手へ小さく鋭い一撃を打ち込む。') },
      ],
    },
    {
      conditions: [condition('hpPercent', 'lte', { target: 'player', value: 25 })],
      lines: [
        { kind: 'quote', text: l('"Ugh... pow!"', '「くっ……えいっ！」') },
        { kind: 'narration', text: l('She braces her wavering stance and throws a desperate punch.', 'ふらつく足を踏ん張り、懸命に拳を突き出す。') },
      ],
    },
    {
      conditions: [condition('playerState', 'has', { playerState: 'Breathless' })],
      lines: [
        { kind: 'quote', text: l('"...Pow...!"', '「……えいっ……！」') },
        { kind: 'narration', text: l('Between ragged breaths, she forces out a short blow.', '途切れる息の合間に、短い一撃を絞り出す。') },
      ],
    },
    {
      conditions: [condition('status', 'has', { target: 'player', status: 'Focused' })],
      lines: [
        { kind: 'quote', text: l('"There!"', '「そこっ！」') },
        { kind: 'narration', text: l('She spots an opening and drives her fist straight through it.', '隙を捉え、まっすぐに拳を打ち込む。') },
      ],
    },
    {
      lines: [
        { kind: 'quote', text: l('"Pow!"', '「えいっ！」') },
        { kind: 'narration', text: l('A direct blow lands cleanly.', '正面からの一撃がまっすぐに入る。') },
      ],
    },
  ],
},
```

この例はGaggedの発声制約を最優先し、Insert系では「対象関係AND Breathless」を単独のInsert条件より前へ置いています。BreathlessはMultipleOrgasms・OrgasmsHell・MultipleOrgasmsTortureのいずれか、またはAftershocks 10以上で成立するため、これらの内訳も同じ分岐に入ります。完了済みの累計回数そのものを判定する条件ではありません。内訳ごとに反応を分ける依頼なら、該当statusとの複合条件をさらに前へ追加します。低HPも併せて反映する場合は「対象関係AND低HP」等を追加します。Fainted中のquoteは実装で抑止されるため、失神状態で掛け声を必ず出す設計にはしません。

## 配置先とimport

| 対象 | ファイルと配置 |
| --- | --- |
| カード | src/data/cards.ts の対象defineCard入力 |
| 敵行動 | src/data/enemies.ts の対象defineEnemyIntent入力 |
| 状態 | src/data/statuses.ts の対象状態またはtrigger |
| レリック | src/data/relics.ts の対象レリックまたはtrigger |
| 個別効果 | 上記データ内のeffectのoptions |
| 共通 | src/data/flavorCatalog.ts のGLOBAL_FLAVORSへイベント項目を移す |

全イベントがどの配置でも呼ばれるわけではないので、後述のイベント表を確認します。importが足りない場合だけ、不足分を既存importへ統合します。

```ts
import { text as l } from '../models/localization';
import { FLAVOR_EVENTS } from '../models/types';
import { condition } from './effectBuilders';
```

## フレーバーのkind

| 戦闘フレーバーの `kind` | 用途 |
| --- | --- |
| `quote` | サキュバスちゃんの台詞・明示した心の声 |
| `narration` | 三人称の情景・動作・反応 |
| `system` | 数値、使用不可理由などのシステム通知 |
| `status` | 通常の状態通知 |
| `important` | 強調する重要通知。戦闘ログの強調演出対象 |

戦闘フレーバーには `kind: 'user'` がありません。`status` はログの種類で、状態IDの `status: 'Horny'` とは別です。

## フレーバーの選択規則

イベントの値は `BattleFlavorEntry[]` です。要素は単純行 `{ kind, text }`、または条件候補 `{ conditions?, suppressKinds?, lines }`。条件が省略または空なら常に成立します。

**単純行だけの配列**は、配列全体をkind別に分け、その種別から1行ずつランダム選択します。単純なquoteを3つ並べれば3候補になります。

**1つでも `lines` を持つ候補を混ぜた配列**は、上から条件を評価し、kindごとに最初の成立候補だけを採用します。その候補内の同kindの行からランダムに1行を選びます。後続の同kindは追加抽選候補になりません。

そのため、生成時は無条件フォールバックも `{ lines: [...] }` に統一します。優先順位はkindごとに考え、同じkindの候補同士で優先したい条件を先に、無条件フォールバックを後に置きます。狭い複合条件を一般条件より先にするのも、同じkindを選ぶ候補間の規則です。条件なしの単純行を先頭に置くと、そのkindの後続条件が到達不能になります。

`quote` と `narration` は独立です。先頭の成立候補にquoteしかなければ、後ろの別候補からnarrationが選ばれる場合があります。同じ候補内に両種別を置いてもそれぞれ独立抽選なので、「台詞Aには必ず地の文A」をランダム行の対応順では表せません。

quote専用候補とnarration専用候補は別々にまとめて構いません。例えば、前半にquoteのGagged→Breathless→Bound、後半にnarrationのBound＋対象との関係→Bound→対象との関係を並べ、最後に両kindの無条件候補を置けます。先行するquote専用のBound候補は、後続のnarration専用のBound複合候補を妨げません。BoundとGaggedが同時に成立した場合も、quoteはGagged、narrationはBoundに合う候補をそれぞれ選べます。この順序は例であり、全依頼で固定するものではありません。両kindを含む候補は両方の優先順に影響し、suppressKindsによる明示的な抑止も別途確認します。

`suppressKinds: ['quote']` は、その候補成立時にまだ選ばれていないquoteを抑止します。すでに選ばれたquoteは消えません。同じ候補内のquoteも抑止対象なので、抑止したkindの行をその候補内へ入れません。抑止は1回の配列解決内だけで、別のイベントや別の `flavors` 呼出し全体を抑止しません。

プレイヤー状態の `blockedFlavorKinds` はその後に作用します。現行 `Fainted` は戦闘のquoteを抑止します。これは心の声をquoteに入れても同じで、会話ページのspeakerを自動的に抑止する仕組みではありません。

状態定義とそのtrigger、レリック定義とそのtriggerはそれぞれ別呼出しで表示されます。同じkindを両方に書くと両方表示され得ます。「個別が常に共通を上書きする」と考えないでください。

## 条件の全種類

`condition(kind, operator, options?)` は `ConditionDefinition` を作るヘルパーです。生の `{ kind, operator, ... }` も同じ意味です。`conditions: [...]` の各要素はAND。一般的な `or`、入れ子の `anyOf`、JavaScript式、コールバックはフレーバー条件にありません。複合状態の定義内にある `anyOf` と混同しません。

| kind | optionsと意味 | target省略時 |
| --- | --- | --- |
| `status` | `status` または `statuses`。has=いずれか正スタック、notHas=全てなし。数値比較は候補の合計スタック | actor |
| `relic` | `relicId` または `relicIds`。has/notHas、数値比較は所持している候補数 | 常にプレイヤー所持品。targetでは変わらない |
| `enemyTrait` | `enemyTrait` または `enemyTraits`。`male / softBody / sexToy`。数値比較は一致数 | selectedEnemy |
| `bodyPartStatus` | `parts` 必須。`bodyPartStatusKinds: ['insert','intruded']` は省略時両方。has=指定部位のどれかあり、notHas=全てなし。数値比較は正スタックの状態と所有者の組合せ数 | 生存敵全体。target明示時はその1体 |
| `playerState` | `playerState: 'Breathless' / 'Aroused' / 'Gagged'`。has/notHasだけ | 定義済みの複合条件 |
| `enemyHasBindingAction` | eq/notEq、value:boolean。通常/E/BいずれかにplayerへBound付与する効果があるか。今その行動を使えるかではない | selectedEnemy |
| `enemyHasEIntents` | eq/notEq、value:boolean。intents_Eが空でないか | selectedEnemy |
| `enemyOrgasmAftershocks` | eq/notEq、value:boolean。敵の絶頂余韻フラグ。行動がCharmで上書きされても次の行動まで保持 | selectedEnemy |
| `hasEp` | eq/notEq、value:boolean。対象のmaxEpが正か | actor |
| `hp` | 現在HPとvalue:number | actor |
| `hpPercent` | 現在HP÷最大HP×100とvalue:number | actor |
| `ep` | 現在EPとvalue:number | actor |
| `epPercent` | 現在EP÷最大EP×100。playerは補正後の有効最大EP | actor |
| `block` | 現在Blockとvalue:number | actor |
| `cardsPlayedThisTurn` | 今ターンの使用枚数。文脈値がなければ0 | target不要 |
| `intentUsageCount` | 文脈に渡されたその行動の使用回数。なければ0。通常行動のフレーバー等で常に供給されるとは限らない | target不要 |
| `playerOrgasmsThisBattle` | プレイヤーのこの戦闘中の完了済み絶頂回数。表示タイミングに注意 | target不要 |
| `aliveEnemyCount` | 生存敵数 | target不要 |
| `isPlayerTurn` | eq/notEq、value:boolean。現在プレイヤーターンか | target不要 |
| `purgeCausedOrgasm` | eq/notEq、value:boolean。除去文脈の結果、なければcausedOrgasm、さらに未提供ならfalse | 除去文脈が必要 |
| `purgeWillCauseOrgasm` | eq/notEq、value:boolean。除去カードの予測。未提供ならfalse | 除去文脈が必要 |
| `flavorValue` | `valueKey` 必須。渡されたnumber/booleanをvalueと比較。文字列・日英テキストは条件比較不可 | イベント固有 |

演算子は `eq` 等しい、`notEq` 等しくない、`gt` 超、`gte` 以上、`lt` 未満、`lte` 以下、`has` 所持、`notHas` 非所持。割合条件は0〜100単位で、75%は `value: 75` です。効果の `setEpRatio` 等の0〜1とは異なります。

| ConditionTarget | 意味 |
| --- | --- |
| `player` | サキュバスちゃん |
| `actor` / `self` | 現在の実行主体。敵行動なら敵、状態triggerなら所有者、カードならplayerが基本 |
| `selectedEnemy` | 文脈の解決対象敵。省略補完時はUI上の選択敵の場合もある |
| `triggerEnemy` | 呼出し元が渡した発火元の敵。必ず存在するとは限らない |
| `statusOwner` | 呼出し元が渡した状態所有者 |

`target` として `enemy`、`allEnemies`、`target` は条件型に存在しません。効果用の `EffectTarget` とは別です。対象不在時のstatus:notHasはtrueになり得ます。未提供のflavorValueはnotEqを含め条件不成立です。存在しない対象や値を「false」と同一視しないでください。

`statuses` / `relicIds` / `enemyTraits` は単数項目より優先します。両方を同時指定せず、重複IDも入れません。`causeStatus` は原因状態を渡すメタ情報で、有無を調べる追加条件ではありません。

## 状態を正しく選ぶ

全54状態のID、所有者、現行設定は `02-current-reference.md` に収録しています。

| 概念 | 使う条件またはID | 注意 |
| --- | --- | --- |
| ムラムラ系のいずれか | `statuses: ['Horny','InHeat','Frustrated','DesperateToCum']` | 同じarousal系列の4段階。複数をANDにはしない |
| 特定段階以上 | 対象段階以上の状態IDを列挙 | groupRankは直接条件に指定できない |
| 発情状態という単独ID | `TurnedOn` | 4段階系列とは別。`Aroused`とも別 |
| 媚薬状態 | `Aphrodisiac` | player/enemy両対応だが付与制限あり |
| 広い興奮状態 | `playerState: 'Aroused'` | EP75%以上、4段階系列のどれか、Aftershocks1〜9のOR。TurnedOn単独は定義に含まれない |
| 息も絶え絶え | `playerState: 'Breathless'` | MultipleOrgasms/OrgasmsHell/MultipleOrgasmsTortureのどれか、またはAftershocks10以上 |
| 口が塞がっている | `playerState: 'Gagged'` | 生存敵のInsertMまたはIntrudedM。playerに付いている状態ではない |
| Mへの挿入だけ | `bodyPartStatus`、parts:['M']、bodyPartStatusKinds:['insert'] | target省略なら生存敵全体。IntrudedMは含まない |
| Mへの侵入だけ | 同上、bodyPartStatusKinds:['intruded'] | InsertMは含まない |
| 拘束されている | playerの`Bound` | 拘束している敵の状態は`Binding` |
| 脱出中 | playerの`Escaping` | Boundと同義ではない |
| 寄生 | playerのInfestedA/V_Slime、InfestedA/V_AphrodisiacSlime | 敵にあるIntrudedA/Vとは別 |
| 失神 | playerの`Fainted` | 戦闘quoteは自動抑止。narrationを使う |
| 集中 | playerの`Focused` | 有効最大EPなどに補正あり |
| 部位成長 | ASensitivityLv1〜5等、A/B/C/V/M各5段階 | `ASensitivityLv3`のvalue>=3でLv3以上とは判定できない。Lv3/4/5のIDをORで列挙 |
| 飢え・消耗 | Starvation / Hunger / ExtremeFatigue | それぞれ別の状態・制限。被EP固定値やドロー制限等は登録表を参照 |

複合状態は重なり得ます。GaggedかつBreathlessなら「発声の制約＋短さ」を併せて扱います。ArousedかつBreathlessも可能です。優先度を数値欄に書く機能はなく、候補の並び順で表します。

BodyPartStatusの数値比較はスタック合計ではありません。AとVの両方が必要ならparts:['A','V']のhas1個ではなく、parts:['A']とparts:['V']のhasを2条件に分けます。Mが占有されていることと「今の攻撃部位がM」は別です。後者をGaggedで代用できません。

## 発火イベントの全一覧

表のキーにはすべて `FLAVOR_EVENTS.` を前置します。「共通」はGLOBAL_FLAVORS、「効果」は各effectのflavors、「状態」はSTATUS_DESCRIPTIONS[id].flavorsを指します。追加値は `flavorValues` の確実なキーです。N=number、B=boolean、T=文字列またはLocalizedText。Tは本文置換に使えてもflavorValue条件には使えません。「なし」は、その経路で独自に保証される追加値がないという意味です。

### Battle

| キー | 配置先と発火 | 固有値 |
| --- | --- | --- |
| Battle.Won | 共通。戦闘勝利 | なし |
| Battle.PlayerTurnStart | 共通。初回・次回のプレイヤーターン開始 | なし |
| Battle.EnemyTurnStart | 共通。敵ターン開始 | なし |
| Battle.ContinuousOrgasms | 共通。1ダメージ処理内の連続演出モードへ入る時 | なし |
| Battle.PlayerEpDamageQuote | 共通。正のプレイヤーEPダメージの適用前 | amount:N、epDamagePercentOfRange:N |
| Battle.PlayerEpDamageUnfelt | 共通。正の基本量が最終0以下。sourceがenemyIntent/relic/statusの経路 | partCount:N、defaultPart:T。元のflavorValuesも引継ぎ |
| Battle.PlayerOrgasmAfterglow | 共通。1ダメージ処理の最初の絶頂で、前回余韻による演出短縮がある時 | なし |
| Battle.PlayerOrgasmFirstQuote | 共通。1ダメージ処理内の最初の絶頂台詞 | なし |
| Battle.PlayerOrgasmFirst | 共通。同上の文章 | なし |
| Battle.PlayerOrgasmRepeatQuote | 共通。同処理内の反復台詞。連続演出ではflashCount=0 | flashCount:N |
| Battle.PlayerOrgasmRepeat | 共通。同処理内の反復文章。演出短縮により省略される回あり | flashCount:N |
| Battle.EnemyOrgasm | 共通＋原因カードのflavorsを別々に呼ぶ。対象は実際に絶頂した敵 | 共通は固有値なし。カード側のみ元カード文脈を引継ぎ |
| Battle.AftershocksAfterConsumption | 共通。Aftershocksを1以上消費した後。無料消費だけでも対象 | remainingStacks:N、playerEnergy:N、playerFainted:B |
| Battle.SensitivityLevelUp | 共通。部位レベル上昇 | part:T、sensitivityLevel:N、sensitivityAdverb:T |
| Battle.PortraitSigilTouch | 共通。刻印クリック時 | touchCount:N、sigilAroused:B、portraitSigilIntensity:N |
| Battle.PortraitBodyTouch | 共通。身体クリックの1・2回目 | touchCount:N、touchPartIsM:B、portraitTouchBOrigin:Tまたは未定義、prologueTouchDebilitated:B |
| Battle.PortraitHeadTouch | 共通。頭クリック時 | touchCount:N、prologueBeforeTurn3:B、prologueTouchDebilitated:B |

`PlayerEpDamageQuote` は敵攻撃だけでなくカード自傷、状態、レリック等でも発火します。`amount` はその時点の補正後ダメージ量で、HPや回数ではありません。`epDamagePercentOfRange = ceil(amount / (有効最大EP − EP下限) × 100)`、分母が0以下なら999です。「現在EPから最大までの残り」に対する割合ではありません。このイベントは元のflavorValuesを上記2値に置き換えるため、touchCountやカード予測値がそのまま使えると思わないでください。

`PlayerOrgasmFirst` のFirstは人生初や戦闘初ではありません。通常のこの文章表示では、今回の `recoverFromOrgasm` による戦闘回数加算・Aftershocks追加より前です。戦闘初の通常表示なら `playerOrgasmsThisBattle eq 0` が基準になります。フックによる解除前に残っている状態と、回復後の状態を混同しないでください。Card.Resolvedの回数・結果判定は処理後です。

身体タッチの3回目以降はEP効果側へ進み、PortraitBodyTouch自体は発火しません。そのイベントにtouchCount>=3を書いても表示されません。touchCountは部位別ではなく身体タッチの共通カウンタです。刻印タッチはTurnedOnの有無で別カウンタ、sigilArousedはクリック開始時点のTurnedOnの有無です。prologueTouchDebilitatedはプロローグ中かつExtremeFatigueまたはStarvationがあることです。

portraitTouchBOriginはB1/B2または未定義で、文字列比較条件には使えません。SensitivityLevelUpのsensitivityAdverbは現行では日本語の文字列です。英文にそのまま差し込まず、sensitivityLevelの数値条件で日英の候補を分けます。

### Card

| キー | 配置先と発火 | 固有値 |
| --- | --- | --- |
| Card.Play | カードのflavors。効果本体の前。beforePlayerSelfEpDamage反応が先に実行される場合あり | cardDisplayName:T、playerSelfEpDamage:N、enemyWillOrgasm:B、playerWillOrgasm:B |
| Card.Resolved | カードのflavors。本体・派生・除去等の処理完了後 | Playの値＋playerCummed:B、enemyCummed:B |
| Card.PurgeFailed | 共通。除去カードの失敗 | card:T |
| Card.RejectEnergy | 共通。エナジー不足で使用不可 | なし |
| Card.RejectBound | 共通。拘束による使用不可 | なし |
| Card.RejectCraving | 共通。状態によるカテゴリ制限 | なし |
| Card.RejectCondition | 共通。その他の使用条件不成立 | なし |

Card.Playの予測はその時点の補正と確定する最小ダメージによります。確率効果・将来の連鎖を先行実行した確定未来ではありません。Card.ResolvedのenemyCummedは選択敵だけでなく、今回の処理中にいずれかの敵で増えた回数を見ます。過去カードの結果は含みません。Battle.EnemyOrgasmのカード側に渡るplayerWillOrgasm等はPlay時の予測のままで、敵絶頂時点で再計算したものではありません。

### Effect

| キー | 配置先と発火 | 固有値 |
| --- | --- | --- |
| Effect.Trigger | 効果のflavors。対象・回数・確率判定を通った実行前。正量の最終適用を保証しない | 専用値なし |
| Effect.ChanceSuccess | chanceを持つ効果・敵行動・状態trigger・レリックtriggerのflavors。成功判定時 | 専用値なし |
| Effect.ChanceFailure | 上記の失敗判定時 | 専用値なし |
| Effect.RandomAmountMin | 効果。randomAmountが最小側。min=maxならこちら | 専用値なし |
| Effect.RandomAmountMax | 効果。最小側以外で最大側 | 専用値なし |
| Effect.RandomAmountOther | 効果。最小最大の中間 | 専用値なし |
| Effect.AddCardToHand | 共通。手札へ追加された時 | amount:N、card:T |
| Effect.DrawCards | 共通。引けたカードがある時 | amount:N |
| Effect.DiscardHand | 共通。手札を捨てる効果 | 独自の枚数値なし |
| Effect.SetEpReserveRatio | 共通。EP下限を割合指定で設定後 | amount:N（設定後の下限値） |
| Effect.SetEpReserve | 共通。EP下限を固定値で設定後 | amount:N（設定後の下限値） |
| Effect.SetEp | 共通。EPを固定値で設定後 | amount:N（設定後のEP） |
| Effect.SetEpRatio | 共通。EPを割合指定で設定後 | amount:N（設定後のEP） |
| Effect.RetainBlock | 共通。Block持越し設定 | 専用値なし |
| Effect.EpReserveHeal | 共通。EP下限の回復処理 | 専用amountなし |
| Effect.EnergyChange | 共通。実際にエナジーが変化 | signedAmount:T。符号付き文字列であり数値条件不可 |
| Effect.HpHeal | 共通。HP回復 | target:T、amount:N（回復量） |
| Effect.EpHeal | 共通。EP減少 | target:T、amount:N（渡された効果量。実減少量と同一とは限らない） |
| Effect.BlockGain | 共通。Block付与 | target:T、amount:N |
| Effect.HpDamage | 共通。HPダメージログ | target:T、actualHpDamage:N、incomingHpDamage:N |
| Effect.EpDamage | 共通。player/enemy両方のEPダメージログ | target:T、amount:N |
| Effect.HpDrain | 共通。敵HP吸収 | amount:N。対象・selectedEnemy・triggerEnemyは吸収された敵 |

Effectの名前が付くイベントをすべて `effect.flavors` へ置けるわけではありません。たとえば `Effect.EpDamage` は共通側の呼出しであり、個別effect内では `Effect.Trigger` 等を使います。drawCards/addCardToHandは共通の専用経路で処理し、効果固有flavors・times・chance・perStackは使えません。

`Effect.Trigger` とrandomAmountイベントへ、抽選後の `{amount}` が自動追加されるわけではありません。専用引数の数値がflavorValuesにもあるとは限りません。`ChanceSuccess` も、後続の状態付与が制約に阻まれず成功したという意味ではありません。

同様に、文脈のstatusStacksを `{stacks}` と書けば自動表示されるわけではありません。状態の現在スタックを条件にする場合は、status条件で所有者とIDを指定します。

### Status

| キー | 配置先と発火 | 固有値 |
| --- | --- | --- |
| Status.Trigger | 状態定義とそのtriggerのflavorsを別々に呼ぶ | 専用値なし。actor/statusOwnerは所有者 |
| Status.Apply | 共通の通常通知と、実際に付いた状態定義のflavors。両者は別呼出し | 共通:target:T、status:T。状態側:statusTargetIsPlayer:B、statusTargetIsEnemy:B＋元値 |
| Status.ApplyImportant | 共通。重要状態の付与通知 | target:T、status:T |
| Status.Infest | 共通。寄生状態の専用通知 | part:T。対象player、選択/発火元は原因敵 |
| Status.ApplyMiss | 共通。付与無効通知 | status:T |
| Status.Change | 共通。通常の状態変化 | fromStatus:T、toStatus:T |
| Status.ChangeImportant | 共通。重要な状態変化 | fromStatus:T、toStatus:T |
| Status.Remove | 共通の解除通知。加えてconsumeRule:oneで最後の1個を消費した時は状態定義/trigger側も呼ぶ | 共通:status:T、sourceIsStatus:B、statusIsImportant:B。個別側は同じ値を保証しない |
| Status.EnergyRecoveryBlocked | 原因状態のflavors。エナジー回復制限通知 | 専用値なし |
| Status.EpDamageOverridden | 原因状態のflavors。被EP量の固定処理 | 専用値なし。statusOwnerはplayer |

重要状態でも、その状態の固有付与文章のキーは `Status.Apply` です。`Status.ApplyImportant` を状態内へ置くだけでは代わりになりません。解除時は既に消えている状態をhasで要求すると成立しません。移行先や通知固有値、元定義への配置で表します。

### RelicとEnemy

| キー | 配置先と発火 | 固有値 |
| --- | --- | --- |
| Relic.Trigger | レリック定義とtriggerのflavorsを別々に呼ぶ | 専用値なし。実際のフック文脈に従う |
| Enemy.Intent | 敵行動のflavors。抽選成功判定・効果本体より前。反応ルールとそのvariantのflavorsにも使用 | 通常行動は専用値なし。カード自傷反応側はcard:T |
| Enemy.IntentWarning | Bound未所持時、Bound付与予定の敵行動flavors。narrationが表示されなければ共通へ | 専用値なし |
| Enemy.IntentFallback | 共通。行動flavorsでnarrationが表示されなかった時 | intent:T |
| Enemy.IntentFailed | 共通。行動chance不成立 | intent:T |
| Enemy.OrgasmAftershocksOverload | `ENEMY_ORGASM_AFTERSHOCKS_INTENT.flavors` の専用経路 | 専用値なし |
| Enemy.DeathHpDamage | 共通。敵固有deathNarrationsが選ばれなかったHP系撃破 | 原因文脈を引継ぎ。固定の追加値なし |
| Enemy.DeathHpDrain | 共通。同上の吸収による撃破 | 原因文脈を引継ぎ。固定の追加値なし |

Enemy.Intentが鳴った後で行動chanceが失敗する場合があるので、実行前文章で命中・結果を断定しません。narrationをsuppressKindsで抑止すると「narrationを表示できなかった」ため共通フォールバックが出ることがあります。これは全体抑止ではありません。

## 条件と表示値でできないこと

- `source === 'enemyIntent'`、敵ID、カードID、今の攻撃部位、状態IDという文字列を汎用flavorValue比較へ書く機能はありません。source用ConditionKindもありません。対象敵のtraitや状態判定だけでは「敵からの攻撃だけ」を保証できません。
- 敵専用の文章はその敵の行動または効果へ配置できますが、Enemy.Intent/Effect.Triggerは処理前です。「敵攻撃による正のダメージが確定した時だけ」を完全に限定する追加条件が必要なら、実行器の値供給が必要です。代用した条件を同等と偽りません。
- 共通のPlayerEpDamageQuoteには今の部位値が渡りません。部位別の反応が必要なら、部位が決まっている個別効果へ配置するか、追加実装を分けて依頼します。
- エナジーの汎用ConditionKindはありません。AftershocksAfterConsumptionのplayerEnergyなど、明示供給されたイベント値だけで比較します。任意のターン番号、累計タッチ回数、過去の被攻撃者なども勝手なキーを足しません。
- 一部の文脈にはcowgirlEpDamagePartという内部文字列がありますが、文字列比較は不可で、すべてのイベントに引き継がれるわけでもありません。汎用的な部位条件にしません。

不足時は、現行で表せる範囲と追加実装が必要な部分を分けます。不要な質問はせず、意味を変えずに決まる条件は自分で設定します。

## 置換文字列

| トークン | 有効範囲と意味 |
| --- | --- |
| `{player}` | 戦闘・会話のプレイヤー表示名 |
| `{enemy}` | 戦闘の実対象・発火元・敵主体・拘束元・選択敵等から求める敵名。会話では自動供給されない |
| `{source}` | 戦闘の行動・カード・状態等の発生源名。sourceコード文字列と同じではない |
| `{status}` | 戦闘文脈の状態表示名。未提供だと空になる場合あり |
| `{intrusionPart}` | 敵定義や生成カードから求める部位表現。文脈が必要 |
| `{A}` / `{partA}` 等 | 戦闘の部位動的名。A/B/C/V/Mおよび別名AI/VI/N/b/MI/U。大文字小文字厳守 |
| `{defaultA}` 等 | 固定部位名。共通テキスト経路で使用可。会話でも利用可 |
| `{part}` / `{defaultPart}` | イベントがpartを渡した場合の動的名/固定名。UnfeltはdefaultPartを直接供給 |
| `{aftershocksInitialFreeStacks}` | Aftershocksの無料消費設定。共通テキスト経路 |
| `{aftershocksStacksPerEnergy}` | 1エナジー当たりの消費設定。戦闘画面の置換では所持レリックの加算を含む |
| `{relicEpDamageMultiplier}` | 当該レリック説明の専用値。任意の戦闘会話へ自動供給されない |
| `{amount}` / `{target}` / `{card}` 等 | イベント表で明示供給された値だけ |

会話ページは共通の固定部位名・Aftershocks設定値と `{player}` を置換します。戦闘の `{enemy}`、動的部位名等を同じように置換するわけではありません。

動的部位名は部位レベル0〜5に加え、現時点の状態、最近の部位別回数、EP帯、占有等による接頭辞が付きます。単純な固定名が必要なら `{defaultM}` 等を使い、本文で同じ形容を重ねないようにします。NはB、bはC、AIはA、VI/UはV、MIはMの成長値を参照します。表示語の別名と条件の部位IDを混同しません。

`{default{part}}` のような入れ子は使えません。任意キーが自動生成されることはなく、未対応キーは画面へそのまま残る場合があります。英語の置換語は文頭と判定された場合に先頭小文字が大文字化されます。

## 条件付きフレーバーの完成例

### 共通カタログへの挿入例とランダム候補

入力例: 「ターン開始。口が塞がっていて消耗も激しい時、口が塞がっている時、消耗している時、通常時の順で短い反応を分ける」

貼り付け先: `src/data/flavorCatalog.ts` のGLOBAL_FLAVORS内のBattle.PlayerTurnStart項目を置換する例。

```ts
[FLAVOR_EVENTS.Battle.PlayerTurnStart]: [
  {
    conditions: [
      condition('playerState', 'has', { playerState: 'Gagged' }),
      condition('playerState', 'has', { playerState: 'Breathless' }),
    ],
    lines: [
      { kind: 'quote', text: l('"(Stay calm... one thing at a time.)"', '「（落ち着いて……ひとつずつ……）」') },
      { kind: 'quote', text: l('"(I need... a moment...)"', '「（少し……待って……）」') },
    ],
  },
  {
    conditions: [condition('playerState', 'has', { playerState: 'Gagged' })],
    lines: [
      { kind: 'quote', text: l('"Mmph...!"', '「んむっ……！」') },
      { kind: 'quote', text: l('"(I need to get free first.)"', '「（まず、これをどうにかしないと）」') },
    ],
  },
  {
    conditions: [condition('playerState', 'has', { playerState: 'Breathless' })],
    lines: [
      { kind: 'quote', text: l('"Give me... a second..."', '「ちょっと……待って……」') },
      { kind: 'quote', text: l('"I can still... keep going..."', '「あたし……まだ、やれる……」') },
    ],
  },
  {
    lines: [
      { kind: 'quote', text: l('"My turn. Watch this!"', '「あたしの番ね。見てなさい！」') },
      { kind: 'quote', text: l('"Ready? I am."', '「準備はいい？ あたしはできてるけど」') },
    ],
  },
],
```

口の占有をM挿入だけへ限定するなら、Gagged条件を次へ置き換えます。これは条件1行としてconditions配列へ入れます。

```ts
condition('bodyPartStatus', 'has', {
  parts: ['M'],
  bodyPartStatusKinds: ['insert'],
})
```

### 4段階系列だけを判定する

次は条件式の例です。Arousedへの置換は同じ意味になりません。特定の種類に合う文章は非露骨な範囲で別途作成します。

```ts
condition('status', 'has', {
  target: 'player',
  statuses: ['Horny', 'InHeat', 'Frustrated', 'DesperateToCum'],
})
```

InHeatとBoundの両方が必要なら、次のように2条件へ分けます。

```ts
conditions: [
  condition('status', 'has', { target: 'player', status: 'InHeat' }),
  condition('status', 'has', { target: 'player', status: 'Bound' }),
],
```

### EPダメージ時の条件式

PlayerEpDamageQuoteの候補へ条件を加える例。現在EP75%以上で、反応範囲に対する今回ダメージ割合が50%以上の場合です。本文の例ではなく判定例です。

```ts
conditions: [
  condition('epPercent', 'gte', { target: 'player', value: 75 }),
  condition('flavorValue', 'gte', { valueKey: 'epDamagePercentOfRange', value: 50 }),
],
```

### カードの確定結果で分岐

貼り付け先: 対象カードのdefineCard入力内。既存flavorsとの統合は別途行う新規提案ブロックです。今回player・敵の両方で結果が発生しなかった場合を表す技術例です。状態の喪失や他の効果も含めた成功/失敗全般という意味ではありません。

```ts
flavors: {
  [FLAVOR_EVENTS.Card.Resolved]: [
    {
      conditions: [
        condition('flavorValue', 'eq', { valueKey: 'playerCummed', value: false }),
        condition('flavorValue', 'eq', { valueKey: 'enemyCummed', value: false }),
      ],
      lines: [
        { kind: 'quote', text: l('"Not over yet, then."', '「まだ決着はつかない、ってことね」') },
      ],
    },
  ],
},
```

### 抑止と失神中の地の文

次はイベント配列の先頭へ挿入する1候補です。同じ配列内の後続quoteを抑え、narrationを選びます。Faintedの実装上のquote抑止に加え、候補選択の仕組みを示す例です。

```ts
{
  conditions: [condition('status', 'has', { target: 'player', status: 'Fainted' })],
  suppressKinds: ['quote'],
  lines: [
    { kind: 'narration', text: l('She gives no answer.', '彼女から返事はない。') },
  ],
},
```

## フックと特殊な文章の配置

EffectTimingは処理の契機で、FLAVOR_EVENTSは文章を選ぶキーです。同じものではありません。Card.Resolvedをtimingにして新triggerを作れません。

| EffectTiming | 現行の主な経路 |
| --- | --- |
| passive | 状態modifier・レリック補正等の参照。任意effectの自動反復ではない |
| battleStart | レリックの戦闘開始処理 |
| turnStart | 状態の開始処理、その後レリック |
| playerActionStart | 通常ドロー等の後、操作開始前の状態処理 |
| enemyOrgasm | 敵絶頂時レリック |
| playerOrgasm | プレイヤー絶頂時の状態/レリック。連続演出では一部集約経路あり |
| playerOrgasmRecovered | EP回復後の状態処理 |
| damageCalculation | 状態modifierの計算参照 |
| statusApplied | 実際の付与直後の状態処理 |
| enemyDamaged / cardDrawn / blockGained | 対応する処理後のレリック |
| purgePlayed | 除去カード使用に伴う状態処理 |

所有者へ任意timingが配信されるわけではありません。状態triggerは通常、文章表示後に効果実行、consumeRule:oneなら消費後に最後の解除文を表示します。allWhileEnergyでは各消費・効果実行の後にTrigger文章を呼ぶため、消費前のスタック数を読むと決めつけません。

敵の反応ルールは、条件成立したルールのpriorityが大きい順に1件を実行し、variantsは成立候補からランダム選択です。フレーバーの先頭一致とは別です。trigger.kindはplayerSelfEpDamage、parts/minBaseAmount/cardIds/categoriesで限定し、timingはbeforePlayerSelfEpDamageまたはafterPlayerSelfEpDamageです。minBaseAmountは補正前。ルールとvariantのflavorsはそれぞれ呼びます。

敵固有の死亡文 `deathNarrations` は `{ cause, text, requiredStatuses?, intentIds? }`。causeはhpDamage/hpDrain/selfHpDamageです。requiredStatusesは原因時点のスナップショットで全て必要、intentIdsは原因行動IDのいずれか一致、配列先頭一致。通常の `conditions/lines/kind` 文法ではありません。固有文が選ばれたらnarrationを直接追加して終了し、共通の死亡イベントは呼びません。

Tips、カード説明、レリック説明はフレーバーとは別の機能です。それらまで依頼された場合は保存版の該当章を参照し、カード自動説明や数値用トークンを通常の会話本文へ混ぜません。


## フレーバーの出力前チェック

- flavors全体、正しいFLAVOR_EVENTS、kind、日英本文がある。
- conditionsはAND、statuses等はOR。対象敵と他の生存敵を取り違えていない。
- kindごとに優先順を確認し、優先したい候補が先行する一般条件や無条件候補で隠れていない。quote専用候補とnarration専用候補の前後関係だけで誤りと判断しない。両kindを含む候補とsuppressKindsの影響も確認する。
- 使う値がそのイベントで供給され、発火前後と表示抑止を考慮している。
- speaker・会話ID・ページ背景など、会話専用の構造を混ぜていない。

<!-- official-example:start -->

## 現行の正式記載例 Seduction

`src/data/cards.ts` の `CARD_DEFINITIONS.seduction`（Seduction／誘惑）から、`flavors` を末尾まで原文のまま収録しています。日英本文・条件・候補数・並び順・表記を変更していません。既存の正式文章と条件分岐を参照するための例で、新しい本文や続きを追加する指示ではありません。上のStrike例は構造説明用、こちらは現行データの転載です。既存の表記揺れも保持しているため、新規出力の記法はプロジェクト指示とこのガイドを優先してください。

```ts
    flavors: {
      [FLAVOR_EVENTS.Card.Play]: [
        {
          conditions: [condition('enemyHasEIntents', 'eq', { target: 'selectedEnemy', value: false })],
          suppressKinds: ['quote'],
          lines: [{ kind: 'narration', text: l('It seems to have no effect on {enemy}...', '{enemy}に効果は無いようだ……') }],
        },
        {
          conditions: [condition('status', 'has', { target: 'player', status: 'ExtremeFatigue' })],
          lines: [
            { kind: 'quote', text: l('"...Right now... you can... do whatever you want... here..."', '「……今、なら……ここ……好きに、でき…るよ……」') },
            { kind: 'quote', text: l('"...Hey... please... put it in............"', '「……ねぇ……お願い、します……入れて…………」') },
          ],
        },
        {
          conditions: [condition('bodyPartStatus', 'has', { target: 'selectedEnemy', parts: ['M'], bodyPartStatusKinds: ['insert', 'intruded'] })],
          lines: [
            { kind: 'quote', text: l('"...Mmmph......!... Phew... More, give me more!"', '「……むぐぅ……っ…ぷは……もっ、もっとしてっ！」') },
            { kind: 'quote', text: l('"Puhaah... haa, haa... cover my mouth again..."', '「ぷはッ……はあ、はあ……また、塞いで……」') },
          ],
        },
        {
          conditions: [
            condition('playerState', 'has', { playerState: 'Gagged' }),
            condition('bodyPartStatus', 'notHas', { target: 'selectedEnemy', parts: ['M'], bodyPartStatusKinds: ['insert', 'intruded'] }),
          ],
          lines: [
            { kind: 'quote', text: l('"…Ugh… Mmm… Cough… Look, why don\'t you just… Mmm… do whatever you like…?"', '「…ぅぐ……むぐ……げほっ……ほらっ、好きに……んぐっ……したら……？」') },
            { kind: 'quote', text: l('"Mmph... nnah... I still have... open holes... nngh... go ahead..."', '「んむっ……んあっ……空いてる、穴……まだ、あるから……んぐっ……どうぞ……」') },
            { kind: 'quote', text: l('"Nngah... nngh... all of you... break me... mmph... it\'s fine..."', '「んぷっ……んくっ……みんなで……壊して……んむっ……いいから……」') },
          ],
        },
        {
          conditions: [
            condition('enemyTrait', 'has', { target: 'selectedEnemy', enemyTrait: 'softBody' }), 
            condition('enemyHasBindingAction', 'eq', { target: 'selectedEnemy', value: true }), 
            condition('status', 'has', { target: 'player', status: 'MultipleOrgasmsTorture' })
          ],
          lines: [
            { kind: 'quote', text: l('"...I don\'t care about anything anymore... even if I break from cumming too much... even if I get melted like this... it\'s fine..."', '「……もう、何もかもどうでもいい……イキすぎて、壊れても……このまま、溶かされても……いい……」') },
          ],
        },
        {
          conditions: [
            condition('enemyTrait', 'has', { target: 'selectedEnemy', enemyTrait: 'softBody' }), 
            condition('enemyHasBindingAction', 'eq', { target: 'selectedEnemy', value: true }), 
            condition('status', 'has', { target: 'player', statuses: ['OrgasmsHell', 'MultipleOrgasms'] })
          ],
          lines: [
            { kind: 'quote', text: l('"...It hurts and it feels good... my head is a mess... but you\'re not going to stop, are you..."', '「……痛いし、気持ちいいし……頭、ごちゃごちゃ……でも、止まらないんでしょ……」') },
          ],
        },
        {
          conditions: [
            condition('enemyTrait', 'has', { target: 'selectedEnemy', enemyTrait: 'softBody' }), 
            condition('enemyHasBindingAction', 'eq', { target: 'selectedEnemy', value: true })
          ],
          lines: [
            { kind: 'quote', text: l('"...Do that absorption or digestion thing...? ...I\'ll try to endure it..."', '「……吸収とか、消化とか……そういうの、して？ ……耐えてみるから……」') },
            { kind: 'quote', text: l('"...Wrap me up with that body... pin me down so I can\'t move... and fuck me however you want...?"', '「……全部で包んで……動けなくして……好きに、犯して……？」') },
            { kind: 'quote', text: l('"...Use that body to... plug up all my holes... so I can\'t move..."', '「……その体で……あたしの穴、全部、塞いで……動けなくして……」') },
          ],
        },
        {
          conditions: [
            condition('enemyTrait', 'has', { target: 'selectedEnemy', enemyTrait: 'sexToy' }), 
            condition('enemyHasBindingAction', 'eq', { target: 'selectedEnemy', value: true })
          ],
          lines: [
            { kind: 'quote', text: l('"...Will you make sure I can\'t run away?? ...I\'m happy."', '「……逃げられないように、してくれるの？ ……嬉しい。」') },
            { kind: 'quote', text: l('"Fuck me however you want...? ...I\'ll try to endure it..."', '「好きにして…… あたし、耐えてみせるから……」') },
          ],
        },
        {
          conditions: [condition('status', 'has', { target: 'player', status: 'Bound' })],
          lines: [
            { kind: 'quote', text: l('"Look... I can\'t move... this is your chance...? Wanna rape me?"', '「ほら……あたし、動けないよ……チャンスだよ……？ 犯して？」') },
            { kind: 'quote', text: l('"I can\'t resist, you know? ...Do as much as you want."', '「抵抗、できないよ？ ……好きなだけ、して」') },
          ],
        },
        {
          conditions: [
            condition('enemyTrait', 'has', { target: 'selectedEnemy', enemyTrait: 'softBody' }), 
            condition('status', 'has', { target: 'player', status: 'MultipleOrgasmsTorture' })
          ],
          lines: [
            { kind: 'quote', text: l('"Do as you like... you\'re not going to stop anyway..."', '「……好きに、すれば……どうせ、止まらないし……」') },
            { kind: 'quote', text: l('"...Hik... you\'re still moving... even though it hurts from cumming too much..."', '「……ひくっ……まだ、動くんでしょ……イきすぎて、痛いのに……」') },
          ],
        },
        {
          conditions: [
            condition('enemyTrait', 'has', { target: 'selectedEnemy', enemyTrait: 'softBody' }), 
            condition('status', 'has', { target: 'player', statuses: ['OrgasmsHell', 'MultipleOrgasms'] })],
          lines: [
            { kind: 'quote', text: l('"just a hole for slime is fine... so do whatever you want..."', '「……ただの、スライム用の穴で……いいから……好きに、して……」」') },
            { kind: 'quote', text: l('"...Aha♡ ...you\'re going to make me cum again... even though I want you to stop..."', '「……あは♡ ……また、イかされる……やめて欲しいのに……」') },
          ],
        },
        {
          conditions: [
            condition('enemyTrait', 'has', { target: 'selectedEnemy', enemyTrait: 'softBody' }), 
            condition('status', 'has', { target: 'player', status: 'Horny' })
          ],
          lines: [
            { kind: 'quote', text: l('"...Hey, slime... won\'t you keep me company just a little?"', '「……ねえ、スライム……少しだけ、相手してくれない？」') },
            { kind: 'quote', text: l('"...Something like this... even though it\'s wrong... I want it to move inside me..."', '「……こんなの…ダメなのに……中で動いて欲しい……」') },
            { kind: 'quote', text: l('"...come all the way inside my holes... and mess me up."', '「……あたしの中、入ってきて……ぐちゃぐちゃにして」') },
          ],
        },
        {
          conditions: [
            condition('enemyTrait', 'has', { target: 'selectedEnemy', enemyTrait: 'softBody' }), 
            condition('status', 'has', { target: 'player', status: 'InHeat' })],
          lines: [
            { kind: 'quote', text: l('"Dirty me with that body of yours... hurry♡"', '「あたしの事……その身体で汚してよ……早くぅ♡」') },
            { kind: 'quote', text: l('"...Hey, melt me? ...Fill me up all the way inside...♡"', '「……ねえ……あたしのこと、溶かして？ ……中まで、いっぱいにして……♡」') },
          ],
        },
        {
          conditions: [
            condition('enemyTrait', 'has', { target: 'selectedEnemy', enemyTrait: 'softBody' }), 
            condition('status', 'has', { target: 'player', status: 'Frustrated' })],
          lines: [
            { kind: 'quote', text: l('"...I realized... I\'m thinking I want to be fucked by something like this...♡"', '「……こんなのに犯されたいって……思ってる自分に、気づいちゃった……♡」') },
            { kind: 'quote', text: l('"...I\'m going to go crazy like this... please...♡ stop this aching with your body...♡"', '「……このままじゃ、おかしくなる……♡ お願い……その体で、疼きを止めて……♡」') },
            { kind: 'quote', text: l('"...My head is full of slime...♡ hurry up and melt me... fuck me...♡"', '「……頭の中、スライムのことでいっぱい……♡ はやく、溶かして……犯して……♡」') },
          ],
        },
        {
          conditions: [
            condition('enemyTrait', 'has', { target: 'selectedEnemy', enemyTrait: 'softBody' }), 
            condition('status', 'has', { target: 'player', status: 'DesperateToCum' })],
          lines: [
            { kind: 'quote', text: l('"I can\'t anymore...♡ I want to cum from slime!♡ I want to be fucked by you!♡ right now!♡"', '「もう無理……♡ スライムでイキたい♡♡！滅茶苦茶にして♡！今すぐ♡！」') },
            { kind: 'quote', text: l('"...My head\'s already broken...♡♡ come in, melt me, fuck me!♡"', '「……もう、頭壊れちゃった……♡♡ 入って来て、溶かして、犯してよ♡！」') },
            { kind: 'quote', text: l('"Sorry I can\'t hold back♡♡ ...but mess me up with that body...♡"', '「我慢できなくて♡♡ ……その体で、ぐちゃぐちゃにして……♡」') },
          ],
        },
        {
          conditions: [condition('enemyTrait', 'has', { target: 'selectedEnemy', enemyTrait: 'softBody' })],
          lines: [
            { kind: 'quote', text: l('"...Just thinking about this thing going inside me... makes me a little excited..."', '「……これが入ってきたらって思うと……ちょっと、期待、しちゃう……」') },
            { kind: 'quote', text: l('"you can touch me with that slime body of yours if you want."', '「スライムのその体で、触ってくれてもいいよ？」') },
          ],
        },
        {
          conditions: [condition('enemyTrait', 'has', { target: 'selectedEnemy', enemyTrait: 'sexToy' })],
          lines: [
            { kind: 'quote', text: l('"Even if you don\'t understand words... how about this? ...Try using this hole."', '「言葉が分からなくても……これならどう？ ……この穴、使ってみて」') },
            { kind: 'quote', text: l('"You can break me however you want..."', '「あたしを、好きに、壊していいから……」') },
          ],
        },
        {
          conditions: [
            condition('bodyPartStatus', 'has', { parts: ['V', 'A'], bodyPartStatusKinds: ['insert', 'intruded'] }),
            condition('bodyPartStatus', 'notHas', { target: 'selectedEnemy', parts: ['V', 'A'], bodyPartStatusKinds: ['insert', 'intruded'] }),
            condition('status', 'has', { target: 'player', status: 'MultipleOrgasmsTorture' })
          ],
          lines: [
            { kind: 'quote', text: l('"...Haah...♡ stop... I\'m saying I\'m not tempting you...♡♡ but I\'m cumming..."', '「……はあっ……♡ やめて……誘ってない……って♡、言ってるのに……っ♡ イぐぅ……」') },
            { kind: 'quote', text: l('"Stop!♡ I\'m not tempting you! Don\'t make me cum!!♡♡"', '「やめてっ♡！ 誘ってないのにぃっ！ イかせないでぇっ♡♡！！」') },
          ],
        },
        {
          conditions: [
            condition('bodyPartStatus', 'has', { parts: ['V', 'A'], bodyPartStatusKinds: ['insert', 'intruded'] }),
            condition('bodyPartStatus', 'notHas', { target: 'selectedEnemy', parts: ['V', 'A'], bodyPartStatusKinds: ['insert', 'intruded'] }),
            condition('status', 'has', { target: 'player', statuses: ['OrgasmsHell', 'MultipleOrgasms'] })
          ],
          lines: [
            { kind: 'quote', text: l('"No... I\'m gonna cum... but this doesn\'t mean... I\'m trying to tempt you...♡!"', '「だめっ……イっちゃう……でも、これ以上は……誘ってるわけじゃ、ないからっ……♡！」') },
            { kind: 'quote', text: l('"That\'s not it... my hips moving isn\'t... my intention...♡!"', '「ちがうのっ……腰が動いてるの、あたしの意思じゃ……ないから……っ♡！」') },
          ],
        },
        {
          conditions: [
            condition('bodyPartStatus', 'has', { target: 'selectedEnemy', parts: ['V', 'A'], bodyPartStatusKinds: ['insert', 'intruded'] }),
            condition('status', 'has', { target: 'player', status: 'MultipleOrgasmsTorture' })
          ],
          lines: [
            { kind: 'quote', text: l('"Stop! I\'m squeezing down deep again!♡♡ I\'m not tempting you! Don\'t make me cum!!♡♡"', '「やめてっ！ また奥、締めちゃうっ♡♡！ 誘ってないのにぃっ！ イかせないでぇっ♡♡！！」') },
            { kind: 'quote', text: l('"Nnah...♡ no...♡ my head\'s going crazy... I can\'t stop squeezing...♡♡"', '「んあっ……♡ だめ……♡ 頭、おかしくなって……締まるの、止められない……♡♡」') },
          ],
        },
        {
          conditions: [
            condition('bodyPartStatus', 'has', { target: 'selectedEnemy', parts: ['V', 'A'], bodyPartStatusKinds: ['insert', 'intruded'] }),
            condition('status', 'has', { target: 'player', statuses: ['OrgasmsHell', 'MultipleOrgasms'] })
          ],
          lines: [
            { kind: 'quote', text: l('"Pull it out, pull it out! I\'m gonna cum...♡ acting like it wants it on its own, I hate it!!"', '「抜いてっ、抜いてぇっ！ またイくっ♡、勝手に……求めてるみたいで、やだぁっ！！」') },
            { kind: 'quote', text: l('"Stop... pull it out...♡ I\'m not tempting you... so why... am I squeezing..."', '「やめて……抜いてっ……♡ 誘ってない……のに……なんで、締まるの……」') },
            { kind: 'quote', text: l('"...Nnagh... not enough... fuck me harder... break me..."', '「……んあっ……足りない……もっと、激しく犯して……あたしを、壊して……」') },
          ],
        },
        {
          conditions: [condition('status', 'has', { target: 'player', status: 'MultipleOrgasmsTorture' })],
          lines: [
            { kind: 'quote', text: l('"...Put it in... put it in... this stupid voice keeps... coming out of me..."', '「……いれて……いれてって……あたしバカになっちゃった……何……言ってるの……？」') },
            { kind: 'quote', text: l('"Any more and I\'ll go crazy... so... please... stop... okay...?"', '「これ以上はおがじぐなっちゃう゛ぅ……ね…やめよ……ね？」') },
          ],
        },
        {
          conditions: [condition('status', 'has', { target: 'player', status: 'OrgasmsHell' })],
          lines: [
            { kind: 'quote', text: l('"...I\'m still tempting you even though I\'ve gone past my limit... pretty pathetic, right? ...But you\'ll still do it, won\'t you?"', '「……限界超えてるのに、まだ誘ってる……最低、でしょ？ ……でも、するよね？」') },
            { kind: 'quote', text: l('"So why not do as you like while you can? ...I won\'t run."', '「……今のうちに、好きにすれば？ ……逃げないよ」') },
          ],
        },
        {
          conditions: [condition('status', 'has', { target: 'player', status: 'MultipleOrgasms' })],
          lines: [
            { kind: 'quote', text: l('"Look... this is my twitching pussy after cumming so much... won\'t you put it in...?"', '「ほら……イきまくった後の痙攣まんこだよ……いれないの…？」') },
            { kind: 'quote', text: l('"...Fufu, did you see? A succubus collapsed from cumming too much... rare, right? ...Wanna touch?"', '「……ふふ、見た？ イきすぎて倒れてるサキュバス……珍しいでしょ？ ……触る？」') },
            { kind: 'quote', text: l('"It\'s twitching... cum here...? Inside or outside, I don\'t care."', '「ひくひくしてる……ここに、出して……？ 中でも外でも、いいから」') },
          ],
        },
        {
          conditions: [condition('bodyPartStatus', 'has', { target: 'selectedEnemy', parts: ['V', 'A'], bodyPartStatusKinds: ['insert', 'intruded'] })],
          lines: [
            { kind: 'quote', text: l('"...Haah... harder... move more... stir me up inside..."', '「……はあっ……もっと、激しく……動かして……中、かき回して……」') },
            { kind: 'quote', text: l('"...I don\'t need gentle... thrust like you\'re breaking me... please..."', '「……優しいの、いらない……壊すくらい、突いて……お願い……」') },
            { kind: 'quote', text: l('"...Nnagh... not enough... fuck me harder... break me..."', '「……んあっ……足りない……もっと、激しく犯して……壊して……」') },
          ],
        },
        {
          conditions: [
            condition('bodyPartStatus', 'has', { parts: ['V', 'A'], bodyPartStatusKinds: ['insert', 'intruded'] }),
            condition('bodyPartStatus', 'notHas', { target: 'selectedEnemy', parts: ['V', 'A'], bodyPartStatusKinds: ['insert', 'intruded'] }),
          ],
          lines: [
            { kind: 'quote', text: l('"...One isn\'t enough... someone else join in... fill me up..."', '「……これじゃ、足りない……誰か、追加で……中、いっぱいにして……」') },
            { kind: 'quote', text: l('"...Ah... someone else too... put it in... I still have holes open..."', '「……あっ……他の人も……入れて……穴、まだ空いてるから……」') },
          ],
        },
        {
          conditions: [condition('status', 'has', { target: 'player', status: 'Horny' })],
          lines: [
            { kind: 'quote', text: l('"...Hey, just a little... won\'t you keep me company? ...Please."', '「……ねえ、少しだけ……相手してくれない？ ……お願い」') },
            { kind: 'quote', text: l('"...If you leave me like this... I might start doing it myself...."', '「……このまま放っておかれたら……自分で、しちゃうかも」') },
          ],
        },
        {
          conditions: [condition('status', 'has', { target: 'player', status: 'InHeat' })],
          lines: [
            { kind: 'quote', text: l('"...I can\'t hold back anymore... fuck me. You can be rough..."', '「……我慢、できない……抱いて。強くしていいから……」') },
            { kind: 'quote', text: l('"...Haa... haa... the heat won\'t stop... someone, touch me..."', '「……はあ……はあ……もう、火照りが止まらない……誰か、触って……」') },
          ],
        },
        {
          conditions: [condition('status', 'has', { target: 'player', status: 'Frustrated' })],
          lines: [
            { kind: 'quote', text: l('"...I\'m going to go crazy like this... please... stop this aching..."', '「……このままじゃ、おかしくなる……お願い……疼きを、止めて……」') },
            { kind: 'quote', text: l('"...No more... I can\'t hold back... anyone is fine... just fuck me..."', '「……だめ……もう我慢、できない……誰でもいいから……犯して……」') },
          ],
        },
        {
          conditions: [condition('status', 'has', { target: 'player', status: 'DesperateToCum' })],
          lines: [
            { kind: 'quote', text: l('"...My head\'s already broken... I wanna fuck, I wanna fuck, I wanna fuck..."', '「……もう、頭おかしい……ヤりたい、ヤりたい、ヤりたい……」') },
            { kind: 'quote', text: l('"...Haah, haah... I can\'t anymore... I want to cum, I want to be fucked... right now..."', '「……はあっ、はあっ……もう無理……イキたい、犯されたい……今すぐ……」') },
          ],
        },
        {
          conditions: [condition('status', 'gte', { target: 'player', status: 'Aftershocks', value: 5 })],
          lines: [
            { kind: 'quote', text: l('"...I can\'t move, so... you move for me? ...Put it in deep..."', '「……動けないから……あんたが、動いて？ ……奥まで、ください……」') },
            { kind: 'quote', text: l('"...My head\'s all fuzzy... only my hips keep... moving on their own... sorry..."', '「……頭、ぼーっとして……腰だけ、勝手に……動いちゃう……ごめんね……」') },
            { kind: 'quote', text: l('"Wanna do a collapsed succubus... raw? ...It\'s fine, do whatever you want..."', '「倒れてるサキュバスに……生で、する？ ……いいよ、好きにして……」') },
          ],
        },
        {
          lines: [
            { kind: 'quote', text: l('"...Look, I\'m already ready... put it in? ...I want it deep."', '「……ほら、もう準備できてる……入れて？ ……奥までね」') },
            { kind: 'quote', text: l('"Care to do something naughty with me?"', '「あたしといいことしませんか？」') },
          ],
        },
      ],
    },
```

<!-- official-example:end -->
