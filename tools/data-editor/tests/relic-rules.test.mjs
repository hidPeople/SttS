import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { analyze, programFor } from '../schema.mjs';
import { numericPolicy } from '../public/field-policy.js';
import { REFERENCE_FIELDS } from '../public/reference-fields.js';

test('relic multiplier and no-Peak rule are editable, with positive-value validation', () => {
  const root = process.cwd(), file = 'src/data/relics.ts', program = programFor(root);
  const model = analyze(program, root, file);
  assert.deepEqual(model.issues, []);
  const input = Object.values(model.schemas).find(s => s.name === 'RelicDefinition');
  for (const name of ['epDamageTakenMultiplierPerPeak', 'idlePeakRule']) assert.ok(input.properties.some(p => p.name === name));
  const source = fs.readFileSync(file, 'utf8').replace('epDamageTakenMultiplierPerPeak: 1.001', 'epDamageTakenMultiplierPerPeak: 0').replace("idlePeakRule: { turns: 3", "idlePeakRule: { turns: 0.5");
  const invalid = analyze(programFor(root, { [file]: source }), root, file);
  assert.ok(invalid.issues.some(i => i.path.endsWith('.epDamageTakenMultiplierPerPeak')));
  assert.ok(invalid.issues.some(i => i.path.endsWith('.idlePeakRule.turns')));
  assert.deepEqual(numericPolicy('epDamageTakenMultiplierPerPeak'), { step: 0.001, min: 0, exclusiveMin: true });
  assert.deepEqual(REFERENCE_FIELDS.excludedRelicIds, ['relics', 'key']);
  assert.deepEqual(analyze(program, root, 'src/data/eventBattles.ts').issues, []);
});
