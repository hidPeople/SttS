import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyze, programFor, diagnostics, dataFiles, contracts, contractChanges, mergeProperties } from '../schema.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const program = programFor(root);

test('EP ratio bases are optional and expose all three choices to the editor', () => {
  const model = analyze(program, root, 'src/data/cards.ts');
  const field = Object.values(model.schemas).flatMap(s => s.properties ?? []).find(p => p.name === 'ratioBase');
  assert.ok(field?.optional);
  const schema = model.schemas[field.schema];
  const values = schema.values ?? schema.variants.flatMap(id => model.schemas[id].values ?? []);
  assert.deepEqual(values, ['playerMaxEp', 'playerCurrentEp', 'playerEpReserve']);
});

test('status trigger stack consumption is an editable optional number', () => {
  const model = analyze(program, root, 'src/data/statuses.ts');
  const properties = Object.values(model.schemas).flatMap(s => s.properties ?? []);
  const field = properties.find(p => p.name === 'stacksPerEnergy');
  assert.ok(field.optional);
  const schema = model.schemas[field.schema];
  assert.ok(schema.kind === 'number' || schema.variants?.some(id => model.schemas[id].kind === 'number'));
});

test('player initial EP progress exposes all parts and numeric fields', () => {
  const model = analyze(program, root, 'src/data/player.ts');
  const player = model.declarations.find(d => d.name === 'PLAYER_DEFINITION').node;
  const progress = player.entries.find(e => e.key === 'initialEpProgress').node;
  assert.deepEqual(progress.entries.map(e => e.key), ['A', 'B', 'C', 'V', 'M']);
  for (const part of progress.entries) {
    const fields = model.schemas[part.node.schema].properties;
    for (const name of ['epDamage', 'peakCount']) {
      const field = fields.find(p => p.name === name);
      assert.equal(field.optional, false);
      assert.equal(model.schemas[field.schema].kind, 'number');
    }
  }
});

test('sensitivity thresholds expose five required levels and editable numeric counts', () => {
  const model = analyze(program, root, 'src/data/statuses.ts');
  const config = model.declarations.find(d => d.name === 'PART_SENSITIVITY_LEVELS').node;
  assert.deepEqual(config.entries.map(e => e.key), ['1', '2', '3', '4', '5']);
  assert.ok(model.schemas[config.schema].properties.every(p => !p.optional));
  for (const entry of config.entries) {
    const fields = model.schemas[entry.node.schema].properties;
    for (const name of ['requiredPeakCount', 'requiredEpDamage', 'epDamageMultiplier']) {
      const field = fields.find(p => p.name === name);
      assert.equal(field.optional, false);
      assert.equal(model.schemas[field.schema].kind, 'number');
    }
    const mode = fields.find(p => p.name === 'conditionMode');
    assert.equal(mode.optional, false);
    assert.deepEqual(model.schemas[mode.schema].values, ['or', 'and']);
  }
});
test('every data module and generated template is readable without executing source', () => {
  for (const file of dataFiles(root)) {
    const model = analyze(program, root, file);
    assert.ok(model.declarations.length, file);
    assert.deepEqual(model.issues, [], file);
  }
  const statuses = analyze(program, root, 'src/data/statuses.ts');
  assert.ok(statuses.declarations.some(d => d.name.startsWith('defineSensitivityStatuses /')));
  assert.deepEqual(diagnostics(program, root), []);
});
test('builder parameters preserve all optional fields and finite choices', () => {
  const result = analyze(program, root, 'src/data/cards.ts');
  const card = result.declarations[0].node.entries[0].node.args[0];
  const fields = result.schemas[card.schema].properties;
  assert.equal(fields.find(p => p.name === 'conditions').optional, true);
  assert.equal(fields.find(p => p.name === 'id').optional, false);
  assert.deepEqual(result.schemas[fields.find(p => p.name === 'rarity').schema].values, ['starter','common','uncommon','rare','event']);
  assert.ok(result.constructors.some(c => c.name === 'condition'));
  const flavor = card.entries.find(e => e.key === 'flavors').node;
  assert.equal(flavor.entries[0].key, 'card.play');
  const statusResult = analyze(program, root, 'src/data/statuses.ts');
  const timingFields = Object.values(statusResult.schemas).flatMap(s => s.properties ?? []).filter(p => p.name === 'timing');
  assert.ok(timingFields.length);
});
test('new union options and structural changes are detected from unsaved source', () => {
  const original = fs.readFileSync(path.join(root, 'src/models/types.ts'), 'utf8');
  const updated = original.replace("'starter' | 'common' | 'uncommon' | 'rare' | 'event'", "'starter' | 'common' | 'uncommon' | 'rare' | 'event' | 'legendary'").replace('export interface StatusDefinition {', 'export interface StatusDefinition {\n  editorExample?: number;');
  const next = programFor(root, { 'src/models/types.ts': updated });
  const a = analyze(next, root, 'src/data/cards.ts');
  assert.ok(Object.values(a.schemas).some(s => s.values?.includes('legendary')));
  const changes = contractChanges(contracts(program, root), contracts(next, root));
  assert.ok(changes.some(c => c.name === 'Rarity' && c.message.includes('src/models/types.ts')));
  assert.ok(changes.some(c => c.name === 'StatusDefinition' && c.current.includes('editorExample')));
});
test('property snippets merge and preserve unrelated fields', () => {
  const result = mergeProperties("{ id: 'test', cost: 1, categories: ['attack'] }", "categories: ['attack', 'noMotion'],");
  assert.match(result, /id: 'test'/); assert.match(result, /cost: 1/); assert.match(result, /categories: \['attack', 'noMotion'\]/);
  assert.throws(() => mergeProperties('{}', 'categories: ['));
});
