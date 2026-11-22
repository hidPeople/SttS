import { text as l, type LocalizedText } from '../models/localization';
import type { ConversationBackgroundTransition } from './conversationTransitions';
import type { ConditionDefinition } from '../models/types';

export interface ConversationPageCondition {
  minBattleTurn?: number; // 表示する戦闘ターンの下限（含む）。0以上の整数。省略時は下限なし。
  maxBattleTurn?: number; // 表示する戦闘ターンの上限（含む）。0以上の整数。省略時は上限なし。
}

export interface ConversationPage {
  bgm?: string | null; // 曲ID（拡張子なし）。省略は継続、nullは停止。同じIDは再開せず継続。
  showWhen?: ConversationPageCondition; // 会話開始時に判定。省略時は表示。戦闘ターン未提供の一覧再生・旧セーブでは全ページ表示。
  text: LocalizedText;
  speaker: 'quote' | 'narration' | 'user';
  portrait?: string; // image/character内のファイル名（自動検出）、または登録ID。空欄は既存の立ち絵を制御しない。
  backgroundDim?: number; // 背景の暗さ。0=通常、1=黒。省略時0。
  background?: string; // image内の相対ファイル名。空欄は表示なし。
  backgroundTransition?: ConversationBackgroundTransition; // 省略時は背景画像が変わるとクロスフェード。指定時は同じ画像でも実行。初回・空欄は対象外。
}

export interface ConversationEventMetadata {
  title: LocalizedText;
  category: 'prologue' | 'normal';
  gallery: boolean;
  thumbnail?: string; // Extra一覧の表紙に使うevent/またはbackground/直下のPNG。空欄・省略時は会話の最初の背景。
  defeatEnemyId?: string; // 通常敗北用。ENEMY_DEFINITIONSのID。生存敵のうち危険度が最も高い登録敵を採用。
  defeatWhen?: { // 特殊敗北用。敵別の会話より先に定義順で判定。各項目はAND。
    enemyIds?: string[]; // 必要な生存敵のID。重複は必要体数。ほかの敵がいても成立。
    conditions?: ConditionDefinition[]; // プレイヤーの寄生状態、敵の侵入状態など。
    cardSelfDamage?: boolean; // カードの自傷でHPが0になったか。自身へのEPダメージからの絶頂ダメージを含む。
  };
}

