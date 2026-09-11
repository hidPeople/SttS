import test from 'node:test';
import assert from 'node:assert/strict';
import { numericPolicy, numericWarnings, duplicateIdentifierStarts, updateLiteralModel } from '../public/field-policy.js';
import { editLiteral } from '../literal-edit.mjs';
import { analyze, programFor, hash } from '../schema.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const file = 'src/data/enemies.ts';
const program = programFor(root);
const model = analyze(program, root, file);
function nodes(n) { return [n, ...[...(n.args ?? []), ...(n.items ?? []), ...(n.entries ?? []).map(e => e.node), ...(n.inner ? [n.inner] : [])].flatMap(nodes)]; }
test('data expressions resolve to local and imported data declarations', () => {
    const all = model.declarations.flatMap(d => nodes(d.node));
    const reference = all.find(n => n.source === 'manIntrusionPart');
    const definition = model.declarations.find(d => d.name === 'manIntrusionPart').node;
    assert.equal(reference.definition.file, file);
    assert.equal(reference.definition.start, definition.start);
    const source = `import { CARD_DEFINITIONS } from './cards'; const ref = CARD_DEFINITIONS;`;
    const imported = analyze(programFor(root, { [file]: source }), root, file).declarations[0].node;
    assert.equal(imported.definition.file, 'src/data/cards.ts');
    assert.equal(imported.definition.name, 'CARD_DEFINITIONS');
});
test('intent IDs only warn for duplicates inside the same collection', () => {
    const src = `const enemies = { a: { id: 'a', intents: [{id:'attack'}, {id:'other'}], intents_E:[{id:'attack'}] }, b: {id:'b', intents:[{id:'attack'}]} };`;
    const m = analyze(programFor(root, { [file]: src }), root, file);
    assert.equal(duplicateIdentifierStarts(m).size, 0);
    const duplicate = analyze(programFor(root, { [file]: src.replace("id:'other'", "id:'attack'") }), root, file);
    assert.equal(duplicateIdentifierStarts(duplicate).size, 2);
    const duplicateEnemy = analyze(programFor(root, { [file]: src.replace("id:'b'", "id:'a'") }), root, file);
    assert.equal(duplicateIdentifierStarts(duplicateEnemy).size, 2);
});
test('probability steps and numerical warnings respect signed and percentage contexts', () => {
    assert.equal(numericPolicy('chance').step, 0.01);
    assert.equal(numericWarnings(-0.1, numericPolicy('chance')).length, 1);
    assert.equal(numericWarnings(1.1, numericPolicy('chance')).length, 1);
    assert.equal(numericWarnings(0.333, numericPolicy('chance')).length, 0);
    for (const key of ['bodyOffsetY', 'priority', 'order', 'chanceBonusPerStack']) assert.equal(numericWarnings(-2, numericPolicy(key)).length, 0, key);
    assert.equal(numericWarnings(-1, numericPolicy('cost')).length, 1);
    assert.equal(numericWarnings(0, numericPolicy('maxEp')).length, 0);
    assert.equal(numericWarnings(101, numericPolicy('value', { kind: 'hpPercent' })).length, 1);
    assert.equal(numericWarnings(1.1, numericPolicy('amount', { kind: 'setEpReserveRatio' })).length, 1);
    assert.equal(numericWarnings(1.5, numericPolicy('amount', { percentOf: 'targetMaxEp' })).length, 0);
    assert.equal(numericWarnings(-2, numericPolicy('amount', { effect: false })).length, 0);
});
test('literal fast edits preserve source and node ranges through sequential edits', () => {
    const m = structuredClone(model), all = m.declarations.flatMap(d => nodes(d.node));
    const text = all.find(n => n.kind === 'string' && n.value.length > 5 && !n.definition);
    for (const value of ['Changed text with a longer length.', 'Short.', 'Line 1\n"Line 2"']) {
        const replacement = JSON.stringify(value);
        const result = editLiteral(m.source, { start: text.start, end: text.end, original: text.source, replacement });
        updateLiteralModel(m, text, replacement, value, hash(result));
        assert.equal(m.source, result);
        assert.equal(m.sourceHash, hash(result));
        for (const n of all) assert.equal(m.source.slice(n.start, n.end), n.source);
        const updated = analyze(programFor(root, { [file]: m.source }), root, file);
        const actual = updated.declarations.flatMap(d => nodes(d.node)).find(n => n.source === 'manIntrusionPart');
        const fast = all.find(n => n.source === 'manIntrusionPart');
        assert.deepEqual(fast.definition, actual.definition);
    }
});
test('literal endpoint cannot alter structure or use stale offsets', () => {
    const source = `const data = { text: 'original', chance: 0.5 };`;
    const start = source.indexOf("'original'"), end = start + "'original'".length;
    assert.throws(() => editLiteral(source, { start, end, original: "'wrong'", replacement: "'updated'" }));
    for (const replacement of ['process.exit()', "'x'; const injected = 1", '2', "'x', other: 'y'"]) assert.throws(() => editLiteral(source, { start, end, original: "'original'", replacement }));
    const i = source.indexOf('0.5');
    assert.equal(editLiteral(source, {start:i,end:i+3,original:'0.5',replacement:'-0.25'}), source.replace('0.5','-0.25'));
});
