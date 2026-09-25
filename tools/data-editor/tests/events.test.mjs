import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyze, programFor } from '../schema.mjs';
import { validateEventModels } from '../event-validation.mjs';
import { validatePortraitModels } from '../portrait-validation.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const conversationFile = 'src/data/conversations.ts', battleFile = 'src/data/eventBattles.ts', statusFile = 'src/data/statuses.ts';
test('portrait configuration validates files, unique tags and fractional bounds without crashing on incomplete drafts', () => {
  const file='src/data/portraitFactors.ts', placement='src/data/characterPortraits.ts';
  const check=(drafts={})=>{
    const p=programFor(root,drafts), models=[placement,file].map(f=>analyze(p,root,f));
    return [...models.flatMap(m=>m.issues),...validatePortraitModels(root,...models)];
  };
  assert.deepEqual(check(),[]);
  const alias="Succubus_Death_1: 'Succubus_tutorial_Starvation_EPdamage_1'";
  assert.ok(check({[placement]:read(placement).replace(alias,"Succubus_Death_1: 'Succubus_Death_1'")}).some(i=>i.message.includes('循環')));
  assert.ok(check({[placement]:read(placement).replace(alias,"Succubus_Death_1: 'Succubus_Missing_1'")}).some(i=>i.message.includes('画像がありません')));
  assert.ok(check({[placement]:read(placement).replace('Succubus_normal_idle_1:', 'Succubus_normal_idle_999:')}).some(i=>i.message.includes('画像がありません')));
  assert.ok(check({[file]:read(file).replace('relics: []',"relics: ['Starvation']")}).some(i=>i.message.includes('一意')));
  assert.ok(check({[file]:read(file).replace("states: ['Death']", "states: ['Death', 'Death']")}).some(i=>i.message.includes('一意')));
  assert.ok(check({[file]:read(file).replace('  relics: [],','')}).some(i=>i.message.includes('必須')));
});
function validate(overrides = {}) {
  const program = programFor(root, overrides);
  const models = [conversationFile, battleFile, 'src/data/characterPortraits.ts'].map(file => analyze(program, root, file));
  return [...models.flatMap(model => model.issues), ...validateEventModels(root, ...models)];
}

test('event data allows omitted assets and editable page arrays', () => {
  assert.deepEqual(validate(), []);
  assert.deepEqual(validate({ [conversationFile]: read(conversationFile).replace("portrait: ''", "portrait: 'Succubus_normal_idle_1.png'") }), []);
  assert.deepEqual(validate({ [conversationFile]: read(conversationFile).replace("portrait: ''", "portrait: 'Succubus_Death_1'") }), []);
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

test('intro and conditional defeat dialogues reject unregistered conversation references', () => {
  const source = read(battleFile).replace("introConversationId: 'tutorialBeforeBattle'", "introConversationId: 'missingIntro'").replace("conversationId: 'tutorialDefeat1'", "conversationId: 'missingDefeat'");
  const issues = validate({ [battleFile]: source });
  for (const id of ['missingIntro', 'missingDefeat']) assert.ok(issues.some(issue => issue.message.includes(id)), id);
});

test('conversation background darkness is editable and bounded from zero to one', () => {
  assert.deepEqual(validate(), []);
  for (const value of [-0.1, 1.1]) {
    const source = read(conversationFile).replace('backgroundDim: 0.6', 'backgroundDim: ' + value);
    assert.ok(validate({ [conversationFile]: source }).some(issue => issue.message.includes('backgroundDim')));
  }
});


test('before-draw cardIds is optional in the editor and dialogue-only definitions validate', () => {
  const program = programFor(root);
  const model = analyze(program, root, battleFile);
  const field = Object.values(model.schemas).flatMap(s => s.properties ?? []).find(p => p.name === 'cardIds');
  assert.ok(field?.optional);
  const source = read(battleFile).replace(/, cardIds: \['seduction'\]/g, '');
  const draft = analyze(programFor(root, { [battleFile]: source }), root, battleFile);
  assert.deepEqual(draft.issues, []);
});