export const CONVERSATIONS: Record<string, ConversationPage[]> = {
  prologueBeforeBattle: [
    { speaker: 'narration', text: l(
      'In the depths of the royal castle dungeon, a lone succubus lies imprisoned.', 
      '王城の地下牢に、一人のサキュバスが捕らわれている。'), portrait: '', background: 'event/prologue_pre1.png', backgroundDim: 0.6 },
    { speaker: 'narration', text: l(
      'She had been caught while tempting men in town, driven by hunger.', 
      '空腹に耐えきれず、街の男を誘惑していたところを捕らえられたのだ。'), portrait: '', background: 'event/prologue_pre1.png', backgroundDim: 0.6 },
    { speaker: 'quote', text: l(
      '".........."', 
      '「………………。」'), portrait: '', background: 'event/prologue_pre1.png' },
    { speaker: 'narration', text: l(
      'Captured succubi are drained of the energy born from climax, used until nothing remains.', 
      '人間に捕まったサキュバス達は、絶頂時に生じるエネルギーを抽出する使い捨ての道具として、死ぬまで使い潰される。'), portrait: '', background: 'event/prologue_pre1.png' },
    { speaker: 'narration', text: l(
      'I was no exception. \nFor the past several days, I had been forced to climax without rest, \nmy energy stolen with every orgasm.', 
      '私も例外ではなかった。\nここ数日、休む間もなく強制的に快楽を与えられ続け、\nイくたびにエネルギーを奪われていた。'), portrait: '', background: 'event/prologue_pre1.png' },
    { speaker: 'narration', text: l(
      'Given almost no water or food, my stamina was already nearing its limit.', 
      '水も食事もほとんど与えられず、私の体力はすでに限界に近かった。'), portrait: '', background: 'event/prologue_pre1.png' },
    { speaker: 'narration', text: l(
      '......Footsteps echo through the cold corridor.', 
      '――冷たい廊下に、足音が響く。'), portrait: '', background: 'event/prologue_pre1.png' },
    { speaker: 'narration', text: l(
     'Three men step into the cell.', 
     '男たちが三人、牢の中へと入ってくる。'), portrait: '', background: 'event/prologue_pre2.png' },
    { speaker: 'narration', text: l(
      'Remembering the relentless pleasure forced upon me just moments ago, \nthe last of my moisture spills out as tears.', 
      '先ほどまで受けていた強制的な快楽責めを思い出し、\n残り少ない水分が涙として溢れ出てくる。'), portrait: '', background: 'event/prologue_pre2.png' },
    { speaker: 'narration', text: l(
     'Man: "Hey. We got chewed out because today\'s energy output was too low."', 
     '男: 「おい。今日のエネルギー生産が少ないって、上から怒られたじゃねーか」'), portrait: '', background: 'event/prologue_pre2.png' },
    { speaker: 'quote', text: l(
     '"Hii...!"', 
     '「ひっ……！」'), portrait: '', background: 'event/prologue_pre2.png' },
    { speaker: 'quote', text: l(
      '"...P-Please... just a little water..."', 
      '「……お、お願い……します………………み、……水を……」'), portrait: '', background: 'event/prologue_pre2.png' },
    { speaker: 'narration', text: l(
      'Man: "Cum a hundred times and we\'ll let you drink."\nMan: "Haha, senpai, that\'s brutal."', 
      '男: 「百回イッたら飲ませてやるよ」\n男: 「わはは、先輩鬼畜っすね」'), portrait: '', background: 'event/prologue_pre2.png' },
    { speaker: 'quote', text: l(
      '"I can\'t... anymore...... \nI can\'t even move... Someone... help me..."', 
      '「もう……限界……動けないよ…………\n誰か……助けて……」'), portrait: '', background: 'event/prologue_pre2.png' },
  ],
  prologueTurn1: [
    { speaker: 'quote', text: l(
      'Succubus: "Again... they\'re going to force me to cum..."', 
      '「また……無理やりイかされるんだ……」'), portrait: 'Succubus_prologue_Starvation_idle_1', background: '' },
    { speaker: 'quote', text: l(
      'Succubus: "...even though I\'m already at my limit..."', 
      '「……もう限界なのに……」'), portrait: 'Succubus_prologue_Starvation_idle_1', background: '' },
  ],
  prologueTurn3: [
    { speaker: 'quote', text: l(
      '"(...No... my consciousness is...)"', 
      '「（……ダメ……意識、が……）」'), portrait: '', background: '' },
    { speaker: 'narration', text: l(
      'Even in this extreme state, her body keeps secreting large amounts of love juices, flooding her brain with pleasure.', 
      '生命の危機にあっても、サキュバスの肉体は大量の愛液を分泌し、脳に快感を伝えてくる。'), portrait: '', background: '' },
    { speaker: 'narration', text: l(
      'A hunter\'s body, built to feed through intercourse at any time\n—now that she is the prey, it only torments her.', 
      '捕食者の肉体は、いつでもおいしく性交 ―食事― が出来るように作られている。\nしかし今や彼女は獲物となり、それは彼女を苦しめるだけだ。'), portrait: '', background: '' },
    { speaker: 'narration', text: l(
      'Pushed far past her limits and forced to cum again and again, \nthe succubus\'s life was on the verge of fading.', 
      '限界を超えた状態で何度もイかされ続け、サキュバスの命は今にも失われようとしていた。'), portrait: '', background: '' },
    { speaker: 'quote', text: l(
      '"...Uu... ah..."', 
      '「……ぅ……ぁ…」'), portrait: '', background: '' },
    { speaker: 'user', text: l(
      '<<--Do you want power?-->>', 
      '≪――力が欲しいか？――≫'), portrait: '', background: '', backgroundDim: 0.6 },
    { speaker: 'narration', text: l(
      'A low voice suddenly rings straight into her fading mind.\nShock jolts her thinning thoughts, and, grasping at any straw, the succubus races to make sense of the words.',
      '消えかけた意識へ、突然、低い声が直接響く。\n驚きで薄れかけた思考が跳ね、サキュバスは藁にも縋る思いで、その意味を必死に探った。'), portrait: '', background: '', backgroundDim: 0.6 },
    { speaker: 'narration', text: l(
      'At that moment, a fairy tale she heard long ago crosses the succubus\'s mind.\n--"With a low voice resounding, saving the succubus from crisis..."--',
      'そのとき、サキュバスの脳裏を、昔聞いたおとぎ話がよぎる。\n――その者低き声を響かせ淫魔の危機を救うべし――'), portrait: '', background: '', backgroundDim: 0.6 },
    { speaker: 'quote', text: l(
      '"!?"', 
      '「！？」'), portrait: '', background: '' },
    { speaker: 'quote', text: l(
      '"(Could this be... the Lewd God...?)"', 
      '「（もしかして……淫神さまなの……？）」'), portrait: '', background: '' },
  ],
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
  prologueDefeat1: [
    { showWhen: { minBattleTurn: 3 }, speaker: 'narration', text: l(
      'The voice had reached her.\nBut her body was already at its limit, and she could not take that chance.',
      '声は届いていた。\nだが、限界を迎えた体では、その機会を生かせなかった。'), portrait: '', background: 'event/prologue_badend1_1.png' },
    { speaker: 'quote', text: l(
      '"...Uu... ah..."',
      '「……ぅ……あ…」'), portrait: '', background: 'event/prologue_badend1_1.png' },
    { speaker: 'narration', text: l(
      'Unable to draw out their energy, she is forced to cum again and again.\nFar from feeding, every climax only wears her down.',
      '満足に搾精できないまま、何度もイかされ続け、\n逆に自分の方が削られていった。'), portrait: '', background: 'event/prologue_badend1_1.png' },
    { speaker: 'narration', text: l(
      'What little strength she has left slips away with every climax.\nHer body will no longer move.',
      'イくたびに残りの力まで抜けていき、体はもう動かなくなっていく。'), portrait: '', background: 'event/prologue_badend1_1.png' },
    { speaker: 'narration', text: l(
      'She slumps limply against the cold wall.\nShe cannot move a single finger.',
      '冷たい壁にぐったりともたれ、指一本動かせない。'), portrait: '', background: 'event/prologue_badend1_1.png' },
    { speaker: 'narration', text: l(
      'The light fades from her unfocused eyes.',
      '虚ろな瞳から、光が失われていく。'), portrait: '', background: 'event/prologue_badend1_2.png' },
    { showWhen: { minBattleTurn: 3 }, speaker: 'narration', text: l(
      'The voice that had rung in her head can no longer be heard.',
      '頭の中に響いていた声は、もう聴こえない。'), portrait: '', background: 'event/prologue_badend1_2.png' },
    { speaker: 'quote', text: l(
      '"......"',
      '「……」'), portrait: '', background: 'event/prologue_badend1_2.png', backgroundDim: 0.6 },
  ],
  prologueDefeat2: [
    { speaker: 'narration', text: l(
      'She finally managed to drain the soldiers who had only been using her.',
      'されるがまだった兵士から、ようやく精気を搾れた。'), portrait: '', background: 'event/prologue_badend2.png' },
    { speaker: 'narration', text: l(
      'Escaping starvation left her off guard, and she got carried away.\nShe ended up seeking the pleasure she had only been enduring.',
      '飢餓状態を脱したことで気が緩み、調子に乗ってしまった。\n耐えるだけだった快感を、自分から求めてしまったのだ。'), portrait: '', background: 'event/prologue_badend2.png' },
    { speaker: 'quote', text: l(
      '"...Nn, it feels... good..."',
      '「……んっ、気持ち、いい……」'), portrait: '', background: 'event/prologue_badend2.png' },
    { speaker: 'quote', text: l(
      '"This wasn\'t... how it was supposed to go..."',
      '「こんなはずじゃ……なかったのに……」'), portrait: '', background: 'event/prologue_badend2.png' },
    { speaker: 'narration', text: l(
      'In the end, she never escaped the cell.',
      '結局、牢からは逃げられなかった。'), portrait: '', background: 'event/prologue_badend2.png' },
    { speaker: 'narration', text: l(
      'They learned that being drained once does not kill them.\nSince then, they rape her from time to time.',
      '一度精を搾られたくらいでは、兵士は死なない。\nそれがバレてから、犯されることもたまにある。'), portrait: '', background: 'event/prologue_badend2.png' },
    { speaker: 'narration', text: l(
      'Thanks to that, a little energy trickles in, and she barely survives.',
      'そのおかげで細々と精気が入り、何とか生き延びている。'), portrait: '', background: 'event/prologue_badend2.png' },
    { speaker: 'quote', text: l(
      '"...Nn... ah♡♡..."',
      '「……んっ……ぁ♡♡……」'), portrait: '', background: 'event/prologue_badend2.png',
      backgroundTransition: { type: 'flash', duration: 800, showText: true } },
    { speaker: 'narration', text: l(
      'Slumped against the wall, she loses herself in masturbating, stirring the semen left in her vagina.\nA slack smile remains on her lips.',
      '壁にもたれたまま、膣内に残った精液をかき混ぜるように、オナニーに夢中になっている。\n口元には、力の抜けた笑みが残っていた。'), portrait: '', background: 'event/prologue_badend2.png' },
    { speaker: 'narration', text: l(
      'At some point, the voice that had rung in her head can no longer be heard.',
      'いつの間にか、頭の中に響いていた声は聴こえなくなっていた。'), portrait: '', background: 'event/prologue_badend2.png' },
    { speaker: 'narration', text: l(
      'She will probably never leave this place.',
      'もう、ここから出ることはできないだろう。'), portrait: '', background: 'event/prologue_badend2.png' },
    { speaker: 'quote', text: l(
      '"......"',
      '「……」'), portrait: '', background: 'event/prologue_badend2.png', backgroundDim: 0.6 },
  ],
  defeatGrunt: [
    { speaker: 'narration', text: l(
      'Defeated by the grunt, the succubus is captured once more.',
      '下級兵に敗れ、サキュバスは再び捕らえられた。'), portrait: '', background: 'event/defeatGrunt1.png' },
    { speaker: 'narration', text: l(
      'Her limbs are bound so she cannot escape again, and she is blindfolded so she cannot use Charm.',
      'また脱走しないよう手足を拘束され、誘惑<チャーム>が使えないよう目隠しをされている。'), portrait: '', background: 'event/defeatGrunt1.png' },
    { speaker: 'narration', text: l(
      'Man: "You\'re not getting away this time. I\'ll wring you dry for running."\nMuttering his grudge, the man starts in on her roughly.',
      '男: 「今度は逃がさねえ。脱走した分、たっぷり搾ってやる」\n恨み言を吐きながら、男は乱暴に責め始めた。'), portrait: '', background: 'event/defeatGrunt1.png' },
    { speaker: 'quote', text: l(
      '"...They\'re going to force me again...?"',
      '「っ……また、責められるの……？」'), portrait: '', background: 'event/defeatGrunt1.png' },
    { speaker: 'narration', text: l(
      'The crest on her lower abdomen burns. The pleasure is stronger than before.',
      '下腹部の淫紋が熱を帯び、前よりも快感が強い。'), portrait: '', background: 'event/defeatGrunt1.png' },
    { speaker: 'quote', text: l(
      '"No... it\'s too strong... I\'m scared...♡"',
      '「やっ……強すぎるっ……こわい……♡」'), portrait: '', background: 'event/defeatGrunt1.png',
      backgroundTransition: { type: 'flash', duration: 800, showText: true } },
    { speaker: 'quote', text: l(
      '"(...What is this... is it the crest...?)"',
      '「（……なに、これ……淫紋の、せい……？）」'), portrait: '', background: 'event/defeatGrunt1.png' },

    { speaker: 'narration', text: l(
      'Climax after climax, until she has no room left to resist.',
      '絶頂が何度も重なり、抗う余地がなくなっていく。'), portrait: '', background: 'event/defeatGrunt2.png' },
    { speaker: 'quote', text: l(
      '"I\'m... I\'m cumming♡♡"',
      '「イっ……イくぅっ♡♡」'), portrait: '', background: 'event/defeatGrunt2.png',
      backgroundTransition: { type: 'flash', duration: 800, showText: true } },
    { speaker: 'narration', text: l(
      'Against her own heart, the succubus presses her hips forward herself.',
      '心とは裏腹に、サキュバスは自分から腰を押し付けてしまう。'), portrait: '', background: 'event/defeatGrunt2.png' },
    { speaker: 'quote', text: l(
      '"I shouldn\'t... but... more, please♡"',
      '「だめ……なのに……もっと、してっ♡」'), portrait: '', background: 'event/defeatGrunt2.png' },
    { speaker: 'quote', text: l(
      '"I\'m cumming, cumming again...♡♡"',
      '「イくっ、またイく……っ♡♡」'), portrait: '', background: 'event/defeatGrunt2.png',
      backgroundTransition: { type: 'flash', duration: 800, showText: true } },

    { speaker: 'narration', text: l(
      'The man lifts her blindfold and looks into a face stained with pleasure.',
      '男が目隠しを捲り、快感に染まった顔を覗き込む。'), portrait: '', background: 'event/defeatGrunt3.png' },
    { speaker: 'narration', text: l(
      'Man 2: "Hey, that\'s dangerous!"',
      '男2: 「おい、あぶねーぞ」'), portrait: '', background: 'event/defeatGrunt3.png' },
    { speaker: 'quote', text: l(
      '"(Now... I have to seduce him, like before...)"',
      '「（今だ……前みたいに、誘惑しなきゃ……）」'), portrait: '', background: 'event/defeatGrunt3.png' },
    { speaker: 'narration', text: l(
      'But the pleasure will not let her think, and she cannot move a finger.',
      'だが快感で頭が回らず、指一本動かせない。'), portrait: '', background: 'event/defeatGrunt3.png' },
    { speaker: 'quote', text: l(
      '"Ah... I... can\'t move...♡"',
      '「あ……ぁ……動け、ない……♡」'), portrait: '', background: 'event/defeatGrunt3.png' },
    { speaker: 'narration', text: l(
      'Man 1: "You can\'t do a thing, can you. Too dangerous. Better break you more."\nThe man pulls the blindfold tight again.',
      '男1: 「もう何もできねえだろ。危ねえから、もっと壊しとくか」\n男は再び目隠しを締め直した。'), portrait: '', background: 'event/defeatGrunt3.png' },

    { speaker: 'narration', text: l(
      'It does not stop. Her body will not stop convulsing, and she keeps cumming, hips thrashing.',
      '責めは止まらない。体の痙攣が収まらず、腰を振り乱しながらイキ続ける。'), portrait: '', background: 'event/defeatGrunt4.png' },
    { speaker: 'quote', text: l(
      '"Ah... aah♡ ...I\'m... cumming...♡♡"',
      '「あ……ぁっ♡ ……イ、て……るぅ♡♡」'), portrait: '', background: 'event/defeatGrunt4.png',
      backgroundTransition: { type: 'flash', duration: 800, showText: true } },
    { speaker: 'narration', text: l(
      'Heat from the crest races out from her lower abdomen through her whole body. She realizes there is no turning back.',
      '下腹部から淫紋の熱が全身を駆け巡り、もう引き返せないことが分かってしまう。'), portrait: '', background: 'event/defeatGrunt4.png' },
    { speaker: 'quote', text: l(
      '"~~~~~♡♡♡"',
      '「～～～～っ♡♡♡」'), portrait: '', background: 'event/defeatGrunt4.png',
      backgroundTransition: { type: 'flash', duration: 800, showText: true } },

    { speaker: 'narration', text: l(
      'Forced past her limit, she puts her strength into her arms against the pain.',
      '限界を超えてイかされ続ける苦痛に、腕へ力を込める。'), portrait: '', background: 'event/defeatGrunt5.png' },
    { speaker: 'quote', text: l(
      '"No... I have to... get away...!"',
      '「や……だめっ……逃げなきゃ……っ」'), portrait: '', background: 'event/defeatGrunt5.png' },
    { speaker: 'narration', text: l(
      'She grits her teeth, strains, and thrashes. The restraints do not give.',
      '歯を食いしばり、体に力を入れて暴れる。それでも拘束は抜けない。'), portrait: '', background: 'event/defeatGrunt5.png' },
    { speaker: 'narration', text: l(
      'Man 1: "At your limit already? You can take more, can\'t you!?"\nHe does not wait for an answer, and drives her harder.',
      '男1: 「もう限界か？まだいけるだろっ！？」\n答えを待たず、男はさらに責め立てる。'), portrait: '', background: 'event/defeatGrunt5.png' },
    { speaker: 'quote', text: l(
      '"It... I can\'t... I\'m cumming♡♡"',
      '「いっ……苦しい……イくぅっ♡♡」'), portrait: '', background: 'event/defeatGrunt5.png',
      backgroundTransition: { type: 'flash', duration: 800, showText: true } },
    { speaker: 'narration', text: l(
      'Even so, it does not end. The climaxes repeat, again and again.',
      'それでも責めは終わらない。絶頂は何度も、何度も繰り返された。'), portrait: '', background: 'event/defeatGrunt5.png' },

    { speaker: 'narration', text: l(
      'The blindfold is lifted again. Too many climaxes, and almost no consciousness left.',
      '再び目隠しを捲られる。絶頂のし過ぎで、もう意識が残っていない。'), portrait: '', background: 'event/defeatGrunt6.png' },
    { speaker: 'quote', text: l(
      '"...Ah...♡ ...nn...♡♡"',
      '「……ぁ……♡ ……んぅ……♡♡」'), portrait: '', background: 'event/defeatGrunt6.png' },
    { speaker: 'narration', text: l(
      'There is no strength in her body. Only a delirious voice leaks out.',
      '体に力は入らず、うわごとのように声が漏れるだけだ。'), portrait: '', background: 'event/defeatGrunt6.png' },
    { speaker: 'narration', text: l(
      'Man: "Let her rest a bit. We\'ll drain her again later."\nDrooling, slick with sweat and fluids, she is left behind as the men walk away.',
      '男: 「少し休ませとけ。また後で搾る」\nよだれを垂らし、汗と体液でドロドロのサキュバスを残して、男たちは去っていく。'), portrait: '', background: 'event/defeatGrunt6.png', backgroundDim: 0.6 },
    { speaker: 'quote', text: l(
      '"......"',
      '「……」'), portrait: '', background: 'event/defeatGrunt6.png', backgroundDim: 0.6 },
  ],
  defeatSlime: [
    { speaker: 'narration', text: l('The slime spreads across the floor, cutting off the last way out.', '床に広がったスライムに、最後の退路を塞がれた。'), background: 'background/Prison.png' },
  ],
  defeatAphrodisiacSlime: [
    { speaker: 'narration', text: l('The dripping of the slime is the last sound before everything fades.', '意識が遠のく。媚毒スライムの雫が落ちる音だけが、いつまでも響いていた。'), background: 'background/Prison.png' },
  ],
  defeatSlimeColony: [
    { speaker: 'narration', text: l('The colony closes in from every side. The passage disappears from view.', '四方からスライム群生体が迫り、通路が見えなくなった。'), background: 'background/Prison.png' },
  ],
  defeatForcedOrgasmMachine: [
    { speaker: 'narration', text: l('The machine keeps running. Only its hum breaks the silence.', '戦いが終わっても装置は止まらず、駆動音だけが響き続けた。'), background: 'background/Prison.png' },
  ],
  defeatDefault: [
    { speaker: 'quote', text: l('Placeholder text 1', '仮テキスト1'), portrait: 'Succubus_normal_idle_1.png', background: '' },
    { speaker: 'quote', text: l('Placeholder text 2', '仮テキスト2'), portrait: 'Succubus_normal_idle_1.png', background: '' },
    { speaker: 'quote', text: l('Placeholder text 3', '仮テキスト3'), portrait: 'Succubus_normal_idle_1.png', background: '' },
    { speaker: 'quote', text: l('Placeholder text 4', '仮テキスト4'), portrait: 'Succubus_normal_idle_1.png', background: '' },
    { speaker: 'quote', text: l('Placeholder text 5', '仮テキスト5'), portrait: 'Succubus_normal_idle_1.png', background: '' },
    { speaker: 'quote', text: l('Placeholder text 6', '仮テキスト6'), portrait: 'Succubus_normal_idle_1.png', background: '' },
    { speaker: 'quote', text: l('Placeholder text 7', '仮テキスト7'), portrait: 'Succubus_normal_idle_1.png', background: '' },
    { speaker: 'quote', text: l('Placeholder text 8', '仮テキスト8'), portrait: 'Succubus_normal_idle_1.png', background: '' },
    { speaker: 'quote', text: l('Placeholder text 9', '仮テキスト9'), portrait: 'Succubus_normal_idle_1.png', background: '' },
    { speaker: 'quote', text: l('Placeholder text 10', '仮テキスト10'), portrait: 'Succubus_normal_idle_1.png', background: '' },
  ],
};

