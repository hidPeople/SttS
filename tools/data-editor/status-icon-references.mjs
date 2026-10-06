import ts from 'typescript';
import path from 'node:path';

/** Include generated status IDs (e.g. sensitivity levels), without executing project data. */
export function statusReferenceOptions(program, root, existing) {
    const source = program.getSourceFile(path.join(root, 'src/data/statuses.ts'));
    const declaration = source?.statements.filter(ts.isVariableStatement).flatMap(n => [...n.declarationList.declarations]).find(n => n.name.getText(source) === 'STATUS_DESCRIPTIONS');
    if (!declaration) return existing;
    const checker = program.getTypeChecker();
    const result = [...existing];
    for (const property of checker.getTypeAtLocation(declaration.name).getProperties()) {
        const key = property.name;
        if (!result.some(item => item.key === key)) result.push({ key, label: key,
            definition: { file: 'src/data/statuses.ts', declaration: 'STATUS_DESCRIPTIONS', name: key } });
    }
    return result;
}

/** Detect cycles among explicitly configured image references; missing IDs use reference validation. */
export function validateStatusIconReferences(model) {
    return validateIconReferences(model, 'STATUS_DESCRIPTIONS', '状態異常');
}

export function validateRelicIconReferences(model) {
    return validateIconReferences(model, 'RELIC_DEFINITIONS', 'レリック');
}

function validateIconReferences(model, declaration, label) {
    const entries = model.declarations.find(d => d.name === declaration)?.node.entries ?? [];
    const links = new Map();
    for (const entry of entries) {
        const object = entry.node.kind === 'call' ? entry.node.args[0] : entry.node;
        const image = object?.entries?.find(p => p.key === 'iconImage')?.node;
        const id = entry.key;
        if (id && image?.kind === 'string') links.set(id, image);
    }
    const issues = [];
    for (const [key, node] of links) {
        const seen = new Set();
        let current = key;
        while (links.has(current)) {
            if (seen.has(current)) {
                issues.push({ file: model.file, line: model.source.slice(0, node.start).split('\n').length, code: 'CONFIG',
                    message: `iconImage: ${label}画像の循環参照があります: ${[...seen, current].join(' → ')}` });
                break;
            }
            seen.add(current);
            current = links.get(current).value;
        }
    }
    return issues;
}
