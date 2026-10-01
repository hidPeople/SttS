import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { analyze, programFor } from '../schema.mjs';
import { numericPolicy } from '../public/field-policy.js';
import { REFERENCE_FIELDS } from '../public/reference-fields.js';

test('relic multiplier and no-orgasm rule are editable, with positive-value validation', () => {
  const root = process.cwd(), file = 'src/data/relics.ts', program = programFor(root);
  const model = analyze(program, root, file);
  assert.deepEqual(model.issues, []);
  const input = Object.values(model.schemas).find(s => s.name === 'RelicDefinition');
  for (const name of ['epDamageTakenMultiplierPerOrgasm', 'idleOrgasmsRule']) assert.ok(input.properties.some(p => p.name === name));
  const source = fs.readFileSync(file, 'utf8').replace('epDamageTakenMultiplierPerOrgasm: 1.001', 'epDamageTakenMultiplierPerOrgasm: 0').replace("idleOrgasmsRule: { turns: 3", "idleOrgasmsRule: { turns: 0.5");
  const invalid = analyze(programFor(root, { [file]: source }), root, file);
  assert.ok(invalid.issues.some(i => i.path.endsWith('.epDamageTakenMultiplierPerOrgasm')));
  assert.ok(invalid.issues.some(i => i.path.endsWith('.idleOrgasmsRule.turns')));
  assert.deepEqual(numericPolicy('epDamageTakenMultiplierPerOrgasm'), { step: 0.001, min: 0, exclusiveMin: true });
  assert.deepEqual(REFERENCE_FIELDS.excludedRelicIds, ['relics', 'key']);
  assert.deepEqual(analyze(program, root, 'src/data/eventBattles.ts').issues, []);
});
