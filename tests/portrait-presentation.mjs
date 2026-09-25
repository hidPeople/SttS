import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createServer } from 'vite';

// Use Vite for the asset registry's import.meta.glob, just as the game does.
const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
const modules = Object.assign({}, ...await Promise.all([
  '/src/ui/portraitFlash.ts', '/src/ui/playerPortrait.ts', '/src/data/ui.ts',
].map(path => server.ssrLoadModule(path))));
await server.close();
function runtime() { return modules; }

class Display {
  constructor() {
    Object.assign(this, { active: true, visible: true, x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, alpha: 1, originX: 0.5, originY: 0, flipX: false, flipY: false, cameraFilter: 0, tintFill: false });
    this.setTexture('default', '__BASE'); this.setTint(0xffffff);
  }
  add(child) { this.child = child; return this; }
  setDepth(depth) { this.depth = depth; return this; }
  removeFromDisplayList() { this.displayList?.remove(this); this.displayList = null; return this; }
  destroy() { if (!this.ignoreDestroy) { this.active = false; this.removeFromDisplayList(); } }
  setTexture(key, name) { this.texture = { key }; this.frame = { name }; return this; }
  setPosition(x, y) { Object.assign(this, { x, y }); return this; }
  setScale(scaleX, scaleY = scaleX) { Object.assign(this, { scaleX, scaleY }); return this; }
  setRotation(rotation) { this.rotation = rotation; return this; }
  setAlpha(alpha) { this.alpha = alpha; return this; }
  setVisible(visible) { this.visible = visible; return this; }
  setOrigin(originX, originY) { Object.assign(this, { originX, originY }); return this; }
  setFlip(flipX, flipY) { Object.assign(this, { flipX, flipY }); return this; }
  setTint(tintTopLeft, tintTopRight = tintTopLeft, tintBottomLeft = tintTopLeft, tintBottomRight = tintTopLeft) {
    Object.assign(this, { tintTopLeft, tintTopRight, tintBottomLeft, tintBottomRight, tintFill: false }); return this;
  }
}
function sceneMock() {
  const tweens = [];
  const scene = {
    events: new EventEmitter(), game: { events: new EventEmitter() }, cameras: { cameras: [{ id: 1 }] },
    add: { container: () => new Display(), sprite: (x, y, key, frame) => new Display().setTexture(key, frame) },
    tweens: { add(config) {
      const tween = { config, step(ms) { config.targets.elapsed = ms; config.onUpdate(); }, repeat() { config.onRepeat(); }, complete() { config.onComplete(); }, stop() { config.onStop(); } };
      tweens.push(tween); return tween;
    } },
  };
  return { scene, tweens };
}

test('reward uses the same portrait object and restores or destroys it with its owner', () => {
  const { bringPlayerPortraitForward, hidePlayerPortrait } = runtime();
  const list = () => ({ items: [], add(item) { this.items.push(item); item.displayList = this; }, remove(item) { this.items = this.items.filter(i => i !== item); } });
  const battle = { events: new EventEmitter() }, originalList = list(), rewardList = list();
  const reward = { events: new EventEmitter(), sys: { displayList: rewardList } };
  const source = new Display().setPosition(145, 172).setScale(1.8).setDepth(2), body = new Display();
  source.scene = battle; source.add(body); originalList.add(source);
  const front = bringPlayerPortraitForward(reward, source);
  assert.equal(front, source); assert.equal(originalList.items.length, 0); assert.deepEqual(rewardList.items, [source]);
  source.setPosition(153, 188); body.setTexture('alternate-pose', 3);
  assert.equal(front.y, 188); assert.equal(front.child.texture.key, 'alternate-pose');
  const restore = hidePlayerPortrait(source); assert.equal(source.visible, false); restore(); assert.equal(source.visible, true);
  // Phaser destroys a scene display list before emitting later shutdown listeners.
  source.destroy(); assert.equal(source.active, true); rewardList.items = [];
  reward.events.emit('shutdown');
  assert.deepEqual(originalList.items, [source]); assert.equal(source.depth, 2);
  assert.equal(battle.events.listenerCount('shutdown'), 0);
  bringPlayerPortraitForward(reward, source);
  battle.events.emit('shutdown'); reward.events.emit('shutdown');
  assert.equal(source.active, false); assert.equal(rewardList.items.length, 0); assert.equal(originalList.items.length, 0);
});

test('damage pulses preserve image detail and opacity, return to original tint, and clean up when superseded', async () => {
  const { PortraitFlash, PLAYER_PORTRAIT_FLASH: config } = runtime(), { scene, tweens } = sceneMock();
  const body = new Display().setAlpha(0.8).setTint(0xeefaff);
  const flash = new PortraitFlash(scene, body), damage = flash.damage();
  assert.equal(body.tintFill, false); assert.equal(body.tintTopLeft, config.damageColor); assert.equal(body.alpha, 0.8);
  tweens[0].step(100); assert.equal(body.tintTopLeft, 0xeefaff);
  tweens[0].repeat(); assert.equal(body.tintTopLeft, config.damageColor);
  const peak = flash.peak(1, 80); await damage;
  assert.equal(body.tintTopLeft, config.peakColor);
  // A stale completion must not clear the replacement pulse.
  tweens[0].complete(); assert.equal(body.tintTopLeft, config.peakColor);
  scene.events.emit('shutdown'); await peak;
  assert.equal(body.tintTopLeft, 0xeefaff); assert.equal(body.alpha, 0.8);
});

test('each accelerated Peak has a shorter colored interval followed by an uncolored interval', async () => {
  const { PortraitFlash, PLAYER_PORTRAIT_FLASH: config } = runtime(), { scene, tweens } = sceneMock();
  const body = new Display(), flash = new PortraitFlash(scene, body);
  for (const duration of [200, 100, 48, 24]) {
    const done = flash.peak(1, duration), tween = tweens.at(-1);
    assert.equal(tween.config.duration, duration);
    const boundary = Math.min(config.maxTintDuration, duration * config.tintRatio);
    tween.step(boundary - 0.1); assert.equal(body.tintTopLeft, config.peakColor);
    tween.step(boundary); assert.equal(body.tintTopLeft, 0xffffff);
    assert.ok(duration - boundary >= duration * 0.55 - 1e-9);
    assert.equal(body.alpha, 1);
    tween.complete(); await done; assert.equal(body.tintTopLeft, 0xffffff);
  }
});
