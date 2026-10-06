import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createServer } from 'vite';
const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
const { STATUS_DESCRIPTIONS } = await server.ssrLoadModule('/src/data/statuses.ts');
const { RELIC_DEFINITIONS } = await server.ssrLoadModule('/src/data/relics.ts');
const { defineRelic, defineRelicRegistry } = await server.ssrLoadModule('/src/data/effectBuilders.ts');
const { localize } = await server.ssrLoadModule('/src/models/localization.ts');
const { resolveIconFile, iconTextureKey, iconFallbackText, statusIconCount } = await server.ssrLoadModule('/src/models/iconImage.ts');
const { resolveStatusIconFile } = await server.ssrLoadModule('/src/models/statusIcon.ts');
const { loadIconTexture, addIconImage, createDataIcon } = await server.ssrLoadModule('/src/ui/dataIcon.ts');
await server.close();

test('icon counts distinguish duration from resource stacks, including their last turn', () => {
  assert.equal(statusIconCount(STATUS_DESCRIPTIONS.Aphrodisiac, 3), 'T3');
  assert.equal(statusIconCount(STATUS_DESCRIPTIONS.Aphrodisiac, 1), 'T1');
  assert.equal(statusIconCount(STATUS_DESCRIPTIONS.Fainted, 2), 'T2');
  assert.equal(statusIconCount(STATUS_DESCRIPTIONS.Charm, 1), 'T1');
  assert.equal(statusIconCount(STATUS_DESCRIPTIONS.Aftershocks, 3), '×3');
  assert.equal(statusIconCount(STATUS_DESCRIPTIONS.InfestedV_Slime, 3), '×3');
  assert.equal(statusIconCount(STATUS_DESCRIPTIONS.Aftershocks, 1), '');
  assert.equal(statusIconCount(STATUS_DESCRIPTIONS.ASensitivityLv1, 1), '');
  assert.equal(statusIconCount(STATUS_DESCRIPTIONS.Aphrodisiac, 0), '');
  assert.equal(statusIconCount(STATUS_DESCRIPTIONS.Aftershocks, 200), '×99');
});

test('every current status, including generated levels, has a documented automatic image ID', () => {
  const source = fs.readFileSync('src/data/statuses.ts', 'utf8');
  for (const status of Object.keys(STATUS_DESCRIPTIONS)) {
    assert.ok(source.includes('アイコン画像: ' + status + '.png'), status);
    assert.equal(resolveStatusIconFile(status, new Set([status + '.png'])), status + '.png');
    assert.equal(resolveStatusIconFile(status, new Set()), undefined);
  }
  assert.ok(fs.existsSync('image/icon/Status'));
});

test('references share only the source image and safely reject missing or cyclic references', () => {
  const definitions = { A: { iconImage: 'B' }, B: { iconImage: 'C' }, C: {}, D: { iconImage: 'missing' } };
  const before = structuredClone(definitions);
  assert.equal(resolveStatusIconFile('A', new Set(['C.png', 'A.png']), definitions), 'C.png');
  assert.equal(resolveStatusIconFile('A', new Set(['A.png']), definitions), undefined);
  assert.equal(resolveStatusIconFile('D', new Set(['missing.png']), definitions), undefined);
  assert.equal(resolveStatusIconFile('unknown', new Set(['unknown.png']), definitions), undefined);
  assert.equal(resolveStatusIconFile('toString', new Set(['toString.png']), definitions), undefined);
  assert.equal(resolveStatusIconFile('A', new Set(), { A: { iconImage: 'B' }, B: { iconImage: 'A' } }), undefined);
  assert.equal(resolveStatusIconFile('A', new Set(), { A: { iconImage: 'A' } }), undefined);
  assert.deepEqual(definitions, before);
});

test('missing image resolves immediately to fallback without accessing drawing objects', () => {
  const fail = new Proxy({}, { get() { throw Error('Missing art must not access drawing objects'); } });
  addIconImage(fail, fail, 'Status', '__missing_test_status__', 32, fail, shown => assert.equal(shown, false));
  addIconImage(fail, fail, 'Relic', '__missing_test_relic__', 32, fail, shown => assert.equal(shown, false));
});

