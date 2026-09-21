/** Shared by editor dropdowns, definition links and server-side reference validation. */
export const REFERENCE_FIELDS = {
  highlightCardId: ['cards', 'key'],
  battleId: ['battles', 'key'],
  cards: ['cards', 'id'],
  cardId: ['cards', 'key'],
  startingDeckIds: ['cards', 'key'],
  cardIds: ['cards', 'id'],
  relicId: ['relics', 'id'],
  relicIds: ['relics', 'id'],
  relics: ['relics', 'id'],
  sprite: ['enemySprites', 'key'],
  spriteId: ['characterSprites', 'key'],
  spriteIds: ['effectSprites', 'key'],
  conversationId: ['conversations', 'key'],
  deckIds: ['cards', 'key'],
  enemyIds: ['enemies', 'id'],
};
