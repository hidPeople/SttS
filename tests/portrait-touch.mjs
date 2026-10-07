import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';

const server = await createServer({ optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
const { resolvePortraitTouch } = await server.ssrLoadModule('/src/models/portraitTouch.ts');
await server.close();

test('portrait touch picks the closest configured coordinate', () => {
  const candidates = [{ target: 'M', x: 10, y: 0 }, { target: 'V', x: 2, y: 0 }];
  assert.equal(resolvePortraitTouch({ x: 0, y: 0 }, candidates, 20, false), 'V');
  assert.equal(resolvePortraitTouch({ x: 40, y: 0 }, candidates, 20, false), undefined);
});

test('exact ties use sigil, M, B, C, V, A priority and head is the fallback', () => {
  const same = target => ({ target, x: 5, y: 5 });
  assert.equal(resolvePortraitTouch({ x: 5, y: 5 }, ['A', 'V', 'C', 'B', 'M', 'sigil'].map(same), 10, true), 'sigil');
  assert.equal(resolvePortraitTouch({ x: 5, y: 5 }, ['A', 'V', 'C', 'B'].map(same), 10, true), 'B');
  assert.equal(resolvePortraitTouch({ x: 50, y: 50 }, [], 10, true), 'head');
});
