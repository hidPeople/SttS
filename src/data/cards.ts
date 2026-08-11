import type { CardDefinition } from '../models/types';
import { text as l } from '../models/localization';
import { condition, defineCard, effect } from './effectBuilders';

export const CARD_DEFINITIONS: Record<string, CardDefinition> = {
  strike: defineCard({
    id: 'strike',
    name: l('Strike', 'ストライク'),
    rarity: 'starter',
    cost: 1,
    description: l('Deal 6 HP damage.', 'HPに6ダメージ。'),
    effects: [effect('hpDamage', 'selectedEnemy', 6, { attackAttribute: 'strike' })],
    flavors: {
      onPlay: [
        { kind: 'narration', text: l('A direct blow lands cleanly.', '正面からの一撃がまっすぐに入る。') },
      ],
    },
  }),
  heavyStrike: defineCard({
    id: 'heavyStrike',
    name: l('Heavy Strike', 'ヘビーストライク'),
    rarity: 'starter',
    cost: 2,
    description: l('Deal 15 HP damage.', 'HPに15ダメージ。'),
    effects: [effect('hpDamage', 'selectedEnemy', 15, { attackAttribute: 'slash' })],
    flavors: {
      onPlay: [
        { kind: 'narration', text: l('The blade cuts a heavy arc.', '重い刃が大きな弧を描く。') },
      ],
    },
  }),
  defend: defineCard({
    id: 'defend',
    name: l('Defend', '防御'),
    rarity: 'starter',
    cost: 1,
    description: l('Gain 5 block.', 'Blockを5得る。'),
    effects: [effect('block', 'player', 5)],
    flavors: {
      onPlay: [
        { kind: 'narration', text: l('She steadies herself behind a guard.', '身構え、次の衝撃に備える。') },
      ],
    },
  }),
  love: defineCard({
    id: 'love',
    name: l('Love', 'ラブ'),
    rarity: 'starter',
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
  bigLove: defineCard({
    id: 'bigLove',
    name: l('Big Love', 'ビッグラブ'),
    rarity: 'starter',
    cost: 2,
    description: l('Deal 8 EP damage.', 'EPに8ダメージ。'),
    effects: [effect('epDamage', 'selectedEnemy', 8, { attackAttribute: 'love' })],
    flavors: {
      onPlay: [
        { kind: 'narration', text: l('A stronger wave of affection pours out.', 'より濃い愛の波があふれ出す。') },
      ],
    },
  }),
  seduction: defineCard({
    id: 'seduction',
    name: l('Seduction', '誘惑'),
    rarity: 'starter',
    cost: 0,
    description: l('Apply charm.', 'Charmを付与。'),
    effects: [effect('status', 'selectedEnemy', 1, { status: 'Charm', stacks: 1, attackAttribute: 'love' })],
    flavors: {
      onPlay: [
        { kind: 'quote', text: l('"Look only at me."', '「こっちだけ見て。」') },
      ],
    },
  }),
  provocative: defineCard({
    id: 'provocative',
    name: l('Provocative', 'プロヴォカティブ'),
    rarity: 'starter',
    cost: 3,
    description: l('Deal 6 EP damage. Apply 2 Charm.', 'EPに6ダメージ。Charmを2付与。'),
    effects: [
      effect('epDamage', 'selectedEnemy', 6, { attackAttribute: 'love' }),
      effect('status', 'selectedEnemy', 2, { status: 'Charm', stacks: 2 }),
    ],
  }),
  mountLove: defineCard({
    id: 'mountLove',
    name: l('Mount Love', 'マウントラブ'),
    rarity: 'common',
    cost: 1,
    description: l('Deal 10 EP damage. Take 5 EP damage.', 'EPに10ダメージ。自身がEPに5ダメージ。'),
    effects: [
      effect('epDamage', 'selectedEnemy', 10, { attackAttribute: 'love' }),
      effect('epDamage', 'player', 5, { attackAttribute: 'love' }),
    ],
  }),
  preparation: defineCard({
    id: 'preparation',
    name: l('Preparation', '準備'),
    rarity: 'common',
    cost: 1,
    description: l('Draw 2 cards.', 'カードを2枚引く。'),
    effects: [effect('drawCards', 'player', 2)],
  }),
  rubOneOut: defineCard({
    id: 'rubOneOut',
    name: l('RubOneOut', 'RubOneOut'),
    rarity: 'uncommon',
    cost: 0,
    description: l('Apply Horny. Take 20% max EP damage.', 'Hornyを付与。最大EPの20%分、自身がEPダメージを受ける。'),
    effects: [
      effect('status', 'player', 1, { status: 'Horny', stacks: 1 }),
      effect('epDamage', 'player', 0.2, { percentOf: 'playerMaxEp', attackAttribute: 'love' }),
    ],
  }),
  meditation: defineCard({
    id: 'meditation',
    name: l('Meditation', '瞑想'),
    rarity: 'rare',
    cost: 3,
    description: l('Set EP to 0. Gain Focused. Vanish.', 'EPを0にする。Focusedを得る。使用後消滅。'),
    effects: [
      effect('setEp', 'player', 0),
      effect('status', 'player', 1, { status: 'Focused', stacks: 1 }),
    ],
    vanish: true,
  }),
  rubOne: defineCard({
    id: 'rubOne',
    name: l('RubOneOut', 'RubOneOut'),
    rarity: 'event',
    cost: 0,
    description: l('Apply Horny. Take 20% max EP damage. Vanish.', 'Hornyを付与。最大EPの20%分、自身がEPダメージを受ける。使用後消滅。'),
    effects: [
      effect('status', 'player', 1, { status: 'Horny', stacks: 1 }),
      effect('epDamage', 'player', 0.2, { percentOf: 'playerMaxEp', attackAttribute: 'love' }),
    ],
    vanish: true,
  }),
  purge: defineCard({
    id: 'purge',
    name: l('Purge', '排出'),
    rarity: 'event',
    cost: 1,
    description: l('On success, remove an intruded enemy. Fails if it causes EP Peak.', '成功時、侵入した敵を引きはがす。EP Peakが発生すると失敗。'),
    effects: [effect('epDamage', 'player', 3, { attackAttribute: 'love' })],
    temporary: true,
  }),
  faint: defineCard({
    id: 'faint',
    name: l('Faint', '失神'),
    rarity: 'event',
    cost: 0,
    description: l('Collapse from excessive strain.', '過剰な負荷により意識を失う。'),
    conditions: [condition('cardsPlayedThisTurn', 'eq', { value: 0 })],
    effects: [
      effect('status', 'player', 2, { status: 'Fainted', stacks: 2 }),
      effect('clearStatus', 'player', 0, { status: 'Lingering' }),
      effect('setEpReserveRatio', 'player', 1 / 3),
    ],
    temporary: true,
  }),
};

export function createDeckDefinitions(cardIds: string[]): CardDefinition[] {
  return cardIds.map((id) => CARD_DEFINITIONS[id]);
}
