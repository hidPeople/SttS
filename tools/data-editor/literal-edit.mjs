import ts from 'typescript';

// Syntax-only fast path: no compiler program, inferred schema or source formatting.
// Full semantic checks still run before structural edits, validation and apply.
export function editLiteral(source, { start, end, original, replacement }) {
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end <= start || end > source.length || source.slice(start, end) !== original) throw Error('入力位置が変わりました。最新の下書きを読み込んでください。');
    if (typeof replacement !== 'string') throw Error('置換値が不正です。');
    const file = ts.createSourceFile('data.ts', source, ts.ScriptTarget.Latest, true);
    if (file.parseDiagnostics.length) throw Error('構文エラーを修正してから入力してください。');
    const kind = n => ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) ? 'string' : ts.isNumericLiteral(n) || ts.isPrefixUnaryExpression(n) && ts.isNumericLiteral(n.operand) ? 'number' : null;
    let target;
    function visit(n) { if (n.getStart(file) === start && n.end === end && kind(n)) target = n; else if (n.pos <= start && n.end >= end) ts.forEachChild(n, visit); }
    visit(file);
    const parsed = ts.createSourceFile('value.ts', `const value = ${replacement};`, ts.ScriptTarget.Latest, true);
    const value = parsed.statements[0]?.declarationList?.declarations[0]?.initializer;
    if (!target || parsed.parseDiagnostics.length || parsed.statements.length !== 1 || !value || value.getText(parsed) !== replacement || kind(value) !== kind(target)) throw Error('この変更にはフォーム全体の解析が必要です。');
    if (kind(value) === 'number' && !Number.isFinite(Number(replacement))) throw Error('有限の数値を入力してください。');
    return source.slice(0, start) + replacement + source.slice(end);
}
