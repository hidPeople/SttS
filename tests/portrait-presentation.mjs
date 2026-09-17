import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function runtime() {
  const cache = new Map();
  function load(relative) {
    const filename = path.resolve(root, relative);
    if (cache.has(filename)) return cache.get(filename);
    const source = fs.readFileSync(filename, 'utf8').replaceAll('import.meta.url', JSON.stringify(pathToFileURL(filename).href));
    const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
    const module = { exports: {} }; cache.set(filename, module.exports);
    new Function('require', 'module', 'exports', js)(name => load(path.resolve(path.dirname(filename), name + '.ts')), module, module.exports);
    return module.exports;
  }
  return { ...load('src/ui/portraitFlash.ts'), ...load('src/ui/playerPortrait.ts'), ...load('src/data/ui.ts') };
}

class Display {
  constructor() {
    Object.assign(this, { active: true, visible: true, x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, alpha: 1, originX: 0.5, originY: 0, flipX: false, flipY: false, cameraFilter: 0, tintFill: false });
    this.setTexture('default', '__BASE'); this.setTint(0xffffff);
  }
  add(child) { this.child = child; return this; }
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

test('reward portrait mirrors live pose, texture/frame and tint, then releases its subscription and camera mask', () => {
  const { addPlayerPortraitMirror } = runtime(), { scene } = sceneMock();
  const source = new Display().setPosition(145, 172).setScale(1.8), body = new Display();
  source.scene = { cameras: { cameras: [{ id: 1 }, { id: 2 }] } }; source.cameraFilter = 8;
  const mirror = addPlayerPortraitMirror(scene, source, body);
  assert.equal(mirror.y, 172); assert.equal(mirror.scaleY, 1.8); assert.equal(source.cameraFilter, 11);
  source.setPosition(153, 188).setRotation(0.2).setAlpha(0.7);
  body.setTexture('alternate-pose', 3).setPosition(-8, 23).setScale(0.4, 0.6).setOrigin(0.2, 0.1).setFlip(true, false).setTint(0xffc9e3);
  scene.game.events.emit('prerender');
  assert.equal(mirror.x, 153); assert.equal(mirror.y, 188); assert.equal(mirror.rotation, 0.2); assert.equal(mirror.alpha, 0.7);
  assert.equal(mirror.child.texture.key, 'alternate-pose'); assert.equal(mirror.child.frame.name, 3);
  assert.equal(mirror.child.y, 23); assert.equal(mirror.child.scaleX, 0.4); assert.equal(mirror.child.scaleY, 0.6);
  assert.equal(mirror.child.originX, 0.2); assert.equal(mirror.child.flipX, true); assert.equal(mirror.child.tintTopLeft, 0xffc9e3);
  body.setTint(0xffffff); scene.game.events.emit('prerender'); assert.equal(mirror.child.tintTopLeft, 0xffffff);
  source.active = false; scene.game.events.emit('prerender'); assert.equal(mirror.visible, false);
  source.cameraFilter |= 16; scene.events.emit('shutdown');
  assert.equal(source.cameraFilter, 24); assert.equal(scene.game.events.listenerCount('prerender'), 0);
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
