import test from 'node:test';
import assert from 'node:assert/strict';
import { programFor, analyze } from '../schema.mjs';
import { validatePortraitModels } from '../portrait-validation.mjs';
import { referenceFieldRule } from '../public/reference-fields.js';
const root = process.cwd();
const file = 'src/data/characterPortraits.ts';
function validate(mapping) {
  const program = programFor(root, { [file]: `export const CHARACTER_PORTRAITS = {};
    export const CHARACTER_PORTRAIT_CARD_ALIASES: Record<string, string> = ${mapping};` });
  return validatePortraitModels(root, analyze(program, root, file), analyze(program, root, 'src/data/portraitFactors.ts'));
}
test('portrait card mappings use card choices and validate registered IDs and direct references', () => {
  assert.deepEqual(referenceFieldRule('rubOne', 'CHARACTER_PORTRAIT_CARD_ALIASES'), ['cards', 'key']);
  assert.deepEqual(validate("{rubOne: 'rubOneOut'}"), []);
  assert.ok(validate("{missing: 'rubOneOut'}").some(issue => issue.message.includes('登録')));
  assert.ok(validate("{rubOne: 'missing'}").some(issue => issue.message.includes('登録')));
  assert.ok(validate("{rubOne: 'rubOneOut', rubOneOut: 'rubOne'}").some(issue => issue.message.includes('循環')));
});
