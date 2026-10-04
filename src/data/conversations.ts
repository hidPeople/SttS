import { text as l, type LocalizedText } from '../models/localization';
import type { ConversationBackgroundTransition } from './conversationTransitions';

export interface ConversationPage {
  text: LocalizedText;
  speaker: 'quote' | 'narration' | 'user';
  portrait?: string; // image/character内のファイル名（自動検出）、または登録ID。空欄は既存の立ち絵を制御しない。
  backgroundDim?: number; // 背景の暗さ。0=通常、1=黒。省略時0。
  background?: string; // image内の相対ファイル名。空欄は表示なし。
  backgroundTransition?: ConversationBackgroundTransition; // このページに進んだ時の背景演出。同じ画像でも実行する。初回・空欄では実行しない。
}

export const CONVERSATIONS: Record<string, ConversationPage[]> = {
  tutorialBeforeBattle: [
    { speaker: 'narration', text: l(
      'In the depths of the royal castle dungeon, a lone succubus lies imprisoned.', 
      '王城の地下牢に、一人のサキュバスが捕らわれている。'), portrait: '', background: 'event/tutorial_pre1.png', backgroundDim: 0.6 },
    { speaker: 'narration', text: l(
      'She had been caught while tempting men in town, driven by hunger.', 
      '空腹に耐えきれず、街の男を誘惑していたところを捕らえられたのだ。'), portrait: '', background: 'event/tutorial_pre1.png', backgroundDim: 0.6 },
    { speaker: 'quote', text: l(
      '".........."', 
      '「………………。」'), portrait: '', background: 'event/tutorial_pre1.png' },
    { speaker: 'narration', text: l(
      'Captured succubi are drained of the energy born from climax, used until nothing remains.', 
      '人間に捕まったサキュバス達は、絶頂時に生じるエネルギーを抽出する使い捨ての道具として、死ぬまで使い潰される。'), portrait: '', background: 'event/tutorial_pre1.png' },
    { speaker: 'narration', text: l(
      'I was no exception. \nFor the past several days, I had been forced to climax without rest, \nmy energy stolen with every orgasm.', 
      '私も例外ではなかった。\nここ数日、休む間もなく強制的に快楽を与えられ続け、\nイくたびにエネルギーを奪われていた。'), portrait: '', background: 'event/tutorial_pre1.png' },
    { speaker: 'narration', text: l(
      'Given almost no water or food, my stamina was already nearing its limit.', 
      '水も食事もほとんど与えられず、私の体力はすでに限界に近かった。'), portrait: '', background: 'event/tutorial_pre1.png' },
    { speaker: 'narration', text: l(
      '......Footsteps echo through the cold corridor.', 
      '――冷たい廊下に、足音が響く。'), portrait: '', background: 'event/tutorial_pre1.png' },
    { speaker: 'narration', text: l(
     'Three men step into the cell.', 
     '男たちが三人、牢の中へと入ってくる。'), portrait: '', background: 'event/tutorial_pre2.png' },
    { speaker: 'narration', text: l(
      'Remembering the relentless pleasure forced upon me just moments ago, \nthe last of my moisture spills out as tears.', 
      '先ほどまで受けていた強制的な快楽責めを思い出し、\n残り少ない水分が涙として溢れ出てくる。'), portrait: '', background: 'event/tutorial_pre2.png' },
    { speaker: 'narration', text: l(
     'Man: "Hey. We got chewed out because today\'s energy output was too low."', 
     '男: 「おい。今日のエネルギー生産が少ないって、上から怒られたじゃねーか」'), portrait: '', background: 'event/tutorial_pre2.png' },
    { speaker: 'quote', text: l(
     '"Hii...!"', 
     '「ひっ……！」'), portrait: '', background: 'event/tutorial_pre2.png' },
    { speaker: 'quote', text: l(
      '"...P-Please... just a little water..."', 
      '「……お、お願い……します………………み、……水を……」'), portrait: '', background: 'event/tutorial_pre2.png' },
    { speaker: 'narration', text: l(
      'Man: "Cum a hundred times and we\'ll let you drink."\nMan: "Haha, senpai, that\'s brutal."', 
      '男: 「百回イッたら飲ませてやるよ」\n男: 「わはは、先輩鬼畜っすね」'), portrait: '', background: 'event/tutorial_pre2.png' },
    { speaker: 'quote', text: l(
      '"I can\'t... anymore...... \nI can\'t even move... Someone... help me..."', 
      '「もう……限界……動けないよ…………\n誰か……助けて……」'), portrait: '', background: 'event/tutorial_pre2.png' },
  ],
  tutorialTurn1: [
    { speaker: 'quote', text: l(
      'Succubus: "Again... they\'re going to force me to cum..."', 
      '「また……無理やりイかされるんだ……」'), portrait: 'Succubus_tutorial_Starvation_idle_1', background: '' },
    { speaker: 'quote', text: l(
      'Succubus: "...even though I\'m already at my limit..."', 
      '「……もう限界なのに……」'), portrait: 'Succubus_tutorial_Starvation_idle_1', background: '' },
  ],
  tutorialTurn3: [
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
    { speaker: 'quote', text: l(
      '"!?"', 
      '「！？」'), portrait: '', background: '' },
    { speaker: 'quote', text: l(
      '"(Could this be... the Lewd God...?)"', 
      '「（もしかして……淫神さまなの……？）」'), portrait: '', background: '' },
  ],
  tutorialAfterBattle: [
    { speaker: 'quote', text: l(
      '"...Haah♡ ...Haah♡ ............Haa...h♡"', 
      '「……はぁっ♡ ……はぁっ♡ …………っはあ…っ♡」'), portrait: 'Succubus_tutorial_Aftershocksgte2_1', background: 'background/Prison_cell.png' },
    { speaker: 'narration', text: l(
      'While being forced to cum again and again, \nthe succubus lost herself in draining the three men of their essence. \nBefore she knew it, she had fully recovered.', 
      '何度もイかされながら、\nサキュバスは夢中で3人の男達から精気を吸いつくし、\n気が付くと完全に復活していた。'), portrait: 'Succubus_tutorial_Aftershocksgte2_1', background: 'background/Prison_cell.png' },
    { speaker: 'quote', text: l(
      '"This is the first time I\'ve absorbed this much... Could this be... the Lewd God\'s power?"', 
      '「あたし…こんなに吸ったの初めて……もしかしてこれって……淫神さまの力なの？」'), portrait: 'Succubus_tutorial_Aftershocksgte2_hover_novel_1', background: 'background/Prison_cell.png' },
    { speaker: 'user', text: l(
      '<<--I have temporarily granted you a portion of my power-->>', 
      '≪――貴様に一時的に我が力を与えた――≫'), portrait: 'Succubus_tutorial_Aftershocksgte2_hover_novel_1', background: 'background/Prison_cell.png', backgroundDim: 0.6 },
    { speaker: 'quote', text: l(
      '"Wah! Straight into my head again!? ...That feels so weird~"', 
      '「わわっ、また頭の中に直接っ！？ ……変な感じ～」'), portrait: 'Succubus_tutorial_hover_1', background: 'background/Prison_cell.png' },
    { speaker: 'quote', text: l(
      '"Hey~ God~ Please! Won\'t you help me get out of here...?"', 
      '「ねぇ～神さま～、お願いっ！ ここから出るの、手伝ってくれたりとか……しない？」'), portrait: 'Succubus_tutorial_Hunger__hover_1', background: 'background/Prison_cell.png' },
    { speaker: 'user', text: l(
      '<<--Any further aid requires a demon\'s contract. Accept the curse into your body...-->>', 
      '≪――これ以上は悪魔の契約が必要だ。その身に呪いを受け入れ…――≫'), portrait: 'Succubus_tutorial_idle_1', background: 'background/Prison_cell.png', backgroundDim: 0.6 },
    { speaker: 'quote', text: l(
      '"Hmm, I don\'t really get it, but please! It\'ll make me stronger, right?"', 
      '「う～ん、よくわかんないけどお願い！強くなれるんでしょっ？」'), portrait: 'Succubus_tutorial_hover_2', background: 'background/Prison_cell.png' },
    { speaker: 'user', text: l(
      '<<--............Confirmed. I shall inscribe the Contract\'s Lewd Crest-->>', 
      '≪――…………確認した。契約の淫紋を刻印する――≫'), portrait: 'Succubus_tutorial_hover_2', background: 'background/Prison_cell.png', backgroundDim: 0.6 },
    { speaker: 'quote', text: l(
      '"...Nn♡ Something\'s... deep in my belly... feels weird..."', 
      '「…んっ♡ なんか……お腹の奥がっ……へん…」'), portrait: '', background: 'event/tutorial_inmon1.png' },
    { speaker: 'narration', text: l(
      'Ignoring the succubus\'s will, her body suddenly reaches climax, convulsing and twitching violently.', 
      'サキュバスの意志を無視して、唐突に身体が絶頂を迎え、びくびくと痙攣する。'), portrait: '', background: 'event/tutorial_inmon1a.png',
      backgroundTransition: { type: 'flash', duration: 1000, showText: false } },
    { speaker: 'narration', text: l(
      'At the same time, her lower abdomen begins to glow faintly.', 
      '同時に下腹部が淡く輝き始めた。'), portrait: '', background: 'event/tutorial_inmon1a.png' },
    { speaker: 'quote', text: l(
      '"——What is this♡ I\'m cumming......~~~~♡♡♡"', 
      '「――なにっこれ♡、私、イって……～～～～っ♡♡♡」'), portrait: '', background: 'event/tutorial_inmon2.png',
      backgroundTransition: { type: 'radial', duration: 1000, originX: 0.37, originY: 0.8, feather: 0.16, showText: false } },
    { speaker: 'quote', text: l(
      '"...♡ ...Haah♡ ............Haah♡"', 
      '「……っ♡ ……はぁっ♡ …………はぁっ♡」'), portrait: '', background: 'event/tutorial_inmon3.png',
      backgroundTransition: { type: 'flash', duration: 1800, showText: false } },
    { speaker: 'user', text: l(
      '<<--It seems your body could not withstand the inscription of the crest-->>', 
      '≪――淫紋の刻印に身体が耐えられなかったようだ――≫'), portrait: '', background: 'event/tutorial_inmon3.png', backgroundDim: 0.6 },
    { speaker: 'quote', text: l(
      '"♡ You never told me about this! ...And what\'s with these clothes!?"', 
      '「っ♡ こんなの、聞いてないよっ！……それにこの服、これは何！？」'), portrait: '', background: 'event/tutorial_inmon4.png' },
    { speaker: 'narration', text: l(
      'The moment her body climaxed on its own, a deep ache spread from her womb, heat flooding her entire body.', 
      '身体が勝手に絶頂をむかえると、子宮が疼き火照りが全身に広がっていった。'), portrait: '', background: 'event/tutorial_inmon4.png' },
    { speaker: 'narration', text: l(
      'Apparently, with her powers as a succubus heightened, she had gained the ability to manifest the clothing she desired.', 
      '――話によると、どうやらサキュバスとしての力が高まったことにより、自身が望んだ衣装を再現できるようになったらしい。'), portrait: '', background: 'event/tutorial_inmon4.png' },
    { speaker: 'user', text: l(
      '<<--The curse will strengthen with every climax. Be warned-->>', 
      '≪――絶頂を重ねる毎に呪いは強化される。注意せよ――≫'), portrait: '', background: 'event/tutorial_inmon4.png', backgroundDim: 0.6 },
    { speaker: 'quote', text: l(
      '".........Nn? ...??"', 
      '「…………ん？ ……？？」'), portrait: '', background: 'event/tutorial_inmon5.png' },
    { speaker: 'user', text: l(
      '<<--I shall directly control your actions from now on-->>', 
      '≪――汝の行動は私が直々に制御しよう――≫'), portrait: '', background: 'event/tutorial_inmon5.png', backgroundDim: 0.6 },
    { speaker: 'quote', text: l(
      '".........Nnah? ...Does that mean I\'m being controlled?"', 
      '「…………んあ？ ……それって操られてるって言うんじゃ」'), portrait: '', background: 'event/tutorial_inmon5.png' },
    { speaker: 'quote', text: l(
      '"......"', 
      '「……」'), portrait: '', background: 'event/tutorial_inmon5.png', backgroundDim: 0.8 },
  ],
  tutorialDefeat1: [
    { speaker: 'narration', text: l('Placeholder text 1', '仮テキスト1'), portrait: '', background: 'event/tutorial_badend1.png' },
    { speaker: 'narration', text: l('Placeholder text 2', '仮テキスト2'), portrait: '', background: 'event/tutorial_badend1.png' },
    { speaker: 'narration', text: l('Placeholder text 3', '仮テキスト3'), portrait: '', background: 'event/tutorial_badend1.png' },
    { speaker: 'narration', text: l('Placeholder text 4', '仮テキスト4'), portrait: '', background: 'event/tutorial_badend1.png' },
  ],
  tutorialDefeat2: [
    { speaker: 'narration', text: l('Placeholder text 1', '仮テキスト1'), portrait: '', background: 'event/tutorial_badend2.png' },
    { speaker: 'narration', text: l('Placeholder text 2', '仮テキスト2'), portrait: '', background: 'event/tutorial_badend2.png' },
    { speaker: 'narration', text: l('Placeholder text 3', '仮テキスト3'), portrait: '', background: 'event/tutorial_badend2.png' },
    { speaker: 'narration', text: l('Placeholder text 4', '仮テキスト4'), portrait: '', background: 'event/tutorial_badend2.png' },
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
