import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { EventEmitter } from 'node:events';
import { createServer } from 'vite';

const require = createRequire(import.meta.url);
const buildChain = require('phaser/src/tweens/builders/TweenChainBuilder');
const buildTween = require('phaser/src/tweens/builders/TweenBuilder');
const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
const { playRelicActivation } = await server.ssrLoadModule('/src/ui/relicActivation.ts');
await server.close();

// Use Phaser's actual TweenChain/Tween implementation, without rendering a scene.
function harness(speed = 1) {
  const chains = [];
  const manager = {
    timeScale: speed,
    create: configs => configs.map(config => buildTween(manager, config)),
    chain: config => { const chain = buildChain(manager, config).init(); chains.push(chain); return chain; },
    remove: tween => tween.setRemovedState(),
  };
  let active = true;
  const scene = { events: new EventEmitter(), sys: { isActive: () => active }, tweens: manager };
  const icons = [0, 1].map(() => ({ active: true, scale: 1, setScale(n) { this.scale = n; } }));
  return { scene, icons, chains, shutdown() { active = false; scene.events.emit('shutdown'); } };
}
const flush = () => new Promise(resolve => setImmediate(resolve));

for (const speed of [1, 2]) test(`activation resolves and lets battle effects continue at ${speed}x speed`, async () => {
  const h = harness(speed);
  let continued = false;
  const task = playRelicActivation(h.scene, h.icons).then(() => { continued = true; });
  await flush();
  assert.equal(h.chains.length, 1, 'simultaneous relics use one chain');
  for (let elapsed = 0; elapsed < 1000 && !continued; elapsed += 10) {
    h.chains[0].update(10);
    await flush();
  }
  assert.equal(continued, true, 'battle must not wait indefinitely for the animation');
  await task;
  assert.deepEqual(h.icons.map(icon => icon.scale), [1, 1]);
  assert.equal(h.scene.events.listenerCount('shutdown'), 0);
});

test('stopping an activation releases the next queued activation', async () => {
  const h = harness();
  const first = playRelicActivation(h.scene, h.icons);
  const second = playRelicActivation(h.scene, h.icons);
  await flush();
  assert.equal(h.chains.length, 1);
  h.chains[0].stop();
  await first; await flush();
  assert.equal(h.chains.length, 2);
  for (let elapsed = 0; elapsed < 1000; elapsed += 10) h.chains[1].update(10);
  await second;
  assert.equal(h.scene.events.listenerCount('shutdown'), 0);
});

test('scene shutdown releases current and queued activations without starting another chain', async () => {
  const h = harness();
  const first = playRelicActivation(h.scene, h.icons);
  const second = playRelicActivation(h.scene, h.icons);
  await flush();
  h.chains[0].update(10);
  h.shutdown();
  await Promise.all([first, second]);
  assert.equal(h.chains.length, 1);
  assert.deepEqual(h.icons.map(icon => icon.scale), [1, 1]);
  assert.equal(h.scene.events.listenerCount('shutdown'), 0);
});
