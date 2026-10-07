import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { EventEmitter } from 'node:events';

function source(file) { return ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true); }
function compile(code, deps) {
  const js = ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText;
  return new Function(...Object.keys(deps), js)(...Object.values(deps));
}
function harness(file, name, members, deps = {}) {
  const ast = source(file), cls = ast.statements.find(n => ts.isClassDeclaration(n) && n.name.text === name);
  return compile(`class Harness { ${cls.members.filter(n => members.includes(n.name?.getText(ast))).map(n => n.getText(ast)).join('\n')} }; return new Harness();`, deps);
}
const Phaser = { Scenes: { Events: { RENDER: 'render', RESUME: 'resume', SHUTDOWN: 'shutdown' } }, Loader: { Events: { COMPLETE: 'complete' } } };

// Opening save must not await the screenshot's image decoding. Capture the source
// render first, then allow the destination to appear with its preview still pending.
const saveAst = source('src/scenes/SaveLoadScene.ts');
const openNode = saveAst.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'openSaveLoad');
let resolvePreview, launchData;
const events = new EventEmitter(), sourceEvents = new EventEmitter();
const openSaveLoad = compile(openNode.getText(saveAst).replace('export ', '') + ';return openSaveLoad;', {
  captureSavePreview: () => new Promise(resolve => { resolvePreview = resolve; }),
});
let paused = false;
const scene = { sys: { isActive: () => true }, events: sourceEvents, game: { events },
  scene: { key: 'BattleScene', launch: (_key, data) => { launchData = data; }, pause: () => { paused = true; } } };
openSaveLoad(scene, { mode: 'save' }); assert.equal(launchData, undefined);
events.emit('postrender'); assert.equal(paused, true); assert.equal(launchData.sourceScene, 'BattleScene');
resolvePreview('snapshot'); assert.equal(await launchData.previewPending, 'snapshot');
launchData = undefined;
openSaveLoad(scene, { mode: 'body' }); assert.equal(launchData.mode, 'body');

// Only visible slots are queued. A page switch during loading must update the
// new page without rebuilding its frame/buttons or waiting on unrelated images.
const saves = harness('src/scenes/SaveLoadScene.ts', 'SaveLoadScene', ['queuePagePreviewImages'], {
  Phaser, RUN_SAVE_PAGE_SIZE: 10, RUN_SAVES: { get: slot => ({ slot, preview: { image: `image-${slot}` } }) },
});
const loader = new EventEmitter(); let loading = false; const loaded = new Set(), queued = [], updates = [];
Object.assign(loader, { isLoading: () => loading, image: (key, url) => queued.push([key, url]), start: () => { loading = true; } });
Object.assign(saves, { page: 0, load: loader, events: new EventEmitter(), sys: { isActive: () => true, isPaused: () => false },
  textures: { exists: key => loaded.has(key) }, failedPreviewKeys: new Set(), ownedPreviewKeys: new Set(),
  previewTextureKey: slot => `key-${slot}`, previewViews: new Map(), addSlotPreview: (_view, slot) => updates.push(slot.slot),
});
saves.queuePagePreviewImages(); assert.equal(queued.length, 10); assert.equal(queued.at(-1)[1], 'image-9');
saves.page = 2; saves.previewViews.set(20, { active: true, removeAll() {} });
saves.queuePagePreviewImages(); assert.equal(queued.length, 10);
for (const [key] of queued) loaded.add(key); loading = false; loader.emit('complete');
assert.deepEqual(updates, [20]); assert.equal(queued.length, 20); assert.equal(queued.at(-1)[1], 'image-29');
for (const [key] of queued) loaded.add(key); loading = false; loader.emit('complete');
assert.equal(queued.length, 20, 'completed previews cannot loop/reload');

// Save availability updates only on relevant state changes, including cards that
// finish while settings is already open. Disabled buttons are not recreated.
const battle = harness('src/scenes/BattleScene.ts', 'BattleScene', [
  '_isAnimating', 'isAnimating', '_handInputLocked', 'handInputLocked', '_isPlayerTurn', 'isPlayerTurn', '_isGameOver', 'isGameOver',
  'refreshSaveMenuAvailability', 'canCaptureBattleSave',
]);
const states = []; battle.saveMenuButtons = [{ active: true, getData: () => enabled => states.push(enabled) }];
battle.isPlayerTurn = true; battle.isAnimating = true; battle.handInputLocked = true;
battle.isAnimating = false; assert.equal(states.at(-1), false);
battle.handInputLocked = false; assert.equal(states.at(-1), true);
const count = states.length; battle.handInputLocked = false; assert.equal(states.length, count);
battle.isGameOver = true; assert.equal(states.at(-1), false);

