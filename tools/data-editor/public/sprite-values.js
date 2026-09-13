const unwrap = n => n?.kind === 'wrap' ? unwrap(n.inner) : n;
// Preview reads only literals and the existing sprite helper's documented arguments; it never executes source.
export function spriteValues(n, model) {
    n = unwrap(n);
    const values = {};
    if (n?.kind === 'call' && n.callee === 'sprite') {
        const bindings = Object.fromEntries(['textureKey', 'source', 'size', 'opaqueBounds', 'bodyOffsetY'].map((key, i) => [key, literal(n.args[i])]));
        bindings.source = assetPath(n.args[1]);
        bindings.bodyOffsetY ??= 0;
        const template = model.declarations.find(d => d.name.startsWith('sprite /'))?.node;
        Object.assign(values, literal(template, bindings));
    }
    if (n?.kind === 'object')
        for (const e of n.entries) {
            if (e.key === null)
                Object.assign(values, spriteValues(e.node, model));
            else
                values[e.key] = e.key === 'source' ? assetPath(e.node) : literal(e.node);
        }
    return values;
}
function assetPath(n) { if (!n)
    return undefined; const match = n.source.match(/Sprite\/([^'"`]+\.(?:png|webp|jpg|jpeg))/i); return match?.[1] ?? n.value; }
export function literal(n, bindings = {}) {
    n = unwrap(n);
    if (!n) return undefined;
    if (['string', 'number', 'boolean'].includes(n.kind)) return n.value;
    if (n.kind === 'array') return n.items.map(item => literal(item, bindings));
    if (n.kind === 'object') return Object.fromEntries(n.entries.filter(e => e.key).map(e => [e.key, literal(e.node, bindings)]));
    if (Object.hasOwn(bindings, n.source)) return bindings[n.source];
    // Resolve only identifier interpolation, without evaluating arbitrary TS.
    if (n.source.startsWith('`') && n.source.endsWith('`')) {
        let valid = true;
        const text = n.source.slice(1, -1).replace(/\$\{([^}]+)\}/g, (_, name) => {
            if (!Object.hasOwn(bindings, name.trim()) || bindings[name.trim()] === undefined) valid = false;
            return String(bindings[name.trim()]);
        });
        return valid ? text : undefined;
    }
    const arithmetic = n.source.match(/^([\d.]+)\s*\/\s*([\d.]+)$/);
    if (arithmetic) return Number(arithmetic[1]) / Number(arithmetic[2]);
    return undefined;
}
