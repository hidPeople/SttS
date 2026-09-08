import { EP_DAMAGE_PARTS, type EpDamagePart } from '../models/types';
import { text as l, type LocalizedText } from '../models/localization';

export const BODY_PART_ALIASES = ['N', 'T', 'U'] as const;
export const BODY_PART_TOKENS = [...EP_DAMAGE_PARTS, ...BODY_PART_ALIASES] as const;

export type BodyPartAlias = typeof BODY_PART_ALIASES[number];
export type BodyPartToken = typeof BODY_PART_TOKENS[number];
export type BodyPartNameLevel = 0 | 1 | 2 | 3 | 4 | 5;
export type BodyPartNameConfig = {
  part: BodyPartToken;
  names: Record<BodyPartNameLevel, LocalizedText>;
};
export type BodyPartDefaultNameConfig = {
  part: BodyPartToken;
  name: LocalizedText;
};

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

export const BODY_PART_NAMES: BodyPartNameConfig[] = [
  {
    part: 'A',
    names: {
      0: l('A', 'A'),
      1: l('A', 'A'),
      2: l('A', 'A'),
      3: l('A', 'A'),
      4: l('A', 'A'),
      5: l('A', 'A'),
    },
  },
  {
    part: 'B',
    names: {
      0: l('B', 'B'),
      1: l('B', 'B'),
      2: l('B', 'B'),
      3: l('B', 'B'),
      4: l('B', 'B'),
      5: l('B', 'B'),
    },
  },
  {
    part: 'C',
    names: {
      0: l('C', 'C'),
      1: l('C', 'C'),
      2: l('C', 'C'),
      3: l('C', 'C'),
      4: l('C', 'C'),
      5: l('C', 'C'),
    },
  },
  {
    part: 'V',
    names: {
      0: l('V', 'V'),
      1: l('V', 'V'),
      2: l('V', 'V'),
      3: l('V', 'V'),
      4: l('V', 'V'),
      5: l('V', 'V'),
    },
  },
  {
    part: 'M',
    names: {
      0: l('M', 'M'),
      1: l('M', 'M'),
      2: l('M', 'M'),
      3: l('M', 'M'),
      4: l('M', 'M'),
      5: l('M', 'M'),
    },
  },
  {
    part: 'N',
    names: {
      0: l('N', 'N'),
      1: l('N', 'N'),
      2: l('N', 'N'),
      3: l('N', 'N'),
      4: l('N', 'N'),
      5: l('N', 'N'),
    },
  },
  {
    part: 'T',
    names: {
      0: l('T', 'T'),
      1: l('T', 'T'),
      2: l('T', 'T'),
      3: l('T', 'T'),
      4: l('T', 'T'),
      5: l('T', 'T'),
    },
  },
  {
    part: 'U',
    names: {
      0: l('U', 'U'),
      1: l('U', 'U'),
      2: l('U', 'U'),
      3: l('U', 'U'),
      4: l('U', 'U'),
      5: l('U', 'U'),
    },
  },
];

export const BODY_PART_DEFAULT_NAMES: BodyPartDefaultNameConfig[] = [
  { part: 'A', name: l('A', 'A') },
  { part: 'B', name: l('B', 'B') },
  { part: 'C', name: l('C', 'C') },
  { part: 'V', name: l('V', 'V') },
  { part: 'M', name: l('M', 'M') },
  { part: 'N', name: l('N', 'N') },
  { part: 'T', name: l('T', 'T') },
  { part: 'U', name: l('U', 'U') },
];

const BODY_PART_NAME_BY_PART = Object.fromEntries(
  BODY_PART_NAMES.map((definition) => [definition.part, definition.names]),
) as Record<BodyPartToken, Record<BodyPartNameLevel, LocalizedText>>;

const BODY_PART_DEFAULT_NAME_BY_PART = Object.fromEntries(
  BODY_PART_DEFAULT_NAMES.map((definition) => [definition.part, definition.name]),
) as Record<BodyPartToken, LocalizedText>;

export function isBodyPartToken(value: unknown): value is BodyPartToken {
  return typeof value === 'string' && (BODY_PART_TOKENS as readonly string[]).includes(value);
}

export function bodyPartStatPart(part: BodyPartToken): EpDamagePart {
  return BODY_PART_STAT_PART[part];
}

export function bodyPartName(part: BodyPartToken, level: BodyPartNameLevel): LocalizedText {
  return BODY_PART_NAME_BY_PART[part][level];
}

export function bodyPartDefaultName(part: BodyPartToken): LocalizedText {
  return BODY_PART_DEFAULT_NAME_BY_PART[part];
}
