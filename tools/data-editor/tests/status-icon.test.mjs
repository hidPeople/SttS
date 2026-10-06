import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { analyze, programFor } from '../schema.mjs';
import { statusReferenceOptions, validateStatusIconReferences, validateRelicIconReferences } from '../status-icon-references.mjs';
import { REFERENCE_FIELDS, referenceFieldRule } from '../public/reference-fields.js';
import { help } from '../public/help.js';
const root = process.cwd(), program = programFor(root), file = 'src/data/statuses.ts';

test('icon references include generated IDs and retain existing labels and definition links', () => {
  const options = statusReferenceOptions(program, root, [{ key: 'Starvation', label: '飢餓' }]);
  assert.equal(options.filter(item => item.key === 'Starvation').length, 1);
  assert.equal(options.find(item => item.key === 'Starvation').label, '飢餓');
  for (const part of ['A', 'B', 'C', 'V', 'M']) for (let level = 1; level <= 5; level++) {
    assert.ok(options.find(item => item.key === part + 'SensitivityLv' + level)?.definition);
  }
  assert.deepEqual(REFERENCE_FIELDS.iconImage, ['statuses', 'key']);
  assert.ok(help.iconImage);
});

test('preflight accepts absent images and image sharing, but reports cycles at their configuration', () => {
  assert.deepEqual(validateStatusIconReferences(analyze(program, root, file)), []);
  const text = fs.readFileSync(file, 'utf8');
  const draft = text.replace('Starvation: defineStatus({', "Starvation: defineStatus({ iconImage: 'Hunger',")
    .replace('Hunger: defineStatus({', "Hunger: defineStatus({ iconImage: 'Starvation',");
  const issues = validateStatusIconReferences(analyze(programFor(root, { [file]: draft }), root, file));
  assert.equal(issues.length, 2);
  assert.ok(issues.every(i => i.file === file && i.line > 0 && i.message.includes('循環参照')));
  const valid = text.replace('Hunger: defineStatus({', "Hunger: defineStatus({ iconImage: 'ASensitivityLv1',");
  assert.deepEqual(validateStatusIconReferences(analyze(programFor(root, { [file]: valid }), root, file)), []);
});

test('relic image references select registration keys and detect cycles by those keys', () => {
  assert.deepEqual(referenceFieldRule('iconImage', 'RELIC_DEFINITIONS'), ['relics', 'key']);
  assert.deepEqual(referenceFieldRule('iconImage', 'STATUS_DESCRIPTIONS'), ['statuses', 'key']);
  const relicFile = 'src/data/relics.ts';
  assert.deepEqual(validateRelicIconReferences(analyze(program, root, relicFile)), []);
  const text = fs.readFileSync(relicFile, 'utf8');
  const draft = text.replace('succubusBlood: defineRelic({', "succubusBlood: defineRelic({ iconImage: 'contractSigil',")
    .replace('contractSigil: defineRelic({', "contractSigil: defineRelic({ iconImage: 'succubusBlood',");
  const model = analyze(programFor(root, { [relicFile]: draft }), root, relicFile);
  const issues = validateRelicIconReferences(model);
  assert.equal(issues.length, 2);
  assert.ok(issues.every(i => i.file === relicFile && i.line > 0 && i.message.includes('succubusBlood') && i.message.includes('レリック')));
  const input = model.declarations.find(d => d.name === 'RELIC_DEFINITIONS').node.entries.find(e => e.key === 'succubusBlood').node.args[0];
  for (const key of ['iconImage', 'iconText', 'iconColor']) assert.ok(input.entries.some(e => e.key === key));
});
