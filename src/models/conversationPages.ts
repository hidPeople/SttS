import type { ConversationPage } from '../data/conversations';

/** Serializable facts captured when a conversation starts, also kept in novel saves. */
export interface ConversationContext {
  battleTurn?: number;
}

/** No battle context means full playback (gallery, title previews and legacy saves). */
export function selectConversationPages(pages: readonly ConversationPage[], context?: ConversationContext): ConversationPage[] {
  const turn = context?.battleTurn;
  return pages.filter(({ showWhen }) => turn === undefined || !showWhen || (
    (showWhen.minBattleTurn === undefined || turn >= showWhen.minBattleTurn)
    && (showWhen.maxBattleTurn === undefined || turn <= showWhen.maxBattleTurn)
  ));
}
