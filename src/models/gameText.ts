import { BODY_PART_TOKENS, bodyPartDefaultName } from '../data/bodyParts';
import { localize, SETTINGS_STATE, type Language, type LocalizedText } from './localization';

export type GameTextReplacements = Readonly<Record<string, string>>;

export function localizeGameText(
  value: LocalizedText,
  language: Language = SETTINGS_STATE.language,
  contextualReplacements?: GameTextReplacements | (() => GameTextReplacements),
): string {
  const localized = localize(value, language);
  if (!localized.includes('{')) {
    return localized;
  }

  const defaultBodyPartReplacements: Record<string, string> = {};
  for (const part of BODY_PART_TOKENS) {
    defaultBodyPartReplacements[`default${part}`] = localize(bodyPartDefaultName(part), language);
  }

  const replace = (text: string, replacements: GameTextReplacements) => Object.entries(replacements).reduce(
    (result, [key, replacement]) => result.split(`{${key}}`).join(replacement),
    text,
  );
  const withDefaultBodyParts = replace(localized, defaultBodyPartReplacements);
  if (!withDefaultBodyParts.includes('{') || !contextualReplacements) {
    return withDefaultBodyParts;
  }

  const replacements = typeof contextualReplacements === 'function'
    ? contextualReplacements()
    : contextualReplacements;
  return replace(withDefaultBodyParts, replacements);
}
