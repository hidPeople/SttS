import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';

const server = await createServer({ optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
const { resolvePortraitTouch } = await server.ssrLoadModule('/src/models/portraitTouch.ts');
await server.close();

const radii = { sigil: 17, M: 17, B: 34, C: 17, V: 17, A: 17 };

test('portrait touch picks the closest configured coordinate', () => {
  const candidates = [{ target: 'M', x: 10, y: 0 }, { target: 'V', x: 2, y: 0 }];
  assert.deepEqual(resolvePortraitTouch({ x: 0, y: 0 }, candidates, radii, false), { target: 'V' });
  assert.equal(resolvePortraitTouch({ x: 40, y: 0 }, candidates, radii, false), undefined);
});

test('exact ties use sigil, M, B, C, V, A priority and head is the fallback', () => {
  const same = target => ({ target, x: 5, y: 5 });
  assert.deepEqual(resolvePortraitTouch({ x: 5, y: 5 }, ['A', 'V', 'C', 'B', 'M', 'sigil'].map(same), radii, true), { target: 'sigil' });
  assert.deepEqual(resolvePortraitTouch({ x: 5, y: 5 }, ['A', 'V', 'C', 'B'].map(same), radii, true), { target: 'B' });
  assert.deepEqual(resolvePortraitTouch({ x: 50, y: 50 }, [], radii, true), { target: 'head' });
});

test('each body part uses its own radius and B preserves the touched origin', () => {
  const candidates = [
    { target: 'M', x: 20, y: 0 },
    { target: 'B', bOrigin: 'B2', x: 20, y: 0 },
  ];
  assert.deepEqual(resolvePortraitTouch({ x: 0, y: 0 }, candidates, radii, false), { target: 'B', bOrigin: 'B2' });
});