test('all relic icons have explicit fallback config and image design comments; builders retain it', () => {
  assert.deepEqual(Object.keys(RELIC_DEFINITIONS), Object.values(RELIC_DEFINITIONS).map(relic => relic.id));
  const source = fs.readFileSync('src/data/relics.ts', 'utf8');
  const registry = Object.fromEntries(Object.values(RELIC_DEFINITIONS).map(r => [r.id, r]));
  for (const relic of Object.values(registry)) {
    assert.ok(source.includes('アイコン画像: ' + relic.id + '.png'));
    assert.equal(typeof relic.iconColor, 'number');
    assert.ok(relic.iconText !== undefined);
    for (const language of ['en', 'ja']) assert.equal(iconFallbackText('Relic', relic.id, relic, language), localize(relic.iconText, language));
    assert.equal(resolveIconFile(relic.id, new Set(), registry), undefined);
    assert.equal(resolveIconFile(relic.id, new Set([relic.id + '.png']), registry), relic.id + '.png');
  }
  const relic = defineRelicRegistry({ test: defineRelic({ name: 'name', description: '', rarity: 'common', triggers: [], iconImage: 'other', iconText: { en: 'T', ja: '試' }, iconColor: 0x123456 }) }).test;
  assert.equal(relic.iconImage, 'other'); assert.equal(relic.iconColor, 0x123456);
  assert.equal(iconFallbackText('Relic', relic.id, relic, 'ja'), '試');
  assert.equal(iconFallbackText('Relic', 'id', { name: { en: 'Name', ja: '名称' } }, 'en'), 'Na');
  assert.equal(iconFallbackText('Status', 'Status', { name: 'Name' }), 'St');
  assert.ok(fs.existsSync('image/icon/Relic'));
});

test('status/relic image references and keys remain independent with colliding IDs', () => {
  const status = { shared: {}, alias: { iconImage: 'shared' } };
  const relic = { shared: { iconImage: 'other' }, other: {} };
  const files = new Set(['shared.png', 'other.png']);
  assert.equal(resolveIconFile('shared', files, status), 'shared.png');
  assert.equal(resolveIconFile('shared', files, relic), 'other.png');
  assert.equal(resolveIconFile('alias', files, relic), undefined);
  assert.notEqual(iconTextureKey('Status', 'shared.png'), iconTextureKey('Relic', 'shared.png'));
});

test('loading deduplicates requests and preserves fallback on broken images or destroyed games', async t => {
  const images = [];
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'Image');
  Object.defineProperty(globalThis, 'Image', { configurable: true, value: class { constructor() { images.push(this); } naturalWidth = 64; naturalHeight = 32; } });
  t.after(() => { if (previous) Object.defineProperty(globalThis, 'Image', previous); else delete globalThis.Image; });
  const loaded = new Set();
  const textures = { game: {}, exists: key => loaded.has(key), addImage: key => { loaded.add(key); return {}; } };
  const a = loadIconTexture(textures, 'Status', 'A.png', 'mock:a');
  const b = loadIconTexture(textures, 'Status', 'A.png', 'mock:a');
  assert.equal(a, b); assert.equal(images.length, 1);
  images[0].onload(); assert.equal(await a, true);
  assert.equal(await loadIconTexture(textures, 'Status', 'A.png', 'mock:a'), true);
  assert.equal(images.length, 1);
  const separate = loadIconTexture(textures, 'Relic', 'A.png', 'mock:relic-a');
  images[1].onload(); assert.equal(await separate, true);
  assert.equal(loaded.has('icon:Relic:A.png'), true);
  // The following indexes include the distinct relic image request.
  const bad = loadIconTexture(textures, 'Status', 'B.png', 'mock:bad');
  images[2].onerror(); assert.equal(await bad, false);
  assert.equal(await loadIconTexture(textures, 'Status', 'B.png', 'mock:bad'), false);
  assert.equal(images.length, 3);
  const stopped = loadIconTexture(textures, 'Status', 'C.png', 'mock:c');
  textures.game = undefined; images[3].onload(); assert.equal(await stopped, false);
  assert.equal(loaded.has('icon:Status:C.png'), false);
});


