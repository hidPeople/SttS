import { BODY_PART_TOKENS, bodyPartDefaultName } from '../data/bodyParts';
import { localize, SETTINGS_STATE, type Language, type LocalizedText } from './localization';

export type GameTextReplacements = Readonly<Record<string, string>>;

function isSentenceStart(text: string, index: number): boolean {
  const precedingText = text.slice(0, index);
  return /(?:^|[.!?]["'”’\)\]]*[ \t]+|\r?\n)[ \t]*(?:[-*•][ \t]+)?["'“‘\(\[]*$/.test(precedingText);
}

function capitalizeEnglishReplacement(replacement: string, text: string, index: number, language: Language): string {
  if (language !== 'en' || !isSentenceStart(text, index)) {
    return replacement;
  }
  return replacement.replace(/^\p{Ll}/u, (initial) => initial.toLocaleUpperCase('en-US'));
}

function replacePlaceholders(text: string, replacements: GameTextReplacements, language: Language): string {
  return text.replace(/\{([^{}]+)\}/g, (placeholder, key: string, index: number, source: string) => {
    const replacement = replacements[key];
    return replacement === undefined
      ? placeholder
      : capitalizeEnglishReplacement(replacement, source, index, language);
  });
}

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

  const withDefaultBodyParts = replacePlaceholders(localized, defaultBodyPartReplacements, language);
  if (!withDefaultBodyParts.includes('{') || !contextualReplacements) {
    return withDefaultBodyParts;
  }

  const replacements = typeof contextualReplacements === 'function'
    ? contextualReplacements()
    : contextualReplacements;
  return replacePlaceholders(withDefaultBodyParts, replacements, language);
}
