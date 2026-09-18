import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyze, programFor } from '../schema.mjs';
import { validateEventModels } from '../event-validation.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const conversationFile = 'src/data/conversations.ts', battleFile = 'src/data/eventBattles.ts', statusFile = 'src/data/statuses.ts';
function validate(overrides = {}) {
  const program = programFor(root, overrides);
  const models = [conversationFile, battleFile, 'src/data/sprites.ts'].map(file => analyze(program, root, file));
  return [...models.flatMap(model => model.issues), ...validateEventModels(root, ...models)];
}

test('event data allows omitted assets and editable page arrays', () => {
  assert.deepEqual(validate(), []);
  assert.deepEqual(validate({ [conversationFile]: read(conversationFile).replace("portrait: ''", "portrait: 'Succubus_idle.png'") }), []);
});

test('unknown dialogue IDs, empty encounters and invalid turn numbers are rejected', () => {
  const source = read(battleFile).replace("conversationId: 'tutorialTurn3'", "conversationId: 'missing'")
    .replace(/enemyIds: \[[^\]]*\]/, 'enemyIds: []').replace('turn: 3', 'turn: 0.5');
  const issues = validate({ [battleFile]: source });
  for (const text of ['会話ID', 'enemyIds', 'turn']) assert.ok(issues.some(issue => issue.message.includes(text)), text);
});

test('unregistered portraits, missing backgrounds and empty dialogue bodies are rejected', () => {
  const source = read(conversationFile).replace("portrait: ''", "portrait: 'missing.png'")
    .replace("background: ''", "background: '../outside.png'").replace('Tutorial dialogue 1 (placeholder).', '');
  const issues = validate({ [conversationFile]: source });
  for (const text of ['立ち絵', '背景画像', '空欄']) assert.ok(issues.some(issue => issue.message.includes(text)), text);
});

test('restriction settings validate ranges while the reserved empty narration remains valid', () => {
  const source = read(statusFile);
  assert.deepEqual(analyze(programFor(root), root, statusFile).issues, []);
  const invalid = source.replace('turnStartEnergy: 1', 'turnStartEnergy: -1').replace('receivedEpDamage: 1', 'receivedEpDamage: -1')
    .replace('removeAboveHpRatio: 0.25', 'removeAboveHpRatio: 2').replace('hpDrainProgress: { count: 2', 'hpDrainProgress: { count: 0');
  const issues = analyze(programFor(root, { [statusFile]: invalid }), root, statusFile).issues;
  for (const suffix of ['.turnStartEnergy', '.receivedEpDamage', '.removeAboveHpRatio', '.hpDrainProgress.count']) assert.ok(issues.some(issue => issue.path.endsWith(suffix)), suffix);
});
