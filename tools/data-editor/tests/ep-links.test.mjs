import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { analyze, programFor } from '../schema.mjs';
const root = process.cwd();
test('new relic/card definitions are editable; sensitivity part, targets and orgasm intervals are validated', () => {
  const program = programFor(root);
  for (const file of ['src/data/relics.ts', 'src/data/cards.ts', 'src/data/cardText.ts']) assert.deepEqual(analyze(program, root, file).issues, [], file);
  const relicFile = 'src/data/relics.ts', cardFile = 'src/data/cards.ts';
  const relics = fs.readFileSync(relicFile, 'utf8').replace('orgasmInterval: 10', 'orgasmInterval: 0').replace('statusConsumptionBonus: { Aftershocks: 1 }', 'statusConsumptionBonus: { Aftershocks: -1 }');
  const cards = fs.readFileSync(cardFile, 'utf8').replace("{ sensitivityPart: 'C' }", '{}').replace("effect('shareEpDamage', 'selectedEnemy', 0)", "effect('shareEpDamage', 'player', 1)");
  const invalid = programFor(root, { [relicFile]: relics, [cardFile]: cards });
  const issues = analyze(invalid, root, relicFile).issues.concat(analyze(invalid, root, cardFile).issues);
  assert.ok(issues.some(i => i.path.endsWith('.orgasmInterval')));
  assert.ok(issues.some(i => i.path.endsWith('.Aftershocks')));
  assert.ok(issues.some(i => i.path.endsWith('.sensitivityPart')));
  assert.ok(issues.some(i => i.message.includes('敵を対象')));
});
