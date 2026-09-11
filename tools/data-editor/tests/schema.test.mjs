import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyze, programFor, diagnostics, dataFiles, contracts, contractChanges, mergeProperties } from '../schema.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const program = programFor(root);
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
