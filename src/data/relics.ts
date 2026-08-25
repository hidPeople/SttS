import { EFFECT_TIMINGS, type RelicDefinition } from '../models/types';
import { text as l } from '../models/localization';
import { condition, defineRelic, effect } from './effectBuilders';

export const RELIC_DEFINITIONS: Record<string, RelicDefinition> = {
  succubusBlood: defineRelic({
    id: 'succubusBlood',
    name: l('Succubus\'s Blood', 'サキュバスの血'),
    rarity: 'starter',
    description: l('When an enemy reaches EP Peak, drain HP equal to that enemy max EP.', '敵がEP Peakした時、その敵の最大EP分のHPをドレインする。'),
    triggers: [
      {
        timing: EFFECT_TIMINGS.EnemyEpPeak,
        effects: [effect('hpDrain', 'triggerEnemy', 1, { percentOf: 'targetMaxEp', attackAttribute: 'love' })],
      },
    ],
  }),
  lilimBlood: defineRelic({
    id: 'lilimBlood',
    name: l('Lilim\'s Blood', 'リリムの血'),
    rarity: 'uncommon',
    description: l('When an enemy reaches EP Peak, drain 5 HP.', '敵がEP Peakした時、5HPをドレインする。'),
    triggers: [
      {
        timing: EFFECT_TIMINGS.EnemyEpPeak,
        effects: [effect('hpDrain', 'triggerEnemy', 5, { attackAttribute: 'love' })],
      },
    ],
  }),
  manualOfBrothel: defineRelic({
    id: 'manualOfBrothel',
    name: l('Manual of the Brothel', '娼館の手引き'),
    rarity: 'common',
    description: l('Enemy EP damage dealt by cards is increased by 1.', 'カードで敵に与えるEPダメージが1増える。'),
    triggers: [
      {
        timing: EFFECT_TIMINGS.Passive,
        effects: [effect('epDamage', 'selectedEnemy', 1, { attackAttribute: 'love' })],
      },
    ],
  }),
  pheromones: defineRelic({
    id: 'pheromones',
    name: l('Pheromones', 'フェロモン'),
    rarity: 'uncommon',
    description: l('At battle start, apply Charm to all enemies.', '戦闘開始時、全ての敵にCharmを付与する。'),
    triggers: [
      {
        timing: EFFECT_TIMINGS.BattleStart,
        effects: [effect('status', 'allEnemies', 1, { status: 'Charm', stacks: 1 })],
      },
    ],
  }),
  alluringBody: defineRelic({
    id: 'alluringBody',
    name: l('Alluring Body', '蠱惑の肉体'),
    rarity: 'rare',
    description: l('When the player reaches EP Peak, each enemy has a 20% chance to gain Charm.', 'プレイヤーがEP Peakした時、各敵に20%の確率でCharmを付与する。'),
    triggers: [
      {
        timing: EFFECT_TIMINGS.PlayerEpPeak,
        effects: [effect('status', 'allEnemies', 1, { status: 'Charm', stacks: 1, chance: 0.2 })],
      },
    ],
  }),
  livingClothes: defineRelic({
    id: 'livingClothes',
    name: l('Living Clothes', '触手服'),
    rarity: 'rare',
    description: l('At turn start, if you have Block, keep that Block and take 1-3 EP damage.', 'ターン開始時にBlockがあるならBlockを維持し、1〜3EPダメージを受ける。'),
    triggers: [
      {
        timing: EFFECT_TIMINGS.TurnStart,
        conditions: [condition('block', 'gt', { target: 'player', value: 0 })],
        effects: [
          effect('retainBlock', 'player', 1),
          effect('epDamage', 'player', 1, { randomAmount: { min: 1, max: 3 }, attackAttribute: 'love', epDamageParts: ['B', 'C', 'V', 'A'] }),
        ],
        flavors: {
          onTrigger: [
            { kind: 'narration', text: l( 'The living clothes cling to the entire body and jiggle.', '触手服が全身に密着し、舐めるように蠢く。', ), },
          ],
        },
      },
    ],
  }),
};
