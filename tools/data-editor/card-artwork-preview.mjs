import { analyze } from './schema.mjs';
import { literal } from './public/sprite-values.js';
import { resolveCardArtworkSource } from './card-artwork-reference.mjs';

/** Read data/geometry literals from the current drafts; never execute edited source. */
export function cardArtworkPreviewConfig(program, root, cardId) {
  const read = file => Object.fromEntries(analyze(program, root, file).declarations.filter(d => !d.typeDefinition).map(d => [d.name, literal(d.node)]));
  const cards = analyze(program, root, 'src/data/cards.ts').declarations.find(d => d.name === 'CARD_DEFINITIONS').node;
  const card = cards.entries.find(e => e.key === cardId || literal(e.node.kind === 'call' ? e.node.args[0] : e.node)?.id === cardId)?.node;
  const input = card?.kind === 'call' ? card.args[0] : card;
  const data = literal(input) ?? {};
  const name = input?.entries?.find(e => e.key === 'name')?.node;
  const layout = read('src/ui/cardPresentation.ts');
  const appearance = read('src/data/cardAppearance.ts');
  const artwork = resolveCardArtworkSource(cardId, appearance.CARD_ARTWORK);
  if (artwork.error !== undefined) throw Error(artwork.error);
  const colors = read('src/data/cardCategories.ts').CARD_CATEGORY_COLORS;
  return {
    artworkCardId: artwork.cardId, artworkSettings: artwork.settings, artworkReferences: artwork.chain.slice(1),
    width: layout.CARD_WIDTH, height: layout.CARD_HEIGHT, title: layout.CARD_NAME_PANEL,
    bodyY: layout.CARD_BODY_Y, bodyHeight: layout.CARD_BODY_PANEL_HEIGHT,
    frame: appearance.CARD_FRAME, finish: appearance.CARD_RARITY_FINISH[data.rarity ?? 'common'],
    accent: colors[data.categories?.[0]] ?? colors.utility,
    name: name?.kind === 'call' ? literal(name.args[1]) : data.name?.ja ?? cardId,
    cost: data.cost ?? 0,
  };
}
