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
const { ICON_APPEARANCE } = await server.ssrLoadModule('/src/data/ui.ts');
await server.close();
const peakScale = ICON_APPEARANCE.relicActivation.scale;

// Execute the real Phaser TweenChain without a renderer.
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
  const icons = [0, 1].map(() => Object.assign(new EventEmitter(), {
    active: true, scaleX: 1, setScale(n) { this.scaleX = n; },
  }));
  return { scene, icons, chains,
    tick(ms) { for (let t = 0; t < ms; t += 10) for (const chain of chains) chain.update(10); },
    shutdown() { active = false; scene.events.emit('shutdown'); },
  };
}
const stateOf = chain => chain.data[0].targets[0];

for (const speed of [1, 2]) test(`activation is nonblocking and cleans up at ${speed}x speed`, () => {
  const h = harness(speed);
  assert.equal(playRelicActivation(h.scene, h.icons), undefined);
  assert.equal(h.chains.length, 2, 'all icons start immediately in the same frame');
  h.tick(80);
  assert.equal(h.icons[0].scaleX, h.icons[1].scaleX, 'simultaneous activations remain synchronized');
  h.tick(1000);
  assert.deepEqual(h.icons.map(icon => icon.scaleX), [1, 1]);
  assert.equal(h.scene.events.listenerCount('shutdown'), 0);
  for (const icon of h.icons) assert.equal(icon.listenerCount('destroy'), 0);
});

test('retrigger cancels the old flash, keeps enlarged size and does not restart other relics', () => {
  const h = harness(); playRelicActivation(h.scene, h.icons); h.tick(230);
  const first = h.chains[0], other = h.chains[1];
  assert.equal(h.icons[0].scaleX, peakScale); assert.ok(stateOf(first).glow > 0);
  playRelicActivation(h.scene, [h.icons[0], h.icons[0]]);
  assert.equal(h.chains.length, 3, 'duplicate IDs do not create multiple timelines');
  assert.equal(first.isPendingRemove(), true);
  assert.equal(other.isPendingRemove(), false);
  const current = h.chains[2];
  assert.equal(stateOf(current).glow, 0); assert.equal(h.icons[0].scaleX, peakScale);
  assert.equal(current.totalData, 3, 'no extra enlargement phase');
  h.tick(100); assert.ok(stateOf(current).glow > 0);
  h.tick(1000); assert.deepEqual(h.icons.map(icon => icon.scaleX), [1, 1]);
});

test('rapid repeated activations keep size and only the final flash shrinks', () => {
  const h = harness(); playRelicActivation(h.scene, [h.icons[0]]); h.tick(230);
  for (let i = 0; i < 20; i++) {
    playRelicActivation(h.scene, [h.icons[0]]);
    assert.equal(stateOf(h.chains.at(-1)).glow, 0);
    h.tick(70);
    assert.equal(h.icons[0].scaleX, peakScale);
    assert.ok(stateOf(h.chains.at(-1)).glow > 0);
    assert.equal(h.chains.filter(chain => !chain.isPendingRemove()).length, 1);
    assert.equal(h.scene.events.listenerCount('shutdown'), 1);
  }
  h.tick(1000); assert.equal(h.icons[0].scaleX, 1);
  assert.equal(h.scene.events.listenerCount('shutdown'), 0);
});

test('retrigger during enlargement or shrink resumes smoothly from the current size', () => {
  for (const phase of ['grow', 'shrink']) {
    const h = harness(); playRelicActivation(h.scene, [h.icons[0]]);
    if (phase === 'grow') h.tick(60);
    else {
      for (let i = 0; i < 90 && h.chains[0].currentIndex < 3; i++) h.tick(10);
      h.tick(60);
    }
    const size = h.icons[0].scaleX;
    assert.ok(size > 1 && size < peakScale);
    playRelicActivation(h.scene, [h.icons[0]]);
    assert.equal(h.icons[0].scaleX, size, 'no jump to normal size or full size');
    h.tick(180); assert.equal(h.icons[0].scaleX, peakScale);
    h.tick(1000); assert.equal(h.icons[0].scaleX, 1);
  }
});

test('shutdown, icon destruction and external stop discard animations without a queue', () => {
  for (const exit of ['shutdown', 'destroy', 'stop']) {
    const h = harness(); playRelicActivation(h.scene, [h.icons[0]]); h.tick(80);
    playRelicActivation(h.scene, [h.icons[0]]);
    if (exit === 'shutdown') h.shutdown();
    else if (exit === 'destroy') { h.icons[0].active = false; h.icons[0].emit('destroy'); }
    else h.chains.at(-1).stop();
    assert.ok(h.chains.every(chain => chain.isPendingRemove()));
    assert.equal(h.scene.events.listenerCount('shutdown'), 0);
    assert.equal(h.icons[0].listenerCount('destroy'), 0);
    if (exit !== 'destroy') assert.equal(h.icons[0].scaleX, 1);
    if (exit !== 'stop') { playRelicActivation(h.scene, [h.icons[0]]); assert.equal(h.chains.length, 2); }
  }
});
