import { FLAVOR_EVENTS, type BattleFlavorEntry, type BattleFlavorEvent, type BattleFlavorSet } from '../models/types';
import { text as l } from '../models/localization';
import { condition } from './effectBuilders';

export const GLOBAL_FLAVORS: BattleFlavorSet = {
  [FLAVOR_EVENTS.Battle.Won]: [
    { kind: 'system', text: l('Battle won', '戦闘に勝利') },
  ],
  [FLAVOR_EVENTS.Battle.PlayerTurnStart]: [
    { kind: 'system', text: l('==== Your turn ====', '==== あなたのターン ====') },
  ],
  [FLAVOR_EVENTS.Battle.EnemyTurnStart]: [
    { kind: 'system', text: l('==== Enemy turn ====', '==== 敵のターン ====') },
  ],
  [FLAVOR_EVENTS.Battle.ContinuousPeaks]: [
    { kind: 'narration', text: l(
      'Drowned in the waves of continuous peaks, unable to return.',
      '絶え間なく押し寄せるPeakの波にのまれ戻ってこられない',
    ) },
  ],
  [FLAVOR_EVENTS.Battle.PlayerEpPeakAfterglow]: [
    { kind: 'system', text: l(
      'The afterglow of the previous Peak leaves her unable to hold back.',
      '前回のPeakの余韻で、Peakするのを我慢できない。',
    ) },
  ],
  [FLAVOR_EVENTS.Battle.PlayerEpPeakFirstQuote]: [
    { kind: 'quote', text: l('"Nngh... I am going to Peak...!"', '「……んっ……Peakする……っ！」') },
    { kind: 'quote', text: l('"I am going to Peak... I am Peaking!"', '「Peakしちゃう………………Peakするっ！」') },
    { kind: 'quote', text: l('"No...! I am going to Peak♡"', '「だめ…………っ！……Peakする♡」') },
    { kind: 'quote', text: l('"I am Peaking! I am going to Peak!"', '「Peakします！……Peakすっる！」') },
    { kind: 'quote', text: l('"I am about to Peak... I am Peaking!"', '「Peakしそう……Peakする！」') },
    { kind: 'quote', text: l('"Wait♡ just a second♡ I am going to Peak!"', '「ちょっと♡ 待って♡ Peakするっ！」') },
    { kind: 'quote', text: l('"This is bad... I am Peaking... nnngh♡!"', '「ヤバっ……Peakするっ……んんっ♡！」') },
    { kind: 'quote', text: l('"I am Peaking! ...hah...♡ hah...♡!"', '「Peakするっ！……っ……はぁ……♡ はぁ……♡！」') },
    { kind: 'quote', text: l('"Nngh, aaahhh♡"', '「んっ、～ぁ～～～っ♡」') },
    { kind: 'quote', text: l('"Ah... ah! Ah, aah, nnhaaah♡♡"', '「あ…っ……あっ！あっ、ぁ、んあぁ～～♡♡」') },
  ],
  [FLAVOR_EVENTS.Battle.PlayerEpPeakFirst]: [
    { kind: 'system', text: l('{player} Peaked', '{player}はPeakしてしまった') },
  ],
  [FLAVOR_EVENTS.Battle.PlayerEpPeakRepeatQuote]: [
    {
      conditions: [condition('flavorValue', 'eq', { valueKey: 'flashCount', value: 4 })],
      lines: [
        { kind: 'quote', text: l('"Again?...Ngh♡! I just Peaked...!"', '「ぁ、また…？……っぐ♡！ さっきPeakしたばかりなのに……！」') },
        { kind: 'quote', text: l('"Ngh... it is coming again♡♡!"', '「んっ……また、キちゃう～～♡♡！」') },
        { kind: 'quote', text: l('"Wait...♡ I have not recovered yet...!"', '「待って……♡ まだ戻れてないのに……！」') },
        { kind: 'quote', text: l('"No...♡♡ another Peak already...! ...Ngh!♡"', '「だめ……♡♡ もう次が……！ ……ぃぐぅ！♡」') },
        { kind: 'quote', text: l('"Hah...♡ hah...♡♡♡ (I cannot slow it down...!)"', '「はっ……♡ はっ……♡♡♡ (Peakするのを止める暇がない……！)」') },
        { kind: 'quote', text: l('"It keeps♡ rising...♡ again and again...!"', '「また♡ 上がってくる……♡ 何度も……！」') },
        { kind: 'quote', text: l('"Nn...♡♡ I am going to Peak again...!"', '「んん……♡♡ またPeakするっ……！」') },
        { kind: 'quote', text: l('"My body has... not calmed down yet...!"', '「から、だが……まだ落ち着いてないのに……！」') },
      ],
    },
    {
      conditions: [condition('flavorValue', 'eq', { valueKey: 'flashCount', value: 3 })],
      lines: [
        { kind: 'quote', text: l('"Again...♡ again...♡♡! I cannot stop it...!"', '「また……♡ また……♡♡！ 止められない……！」') },
        { kind: 'quote', text: l('"Ngh... my head is going blank...!"', '「んっ……頭がぼうっとする……！」') },
        { kind: 'quote', text: l('"No♡, no...!!♡♡ I am losing control...!"', '「だめ♡、だめ～～！！♡♡ ……理性が……！」') },
        { kind: 'quote', text: l('"I just Peaked... why again...♡!"', '「今Peakしたのに……なんでまた……♡！」') },
        { kind: 'quote', text: l('"Hah...Ngh♡♡♡ it will not give me a break...!"', '「はぁっ……っぐ♡♡♡ 休ませてくれない……！」') },
        { kind: 'quote', text: l('"Nnhaa...♡♡ the next wave is already here...♡!"', '「んんぁ……♡♡ もう次のすごいのが……♡！」') },
        { kind: 'quote', text: l('"♡♡!! (I cannot tell where one Peak ends anymore...!)"', '「♡♡っ！！(どこでPeakし終わったのか分からない……！)」') },
        { kind: 'quote', text: l('"Ah...♡ I am Peaking again...♡ again...♡♡!"', '「あっ……♡ またPeakする……♡ っまた……♡♡！」') },
      ],
    },
    {
      conditions: [condition('flavorValue', 'eq', { valueKey: 'flashCount', value: 2 })],
      lines: [
        { kind: 'quote', text: l('"Aah...♡ no...♡♡ it will not stop...♡♡♡!"', '「あぁ……♡ だめ……♡♡ 止まらない……♡♡♡！」') },
        { kind: 'quote', text: l('"N♡ghaa♡♡... another one is breaking through...!"', '「ん♡がぁ♡♡……また突き抜ける……！」') },
        { kind: 'quote', text: l('"I cannot think... only Peak...♡!"', '「考えられない……Peakしてることしか……♡！」') },
        { kind: 'quote', text: l('"Hahh...♡ I am falling apart again...♡♡!"', '「はぁっ……♡ また……堕ちる……♡♡！」') },
        { kind: 'quote', text: l('"No break... no breath... another Peak...!"', '「間がない……息も……またPeak……！」') },
        { kind: 'quote', text: l('"Ahh... my body is moving on its own...♡♡♡♡!"', '「あぁっ……体が勝手に……♡♡♡♡！」') },
        { kind: 'quote', text: l('"Nnngh...♡♡ I cannot come back...!"', '「んんっ……♡♡ 戻ってこられない……！」') },
        { kind: 'quote', text: l('"Again♡, again♡, again...♡♡ I am Peaking...!"', '「また♡、また♡、っまた……♡♡ Peakずる……！」') },
      ],
    },
    {
      conditions: [condition('flavorValue', 'eq', { valueKey: 'flashCount', value: 1 })],
      lines: [
        { kind: 'quote', text: l('"Aaah♡♡... again... no, AaaAAAh♡♡...  again...♡!"', '「あぁ゛♡♡……また……だめ、あ゛ぁぁ゛♡♡……また……♡！」') },
        { kind: 'quote', text: l('"Ng♡haa♡... I cannot stop Peaking...♡!"', '「んが♡ぁ゛♡……Peakするのが止まらない……♡！」') },
        { kind: 'quote', text: l('"Haaah... It’s hard... I do not know what I am anymore...♡!"', '「はぁ゛……くるしいっ♡ ……もう…おかしく……♡！」') },
        { kind: 'quote', text: l('"Again♡, again♡, again...♡♡ I am Peaking...!"', '「また♡、また♡、っまた……♡♡ Peakずる……！」') },
        { kind: 'quote', text: l('"Aah... aah... I am breaking...♡!"', '「あ゛……あぁ～～……壊れる……♡！」') },
        { kind: 'quote', text: l('"Nnngh... Ooogh... (my voice will not come out right...♡!)"', '「ん゛んっ……お゛ぉ゛っ！(こんな声、私のじゃないっ……♡！)」') },
        { kind: 'quote', text: l('"Peak...♡ Peak...♡♡ I cannot come back...♡!"', '「Peakずる♡……Peakずる♡♡……戻れない……♡！」') },
        { kind: 'quote', text: l('"Aaah... no pause... no end...♡♡♡!"', '「あぁ゛……ずっとPeakしでるぅ……♡♡♡！」') },
        { kind: 'quote', text: l('"...♡! I am going to Peak again...! ...♡♡♡!!"', '「……っ♡！ またPeakする……♡ ……っ♡♡♡！！」') },
      ],
    },
    {
      conditions: [condition('flavorValue', 'eq', { valueKey: 'flashCount', value: 0 })],
      lines: [
        { kind: 'quote', text: l('"Ooohh♡♡♡♡"', '「お゛お゛おぉ゛ぉ♡♡♡♡」') },
        { kind: 'quote', text: l('"...♡! ...♡♡♡!!"', '「……っ♡！……っ♡♡♡！！」') },
        { kind: 'quote', text: l('"Ngh...♡!aaah ...♡♡♡!!"', '「……うっ♡！あぁ～ …………っううっ♡♡♡！！」') },
        { kind: 'quote', text: l('"Nghhh-aaah♡♡♡"', '「ぅ゛っ～～～ぁ～～♡♡♡」') },
        { kind: 'quote', text: l('"Breaking...♡ I am breaking...♡♡"', '「壊れる……♡ 壊れるっ……♡♡」') },
        { kind: 'quote', text: l('"No more...♡♡ I cannot...♡♡ ...♡!"', '「もぅ無理……♡♡ 無理ぃい……♡♡ ……っ♡！」') },
        { kind: 'quote', text: l('"Help...♡♡ I cannot...♡♡"', '「助げでっ♡！ もう無理ぃ……♡♡」') },
        { kind: 'quote', text: l('"Aahh♡♡ ah, ahh♡♡"', '「あ゛ぁ♡♡ あ、ぁあ♡♡」') },
        { kind: 'quote', text: l('"Nnngh♡♡♡ ...ngh♡!"', '「ん゛ん゛♡♡♡ ……っ♡！」') },
        { kind: 'quote', text: l('"Peak...♡ Peak...♡♡ again...♡"', '「Peakしだ……♡ もぅPeakしだのに……♡♡ また……♡」') },
        { kind: 'quote', text: l('"Hahh♡♡ no... no...♡♡"', '「はぁ゛♡♡ だめ……だめぇ……♡♡」') },
        { kind: 'quote', text: l('"Aaaah♡♡♡ I cannot come back♡"', '「あぁ゛ぁ♡♡♡ 戻れな゛い♡」') },
      ],
    },
  ],
  [FLAVOR_EVENTS.Battle.PlayerEpPeakRepeat]: [
    {
      conditions: [condition('flavorValue', 'eq', { valueKey: 'flashCount', value: 4 })],
      lines: [{ kind: 'system', text: l('{player} Peaked again and again.', '{player}は連続でPeakしてしまった') }],
    },
    {
      conditions: [condition('flavorValue', 'eq', { valueKey: 'flashCount', value: 3 })],
      lines: [{ kind: 'system', text: l('{player} cannot resist the repeating Peaks.', '{player}は繰り返すPeakに抵抗できない') }],
    },
    {
      conditions: [condition('flavorValue', 'eq', { valueKey: 'flashCount', value: 2 })],
      lines: [{ kind: 'system', text: l('{player}\'s Peaks will not stop.', '{player}のPeakは止まらない') }],
    },
    {
      conditions: [condition('flavorValue', 'eq', { valueKey: 'flashCount', value: 1 })],
      lines: [{ kind: 'system', text: l('{player} keeps Peaking again and again without pause.', '{player}は間隔を置かず何度もPeakし続けている') }],
    },
  ],
  [FLAVOR_EVENTS.Battle.EnemyEpPeak]: [
    { kind: 'system', text: l('Made {enemy} Peak', '{enemy}をPeakさせた') },
  ],
  [FLAVOR_EVENTS.Battle.PlayerEpDamageQuote]: [
    {
      conditions: [condition('flavorValue', 'lte', { valueKey: 'epDamagePercentOfRange', value: 11 })],
      lines: [
        { kind: 'quote', text: l('"...!"', '「……っ」') },
        { kind: 'quote', text: l('"Ah..."', '「あっ…」') },
        { kind: 'quote', text: l('"Ngh..."', '「んっ…」') },
        { kind: 'quote', text: l('"Hah..."', '「はっ…」') },
        { kind: 'quote', text: l('"...mm."', '「……ん」') },
        { kind: 'quote', text: l('"Aah..."', '「ぁ…」') },
        { kind: 'quote', text: l('"Nn..."', '「んん…」') },
        { kind: 'quote', text: l('"Hn...!"', '「ひゃ…っ」') },
        { kind: 'quote', text: l('"Oh..."', '「お…っ」') },
        { kind: 'quote', text: l('"...ah."', '「……あ」') },
      ],
    },
    {
      conditions: [condition('flavorValue', 'lte', { valueKey: 'epDamagePercentOfRange', value: 44 })],
      lines: [
        { kind: 'quote', text: l('"Ah... ngh..."', '「あっ……んっ…」') },
        { kind: 'quote', text: l('"Nnh... wait..."', '「んっ……まって…」') },
        { kind: 'quote', text: l('"Hah... that hit me..."', '「はっ……きた…」') },
        { kind: 'quote', text: l('"Ah, not there..."', '「あっ、そこ……」') },
        { kind: 'quote', text: l('"Ngh... I felt that..."', '「んっ……気持ちいぃ…かも…」') },
        { kind: 'quote', text: l('"Haa... ah..."', '「はぁ……あっ…」') },
        { kind: 'quote', text: l('"Mm... it is building..."', '「ん……この感じっ…」') },
        { kind: 'quote', text: l('"Ah... again...?"', '「あっ……また…？」') },
        { kind: 'quote', text: l('"Nn... my body..."', '「んん……私のここ…」') },
        { kind: 'quote', text: l('"Hah... careful..."', '「はっ……だめかも…」') },
      ],
    },
    {
      conditions: [condition('flavorValue', 'lte', { valueKey: 'epDamagePercentOfRange', value: 88 })],
      lines: [
        { kind: 'quote', text: l('"Ahh... it is getting strong..."', '「あぁっ……すごい…」') },
        { kind: 'quote', text: l('"Ngh... (my knees...)"', '「んっ……(膝が…震えて…)」') },
        { kind: 'quote', text: l('"Hah... no, not yet..."', '「はっ……だめ、まだ…」') },
        { kind: 'quote', text: l('"Ah... that is too much..."', '「あっ……強いぃ…」') },
        { kind: 'quote', text: l('"Nnhaa... I can feel it..."', '「んんぁ……感じちゃう…」') },
        { kind: 'quote', text: l('"Haa... (my head is going blank...)"', '「はぁ……(頭がぼうっとする…)」') },
        { kind: 'quote', text: l('"Ah♡ wait..."', '「あっ♡ 待って…」') },
        { kind: 'quote', text: l('"Ngh... it is rising..."', '「んっ……なんかキそう…」') },
        { kind: 'quote', text: l('"No... I almost..."', '「だめ……Peakしそう…」') },
        { kind: 'quote', text: l('"Hah... hah... I can still hold it..."', '「はっ……はっ……我慢っ…」') },
      ],
    },
    {
      conditions: [condition('flavorValue', 'lte', { valueKey: 'epDamagePercentOfRange', value: 143 })],
      lines: [
        { kind: 'quote', text: l('"Ahh♡ this is bad...!"', '「あぁっ♡これ、ヤバい…！」') },
        { kind: 'quote', text: l('"Ngh... I am going to lose control..."', '「んっ……おかしくなるぅ…」') },
        { kind: 'quote', text: l('"Hah♡ not so hard...!"', '「はぁっ♡ こんな…すごいの…！」') },
        { kind: 'quote', text: l('"Ah... no, I am close..."', '「あっ……だめ、もうっ…」') },
        { kind: 'quote', text: l('"Nnhaa♡ (I cannot keep steady...)"', '「んんぁ～♡ (もう…立ってられない…)」') },
      ],
    },
    {
      conditions: [condition('flavorValue', 'lte', { valueKey: 'epDamagePercentOfRange', value: 242 })],
      lines: [
        { kind: 'quote', text: l('"Aah♡ no, no more...!"', '「あぁっ♡だめ、これ以上は…！」') },
        { kind: 'quote', text: l('"Nghaa... it is too intense...!"', '「んがぁ……強すぎる…！」') },
        { kind: 'quote', text: l('"Hah♡ (my body is shaking...!)"', '「はぁっ♡ (体が震える…！)」') },
        { kind: 'quote', text: l('"Ahh... I cannot hold back...!"', '「あぁ……我慢できない…！」') },
        { kind: 'quote', text: l('"Nnnh♡ I am breaking...!"', '「んんっ♡ 壊れそう…！」') },
      ],
    },
    {
      conditions: [condition('flavorValue', 'lte', { valueKey: 'epDamagePercentOfRange', value: 484 })],
      lines: [
        { kind: 'quote', text: l('"Aahh♡ it hurts... but I feel it...!"', '「あぁぁ♡ 苦しい……感じちゃう…！」') },
        { kind: 'quote', text: l('"Nghaa... no, I cannot take this...!"', '「かはっ……だめ、耐えられない…！」') },
        { kind: 'quote', text: l('"Hahh♡ my mind is melting...!"', '「はぁぁ♡ 頭がバカになるぅ…！」') },
        { kind: 'quote', text: l('"Aah... stop... I will Peak...!"', '「あぁ……止めて……こんなのすぐPeakしちゃう…！」') },
        { kind: 'quote', text: l('"Nnhaa♡ I cannot breathe...♡"', '「んはぁ♡ 息がっ、できないっ♡」') },
      ],
    },
    {
      lines: [
        { kind: 'quote', text: l('"Aaaagh♡♡ no, I cannot endure this...!"', '「あ゛ぁぁ♡♡ だめ、こんな゛の！耐えられな゛い…！」') },
        { kind: 'quote', text: l('"Nghaaah...♡ my body is going numb...!"', '「ん゛がらだ……♡ 体がっ♡ しびれてるっ…！」') },
        { kind: 'quote', text: l('"Haaah♡♡♡ I am falling apart♡...!"', '「はぁ゛ぁ♡♡♡ おかしくなる♡…！」') },
        { kind: 'quote', text: l('"Aah, aahh♡ no more, no more...!"', '「あ゛、あぁっ♡ もう、無理……！」') },
        { kind: 'quote', text: l('"Nnngh♡ I cannot even think♡♡♡...!"', '「ん゛んっ♡何も考えられな゛い♡♡♡…！」') },
      ],
    },
  ],
  [FLAVOR_EVENTS.Battle.LingeringAfterConsumption]: [
    {
      conditions: [condition('flavorValue', 'eq', { valueKey: 'playerFainted', value: true })],
      lines: [
        { kind: 'narration', text: l(
          '{player}\'s unconscious breathing is ragged and strained.',
          '意識を失った{player}の呼吸が苦しげに乱れている。',
        ) },
      ],
    },
    {
      conditions: [condition('flavorValue', 'gte', { valueKey: 'remainingStacks', value: 50 })],
      lines: [
        { kind: 'quote', text: l('"...! ...!!"', '「……！ ……！！」') },
        { kind: 'narration', text: l('{player} is convulsing with rolled-back eyes.', '{player}は白目を剥いて痙攣している。') },
      ],
    },
    {
      conditions: [condition('flavorValue', 'gte', { valueKey: 'remainingStacks', value: 20 })],
      lines: [
        { kind: 'quote', text: l('"...ah... aah..."', '「……あ……ぁ……」') },
        { kind: 'narration', text: l('{player} lies limp and motionless.', '{player}はぐったりとして動かない。') },
      ],
    },
    {
      conditions: [condition('flavorValue', 'gt', { valueKey: 'remainingStacks', value: 5 })],
      lines: [
        { kind: 'quote', text: l('"...hah♡... hah♡... hah♡..."', '「……はっ♡……はっ♡…はっ♡…」') },
        { kind: 'narration', text: l('{player} collapses to the ground and keeps taking shallow breaths.', '{player}は地面に倒れ込み、浅い呼吸を繰り返している。') },
      ],
    },
    {
      conditions: [condition('flavorValue', 'gt', { valueKey: 'remainingStacks', value: 0 })],
      lines: [
        { kind: 'quote', text: l('"...foo♡... foo♡..."', '「……ふーっ♡……ふーっ♡……」') },
        { kind: 'narration', text: l('{player} is almost out of breath.', '{player}は息も絶え絶えだ。') },
      ],
    },
    {
      conditions: [condition('flavorValue', 'gt', { valueKey: 'playerEnergy', value: 0 })],
      lines: [
        { kind: 'quote', text: l('"Hah... hah..."', '「はぁ……はぁ……」') },
        { kind: 'narration', text: l('{player} steadies her ragged breathing.', '{player}は乱れた呼吸を整えた。') },
      ],
    },
    {
      lines: [
        { kind: 'quote', text: l('"...hah♡... hah♡..."', '「……はぁっ♡……はぁっ♡……」') },
        { kind: 'narration', text: l('{player} cannot move under the lingering afterglow of Peak.', '{player}はPeakの余韻を押し殺すのに精一杯だ。') },
      ],
    },
  ],
  [FLAVOR_EVENTS.Battle.SensitivityLevelUp]: [
    {
      conditions: [condition('flavorValue', 'gte', { valueKey: 'sensitivityLevel', value: 5 })],
      lines: [
        { kind: 'important', text: l(
          '{player}\'s {part} has been developed completely and cannot endure even the slightest stimulation.',
          '{player}の{part}は開発し尽され、わずかな刺激にも耐えられない。',
        ) },
      ],
    },
    {
      lines: [
        { kind: 'important', text: l(
          '{player}\'s {part} has become more sensitive.',
          '{player}の{part}が開発され{sensitivityAdverb}敏感になってしまった。',
        ) },
      ],
    },
  ],
  [FLAVOR_EVENTS.Effect.AddCardToHand]: [
    { kind: 'system', text: l('{source}: add {amount} {card}', '{source}：カード[{card}]を{amount}枚手札に追加') },
  ],
  [FLAVOR_EVENTS.Effect.DrawCards]: [
    { kind: 'system', text: l('{source}: draw {amount}', '{source}：カードを{amount}枚ドロー') },
  ],
  [FLAVOR_EVENTS.Effect.DiscardHand]: [
    { kind: 'system', text: l('{source}: discard hand', '{source}：手札を捨てる') },
  ],
  [FLAVOR_EVENTS.Effect.SetEpReserveRatio]: [
    { kind: 'system', text: l('{source}: EP reserve floor changed', '{source}：EPリセット下限が変化') },
  ],
  [FLAVOR_EVENTS.Effect.SetEp]: [
    { kind: 'system', text: l('{source}: set EP {amount}', '{source}：EPを{amount}に変更') },
  ],
  [FLAVOR_EVENTS.Effect.RetainBlock]: [
    { kind: 'system', text: l('{source}: retain block', '{source}：Blockを維持') },
  ],
  [FLAVOR_EVENTS.Effect.EpReserveHeal]: [
    { kind: 'system', text: l('{source}: recover EP reserve', '{source}：EPリセット下限を回復') },
  ],
  [FLAVOR_EVENTS.Effect.EnergyChange]: [
    { kind: 'system', text: l('{source}: {signedAmount} energy', '{source}：エナジー{signedAmount}') },
  ],
  [FLAVOR_EVENTS.Effect.HpHeal]: [
    { kind: 'system', text: l('{target} heals {amount} HP', '{target}がHPを{amount}回復') },
  ],
  [FLAVOR_EVENTS.Effect.EpHeal]: [
    { kind: 'system', text: l('{target} recovers {amount} EP', '{target}がEPを{amount}回復') },
  ],
  [FLAVOR_EVENTS.Effect.BlockGain]: [
    { kind: 'system', text: l('{target} gains {amount} Block', '{target}がBlockを{amount}得る') },
  ],
  [FLAVOR_EVENTS.Effect.HpDamage]: [
    {
      conditions: [
        condition('flavorValue', 'lte', { valueKey: 'actualHpDamage', value: 0 }),
        condition('flavorValue', 'gt', { valueKey: 'incomingHpDamage', value: 0 }),
      ],
      lines: [{ kind: 'system', text: l('{target} blocks {incomingHpDamage} HP damage', '{target}が{incomingHpDamage}ダメージをブロック') }],
    },
    {
      lines: [{ kind: 'system', text: l('{target} takes {actualHpDamage} HP damage', '{target}がHPに{actualHpDamage}ダメージ') }],
    },
  ],
  [FLAVOR_EVENTS.Effect.EpDamage]: [
    { kind: 'system', text: l('{target} takes {amount} EP damage', '{target}がEPに{amount}ダメージ') },
  ],
  [FLAVOR_EVENTS.Effect.HpDrain]: [
    { kind: 'system', text: l('{enemy} is drained for {amount} HP', '{enemy}からHPを{amount}ドレイン') },
  ],
  [FLAVOR_EVENTS.Status.Apply]: [
    { kind: 'status', text: l('{source}: apply {status} to {target}', '{source}：{target}に{status}を付与') },
  ],
  [FLAVOR_EVENTS.Status.ApplyImportant]: [
    { kind: 'important', text: l('{source}: apply {status} to {target}', '{source}：{target}に{status}を付与') },
  ],
  [FLAVOR_EVENTS.Status.Infest]: [
    { kind: 'important', text: l('{source}: {enemy} infests {player}\'s {part}', '{source}：{enemy}が{player}の{part}に寄生') },
  ],
  [FLAVOR_EVENTS.Status.ApplyMiss]: [
    { kind: 'status', text: l('{source}: {status} missed', '{source}：{status}は失敗した') },
  ],
  [FLAVOR_EVENTS.Status.Change]: [
    { kind: 'status', text: l('{source}: {fromStatus} changed into {toStatus}', '{source}：{fromStatus}→{toStatus}に変化') },
  ],
  [FLAVOR_EVENTS.Status.ChangeImportant]: [
    { kind: 'important', text: l('{source}: {fromStatus} changed into {toStatus}', '{source}：{fromStatus}→{toStatus}に変化') },
  ],
  [FLAVOR_EVENTS.Status.Remove]: [
    {
      conditions: [condition('flavorValue', 'eq', { valueKey: 'sourceIsStatus', value: true })],
      lines: [{ kind: 'status', text: l('{source}: removed', '{source}：解除') }],
    },
    {
      lines: [{ kind: 'status', text: l('{source}: removed {status}', '{source}：{status}を解除') }],
    },
  ],
  [FLAVOR_EVENTS.Enemy.IntentFallback]: [
    { kind: 'narration', text: l('{enemy} uses {intent}.', '{enemy}の{intent}。') },
  ],
  [FLAVOR_EVENTS.Enemy.IntentWarning]: [
    { kind: 'narration', text: l('{enemy} is looking for a chance to bind {player}.', '{enemy}は{player}の拘束を狙っている。') },
  ],
  [FLAVOR_EVENTS.Enemy.IntentFailed]: [
    { kind: 'system', text: l('{enemy}\'s {intent} failed', '{enemy}の{intent}は失敗した') },
  ],
  [FLAVOR_EVENTS.Enemy.DeathHpDamage]: [
    { kind: 'narration', text: l('{enemy} was defeated.', '{enemy}を倒した。') },
  ],
  [FLAVOR_EVENTS.Enemy.DeathHpDrain]: [
    { kind: 'narration', text: l('{enemy} was drained dry.', '{enemy}の精気を吸いつくした。') },
  ],
  [FLAVOR_EVENTS.Card.PurgeFailed]: [
    { kind: 'system', text: l('{card} failed', '{card}は失敗した') },
  ],
  [FLAVOR_EVENTS.Card.RejectEnergy]: [
    { kind: 'system', text: l('Not enough energy', 'エナジーが足りない') },
  ],
  [FLAVOR_EVENTS.Card.RejectBound]: [
    { kind: 'system', text: l('Bound too tightly to move', '拘束されていて手足が動かせない。') },
  ],
  [FLAVOR_EVENTS.Card.RejectCraving]: [
    { kind: 'system', text: l('I can think only of Peak now', '今はPeakの事しか考えられない') },
  ],
  [FLAVOR_EVENTS.Card.RejectCondition]: [
    { kind: 'system', text: l('Cannot play now', '今は使用できない') },
  ],
};

export function globalFlavorEntries(event: BattleFlavorEvent): BattleFlavorEntry[] {
  return GLOBAL_FLAVORS[event] ?? [];
}
