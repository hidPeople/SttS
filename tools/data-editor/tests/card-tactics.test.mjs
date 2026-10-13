import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyze, programFor } from '../schema.mjs';
import { ensureRequirements } from '../semantics.mjs';
import { numericPolicy, isColorField } from '../public/field-policy.js';
import { cardTextPreview } from '../card-text-preview.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const file = 'src/data/cards.ts', source = fs.readFileSync(path.join(root, file), 'utf8');
const original = "effect('hpDamage', 'selectedEnemy', 6, { attackAttribute: 'strike' })";
const model = expression => analyze(programFor(root, { [file]: source.replace(original, expression) }), root, file);
const firstEffect = m => m.declarations.find(d => d.name === 'CARD_DEFINITIONS').node.entries.find(e => e.key === 'strike').node.args[0].entries.find(e => e.key === 'effects').node.items[0];

test('new card effects expose required options and auto-create them after selecting a kind', () => {
  for (const [kind, target, amount, required] of [
    ['inspectDeck', 'player', 5, ['takeCount']],
    ['transformGeneratedCards', 'player', 0, ['cardId']],
    ['chooseEffect', 'player', 0, ['choices', 'textId']],
    ['clearConnections', 'allEnemies', 0, ['connectionParts']],
  ]) {
    const m = model(`effect('${kind}', '${target}', ${amount})`);
    for (const key of required) assert.ok(m.issues.some(i => i.path.endsWith('.' + key)), key);
    const updated = ensureRequirements(m, firstEffect(m).start);
    for (const key of required) assert.match(updated, new RegExp(key + ':'));
  }
});

test('all new cards preview and new settings remain available to generic forms', () => {
  const p = programFor(root), m = analyze(p, root, file);
  assert.deepEqual(m.issues, []);
  const schemas = Object.values(m.schemas);
  for (const key of ['choices', 'growthUses', 'connectionParts', 'takeCount']) assert.ok(schemas.some(s => s.properties?.some(v => v.name === key)), key);
  for (const id of ['shrewd','tidyUp','dozeOff','thrash','bite','succubusFluid','adapt','throwCards','projectileX']) {
    const preview = cardTextPreview(p, root, id);
    assert.deepEqual(preview.issues, [], id);
    for (const language of ['ja','en']) {
      const text = preview[language].flat().map(s => s.text).join('');
      assert.ok(text.length > 0, id); assert.doesNotMatch(text, /\{[^}]+\}/, id);
      if (id === 'adapt') assert.match(text, /8/);
    }
  }
  assert.deepEqual(analyze(p, root, 'src/data/statuses.ts').issues, []);
  assert.deepEqual(analyze(p, root, 'src/data/cardTacticsUi.ts').issues, []);
});

test('invalid inspection counts, unsupported choices and growth factors are rejected', () => {
  for (const expression of [
    "effect('inspectDeck','player',5,{takeCount:6})",
    "effect('inspectDeck','player',1.5,{takeCount:1})",
    "effect('chooseEffect','player',0,{textId:'x',choices:[effect('hpDamage','selectedEnemy',3)],growthUses:-1})",
    "effect('clearConnections','player',0,{connectionParts:['M']})",
  ]) assert.ok(model(expression).issues.length, expression);
  const statusFile = 'src/data/statuses.ts';
  const invalid = fs.readFileSync(path.join(root,statusFile),'utf8').replace('epGrowthPerTurn: 1.1','epGrowthPerTurn: 0.9');
  assert.ok(analyze(programFor(root,{[statusFile]:invalid}),root,statusFile).issues.some(i=>i.path.endsWith('.epGrowthPerTurn')));
});


test('selection presentation settings expose color, alpha and spacing constraints', () => {
  const context = {declaration:'CARD_TACTICS_UI'};
  for (const key of ['takeColor','discardColor','selectedColor']) {
    assert.equal(isColorField(key,context.declaration),true);
    assert.equal(numericPolicy(key,context).max,0xffffff);
  }
  assert.equal(numericPolicy('selectedAlpha',context).max,1);
  assert.equal(numericPolicy('inspectGroupGap',context).min,0);
  assert.equal(numericPolicy('epGrowthPerTurn').min,1);
  assert.equal(numericPolicy('takeCount').integer,true);
});
