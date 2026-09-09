import { EP_DAMAGE_PARTS, type EpDamagePart } from '../models/types';
import { text as l, type LocalizedText } from '../models/localization';

export const BODY_PART_ALIASES = ['AI', 'VI', 'N', 'b', 'MI', 'U'] as const;
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
  AI: 'A',
  VI: 'V',
  N: 'B',
  b: 'C',
  MI: 'M',
  U: 'V',
};

export const BODY_PART_NAMES: BodyPartNameConfig[] = [
  {
    part: 'A',
    names: {
      // 0: l('A', 'A'),
      // 1: l('A', 'A'),
      // 2: l('A', 'A'),
      // 3: l('A', 'A'),
      // 4: l('A', 'A'),
      // 5: l('A', 'A'),
      0: l('anal', 'アナル'),
      1: l('Sensitive anal', '敏感アナル'),
      2: l('Conditioned anal', 'よわよわアナル'),
      3: l('Fully developed anal', '開発済みアナル'),
      4: l('Corrupted anal', '完堕ちアナル'),
      5: l('Hopelessly broken anal', '壊れたざこアナル'),
    },
  },
  {
    part: 'B',
    names: {
      // 0: l('B', 'B'),
      // 1: l('B', 'B'),
      // 2: l('B', 'B'),
      // 3: l('B', 'B'),
      // 4: l('B', 'B'),
      // 5: l('B', 'B'),
      0: l('breasts', '胸'),
      1: l('Soft and sensitive breasts', '柔らかく敏感な胸'),
      2: l('Hypersensitive breasts', '敏感すぎる胸'),
      3: l('Fully developed breasts', '開発済みの胸'),
      4: l('Debauched breasts', '快楽漬けの胸'),
      5: l('Hopelessly broken breasts', '壊れた淫乳'),
    },
  },
  {
    part: 'C',
    names: {
      // 0: l('C', 'C'),
      // 1: l('C', 'C'),
      // 2: l('C', 'C'),
      // 3: l('C', 'C'),
      // 4: l('C', 'C'),
      // 5: l('C', 'C'),
      0: l('clit', 'クリトリス'),
      1: l('Sensitive clit', '敏感クリトリス'),
      2: l('Conditioned clit', 'よわよわクリトリス'),
      3: l('Fully developed clit', '開発済みクリトリス'),
      4: l('Debauched clit', '快楽漬けクリトリス'),
      5: l('Hopelessly broken clit', '壊れたざこクリ'),
    },
  },
  {
    part: 'V',
    names: {
      // 0: l('V', 'V'),
      // 1: l('V', 'V'),
      // 2: l('V', 'V'),
      // 3: l('V', 'V'),
      // 4: l('V', 'V'),
      // 5: l('V', 'V'),
      0: l('pussy', 'まんこ'),
      1: l('Sensitive pussy', '敏感まんこ'),
      2: l('Conditioned pussy', 'よわよわまんこ'),
      3: l('Fully developed pussy', '開発済みまんこ'),
      4: l('Corrupted pussy', '完堕ちまんこ'),
      5: l('Hopelessly broken pussy', '壊れたざこまんこ'),
    },
  },
  {
    part: 'M',
    names: {
      // 0: l('M', 'M'),
      // 1: l('M', 'M'),
      // 2: l('M', 'M'),
      // 3: l('M', 'M'),
      // 4: l('M', 'M'),
      // 5: l('M', 'M'),
      0: l('mouth', '口'),
      1: l('Sensitive mouth', '敏感な口内'),
      2: l('Easily pleasured mouth', '性器と化した口内'),
      3: l('Fully developed mouth', '快楽調教済み口内'),
      4: l('Corrupted mouth', '完堕ちくちまんこ'),
      5: l('Hopelessly broken mouth', '壊されたくちまんこ'),
    },
  },
  {
    part: 'AI',
    names: {
      // 0: l('AI', 'AI'),
      // 1: l('AI', 'AI'),
      // 2: l('AI', 'AI'),
      // 3: l('AI', 'AI'),
      // 4: l('AI', 'AI'),
      // 5: l('AI', 'AI'),
      0: l('ass', '直腸'),
      1: l('Sensitiveass', '敏感な直腸'),
      2: l('Easily pleasured ass', '性器と化した直腸'),
      3: l('Fully developed ass', '開発済みの直腸'),
      4: l('Corrupted ass', '完堕ちけつまんこ'),
      5: l('Hopelessly broken ass', '壊されたけつまんこ'),
    },
  },
  {
    part: 'VI',
    names: {
      // 0: l('VI', 'VI'),
      // 1: l('VI', 'VI'),
      // 2: l('VI', 'VI'),
      // 3: l('VI', 'VI'),
      // 4: l('VI', 'VI'),
      // 5: l('VI', 'VI'),
      0: l('pussy', '膣内'),
      1: l('Soft and sensitive pussy', '柔らかく敏感な膣内'),
      2: l('Hypersensitive pussy', '敏感すぎる膣内'),
      3: l('Fully developed pussy', '開発済みの膣内'),
      4: l('Debauched pussy', '快楽漬けの膣穴'),
      5: l('Hopelessly broken pussy', '壊れた淫壺'),
    },
  },
  {
    part: 'N',
    names: {
      // 0: l('N', 'N'),
      // 1: l('N', 'N'),
      // 2: l('N', 'N'),
      // 3: l('N', 'N'),
      // 4: l('N', 'N'),
      // 5: l('N', 'N'),
      0: l('nipples', '乳首'),
      1: l('Sensitive nipples', '敏感乳首'),
      2: l('Conditioned nipples', 'よわよわ乳首'),
      3: l('Fully developed nipples', '開発済み乳首'),
      4: l('Corrupted nipples', '完堕ち乳首'),
      5: l('Hopelessly broken nipples', '壊れたざこ乳首'),
    },
  },
  {
    part: 'b',
    names: {
      // 0: l('b', 'b'),
      // 1: l('b', 'b'),
      // 2: l('b', 'b'),
      // 3: l('b', 'b'),
      // 4: l('b', 'b'),
      // 5: l('b', 'b'),
      0: l('tits', 'おっぱい'),
      1: l('Sensitive tits', '敏感おっぱい'),
      2: l('Conditioned tits', 'よわよわおっぱい'),
      3: l('Fully developed tits', '開発済みおっぱい'),
      4: l('Corrupted tits', '完堕ちおっぱい'),
      5: l('Hopelessly broken tits', 'ダメになったおっぱい'),
    },
  },
  {
    part: 'MI',
    names: {
      // 0: l('MI', 'MI'),
      // 1: l('MI', 'MI'),
      // 2: l('MI', 'MI'),
      // 3: l('MI', 'MI'),
      // 4: l('MI', 'MI'),
      // 5: l('MI', 'MI'),
      0: l('throat', '喉奥'),
      1: l('Sensitive throat', '敏感な喉奥'),
      2: l('Easily pleasured throat', '性器と化した喉奥'),
      3: l('Fully developed throat', '快楽調教済みの喉奥'),
      4: l('Corrupted throat', '完堕ち喉まんこ'),
      5: l('Hopelessly broken throat', '壊された喉まんこ'),
    },
  },
  {
    part: 'U',
    names: {
      // 0: l('U', 'U'),
      // 1: l('U', 'U'),
      // 2: l('U', 'U'),
      // 3: l('U', 'U'),
      // 4: l('U', 'U'),
      // 5: l('U', 'U'),
      0: l('womb', '子宮'),
      1: l('Pleasure-awakened womb', '快楽を知った子宮'),
      2: l('Sensitive womb', '敏感な子宮'),
      3: l('Fully developed womb', '開発済みの子宮'),
      4: l('Corrupted womb', '完堕ち萌袋'),
      5: l('Hopelessly broken womb', '壊された淫袋'),
    },
  },
];

export const BODY_PART_DEFAULT_NAMES: BodyPartDefaultNameConfig[] = [
  // { part: 'A', name: l('A', 'A') },
  // { part: 'B', name: l('B', 'B') },
  // { part: 'C', name: l('C', 'C') },
  // { part: 'V', name: l('V', 'V') },
  // { part: 'M', name: l('M', 'M') },
  // { part: 'N', name: l('N', 'N') },
  // { part: 'MI', name: l('MI', 'MI') },
  // { part: 'U', name: l('U', 'U') },
  { part: 'A', name: l('anal', 'アナル') },
  { part: 'B', name: l('breasts', '胸') },
  { part: 'C', name: l('clit', 'クリトリス') },
  { part: 'V', name: l('pussy', 'まんこ') },
  { part: 'M', name: l('mouth', '口') },
  { part: 'AI', name: l('ass', '直腸') },
  { part: 'VI', name: l('pussy', '膣内') },
  { part: 'N', name: l('nipples', '乳首') },
  { part: 'b', name: l('tits', 'おっぱい') },
  { part: 'MI', name: l('throat', '喉奥') },
  { part: 'U', name: l('womb', '子宮') },
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