function iconScene() {
  const loaded = new Set(), drawnImages = [];
  const node = (text = '') => ({ active: true, visible: true, text, width: 42, height: 42,
    setOrigin() { return this; }, setStroke() { return this; }, setStrokeStyle() { return this; },
    setInteractive() { return this; }, setFillStyle(color, alpha) { this.fillAlpha = alpha; return this; },
    setVisible(v) { this.visible = v; return this; }, setText(v) { this.text = v; return this; },
    setFontSize(v) { this.fontSize = v; return this; },
    setScale(v) { this.displayWidth = this.width * v; this.displayHeight = this.height * v; return this; },
  });
  const scene = { textures: { game: {}, exists: key => loaded.has(key), addImage: key => { loaded.add(key); return {}; }, createCanvas: () => null },
    add: {
      rectangle: () => node(), text: (_x, _y, value) => node(value),
      container: (_x, _y, children) => ({ ...node(), children, add(n) { this.children.push(n); }, addAt(n, index) { this.children.splice(index, 0, n); } }),
      image: (_x, _y, key) => { const image = { ...node(), texture: { key }, frame: { name: '__BASE' } }; drawnImages.push(image); return image; },
    },
  };
  return { scene, loaded, drawnImages };
}
const settleIconLoad = () => new Promise(resolve => setImmediate(resolve));

for (const [kind, id, definition] of [
  ['Status', 'Aphrodisiac', STATUS_DESCRIPTIONS.Aphrodisiac],
  ['Relic', 'succubusBlood', RELIC_DEFINITIONS.succubusBlood],
]) test(`${kind}: pending loads stay hidden; success, failure and cached loads resolve correctly`, async t => {
  const images = [], original = Object.getOwnPropertyDescriptor(globalThis, 'Image');
  Object.defineProperty(globalThis, 'Image', { configurable: true, value: class { constructor() { images.push(this); } naturalWidth = 42; naturalHeight = 42; } });
  t.after(() => { if (original) Object.defineProperty(globalThis, 'Image', original); else delete globalThis.Image; });
  for (const success of [true, false]) {
    const h = iconScene();
    const view = createDataIcon(h.scene, kind, id, definition, 34, { stacks: 3, counter: 3 });
    assert.equal(view.group.visible, false, 'counter and fallback remain behind hidden parent');
    assert.equal(view.label.text, ''); assert.equal(view.getLabelText(), '', 'HUD/language refresh must not expose fallback while pending');
    view.updateStacks(2);
    assert.equal(view.group.visible, false, 'stack updates must not reveal loading icons');
    if (kind === 'Status') assert.equal(view.group.children.at(-1).text, 'T2');
    if (success) images.at(-1).onload(); else images.at(-1).onerror();
    await settleIconLoad();
    assert.equal(view.group.visible, true);
    assert.equal(h.drawnImages.length, success ? 1 : 0);
    assert.equal(view.label.text, success ? '' : iconFallbackText(kind, id, definition));
    assert.equal(view.getLabelText(), view.label.text);
    view.updateStacks(1);
    if (kind === 'Status') assert.equal(view.group.children.at(-1).text, 'T1');
    const requests = images.length;
    const cached = createDataIcon(h.scene, kind, id, definition, 34);
    await settleIconLoad();
    assert.equal(images.length, requests, 'cached result must not request the image again');
    assert.equal(cached.group.visible, true);
    assert.equal(cached.label.text, view.label.text);
  }
  for (const success of [true, false]) {
    const h = iconScene();
    const view = createDataIcon(h.scene, kind, id, definition, 34);
    view.group.active = false; view.icon.active = false;
    if (success) images.at(-1).onload(); else images.at(-1).onerror();
    await settleIconLoad();
    assert.equal(view.group.visible, false, 'destroyed HUD must not be revived');
    assert.equal(h.drawnImages.length, 0);
  }
});

test('an absent asset displays fallback once inventory lookup completes', () => {
  for (const kind of ['Status', 'Relic']) {
    const h = iconScene(), definition = { iconText: 'Fallback', iconColor: 0x123456 };
    const view = createDataIcon(h.scene, kind, '__missing_test__', definition, 34);
    assert.equal(view.group.visible, true);
    assert.equal(view.label.text, 'Fallback');
    assert.equal(h.drawnImages.length, 0);
  }
});
