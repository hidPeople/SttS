import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
const { PortraitSelection } = await server.ssrLoadModule('/src/models/portraitSelection.ts');
const { PORTRAIT_FACTORS } = await server.ssrLoadModule('/src/data/portraitFactors.ts');
await server.close();
const id = tag => `Succubus_tutorial_${tag}_1`;
const cardFirst = id('Starvation_rubOneOut_Horny'), statusFirst = id('Starvation_Horny_rubOneOut');
const context = () => ({ playerId: 'Succubus', category: 'tutorial', statuses: new Set(['Starvation']), relics: new Set(), hpRatio: 1, epRatio: 0 });
const selector = (ids = [cardFirst, statusFirst]) => new PortraitSelection(ids, PORTRAIT_FACTORS, () => 0, { rubOne: 'rubOneOut' });

test('card effect adds Horny after card start; an existing Horny precedes card use', () => {
  for (const existing of [false, true]) {
    const s = selector(), c = context();
    s.select(c); // Track factors even when there is no matching image yet.
    if (existing) c.statuses.add('Horny');
    c.lastCardId = 'rubOne';
    s.recordCardUse(c);
    c.statuses.add('Horny');
    assert.equal(s.select(c), existing ? statusFirst : cardFirst);
    assert.equal(s.select(c), existing ? statusFirst : cardFirst);
  }
});

test('reusing a card updates order and invalidates an older same-condition history entry', () => {
  const s = selector(), c = context();
  c.lastCardId = 'rubOneOut'; s.recordCardUse(c);
  c.statuses.add('Horny'); assert.equal(s.select(c), cardFirst);
  s.recordCardUse(c); assert.equal(s.select(c), statusFirst);
  c.statuses.delete('Horny'); s.select(c);
  c.statuses.add('Horny'); assert.equal(s.select(c), cardFirst);
  c.lastCardId = undefined; s.select(c);
  c.lastCardId = 'rubOneOut'; s.recordCardUse(c);
  assert.equal(s.select(c), statusFirst);
});

test('sole order remains eligible, and ordinary factor priority wins over chronology', () => {
  for (const only of [cardFirst, statusFirst]) {
    const s = selector([only]), c = context();
    c.statuses.add('Horny'); s.select(c);
    c.lastCardId = 'rubOneOut'; s.recordCardUse(c);
    assert.equal(s.select(c), only);
  }
  const s = selector([cardFirst, statusFirst, id('Fainted')]), c = context();
  c.statuses.add('Horny'); s.select(c);
  c.lastCardId = 'rubOneOut'; s.recordCardUse(c);
  assert.equal(s.select(c), statusFirst);
  c.statuses.add('Fainted'); assert.equal(s.select(c), id('Fainted'));
  c.statuses.delete('Fainted'); assert.equal(s.select(c), statusFirst);
});

test('preloading all order variants never changes actual activation order', () => {
  const s = selector(), c = context(); s.select(c);
  const projected = { ...c, lastCardId: 'rubOne', statuses: new Set([...c.statuses, 'Horny']) };
  assert.deepEqual(s.preloadIds(projected), [cardFirst, statusFirst]);
  c.lastCardId = 'rubOne'; s.recordCardUse(c);
  c.statuses.add('Horny'); assert.equal(s.select(c), cardFirst);
});

test('same-update factors are tied, order-specific variants retain randomness, clear resets chronology', () => {
  const second = cardFirst.replace(/_1$/, '_2');
  const s = selector([cardFirst, second, statusFirst]), c = context();
  c.lastCardId = 'rubOneOut'; s.recordCardUse(c);
  c.statuses.add('Horny'); assert.equal(s.select(c), cardFirst);
  c.statuses.delete('Horny'); s.select(c);
  c.statuses.add('Horny'); assert.equal(s.select(c), second);
  s.recordCardUse(c); assert.equal(s.select(c), statusFirst);
  s.clear();
  assert.equal(s.select(c), cardFirst); // All factors observed together, no stale ordering.
});

test('event interruptions restore matching order; split comparison suffixes form one normalized tag', () => {
  const forward = id('Aftershocksgte5_rubOneOut'), reverse = id('rubOneOut_Aftershocks_gte5');
  const interruption = id('Aftershocksgte5_rubOneOut_orgasm');
  const s = selector([forward, reverse, interruption]), c = context();
  c.statusStacks = new Map([['Aftershocks', 5]]); c.statuses.add('Aftershocks'); s.select(c);
  c.lastCardId = 'rubOneOut'; s.recordCardUse(c); assert.equal(s.select(c), forward);
  const end = s.begin('orgasm'); assert.equal(s.select(c), interruption);
  end(); assert.equal(s.select(c), forward);
});
