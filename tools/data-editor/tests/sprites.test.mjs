import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';
import { analyze, programFor, diagnostics } from '../schema.mjs';
import { spriteValues } from '../public/sprite-values.js';
import { updateSpriteSource } from '../public/sprite-edit.js';
import { validateSpriteModels } from '../sprite-validation.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const file = 'src/data/sprites.ts', base = fs.readFileSync(path.join(root, file), 'utf8');
const p = programFor(root);
const model = analyze(p, root, file), enemies = analyze(p, root, 'src/data/enemySprites.ts');

test('shared sheets expose all fields, stable preview edits and effect references', () => {
    assert.deepEqual(validateSpriteModels([enemies, model]), []);
    assert.deepEqual(model.issues, []);
    const n = model.declarations.find(d => d.name === 'EFFECT_SPRITES').node.entries.find(e => e.key === 'slash').node;
    const before = spriteValues(n, model);
    assert.equal(before.frameRate, 24); assert.equal(before.displayWidth, 270);
    assert.equal(before.opaqueBounds, undefined);
    const source = updateSpriteSource(n, before, { ...before, frameRate: 12, displayWidth: 300 });
    assert.equal(source, n.source.replace('frameRate: 24', 'frameRate: 12').replace('displayWidth: 270', 'displayWidth: 300'));
    assert.deepEqual(diagnostics(programFor(root, { [file]: base.slice(0, n.start) + source + base.slice(n.end) }), root), []);
});

test('preflight rejects global key collisions, invalid frame settings and unusable effects', () => {
    const source = base.replace("textureKey: 'slash-effect'", "textureKey: 'grunt-idle'")
        .replace('frameCount: 16', 'frameCount: 0').replace('repeat: 0', 'repeat: -1')
        .replace("spriteIds: ['strike']", 'spriteIds: []')
        .replace("spriteIds: ['slice']", "spriteIds: ['missing']")
        .replace('amountPerSprite: 2', 'amountPerSprite: 0');
    const bad = analyze(programFor(root, { [file]: source }), root, file);
    const issues = validateSpriteModels([enemies, bad]);
    for (const message of ['重複', 'frameCount', '.repeat', '1件以上', '未登録', 'amountPerSprite']) assert.ok(issues.some(i => i.message.includes(message)), message);
});

// Test the actual runtime with a small Phaser surface; never used by the editor.
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
    return { api: load('src/ui/sprites.ts'), data: load('src/data/sprites.ts') };
}
function sceneMock() {
    const loaded = [], animations = [], sprites = [], tweens = [];
    const scene = {
        textures: { exists: () => false },
        load: { spritesheet: (...args) => loaded.push(args) },
        anims: { exists: key => animations.some(a => a.key === key), create: a => animations.push(a), generateFrameNumbers: (key, range) => ({ key, range }) },
        add: { sprite: (x, y, key) => {
            const sprite = { x, y, key, scaleX: 1, scaleY: 1,
                setDisplaySize(w, h) { this.scaleX = w / 200; this.scaleY = h / 200; return this; },
                setDepth(d) { this.depth = d; return this; }, setAlpha(a) { this.alpha = a; return this; },
                play(a) { this.animation = a; return this; }, once(event, callback) { this.complete = callback; return this; },
                destroy() { this.destroyed = true; }
            }; sprites.push(sprite); return sprite;
        } },
        tweens: { add: t => tweens.push(t) }
    };
    return { scene, loaded, animations, sprites, tweens };
}
test('one loader registers enemy, effect and future UI sheets with their configured playback', () => {
    const { api, data } = runtime(), m = sceneMock();
    data.UI_SPRITES.testUi = { ...data.EFFECT_SPRITES.slash, textureKey: 'test-ui', animationKey: 'test-ui-play', repeat: -1, frameWidth: 100, frameHeight: 80, frameCount: 8, frameRate: 12 };
    api.preloadSprites(m.scene); api.createSpriteAnimations(m.scene); api.createSpriteAnimations(m.scene);
    assert.equal(m.loaded.length, 15); assert.equal(m.animations.length, 15);
    assert.deepEqual(m.loaded.find(a => a[0] === 'test-ui')[2], { frameWidth: 100, frameHeight: 80, endFrame: 7 });
    assert.equal(m.animations.find(a => a.key === 'grunt-idle-play').repeat, -1);
    assert.equal(m.animations.find(a => a.key === 'strike-effect-play').frameRate, 24);
    assert.equal(m.animations.find(a => a.key === 'heart-effect-1-play').frameRate, 20);
    assert.equal(m.animations.find(a => a.key === 'test-ui-play').repeat, -1);
});
test('impact fade and heart amount/scatter/motion retain the original behavior', () => {
    const { api, data } = runtime(), m = sceneMock();
    api.playSpriteEffect(m.scene, data.DAMAGE_SPRITE_EFFECTS.strike, 100, 200, 8);
    assert.equal(m.sprites.length, 1);
    const s = m.sprites[0]; assert.equal(s.scaleX, 1.35); assert.equal(s.alpha, 0.96); assert.equal(s.depth, 1450);
    s.complete();
    assert.ok(Math.abs(m.tweens[0].scaleX - 1.48) < 1e-12); assert.equal(m.tweens[0].duration, 120);
    m.tweens[0].onComplete(); assert.ok(s.destroyed);
    const hearts = sceneMock();
    api.playSpriteEffect(hearts.scene, data.DAMAGE_SPRITE_EFFECTS.love, 100, 200, 99);
    assert.equal(hearts.sprites.length, 5);
    hearts.sprites.forEach(s => { assert.ok(s.x >= 56 && s.x <= 144); assert.ok(s.y >= 162 && s.y <= 238); });
    assert.ok(hearts.tweens.every(t => t.duration === 660));
    for (const amount of [0, 1, 2, 3]) {
        const single = sceneMock(); api.playSpriteEffect(single.scene, data.DAMAGE_SPRITE_EFFECTS.love, 0, 0, amount);
        assert.equal(single.sprites.length, amount === 3 ? 2 : 1);
    }
});
