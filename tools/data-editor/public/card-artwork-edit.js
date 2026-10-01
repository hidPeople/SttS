import { objectSource, propertyKey, sourceValue } from './source-format.js';

export const artworkKeys = ['focusX', 'focusY', 'scale', 'offsetX', 'offsetY', 'rotation', 'edgeFade'];
export function validateArtworkValues(values) {
  for (const key of artworkKeys) if (values[key] !== undefined && !Number.isFinite(values[key])) throw Error(`${key} は有限の数値を入力してください。`);
  if (values.scale !== undefined && values.scale <= 0) throw Error('scale は0より大きくしてください。');
  if (values.edgeFade !== undefined && values.edgeFade < 0) throw Error('edgeFade は0以上にしてください。');
}
function rawEntry(parent, entry, source = entry.node.source) {
  const raw = parent.source.slice(entry.start - parent.start, entry.end - parent.start);
  const start = entry.node.start - entry.start;
  return { ...entry, raw: raw.slice(0, start) + source + raw.slice(start + entry.node.source.length) };
}
function placementSource(node, values) {
  validateArtworkValues(values);
  if (!node) return sourceValue(values);
  if (node.kind !== 'object') throw Error('配置の式はTS欄で編集してください。プレビュー保存にはオブジェクト形式が必要です。');
  const keys = new Set();
  const entries = node.entries.flatMap(e => {
    keys.add(e.key);
    if (!artworkKeys.includes(e.key)) return [rawEntry(node, e)];
    if (values[e.key] === undefined && e.node.kind !== 'number') throw Error(`${e.key} に式があります。TS欄で編集してください。`);
    return values[e.key] === undefined ? [] : [rawEntry(node, e, sourceValue(values[e.key]))];
  });
  for (const key of artworkKeys) if (!keys.has(key) && values[key] !== undefined) entries.push({ raw: ` ${key}: ${sourceValue(values[key])}` });
  return objectSource(node, entries);
}
/** Only changed battle placements are replaced. Other fields, comments and formatting survive. */
export function updateCardArtworkSource(node, changes) {
  const remaining = new Map(changes);
  const entries = node.entries.map(e => {
    if (!remaining.has(e.key)) return rawEntry(node, e);
    const source = placementSource(e.node, remaining.get(e.key));
    remaining.delete(e.key);
    return rawEntry(node, e, source);
  });
  for (const [key, values] of remaining) entries.push({ raw: ` ${propertyKey(key)}: ${placementSource(null, values)}` });
  return objectSource(node, entries);
}
