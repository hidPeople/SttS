import type { CardDefinition, CardInstance } from './types';
import type { DeckSnapshot, SavedCardInstance } from './battleSave';

export class Deck {
  drawPile: CardInstance[];
  hand: CardInstance[] = [];
  discardPile: CardInstance[] = [];
  private nextUid = 1;

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
    return card;
  }

  vanish(cardUid: string): CardInstance | undefined {
    return this.removeFromHand(cardUid);
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

  discardHand(): void {
    this.discardPile.push(...this.hand.filter((card) => !card.definition.temporary));
    this.hand = [];
  }

  addToHand(definition: CardDefinition, maxHandSize = Number.POSITIVE_INFINITY): CardInstance {
    const card = this.createCard(definition);
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
    return { uid, definition };
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
    const save = (cards: CardInstance[]): SavedCardInstance[] => cards.map(card => ({ uid: card.uid, cardId: card.definition.id, link: link?.(card.definition) }));
    return { drawPile: save(this.drawPile), hand: save(this.hand), discardPile: save(this.discardPile), nextUid: this.nextUid };
  }

  restore(snapshot: DeckSnapshot, definitions: Record<string, CardDefinition>, resolve?: (card: SavedCardInstance) => CardDefinition | undefined): void {
    const load = (cards: SavedCardInstance[]): CardInstance[] => cards.flatMap(card => {
      const definition = resolve ? resolve(card) : definitions[card.cardId];
      return definition ? [{ uid: card.uid, definition }] : [];
    });
    this.drawPile = load(snapshot.drawPile);
    this.hand = load(snapshot.hand);
    this.discardPile = load(snapshot.discardPile);
    this.nextUid = Math.max(snapshot.nextUid, 1);
  }
}
