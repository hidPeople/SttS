import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createServer } from 'vite';
const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
const { preloadConversationGraphite, createConversationGraphite } = await server.ssrLoadModule('/src/ui/conversationGraphite.ts');
const { paintConversationPanel } = await server.ssrLoadModule('/src/ui/conversationPaint.ts');
await server.close();

function setup() {
  const textures = new Map(), loads = [], fills = [], images = [];
  let allocations = 0;
  const scene = {
    textures: {
      exists: key => textures.has(key),
      get: key => textures.get(key),
      createCanvas(key, width, height) {
        allocations++;
        const ctx = { drawImage(source) { assert.ok(source.width > 0); }, fillRect() { fills.push(this.fillStyle); } };
        const texture = { getContext: () => ctx, refresh() {}, width, height };
        textures.set(key, texture); return texture;
      },
    },
    load: { image(key, url) {
      loads.push({ key, url });
      const png = fs.readFileSync('src/ui/assets/' + key + '.png');
      assert.equal(png.toString('ascii', 1, 4), 'PNG');
      const source = { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
      textures.set(key, { getSourceImage: () => source });
    } },
    add: { image(x, y, key) {
      assert.ok(textures.has(key));
      const image = { x, y, key, setDisplaySize(width, height) { this.width = width; this.height = height; return this; }, destroy() {} };
      images.push(image); return image;
    } },
  };
  return { scene, loads, fills, images, textures, allocations: () => allocations };
}

test('graphite uses baked PNGs and retains one coloured texture per panel across reopen and scene changes', () => {
  const h = setup();
  preloadConversationGraphite(h.scene);
  assert.equal(h.loads.length, 2);
  assert.deepEqual(h.loads.map(x => h.textures.get(x.key).getSourceImage()), [{ width: 1134, height: 197 }, { width: 1134, height: 615 }]);
  const first = createConversationGraphite(h.scene, 1100, 192, 0x202938);
  const log = createConversationGraphite(h.scene, 1100, 610, 0x202938);
  first.destroy(); log.destroy();
  const nextScene = { ...h.scene };
  preloadConversationGraphite(nextScene);
  for (let i = 0; i < 10; i++) {
    assert.equal(createConversationGraphite(nextScene, 1100, 192, 0x202938).key, first.key);
    assert.equal(createConversationGraphite(nextScene, 1100, 610, 0x202938).key, log.key);
  }
  assert.equal(h.loads.length, 2);
  assert.equal(h.allocations(), 2);
  assert.deepEqual(h.fills, ['#202938', '#202938']);
  assert.equal(first.width, 1134); assert.equal(log.height, 615);
});

test('A panel painting adds only the cached image and preserves configurable colour', () => {
  const h = setup(); preloadConversationGraphite(h.scene);
  const children = [], paint = { add: node => children.push(node) };
  // This stub has neither graphics nor procedural CrayonPatch support.
  for (const height of [192, 610]) paintConversationPanel(h.scene, 'graphite', 1100, height, paint, {});
  assert.equal(children.length, 2); assert.equal(h.allocations(), 2);
  const variant = createConversationGraphite(h.scene, 1100, 192, 0x123456);
  assert.equal(h.fills.at(-1), '#123456');
  assert.equal(createConversationGraphite(h.scene, 1100, 192, 0x123456).key, variant.key);
  assert.equal(h.allocations(), 3);
  assert.throws(() => createConversationGraphite(h.scene, 800, 400, 0), /Bake a graphite conversation panel/);
});
