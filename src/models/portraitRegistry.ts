import type { CharacterPortraitDefinition, CharacterPortraitPlacement } from './types';

/** Resolve aliases once. Texture keys and placement are shared, with no duplicated image data. */
export function resolvePortraitRegistry(sources: Record<string, string>, definitions: Record<string, CharacterPortraitPlacement | string>, defaults: CharacterPortraitPlacement) {
  const assets: Record<string, CharacterPortraitDefinition> = {};
  const issues: Record<string, string> = {};
  const visiting = new Set<string>();
  const own = (object: object, key: string) => Object.prototype.hasOwnProperty.call(object, key);
  function resolve(id: string): CharacterPortraitDefinition | undefined {
    if (own(assets, id)) return assets[id];
    if (own(issues, id)) return;
    if (visiting.has(id)) { issues[id] = `立ち絵の循環参照: ${id}`; return; }
    visiting.add(id);
    const definition = own(definitions, id) ? definitions[id] : undefined;
    let asset: CharacterPortraitDefinition | undefined;
    if (typeof definition === 'string') {
      asset = resolve(definition);
      if (!asset) issues[id] = `立ち絵の参照先を解決できません: ${id} → ${definition}`;
    } else if (own(sources, id)) {
      asset = { textureKey: `character:${id}`, source: sources[id], ...defaults, ...definition };
    } else issues[id] = `立ち絵の画像がありません: ${id}`;
    visiting.delete(id);
    if (asset) assets[id] = asset;
    return asset;
  }
  for (const id of new Set([...Object.keys(sources), ...Object.keys(definitions)])) resolve(id);
  return { assets, issues };
}
