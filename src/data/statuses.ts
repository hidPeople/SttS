import type { EffectTiming, StatusDefinition, StatusEffect, StatusModifierDefinition } from '../models/types';
import { effect } from './effectBuilders';

function defineStatus(input: StatusDefinition): StatusDefinition {
  return input;
}

function epDamageTakenMultiplier(amount: number): StatusModifierDefinition {
  return {
    kind: 'epDamageTakenMultiplier',
    amount,
    target: 'player',
  };
}

export const STATUS_DESCRIPTIONS: Record<StatusEffect, StatusDefinition> = {
  Charm: defineStatus({
    name: 'Charm',
    description: 'Charm: The next enemy attack uses the charm intent pool. One stack is consumed when it takes effect.',
    remain: 0,
    allowedOwners: ['enemy'],
    iconText: 'Ch',
    iconColor: 0xe14f9d,
    triggers: [
      {
        timing: 'turnStart',
        effects: [],
      },
    ],
  }),
  Lingering: defineStatus({
    name: 'Lingering',
    description: 'Lingering: At the start of your turn, lose 1 energy per stack while energy remains.',
    remain: 0,
    allowedOwners: ['player'],
    iconText: 'Li',
    iconColor: 0x9b6ef3,
    triggers: [
      {
        timing: 'turnStart',
        consumeRule: 'allWhileEnergy',
        order: 10,
        effects: [
          effect('energyGain', 'player', -1),
        ],
        visuals: ['breathAndEnergyPulse'],
      },
    ],
  }),
  Horny: defineStatus({
    name: 'Horny',
    description: 'Horny: EP damage received is multiplied by 1.5. Clears at EP Peak and grants 1 energy.',
    remain: 1,
    allowedOwners: ['player'],
    iconText: 'Ho',
    iconColor: 0xef5da8,
    exclusiveGroup: 'arousal',
    groupRank: 1,
    triggers: [
      {
        timing: 'turnStart',
        order: 30,
        effects: [
          effect('addCardToHand', 'player', 1, { cardId: 'rubOne' }),
        ],
        visuals: ['addCardFromPlayerFadeIn'],
      },
      {
        timing: 'damageCalculation',
        effects: [],
        modifiers: [epDamageTakenMultiplier(1.5)],
      },
      {
        timing: 'playerEpPeak',
        effects: [
          effect('energyGain', 'player', 1, { onlyDuringPlayerTurn: true }),
          effect('removeStatus', 'player', 1, { status: 'Horny' }),
        ],
      },
    ],
  }),
  Heat: defineStatus({
    name: 'Heat',
    description: 'Heat: EP damage received is multiplied by 2. Clears at EP Peak and grants 1 energy.',
    remain: 1,
    allowedOwners: ['player'],
    iconText: 'Ht',
    iconColor: 0xf26b4f,
    exclusiveGroup: 'arousal',
    groupRank: 2,
    triggers: [
      {
        timing: 'turnStart',
        order: 30,
        effects: [
          effect('addCardToHand', 'player', 2, { cardId: 'rubOne' }),
        ],
        visuals: ['addCardFromPlayerFadeIn'],
      },
      {
        timing: 'damageCalculation',
        effects: [],
        modifiers: [epDamageTakenMultiplier(2)],
      },
      {
        timing: 'playerEpPeak',
        effects: [
          effect('energyGain', 'player', 1, { onlyDuringPlayerTurn: true }),
          effect('removeStatus', 'player', 1, { status: 'Heat' }),
        ],
      },
    ],
  }),
  Frustrated: defineStatus({
    name: 'Frustrated',
    description: 'Frustrated: EP damage received is multiplied by 3. Clears at EP Peak and grants 1 energy.',
    remain: 1,
    allowedOwners: ['player'],
    iconText: 'Fr',
    iconColor: 0xd9466f,
    exclusiveGroup: 'arousal',
    groupRank: 3,
    triggers: [
      {
        timing: 'turnStart',
        order: 30,
        effects: [
          effect('addCardToHand', 'player', 5, { cardId: 'rubOne' }),
        ],
        visuals: ['addCardFromPlayerFadeIn'],
      },
      {
        timing: 'damageCalculation',
        effects: [],
        modifiers: [epDamageTakenMultiplier(3)],
      },
      {
        timing: 'playerEpPeak',
        effects: [
          effect('energyGain', 'player', 1, { onlyDuringPlayerTurn: true }),
          effect('removeStatus', 'player', 1, { status: 'Frustrated' }),
        ],
      },
    ],
  }),
  IntrudedA: defineStatus({
    name: 'IntrudedA',
    description: 'IntrudedA: At turn start, add Purge to hand. Purge removes this if it does not cause EP Peak, then you take 10 EP damage.',
    remain: 0,
    allowedOwners: ['enemy'],
    iconText: 'IA',
    iconColor: 0x86c75f,
    triggers: [
      {
        timing: 'turnStart',
        order: 40,
        effects: [
          effect('addCardToHand', 'player', 1, { cardId: 'purge', cardAddVariant: 'purgeForStatusOwner' }),
        ],
        visuals: ['addCardFromPlayerFadeIn'],
      },
      {
        timing: 'purgePlayed',
        conditions: { purgeCausedEpPeak: false },
        effects: [
          effect('removeStatus', 'triggerEnemy', 1, { status: 'IntrudedA' }),
          effect('epDamage', 'player', 10, { attackAttribute: 'love' }),
        ],
      },
    ],
  }),
  IntrudedV: defineStatus({
    name: 'IntrudedV',
    description: 'IntrudedV: At turn start, add Purge to hand. Purge removes this if it does not cause EP Peak, then you take 10 EP damage.',
    remain: 0,
    allowedOwners: ['enemy'],
    iconText: 'IV',
    iconColor: 0x6fbf73,
    triggers: [
      {
        timing: 'turnStart',
        order: 40,
        effects: [
          effect('addCardToHand', 'player', 1, { cardId: 'purge', cardAddVariant: 'purgeForStatusOwner' }),
        ],
        visuals: ['addCardFromPlayerFadeIn'],
      },
      {
        timing: 'purgePlayed',
        conditions: { purgeCausedEpPeak: false },
        effects: [
          effect('removeStatus', 'triggerEnemy', 1, { status: 'IntrudedV' }),
          effect('epDamage', 'player', 10, { attackAttribute: 'love' }),
        ],
      },
    ],
  }),
  InfestedA: defineStatus({
    name: 'InfestedA',
    description: 'InfestedA: At the start of your turn, take 1 EP damage.',
    remain: 1,
    allowedOwners: ['player'],
    iconText: 'FA',
    iconColor: 0xb7791f,
    triggers: [
      {
        timing: 'turnStart',
        order: 20,
        effects: [
          effect('epDamage', 'player', 1, { attackAttribute: 'love', perStack: true }),
        ],
      },
    ],
  }),
  InfestedV: defineStatus({
    name: 'InfestedV',
    description: 'InfestedV: At the start of your turn, take 1 EP damage.',
    remain: 1,
    allowedOwners: ['player'],
    iconText: 'FV',
    iconColor: 0xb45309,
    triggers: [
      {
        timing: 'turnStart',
        order: 20,
        effects: [
          effect('epDamage', 'player', 1, { attackAttribute: 'love', perStack: true }),
        ],
      },
    ],
  }),
};

export function statusTriggersForTiming(status: StatusEffect, timing: EffectTiming) {
  return STATUS_DESCRIPTIONS[status]?.triggers.filter((trigger) => trigger.timing === timing) ?? [];
}
