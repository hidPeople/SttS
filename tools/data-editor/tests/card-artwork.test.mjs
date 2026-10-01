import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { analyze, programFor } from '../schema.mjs';
import { literal } from '../public/sprite-values.js';
import { updateCardArtworkSource, validateArtworkValues } from '../public/card-artwork-edit.js';
import { cardArtworkPreviewConfig } from '../card-artwork-preview.mjs';

const root = process.cwd();
const file = 'src/data/cardAppearance.ts';
const program = programFor(root);
const model = analyze(program, root, file);
const entry = (m, id) => m.declarations.find(d => d.name === 'CARD_ARTWORK').node.entries.find(e => e.key === id).node;

test('preview gets frame, label geometry, rarity and card color from current source and drafts', () => {
  const config = cardArtworkPreviewConfig(program, root, 'rubOneOut');
  assert.equal(config.width, 160); assert.equal(config.height, 232);
  assert.equal(config.title.height, 29); assert.equal(config.bodyHeight, 76);
  assert.equal(config.frame.rimWidth, 5); assert.ok(config.name);
  assert.equal(cardArtworkPreviewConfig(program, root, 'crescentSlash').name, '三日月斬り');
  const draft = fs.readFileSync(file, 'utf8').replace('rimWidth: 5', 'rimWidth: 8');
  assert.equal(cardArtworkPreviewConfig(programFor(root, { [file]: draft }), root, 'rubOneOut').frame.rimWidth, 8);
});

test('preview save changes only edited battles, keeps one-line syntax, and handles optional values', () => {
  const node = entry(model, 'rubOneOut');
  const tutorial = { ...literal(node).tutorial, offsetX: 21.5, rotation: -30 };
  delete tutorial.focusX;
  const source = updateCardArtworkSource(node, new Map([['tutorial', tutorial]]));
  assert.ok(!source.includes('\n')); assert.ok(!source.includes('"offsetX"'));
  const nextSource = model.source.slice(0, node.start) + source + model.source.slice(node.end);
  assert.equal(ts.createSourceFile('test.ts', nextSource, ts.ScriptTarget.Latest, true).parseDiagnostics.length, 0);
  const next = analyze(programFor(root, { [file]: nextSource }), root, file);
  assert.deepEqual(literal(entry(next, 'rubOneOut')).normal, literal(node).normal);
  assert.deepEqual(literal(entry(next, 'rubOneOut')).tutorial, tutorial);
});

test('a new battle can be configured before its image exists; invalid numerical settings are rejected', () => {
  const node = entry(model, 'defend');
  const source = updateCardArtworkSource(node, new Map([['tutorial', { scale: 0.5, offsetX: -12 }]]));
  assert.match(source, /tutorial: \{ scale: 0.5, offsetX: -12 \}/);
  assert.match(source, /normal:/);
  for (const values of [{ scale: 0 }, { scale: -1 }, { edgeFade: -1 }, { offsetY: NaN }, { rotation: Infinity }]) assert.throws(() => validateArtworkValues(values));
  validateArtworkValues({ offsetX: -80, rotation: -270, edgeFade: 0 });
});

test('the two shared browser drawing modules transpile without runtime imports or game/tool dependencies', () => {
  for (const file of ['src/ui/cardArtworkCanvas.ts', 'src/models/cardArtworkGeometry.ts']) {
    const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, removeComments: true } }).outputText;
    assert.doesNotMatch(output, /^import /m);
    assert.doesNotMatch(output, /Phaser|tools\//);
  }
});
