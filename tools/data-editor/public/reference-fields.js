/** Shared by editor dropdowns, definition links and server-side reference validation. */
export const REFERENCE_FIELDS = {
  iconImage: ['statuses', 'key'],
  highlightPlayerStatuses: ['statuses', 'key'],
  highlightCardId: ['cards', 'key'],
  battleId: ['battles', 'key'],
  cards: ['cards', 'key'],
  cardId: ['cards', 'key'],
  startingDeckIds: ['cards', 'key'],
  cardIds: ['cards', 'key'],
  relicId: ['relics', 'key'],
  requiredRelic: ['relics', 'key'],
  relicIds: ['relics', 'key'],
  retainedBlockRelicIds: ['relics', 'key'],
  excludedRelicIds: ['relics', 'key'],
  relics: ['relics', 'key'],
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
  if (declaration === 'CHARACTER_PORTRAIT_CARD_ALIASES') return ['cards', 'key'];
  if (key === 'iconImage' && declaration === 'RELIC_DEFINITIONS') return ['relics', 'key'];
  return REFERENCE_FIELDS[key];
}
