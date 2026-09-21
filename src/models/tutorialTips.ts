import type { TutorialTipDefinition, TutorialTipPage, TutorialEnemyState } from '../data/tutorialTips';

export interface TutorialTipSnapshot {
  battleId: string;
  turn: number;
  ready: boolean;
  cards: string[];
  enemies: { index: number; states: TutorialEnemyState[] }[];
}
export interface TutorialTipMatch { definition: TutorialTipDefinition; page: TutorialTipPage; enemyIndex?: number }

/** Per-battle one-shot selection and scene-time inactivity clock (including Ctrl speed), independent of rendering. */
export class TutorialTipRuntime {
  private shown = new Set<string>();
  private turn = -1;
  private elapsed = 0;
  private lastTime?: number;
  private wasReady = false;
  constructor(private definitions: readonly TutorialTipDefinition[]) {}

  next(snapshot: TutorialTipSnapshot, now: number): TutorialTipMatch | undefined {
    if (this.turn !== snapshot.turn) { this.turn = snapshot.turn; this.elapsed = 0; this.wasReady = false; }
    if (snapshot.ready && this.wasReady && this.lastTime !== undefined) this.elapsed += Math.max(0, now - this.lastTime);
    this.lastTime = now;
    this.wasReady = snapshot.ready;
    if (!snapshot.ready) return;
    for (const definition of this.definitions) {
      if (this.shown.has(definition.id) || definition.battleId !== snapshot.battleId) continue;
      if (definition.turn !== undefined && definition.turn !== snapshot.turn) continue;
      if (this.elapsed < (definition.delayMs ?? 0)) continue;
      const page = definition.pages[0];
      if (!page) continue;
      if (page.position.anchor === 'card' && !snapshot.cards.includes(page.position.cardId ?? '')) continue;
      const enemy = definition.enemyState ? snapshot.enemies.find(e => e.states.includes(definition.enemyState!)) : undefined;
      if (definition.enemyState && !enemy) continue;
      if (page.position.anchor === 'enemyIntent' && !enemy) continue;
      return { definition, page, enemyIndex: enemy?.index };
    }
  }

  markShown(id: string): void { this.shown.add(id); }
}
