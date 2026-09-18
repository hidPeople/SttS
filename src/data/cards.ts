import { FLAVOR_EVENTS, type CardDefinition } from '../models/types';
import { text as l } from '../models/localization';
import { condition, defineCard, effect } from './effectBuilders';

export const CARD_DEFINITIONS: Record<string, CardDefinition> = {
  strike: defineCard({
    id: 'strike',
    name: l('Strike', 'ストライク'),
    rarity: 'starter',
    categories: ['attack'],
    cost: 1,
    description: l('Deal 6 HP damage.', 'HPに6ダメージ。'),
    effects: [effect('hpDamage', 'selectedEnemy', 6, { attackAttribute: 'strike' })],
    flavors: {
      [FLAVOR_EVENTS.Card.Play]: [
        { kind: 'quote', text: l('"Pow!"', '「えいっ！」') },
        { kind: 'narration', text: l('A direct blow lands cleanly.', '正面からの一撃がまっすぐに入る。') },
      ],
    },
  }),
  crescentSlash: defineCard({
    id: 'Crescent Slash',
    name: l('Crescent Slash', '三日月斬り'),
    rarity: 'starter',
    categories: ['attack', 'noMotion'],
    cost: 2,
    description: l('Slashes with its tail, deal 15 HP damage. Can be used even if the character’s limbs are immobilised.', '尻尾で斬りつけ、HPに15ダメージ。手足が動かなくてもプレイ使用可能。'),
    effects: [effect('hpDamage', 'selectedEnemy', 15, { attackAttribute: 'slash' })],
    flavors: {
      [FLAVOR_EVENTS.Card.Play]: [
        { kind: 'quote', text: l('"Take thaaaat!"', '「くらえー！」') },
        { kind: 'narration', text: l('The sharp tip of the tail cuts a heavy arc.', '鋭い尾の先が大きな弧を描く。') },
      ],
    },
  }),
  defend: defineCard({
    id: 'defend',
    name: l('Defense Magic', '防御魔法'),
    rarity: 'starter',
    categories: ['utility'],
    cost: 1,
    description: l('Gain 5 block.', 'ブロックを5得る。'),
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
  seduction: defineCard({
    id: 'seduction',
    name: l('Seduction', '誘惑'),
    rarity: 'starter',
    categories: ['caress', 'lust', 'noMotion'],
    cost: 0,
    description: l('Apply charm.', 'Charmを付与。'),
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
          ],
        },
        {
          conditions: [
            condition('bodyPartStatus', 'has', { parts: ['M'], bodyPartStatusKinds: ['insert', 'intruded'] }),
            condition('bodyPartStatus', 'notHas', { target: 'selectedEnemy', parts: ['M'], bodyPartStatusKinds: ['insert', 'intruded'] }),
          ],
          lines: [{ kind: 'quote', text: l('"…Ugh… Mmm… Cough… Look, why don\'t you just… Mmm… do whatever you like…?"', '「…ぅぐ……むぐ……げほっ……ほらっ、好きに……んぐっ……したら……？」') }],
        },
        {
          conditions: [condition('enemyTrait', 'has', { target: 'selectedEnemy', enemyTrait: 'softBody' }), condition('enemyHasBindingAction', 'eq', { target: 'selectedEnemy', value: true })],
          lines: [
            { kind: 'quote', text: l('"...Do that absorption or digestion thing...? ...I\'ll try to endure it..."', '「……吸収とか、消化とか……そういうの、して？ ……私、耐えてみるから……」') },
            { kind: 'quote', text: l('"...Wrap me up with that body... pin me down so I can\'t move... and fuck me however you want...?"', '「……全部で包んで……動けなくして……好きに、犯して……？」') },
            { kind: 'quote', text: l('"...Use that body to... plug up all my holes... so I can\'t move..."', '「……その体で……私の穴、全部、塞いで……動けなくして……」') },
          ],
        },
        {
          conditions: [condition('enemyTrait', 'has', { target: 'selectedEnemy', enemyTrait: 'sexToy' }), condition('enemyHasBindingAction', 'eq', { target: 'selectedEnemy', value: true })],
          lines: [
            { kind: 'quote', text: l('"...Will you make sure I can\'t run away?? ...I\'m happy."', '「……逃げられないように、してくれるの？ ……嬉しい。」') },
            { kind: 'quote', text: l('"Fuck me however you want...? ...I\'ll try to endure it..."', '「好きにして…… 私、耐えてみせるから……」') },
          ],
        },
        {
          conditions: [condition('status', 'has', { target: 'player', status: 'Bound' })],
          lines: [
            { kind: 'quote', text: l('"Look... I can\'t move... this is your chance...? Wanna rape me?"', '「ほら……私、動けないよ……チャンスだよ……？ 犯して？」') },
            { kind: 'quote', text: l('"I can\'t resist, you know? ...Do as much as you want."', '「抵抗、できないよ？ ……好きなだけ、して」') },
          ],
        },
        {
          conditions: [condition('enemyTrait', 'has', { target: 'selectedEnemy', enemyTrait: 'softBody' })],
          lines: [
            { kind: 'quote', text: l('"Dirty me with that body of yours... hurry..."', '「私の事……その身体で汚してよ……早くぅ……」') },
            { kind: 'quote', text: l('"...come all the way inside my holes... and mess me up."', '「……私の中、入ってきて……ぐちゃぐちゃにして」') },
            { kind: 'quote', text: l('"...Hey, melt me? ...Fill me up all the way inside..."', '「……ねえ……私のこと、溶かして？ ……中まで、いっぱいにして……」') },
          ],
        },
        {
          conditions: [condition('enemyTrait', 'has', { target: 'selectedEnemy', enemyTrait: 'sexToy' })],
          lines: [
            { kind: 'quote', text: l('"Even if you don\'t understand words... how about this? ...Try using this hole."', '「言葉が分からなくても……これならどう？ ……この穴、使ってみて」') },
            { kind: 'quote', text: l('"You can break me however you want..."', '「私を、好きに、壊していいから……」') },
          ],
        },
        {
          conditions: [condition('status', 'has', { target: 'player', status: 'MultiplePeaksTorture' })],
          lines: [
            { kind: 'quote', text: l('"...Put it in... put it in... this stupid voice keeps... coming out of me..."', '「……いれて……いれてって……私バカになっちゃった……何……言ってるの……？」') },
            { kind: 'quote', text: l('"Any more and I\'ll go crazy... so... please... stop... okay...?"', '「これ以上はおがじぐなっちゃう゛ぅ……ね…やめよ……ね？」') },
          ],
        },
        {
          conditions: [condition('status', 'has', { target: 'player', status: 'PeakHell' })],
          lines: [
            { kind: 'quote', text: l('"...I\'m still tempting you even though I\'ve gone past my limit... pretty pathetic, right? ...But you\'ll still do it, won\'t you?"', '「……限界超えてるのに、まだ誘ってる私……最低、でしょ？ ……でも、するよね？」') },
            { kind: 'quote', text: l('"So why not do as you like while you can? ...I won\'t run."', '「……今のうちに、好きにすれば？ ……逃げないよ」') },
          ],
        },
        {
          conditions: [condition('status', 'has', { target: 'player', status: 'MultiplePeak' })],
          lines: [
            { kind: 'quote', text: l('"Look... this is my twitching pussy after cumming so much... won\'t you put it in...?"', '「ほら……Peakしまくった後の痙攣まんこだよ……いれないの…？」') },
            { kind: 'quote', text: l('"...Fufu, did you see? A succubus collapsed from cumming too much... rare, right? ...Wanna touch?"', '「……ふふ、見た？ Peakしすぎて倒れてるサキュバス……珍しいでしょ？ ……触る？」') },
            { kind: 'quote', text: l('"It\'s twitching... cum here...? Inside or outside, I don\'t care."', '「ひくひくしてる……ここに、出して……？ 中でも外でも、いいから」') },
          ],
        },
        {
          conditions: [condition('bodyPartStatus', 'has', { target: 'selectedEnemy', parts: ['V', 'A'], bodyPartStatusKinds: ['insert', 'intruded'] })],
          lines: [
            { kind: 'quote', text: l('"...Haah... harder... move more... stir me up inside..."', '「……はあっ……もっと、激しく……動かして……中、かき回して……」') },
            { kind: 'quote', text: l('"...I don\'t need gentle... thrust like you\'re breaking me... please..."', '「……優しいの、いらない……壊すくらい、突いて……お願い……」') },
            { kind: 'quote', text: l('"...Nnagh... not enough... fuck me harder... break me..."', '「……んあっ……足りない……もっと、激しく犯して……私を、壊して……」') },
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
            { kind: 'quote', text: l('"...I can\'t hold back anymore... fuck me. You can be rough..."', '「……我慢、できない……抱いて。強くしていいから……」') },
            { kind: 'quote', text: l('"Care to do something naughty with me?"', '「私といいことしませんか？」') },
          ],
        },
      ],
    },
  }),
  handWork: defineCard({
    id: 'handWork',
    name: l('Hand Work', '手技'),
    rarity: 'starter',
    categories: ['caress'],
    cost: 1,
    description: l('Deal 3 EP damage.', 'EPに3ダメージ。'),
    effects: [effect('epDamage', 'selectedEnemy', 3, { attackAttribute: 'love' })],
    flavors: {
      [FLAVOR_EVENTS.Card.Play]: [
        { kind: 'quote', text: l('"Let it reach you."', '「届いて。」') },
        { kind: 'narration', text: l('A warm pulse brushes the enemy.', '甘い波が敵を撫でる。') },
      ],
    },
  }),
  blowWork: defineCard({
    id: 'blowWork',
    name: l('Blow Work', '舌技'),
    rarity: 'starter',
    categories: ['caress', 'lust'],
    cost: 2,
    description: l('Deal 8 EP damage.', 'EPに8ダメージ。'),
    effects: [
      effect('epDamage', 'selectedEnemy', 8, { attackAttribute: 'love' }),
      effect('epDamage', 'player', 0.5, { attackAttribute: 'love', epDamageParts: ['M'] }),
    ],
    flavors: {
      [FLAVOR_EVENTS.Card.Play]: [
        { kind: 'narration', text: l('A stronger wave of affection pours out.', 'より濃い愛の波があふれ出す。') },
      ],
    },
  }),
  titsWork: defineCard({
    id: 'titsWork',
    name: l('Tits Work', '胸技'),
    rarity: 'starter',
    categories: ['caress', 'lust'],
    cost: 2,
    description: l('Deal 4 EP damage. Apply 2 Charm.', 'EPに4ダメージ。Charmを2付与。'),
    effects: [
      effect('epDamage', 'selectedEnemy', 4, { attackAttribute: 'love' }),
      effect('epDamage', 'player', 0.5, { attackAttribute: 'love', epDamageParts: ['B'] }),
      effect('status', 'selectedEnemy', 2, { status: 'Charm', stacks: 2 }),
    ],
    flavors: {
      [FLAVOR_EVENTS.Card.Play]: [
        { kind: 'quote', text: l('"Why not come and savour my tits?"', '「私の胸、味わってみませんか？」') },
        { kind: 'narration', text: l('She caressed him whilst rubbing her tits against his.', '{enemy}に抱き着いて胸を擦りつけながら愛撫した。') },
      ],
    },
  }),
  cowgirlRiding: defineCard({
    id: 'cowgirlRiding',
    name: l('Cowgirl riding', '騎乗位'),
    rarity: 'common',
    categories: ['caress', 'lust'],
    cost: 1,
    description: l('Deal 10 EP damage. Take 5 EP damage.', 'EPに10ダメージ。自身がEPに5ダメージ。'),
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
      [FLAVOR_EVENTS.Card.Play]: [
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
            { kind: 'narration', text: l('I straddled {enemy} and rocked my hips.', '{enemy}に跨って腰を振った。') },
          ],
        },
      ],
    },
  }),
  preparation: defineCard({
    id: 'preparation',
    name: l('Preparation', '準備'),
    rarity: 'common',
    categories: ['utility', 'noMotion'],
    cost: 1,
    description: l('Draw 2 cards.', 'カードを2枚引く。'),
    effects: [effect('drawCards', 'player', 2)],
  }),
  rubOneOut: defineCard({
    id: 'rubOneOut',
    name: l('RubOneOut', '慰め'),
    rarity: 'uncommon',
    categories: ['lust'],
    cost: 0,
    description: l('Apply Horny. Take 20% max EP damage.', 'Hornyを付与。最大EPの20%分、自身がEPダメージを受ける。'),
    displayNameRules: [
      {
        conditions: [condition('enemyTrait', 'has', { target: 'selectedEnemy', enemyTrait: 'sexToy' })],
        name: l('RubOneOut (Toy)', '慰め(性玩具)'),
      },
    ],
    effects: [
      effect('status', 'player', 1, { status: 'Horny', stacks: 1 }),
      effect('epDamage', 'player', 0.2, { percentOf: 'playerMaxEp', attackAttribute: 'love', epDamageParts: ['B', 'C'] }),
    ],
    flavors: {
      [FLAVOR_EVENTS.Card.Play]: [
        { kind: 'quote', text: l("I can't stand it...", '「我慢できない……」') },
      ],
    },
  }),
  rubOne: defineCard({
    id: 'rubOne',
    name: l('RubOneOut', '慰め'),
    rarity: 'event',
    categories: ['lust'],
    cost: 0,
    description: l('Apply Horny. Take 20% max EP damage. Vanish.', 'Hornyを付与。最大EPの20%分、自身がEPダメージを受ける。使用後消滅。'),
    displayNameRules: [
      {
        conditions: [condition('enemyTrait', 'has', { target: 'selectedEnemy', enemyTrait: 'sexToy' })],
        name: l('RubOneOut (Toy)', '慰め(性玩具)'),
      },
    ],
    effects: [
      effect('status', 'player', 1, { status: 'Horny', stacks: 1 }),
      effect('epDamage', 'player', 0.2, { percentOf: 'playerMaxEp', attackAttribute: 'love', epDamageParts: ['B', 'C'] }),
    ],
    vanish: true,
    flavors: {
      [FLAVOR_EVENTS.Card.Play]: [
        { kind: 'quote', text: l("I can't stand it...", '「我慢できない……」') },
      ],
    },
  }),
  meditation: defineCard({
    id: 'meditation',
    name: l('Meditation', '瞑想'),
    rarity: 'rare',
    categories: ['utility', 'noMotion'],
    cost: 3,
    description: l('Set EP to 0. Gain Focused. Vanish.', 'EPを0にする。Focusedを得る。使用後消滅。'),
    effects: [
      effect('setEp', 'player', 0),
      effect('status', 'player', 1, { status: 'Focused', stacks: 1 }),
    ],
    vanish: true,
  }),
  purge: defineCard({
    id: 'purge',
    name: l('Purge', '排出'),
    rarity: 'event',
    categories: ['remedy', 'lust'],
    cost: 1,
    description: l('On success, remove an intruded enemy. Fails if it causes Peak.', '成功時、侵入した敵を引きはがす。排出中にPeakしてしまうと失敗する。'),
    effects: [effect('epDamage', 'player', 3, { attackAttribute: 'love', epDamageParts: ['M'] })],
    temporary: true,
  }),
  pullout: defineCard({
    id: 'pullout',
    name: l('Pullout', '引き抜く'),
    rarity: 'event',
    categories: ['remedy', 'lust'],
    cost: 0,
    description: l('On success, remove an inserted enemy. Fails if it causes Peak.', '成功時、挿入状態の敵を引き抜く。処理中にPeakしてしまうと失敗する。'),
    effects: [
      effect('epDamage', 'selectedEnemy', 2, { attackAttribute: 'love' }),
      effect('epDamage', 'player', 2, { attackAttribute: 'love', epDamageParts: ['V'] }),
    ],
    temporary: true,
  }),
  wriggleFree: defineCard({
    id: 'wriggleFree',
    name: l('Wriggle Free', '拘束抵抗'),
    rarity: 'event',
    categories: ['remedy', 'noMotion'],
    cost: 0,
    description: l('Try to escape binding. Gain Escaping. Temporary.', '拘束から抜け出すため身をよじってもがく。脱出中を得る。一時カード。'),
    effects: [effect('status', 'player', 1, { status: 'Escaping', stacks: 1 })],
    temporary: true,
  }),
  faint: defineCard({
    id: 'faint',
    name: l('Faint', '失神'),
    rarity: 'event',
    categories: ['physiology', 'noMotion'],
    cost: 0,
    description: l('Playable only at turn start.\nCollapse from excessive strain.', 'ターン開始時のみ使用可。\n過剰な負荷により意識を失う。'),
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
};

export function createDeckDefinitions(cardIds: string[]): CardDefinition[] {
  return cardIds.map((id) => CARD_DEFINITIONS[id]);
}

