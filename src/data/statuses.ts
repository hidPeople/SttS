import type { EffectTiming, StatusEffect } from '../models/types';

export interface StatusDefinition {
  name: StatusEffect;
  description: string;
  timing: EffectTiming | EffectTiming[];
  remain: 0 | 1;
}

export const STATUS_DESCRIPTIONS: Record<StatusEffect, StatusDefinition> = {
  Charm: {
    name: 'Charm',
    description: 'Charm: The next enemy attack targets EP instead of HP. One stack is consumed when it takes effect.',
    timing: ['turnStart'],
    remain: 0,
  },
  Lingering: {
    name: 'Lingering',
    description: 'Lingering: At the start of your turn, lose 1 energy per stack while energy remains.',
    timing: ['turnStart'],
    remain: 0,
  },
  Horny: {
    name: 'Horny',
    description: 'Horny: EP damage received is multiplied by 1.5. Clears at EP Peak and grants 1 energy.',
    timing: ['turnStart', 'damageCalculation', 'playerEpPeak'],
    remain: 1,
  },
  Heat: {
    name: 'Heat',
    description: 'Heat: EP damage received is multiplied by 2. Clears at EP Peak and grants 1 energy.',
    timing: ['turnStart', 'damageCalculation', 'playerEpPeak'],
    remain: 1,
  },
  Frustrated: {
    name: 'Frustrated',
    description: 'Frustrated: EP damage received is multiplied by 3. Clears at EP Peak and grants 1 energy.',
    timing: ['turnStart', 'damageCalculation', 'playerEpPeak'],
    remain: 1,
  },
  IntrudedA: {
    name: 'IntrudedA',
    description: 'IntrudedA: At turn start, add Purge to hand. Purge removes this if it does not cause EP Peak, then you take 10 EP damage.',
    timing: ['turnStart', 'purgePlayed'],
    remain: 0,
  },
  IntrudedV: {
    name: 'IntrudedV',
    description: 'IntrudedV: At turn start, add Purge to hand. Purge removes this if it does not cause EP Peak, then you take 10 EP damage.',
    timing: ['turnStart', 'purgePlayed'],
    remain: 0,
  },
  InfestedA: {
    name: 'InfestedA',
    description: 'InfestedA: At the start of your turn, take 1 EP damage.',
    timing: ['turnStart'],
    remain: 1,
  },
  InfestedV: {
    name: 'InfestedV',
    description: 'InfestedV: At the start of your turn, take 1 EP damage.',
    timing: ['turnStart'],
    remain: 1,
  },
};
