import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Exercise draft state only; actual dialogs/layout/navigation are checked by the user.
const source = fs.readFileSync('tools/data-editor/public/app.js', 'utf8');
const ast = ts.createSourceFile('app.js', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const names = ['updateCodeState', 'codeStorageKey', 'discardCodeInput', 'confirmCodeNavigation', 'setCode'];
const functions = names.map(name => ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name.text === name).getText(ast)).join('\n');
const input = ast.statements.find(n => ts.isExpressionStatement(n) && n.expression.getText(ast).startsWith("$('source').oninput =")).getText(ast);
function fixture(answer = true) {
    const fields = Object.fromEntries(['source', 'parse', 'discard-code', 'code-note'].map(id => [id, {}]));
    const saved = new Map();
    const node = { start: 10, end: 21, source: '{ cost: 2 }' };
    const model = { source: 'persisted draft', declarations: [{ node }] };
    const context = vm.createContext({
        file: 'src/data/cards.ts', declaration: 'CARD_DEFINITIONS', entry: 'a', fullFile: false, focused: node,
        model, busy: false, parsingCodeScope: undefined, codeDirty: false, codeNeedsRefresh: false, codeScope: undefined, codeBaseline: '',
        cancelledOperation: Symbol('cancelled'), chosen: () => node, notice: () => {}, confirm: () => answer,
        $: id => fields[id], localStorage: { getItem: key => saved.get(key), setItem: (key, value) => saved.set(key, value), removeItem: key => saved.delete(key) },
    });
    vm.runInContext(functions + '\n' + input + '\nsetCode();', context);
    const edit = text => { fields.source.value = text; fields.source.oninput(); };
    return { fields, saved, context, model, edit };
}
test('cancelled navigation retains pending TS and persisted form data', () => {
    const f = fixture(false); f.edit('invalid TS');
    assert.throws(() => vm.runInContext('confirmCodeNavigation()', f.context), e => e === f.context.cancelledOperation);
    assert.equal(f.context.codeDirty, true);
    assert.equal(f.fields.source.value, 'invalid TS');
    assert.equal(f.saved.size, 1);
    assert.equal(f.model.source, 'persisted draft');
});
test('confirmed navigation and explicit discard remove only this pending TS draft', () => {
    for (const operation of ['confirmCodeNavigation()', 'discardCodeInput()']) {
        const f = fixture(); f.saved.set('other-entry', 'keep'); f.edit('invalid TS');
        vm.runInContext(operation, f.context);
        assert.equal(f.context.codeDirty, false);
        assert.equal(f.fields.source.value, '{ cost: 2 }');
        assert.equal(f.saved.size, 1);
        assert.equal(f.saved.get('other-entry'), 'keep');
        assert.equal(f.model.source, 'persisted draft');
    }
});
test('reverting TS to its original text clears the pending state without parsing', () => {
    const f = fixture(false); f.edit('changed'); f.edit('{ cost: 2 }');
    assert.equal(f.context.codeDirty, false);
    assert.equal(f.saved.size, 0);
    vm.runInContext('confirmCodeNavigation()', f.context);
    assert.equal(f.fields.parse.disabled, true);
});

test('navigation does not ask to discard TS already submitted for parsing', () => {
    const f = fixture(false);f.edit('submitted source');
    f.context.parsingCodeScope = vm.runInContext('codeStorageKey()', f.context);
    vm.runInContext('confirmCodeNavigation()', f.context);
    assert.equal(f.saved.size, 1); // Kept for recovery if parsing fails.
    assert.equal(f.fields.source.value, 'submitted source');
});
