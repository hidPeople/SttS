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
  const state = { mode: 'all', stacks: 1, enemies: { V: v, A: a } };
  const sync = bindPortraitIdleMotion(portrait, () => state.mode, part => state.enemies[part], () => state.stacks);
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
  state.mode = 'paused';
  advance(4000);
  assert.deepEqual([portrait.x, portrait.y, v.x, v.y], [0, 0, 0, 0]);
  state.mode = 'all';
  advance(20);
  assert.equal(a.x, 0); assert.equal(v.x, 0); assert.notEqual(portrait.y, 0);
  advance(500);
  assert.equal(a.x, 0); assert.equal(v.x, 0); assert.ok(portrait.y === 0);
});

test('aftershock frequency increases linearly to three times at ten stacks, including repeat intervals', () => {
  for (const stacks of [1, 4, 7, 10, 20]) {
    const { state, portrait, advance } = setup();
    state.enemies = {};
    state.stacks = stacks;
    const rate = 1 + (Math.min(stacks, 10) - 1) * 2 / 9;
    const interval = Math.ceil(2000 / rate / 10) * 10;
    advance(interval - 10);
    assert.ok(portrait.y === 0);
    advance(10);
    assert.ok(portrait.y !== 0);
    advance(interval - 10);
    assert.ok(portrait.y === 0);
    advance(10);
    assert.ok(portrait.y !== 0);
  }
});

test('enemy turn lets the ongoing connection finish and starts only player aftershocks', () => {
  const { state, advance, portrait, v, a } = setup();
  advance(2050);
  state.mode = 'aftershocksOnly';
  advance(100);
  assert.ok(v.x < 0 && portrait.x < 0);
  advance(320);
  assert.equal(v.x, 0);
  assert.ok(portrait.x === 0 && portrait.y !== 0);
  for (let i = 0; i < 300; i++) {
    advance(10);
    assert.equal(v.x, 0); assert.equal(a.x, 0);
  }
  state.mode = 'all';
  advance(20);
  assert.ok(a.x < 0);
});

test('breath keeps its phase across turns and blends out and back during a portrait reaction', t => {
  const height = config.breathHeight;
  t.after(() => { config.breathHeight = height; });
  config.breathHeight = 3;
  const idle = setup(), battle = setup();
  for (const h of [idle, battle]) { h.state.enemies = {}; h.state.stacks = 0; }
  const step = ms => { idle.advance(ms); battle.advance(ms); };
  step(700);
  battle.state.mode = 'aftershocksOnly';
  step(200);
  assert.equal(battle.portrait.y, idle.portrait.y);
  battle.state.mode = 'reaction';
  step(40);
  assert.ok(battle.portrait.y < 0 && Math.abs(battle.portrait.y) < Math.abs(idle.portrait.y));
  step(150);
  assert.ok(battle.portrait.y === 0);
  battle.state.mode = 'aftershocksOnly';
  step(160);
  assert.equal(battle.portrait.y, idle.portrait.y);
});

test('stack changes rescale only the remaining wait and zero stacks cancel it', () => {
  const { state, sync, portrait, advance } = setup();
  state.enemies = {};
  advance(500);
  state.stacks = 10; sync();
  advance(250);
  state.stacks = 1; sync();
  advance(740);
  assert.ok(portrait.y === 0);
  advance(10);
  assert.ok(portrait.y !== 0);
  state.stacks = 0; sync();
  advance(2010);
  assert.ok(portrait.y === 0);
});
