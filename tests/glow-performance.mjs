import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { EventEmitter } from 'node:events';
import { createServer } from 'vite';
const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
const { iconHaloPixels } = await server.ssrLoadModule('/src/models/iconHalo.ts');
const { iconHaloTexture } = await server.ssrLoadModule('/src/ui/iconHalo.ts');
const { ICON_APPEARANCE, SELECTION_GLOW } = await server.ssrLoadModule('/src/data/ui.ts');
await server.close();

test('cached halo samples all directions symmetrically and stays within its radius', () => {
  const width = 13, input = new Uint8ClampedArray(width * width * 4);
  input[(6 * width + 6) * 4 + 3] = 255;
  const output = iconHaloPixels(input, width, width, 2, 16, 0x123456, 1);
  const alpha = (x, y) => output[(y * width + x) * 4 + 3];
  for (let y = 0; y < width; y++) for (let x = 0; x < width; x++) {
    assert.equal(alpha(x, y), alpha(width - 1 - x, y));
    assert.equal(alpha(x, y), alpha(x, width - 1 - y));
    if (Math.abs(x - 6) > 2 || Math.abs(y - 6) > 2) assert.equal(alpha(x, y), 0);
  }
  assert.ok(alpha(5, 6) > 0 && alpha(6, 5) > 0);
  assert.deepEqual([...output.slice(0, 3)], [0x12, 0x34, 0x56]);
  assert.equal(input[(6 * width + 6) * 4 + 3], 255, 'source alpha remains intact');
  assert.ok(iconHaloPixels(input, width, width, 0, 16, 0xffffff, 1).every(v => v === 0));
  assert.ok(iconHaloPixels(input, width, width, 2, 16, 0xffffff, 0).every(v => v === 0));
});

test('halo texture is icon-sized, cached across scenes, and separated by size/settings', () => {
  const cache = new Map(); let allocations = 0, reads = 0, uploads = 0;
  const textures = {
    exists: key => cache.has(key), remove: key => cache.delete(key),
    createCanvas(key, width, height) {
      allocations++;
      const texture = { width, height, context: {
        drawImage() {}, getImageData() { reads++; return { data: new Uint8ClampedArray(width * height * 4) }; }, putImageData() {},
      }, refresh() { uploads++; } };
      cache.set(key, texture); return texture;
    },
  };
  const image = { texture: { key: 'relic' }, displayWidth: 34, displayHeight: 34,
    frame: { name: '__BASE', source: { image: {} }, cutX: 0, cutY: 0, cutWidth: 42, cutHeight: 42 } };
  const first = iconHaloTexture(textures, image);
  for (let i = 0; i < 100; i++) assert.equal(iconHaloTexture(textures, { ...image }), first);
  assert.equal(allocations, 1); assert.equal(reads, 1); assert.equal(uploads, 1);
  const padding = Math.round(ICON_APPEARANCE.relicGlow.spread) + 1;
  assert.equal(cache.get(first).width, 34 + padding * 2);
  assert.notEqual(iconHaloTexture(textures, { ...image, displayWidth: 42, displayHeight: 42 }), first);
  assert.equal(allocations, 2);
  const failed = { ...textures, createCanvas() { return { context: { drawImage() { throw Error('unavailable'); } } }; } };
  assert.equal(iconHaloTexture(failed, { ...image, texture: { key: 'broken' } }), undefined);
});

// Exercise effect lifecycle without a renderer; the real scene chooses PreFX, never PostFX.
const source = ts.createSourceFile('selectionGlow.ts', fs.readFileSync('src/ui/selectionGlow.ts', 'utf8'), ts.ScriptTarget.Latest, true);
const cls = source.statements.find(n => ts.isClassDeclaration(n) && n.name.text === 'EnemySelectionGlow');
const code = ts.transpileModule(cls.getText(source).replace('export class', 'class'), { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
const EnemySelectionGlow = new Function('SELECTION_GLOW', code + ';return EnemySelectionGlow;')(SELECTION_GLOW);
function enemyHarness(otherEffect = false) {
  const tweens = [], body = new EventEmitter(); let disabled = 0;
  const preFX = { gameObject: body, padding: 2, list: otherEffect ? [{}] : [],
    setPadding(v) { this.padding = v; },
    addGlow() { const fx = {}; this.list.push(fx); return fx; },
    remove(fx) { this.list.splice(this.list.indexOf(fx), 1); }, disable() { disabled++; },
  };
  Object.assign(body, { active: true, preFX, postFX: { addGlow() { assert.fail('full-screen glow must not be used'); } } });
  const scene = { sys: { renderer: { gl: {} } }, events: new EventEmitter(), tweens: { add(config) { tweens.push(config); return { remove() {} }; } } };
  return { body, scene, tweens, glow: new EnemySelectionGlow(scene), disabled: () => disabled };
}

test('enemy glow removes local processing when complete and preserves other effects', () => {
  for (const other of [false, true]) {
    const h = enemyHarness(other); h.glow.play(h.body);
    assert.equal(h.body.preFX.list.length, other ? 2 : 1);
    h.tweens[0].onComplete(); h.tweens[1].onComplete();
    assert.equal(h.body.preFX.list.length, other ? 1 : 0);
    assert.equal(h.body.preFX.padding, 2);
    assert.equal(h.disabled(), other ? 0 : 1);
    assert.equal(h.body.listenerCount('destroy'), 0);
  }
});

test('enemy selection replacement, shutdown and destruction release the local effect', () => {
  for (const exit of ['stop', 'shutdown', 'destroy']) {
    const h = enemyHarness(); h.glow.play(h.body); h.glow.play(h.body);
    assert.equal(h.body.preFX.list.length, 1);
    if (exit === 'stop') h.glow.stop();
    else if (exit === 'shutdown') h.scene.events.emit('shutdown');
    else h.body.emit('destroy');
    assert.equal(h.body.preFX.list.length, 0);
    assert.equal(h.body.listenerCount('destroy'), 0);
  }
});