// Event pagination only reads current thumbnails, not the entire gallery.
const gallery = Array.from({ length: 14 }, (_, i) => ({ conversationId: `event-${i}`, thumbnail: `thumb-${i}` }));
const extra = harness('src/scenes/ExtraScene.ts', 'ExtraScene', ['currentEventPage', 'loadEventThumbnails'], {
  EVENT_PAGE_SIZE: 6, galleryEvents: () => gallery,
});
let assets, refreshes = 0;
Object.assign(extra, { eventPage: 1, renderRequest: 3, tab: 'events', sys: { isActive: () => true },
  textures: { exists: () => false }, eventThumbnailAsset: textureKey => ({ textureKey }),
  loadGallerySprites: async definitions => { assets = definitions; return true; },
  eventPreviewRefresh: new Map([['event-6', () => refreshes++]]),
});
await extra.loadEventThumbnails(); assert.deepEqual(assets.map(a => a.textureKey), gallery.slice(6, 12).map(e => e.thumbnail));
assert.equal(refreshes, 1);

// Opacity wheel has priority over page/log bindings, but an open log still scrolls.
const prefs = { opacity: 0.5 };
const surface = harness('src/ui/conversationSurface.ts', 'ConversationSurface', ['scrollOpacity'], {
  OPACITY_SLIDER: { left: 300, width: 148, hitPadding: 16, hitHeight: 40, wheelStep: 0.05 },
  USER_SETTINGS: { update: value => Object.assign(prefs, value.conversation) },
});
Object.assign(surface, { prefs, host: { enabled: () => true }, root: { visible: true },
  toolbar: { visible: true, getLocalPoint: (x, y) => ({ x, y }) }, syncOpacity() {} });
const controls = harness('src/ui/conversationControls.ts', 'ConversationControls', ['wheel'], {
  actions: ['advance', 'log'], NOVEL_CONTROLS: { advance: { wheel: 'down' }, log: { wheel: 'up' } },
});
let actions = [], logOpen = false;
Object.assign(controls, { interaction() {}, enabled: () => true, host: { owns: () => true,
  scrollLog: () => logOpen, scrollControl: (p, d) => surface.scrollOpacity(p, d), action: a => actions.push(a) } });
controls.wheel({ x: 350, y: 0 }, [{}], 0, 100); assert.equal(prefs.opacity, 0.45); assert.deepEqual(actions, []);
controls.wheel({ x: 350, y: 0 }, [{}], 0, -100); assert.equal(prefs.opacity, 0.5); assert.deepEqual(actions, []);
controls.wheel({ x: 100, y: 0 }, [{}], 0, 100); assert.deepEqual(actions, ['advance']);
logOpen = true; controls.wheel({ x: 350, y: 0 }, [{}], 0, 100); assert.equal(prefs.opacity, 0.5);
prefs.opacity = 0; surface.scrollOpacity({ x: 448, y: 0 }, 100); assert.equal(prefs.opacity, 0);
prefs.opacity = 1; surface.scrollOpacity({ x: 284, y: 0 }, -100); assert.equal(prefs.opacity, 1);

// Static menu patches share their masks and coloured textures across reopenings.
const crayonAst = source('src/ui/crayon.ts');
const patchClass = crayonAst.statements.find(n => ts.isClassDeclaration(n) && n.name.text === 'CachedCrayonPatch');
let generations = 0, textureCreations = 0;
class Image {
  constructor(scene, _x, _y, key) { this.scene = scene; this.key = key; this.data = new Map(); }
  setData(k, v) { this.data.set(k, v); return this; } getData(k) { return this.data.get(k); }
  setDisplaySize() { return this; } setAlpha() { return this; } setTexture(k) { this.key = k; return this; }
}
const Patch = compile(patchClass.getText(crayonAst).replace('export ', '') + ';return CachedCrayonPatch;', {
  Phaser: { GameObjects: { Image } }, crayonArtwork: (width, height) => { generations++; return { canvas: { width, height } }; },
});
const textures = new Map();
const patchScene = { add: { existing() {} }, textures: {
  exists: k => textures.has(k), get: k => ({ getSourceImage: () => textures.get(k) }),
  addCanvas: (k, canvas) => textures.set(k, canvas),
  createCanvas: (k, width, height) => { textureCreations++; textures.set(k, { width, height }); return { context: { drawImage() {}, fillRect() {} }, refresh() {} }; },
} };
for (let opening = 0; opening < 3; opening++) for (let slot = 0; slot < 10; slot++) {
  new Patch(patchScene, 0, 0, 230, 242, 0x26303e).setStrokeStyle(2, 0x7d93ad, 0.9);
}
assert.equal(generations, 1); assert.equal(textureCreations, 2);
console.log('Menu responsiveness: deferred previews, page-only loads, event-driven Save, wheel routing, shared crayon textures passed.');
