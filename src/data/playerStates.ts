import type { ConditionDefinition } from '../models/types';
import { text as l, type LocalizedText } from '../models/localization';

export interface PlayerStateDefinition {
  name: LocalizedText;
  /** OR groups. Every condition inside one group must match. */
  anyOf: ConditionDefinition[][];
}

const definePlayerState = (definition: PlayerStateDefinition): PlayerStateDefinition => definition;

/** Broad player states used by flavor text. Add another key and OR group to extend it. */
export const PLAYER_STATE_CONDITIONS = {
  Breathless: definePlayerState({
    name: l('Breathless', '息も絶え絶え'),
    anyOf: [
      [{ kind: 'status', operator: 'has', target: 'player', statuses: ['MultipleOrgasms', 'OrgasmsHell', 'MultipleOrgasmsTorture'] }],
      [{ kind: 'status', operator: 'gte', target: 'player', status: 'Aftershocks', value: 10 }],
    ],
  }),
  Aroused: definePlayerState({
    name: l('Aroused', '興奮状態'),
    anyOf: [
      [{ kind: 'epPercent', operator: 'gte', target: 'player', value: 75 }],
      [{ kind: 'status', operator: 'has', target: 'player', statuses: ['Horny', 'InHeat', 'Frustrated', 'DesperateToCum'] }],
      [
        { kind: 'status', operator: 'gte', target: 'player', status: 'Aftershocks', value: 1 },
        { kind: 'status', operator: 'lte', target: 'player', status: 'Aftershocks', value: 9 },
      ],
    ],
  }),
  Gagged: definePlayerState({
    name: l('Gagged', '口がふさがれている'),
    anyOf: [
      [{ kind: 'bodyPartStatus', operator: 'has', parts: ['M'], bodyPartStatusKinds: ['insert'] }],
      [{ kind: 'bodyPartStatus', operator: 'has', parts: ['M'], bodyPartStatusKinds: ['intruded'] }],
    ],
  }),
};

export type PlayerState = keyof typeof PLAYER_STATE_CONDITIONS;
