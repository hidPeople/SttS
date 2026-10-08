import { FLAVOR_EVENTS, type CardDefinition } from '../models/types';
import { text as l } from '../models/localization';
import { condition, defineCard, defineCardRegistry, effect } from './effectBuilders';

export const CARD_DEFINITIONS: Record<string, CardDefinition> = defineCardRegistry({
// ===================================================================
  strike: defineCard({
    name: l('Strike', 'ストライク'),
// ===================================================================
    rarity: 'starter',
    categories: ['attack'],
    cost: 1,
    effects: [effect('hpDamage', 'selectedEnemy', 6, { attackAttribute: 'strike' })],
    flavors: {
      [FLAVOR_EVENTS.Card.Play]: [
        {
          conditions: [
            condition('playerState', 'has', { playerState: 'Gagged' }),
            condition('status', 'has', { target: 'selectedEnemy', statuses: ['IntrudedA', 'IntrudedV', 'IntrudedM'] }),
          ],
          lines: [
            { kind: 'quote', text: l('"(C-can’t breathe...!)"', '「（く、苦しい……っ！）」') },
            { kind: 'narration', text: l('Struggling for breath, she claws at the foe clinging to her.', '呼吸を求め、身体に取りつく相手をかきむしるように打つ。') },
          ],
        },
        {
          conditions: [
            condition('playerState', 'has', { playerState: 'Gagged' }),
            condition('status', 'has', { target: 'selectedEnemy', statuses: ['InsertA', 'InsertV', 'InsertM'] }),
          ],
          lines: [
            { kind: 'quote', text: l('"...Kh—cough!"', '「……っ、げほっ！」') },
            { kind: 'narration', text: l('Short of breath, she rakes her hand across the foe pressed close against her.', '息が詰まり、密着した相手へ引っかくように拳を振るう。') },
          ],
        },
        {
          conditions: [condition('playerState', 'has', { playerState: 'Gagged' })],
          lines: [
            { kind: 'quote', text: l('"...Cough...!"', '「……げほっ……！」') },
            { kind: 'narration', text: l('Struggling for breath, she lashes out at her target with a desperate swipe.', '呼吸を求め、狙った相手へ必死に拳を振り、引っかくような一撃を放つ。') },
          ],
        },
        {
          conditions: [condition('status', 'has', { target: 'selectedEnemy', statuses: ['IntrudedA', 'IntrudedV', 'IntrudedM'] })],
          lines: [
            { kind: 'quote', text: l('"Move!"', '「はなれてっ！」') },
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
            { kind: 'quote', text: l('"Here—pow!"', '「ほら、どう！？」') },
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
          conditions: [condition('status', 'has', { target: 'player', status: 'Horny' })],
          lines: [
            { kind: 'quote', text: l('"Ugh! I need to focus!"', '「もう！集中しなきゃ！」') },
          ],
        },
        {
          conditions: [condition('playerState', 'has', { playerState: 'Aroused' })],
          lines: [
            { kind: 'quote', text: l('"Nn... moving makes my clothes rub...!"', '「んっ……動くと服がこすれてっ……！」') },
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
  }),
// ===================================================================
  crescentSlash: defineCard({
    name: l('Crescent Slash', '三日月斬り'),
// ===================================================================
    rarity: 'starter',
    categories: ['attack', 'noMotion'],
    cost: 2,
    description: l('Slashes with its tail, dealing {selectedEnemy.hpDamage.amount} HP damage.', '尻尾で斬りつけ、HPに{selectedEnemy.hpDamage.amount}ダメージ。'),
    effects: [effect('hpDamage', 'selectedEnemy', 15, { attackAttribute: 'slash' })],
    flavors: {
      [FLAVOR_EVENTS.Card.Play]: [
        {
          conditions: [condition('playerState', 'has', { playerState: 'Gagged' })],
          lines: [
            { kind: 'quote', text: l('"Nn—gh...!"', '「んぐっ……っ！」') },
          ],
        },
        {
          conditions: [condition('playerState', 'has', { playerState: 'Breathless' })],
          lines: [
            { kind: 'quote', text: l('"Hah... take that...!"', '「はあっ……くらえっ……！」') },
          ],
        },
        {
          conditions: [condition('status', 'has', { target: 'player', status: 'Bound' })],
          lines: [
            { kind: 'quote', text: l('"I\'ve still got my tail!"', '「まだ尻尾があるもん！」') },
          ],
        },
        {
          conditions: [condition('status', 'has', { target: 'selectedEnemy', statuses: ['IntrudedA', 'IntrudedV', 'IntrudedM'] })],
          lines: [
            { kind: 'quote', text: l('"It\'s getting in. I\'ll deal with it!"', '「入ってきてるの、何とかするっ！」') },
          ],
        },
        {
          conditions: [condition('status', 'has', { target: 'player', status: 'Horny' })],
          lines: [
            { kind: 'quote', text: l('"Ugh! I need to focus!"', '「もう！集中しなきゃ！」') },
          ],
        },
        {
          conditions: [condition('playerState', 'has', { playerState: 'Aroused' })],
          lines: [
            { kind: 'quote', text: l('"Nn... just swinging my tail feels too good..."', '「んっ……尻尾、振るだけで気持ちいいかも……」') },
          ],
        },
        {
          conditions: [condition('status', 'has', { target: 'selectedEnemy', statuses: ['InsertA', 'InsertV', 'InsertM'] })],
          lines: [
            { kind: 'quote', text: l('"You\'re really into it!"', '「夢中になってるじゃん！」') },
          ],
        },
        {
          conditions: [
            condition('status', 'has', { target: 'player', status: 'Bound' }),
            condition('status', 'has', { target: 'selectedEnemy', statuses: ['IntrudedA', 'IntrudedV', 'IntrudedM'] }),
          ],
          lines: [
            { kind: 'narration', text: l('Still bound, the sharp tip of the tail cuts a short arc at the foe pushing in.', '拘束されたまま、鋭い尾の先が入り込んでくる相手へ短い弧を描く。') },
          ],
        },
        {
          conditions: [
            condition('status', 'has', { target: 'player', status: 'Bound' }),
            condition('status', 'has', { target: 'selectedEnemy', statuses: ['InsertA', 'InsertV', 'InsertM'] }),
          ],
          lines: [
            { kind: 'narration', text: l('Still bound, the sharp tip of the tail cuts a short arc at the foe pressed close.', '拘束されたまま、鋭い尾の先が密着した相手へ短い弧を描く。') },
          ],
        },
        {
          conditions: [condition('status', 'has', { target: 'player', status: 'Bound' })],
          lines: [
            { kind: 'narration', text: l('Still bound, the sharp tip of the tail cuts a short arc.', '拘束されたまま、鋭い尾の先が短い弧を描く。') },
          ],
        },
        {
          conditions: [condition('status', 'has', { target: 'selectedEnemy', statuses: ['IntrudedA', 'IntrudedV', 'IntrudedM'] })],
          lines: [
            { kind: 'narration', text: l('The sharp tip of the tail cuts an arc at the foe pushing in.', '鋭い尾の先が、入り込んでくる相手へ弧を描く。') },
          ],
        },
        {
          conditions: [condition('status', 'has', { target: 'selectedEnemy', statuses: ['InsertA', 'InsertV', 'InsertM'] })],
          lines: [
            { kind: 'narration', text: l('The sharp tip of the tail cuts an arc at the foe pressed close.', '鋭い尾の先が、密着した相手へ弧を描く。') },
          ],
        },
        {
          lines: [
            { kind: 'quote', text: l('"Take thaaaat!"', '「くらえー！」') },
            { kind: 'narration', text: l('The sharp tip of the tail cuts a heavy arc.', '鋭い尾の先が大きな弧を描く。') },
          ],
        },
      ],
    },
  }),
// ===================================================================
  defend: defineCard({
    name: l('Defense Magic', '防御魔法'),
// ===================================================================
    rarity: 'starter',
    categories: ['utility', 'noMotion'],
    cost: 1,
    effects: [effect('block', 'player', 5)],
    flavors: {
      [FLAVOR_EVENTS.Card.Play]: [
        {
          conditions: [condition('relic', 'has', { relicId: 'livingClothes' })],
          lines: [
            { kind: 'quote', text: l('"Hm...? Something feels strange about these clothes..."', '「…ん…？なんかこの服、変かも……」') },
          ],
        },
        { kind: 'narration', text: l('She steadies herself behind a guard.', '身構え、次の衝撃に備える。') },
      ],
    },
  }),
// ===================================================================
  seduction: defineCard({
    name: l('Seduction', '誘惑'),
// ===================================================================
    rarity: 'starter',
    categories: ['caress', 'lust', 'noMotion'],
    cost: 0,
    effects: [effect('status', 'selectedEnemy', 1, { status: 'Charm', stacks: 1, attackAttribute: 'love' })],
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
  }),
// ===================================================================
  handjob: defineCard({
    name: l('Handjob', '手コキ'),
// ===================================================================
    rarity: 'starter',
    categories: ['caress'],
    cost: 1,
    effects: [effect('epDamage', 'selectedEnemy', 3, { attackAttribute: 'love' })],
    flavors: {
      [FLAVOR_EVENTS.Card.Resolved]: [
        {
          conditions: [condition('playerState', 'has', { playerState: 'Breathless' })],
          lines: [
            { kind: 'quote', text: l('"I can\'t anymore... my hand won\'t even move... I\'m really done..."', '「もう無理ぃ……手も動かない……ほんとに終わりっ……」') },
          ],
        },
      ],
      [FLAVOR_EVENTS.Battle.EnemyOrgasm]: [
        {
          lines: [
            { kind: 'quote', text: l('"Whoa...! Hey, that was sudden...!"', '「わっ……！ちょっと、急すぎだって～！」') },
            { kind: 'quote', text: l('"Phew... finally. Satisfied?"', '「はぁ……イったね。満足した？」') },
            { kind: 'narration', text: l('{player} pulls her hand away with a satisfied smile.', '{player}は満足そうに手を離した。') },
          ],
        },
      ],
      [FLAVOR_EVENTS.Card.Play]: [
        {
          conditions: [condition('enemyTrait', 'has', { target: 'selectedEnemy', enemyTrait: 'sexToy' })],
          lines: [
            { kind: 'quote', text: l('"Hey... this isn\'t doing anything to you! I\'m the only one getting tired here!"', '「ちょっとぉ……全然効いてないじゃん！あたしだけ疲れてるんだけど！」') },
            { kind: 'narration', text: l('{player} pouts in frustration as she keeps her hand moving.', '{player}は手を動かしながら不満そうに頬を膨らませている。') },
          ],
        },
        {
          conditions: [condition('enemyTrait', 'has', { target: 'selectedEnemy', enemyTrait: 'softBody' })],
          lines: [
            { kind: 'quote', text: l('"Eugh... what is this texture...? It\'s all slimy..."', '「うぇぇ……なにこの感触……ぬるぬるするぅ……」') },
            { kind: 'quote', text: l('"I can\'t even tell what shape it is... Where am I supposed to touch this thing...?"', '「形もよく分かんないのに……どこ触ればいいのよ、これ……」') },
            { kind: 'quote', text: l('"Ugh... it keeps clinging to my fingers... gross..."', '「うぅ……指にまとわりついてくる……気持ち悪いよぉ……」') },
            { kind: 'narration', text: l('{player} touches the slime with an openly disgusted expression.', '{player}は露骨に嫌そうな顔でスライムに触れている。') },
            { kind: 'narration', text: l('{player} grimaces at the slime clinging to her hand.', '{player}は眉をひそめながら手についた粘液を気にしている。') },
          ],
        },
        {
          conditions: [condition('playerState', 'has', { playerState: 'Breathless' })],
          lines: [
            { kind: 'quote', text: l('"Hah... not yet... you\'re not cum yet... I can keep going a little longer..."', '「はぁっ……まだ……そっちが終わってないもん……もう少し、頑張る……」') },
            { kind: 'quote', text: l('"I\'ve already cum it so many times... how are you still this energetic...?"', '「もう何回もイってるのに……なんでそっちはそんなに元気なのよぉ……」') },
          ],
        },
        {
          conditions: [condition('flavorValue', 'eq', { valueKey: 'enemyWillOrgasm', value: true })],
          lines: [
            { kind: 'quote', text: l('"Almost there... right? Then I\'ll keep going...!"', '「もう少し……だよね？じゃあ、このまま……！」') },
            { kind: 'quote', text: l('"Hehe... look at that face. You\'re losing your composure, aren\'t you?"', '「ふふっ……その顔。もう余裕ないんでしょ？」') },
            { kind: 'narration', text: l('{player} breathes faster, her hand moving with renewed urgency.', '{player}は息を弾ませ、懸命に手を動かしている。') },
            { kind: 'narration', text: l('{player} quickens her movements, looking increasingly impatient.', '{player}は待ちきれない様子で動きを速めている。') },
          ],
        },
        {
          conditions: [condition('enemyOrgasmAftershocks', 'eq', { target: 'selectedEnemy', value: true })],
          lines: [
            { kind: 'quote', text: l('"What, done already? ...You can still keep going, right?"', '「えっ、もう終わり？……まだいけるでしょ？」') },
            { kind: 'quote', text: l('"Hehe, it\'s too early for a break. One more time, okay?"', '「ふふっ、休憩にはまだ早いよ。もう一回、ね？」') },
            { kind: 'quote', text: l('"You thought that was the end? Too bad~♡"', '「さっきので終わりだと思った？残念でした～♡」') },
          ],
        },
        {
          conditions: [condition('status', 'has', { target: 'player', statuses: ['Horny', 'InHeat', 'Frustrated'] })],
          lines: [
            { kind: 'quote', text: l('"Hurry... please... let me see that face again...♡"', '「ぁっ……なんで……あたしがこんなに必死になってるの……っ」') },
            { kind: 'quote', text: l('"More... feel more...! Please, it\'s not enough...!"', '「もっと……もっと感じてよ……！お願い、足りないの……！」') },
            { kind: 'narration', text: l('{player} stares at {enemy} with feverish eyes.', '{player}は熱に浮かされた目で{enemy}を見つめている。') },
          ],
        },
        { kind: 'quote', text: l('"Then... I\'ll take care of it with my hand."', '「じゃあ……あたしの手で、してあげる」') },
        { kind: 'quote', text: l('"I\'ll make this quick... so hold still."', '「早く済ませるから……じっとしてて」') },
        { kind: 'quote', text: l('"Come on... make sure you enjoy it, okay?"', '「ほら……ちゃんと気持ちよくなってね？」') },
        { kind: 'narration', text: l('{player} reaches toward {enemy} and slowly begins to move her hand.', '{player}は{enemy}に手を伸ばし、ゆっくり動かし始めた。') },
        { kind: 'narration', text: l('{player} begins moving her hand with practiced ease.', '{player}は慣れた様子で手を動かし始めた。') },
        { kind: 'narration', text: l('{player} smiles playfully, moving her hand in a steady rhythm.', '{player}は楽しげに微笑みながら、一定のリズムで手を動かしている。') },
      ],
    },
  }),
// ===================================================================
  blowjob: defineCard({
    name: l('Blowjob', 'フェラチオ'),
// ===================================================================
    rarity: 'starter',
    categories: ['caress', 'lust'],
    cost: 2,
    effects: [
      effect('epDamage', 'selectedEnemy', 8, { attackAttribute: 'love' }),
      effect('epDamage', 'player', 0.5, { attackAttribute: 'love', epDamageParts: ['M'] }),
    ],
    flavors: {
      [FLAVOR_EVENTS.Card.Resolved]: [
        {
          conditions: [condition('playerState', 'has', { playerState: 'Breathless' })],
          lines: [
            { kind: 'quote', text: l('"Pwah... hah, hah... no more... I can\'t..."', '「ぷはっ……はぁ、はぁ……もうやだ……無理……」') },
          ],
        },
        {
          conditions: [condition('flavorValue', 'eq', { valueKey: 'playerCummed', value: true }), condition('flavorValue', 'eq', { valueKey: 'enemyCummed', value: false }), condition('enemyTrait', 'has', { target: 'selectedEnemy', enemyTrait: 'male' })],
          lines: [
            { kind: 'quote', text: l('"Pwah... hah... s-sorry... I was the one who cum it first..."', '「ぷはっ……はぁ……ご、ごめん……あたしのほうが先にイっちゃった……」') },
            { kind: 'quote', text: l('"...Ugh, this is embarrassing... To come just from my throat..."', '「……うぅ、恥ずかしい……喉だけでイっちゃうなんて」') },
          ],
        },
        {
          conditions: [condition('flavorValue', 'eq', { valueKey: 'playerCummed', value: true }), condition('flavorValue', 'eq', { valueKey: 'enemyCummed', value: true }), condition('enemyTrait', 'has', { target: 'selectedEnemy', enemyTrait: 'male' })],
          lines: [
            { kind: 'quote', text: l('"Hah... that ending was too sudden...! How was I supposed to hold back through that...♡"', '「はぁっ……最後、急すぎ……！あんなの我慢できるわけないじゃん……♡」') },
            { kind: 'quote', text: l('"...Ugh, this is embarrassing... To come just from my throat..."', '「……うぅ、恥ずかしい……喉だけでイっちゃうなんて」') },
          ],
        },
      ],
      [FLAVOR_EVENTS.Battle.EnemyOrgasm]: [
        {
          conditions: [condition('flavorValue', 'eq', { valueKey: 'playerWillOrgasm', value: true })],
          lines: [
            { kind: 'quote', text: l('"Pwah...! Hah, wait... I felt that too...♡"', '「ぷはっ……！はぁっ、待って……今の、いいかも……♡」') },
            { kind: 'quote', text: l('"Mmph...!? Mmm...! W-Wait, not now...♡"', '「んむっ……！？んんっ……！ちょ、今はだめぇ……♡」') },
            { kind: 'narration', text: l('{player} tenses up, hurriedly trying to catch her breath.', '{player}は慌てて息を整えながら身体を強張らせた。') },
          ],
        },
        {
          lines: [
            { kind: 'quote', text: l('"...Mm. ...Ugh, that\'s quite a taste..."', '「……んっ。……うぇぇ、すごい味……」') },
            { kind: 'quote', text: l('"Mm!?... gulp. ...Phew. Is it over...?"', '「んっ！？……ごくっ。……はぁ。イった……？」') },
            { kind: 'narration', text: l('{player} covers her mouth as she catches her breath.', '{player}は口元を押さえながら息を整えている。') },
          ],
        },
      ],
      [FLAVOR_EVENTS.Card.Play]: [
        {
          conditions: [condition('enemyTrait', 'has', { target: 'selectedEnemy', enemyTrait: 'sexToy' })],
          lines: [
            { kind: 'quote', text: l('"Mmph...! ...Pwah! Come on, give me something to work with!"', '「んむぅ……！……ぷはぁっ！もうっ、手応えなさすぎ！」') },
            { kind: 'quote', text: l('"Mmph... mmm...! ...Pwah! This isn\'t doing anything at all!"', '「んむ……んんっ……！……ぷはっ！全っ然効いてないじゃん！」') },
            { kind: 'narration', text: l('{player} protests with watery eyes.', '{player}は涙目になって抗議している。') },
          ],
        },
        {
          conditions: [condition('enemyTrait', 'has', { target: 'selectedEnemy', enemyTrait: 'softBody' })],
          lines: [
            { kind: 'quote', text: l('"Wait... I have to put my mouth on this thing!? N-No way..."', '「えっ……これに口つけるの！？や、やだよぉ……」') },
            { kind: 'quote', text: l('"Eugh... even for a succubus, this is seriously outside my comfort zone..."', '「うぇぇ……サキュバスでも、これはちょっと守備範囲外なんだけど……」') },
            { kind: 'narration', text: l('{player} visibly recoils at the sight of the slime.', '{player}はスライムを前に露骨に顔を引きつらせている。') },
          ],
        },
        {
          conditions: [condition('playerState', 'has', { playerState: 'Breathless' }), condition('flavorValue', 'gte', { valueKey: 'playerSelfEpDamage', value: 1 })],
          lines: [
            { kind: 'quote', text: l('"Mmph...! ...Hah, hah... I\'m not... giving up..."', '「んむぅ……！……はぁ、はぁ……負けない、から……」') },
          ],
        },
        {
          conditions: [condition('playerState', 'has', { playerState: 'Breathless' })],
          lines: [
            { kind: 'quote', text: l('"Mmph... mm...! ...Pwah, hah... I can still keep going..."', '「んむ……んっ……！……ぷはぁっ、はぁ……まだ、できる……」') },
          ],
        },
        {
          conditions: [
            condition('flavorValue', 'eq', { valueKey: 'enemyWillOrgasm', value: true }),
            condition('flavorValue', 'eq', { valueKey: 'playerWillOrgasm', value: true }),
          ],
          lines: [
            { kind: 'quote', text: l('"WMmph... mmm...! Pwah... h-hurry...♡"', '「んむっ……んん……！ぷはっ……は、早くぅ……♡」') },
            { kind: 'quote', text: l('"Mmph...! ...Pwah, come on... hurry already...♡"', '「んむぅ……！……ぷはっ、もう……早くしてよぉ……♡」') },
          ],
        },
        {
          conditions: [condition('flavorValue', 'eq', { valueKey: 'playerWillOrgasm', value: true }), condition('playerState', 'has', { playerState: 'Aroused' })],
          lines: [
            { kind: 'quote', text: l('"Mmph...♡ Mmm... I can\'t think anymore..."', '「んむっ……♡ んん……もう、何も考えられない……」') },
            { kind: 'narration', text: l('{player} has completely lost herself in the moment.', '{player}は我を忘れ、ただ夢中になっている。') },
          ],
        },
        {
          conditions: [condition('flavorValue', 'eq', { valueKey: 'playerWillOrgasm', value: true })],
          lines: [
            { kind: 'quote', text: l('"Mmph...! ...W-Wai\' a shecond... at this rate, I\'m going to cum first...!"', '「んぶっ……！……ちょ、ちょっほ待って……このままだとあたしが先……！」') },
            { kind: 'quote', text: l('"Mmph... mmm...! ...Phew, wait... something\'s happening to me...♡"', '「んむっ……んん……！……ぷはっ、まって……あたし、なんか……♡」') },
          ],
        },
        {
          conditions: [condition('flavorValue', 'eq', { valueKey: 'enemyWillOrgasm', value: true })],
          lines: [
            { kind: 'quote', text: l('"Mmph...! W-wai\' ...a shecond... hah...!"', '「んむ……！ちょ、ちょっほ……まっへ……はぁ……！」') },
            { kind: 'quote', text: l('"Mmph... mm...! ...Phew, hah... almost there...!"', '「んっ……んむぅ……！……ぷはっ、はぁっ……もう少し……！」') },
            { kind: 'narration', text: l('{player} is completely lost in the moment, her breathing ragged.', '{player}は息を乱しながら無我夢中になっている。') },
          ],
        },
        {
          conditions: [condition('enemyOrgasmAftershocks', 'eq', { target: 'selectedEnemy', value: true })],
          lines: [
            { kind: 'quote', text: l('"Phew... hah... did you think I\'d let you rest?"', '「ぷはっ……はぁ……休ませてあげると思った？」') },
            { kind: 'quote', text: l('"Mm... I think I\'ve got the hang of it now. I might do even better this time♡"', '「ん……さっきのでコツ分かっちゃった。次はもっと頑張れるかも♡」') },
            { kind: 'quote', text: l('"Hah... done already? ...Then let\'s go again♡ Aamm"', '「はぁ……もう終わり？……じゃあ、もう一回♡ ぁむっ」') },
          ],
        },
        {
          conditions: [condition('status', 'has', { target: 'player', status: 'DesperateToCum' })],
          lines: [
            { kind: 'quote', text: l('"Mmph...♡ I... can\'t think about anything anymore..."', '「んむぅ……♡ もう……頭、何も考えられない……」') },
            { kind: 'quote', text: l('"Mmph... mmm...♡ More... not yet...!"', '「んむっ……んんっ……♡ もっと……まだ……！」') },
            { kind: 'quote', text: l('"Hah... please... don\'t let me stop... keep going...♡"', '「はぁっ……お願い……休ませないで……このまま……♡」') },
            { kind: 'narration', text: l('{player} is utterly lost in what she\'s doing.', '{player}は我を忘れたように没頭している。') },
          ],
        },
        {
          conditions: [condition('status', 'has', { target: 'player', statuses: ['Horny', 'InHeat', 'Frustrated'] })],
          lines: [
            { kind: 'quote', text: l('"Mm... even though I\'m breathless... why do I still want more...?"', '「んっ……苦しいのに……なんで、もっと欲しくなるの……？」') },
            { kind: 'quote', text: l('"Mmph...! ...Phew, hah... more..."', '「んむ……！……ぷはっ、はぁ……もっと……」') },
            { kind: 'narration', text: l('{player} leans toward {enemy} again, barely pausing to catch her breath.', '{player}は息を整えるのも惜しむように{enemy}へ顔を寄せる。') },
          ],
        },
        { kind: 'quote', text: l('"...I have a feeling this is going to taste... interesting."', '「……なんか、すごい味しそう……」') },
        { kind: 'quote', text: l('"Mmph...! ...Phew. Harder than I thought..."', '「んむ……！……ぷはっ。思ったより大変……」') },
        { kind: 'narration', text: l('{player} takes a small breath before leaning toward {enemy}.', '{player}は小さく息を吸ってから、{enemy}へ顔を寄せた。') },
        { kind: 'narration', text: l('{player} lets out muffled sounds, already absorbed in what she\'s doing.', '{player}はくぐもった声を漏らしながら夢中になっている。') },
      ],
    },
  }),
// ===================================================================
  Titjob: defineCard({
    name: l('Titjob', 'パイズリ'),
// ===================================================================
    rarity: 'starter',
    categories: ['caress', 'lust'],
    cost: 2,
    effects: [
      effect('epDamage', 'selectedEnemy', 4, { attackAttribute: 'love' }),
      effect('epDamage', 'player', 0.5, { attackAttribute: 'love', epDamageParts: ['B'] }),
      effect('status', 'selectedEnemy', 2, { status: 'Charm', stacks: 2 }),
    ],
    flavors: {
      [FLAVOR_EVENTS.Card.Resolved]: [
        {
          conditions: [condition('playerState', 'has', { playerState: 'Breathless' })],
          lines: [
            { kind: 'quote', text: l('"No more... my arms, my whole body... I\'m done..."', '「もうやだぁ……腕も身体も限界……」') },
          ],
        },
        {
          conditions: [condition('flavorValue', 'eq', { valueKey: 'playerCummed', value: true }), condition('flavorValue', 'eq', { valueKey: 'enemyCummed', value: false }), condition('enemyTrait', 'has', { target: 'selectedEnemy', enemyTrait: 'male' })],
          lines: [
            { kind: 'quote', text: l('"Don\'t look! That was just... I got a little carried away, that\'s all!"', '「見ないでっ！今のは……その、ちょっと夢中になっただけだから！」') },
            { kind: 'quote', text: l('"...Sorry. You weren\'t finished yet, were you...?"', '「……ごめん。そっちはまだだったよね……？」') },
          ],
        },
        {
          conditions: [condition('flavorValue', 'eq', { valueKey: 'playerCummed', value: true }), condition('flavorValue', 'eq', { valueKey: 'enemyCummed', value: true }), condition('enemyTrait', 'has', { target: 'selectedEnemy', enemyTrait: 'male' })],
          lines: [
            { kind: 'quote', text: l('"Ah...♡ ...Hah, come on! Why did I end up cum with you...!?"', '「あっ……♡ ……はぁっ、もう！なんであたしまで一緒にイってるのよぉ……！」') },
            { kind: 'quote', text: l('"Hah... To cum just from my tits…  Don\'t you dare tease me, okay?"', '「はぁ……胸だけでイっちゃうなんて……絶対からかわないでよ？」') },
          ],
        },
      ],
      [FLAVOR_EVENTS.Battle.EnemyOrgasm]: [
        {
          conditions: [condition('flavorValue', 'eq', { valueKey: 'playerWillOrgasm', value: true })],
          lines: [
            { kind: 'quote', text: l('"Hah... that wasn\'t fair... it sent a shiver right through me...!"', '「はぁっ……今の、ずるい……こっちまで一気にゾクッて……！」') },
            { kind: 'quote', text: l('"Mm... don\'t cum so suddenly...! I\'m already at my limit too...♡"', '「んっ……急にイかないでよぉ……！あたしも限界なのに……♡」') },
            { kind: 'narration', text: l('{player} shudders as {enemy}\'s reaction catches her off guard.', '{player}は不意の反応につられ、身体を震わせた。') },
          ],
        },
        {
          lines: [
            { kind: 'quote', text: l('"Hah... hah... my arms are done for... satisfied?"', '「はぁ、はぁ……もう腕動かない……満足？」') },
            { kind: 'quote', text: l('"...Huh? Was that... it?"', '「……あれ？もしかして、今ので……？」') },
          ],
        },
      ],
      [FLAVOR_EVENTS.Card.Play]: [
        {
          conditions: [condition('enemyTrait', 'has', { target: 'selectedEnemy', enemyTrait: 'sexToy' })],
          lines: [
            { kind: 'quote', text: l('"Hey! I\'m putting a lot of effort into this, so at least react a little!"', '「ねえ！こっちは結構頑張ってるんだから、ちょっとくらい反応してよ！」') },
            { kind: 'quote', text: l('"Hah... hah... at this point, I\'m basically just exhausting myself..."', '「はぁ、はぁ……これじゃあたしが自分で自分を疲れさせてるだけじゃん……」') },
            { kind: 'narration', text: l('{player}\'s shoulders slump at the sheer futility of it.', '{player}は虚しくなったように肩を落としている。') },
            { kind: 'narration', text: l('{player} is pressing her chest against the machine, with an openly displeased expression.', '{player}は露骨に嫌そうな顔で機械に胸を押し付けている。') },
          ],
        },
        {
          conditions: [condition('enemyTrait', 'has', { target: 'selectedEnemy', enemyTrait: 'softBody' })],
          lines: [
            { kind: 'quote', text: l('"What!? Against my chest...? I\'m going to get slime all over me!"', '「えぇっ！？これを胸に……？絶対ぬるぬるになるじゃん！」') },
            { kind: 'quote', text: l('"Nnh... stop squishing into every little gap! Come on...!"', '「んぅ……隙間に入り込んでこないで！もうっ……！」') },
            { kind: 'quote', text: l('"I\'m taking a bath after this... and washing everything. Everything..."', '「あとで絶対洗う……身体も服も、ぜーんぶ洗う……」') },
            { kind: 'quote', text: l('"Eek... cold! W-Wait, I\'m not ready for this...!"', '「ひゃっ……冷たいっ！ちょ、ちょっと待って、心の準備が……！」') },
            { kind: 'narration', text: l('{player} protectively covers her chest while eyeing the slime.', '{player}は胸元を庇いながらスライムを警戒している。') },
            { kind: 'narration', text: l('{player} tenses at the slime\'s cold touch.', '{player}は冷たい感触に身体を強張らせた。') },
          ],
        },
        {
          conditions: [condition('playerState', 'has', { playerState: 'Breathless' }), condition('flavorValue', 'gte', { valueKey: 'playerSelfEpDamage', value: 1 })],
          lines: [
            { kind: 'quote', text: l('"Do you have any idea how many times I\'ve cum already...? Hurry..."', '「もうあたしのほうが何回イってると思ってるの……早くぅ……」') },
          ],
        },
        {
          conditions: [condition('playerState', 'has', { playerState: 'Breathless' })],
          lines: [
            { kind: 'quote', text: l('"Mm... my body\'s barely listening anymore... but..."', '「んっ……身体、もう言うこと聞かない……それでも……」') },
          ],
        },
        {
          conditions: [
            condition('flavorValue', 'eq', { valueKey: 'enemyWillOrgasm', value: true }),
            condition('flavorValue', 'eq', { valueKey: 'playerWillOrgasm', value: true }),
          ],
          lines: [
            { kind: 'quote', text: l('"Come on... my boobs are... so hurry...!"', '「もう……おっぱいがおかしく……早くしてよ……！」') },
          ],
        },
        {
          conditions: [condition('flavorValue', 'eq', { valueKey: 'playerWillOrgasm', value: true }), condition('playerState', 'has', { playerState: 'Aroused' })],
          lines: [
            { kind: 'quote', text: l('"Mm... just a little longer... I want this feeling to last...♡"', '「んっ……もうちょっと……この感じ、続けたい……♡」') },
            { kind: 'narration', text: l('{player} seems to have completely forgotten the original purpose.', '{player}は目的を忘れたように夢中になっている。') },
          ],
        },
        {
          conditions: [condition('flavorValue', 'eq', { valueKey: 'playerWillOrgasm', value: true })],
          lines: [
            { kind: 'quote', text: l('"Mm... my boobs are... so sensitive... I can\'t take it anymore...!"', '「んっ……おっぱい……敏感すぎて……もう、我慢できない……！」') },
            { kind: 'quote', text: l('"S-Sorry... I want to keep doing this properly, but I\'m starting to lose myself too...♡"', '「ご、ごめん……もう少しちゃんとしたいのに……あたしまで変になってきて……♡」') },
          ],
        },
        {
          conditions: [condition('flavorValue', 'eq', { valueKey: 'enemyWillOrgasm', value: true })],
          lines: [
            { kind: 'quote', text: l('"Almost there... right? Then I\'ll keep going...!"', '「もう少し……だよね？じゃあ、このまま……！」') },
            { kind: 'quote', text: l('"Hehe... look at that face. You\'re losing your composure, aren\'t you?"', '「ふふっ……その顔。もう余裕ないんでしょ？」') },
            { kind: 'quote', text: l('"Hah... this is it... last push...!"', '「はぁっ……もう……これで最後だからね……！」') },
            { kind: 'narration', text: l('{player} keeps moving determinedly, breathing hard.', '{player}は息を切らしながら懸命に身体を動かしている。') },
            { kind: 'narration', text: l('{player} quickens her movements, looking increasingly impatient.', '{player}は待ちきれない様子で動きを速めている。') },
          ],
        },
        {
          conditions: [condition('enemyOrgasmAftershocks', 'eq', { target: 'selectedEnemy', value: true })],
          lines: [
            { kind: 'quote', text: l('"Hehe... if you like it that much, I\'ll give you another round♡"', '「ふふっ……そんなに好きなら、もう一回サービスしてあげる♡」') },
            { kind: 'quote', text: l('"See? Still soft. Want to make sure one more time?♡"', '「ほら、まだ柔らかいよ？もう一回確かめる？♡」') },
          ],
        },
        {
          conditions: [condition('status', 'has', { target: 'player', status: 'DesperateToCum' })],
          lines: [
            { kind: 'quote', text: l('"More... make more use of me... it\'s still not enough...!"', '「もっと……あたしのこと使って……まだ足りないの……！」') },
            { kind: 'quote', text: l('"Hah... enjoy it more... please, want it more...♡"', '「はぁっ……もっと喜んで……お願い、もっと欲しがって……♡」') },
            { kind: 'narration', text: l('{player} keeps going desperately, breathing hard.', '{player}は息を切らしながら必死に続けている。') },
          ],
        },
        {
          conditions: [condition('status', 'has', { target: 'player', statuses: ['Horny', 'InHeat', 'Frustrated'] })],
          lines: [
            { kind: 'quote', text: l('"Hah... hah... I\'m losing myself too... but I still want more...♡"', '「はぁ、はぁ……あたしまで変になってる……でも、もっと……♡」') },
            { kind: 'quote', text: l('"Hah... I never meant to get this carried away..."', '「はぁ……あたし、こんなに夢中になるつもりじゃ……」') },
            { kind: 'narration', text: l('{player} presses close, her body flushed with heat.', '{player}は火照った身体を縋るように寄せている。') },
            { kind: 'narration', text: l('{player} impatiently bares her chest and closes the distance.', '{player}は焦れたように胸元をはだけ、強引に距離を詰める。') },
          ],
        },
        { kind: 'quote', text: l('"Why not come and savour my tits?"', '「あたしの胸、味わってみませんか？」') },
        { kind: 'quote', text: l('"See...? It\'s nice and soft like this, isn\'t it?"', '「ほら……こうすれば、柔らかいでしょ？」') },
        { kind: 'narration', text: l('She caressed him whilst rubbing her tits against his.', '{enemy}に抱き着いて胸を擦りつけながら愛撫した。') },
        { kind: 'narration', text: l('{player} presses closer with a proud little smile.', '{player}は得意げな笑みを浮かべて身体を押し寄せた。') },
      ],
    },
  }),
// ===================================================================
  cowgirlRiding: defineCard({
    name: l('Cowgirl riding', '騎乗位'),
// ===================================================================
    rarity: 'common',
    categories: ['caress', 'lust'],
    cost: 1,
    displayNameRules: [
      {
        conditions: [
          condition('bodyPartStatus', 'has', { parts: ['V'], bodyPartStatusKinds: ['insert'] }),
          condition('bodyPartStatus', 'has', { parts: ['A'], bodyPartStatusKinds: ['insert'] }),
        ],
        name: l('Cowgirl riding (double inserted)', '騎乗位 (両穴挿入中)'),
      },
      {
        conditions: [
          condition('bodyPartStatus', 'has', { parts: ['V'], bodyPartStatusKinds: ['insert'] }),
          condition('bodyPartStatus', 'notHas', { parts: ['A'], bodyPartStatusKinds: ['insert'] }),
        ],
        name: l('Cowgirl riding (V inserted)', '騎乗位 (V挿入中)'),
      },
      {
        conditions: [
          condition('bodyPartStatus', 'has', { parts: ['A'], bodyPartStatusKinds: ['insert'] }),
          condition('bodyPartStatus', 'notHas', { parts: ['V'], bodyPartStatusKinds: ['insert'] }),
        ],
        name: l('Cowgirl riding (A inserted)', '騎乗位 (A挿入中)'),
      },
    ],
    effects: [
      effect('epDamage', 'selectedEnemy', 10, { attackAttribute: 'love' }),
      effect('epDamage', 'player', 5, { attackAttribute: 'love', epDamageParts: ['V'] }),
    ],
    flavors: {
      [FLAVOR_EVENTS.Card.Resolved]: [
        {
          conditions: [condition('playerState', 'has', { playerState: 'Breathless' })],
          lines: [
            { kind: 'quote', text: l('"Hah... I\'m getting off... I\'m seriously at my limit..."', '「はぁっ……もうやめる……ほんとに限界……」') },
            { kind: 'quote', text: l('"Mm... I can\'t put any strength into my body..."', '「んっ……身体、全然力入らない……」') },
          ],
        },
        {
          conditions: [condition('flavorValue', 'eq', { valueKey: 'playerCummed', value: true }), condition('flavorValue', 'eq', { valueKey: 'enemyCummed', value: false }), condition('enemyTrait', 'has', { target: 'selectedEnemy', enemyTrait: 'male' })],
          lines: [
            { kind: 'quote', text: l('"I-It\'s not what you think! I just... got a little too carried away!"', '「ち、違うの！これは……その……調子に乗りすぎただけ！」') },
            { kind: 'quote', text: l('"Cumming before you... that\'s kind of humiliating for a succubus..."', '「先にイっちゃった……サキュバスとしてちょっと屈辱なんだけど……」') },
            { kind: 'quote', text: l('"...Sorry. I ended up getting way more carried away than you..."', '「……ごめん。あたしばっかり夢中になっちゃった……」') },
          ],
        },
        {
          conditions: [condition('flavorValue', 'eq', { valueKey: 'playerCummed', value: true }), condition('flavorValue', 'eq', { valueKey: 'enemyCummed', value: true }), condition('enemyTrait', 'has', { target: 'selectedEnemy', enemyTrait: 'male' })],
          lines: [
            { kind: 'quote', text: l('"I-It\'s not what you think! I just... got a little too carried away!"', '「ち、違うの！これは……その……調子に乗りすぎただけ！」') },
            { kind: 'quote', text: l('"No... we cum together... I was supposed to be the one with more composure..."', '「やだ……一緒にイっちゃった……絶対あたしのほうが余裕あるはずだったのに……」') },
          ],
        },
      ],
      [FLAVOR_EVENTS.Battle.EnemyOrgasm]: [
        {
          conditions: [condition('flavorValue', 'eq', { valueKey: 'playerWillOrgasm', value: true })],
          lines: [
            { kind: 'quote', text: l('"Mm... come on...! I was barely holding on already... that\'s not fair...♡"', '「んっ……もうっ……！あたしもギリギリなのに、そんなのずるい……♡」') },
            { kind: 'quote', text: l('"Hah... wait, not yet...! I\'m going to cum with you...♡"', '「はぁっ……待って、まだ……っ！一緒にイっちゃう……♡」') },
            { kind: 'quote', text: l('"Ah, no...! That reaction went right through me...♡"', '「あっ、だめ……！今の反応、直接こっちまで響いて……っ♡」') },
            { kind: 'narration', text: l('{player} shudders involuntarily at {enemy}\'s reaction.', '{player}は{enemy}の反応につられ、思わず身体を震わせた。') },
            { kind: 'narration', text: l('{player} tenses as though caught completely off guard.', '{player}は不意打ちを受けたように身体を強張らせた。') },
          ],
        },
        {
          lines: [
            { kind: 'quote', text: l('"Whoa...! At least warn me when it\'s over..."', '「わっ……！もう、最後くらい教えてよ……」') },
            { kind: 'quote', text: l('"Hah... I ended up getting carried away too..."', '「はぁ……あたしのほうまで夢中になっちゃった……」') },
            { kind: 'narration', text: l('{player} suddenly stops, looking surprised.', '{player}は驚いたように動きを止めた。') },
          ],
        },
      ],
      [FLAVOR_EVENTS.Card.Play]: [
        {
          conditions: [condition('enemyTrait', 'has', { target: 'selectedEnemy', enemyTrait: 'sexToy' })],
          lines: [
            { kind: 'quote', text: l('"Mm... all I have to do is stop... so why can\'t I...♡"', '「んっ……やめればいいだけなのに……なんで止まれないのよぉ……♡」') },
            { kind: 'quote', text: l('"This makes it look like... I\'m getting carried away all by myself over a machine."', '「こんなの……機械相手にひとりで夢中になってるみたいじゃん……っ」') },
            { kind: 'quote', text: l('"Hah... hah... I\'m the only one feeling good... That\'s not fair...♡"', '「はぁ……はぁ……あたしばっかり気持ちよくさせるとか、ずるい……♡」') },
            { kind: 'narration', text: l('{player} glares at the machine in frustration, yet can\'t bring herself to stop.', '{player}は悔しそうに機械を睨みながらも、動きを止められずにいる。') },
          ],
        },
        {
          conditions: [condition('enemyTrait', 'has', { target: 'selectedEnemy', enemyTrait: 'softBody' })],
          lines: [
            { kind: 'quote', text: l('"Eek, cold!? I-I can feel that weird texture everywhere...!"', '「ひゃあっ、冷たっ！？お、お尻まで変な感じする……！」') },
            { kind: 'quote', text: l('"Ugh... it looks like I\'m rubbing against this thing on purpose... I really hate this..."', '「うぅ……自分からこんなのに擦りついてるみたいで、すっごく嫌なんだけど……」') },
            { kind: 'quote', text: l('"Eugh... I just know this is going to be slimy... Do I really have to?"', '「うぇぇ……絶対ぬるぬるするじゃん……ほんとにやるのぉ？」') },
            { kind: 'narration', text: l('{player} slumps miserably atop the slime.', '{player}は情けなさそうにスライムの上で項垂れている。') },
            { kind: 'narration', text: l('{player} looks down at the slime, visibly horrified by the idea.', '{player}はスライムを見下ろし、露骨に顔を引きつらせた。') },
          ],
        },
        {
          conditions: [condition('playerState', 'has', { playerState: 'Breathless' }), condition('flavorValue', 'gte', { valueKey: 'playerSelfEpDamage', value: 1 })],
          lines: [
            { kind: 'quote', text: l('"I\'ve been the one losing it over and over... Next time, it\'s your turn...!"', '「もう何回もあたしばっかり……っ。次こそ、そっちの番だから……！」') },
            { kind: 'quote', text: l('"Hah... hah... I\'m not stopping... until you\'re the one who gives in...!"', '「はぁっ、はぁっ……絶対……そっちがイくまで、やめないんだから……！」') },
            { kind: 'quote', text: l('"Hah... I want to say I can\'t move anymore... but I\'m a succubus..."', '「はぁ……もう動けない……って言いたいけど……サキュバスだもん……」') },
          ],
        },
        {
          conditions: [
            condition('flavorValue', 'eq', { valueKey: 'enemyWillOrgasm', value: true }),
            condition('flavorValue', 'eq', { valueKey: 'playerWillOrgasm', value: true }),
          ],
          lines: [
            { kind: 'quote', text: l('"Wait... I\'m reaching to cum first... hurry, you too...!"', '「待って……あたしのほうが先にイきそう……早く、そっちも……！」') },
            { kind: 'quote', text: l('"Hah... please, hurry... I don\'t want to be the only one...♡"', '「はぁっ……お願い、早く……あたしだけ先なんて、やだ……♡」') },
            { kind: 'quote', text: l('"You\'re almost there too, right...? Please... together...♡"', '「あと少しなんでしょ……？お願い……一緒に……♡」') },
          ],
        },
        {
          conditions: [condition('flavorValue', 'eq', { valueKey: 'playerWillOrgasm', value: true }), condition('playerState', 'has', { playerState: 'Aroused' })],
          lines: [
            { kind: 'quote', text: l('"Ah...♡ Sorry... I can\'t even think about you anymore...!"', '「あっ……♡ ごめん……もう、そっちのこと考えられない……！」') },
            { kind: 'quote', text: l('"Mm... more...! I can\'t hold back anymore...!"', '「んっ……もっと……！もう、これ以上我慢できない……！」') },
            { kind: 'narration', text: l('{player} is so lost in herself that she seems to have forgotten {enemy} entirely.', '{player}は{enemy}の存在さえ忘れたように夢中になっている。') },
          ],
        },
        {
          conditions: [condition('flavorValue', 'eq', { valueKey: 'playerWillOrgasm', value: true })],
          lines: [
            { kind: 'quote', text: l('"Seriously...! I\'m a succubus, and I\'m going to cum first? This is humiliating...!"', '「もうっ……！サキュバスなのに先にイかされるとか、恥ずかしすぎる……！」') },
            { kind: 'quote', text: l('"No... you still look completely fine... so why am I the one...♡"', '「やだ……そっちはまだ余裕そうなのに……なんであたしが……♡」') },
            { kind: 'quote', text: l('"Sorry... I think I\'m going to lose it first... I don\'t think I can stop...♡"', '「ごめん……あたし、先にダメになっちゃうかも……我慢できない……♡」') },
          ],
        },
        {
          conditions: [condition('flavorValue', 'eq', { valueKey: 'enemyWillOrgasm', value: true })],
          lines: [
            { kind: 'quote', text: l('"Hah... hah... come on, you don\'t have to hold back anymore...!"', '「はぁ、はぁ……ほら、もう我慢しなくていいから……！」') },
            { kind: 'quote', text: l('"Hah... just a little more, right...? Then...!"', '「はぁっ……もう少し、なんでしょ……？じゃあ……！」') },
            { kind: 'narration', text: l('{player} quickens her movements, breathing heavily.', '{player}は息を弾ませながら動きを速めている。') },
          ],
        },
        {
          conditions: [condition('enemyOrgasmAftershocks', 'eq', { target: 'selectedEnemy', value: true })],
          lines: [
            { kind: 'quote', text: l('"Hehe... you didn\'t think I\'d let you off after just once, did you?"', '「ふふっ……まさか、一回で許してもらえると思った？」') },
            { kind: 'quote', text: l('"That face won\'t save you. I\'m not getting off yet♡"', '「そんな顔してもダメ。あたし、まだ降りないから♡」') },
            { kind: 'quote', text: l('"Come on, you\'ve still got more in you, right? Just one more... okay?♡"', '「ほら、まだいけるでしょ？もう一回だけ……ね♡」') },
          ],
        },
        {
          conditions: [condition('status', 'has', { target: 'player', status: 'DesperateToCum' })],
          lines: [
            { kind: 'quote', text: l('"Hah... hah... not enough... this still isn\'t enough...♡"', '「はぁ、はぁ……足りない……こんなのじゃ、まだ足りない……♡」') },
            { kind: 'quote', text: l('"I don\'t want to think anymore... please, just more...♡"', '「もう何も考えたくない……お願い、もっと……♡」') },
            { kind: 'quote', text: l('"Hah... I can\'t stop... I don\'t even care what happens anymore...♡"', '「はぁっ……止まれない……もう、どうなってもいいから……♡」') },
            { kind: 'narration', text: l('{player} reaches for {enemy} with desperate longing.', '{player}は切羽詰まった表情で{enemy}を求めている。') },
          ],
        },
        {
          conditions: [condition('status', 'has', { target: 'player', statuses: ['Horny', 'InHeat', 'Frustrated'] })],
          lines: [
            { kind: 'quote', text: l('"Stay right there... I\'ll do it myself..."', '「そこ……動かないで。あたしがするから……」') },
            { kind: 'quote', text: l('"Mm... more... I need to keep moving..."', '「んっ、ん……もっと……もっと動きたい……」') },
            { kind: 'narration', text: l('{player} is utterly lost in what she\'s doing.', '{player}は我を忘れたように没頭している。') },
            { kind: 'narration', text: l('{player} hurriedly settles herself atop {enemy}.', '{player}は焦るように{enemy}の上へ身体を重ねた。') },
          ],
        },
        {
          conditions: [
            condition('bodyPartStatus', 'has', { parts: ['V'], bodyPartStatusKinds: ['insert'] }),
            condition('bodyPartStatus', 'has', { parts: ['A'], bodyPartStatusKinds: ['insert'] }),
          ],
          lines: [
            { kind: 'quote', text: l('"I will move for you!"', '「あたしが動いてあげる！」') },
            { kind: 'narration', text: l('She bounced her hips while enduring the stimulation in both places.', '両穴の刺激に耐えながら腰を上下に跳ねさせた。') },
          ],
        },
        {
          conditions: [
            condition('bodyPartStatus', 'has', { parts: ['V'], bodyPartStatusKinds: ['insert'] }),
            condition('bodyPartStatus', 'notHas', { parts: ['A'], bodyPartStatusKinds: ['insert'] }),
          ],
          lines: [
            { kind: 'quote', text: l('"I will move for you!"', '「あたしが動いてあげる！」') },
            { kind: 'narration', text: l('She bounced her hips as if stroking {intrusionPart} upward.', '{intrusionPart}を扱き上げるように腰を上下に跳ねさせた。') },
          ],
        },
        {
          conditions: [
            condition('bodyPartStatus', 'has', { parts: ['A'], bodyPartStatusKinds: ['insert'] }),
            condition('bodyPartStatus', 'notHas', { parts: ['V'], bodyPartStatusKinds: ['insert'] }),
          ],
          lines: [
            { kind: 'quote', text: l('"I will move for you!"', '「あたしが動いてあげる！」') },
            { kind: 'narration', text: l('She bounced her hips as if stroking {intrusionPart} upward.', '{intrusionPart}を扱き上げるように腰を上下に跳ねさせた。') },
          ],
        },
        {
          lines: [
            { kind: 'quote', text: l('"Hehe... from up here, I can do things my way."', '「ふふっ……ここならあたしの好きにできそう」') },
            { kind: 'quote', text: l('"Hehe... well? Letting me take charge isn\'t so bad, is it?"', '「ふふっ……どう？あたしに任せるのも悪くないでしょ？」') },
            { kind: 'narration', text: l('I straddled {enemy} and rocked my hips.', '{enemy}に跨って腰を振った。') },
            { kind: 'narration', text: l('{player} rocks her hips in a steady rhythm.', '{player}は一定のリズムで腰を揺らしている。') },
          ],
        },
      ],
    },
  }),
// ===================================================================
  preparation: defineCard({
    name: l('Preparation', '準備'),
// ===================================================================
    rarity: 'common',
    categories: ['utility', 'noMotion'],
    cost: 1,
    effects: [effect('drawCards', 'player', 2)],
  }),
// ===================================================================
  rubOneOut: defineCard({
    name: l('RubOneOut', '自慰'),
// ===================================================================
    rarity: 'uncommon',
    categories: ['lust'],
    cost: 0,
    displayNameRules: [
      {
        conditions: [condition('enemyTrait', 'has', { target: 'selectedEnemy', enemyTrait: 'sexToy' })],
        name: l('RubOneOut (Toy)', '自慰(性玩具)'),
      },
    ],
    effects: [
      effect('status', 'player', 1, { status: 'Horny', stacks: 1 }),
      effect('epDamage', 'player', 0.2, { percentOf: 'playerMaxEp', attackAttribute: 'love', epDamageParts: ['B', 'C'] }),
    ],
    flavors: {
      [FLAVOR_EVENTS.Card.Play]: [
        {
          conditions: [
            condition('status', 'has', { target: 'player', status: 'Starvation' }),
            condition('status', 'has', { target: 'player', status: 'DesperateToCum' })
          ],
          lines: [
            { kind: 'quote', text: l('"...Why am I like this..."', '「…………ぉお゛♡ …………ぅ……ゔぅ♡」') },
            { kind: 'narration', text: l('In a hazy state of mind, {player} is fondling their own erogenous zones.', '{player}は混濁した意識の中、自身の性感帯をこね回している。') },
          ],
        },
        {
          conditions: [
            condition('status', 'has', { target: 'player', status: 'Starvation' }),
            condition('status', 'has', { target: 'player', statuses: ['InHeat', 'Frustrated'] })
          ],
          lines: [
            { kind: 'quote', text: l('"...Ugh♡ ...Uuugh...♡"', '「……ぅう♡ ……ゔぅぅ……♡」') },
            { kind: 'narration', text: l('In a hazy state of mind, {player} is fondling their own erogenous zones.', '{player}は混濁した意識の中、自身の性感帯をこね回している。') },
          ],
        },
        {
          conditions: [
            condition('status', 'has', { target: 'player', status: 'Starvation' }),
            condition('status', 'has', { target: 'player', status: 'Horny' })
          ],
          lines: [
            { kind: 'quote', text: l('"...Why am I like this..."', '「……なんで、あたしこんな……」') },
          ],
        },
        {
          conditions: [condition('status', 'has', { target: 'player', status: 'Starvation' })],
          lines: [
            { kind: 'quote', text: l('"...This isn\'t... the time for that..."', '「……こんな、場合じゃ……」') },
          ],
        },
        { kind: 'quote', text: l("I can't stand it...", '「我慢できない……」') },
      ],
    },
  }),
// ===================================================================
  rubOne: defineCard({
    name: l('RubOneOut', '自慰'),
// ===================================================================
    rarity: 'event',
    categories: ['lust'],
    cost: 0,
    displayNameRules: [
      {
        conditions: [condition('enemyTrait', 'has', { target: 'selectedEnemy', enemyTrait: 'sexToy' })],
        name: l('RubOneOut (Toy)', '自慰(性玩具)'),
      },
    ],
    effects: [
      effect('status', 'player', 1, { status: 'Horny', stacks: 1 }),
      effect('epDamage', 'player', 0.2, { percentOf: 'playerMaxEp', attackAttribute: 'love', epDamageParts: ['B', 'C'] }),
    ],
    vanish: true,
    flavors: {
      [FLAVOR_EVENTS.Card.Play]: [
        {
          conditions: [
            condition('status', 'has', { target: 'player', status: 'Starvation' }),
            condition('status', 'has', { target: 'player', status: 'DesperateToCum' })
          ],
          lines: [
            { kind: 'quote', text: l('"...Why am I like this..."', '「…………ぉお゛♡ …………ぅ……ゔぅ♡」') },
            { kind: 'narration', text: l('In a hazy state of mind, {player} is fondling their own erogenous zones.', '{player}は混濁した意識の中、自身の性感帯をこね回している。') },
          ],
        },
        {
          conditions: [
            condition('status', 'has', { target: 'player', status: 'Starvation' }),
            condition('status', 'has', { target: 'player', statuses: ['InHeat', 'Frustrated'] })
          ],
          lines: [
            { kind: 'quote', text: l('"...Ugh♡ ...Uuugh...♡"', '「……ぅう♡ ……ゔぅぅ……♡」') },
            { kind: 'narration', text: l('In a hazy state of mind, {player} is fondling their own erogenous zones.', '{player}は混濁した意識の中、自身の性感帯をこね回している。') },
          ],
        },
        {
          conditions: [
            condition('status', 'has', { target: 'player', status: 'Starvation' }),
            condition('status', 'has', { target: 'player', status: 'Horny' })
          ],
          lines: [
            { kind: 'quote', text: l('"...Why am I like this..."', '「……なんで、あたしこんな……」') },
          ],
        },
        {
          conditions: [condition('status', 'has', { target: 'player', status: 'Starvation' })],
          lines: [
            { kind: 'quote', text: l('"...This isn\'t... the time for that..."', '「……こんな、場合じゃ……」') },
          ],
        },
        { kind: 'quote', text: l("I can't stand it...", '「我慢できない……」') },
      ],
    },
  }),
// ===================================================================
  meditation: defineCard({
    name: l('Meditation', '瞑想'),
// ===================================================================
    rarity: 'rare',
    categories: ['utility', 'noMotion'],
    cost: 3,
    effects: [
      effect('setEp', 'player', 0),
      effect('status', 'player', 1, { status: 'Focused', stacks: 1 }),
    ],
    vanish: true,
  }),
// ===================================================================
  purge: defineCard({
    name: l('Purge', '排出'),
// ===================================================================
    rarity: 'event',
    categories: ['remedy', 'lust'],
    cost: 1,
    description: l('On success, purge {relatedIntrusionPart}. Fails if it causes orgasm.', '成功時、{relatedIntrusionPart}を排出する。排出中に絶頂してしまうと失敗する。'),
    effects: [effect('epDamage', 'player', 3, { attackAttribute: 'love', epDamageParts: ['M'] })],
    temporary: true,
  }),
// ===================================================================
  pullout: defineCard({
    name: l('Pullout', '引き抜く'),
// ===================================================================
    rarity: 'event',
    categories: ['remedy', 'lust'],
    cost: 0,
    description: l('On success, pull out {relatedIntrusionPart}. Fails if it causes orgasm.', '成功時、{relatedIntrusionPart}を引き抜く。処理中に絶頂してしまうと失敗する。'),
    effects: [
      effect('epDamage', 'selectedEnemy', 2, { attackAttribute: 'love' }),
      effect('epDamage', 'player', 2, { attackAttribute: 'love', epDamageParts: ['V'] }),
    ],
    temporary: true,
  }),
// ===================================================================
  wriggleFree: defineCard({
    name: l('Wriggle Free', '拘束抵抗'),
// ===================================================================
    rarity: 'event',
    categories: ['remedy', 'noMotion'],
    cost: 0,
    description: l('Try to escape binding by {relatedEnemyName}.', '{relatedEnemyName}の拘束から抜け出すため身をよじってもがく。'),
    effects: [effect('status', 'player', 1, { status: 'Escaping', stacks: 1 })],
    temporary: true,
  }),
// ===================================================================
  faint: defineCard({
    name: l('Faint', '失神'),
// ===================================================================
    rarity: 'event',
    categories: ['physiology', 'noMotion'],
    cost: 0,
    conditions: [condition('cardsPlayedThisTurn', 'eq', { value: 0 })],
    effects: [
      effect('status', 'player', 2, { status: 'Fainted', stacks: 2 }),
      effect('removeStatus', 'player', 0, { status: 'Aftershocks' }),
      effect('setEpRatio', 'player', 1 / 4, { ratioBase: 'playerCurrentEp' }),
    ],
    temporary: true,
    flavors: {
      [FLAVOR_EVENTS.Card.Play]: [
        { kind: 'narration', text: l('I can\'t stay conscious because of the excessive strain....', '過剰な負荷により意識を保てない……。') },
      ],
    },
  }),
// ===================================================================
  sharedSensation: defineCard({
    name: l('Shared Sensation', '感覚共有'),
// ===================================================================
    rarity: 'rare',
    categories: ['caress', 'lust', 'noMotion'],
    cost: 1,
    effects: [effect('shareEpDamage', 'selectedEnemy', 0)],
    flavors: {
      [FLAVOR_EVENTS.Card.Play]: [
        {
          conditions: [condition('hasEp', 'eq', { target: 'selectedEnemy', value: false })],
          lines: [
            { kind: 'narration', text: l('Could not share sensations with this enemy.', 'この敵とは感覚を共有できなかった') },
          ],
        },
        {
          conditions: [condition('hasEp', 'eq', { target: 'selectedEnemy', value: true })],
          lines: [
            { kind: 'quote', text: l('"Let’s feel good together♡♡"', '「一緒に気持ちよくなろうね♡♡」') },
          ],
        },
      ],
    },
  }),
// ===================================================================
  sensitivityTransfer: defineCard({
    name: l('Sensitivity Transfer', '感度転写'),
// ===================================================================
    rarity: 'rare',
    categories: ['caress', 'noMotion'],
    cost: 1,
    effects: [effect('copyEpSensitivity', 'selectedEnemy', 0, { sensitivityPart: 'C' })],
    flavors: {
      [FLAVOR_EVENTS.Card.Play]: [
        {
          conditions: [condition('hasEp', 'eq', { target: 'selectedEnemy', value: false })],
          lines: [
            { kind: 'narration', text: l('Could not transfer {player}’s sensitivity to this enemy.', 'この敵には{player}の感度を転写出来なかった') },
          ],
        },
        {
          conditions: [condition('hasEp', 'eq', { target: 'selectedEnemy', value: true })],
          lines: [
            { kind: 'quote', text: l('"Become just like me♡"', '「あたしと同じになっちゃえ♡」') },
          ],
        },
      ],
    },
  }),
});

export function createDeckDefinitions(cardIds: string[]): CardDefinition[] {
  return cardIds.map((id) => CARD_DEFINITIONS[id]);
}
