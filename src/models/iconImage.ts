import { localize, type LocalizedText, type Language } from './localization';
import { ICON_APPEARANCE } from '../data/ui';
import type { StatusDefinition } from './types';

export type IconKind = 'Status' | 'Relic';
export interface IconDefinition {
  iconImage?: string;
  iconText?: LocalizedText;
  iconColor?: number;
  name?: LocalizedText;
}

/** References remain within their own registry; only the final image is shared. */
export function resolveIconFile(id: string, files: ReadonlySet<string>, definitions: Record<string, IconDefinition>): string | undefined {
  const seen = new Set<string>();
  while (Object.prototype.hasOwnProperty.call(definitions, id)) {
    if (seen.has(id)) return undefined;
    seen.add(id);
    const reference = definitions[id].iconImage;
    if (reference !== undefined) { id = reference; continue; }
    const file = `${id}.png`;
    return files.has(file) ? file : undefined;
  }
  return undefined;
}

export function iconFallbackText(kind: IconKind, id: string, definition: IconDefinition, language?: Language): string {
  if (definition.iconText !== undefined) return localize(definition.iconText, language);
  return (kind === 'Relic' && definition.name !== undefined ? localize(definition.name, language) : id)
    .slice(0, ICON_APPEARANCE.fallbackTextLength);
}

export function iconTextureKey(kind: IconKind, file: string): string { return `icon:${kind}:${file}`; }

/** 固定期間・毎ターン1消費は残りターン。エナジーごとに消費する余韻等はスタック。 */
export function statusIconCount(definition: Pick<StatusDefinition, 'durationTurns' | 'consumeEachTurn' | 'triggers'>, count: number): string {
  if (count <= 0) return '';
  const turns = Boolean(definition.durationTurns) || (definition.consumeEachTurn === 1
    && !definition.triggers.some(trigger => trigger.consumeRule === 'allWhileEnergy'));
  if (!turns && count <= 1) return '';
  const style = ICON_APPEARANCE.statusCounter;
  return `${turns ? style.turnPrefix : style.stackPrefix}${Math.min(count, ICON_APPEARANCE.maxDisplayedStacks)}`;
}
