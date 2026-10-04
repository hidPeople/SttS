import { USER_SETTINGS } from './userSettings';

export type Language = 'en' | 'ja';

export type LocalizedText = string | {
  en: string;
  ja: string;
};

export const SETTINGS_STATE: { language: Language } = {
  get language() { return USER_SETTINGS.value.language; },
  set language(language: Language) { USER_SETTINGS.update({ language }); },
};

export function text(en: string, ja: string): LocalizedText {
  return { en, ja };
}

export function localize(value: LocalizedText, language = SETTINGS_STATE.language): string {
  if (typeof value === 'string') {
    return value;
  }

  return value[language] || value.en || value.ja;
}

export function englishText(value: LocalizedText): string {
  return typeof value === 'string' ? value : value.en;
}

export function toggleLanguage(): Language {
  SETTINGS_STATE.language = SETTINGS_STATE.language === 'en' ? 'ja' : 'en';
  return SETTINGS_STATE.language;
}
