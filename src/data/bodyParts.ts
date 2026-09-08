import { EP_DAMAGE_PARTS, type EpDamagePart } from '../models/types';
import { text as l, type LocalizedText } from '../models/localization';

export const BODY_PART_ALIASES = ['N', 'T', 'U'] as const;
export const BODY_PART_TOKENS = [...EP_DAMAGE_PARTS, ...BODY_PART_ALIASES] as const;

export type BodyPartAlias = typeof BODY_PART_ALIASES[number];
export type BodyPartToken = typeof BODY_PART_TOKENS[number];
export type BodyPartNameLevel = 0 | 1 | 2 | 3 | 4 | 5;

export const BODY_PART_STAT_PART: Record<BodyPartToken, EpDamagePart> = {
  A: 'A',
  B: 'B',
  C: 'C',
  V: 'V',
  M: 'M',
  N: 'B',
  T: 'M',
  U: 'V',
};

export const BODY_PART_NAMES: Record<BodyPartToken, Record<BodyPartNameLevel, LocalizedText>> = BODY_PART_TOKENS.reduce(
  (definitions, token) => {
    definitions[token] = {
      0: l(token, token),
      1: l(token, token),
      2: l(token, token),
      3: l(token, token),
      4: l(token, token),
      5: l(token, token),
    };
    return definitions;
  },
  {} as Record<BodyPartToken, Record<BodyPartNameLevel, LocalizedText>>,
);

export function isBodyPartToken(value: unknown): value is BodyPartToken {
  return typeof value === 'string' && (BODY_PART_TOKENS as readonly string[]).includes(value);
}

export function bodyPartStatPart(part: BodyPartToken): EpDamagePart {
  return BODY_PART_STAT_PART[part];
}
