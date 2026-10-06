/** Shared by editor dropdowns, definition links and server-side reference validation. */
export const REFERENCE_FIELDS = {
  iconImage: ['statuses', 'key'],
  highlightPlayerStatuses: ['statuses', 'key'],
  highlightCardId: ['cards', 'key'],
  battleId: ['battles', 'key'],
  cards: ['cards', 'id'],
  cardId: ['cards', 'key'],
  startingDeckIds: ['cards', 'key'],
  cardIds: ['cards', 'id'],
  relicId: ['relics', 'id'],
  requiredRelic: ['relics', 'id'],
  relicIds: ['relics', 'id'],
  retainedBlockRelicIds: ['relics', 'id'],
  excludedRelicIds: ['relics', 'key'],
  relics: ['relics', 'id'],
  sprite: ['enemySprites', 'key'],
  spriteId: ['characterSprites', 'key'],
  spriteIds: ['effectSprites', 'key'],
  conversationId: ['conversations', 'key'],
  introConversationId: ['conversations', 'key'],
  battleStartConversationId: ['conversations', 'key'],
  victoryConversationId: ['conversations', 'key'],
  deckIds: ['cards', 'key'],
  enemyIds: ['enemies', 'id'],
};

/** Image references use the enclosing definition's namespace. */
export function referenceFieldRule(key, declaration) {
  if (declaration === 'CHARACTER_PORTRAIT_CARD_ALIASES') return ['cards', 'id'];
  if (key === 'iconImage' && declaration === 'RELIC_DEFINITIONS') return ['relics', 'id'];
  return REFERENCE_FIELDS[key];
}
