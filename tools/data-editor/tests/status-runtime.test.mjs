import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyze, programFor } from '../schema.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const file = 'src/data/statuses.ts';
const source = fs.readFileSync(path.join(root, file), 'utf8');

test('duration and idle rules expose source enums and reject invalid turn counts', () => {
  const valid = analyze(programFor(root), root, file);
  assert.deepEqual(valid.issues, []);
  assert.ok(Object.values(valid.schemas).some(s => s.name === 'StatusDefinition' && s.properties.some(p => p.name === 'spreadRule')));
  const invalid = source.replace('durationTurns: 3', 'durationTurns: 0.5').replace('idlePeakRule: { turns: 2', 'idlePeakRule: { turns: 0');
  const issues = analyze(programFor(root, { [file]: invalid }), root, file).issues;
  assert.ok(issues.some(i => i.path.endsWith('.durationTurns')));
  assert.ok(issues.some(i => i.path.endsWith('.idlePeakRule.turns')));
});
