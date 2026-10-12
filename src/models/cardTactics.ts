import type { CardDefinition, CardInstance, EffectDefinition } from './types';

/** The base registry is immutable. Growth belongs to one physical card, never its ID. */
export function choiceEffects(card: CardInstance | undefined, effect: EffectDefinition): EffectDefinition[] {
  const levels = card?.choiceGrowth?.[effect.textId ?? 'choice']?.levels ?? [];
  return (effect.choices ?? []).map((choice, index) => ({ ...choice, amount: choice.amount * (1 + (levels[index] ?? 0)) }));
}

export function growUnchosenEffects(card: CardInstance, effect: EffectDefinition, selected: number): void {
  const choices = effect.choices ?? [];
  if (selected < 0 || selected >= choices.length) return;
  const key = effect.textId ?? 'choice';
  const state = (card.choiceGrowth ??= {})[key] ??= { uses: 0, levels: choices.map(() => 0) };
  if (state.uses >= (effect.growthUses ?? 0)) return;
  state.uses++;
  choices.forEach((_, index) => { if (index !== selected) state.levels[index] = (state.levels[index] ?? 0) + 1; });
}

export function cardInstanceDefinition(card: CardInstance): CardDefinition {
  if (!card.choiceGrowth) return card.definition;
  return { ...card.definition, effects: card.definition.effects.map(effect => effect.kind === 'chooseEffect'
    ? { ...effect, choices: choiceEffects(card, effect) } : effect) };
}

export function transformCandidates(hand: readonly CardInstance[], cardId?: string): CardInstance[] {
  return hand.filter(card => card.generated && card.definition.id !== cardId);
}

/** Preview decisions never mutate or reorder the deck. Commit once, after confirmation. */
export class DeckInspectionSelection {
  readonly hand = new Set<string>();
  readonly discard = new Set<string>();
  constructor(readonly cards: readonly CardInstance[], readonly takeCount: number) {}
  get required(): number { return Math.min(this.takeCount, this.cards.length); }
  get valid(): boolean { return this.hand.size === this.required; }
  toggle(uid: string): void {
    if (!this.cards.some(card => card.uid === uid)) return;
    if (this.hand.delete(uid) || this.discard.delete(uid)) return;
    (this.hand.size < this.required ? this.hand : this.discard).add(uid);
  }
}
