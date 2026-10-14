import type { CardDefinition, CardInstance } from './types';
import type { DeckSnapshot, SavedCardInstance } from './battleSave';

export class Deck {
  drawPile: CardInstance[];
  hand: CardInstance[] = [];
  discardPile: CardInstance[] = [];
  exhaustedPile: CardInstance[] = [];
  private nextUid = 1;
  onDiscard?: (cards: CardInstance[]) => void; // Non-play discards only; no callbacks during restore.

  constructor(cards: CardDefinition[], private random: () => number = Math.random) {
    this.drawPile = cards.map((definition) => this.createCard(definition));
    this.shuffleDrawPile();
  }

  draw(count: number, maxHandSize = Number.POSITIVE_INFINITY): CardInstance[] {
    const drawn: CardInstance[] = [];

    for (let i = 0; i < count; i += 1) {
      if (this.drawPile.length === 0) {
        this.shuffleDiscardIntoDrawPile();
      }

      const card = this.drawPile.shift();
      if (!card) {
        break;
      }

      if (this.hand.length >= maxHandSize) {
        this.discardPile.push(card);
        this.onDiscard?.([card]);
      } else {
        this.hand.push(card);
        drawn.push(card);
      }
    }

    return drawn;
  }

  discard(cardUid: string): CardInstance | undefined {
    const card = this.removeFromHand(cardUid);
    if (!card) {
      return undefined;
    }
    this.discardPile.push(card);
    this.onDiscard?.([card]);
    return card;
  }

  vanish(cardUid: string): CardInstance | undefined {
    const card = this.removeFromHand(cardUid);
    if (card) this.addToExhausted(card);
    return card;
  }

  addToExhausted(card: CardInstance): void {
    if (!this.exhaustedPile.some(existing => existing.uid === card.uid)) this.exhaustedPile.push(card);
  }

  removeFromHand(cardUid: string): CardInstance | undefined {
    const index = this.hand.findIndex((card) => card.uid === cardUid);
    if (index < 0) {
      return undefined;
    }

    const [card] = this.hand.splice(index, 1);
    return card;
  }

  addToDiscard(card: CardInstance): void {
    this.discardPile.push(card);
  }

  discardHand(keep: ReadonlySet<string> = new Set()): void {
    const discarded = this.hand.filter(card => !keep.has(card.uid) && !card.definition.temporary);
    this.discardPile.push(...discarded);
    this.hand.filter(card => card.definition.temporary).forEach(card => this.addToExhausted(card));
    this.hand = this.hand.filter(card => keep.has(card.uid) && !card.definition.temporary);
    if (discarded.length) this.onDiscard?.(discarded);
  }

  recallFromDiscard(maxHandSize: number): CardInstance[] {
    const recalled = this.discardPile.filter(card => card.definition.recallFromDiscard === 'playerOrgasm')
      .slice(0, Math.max(0, maxHandSize - this.hand.length));
    this.detachCards(recalled);
    this.hand.push(...recalled);
    return recalled;
  }

  copyToHand(source: CardInstance, relicId: string, maxHandSize: number): CardInstance | undefined {
    if (this.hand.length >= maxHandSize) return;
    const card = this.addToHand({ ...source.definition, cost: 0, temporary: true }, maxHandSize);
    card.copiedByRelic = relicId;
    card.overrides = { cost: 0, temporary: true };
    card.choiceGrowth = source.choiceGrowth ? structuredClone(source.choiceGrowth) : undefined;
    return card;
  }

  addToHand(definition: CardDefinition, maxHandSize = Number.POSITIVE_INFINITY): CardInstance {
    const card = this.createCard(definition);
    card.generated = true;
    if (this.hand.length >= maxHandSize) {
      this.discardPile.push(card);
    } else {
      this.hand.push(card);
    }
    return card;
  }

