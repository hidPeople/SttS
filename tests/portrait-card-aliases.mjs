import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
const { PortraitSelection } = await server.ssrLoadModule('/src/models/portraitSelection.ts');
const { PORTRAIT_FACTORS } = await server.ssrLoadModule('/src/data/portraitFactors.ts');
const { CHARACTER_PORTRAIT_CARD_ALIASES } = await server.ssrLoadModule('/src/data/characterPortraits.ts');
await server.close();

test('card aliases share selection, preload, hover and interrupted history without copying definitions', () => {
  const id = tag => `Succubus_tutorial_${tag}_1`;
  const ids = ['idle', 'Starvation_rubOneOut', 'Starvation_rubOneOut_hover', 'Starvation_rubOneOut_EPdamage'].map(id);
  const selection = new PortraitSelection(ids, PORTRAIT_FACTORS, () => 0, CHARACTER_PORTRAIT_CARD_ALIASES);
  const context = { playerId: 'Succubus', category: 'tutorial', statuses: new Set(['Starvation']), relics: new Set(), hpRatio: 1, epRatio: 0, lastCardId: 'rubOne' };
  assert.equal(selection.select(context), id('Starvation_rubOneOut'));
  assert.deepEqual(selection.preloadIds(context), [id('Starvation_rubOneOut'), id('Starvation_rubOneOut_hover')]);
  assert.equal(selection.select({ ...context, hovered: true }), id('Starvation_rubOneOut_hover'));
  const end = selection.begin('EPdamage');
  assert.equal(selection.select(context), id('Starvation_rubOneOut_EPdamage'));
  end();
  assert.equal(selection.select(context), id('Starvation_rubOneOut'));
  assert.equal(selection.select({ ...context, lastCardId: 'rubOneOut' }), id('Starvation_rubOneOut'));
  assert.equal(context.lastCardId, 'rubOne');
  assert.equal(selection.select({ ...context, lastCardId: undefined }), id('idle'));
  assert.equal(selection.select({ ...context, lastCardId: 'strike' }), id('idle'));
});