/** 独立イベントの一覧情報と、通常戦闘の敗北会話への接続。キーはCONVERSATIONSと共通。 */
export const CONVERSATION_EVENTS: Record<string, ConversationEventMetadata> = {
  prologueBeforeBattle: { title: l('A Captive Succubus', '囚われのサキュバス'), category: 'prologue', gallery: true },
  prologueAfterBattle: { title: l('The Lewd God\'s Contract', '淫神との契約'), category: 'prologue', gallery: true, thumbnail: 'event/prologue_inmon3.png' },
  prologueDefeat1: { title: l('Bad End: Starved Away', 'BAD END：飢えたままで……'), category: 'prologue', gallery: true },
  prologueDefeat2: { title: l('Bad End: Strength Exhausted', 'BAD END：快感には勝てなかったよ……'), category: 'prologue', gallery: true },
  defeatGrunt: { title: l('Defeat (Grunt): No Escape', '敗北(下級兵)：もう逃げられない'), category: 'normal', gallery: true, defeatEnemyId: 'grunt' },
  defeatSlime: { title: l('Defeat (Slime):', '敗北(スライム)：'), category: 'normal', gallery: true, defeatEnemyId: 'slime' },
  defeatAphrodisiacSlime: { title: l('Defeat (Aphrodisiac Slime):', '敗北(媚毒スライム)：'), category: 'normal', gallery: true, defeatEnemyId: 'aphrodisiacSlime' },
  defeatSlimeColony: { title: l('Defeat (Slime Colony):', '敗北(スライム群生体)：'), category: 'normal', gallery: true, defeatEnemyId: 'slimeColony' },
  defeatForcedOrgasmMachine: { title: l('Defeat (ForcedOrgasm Machine):', '敗北(鬼イかせマシン)：'), category: 'normal', gallery: true, defeatEnemyId: 'ForcedOrgasmMachine' },
  defeatDefault: { title: l('Defeat', '敗北'), category: 'normal', gallery: true },
};