  private createCard(definition: CardDefinition): CardInstance {
    const uid = `${definition.id}-${this.nextUid}`;
    this.nextUid += 1;
    return { uid, definition, generated: false };
  }

  removeCards(cards: readonly CardInstance[]): void {
    const active = new Set([...this.hand, ...this.drawPile, ...this.discardPile].map(card => card.uid));
    cards.filter(card => active.has(card.uid)).forEach(card => this.addToExhausted(card));
    this.detachCards(cards);
  }

  private detachCards(cards: readonly CardInstance[]): void {
    const ids = new Set(cards.map(card => card.uid));
    this.hand = this.hand.filter(card => !ids.has(card.uid));
    this.drawPile = this.drawPile.filter(card => !ids.has(card.uid));
    this.discardPile = this.discardPile.filter(card => !ids.has(card.uid));
  }

  transform(card: CardInstance, definition: CardDefinition): void {
    card.definition = definition;
    card.choiceGrowth = undefined;
    card.copiedByRelic = undefined;
    card.overrides = undefined;
    card.generated = true;
  }

  resolveInspection(candidates: readonly CardInstance[], hand: ReadonlySet<string>, discard: ReadonlySet<string>, maxHandSize: number): CardInstance[] {
    const moving = candidates.filter(card => hand.has(card.uid) || discard.has(card.uid));
    this.detachCards(moving);
    const drawn: CardInstance[] = [];
    for (const card of moving) {
      if (hand.has(card.uid) && this.hand.length < maxHandSize) { this.hand.push(card); drawn.push(card); }
      else if (!card.definition.temporary || hand.has(card.uid)) { this.discardPile.push(card); this.onDiscard?.([card]); }
      else this.addToExhausted(card);
    }
    return drawn;
  }

  private shuffleDiscardIntoDrawPile(): void {
    if (this.discardPile.length === 0) {
      return;
    }

    this.drawPile = [...this.discardPile];
    this.discardPile = [];
    this.shuffleDrawPile();
  }

  private shuffleDrawPile(): void {
    for (let i = this.drawPile.length - 1; i > 0; i -= 1) {
      const j = Math.floor(this.random() * (i + 1));
      [this.drawPile[i], this.drawPile[j]] = [this.drawPile[j], this.drawPile[i]];
    }
  }

  snapshot(link?: (definition: CardDefinition) => SavedCardInstance['link']): DeckSnapshot {
    const save = (cards: CardInstance[]): SavedCardInstance[] => cards.map(card => ({ uid: card.uid, cardId: card.definition.id, generated: card.generated ?? false, copiedByRelic: card.copiedByRelic, overrides: card.overrides, choiceGrowth: card.choiceGrowth ? structuredClone(card.choiceGrowth) : undefined, link: link?.(card.definition) }));
    return { drawPile: save(this.drawPile), hand: save(this.hand), discardPile: save(this.discardPile), exhaustedPile: save(this.exhaustedPile), nextUid: this.nextUid };
  }

  restore(snapshot: DeckSnapshot, definitions: Record<string, CardDefinition>, resolve?: (card: SavedCardInstance) => CardDefinition | undefined): void {
    const load = (cards: SavedCardInstance[]): CardInstance[] => cards.flatMap(card => {
      const definition = resolve ? resolve(card) : definitions[card.cardId];
      return definition ? [{ uid: card.uid, definition: card.overrides ? { ...definition, ...card.overrides } : definition, generated: card.generated ?? false, copiedByRelic: card.copiedByRelic, overrides: card.overrides, choiceGrowth: card.choiceGrowth ? structuredClone(card.choiceGrowth) : undefined }] : [];
    });
    this.drawPile = load(snapshot.drawPile);
    this.hand = load(snapshot.hand);
    this.discardPile = load(snapshot.discardPile);
    this.exhaustedPile = load(snapshot.exhaustedPile ?? []);
    this.nextUid = Math.max(snapshot.nextUid, 1);
  }
}
