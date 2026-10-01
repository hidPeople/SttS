import { CARD_ARTWORK, CARD_ARTWORK_VARIANTS, type CardArtworkEntry, type CardArtworkSet, type CardArtwork } from '../data/cardAppearance';
import { cardArtworkCandidates } from './cardArtworkVariants';
export { cardArtworkPlacement } from './cardArtworkGeometry';

/** Resolve aliases before choosing a battle image; keep card name, rarity and effects independent. */
export function resolveCardArtworkSource(cardId: string, registry: Record<string, CardArtworkEntry> = CARD_ARTWORK):
  { cardId: string; settings: CardArtworkSet; chain: string[]; error?: undefined } | { error: string; chain: string[] } {
  const chain: string[] = [];
  while (true) {
    if (chain.includes(cardId)) return { error: `カード画像の循環参照: ${[...chain, cardId].join(' → ')}`, chain };
    chain.push(cardId);
    if (!Object.prototype.hasOwnProperty.call(registry, cardId)) {
      if (chain.length > 1) return { error: `カード画像の参照先が未登録です: ${chain.join(' → ')}`, chain };
      return { cardId, settings: {}, chain };
    }
    const entry = registry[cardId];
    if (typeof entry !== 'string') return { cardId, settings: entry, chain };
    cardId = entry;
  }
}

/** No gameplay dependency: all display surfaces resolve the same battle override. */
export function resolveCardArtwork(cardId: string, battleId: string, availableFiles: ReadonlySet<string>, registry: Record<string, CardArtworkEntry> = CARD_ARTWORK, part?: string, variants: Record<string, readonly string[]> = CARD_ARTWORK_VARIANTS): (CardArtwork & { file: string }) | undefined {
  const source = resolveCardArtworkSource(cardId, registry);
  if (source.error !== undefined) return undefined;
  for (const { file, slot } of cardArtworkCandidates(source.cardId, battleId, variants[source.cardId] ?? [], part)) {
    if (availableFiles.has(file)) return { ...source.settings[slot], file };
  }
  return undefined;
}
