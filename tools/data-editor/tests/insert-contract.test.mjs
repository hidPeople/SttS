import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyze, programFor, contracts, contractChanges } from '../schema.mjs';
import { ensureRequirements } from '../semantics.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const file = 'src/data/cards.ts';
const base = fs.readFileSync(path.join(root, file), 'utf8');
const build = expression => analyze(programFor(root, { [file]: base.replace('cost: 1,', `cost: 1, conditions: [${expression}],`) }), root, file);
const children = n => [n, ...[...(n.args ?? []), ...(n.items ?? []), ...(n.entries ?? []).map(e => e.node), ...(n.inner ? [n.inner] : [])].flatMap(children)];
const condition = m => m.declarations.flatMap(d => children(d.node)).find(n => n.callee === 'condition');
test('new presence conditions accept has/notHas and require selectors', () => {
    for (const [kind, key, value] of [['enemyTrait', 'enemyTrait', "'male'"], ['bodyPartStatus', 'parts', "['V']"]]) {
        const m = build(`condition('${kind}', 'notHas')`);
        assert.ok(m.issues.some(i => i.path.endsWith(`.${key}`)));
        const source = ensureRequirements(m, condition(m).start);
        assert.ok(source.includes(`${key}: ${kind === 'enemyTrait' ? "''" : '[]'}`));
        const valid = build(`condition('${kind}', 'has', { ${key}: ${value} })`);
        assert.deepEqual(valid.issues, []);
        assert.ok(build(`condition('${kind}', 'eq', { ${key}: ${value}, value: true })`).issues.some(i => i.message.includes('数値')));
        assert.deepEqual(build(`condition('${kind}', 'eq', { ${key}: ${value}, value: 0 })`).issues, []);
    }
});
test('empty selectors and explicit empty body status kinds are rejected; omitted kinds stay optional', () => {
    assert.ok(build("condition('enemyTrait', 'has', { enemyTraits: [] })").issues.some(i => i.path.endsWith('.enemyTraits')));
    assert.ok(build("condition('bodyPartStatus', 'has', { parts: [] })").issues.some(i => i.path.endsWith('.parts')));
    assert.ok(build("condition('bodyPartStatus', 'has', { parts: ['A'], bodyPartStatusKinds: [] })").issues.some(i => i.path.endsWith('.bodyPartStatusKinds')));
    assert.deepEqual(build("condition('enemyTrait', 'has', { enemyTraits: ['male', 'sexToy'] })").issues, []);
    const m = build("condition('bodyPartStatus', 'has', { parts: ['A'] })");
    assert.equal(ensureRequirements(m, condition(m).start), m.source);
});
test('new rule forms, variants and arrow helper templates follow the source contract', () => {
    const p = programFor(root), cards = analyze(p, root, file), enemies = analyze(p, root, 'src/data/enemies.ts');
    const schemas = Object.values(cards.schemas);
    assert.ok(schemas.some(s => s.name === 'CardDisplayNameRule' && s.properties.some(p => p.name === 'conditions' && !p.optional) && s.properties.some(p => p.name === 'name' && !p.optional)));
    assert.ok(Object.values(enemies.schemas).some(s => s.name === 'EnemyReactionVariant' && s.properties.some(p => p.name === 'conditions' && p.optional)));
    for (const name of ['noInsertAt', 'noInsertOrIntrusionAt', 'hasInsertOrIntrusionAt']) {
        const d = enemies.declarations.find(d => d.template && d.name.startsWith(name + ' /'));
        assert.ok(d); assert.equal(d.node.kind, 'array');
        assert.ok(enemies.declarations.flatMap(d => children(d.node)).some(n => n.callee === name && n.definition.start === d.node.start));
    }
    assert.deepEqual(cards.issues, []); assert.deepEqual(enemies.issues, []);
    assert.deepEqual(contractChanges(JSON.parse(fs.readFileSync(path.join(root, 'tools/data-editor/schema-baseline.json'), 'utf8')), contracts(p, root)), []);
});
