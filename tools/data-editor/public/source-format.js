// Generate TypeScript literals, not JSON. Existing expressions/comments remain untouched.
export function sourceLiteral(value, reference = "''") {
    if (typeof value !== 'string') return JSON.stringify(value);
    if (reference.trimStart().startsWith('"')) return JSON.stringify(value);
    const content = JSON.stringify(value).slice(1, -1).replace(/\\(?:u[0-9a-fA-F]{4}|.)/g, escape => escape === '\\"' ? '"' : escape).replace(/'/g, "\\'");
    return "'" + content + "'";
}
export function propertyKey(key) { return /^[a-zA-Z_$][\w$]*$/.test(key) ? key : sourceLiteral(key); }
export function sourceValue(value, multiline = false) {
    if (Array.isArray(value)) return '[' + value.map(v => sourceValue(v)).join(', ') + ']';
    if (value && typeof value === 'object') {
        const parts = Object.entries(value).map(([key,v]) => propertyKey(key) + ': ' + sourceValue(v));
        return multiline ? '{\n' + parts.join(',\n') + ',\n}' : '{ ' + parts.join(', ') + ' }';
    }
    return sourceLiteral(value);
}
export function objectSource(n, entries) {
    const multiline = n.source.includes('\n');
    const last = n.entries.at(-1);
    const tail = last ? n.source.slice(last.end - n.start, -1) : n.source.slice(1, -1);
    const suffix = tail || (multiline ? '\n' : ' ');
    const parts = entries.map(e => e.raw ?? ((multiline ? '\n' : ' ') + (e.key === null ? '...' + e.node.source : e.keySource + ': ' + e.node.source)));
    return '{' + parts.join(',') + (entries.length ? suffix : suffix.replace(/^\s*,/, '')) + '}';
}
export function arraySource(items, n, source = '') {
    if (n?.separator) return items.map(i => i.source ?? i).join(n.separator);
    const multiline = !n || n.source.includes('\n');
    const raw = new Map();
    if (n) n.items.forEach((item,index) => {
        const start = index ? n.items[index - 1].end : n.start + 1;
        const prefix = source.slice(start,item.start).replace(/^\s*,/, '');
        raw.set(item.start, prefix + item.source);
    });
    const parts = items.map(i => raw.get(i.start) ?? ((multiline ? '\n' : '') + (i.source ?? i)));
    const last = n?.items.at(-1);
    const tail = last ? source.slice(last.end,n.end-1) : multiline ? '\n' : '';
    return '[' + parts.join(multiline ? ',' : ', ') + (items.length ? tail : tail.replace(/^\s*,/, '')) + ']';
}
export const portraitId = value => String(value ?? '').replace(/\.(png|webp|jpe?g)$/i, '');
export function portraitChoices(refs, current) { return [...new Set(['', ...refs.map(r => portraitId(r.key ?? r.assetFile)), portraitId(current)])]; }
