const unwrap = n => n?.kind === 'wrap' ? unwrap(n.inner) : n;
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const encode = value => typeof value === 'object' && value !== null
    ? `{ ${Object.entries(value).map(([key, v]) => `${key}: ${JSON.stringify(v)}`).join(', ')} }`
    : JSON.stringify(value);
function edits(n, changes) {
    let source = n.source;
    for (const edit of changes.sort((a, b) => b.start - a.start)) source = source.slice(0, edit.start - n.start) + edit.text + source.slice(edit.end - n.start);
    return source;
}
function objectChanges(n, replacements, additions) {
    if (additions.length) {
        const last = n.entries.at(-1);
        // Put separators before trailing comments; keep the existing comments.
        const tail = n.source.slice(last ? last.end - n.start : 1, -1);
        const needsComma = last && !/^\s*,/.test(tail);
        if (needsComma && last.end !== n.end - 1) replacements.push({ start: last.end, end: last.end, text: ',' });
        replacements.push({ start: n.end - 1, end: n.end - 1, text: `${needsComma && last.end === n.end - 1 ? ',' : ''}\n${additions.join(',\n')}\n` });
    }
    return edits(n, replacements);
}
function boundsSource(node, values) {
    node = unwrap(node);
    if (node?.kind !== 'object') return encode(values);
    const replacements = [], additions = [];
    for (const [key, value] of Object.entries(values)) {
        const entry = node.entries.find(e => e.key === key);
        if (entry) {
            if (entry.node.value !== value) replacements.push({ start: entry.node.start, end: entry.node.end, text: encode(value) });
        } else additions.push(`${key}: ${encode(value)}`);
    }
    return objectChanges(node, replacements, additions);
}
const sourceValue = (key, value, old) => key === 'opaqueBounds' ? boundsSource(old, value)
    : key === 'source' ? `new URL(${JSON.stringify('../../Sprite/' + value)}, import.meta.url).href` : encode(value);

/** Change values in their existing location; helper-only defaults use minimal overrides. */
export function updateSpriteSource(target, before, after) {
    const changes = Object.fromEntries(Object.entries(after).filter(([key, value]) => key !== 'size' && value !== undefined && !equal(before[key], value)));
    function update(n, pending) {
        if (n.kind === 'wrap') return edits(n, [{ start: n.inner.start, end: n.inner.end, text: update(n.inner, pending) }]);
        const replacements = [], remaining = { ...pending };
        if (n.kind === 'object') {
            for (const [key, value] of Object.entries(pending)) {
                const entry = n.entries.findLast(e => e.key === key);
                if (entry) {
                    replacements.push({ start: entry.node.start, end: entry.node.end, text: sourceValue(key, value, entry.node) });
                    delete remaining[key];
                }
            }
            const spread = n.entries.findLast(e => e.key === null && unwrap(e.node)?.kind === 'call' && unwrap(e.node).callee === 'sprite');
            if (spread) {
                const writable = Object.fromEntries(Object.entries(remaining).filter(([key]) => ['textureKey', 'source', 'opaqueBounds', 'bodyOffsetY'].includes(key)));
                // size controls both axes, so never change the other axis implicitly.
                if (!n.entries.some(e => ['displayWidth', 'displayHeight'].includes(e.key)) && after.displayWidth === after.displayHeight && ('displayWidth' in remaining || 'displayHeight' in remaining)) {
                    writable.displayWidth = after.displayWidth; writable.displayHeight = after.displayHeight;
                }
                if (Object.keys(writable).length) {
                    replacements.push({ start: spread.node.start, end: spread.node.end, text: update(spread.node, writable) });
                    for (const key of Object.keys(writable)) delete remaining[key];
                }
            }
            return objectChanges(n, replacements, Object.entries(remaining).map(([key, value]) => `${key}: ${sourceValue(key, value)}`));
        }
        if (n.kind === 'call' && n.callee === 'sprite') {
            const args = { textureKey: 0, source: 1, opaqueBounds: 3, bodyOffsetY: 4 };
            if (after.displayWidth === after.displayHeight && ('displayWidth' in pending || 'displayHeight' in pending)) {
                replacements.push({ start: n.args[2].start, end: n.args[2].end, text: encode(after.displayWidth) });
                delete remaining.displayWidth; delete remaining.displayHeight;
            }
            for (const [key, index] of Object.entries(args)) if (key in remaining) {
                const arg = n.args[index], text = sourceValue(key, remaining[key], arg);
                if (arg) replacements.push({ start: arg.start, end: arg.end, text });
                else replacements.push({ start: n.end - 1, end: n.end - 1, text: `${n.source.slice(n.args.at(-1).end - n.start, -1).trim().startsWith(',') ? '' : ','} ${text}` });
                delete remaining[key];
            }
            const call = edits(n, replacements);
            return Object.keys(remaining).length ? `{\n...${call},\n${Object.entries(remaining).map(([key, value]) => `${key}: ${sourceValue(key, value)}`).join(',\n')}\n}` : call;
        }
        if (!Object.keys(pending).length) return n.source;
        return `{\n...${n.source},\n${Object.entries(pending).map(([key, value]) => `${key}: ${sourceValue(key, value)}`).join(',\n')}\n}`;
    }
    return Object.keys(changes).length ? update(target, changes) : target.source;
}
