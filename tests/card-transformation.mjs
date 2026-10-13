import test from 'node:test';
import assert from 'node:assert/strict';
import EventEmitter from 'eventemitter3';
import { createServer } from 'vite';

const server = await createServer({ optimizeDeps: { noDiscovery: true }, server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
const { animateCardTransformation } = await server.ssrLoadModule('/src/ui/cardTransformation.ts');
await server.close();

function fixture() {
  const active = new Set();
  const scene = { events: new EventEmitter(), tweens: {
    add(config) { const tween = { config, remove() { active.delete(tween); } }; active.add(tween); return tween; },
    killTweensOf(target) { for (const tween of active) if (tween.config.targets === target) tween.remove(); },
  } };
  const card = Object.assign(new EventEmitter(), { active: true, scaleX: 1, scaleY: 1, alpha: 1,
    setScale(x, y) { this.scaleX = x; this.scaleY = y; return this; },
    setAlpha(alpha) { this.alpha = alpha; return this; },
  });
  return { scene, card, active };
}

test('hover layout cancelling card tweens cannot cancel the awaited transformation', async () => {
  const { scene, card, active } = fixture();
  const pending = animateCardTransformation(scene, card, .04, .35, 180, 'Sine.easeIn');
  scene.tweens.killTweensOf(card);
  assert.equal(active.size, 1);
  const { config } = [...active][0];
  Object.assign(config.targets, { scaleX: .5, alpha: .7 }); config.onUpdate();
  assert.equal(card.scaleX, .5); assert.equal(card.alpha, .7);
  config.onComplete();
  assert.equal(await pending, true); assert.equal(card.scaleX, .04); assert.equal(card.alpha, .35);
  assert.equal(active.size, 0); assert.equal(scene.events.listenerCount('shutdown'), 0);
  assert.equal(card.listenerCount('destroy'), 0);
});

for (const cancellation of ['destroy', 'shutdown', 'stop']) test(`transformation resolves safely on ${cancellation}`, async () => {
  const { scene, card, active } = fixture();
  const pending = animateCardTransformation(scene, card, 1, 1, 240, 'Back.easeOut');
  if (cancellation === 'stop') [...active][0].config.onStop();
  else (cancellation === 'destroy' ? card : scene.events).emit(cancellation);
  assert.equal(await pending, false); assert.equal(active.size, 0);
  assert.equal(scene.events.listenerCount('shutdown'), 0); assert.equal(card.listenerCount('destroy'), 0);
});
