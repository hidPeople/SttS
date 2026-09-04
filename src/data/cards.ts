import type { CardDefinition } from '../models/types';
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
      onPlay: [
        { kind: 'quote', text: l('"Pow!"', '「えいっ！」') },
        { kind: 'narration', text: l('A direct blow lands cleanly.', '正面からの一撃がまっすぐに入る。') },
      ],
    },
  }),
  CrescentSlash: defineCard({
    id: 'Crescent Slash',
    name: l('Crescent Slash', '三日月斬り'),
    rarity: 'starter',
    categories: ['attack', 'noMotion'],
    cost: 2,
    description: l('Deal 15 HP damage.', 'HPに15ダメージ。'),
    effects: [effect('hpDamage', 'selectedEnemy', 15, { attackAttribute: 'slash' })],
    flavors: {
      onPlay: [
        { kind: 'quote', text: l('"Take that!"', '「くらえー！」') },
        { kind: 'narration', text: l('The sharp tip of the tail cuts a heavy arc.', '鋭い尾の先が大きな弧を描く。') },
      ],
    },
  }),
  defend: defineCard({
    id: 'defend',
    name: l('Defend', '防御'),
    rarity: 'starter',
    categories: ['utility'],
    cost: 1,
    description: l('Gain 5 block.', 'Blockを5得る。'),
    effects: [effect('block', 'player', 5)],
    flavors: {
      onPlay: [
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
      onPlay: [
        { kind: 'quote', text: l('"Look only at me."', '「私のことだけ、見て。」') },
        { kind: 'quote', text: l('"Care to do something naughty with me?"', '「私といいことしませんか？」') },
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
      onPlay: [
        { kind: 'quote', text: l('"Let it reach you."', '「届いて。」') },
        { kind: 'narration', text: l('A warm pulse brushes the enemy.', '甘い波が敵を撫でる。') },
      ],
    },
  }),
  blowWork: defineCard({
    id: 'blowWork',
    name: l('Blow Work', '舌技'),
    rarity: 'starter',
    categories: ['caress'],
    cost: 2,
    description: l('Deal 8 EP damage.', 'EPに8ダメージ。'),
    effects: [effect('epDamage', 'selectedEnemy', 8, { attackAttribute: 'love' })],
    flavors: {
      onPlay: [
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
      effect('status', 'selectedEnemy', 2, { status: 'Charm', stacks: 2 }),
    ],
    flavors: {
      onPlay: [
        { kind: 'quote', text: l('"Why not come and savour my tits?"', '「私の胸、味わってみませんか？」') },
        { kind: 'narration', text: l('She caressed him whilst rubbing her tits against his.', '{enemy}に抱き着いて胸を擦りつけながら愛撫した。') },
      ],
    },
  }),
  mountLove: defineCard({
    id: 'mountLove',
    name: l('Mount Love', '騎乗位'),
    rarity: 'common',
    categories: ['caress', 'lust'],
    cost: 1,
    description: l('Deal 10 EP damage. Take 5 EP damage.', 'EPに10ダメージ。自身がEPに5ダメージ。'),
    effects: [
      effect('epDamage', 'selectedEnemy', 10, { attackAttribute: 'love' }),
      effect('epDamage', 'player', 5, { attackAttribute: 'love', epDamageParts: ['V'] }),
    ],
    flavors: {
      onPlay: [
        { kind: 'narration', text: l('I straddled him and rocked my hips.', '相手に跨って腰を振った。') },
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
    effects: [
      effect('status', 'player', 1, { status: 'Horny', stacks: 1 }),
      effect('epDamage', 'player', 0.2, { percentOf: 'playerMaxEp', attackAttribute: 'love', epDamageParts: ['B', 'C'] }),
    ],
    flavors: {
      onPlay: [
        { kind: 'quote', text: l('"I can’t stand it..."', '「我慢できない……」') },
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
    effects: [
      effect('status', 'player', 1, { status: 'Horny', stacks: 1 }),
      effect('epDamage', 'player', 0.2, { percentOf: 'playerMaxEp', attackAttribute: 'love', epDamageParts: ['B', 'C'] }),
    ],
    vanish: true,
    flavors: {
      onPlay: [
        { kind: 'quote', text: l('"I can’t stand it..."', '「我慢できない……」') },
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
  resistBinding: defineCard({
    id: 'resistBinding',
    name: l('Resist Binding', '拘束抵抗'),
    rarity: 'event',
    categories: ['remedy', 'noMotion'],
    cost: 0,
    description: l('Try to escape binding. Gain Escaping. Temporary.', '拘束から抜け出そうとする。脱出中を得る。一時カード。'),
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
      effect('removeStatus', 'player', 0, { status: 'Lingering' }),
      effect('setEpReserveRatio', 'player', 1 / 3),
    ],
    temporary: true,
    flavors: {
      onPlay: [
        { kind: 'narration', text: l('I can’t stay conscious because of the excessive strain….', '過剰な負荷により意識を保てない……。') },
      ],
    },
  }),
};

export function createDeckDefinitions(cardIds: string[]): CardDefinition[] {
  return cardIds.map((id) => CARD_DEFINITIONS[id]);
}

