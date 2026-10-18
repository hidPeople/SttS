import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { analyze, programFor, mergeProperties } from '../schema.mjs';

const root = path.resolve('.'), program = programFor(root);
test('flavor lines expose optional condition arrays and occupancy exceptions expose optional booleans', () => {
  for (const file of ['src/data/cards.ts', 'src/data/enemies.ts', 'src/data/statuses.ts', 'src/data/flavorCatalog.ts']) {
    const model = analyze(program, root, file);
    assert.deepEqual(model.issues, [], file);
    const line = Object.values(model.schemas).find(s => s.name?.endsWith('BattleFlavorLine'));
    assert.ok(line, file);
    const field = line.properties.find(p => p.name === 'conditions');
    assert.equal(field.optional, true);
    const schema = model.schemas[field.schema];
    assert.ok((schema.variants ?? [field.schema]).some(id => model.schemas[id].kind === 'array'));
    if (file.endsWith('cards.ts')) {
      const field = Object.values(model.schemas).flatMap(s => s.properties ?? []).find(p => p.name === 'allowOtherInsertedParts');
      assert.equal(field.optional, true);
      assert.deepEqual(model.schemas[field.schema].values, [false, true]);
    }
  }
});

test('line condition snippets preserve text and kind and validate the same required fields as variants', () => {
  const merged = mergeProperties("{ kind: 'quote', text: l('Hello', 'やあ') }", "conditions: [condition('flavorValue', 'eq', { valueKey: 'epDamageFromEnemy', value: true })],");
  assert.match(merged, /kind: 'quote'/); assert.match(merged, /text: l\('Hello', 'やあ'\)/);
  assert.match(merged, /conditions:/);
  const file = 'src/data/flavorCatalog.ts', source = fs.readFileSync(file, 'utf8');
  const invalid = source.replace("valueKey: 'epDamageFromEnemy', value: true", 'value: true');
  const model = analyze(programFor(root, { [file]: invalid }), root, file);
  assert.ok(model.issues.some(i => /valueKey/.test(i.path + i.message)));
});