/** Add cause → dialogue ID entries here as defeat variants are introduced. */
export const DEFEAT_CONVERSATIONS: Record<string, string> = { default: 'defeatDefault' };
export const CONVERSATION_WINDOW = { openDuration: 500, closeDuration: 500, backgroundDimDuration: 500 };

/** 独立したノベルパートの明転・暗転時間（ms）。戦闘内会話には適用しない。 */
export const NOVEL_PRESENTATION = { fadeInDuration: 1000, fadeOutDuration: 2000 };

/** 将来の操作設定画面から差し替え可能なノベル操作割当。keysはKeyboardEvent.code。 */
export interface NovelInputBinding {
  keys: string[]; // KeyboardEvent.code（例：KeyZ、Enter、Space）。
  buttons: number[]; // 0=左、1=中、2=右、3=戻る、4=進む。
  wheel: 'up' | 'down' | 'none';
}
export interface NovelControls {
  advance: NovelInputBinding;
  log: NovelInputBinding;
  hide: NovelInputBinding;
  skip: { keys: string[]; intervalMs: number };
}
export const NOVEL_CONTROLS: NovelControls = {
  advance: { keys: ['KeyZ', 'Enter', 'NumpadEnter'], buttons: [0, 4], wheel: 'down' },
  log: { keys: ['KeyL'], buttons: [3], wheel: 'up' },
  hide: { keys: ['Space', 'KeyX'], buttons: [2], wheel: 'none' },
  skip: { keys: ['ControlLeft', 'ControlRight'], intervalMs: 60 },
};
