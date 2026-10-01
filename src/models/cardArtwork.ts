import { CARD_ARTWORK, type CardArtworkSet, type CardArtwork } from '../data/cardAppearance';
export { cardArtworkPlacement } from './cardArtworkGeometry';

/** No gameplay dependency: all display surfaces resolve the same battle override. */
export function resolveCardArtwork(cardId: string, battleId: string, availableFiles: ReadonlySet<string>, registry: Record<string, CardArtworkSet> = CARD_ARTWORK): (CardArtwork & { file: string }) | undefined {
  for (const id of new Set([battleId, 'normal'])) {
    const file = `${cardId}_${id}.png`;
    if (availableFiles.has(file)) return { ...registry[cardId]?.[id], file };
  }
  return undefined;
}
