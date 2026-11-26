import test from 'node:test';
import assert from 'node:assert/strict';
import EventEmitter from 'eventemitter3';
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
const { bindPortraitIdleMotion } = await server.ssrLoadModule('/src/ui/portraitIdleMotion.ts');
const { PORTRAIT_IDLE_MOTION: config } = await server.ssrLoadModule('/src/data/ui.ts');
await server.close();
Object.assign(config, { breathHeight: 0, accentMinIntervalMs: 2000, accentMaxIntervalMs: 2000, connectionLeadMs: 100 });

function layer() {
  return Object.assign(new EventEmitter(), {
    active: true, x: 0, y: 0,
    setPosition(x, y) { this.x = x; this.y = y; },
  });
}
function setup() {
  const events = new EventEmitter(), portrait = layer(), v = layer(), a = layer();
  portrait.scene = { events };
  const state = { movable: true, aftershock: true, enemies: { V: v, A: a } };
  const sync = bindPortraitIdleMotion(portrait, () => state.movable, part => state.enemies[part], () => state.aftershock);
  return { portrait, v, a, state, sync, advance(ms) {
    for (let elapsed = 0; elapsed < ms; elapsed += 10) events.emit('update', 0, 10);
  } };
}

test('simultaneously due connections and aftershocks run in turn, with the connected enemy leading', () => {
  const { portrait, v, a, advance } = setup();
  advance(2050);
  assert.ok(v.x < 0 && v.y < 0);
  assert.equal(a.x, 0); assert.ok(portrait.x === 0);
  advance(100);
  assert.ok(portrait.x < 0 && portrait.y < 0);
  advance(320);
  assert.equal(v.x, 0); assert.ok(a.x < 0 && a.y < 0);
  assert.equal(portrait.x, 0);
  advance(100);
  assert.ok(portrait.x > 0 && portrait.y < 0);
  advance(300);
  assert.equal(a.x, 0); assert.equal(portrait.x, 0); assert.notEqual(portrait.y, 0);
});

test('disconnecting cancels queued movements and interruptions reset both actors without accumulating elapsed time', () => {
  const { portrait, v, a, state, sync, advance } = setup();
  advance(2050);
  delete state.enemies.A;
  sync();
  state.movable = false;
  advance(4000);
  assert.deepEqual([portrait.x, portrait.y, v.x, v.y], [0, 0, 0, 0]);
  state.movable = true;
  advance(20);
  assert.equal(a.x, 0); assert.equal(v.x, 0); assert.notEqual(portrait.y, 0);
  advance(500);
  assert.equal(a.x, 0); assert.equal(v.x, 0); assert.ok(portrait.y === 0);
});
