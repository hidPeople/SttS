import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

// Test scene controllers with stubs; no rendering or browser interaction.
function harness(name, names, dependencies = {}) {
  const source = ts.createSourceFile(`${name}.ts`, fs.readFileSync(`src/scenes/${name}.ts`, 'utf8'), ts.ScriptTarget.Latest, true);
  const cls = source.statements.find(n => ts.isClassDeclaration(n) && n.name.text === name);
  const methods = names.map(name => cls.members.find(n => n.name?.getText(source) === name).getText(source)).join('\n');
  const code = ts.transpileModule(`class Harness { ${methods} }`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
  const Class = new Function(...Object.keys(dependencies), `${code};return Harness;`)(...Object.values(dependencies));
  const instance = new Class();
  const setup = cls.members.find(n => n.name?.getText(source) === 'create').body.statements
    .find(n => n.getText(source).startsWith('KeyboardNavigation.for(this).configure'));
  let options;
  new Function('KeyboardNavigation', setup.getText(source)).call(instance, { for: () => ({ configure: value => { options = value; } }) });
  return { instance, options };
}
const textureSet = new Set(['battle-portrait']);
const textures = { exists: key => textureSet.has(key), remove: key => textureSet.delete(key) };
let currentSave = { preview: { image: 'old-image' } };
const { instance: saves, options: saveNav } = harness('SaveLoadScene', ['close', 'previewTextureKey', 'clearPreviewTextures', 'confirmCompatibility'], {
  RUN_SAVES: { get: () => currentSave },
});
Object.assign(saves, { textures, previewRevision: 0, previewKeys: new Map(), ownedPreviewKeys: new Set(), busy: false,
  ui: (_en, ja) => ja, scene: { stop: () => calls.push('stop'), isPaused: () => true, resume: () => calls.push('resume') } });
const calls = [];
saves.dialog = { destroy: () => calls.push('dialog') };
assert.equal(saveNav.scope(), saves.dialog); saveNav.escape(); assert.deepEqual(calls, ['dialog']);
saveNav.escape(); assert.deepEqual(calls, ['dialog', 'stop', 'resume']);
saves.busy = true; saveNav.escape(); assert.equal(calls.length, 3); assert.equal(saveNav.filter(), false); saves.busy = false;
const first = saves.previewTextureKey(0); textureSet.add(first);
assert.equal(saves.previewTextureKey(0), first);
currentSave = { preview: { image: 'new-image' } };
const second = saves.previewTextureKey(0); assert.notEqual(second, first); assert.equal(textureSet.has(first), false);
textureSet.add(second); saves.clearPreviewTextures(); assert.deepEqual([...textureSet], ['battle-portrait']);
let accepted = false, confirm;
saves.confirm = (message, action) => { confirm = { message, action }; };
saves.confirmCompatibility({ compatibility: { restartedBattle: true } }, () => { accepted = true; });
assert.equal(accepted, false); assert.match(confirm.message, /古いバージョン/); assert.match(confirm.message, /開始時/);
confirm.action(); assert.equal(accepted, true);

const { instance: title, options: titleNav } = harness('TitleScene', ['closeChoice']);
title.newGameChoice = { destroy: () => calls.push('choice') }; assert.equal(titleNav.scope(), title.newGameChoice);
titleNav.escape(); assert.equal(title.newGameChoice, undefined);

const physical = { textureKey: 'battle-portrait', source: 'image.png', displayHeight: 700 };
let finishLoad;
const { instance: extra, options: extraNav } = harness('ExtraScene',
  ['scopedGalleryAsset', 'galleryPortraitAsset', 'loadGallerySprites', 'closeEnlargedPortrait', 'closeDialog', 'goBack', 'isPortraitUnlocked'], {
    characterPortraitAssets: { portrait: physical }, USER_SETTINGS: { value: { gallery: { seenPortraitIds: ['alias'] } } },
    ensureSprites: () => new Promise(resolve => { finishLoad = resolve; }),
    portraitGalleryId: id => { calls.push('resolve-alias'); return id === 'alias' ? 'portrait' : id; },
  });
Object.assign(extra, { gallerySession: 1, galleryAssets: new Map(), ownedTextures: new Set(), textures, scene: { start: name => calls.push(name) } });
const full = extra.galleryPortraitAsset('portrait', true), fallback = extra.galleryPortraitAsset('portrait');
assert.notEqual(full.textureKey, physical.textureKey); assert.notEqual(full.textureKey, fallback.textureKey);
textureSet.add(full.textureKey); extra.ownedTextures.add(full.textureKey);
extra.portraitOverlay = { destroy: () => calls.push('enlarged') }; extra.enlargedPortraitId = 'portrait';
extra.dialog = { destroy: () => calls.push('extra-dialog') }; assert.equal(extraNav.scope(), extra.dialog);
extraNav.escape(); assert.equal(extraNav.scope(), extra.portraitOverlay); assert.equal(textureSet.has(full.textureKey), true);
extraNav.escape(); assert.equal(textureSet.has(full.textureKey), false); assert.equal(textureSet.has('battle-portrait'), true);
assert.equal(extraNav.scope(), undefined);
const before = calls.length;
for (let i = 0; i < 100; i++) assert.equal(extra.isPortraitUnlocked('portrait'), true);
assert.equal(calls.length - before, 1, 'resolve unlock aliases only once, not every animation frame');
extra.sys = { isActive: () => true, isPaused: () => false };
const oldAsset = extra.galleryPortraitAsset('portrait', true);
const pending = extra.loadGallerySprites([oldAsset]);
extra.gallerySession++; extra.ownedTextures = new Set();
const newAsset = extra.galleryPortraitAsset('portrait', true);
textureSet.add(oldAsset.textureKey); textureSet.add(newAsset.textureKey); finishLoad(true);
assert.equal(await pending, false);
assert.equal(textureSet.has(oldAsset.textureKey), false);
assert.equal(textureSet.has(newAsset.textureKey), true, 'stale loads cannot delete a newer gallery session');

const errorSource = ts.createSourceFile('StorageErrorScene.ts', fs.readFileSync('src/scenes/StorageErrorScene.ts', 'utf8'), ts.ScriptTarget.Latest, true);
const installer = errorSource.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'installStorageNotifications');
const installerCode = ts.transpileModule(installer.getText(errorSource).replace('export ', ''), { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
let pendingError = false, safe = false, check, reads = 0, launched = 0;
const host = { sys: { isActive: () => true }, canShowStorageFailure: () => safe,
  scene: { key: 'BattleScene', launch: () => launched++, pause() {} } };
const install = new Function('hasStorageFailures', 'takeStorageFailure', `${installerCode};return installStorageNotifications;`)(
  () => pendingError, () => { pendingError = false; return { operation: 'auto', error: {} }; });
install({ scene: { getScenes: () => { reads++; return [host]; } }, events: { on: (_event, callback) => { check = callback; }, once() {} } });
check(); assert.equal(reads, 0, 'no per-frame scene traversal without a storage failure');
pendingError = true; check(); assert.equal(launched, 0); assert.equal(pendingError, true);
safe = true; check(); assert.equal(launched, 1); assert.equal(pendingError, false);
console.log('Save UI controllers: modal scoping/back, compatibility confirmation, preview revisions, gallery texture ownership/cache passed.');
