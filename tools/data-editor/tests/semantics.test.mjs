import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import ts from 'typescript';
import { analyze, programFor, formatSource } from '../schema.mjs';
import { ensureRequirements } from '../semantics.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const file = 'src/data/cards.ts';
const base = fs.readFileSync(path.join(root, file), 'utf8');
const original = "effect('hpDamage', 'selectedEnemy', 6, { attackAttribute: 'strike' })";
function model(expression) { return analyze(programFor(root, { [file]: base.replace(original, expression) }), root, file); }
function effectOf(m) { return m.declarations[0].node.entries[0].node.args[0].entries.find(e => e.key === 'effects').node.items[0]; }
test('status effect requires a status, auto-adds options and retains existing fields', () => {
  const m = model("effect('status', 'selectedEnemy', 6, { attackAttribute: 'strike' })");
  assert.ok(m.issues.some(i => i.path.endsWith('.status')));
  const next = ensureRequirements(m, effectOf(m).start);
  assert.match(next, /status: ''/); assert.match(next, /attackAttribute: 'strike'/);
  const updated = analyze(programFor(root, { [file]: next }), root, file);
  assert.ok(updated.issues.some(i => i.path.endsWith('.status') && i.message.includes('空欄')));
  assert.equal(effectOf(updated).args[3].entries.find(e => e.key === 'status').node.requiredByLogic, true);
  const resolved = analyze(programFor(root, { [file]: next.replace("status: ''", "status: 'Charm'") }), root, file);
  assert.equal(resolved.issues.length, 0);
});
test('no options argument is required until its chosen effect needs one', () => {
  const m = model("effect('addCardToHand', 'player', 1)");
  assert.match(ensureRequirements(m, effectOf(m).start), /cardId: ''/);
  assert.equal(model("effect('block', 'player', 1)").issues.length, 0);
  const empty = model("effect('status', 'player', 1, {})");
  const source = ensureRequirements(empty, effectOf(empty).start);
  assert.doesNotMatch(source, /\{\s*,/);
  assert.match(source, /status: ''/);
});
test('conditions require selectors and comparison operands while keeping false and zero valid', () => {
  for (const expression of ["condition('relic', 'has')", "condition('status', 'has')", "condition('flavorValue', 'eq')"]) {
    const source = base.replace("cost: 1,", `cost: 1, conditions: [${expression}],`);
    const m = analyze(programFor(root, { [file]: source }), root, file);
    assert.ok(m.issues.length, expression);
  }
  const source = base.replace('cost: 1,', "cost: 1, conditions: [condition('isPlayerTurn', 'eq', { value: false }), condition('cardsPlayedThisTurn', 'eq', { value: 0 })],");
  assert.equal(analyze(programFor(root, { [file]: source }), root, file).issues.length, 0);
});
test('required empty text, invalid target and reversed random range are caught before writing', () => {
  const source = base.replace("id: 'strike'", "id: ''");
  assert.ok(analyze(programFor(root, { [file]: source }), root, file).issues.some(i => i.path.endsWith('.id')));
  assert.ok(model("effect('retainBlock', 'allEnemies', 1)").issues.some(i => i.path.endsWith('.target')));
  assert.ok(model("effect('hpDamage', 'selectedEnemy', 1, { randomAmount: { min: 5, max: 1 } })").issues.some(i => i.message.includes('最小値')));
});
test('formatting fixes nested insertion indentation and preserves text and comments', () => {
  const source = "const data = {\n// retained\nname: ' leading text ',\neffects: [\n{ amount: 1 }\n]\n};";
  const formatted = formatSource(source);
  assert.match(formatted, /\n  effects: \[\n    \{ amount: 1 \}/);
  assert.match(formatted, /' leading text '/); assert.match(formatted, /\/\/ retained/);
  assert.equal(formatSource(formatted), formatted);
});
test('switching kinds removes only inactive blank selectors and preserves trailing comments', () => {
  const inactive = model("effect('block', 'player', 1, { status: '', attackAttribute: 'strike' })");
  const cleaned = ensureRequirements(inactive, effectOf(inactive).start);
  assert.doesNotMatch(cleaned, /status: ''/);
  assert.match(cleaned, /attackAttribute: 'strike'/);
  const retained = model("effect('block', 'player', 1, { status: 'Charm' })");
  assert.equal(ensureRequirements(retained, effectOf(retained).start), retained.source);
  const commented = model("effect('status', 'player', 1, { attackAttribute: 'strike', // retained comment\n })");
  const added = formatSource(ensureRequirements(commented, effectOf(commented).start));
  assert.match(added, /'strike', \/\/ retained comment/);
  assert.match(added, /status: ''/);
  assert.equal(ts.getPreEmitDiagnostics(programFor(root, { [file]: added.replace("status: ''", "status: 'Charm'") })).length, 0);
});
