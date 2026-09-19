import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const source = fs.readFileSync(new URL('../src/ui/textLayout.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const module = { exports: {} };
new Function('module', 'exports', js)(module, module.exports);
const { wrapTextSegments } = module.exports;
const measure = ({ text }) => [...text].reduce((sum, char) => sum + (char.charCodeAt(0) < 128 ? 1 : 2), 0);
const wrap = (text, width, mode = 'character') => wrapTextSegments([[{ text }]], width, measure, mode).map(line => line.map(s => s.text).join(''));

test('log wrapping fills mixed Japanese/Latin lines across spaces and alphabet boundaries', () => {
  assert.deepEqual(wrap('日本語 ABCDE', 10), ['日本語 ABC', 'DE']);
  assert.deepEqual(wrap('スライムAは次の行動', 12), ['スライムAは', '次の行動']);
  assert.deepEqual(wrap('abc defgh', 6), ['abc de', 'fgh']);
  assert.deepEqual(wrap('日本語 ABCDE', 10, 'word'), ['日本語', 'ABCDE']);
});

test('log punctuation remains on the preceding line and explicit newlines remain intact', () => {
  assert.deepEqual(wrap('あいう。次', 6), ['あいう。', '次']);
  assert.deepEqual(wrap('あいう、次', 6), ['あいう、', '次']);
  assert.deepEqual(wrap('ABC,DEF.', 3), ['ABC,', 'DEF.']);
  assert.deepEqual(wrap('AB\r\nCD\n\nEF', 3), ['AB', 'CD', '', 'EF']);
});
