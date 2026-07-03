import type { CardDefinition, CardInstance } from './types';

export class Deck {
  drawPile: CardInstance[];
  hand: CardInstance[] = [];
  discardPile: CardInstance[] = [];
  private nextUid = 1;

  constructor(cards: CardDefinition[]) {
    this.drawPile = cards.map((definition) => this.createCard(definition));
    this.shuffleDrawPile();
  }

  draw(count: number): CardInstance[] {
    const drawn: CardInstance[] = [];

    for (let i = 0; i < count; i += 1) {
      if (this.drawPile.length === 0) {
        this.shuffleDiscardIntoDrawPile();
      }

      const card = this.drawPile.shift();
      if (!card) {
        break;
      }

      this.hand.push(card);
      drawn.push(card);
    }

    return drawn;
  }

  discard(cardUid: string): CardInstance | undefined {
    const index = this.hand.findIndex((card) => card.uid === cardUid);
    if (index < 0) {
      return undefined;
    }

    const [card] = this.hand.splice(index, 1);
    this.discardPile.push(card);
    return card;
  }

  discardHand(): void {
    this.discardPile.push(...this.hand);
    this.hand = [];
  }

  addToHand(definition: CardDefinition): CardInstance {
    const card = this.createCard(definition);
    this.hand.push(card);
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
      const j = Math.floor(Math.random() * (i + 1));
      [this.drawPile[i], this.drawPile[j]] = [this.drawPile[j], this.drawPile[i]];
    }
  }
}
