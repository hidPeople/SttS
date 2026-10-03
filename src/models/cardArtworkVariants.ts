/** Config keys put the part last, while asset names put it immediately after the card ID. */
export function cardArtworkSlot(cardId: string, slot: string, parts: readonly string[]) {
  const part = parts.find(part => slot.endsWith(part));
  const battleId = part ? slot.slice(0, -part.length) : slot;
  return { slot, battleId, part, file: `${cardId}${part ?? ''}_${battleId}.png` };
}

/** Prefer the requested part, then common art, then alternatives in data order, before normal. */
export function cardArtworkCandidates(cardId: string, battleId: string, parts: readonly string[], part?: string) {
  return [...new Set([battleId, 'normal'])].flatMap(battle =>
    [...new Set([...(part && parts.includes(part) ? [part] : []), '', ...parts])].map(variant => ({
      slot: battle + variant, battleId: battle, part: variant || undefined, file: `${cardId}${variant}_${battle}.png`,
    })));
}
