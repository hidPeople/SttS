import { FLAVOR_EVENTS, type BattleFlavorEntry, type BattleFlavorEvent, type BattleFlavorSet } from '../models/types';
import { text as l } from '../models/localization';
import { condition } from './effectBuilders';

export const GLOBAL_FLAVORS: BattleFlavorSet = {
  [FLAVOR_EVENTS.Battle.PortraitSigilTouch]: [
    {
      conditions: [condition('flavorValue', 'eq', { valueKey: 'sigilAroused', value: false }), condition('flavorValue', 'eq', { valueKey: 'touchCount', value: 1 }), condition('playerState', 'has', { playerState: 'Gagged' })],
      lines: [
        { kind: 'quote', text: l('"Ngh."', '「んっ」') },
        { kind: 'quote', text: l('"Mmph!?"', '「んぶっ！？」') },
        { kind: 'quote', text: l('"...!?"', '「…！？」') },
      ],
    },
    {
      conditions: [condition('flavorValue', 'eq', { valueKey: 'sigilAroused', value: false }), condition('flavorValue', 'eq', { valueKey: 'touchCount', value: 1 })],
      lines: [
        { kind: 'quote', text: l('"Ngh."', '「んっ」') },
        { kind: 'quote', text: l('"What!?"', '「何！？」') },
        { kind: 'quote', text: l('"...!?"', '「…！？」') },
      ],
    },
    {
      conditions: [condition('flavorValue', 'eq', { valueKey: 'sigilAroused', value: false }), condition('flavorValue', 'eq', { valueKey: 'touchCount', value: 2 }), condition('playerState', 'has', { playerState: 'Gagged' })],
      lines: [
        { kind: 'quote', text: l('"(It is getting hot inside...)"', '「(奥が…熱いっ)」') },
        { kind: 'quote', text: l('"Ngh♡"', '「んっ♡」') },
        { kind: 'quote', text: l('"...!♡"', '「…っ！♡」') },
      ],
    },
    {
      conditions: [condition('flavorValue', 'eq', { valueKey: 'sigilAroused', value: false }), condition('flavorValue', 'eq', { valueKey: 'touchCount', value: 2 })],
      lines: [
        { kind: 'quote', text: l('"It is getting hot inside..."', '「奥が…熱いっ」') },
        { kind: 'quote', text: l('"Ngh♡"', '「んっ♡」') },
        { kind: 'quote', text: l('"...!♡"', '「…っ！♡」') },
      ],
    },
    {
      conditions: [condition('flavorValue', 'eq', { valueKey: 'sigilAroused', value: false }), condition('flavorValue', 'eq', { valueKey: 'touchCount', value: 3 }), condition('playerState', 'has', { playerState: 'Gagged' })],
      lines: [
        { kind: 'quote', text: l('"(No... I cannot control it♡)"', '「(ダメ……制御できないっ♡)」') },
        { kind: 'quote', text: l('"(Nnhaa♡... why all of a sudden!?)"', '「(んぁあっ♡……なんで急にっ！？)」') },
        { kind: 'quote', text: l('"(My body... feels strange♡)"', '「(体が……変っ♡)」') },
      ],
    },
    {
      conditions: [condition('flavorValue', 'eq', { valueKey: 'sigilAroused', value: false }), condition('flavorValue', 'eq', { valueKey: 'touchCount', value: 3 })],
      lines: [
        { kind: 'quote', text: l('"No... I cannot control it♡"', '「ダメ……制御できないっ♡」') },
        { kind: 'quote', text: l('"Nnhaa♡... why all of a sudden!?"', '「んぁあっ♡……なんで急にっ！？」') },
        { kind: 'quote', text: l('"My body... feels strange♡"', '「体が……変っ♡」') },
      ],
    },
    {
      conditions: [condition('flavorValue', 'eq', { valueKey: 'sigilAroused', value: true }), condition('flavorValue', 'eq', { valueKey: 'touchCount', value: 1 })],
      lines: [
        { kind: 'quote', text: l('"......♡"', '「……♡」') },
        { kind: 'quote', text: l('"...!?"', '「…っ！？」') },
        { kind: 'quote', text: l('"No♡"', '「いやっ♡」') },
      ],
    },
    {
      conditions: [condition('flavorValue', 'eq', { valueKey: 'sigilAroused', value: true }), condition('flavorValue', 'eq', { valueKey: 'touchCount', value: 2 }), condition('playerState', 'has', { playerState: 'Gagged' })],
      lines: [
        { kind: 'quote', text: l('"......♡♡"', '「……♡♡」') },
        { kind: 'quote', text: l('"(I might not be able to take this...)"', '「(ダメ…かも…)」') },
        { kind: 'quote', text: l('"(Something is wrong with my body...♡)"', '「(体がおかしいよ…♡)」') },
      ],
    },
    {
      conditions: [condition('flavorValue', 'eq', { valueKey: 'sigilAroused', value: true }), condition('flavorValue', 'eq', { valueKey: 'touchCount', value: 2 })],
      lines: [
        { kind: 'quote', text: l('"......♡♡"', '「……♡♡」') },
        { kind: 'quote', text: l('"I might not be able to take this..."', '「ダメ…かも…」') },
        { kind: 'quote', text: l('"Something is wrong with my body...♡"', '「体がおかしいよ…♡」') },
      ],
    },
    {
      conditions: [condition('flavorValue', 'eq', { valueKey: 'sigilAroused', value: true }), condition('flavorValue', 'eq', { valueKey: 'touchCount', value: 3 }), condition('playerState', 'has', { playerState: 'Gagged' })],
      lines: [
        { kind: 'quote', text: l('"(I know I should not...♡)"', '「(ダメなのに……♡)」') },
        { kind: 'quote', text: l('"(Ah... please...♡)"', '「(あぁ……お願い……♡)」') },
        { kind: 'quote', text: l('"(I cannot hold back!!♡)"', '「(我慢できないっ！！♡)」') },
      ],
    },
    {
      conditions: [condition('flavorValue', 'eq', { valueKey: 'sigilAroused', value: true }), condition('flavorValue', 'eq', { valueKey: 'touchCount', value: 3 })],
      lines: [
        { kind: 'quote', text: l('"I know I should not...♡"', '「ダメなのに……♡」') },
        { kind: 'quote', text: l('"Ah... please...♡"', '「あぁ……お願い……♡」') },
        { kind: 'quote', text: l('"I cannot hold back!!♡"', '「我慢できないっ！！♡」') },
      ],
    },
    {
      conditions: [condition('flavorValue', 'eq', { valueKey: 'sigilAroused', value: true }), condition('flavorValue', 'gte', { valueKey: 'touchCount', value: 4 })],
      lines: [
        { kind: 'quote', text: l('"I cannot take it anymore♡ I cannot hold back♡♡"', '「もうだめ♡我慢無理♡♡」') },
        { kind: 'quote', text: l('"Nnngh♡♡♡♡"', '「～～っ♡♡♡♡」') },
        { kind: 'quote', text: l('"...Hahh♡♡ ...hahh♡♡"', '「…はあっ♡♡ ……っはあっ♡♡」') },
      ],
    },
  ],
  [FLAVOR_EVENTS.Battle.PortraitBodyTouch]: [
    {
      conditions: [condition('flavorValue', 'eq', { valueKey: 'touchCount', value: 1 }), condition('playerState', 'has', { playerState: 'Gagged' })],
      lines: [
        { kind: 'quote', text: l('"Mm...?"', '「ん……？」') },
        { kind: 'quote', text: l('"(...? It feels like someone is touching me.)"', '「(……？ 触られてるような？)」') },
        { kind: 'quote', text: l('"Mmmph!"', '「んむぅ！」') },
      ],
    },
    {
      conditions: [condition('flavorValue', 'eq', { valueKey: 'touchCount', value: 1 })],
      lines: [
        { kind: 'quote', text: l('"Mm...?"', '「ん……？」') },
        { kind: 'quote', text: l('"(...? It feels like someone is touching me.)"', '「(……？ 触られてるような？)」') },
        { kind: 'quote', text: l('"Huh... something feels strange..."', '「あれ……なんか変…」') },
      ],
    },
    {
      conditions: [condition('flavorValue', 'eq', { valueKey: 'touchCount', value: 2 }), condition('flavorValue', 'eq', { valueKey: 'touchPartIsM', value: false }), condition('playerState', 'has', { playerState: 'Gagged' })],
      lines: [
        { kind: 'quote', text: l('"Mmph... mmmph!!"', '「んぶっ…んむぅう！！」') },
        { kind: 'quote', text: l('"Nnngh... phew... what are you doing!"', '「～～っ……ぷはっ…なにひへるのっ！」') },
      ],
    },
    {
      conditions: [condition('flavorValue', 'eq', { valueKey: 'touchCount', value: 2 }), condition('flavorValue', 'eq', { valueKey: 'touchPartIsM', value: false }), condition('playerState', 'has', { playerState: 'Breathless' })],
      lines: [
        { kind: 'quote', text: l('"Hah... hah... hah!!"', '「はぁ…はぁ…はぁっ！！」') },
        { kind: 'quote', text: l('"No... my body is acting strange!"', '「いやっ……身体っ…おかしくなってる！」') },
        { kind: 'quote', text: l('"I hate this already..."', '「もうっ…嫌なのに……」') },
      ],
    },
    {
      conditions: [condition('flavorValue', 'eq', { valueKey: 'touchCount', value: 2 }), condition('flavorValue', 'eq', { valueKey: 'touchPartIsM', value: false })],
      lines: [
        { kind: 'quote', text: l('"Ngh...!!"', '「んっ…！！」') },
        { kind: 'quote', text: l('"(...!? Someone is definitely touching me!)"', '「(……！？ 絶対触られてるっ！)」') },
        { kind: 'quote', text: l('"No... my body is moving on its own!"', '「いやっ……身体が勝手に！」') },
        { kind: 'quote', text: l('"It might feel good..."', '「きもちいいかも……」') },
      ],
    },
    {
      conditions: [condition('flavorValue', 'eq', { valueKey: 'touchCount', value: 2 }), condition('flavorValue', 'eq', { valueKey: 'touchPartIsM', value: true }), condition('playerState', 'has', { playerState: 'Gagged' })],
      lines: [
        { kind: 'quote', text: l('"Mmmwah♡... slurp♡"', '「んぢゅっ♡…じゅる♡」') },
        { kind: 'quote', text: l('"(The back of my throat is... tingling...♡)"', '「(喉の奥が…痺れて……♡)」') },
      ],
    },
    {
      conditions: [condition('flavorValue', 'eq', { valueKey: 'touchCount', value: 2 }), condition('flavorValue', 'eq', { valueKey: 'touchPartIsM', value: true })],
      lines: [
        { kind: 'quote', text: l('"Mmmwah...♡"', '「んちゅ…っ♡」') },
        { kind: 'quote', text: l('"(My tongue is... tingling...♡)"', '「(舌が…痺れて……♡)」') },
      ],
    },
  ],
  [FLAVOR_EVENTS.Battle.PortraitHeadTouch]: [
    {
      conditions: [condition('flavorValue', 'eq', { valueKey: 'tutorialBeforeTurn3', value: true })],
      lines: [
        { kind: 'quote', text: l('"......"', '「……」') },
        { kind: 'quote', text: l('"...?"', '「……？」') },
      ],
    },
    {
      conditions: [condition('flavorValue', 'eq', { valueKey: 'touchCount', value: 1 })],
      lines: [
        { kind: 'quote', text: l('"...?"', '「……？」') },
        { kind: 'quote', text: l('"Hm?"', '「ん？」') },
      ],
    },
    {
      conditions: [condition('flavorValue', 'gte', { valueKey: 'touchCount', value: 2 }), condition('playerState', 'has', { playerState: 'Gagged' })],
      lines: [
        { kind: 'quote', text: l('"Mmmm~"', '「んん～」') },
        { kind: 'quote', text: l('"Mngh."', '「んぐっ」') },
      ],
    },
    {
      conditions: [condition('flavorValue', 'gte', { valueKey: 'touchCount', value: 2 }), condition('playerState', 'has', { playerState: 'Breathless' })],
      lines: [
        { kind: 'quote', text: l('"Hah♡ hah♡"', '「はっ♡ はっ♡」') },
        { kind: 'quote', text: l('"Hah... hah... hah..."', '「はぁ…はぁ…はぁっ」') },
      ],
    },
    {
      conditions: [condition('flavorValue', 'gte', { valueKey: 'touchCount', value: 2 }), condition('playerState', 'has', { playerState: 'Aroused' })],
      lines: [
        { kind: 'quote', text: l('"Mmm♡"', '「んん♡」') },
        { kind: 'quote', text: l('"Are you... petting me?♡"', '「撫でられてるの……？♡」') },
      ],
    },
    {
      conditions: [condition('flavorValue', 'gte', { valueKey: 'touchCount', value: 2 })],
      lines: [
        { kind: 'quote', text: l('"......"', '「……。」') },
        { kind: 'quote', text: l('"Hehe..."', '「えへへ…」') },
        { kind: 'quote', text: l('"Mm."', '「んっ」') },
        { kind: 'quote', text: l('"Come on..."', '「も～…」') },
        { kind: 'quote', text: l('"Mmm."', '「んー」') },
      ],
    },
  ],
  [FLAVOR_EVENTS.Battle.PlayerEpDamageUnfelt]: [
    {
      conditions: [condition('flavorValue', 'gte', { valueKey: 'partCount', value: 2 })],
      lines: [{ kind: 'narration', text: l("{player}'s body does not seem to feel it yet.", '{player}の身体はまだ感じないようだ') }],
    },
    {
      lines: [{ kind: 'narration', text: l("{player}'s {defaultPart} does not seem to feel it yet.", '{player}の{defaultPart}はまだ感じないようだ') }],
    },
  ],
  [FLAVOR_EVENTS.Battle.Won]: [
    { kind: 'system', text: l('Battle won', '戦闘に勝利') },
  ],
  [FLAVOR_EVENTS.Battle.PlayerTurnStart]: [
    { kind: 'system', text: l('==== Your turn ====', '==== あなたのターン ====') },
  ],
  [FLAVOR_EVENTS.Battle.EnemyTurnStart]: [
    { kind: 'system', text: l('==== Enemy turn ====', '==== 敵のターン ====') },
  ],
  [FLAVOR_EVENTS.Battle.ContinuousOrgasms]: [
    { kind: 'narration', text: l(
      'Drowned in the waves of continuous orgasms, unable to return.',
      '絶え間なく押し寄せる絶頂の波にのまれ戻ってこられない',
    ) },
  ],
  [FLAVOR_EVENTS.Battle.PlayerOrgasmAfterglow]: [
    { kind: 'system', text: l(
      'The afterglow of the previous orgasm leaves her unable to hold back.',
      '前回の絶頂の余韻で、イくのを我慢できない。',
    ) },
  ],
  [FLAVOR_EVENTS.Battle.PlayerOrgasmFirstQuote]: [
    { kind: 'quote', text: l('"Nngh... I\'m going to cum...!"', '「……んっ……イく……っ！」') },
    { kind: 'quote', text: l('"I\'m going to cum... I\'m cumming!"', '「イっちゃう………………イくっ！」') },
    { kind: 'quote', text: l('"No...! I\'m going to cum♡"', '「だめ…………っ！……イく♡」') },
    { kind: 'quote', text: l('"I\'m cumming! I\'m going to cum!"', '「イきます！……イっく！」') },
    { kind: 'quote', text: l('"I\'m about to cum... I\'m cumming!"', '「イきそう……イく！」') },
    { kind: 'quote', text: l('"Wait♡ just a second♡ I\'m going to cum!"', '「ちょっと♡ 待って♡ イくっ！」') },
    { kind: 'quote', text: l('"This is bad... I\'m cumming... nnngh♡!"', '「ヤバっ……イくっ……んんっ♡！」') },
    { kind: 'quote', text: l('"I\'m cumming! ...hah...♡ hah...♡!"', '「イくっ！……っ……はぁ……♡ はぁ……♡！」') },
    { kind: 'quote', text: l('"Nngh, aaahhh♡"', '「んっ、～ぁ～～～っ♡」') },
    { kind: 'quote', text: l('"Ah... ah! Ah, aah, nnhaaah♡♡"', '「あ…っ……あっ！あっ、ぁ、んあぁ～～♡♡」') },
  ],
  [FLAVOR_EVENTS.Battle.PlayerOrgasmFirst]: [
    { kind: 'system', text: l('{player} cummed', '{player}はイってしまった') },
  ],
  [FLAVOR_EVENTS.Battle.PlayerOrgasmRepeatQuote]: [
    {
      conditions: [condition('flavorValue', 'eq', { valueKey: 'flashCount', value: 4 })],
      lines: [
        { kind: 'quote', text: l('"Again?...Ngh♡! I just cummed...!"', '「ぁ、また…？……っぐ♡！ さっきイったばかりなのに……！」') },
        { kind: 'quote', text: l('"Ngh... it is coming again♡♡!"', '「んっ……また、キちゃう～～♡♡！」') },
        { kind: 'quote', text: l('"Wait...♡ I have not recovered yet...!"', '「待って……♡ まだ戻れてないのに……！」') },
        { kind: 'quote', text: l('"No...♡♡ another orgasm already...! ...Ngh!♡"', '「だめ……♡♡ もう次が……！ ……ぃぐぅ！♡」') },
        { kind: 'quote', text: l('"Hah...♡ hah...♡♡♡ (I can\'t slow it down...!)"', '「はっ……♡ はっ……♡♡♡ (イくのを止める暇がない……！)」') },
        { kind: 'quote', text: l('"It keeps♡ rising...♡ again and again...!"', '「また♡ 上がってくる……♡ 何度も……！」') },
        { kind: 'quote', text: l('"Nn...♡♡ I\'m going to cum again...!"', '「んん……♡♡ またイくっ……！」') },
        { kind: 'quote', text: l('"My body has... not calmed down yet...!"', '「から、だが……まだ落ち着いてないのに……！」') },
      ],
    },
    {
      conditions: [condition('flavorValue', 'eq', { valueKey: 'flashCount', value: 3 })],
      lines: [
        { kind: 'quote', text: l('"Again...♡ again...♡♡! I can\'t stop it...!"', '「また……♡ また……♡♡！ 止められない……！」') },
        { kind: 'quote', text: l('"Ngh... my head is going blank...!"', '「んっ……頭がぼうっとする……！」') },
        { kind: 'quote', text: l('"No♡, no...!!♡♡ I am losing control...!"', '「だめ♡、だめ～～！！♡♡ ……理性が……！」') },
        { kind: 'quote', text: l('"I just cummed... why again...♡!"', '「今イったのに……なんでまた……♡！」') },
        { kind: 'quote', text: l('"Hah...Ngh♡♡♡ it will not give me a break...!"', '「はぁっ……っぐ♡♡♡ 休ませてくれない……！」') },
        { kind: 'quote', text: l('"Nnhaa...♡♡ the next wave is already here...♡!"', '「んんぁ……♡♡ もう次のすごいのが……♡！」') },
        { kind: 'quote', text: l('"♡♡!! (I can\'t tell where one orgasm ends anymore...!)"', '「♡♡っ！！(どこでイき終わったのか分からない……！)」') },
        { kind: 'quote', text: l('"Ah...♡ I\'m cumming again...♡ again...♡♡!"', '「あっ……♡ またイく……♡ っまた……♡♡！」') },
      ],
    },
    {
      conditions: [condition('flavorValue', 'eq', { valueKey: 'flashCount', value: 2 })],
      lines: [
        { kind: 'quote', text: l('"Aah...♡ no...♡♡ it will not stop...♡♡♡!"', '「あぁ……♡ だめ……♡♡ 止まらない……♡♡♡！」') },
        { kind: 'quote', text: l('"N♡ghaa♡♡... another one is breaking through...!"', '「ん♡がぁ♡♡……また飛んじゃう……！」') },
        { kind: 'quote', text: l('"I can\'t think... only orgasm...♡!"', '「ぁ…ぁ……イってるっ……なにも考えられない……♡！」') },
        { kind: 'quote', text: l('"Hahh...♡ I am falling apart again...♡♡!"', '「はぁっ……♡ また……堕ちる……♡♡！」') },
        { kind: 'quote', text: l('"No break... no breath... another orgasm...!"', '「またなのっ……息も……またイく……！」') },
        { kind: 'quote', text: l('"Ahh... my body is moving on its own...♡♡♡♡!"', '「あぁっ……体が勝手に……♡♡♡♡！」') },
        { kind: 'quote', text: l('"Nnngh...♡♡ I can\'t come back...!"', '「んんっ……♡♡ 戻ってこられない……！」') },
        { kind: 'quote', text: l('"Again♡, again♡, again...♡♡ I\'m cumming...!"', '「また♡、また♡、っまた……♡♡ イぐ……！」') },
      ],
    },
    {
      conditions: [condition('flavorValue', 'eq', { valueKey: 'flashCount', value: 1 })],
      lines: [
        { kind: 'quote', text: l('"Aaah♡♡... again... no, AaaAAAh♡♡...  again...♡!"', '「あぁ゛♡♡……また……だめ、あ゛ぁぁ゛♡♡……また……♡！」') },
        { kind: 'quote', text: l('"Ng♡haa♡... I can\'t stop cumming...♡!"', '「んが♡ぁ゛♡……イくのが止まらない……♡！」') },
        { kind: 'quote', text: l('"Haaah... It\'s hard... I do not know what I am anymore...♡!"', '「はぁ゛……くるしいっ♡ ……もう…おかしく……♡！」') },
        { kind: 'quote', text: l('"Again♡, again♡, again...♡♡ I\'m cumming...!"', '「また♡、また♡、っまた……♡♡ イぐ……！」') },
        { kind: 'quote', text: l('"Aah... aah... I am breaking...♡!"', '「あ゛……あぁ～～……壊れる……♡！」') },
        { kind: 'quote', text: l('"Nnngh... Ooogh... (my voice will not come out right...♡!)"', '「ん゛んっ……お゛ぉ゛っ！(こんな声、あたしのじゃないっ……♡！)」') },
        { kind: 'quote', text: l('"orgasm...♡ orgasm...♡♡ I can\'t come back...♡!"', '「イぐ♡……イぐ♡♡……戻れない……♡！」') },
        { kind: 'quote', text: l('"Aaah... no pause... no end...♡♡♡!"', '「あぁ゛……ずっとイっでるぅ……♡♡♡！」') },
        { kind: 'quote', text: l('"...♡! I\'m going to cum again...! ...♡♡♡!!"', '「……っ♡！ またイく……♡ ……っ♡♡♡！！」') },
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
        { kind: 'quote', text: l('"No more...♡♡ I can\'t...♡♡ ...♡!"', '「もぅ無理……♡♡ 無理ぃい……♡♡ ……っ♡！」') },
        { kind: 'quote', text: l('"Help...♡♡ I can\'t...♡♡"', '「助げでっ♡！ もう無理ぃ……♡♡」') },
        { kind: 'quote', text: l('"Aahh♡♡ ah, ahh♡♡"', '「あ゛ぁ♡♡ あ、ぁあ♡♡」') },
        { kind: 'quote', text: l('"Nnngh♡♡♡ ...ngh♡!"', '「ん゛ん゛♡♡♡ ……っ♡！」') },
        { kind: 'quote', text: l('"orgasm...♡ orgasm...♡♡ again...♡"', '「イっだ……♡ もぅイっだのに……♡♡ また……♡」') },
        { kind: 'quote', text: l('"Hahh♡♡ no... no...♡♡"', '「はぁ゛♡♡ だめ……だめぇ……♡♡」') },
        { kind: 'quote', text: l('"Aaaah♡♡♡ I can\'t come back♡"', '「あぁ゛ぁ♡♡♡ 戻れな゛い♡」') },
      ],
    },
  ],
  [FLAVOR_EVENTS.Battle.PlayerOrgasmRepeat]: [
    {
      conditions: [condition('flavorValue', 'eq', { valueKey: 'flashCount', value: 4 })],
      lines: [{ kind: 'system', text: l('{player} cummed again and again.', '{player}は連続でイってしまった') }],
    },
    {
      conditions: [condition('flavorValue', 'eq', { valueKey: 'flashCount', value: 3 })],
      lines: [{ kind: 'system', text: l('{player} cannot resist the repeating orgasms.', '{player}は繰り返す絶頂に抵抗できない') }],
    },
    {
      conditions: [condition('flavorValue', 'eq', { valueKey: 'flashCount', value: 2 })],
      lines: [{ kind: 'system', text: l('{player}\'s orgasms will not stop.', '{player}の絶頂は止まらない') }],
    },
    {
      conditions: [condition('flavorValue', 'eq', { valueKey: 'flashCount', value: 1 })],
      lines: [{ kind: 'system', text: l('{player} keeps cumming again and again without pause.', '{player}は間隔を置かず何度もイき続けている') }],
    },
  ],
  [FLAVOR_EVENTS.Battle.EnemyOrgasm]: [
    { kind: 'system', text: l('Made {enemy} orgasm', '{enemy}をイかせた') },
  ],
  [FLAVOR_EVENTS.Battle.PlayerEpDamageQuote]: [
    {
      conditions: [condition('status', 'has', { target: 'player', status: 'ExtremeFatigue' })],
      lines: [
        { kind: 'quote', text: l('"......"', '「……」') },
        { kind: 'quote', text: l('"...mm..."', '「……ん…」') },
        { kind: 'quote', text: l('"...no..."', '「……ぃ…ゃ……」') },
      ],
    },
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
        { kind: 'quote', text: l('"Nn... my body..."', '「んん……あたしのここ…」') },
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
        { kind: 'quote', text: l('"No... I almost..."', '「だめ……イきそう…」') },
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
        { kind: 'quote', text: l('"Nnhaa♡ (I can\'t keep steady...)"', '「んんぁ～♡ (もう…立ってられない…)」') },
      ],
    },
    {
      conditions: [condition('flavorValue', 'lte', { valueKey: 'epDamagePercentOfRange', value: 242 })],
      lines: [
        { kind: 'quote', text: l('"Aah♡ no, no more...!"', '「あぁっ♡だめ、これ以上は…！」') },
        { kind: 'quote', text: l('"Nghaa... it is too intense...!"', '「んがぁ……強すぎる…！」') },
        { kind: 'quote', text: l('"Hah♡ (my body is shaking...!)"', '「はぁっ♡ (体が震える…！)」') },
        { kind: 'quote', text: l('"Ahh... I can\'t hold back...!"', '「あぁ……我慢できない…！」') },
        { kind: 'quote', text: l('"Nnnh♡ I am breaking...!"', '「んんっ♡ 壊れそう…！」') },
      ],
    },
    {
      conditions: [condition('flavorValue', 'lte', { valueKey: 'epDamagePercentOfRange', value: 484 })],
      lines: [
        { kind: 'quote', text: l('"Aahh♡ it hurts... but I feel it...!"', '「あぁぁ♡ 苦しい……感じちゃう…！」') },
        { kind: 'quote', text: l('"Nghaa... no, I can\'t take this...!"', '「かはっ……だめ、耐えられない…！」') },
        { kind: 'quote', text: l('"Hahh♡ my mind is melting...!"', '「はぁぁ♡ 頭がバカになるぅ…！」') },
        { kind: 'quote', text: l('"Aah... stop... I will orgasm...!"', '「あぁ……止めて……こんなのすぐイっちゃう…！」') },
        { kind: 'quote', text: l('"Nnhaa♡ I can\'t breathe...♡"', '「んはぁ♡ 息がっ、できないっ♡」') },
      ],
    },
    {
      lines: [
        { kind: 'quote', text: l('"Aaaagh♡♡ no, I can\'t endure this...!"', '「あ゛ぁぁ♡♡ だめ、こんな゛の！耐えられな゛い…！」') },
        { kind: 'quote', text: l('"Nghaaah...♡ my body is going numb...!"', '「ん゛がらだ……♡ 体がっ♡ しびれてるっ…！」') },
        { kind: 'quote', text: l('"Haaah♡♡♡ I am falling apart♡...!"', '「はぁ゛ぁ♡♡♡ おかしくなる♡…！」') },
        { kind: 'quote', text: l('"Aah, aahh♡ no more, no more...!"', '「あ゛、あぁっ♡ もう、無理……！」') },
        { kind: 'quote', text: l('"Nnngh♡ I can\'t even think♡♡♡...!"', '「ん゛んっ♡何も考えられな゛い♡♡♡…！」') },
      ],
    },
  ],
  [FLAVOR_EVENTS.Battle.AftershocksAfterConsumption]: [
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
        { kind: 'narration', text: l('{player} cannot move under the aftershocks afterglow of orgasm.', '{player}は絶頂の余韻を押し殺すのに精一杯だ。') },
      ],
    },
  ],
  [FLAVOR_EVENTS.Battle.SensitivityLevelUp]: [
    {
      conditions: [condition('flavorValue', 'gte', { valueKey: 'sensitivityLevel', value: 5 })],
      lines: [
        { kind: 'important', text: l(
          '{player}\'s {part} has been developed completely and cannot endure even the slightest stimulation.',
          '{player}の{part}は、開発し尽されてわずかな刺激にも耐えられない。',
        ) },
      ],
    },
    {
      lines: [
        { kind: 'important', text: l(
          '{player}\'s {defaultPart} has become more sensitive.',
          '{player}の{defaultPart}は開発され、{sensitivityAdverb}敏感になってしまった。',
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
  [FLAVOR_EVENTS.Effect.SetEpRatio]: [
    { kind: 'system', text: l('{source}: set EP {amount}', '{source}：EPを{amount}に変更') },
  ],
  [FLAVOR_EVENTS.Effect.SetEpReserve]: [
    { kind: 'system', text: l('{source}: set EP reserve {amount}', '{source}：EPリセット下限を{amount}に変更') },
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
      conditions: [
        condition('flavorValue', 'eq', { valueKey: 'statusIsImportant', value: true }),
        condition('flavorValue', 'eq', { valueKey: 'sourceIsStatus', value: true }),
      ],
      suppressKinds: ['status'],
      lines: [{ kind: 'important', text: l('{source}: removed', '{source}：解除') }],
    },
    {
      conditions: [condition('flavorValue', 'eq', { valueKey: 'statusIsImportant', value: true })],
      suppressKinds: ['status'],
      lines: [{ kind: 'important', text: l('{source}: removed {status}', '{source}：{status}を解除') }],
    },
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
    { kind: 'system', text: l('I can think only of orgasm now', '今は絶頂の事しか考えられない') },
  ],
  [FLAVOR_EVENTS.Card.RejectCondition]: [
    { kind: 'system', text: l('Cannot play now', '今は使用できない') },
  ],
};

export function globalFlavorEntries(event: BattleFlavorEvent): BattleFlavorEntry[] {
  return GLOBAL_FLAVORS[event] ?? [];
}
