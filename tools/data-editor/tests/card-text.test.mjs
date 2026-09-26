import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { programFor, analyze } from '../schema.mjs';
import { cardTextPreview } from '../card-text-preview.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const file = 'src/data/cards.ts';
const base = fs.readFileSync(path.join(root, file), 'utf8');
const damage = "effect('hpDamage', 'selectedEnemy', 6, { attackAttribute: 'strike' })";
const program = (description, expression = damage, more = '') => programFor(root, { [file]: base.replace("id: 'strike',", `id: 'strike', description: l(${JSON.stringify(description)}, ${JSON.stringify(description)}), ${more}`).replace(damage, expression) });
const text = rows => rows.flat().map(s => s.text).join('');

test('optional description and all current base cards preview without evaluating game code', () => {
  const p = programFor(root), m = analyze(p, root, file);
  assert.deepEqual(m.issues, []);
  const result = cardTextPreview(p, root, 'faint');
  assert.match(text(result.ja), /Peak余韻を全解除/);
  assert.match(text(result.ja), /失神×2/);
  assert.deepEqual(result.issues, []);
});
test('draft numeric edits, custom references and presentation-only order appear in the shared preview', () => {
  const p = program('Hit {effect.hit.amount}.', "effect('hpDamage', 'selectedEnemy', 9 + 3, { textId: 'hit' })", "temporary: true, textOrder: ['temporary', 'description'],");
  assert.deepEqual(analyze(p, root, file).issues, []);
  assert.match(text(cardTextPreview(p, root, 'strike').en), /^Hit 12\.Temporary$/);
});
test('editor rejects invalid or ambiguous l() placeholders, duplicate ids and missing order references', () => {
  for(const [description, expression, more] of [
    ['{amount}', damage, ''],
    ['{selectedEnemy.hpDamage.amount}', damage + ', ' + damage, ''],
    ['{effect.missing.amount}', damage, ''],
    ['{selectedEnemy.hpDamage.missing}', damage, ''],
    ['{effect.hit.amount}', "effect('hpDamage', 'selectedEnemy', 1, {textId:'hit'}),effect('epDamage','player',1,{textId:'hit'})", ''],
    ['plain', damage, "textOrder: ['effect.missing'],"],
  ]) assert.ok(analyze(program(description, expression, more), root, file).issues.length, description + more);
});
test('preview never executes draft expressions', () => {
  globalThis.__cardPreviewExecuted = false;
  const p = program('value', "effect('hpDamage','selectedEnemy', (() => { globalThis.__cardPreviewExecuted=true; return 999; })())");
  assert.throws(() => cardTextPreview(p, root, 'strike'), /解釈できない/);
  assert.equal(globalThis.__cardPreviewExecuted, false);
  delete globalThis.__cardPreviewExecuted;
});
