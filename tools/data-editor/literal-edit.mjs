import ts from 'typescript';

// Choices depend on registration keys/IDs/display names, not effect values or prose.
export function referenceSignature(source) {
    const file = ts.createSourceFile('data.ts', source, ts.ScriptTarget.Latest, true);
    const names = new Set(['CARD_DEFINITIONS', 'RELIC_DEFINITIONS', 'STATUS_DESCRIPTIONS', 'ENEMY_DEFINITIONS', 'ENEMY_SPRITES', 'EFFECT_SPRITES', 'UI_SPRITES', 'CHARACTER_PORTRAITS', 'CONVERSATIONS', 'CONVERSATION_EVENTS', 'EVENT_BATTLES', 'CARD_ARTWORK']);
    const result = [];
    for (const statement of file.statements) if (ts.isVariableStatement(statement)) for (const declaration of statement.declarationList.declarations) {
        if (!names.has(declaration.name.getText(file))) continue;
        let node = declaration.initializer;
        while (node && (ts.isAsExpression(node) || ts.isSatisfiesExpression(node) || ts.isParenthesizedExpression(node))) node = node.expression;
        if (node && ts.isCallExpression(node) && ['defineCardRegistry', 'defineRelicRegistry'].includes(node.expression.getText(file))) node = node.arguments[0];
        if (!node || !ts.isObjectLiteralExpression(node)) { result.push(source); continue; }
        result.push([declaration.name.getText(file), node.properties.map(property => {
            if (!ts.isPropertyAssignment(property)) return property.getText(file);
            let value = property.initializer;
            if (ts.isCallExpression(value)) value = value.arguments[0];
            const identity = value && ts.isObjectLiteralExpression(value) ? value.properties.filter(p => ['id', 'name', 'source'].includes(p.name?.text ?? p.name?.getText(file))).map(p => p.getText(file)) : [];
            return [property.name.getText(file), identity];
        })]);
    }
    return JSON.stringify(result);
}

// Only literal-number substitutions qualify. Property additions, identifiers,
// discriminators and text edits continue through the schema-aware path.
export function numericEdits(before, after) {
    const parse = source => ts.createSourceFile('data.ts', source, ts.ScriptTarget.Latest, true);
    const a = parse(before), b = parse(after);
    if (a.parseDiagnostics.length || b.parseDiagnostics.length) return null;
    const numbers = file => {
        const result = [];
        function visit(node) {
            if (ts.isNumericLiteral(node) || ts.isPrefixUnaryExpression(node) && ts.isNumericLiteral(node.operand)) result.push(node);
            else ts.forEachChild(node, visit);
        }
        visit(file); return result;
    };
    const x = numbers(a), y = numbers(b);
    if (x.length !== y.length) return null;
    const edits = x.flatMap((node, i) => node.getText(a) === y[i].getText(b) ? [] : [{ start: node.getStart(a), end: node.end, original: node.getText(a), replacement: y[i].getText(b) }]).reverse();
    let result = before;
    for (const edit of edits) {
        if (!Number.isFinite(Number(edit.replacement))) return null;
        result = result.slice(0, edit.start) + edit.replacement + result.slice(edit.end);
    }
    return result === after ? edits : null;
}

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
