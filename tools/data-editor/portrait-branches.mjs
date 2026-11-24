import fs from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import sharp from 'sharp';
import { galleryThumbnail } from '../gallery-thumbnail.mjs';
import { portraitDataValues } from './portrait-preview-config.mjs';

// Only these implementation modules are loaded. Configuration is read as literals.
async function model(name) {
  const source = await fs.readFile(new URL('../../src/models/' + name + '.ts', import.meta.url), 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
  return import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));
}
const [{ PortraitSelection }, { resolvePortraitRegistry }] = await Promise.all([model('portraitSelection'), model('portraitRegistry')]);

export async function readBranchCatalog(root, placementDraft) {
  const read = async file => portraitDataValues(await fs.readFile(path.join(root, 'src/data', file + '.ts'), 'utf8'));
  const [data, factors, players, battles, files] = await Promise.all([
    read('characterPortraits'), read('portraitFactors'), read('player'), read('eventBattles'),
    fs.readdir(path.join(root, 'image/character'), { withFileTypes: true }),
  ]);
  const sources = Object.fromEntries(files.filter(f => f.isFile() && /_\d+\.png$/.test(f.name))
    .map(f => f.name).sort().map(name => [name.slice(0, -4), name]));
  const { assets } = resolvePortraitRegistry(sources, data.CHARACTER_PORTRAITS, data.DEFAULT_CHARACTER_PLACEMENT);
  return { player: players.PLAYER_DEFINITION.id, categories: ['normal', ...Object.keys(battles.EVENT_BATTLES)],
    rules: factors.PORTRAIT_FACTORS, aliases: data.CHARACTER_PORTRAIT_CARD_ALIASES, assets,
    reserved: new Set([...Object.keys(data.CHARACTER_PORTRAITS), ...Object.keys(sources),
      ...Object.keys(placementDraft ? portraitDataValues(placementDraft).CHARACTER_PORTRAITS ?? {} : {})].map(id => id.toLowerCase())) };
}

function comparison(group, base, op, number) {
  if (!['gt','gte','lt','lte'].includes(op) || !Number.isFinite(number) || number < 0 ||
      (group === 'percentComparisons' ? number > 100 : !Number.isSafeInteger(number))) throw Error('比較の閾値が範囲外です。');
  return { group, base, tag: base + op + number + (group === 'percentComparisons' ? 'per' : ''), operator: op, value: number };
}

export function branchPreview(catalog, category, tokens = [], extraTags = []) {
  if (!catalog.categories.includes(category)) throw Error('戦闘区分が不正です。');
  if (!Array.isArray(tokens) || !Array.isArray(extraTags) || tokens.length + extraTags.length > 256) throw Error('要因数が多すぎます。');
  const { rules, aliases, assets, player } = catalog;
  const selector = new PortraitSelection(Object.keys(assets), rules, () => 0, aliases);
  const options = new Map();
  for (const [group, bases] of Object.entries(rules)) {
    if (!Array.isArray(bases) || group === 'interactions') continue;
    for (const base of bases) {
      if (group !== 'percentComparisons') options.set(base, { group, base, tag: base });
      for (const t of selector.comparisonFactors.filter(t => t.group === group && t.base === base)) options.set(t.tag, t);
    }
  }
  for (const token of [...extraTags, ...tokens]) {
    if (options.has(token)) continue;
    const parts = typeof token === 'string' && /^(.*?)(gte|lte|gt|lt)(\d+(?:\.\d+)?)(per)?$/.exec(token);
    if (!parts) throw Error('未登録の要因です。');
    const group = parts[4] ? 'percentComparisons' : 'statuses';
    if (!rules[group].includes(parts[1])) throw Error('未登録の比較要因です。');
    const item = comparison(group, parts[1], parts[2], Number(parts[3]));
    if (item.tag !== token) throw Error('比較の表記を確認してください。');
    options.set(token, item);
  }
  // A threshold is previewed at its boundary. For strict ratios use a point
  // between this boundary and the next registered one, without crossing it.
  function sample(item) {
    const { group, base, operator, value } = item;
    if (group === 'statuses') return Math.max(1, value + (operator === 'gt' ? 1 : operator === 'lt' ? -1 : 0));
    if (operator === 'gte' || operator === 'lte') return value;
    const bounds = [...options.values()].filter(t => t.base === base && t.value !== undefined).map(t => t.value);
    return (value + (operator === 'gt' ? Math.min(100,...bounds.filter(n => n > value)) : Math.max(0,...bounds.filter(n => n < value)))) / 2;
  }
  function satisfies(item, value) {
    switch (item.operator) {
      case 'gt': return value > item.value;
      case 'gte': return value >= item.value;
      case 'lt': return value < item.value;
      case 'lte': return value <= item.value;
      default: return true;
    }
  }
  const choices = [...options.values()].filter(item => !item.operator || satisfies(item, sample(item)));
  function canonical(t) { return t.group === 'cards' ? aliases[t.base] ?? t.base : t.tag; }
  function append(list, item) {
    return [...list.filter(t => {
      if (t.base === item.base || (t.group === 'cards' && item.group === 'cards')) return false;
      if (t.base === 'Death' && item.base === 'HP') return satisfies(item, 0);
      if (item.base === 'Death' && t.base === 'HP') return satisfies(t, 0);
      return true;
    }), item];
  }
  let selected = [];
  for (const token of tokens) {
    const item = choices.find(t => t.tag === token);
    if (!item) throw Error('成立しない比較条件です。');
    selected = append(selected, item);
  }
  function missingFactors(list, tags) {
    return list.filter(t => !tags.includes(canonical(t)) && !(!t.operator && t.group === 'statuses' &&
      selector.comparisonFactors.some(rule => rule.base === t.base && tags.includes(rule.tag)))).map(t => t.tag);
  }
  // A higher stack requirement can extend an existing condition, but switching
  // to another card or relaxing a threshold is a different selection.
  function refines(choice, previous) {
    if (choice.group !== previous.group || choice.base !== previous.base || !choice.operator) return false;
    if (!previous.operator) return true;
    if (choice.operator[0] !== previous.operator[0]) return false;
    if (choice.value === previous.value) return !choice.operator.endsWith('e') && previous.operator.endsWith('e');
    return choice.operator[0] === 'g' ? choice.value > previous.value : choice.value < previous.value;
  }
  function resolve(list) {
    selector.clear();
    const ctx = { playerId: player, category, statuses: new Set(), statusStacks: new Map(), relics: new Set(),
      hpRatio: NaN, epRatio: NaN, epReserveRatio: NaN };
    const events = [];
    selector.observeContext(ctx, events);
    for (const t of list) {
      if (t.group === 'statuses') { ctx.statuses.add(t.base); ctx.statusStacks.set(t.base, t.operator ? sample(t) : 1); }
      else if (t.group === 'relics') ctx.relics.add(t.base);
      else if (t.group === 'cards') ctx.lastCardId = t.base;
      else if (t.group === 'connections') ctx[t.base] = true;
      else if (t.base === 'Death') ctx.hpRatio = 0;
      else if (t.group === 'percentComparisons') {
        if (t.base !== 'HP' || !list.some(item => item.base === 'Death')) {
          ctx[{ HP:'hpRatio', EP:'epRatio', EPReserve:'epReserveRatio' }[t.base]] = sample(t) / 100;
        }
      }
      else events.push(t.base);
      selector.observeContext(ctx, events);
    }
    const variants = hovered => selector.previewVariants({ ...ctx, hovered }, events)
      .filter(c => !hovered || c.tags.includes('hover')).map(c => ({ id:c.id, image:assets[c.id].source, tags:c.tags }));
    const normal = variants(false);
    selector.observeContext({ ...ctx, hovered: true }, events);
    const hover = variants(true);
    return { normal, hover, missing: missingFactors(list, normal[0]?.tags ?? []) };
  }
  const current = resolve(selected);
  const signature = pool => JSON.stringify([...new Set(pool.map(p => p.image))].sort());
  const normalSignature = signature(current.normal), hoverSignature = signature(current.hover.length ? current.hover : current.normal);
  const branches = [];
  for (const choice of choices) {
    if (selected.some(t => canonical(t) === canonical(choice))) continue;
    const next = append(selected, choice);
    if (!selected.every(t => next.includes(t) || refines(choice, t))) continue;
    const result = resolve(next);
    const normal = result.missing.length ? [] : result.normal;
    const hover = result.hover.filter(p => missingFactors(next, p.tags).length === 0);
    if ((normal.length && signature(normal) !== normalSignature) || (hover.length && signature(hover) !== hoverSignature)) {
      branches.push({ tag: choice.tag, selected: next.map(t => t.tag), normal, hover });
    }
  }
  function filename(hover) {
    const tags = selected.map(canonical);
    if (hover) tags.push('hover');
    const prefix = player + '_' + category + '_';
    // Keep the winning group's spelling (including idle and detached thresholds)
    // when adding a numbered variant, while allowing a new activation order.
    const sameOrder = (hover ? current.hover : current.normal).find(p =>
      p.id.startsWith(prefix) && p.tags.filter(t => t !== 'idle').join('|') === tags.join('|'));
    const stem = sameOrder ? sameOrder.id.replace(/_\d+$/, '') : prefix + (tags.join('_') || 'idle');
    let n = 1;
    while (catalog.reserved.has((stem + '_' + n).toLowerCase())) n++;
    return stem + '_' + n + '.png';
  }
  const portraits = selector.availableVariants(player, category)
    .filter(p => !p.id.startsWith(player + '_normal_') || category === 'normal')
    .map(p => ({ id: p.id, factors: p.tags.filter(tag => tag !== 'idle' && tag !== 'hover') }))
    .filter(p => p.factors.every(tag => choices.some(choice => choice.tag === tag)));
  return { player, category, categories:catalog.categories, choices, portraits, comparisonBases:{ statuses:rules.statuses, percentComparisons:rules.percentComparisons },
    selected:selected.map(t=>t.tag), current, branches, filenames:[filename(false),filename(true)] };
}

async function publishNewFile(temp, destination) {
  try {
    await fs.link(temp, destination);
  } catch (error) {
    if (!['ENOTSUP', 'EOPNOTSUPP', 'EPERM', 'EXDEV'].includes(error.code)) throw error;
    await fs.copyFile(temp, destination, constants.COPYFILE_EXCL);
  }
}

export async function importBranch(root, category, tokens, hover, expectedName, bytes, extraTags = [], { placementDraft, registerPlacement } = {}) {
  const catalog = await readBranchCatalog(root, placementDraft);
  const preview = branchPreview(catalog, category, tokens, extraTags);
  const name = preview.filenames[hover ? 1 : 0];
  if (name !== expectedName || !/^[\w.-]+\.png$/.test(name)) throw Error('登録名が変更されています。候補を更新してください。');
  const source = path.join(root,'image/character',name);
  const thumbs = path.join(root,'image/gallery-thumbnails/character');
  const target = path.join(thumbs,name.slice(0,-4)+'.webp');
  const image = sharp(bytes);
  const {format,width,height} = await image.metadata();
  if (format !== 'png' || !width || !height) throw Error('PNG画像を選択してください。');
  const thumb = await (await galleryThumbnail(bytes)).toBuffer();
  await fs.mkdir(thumbs,{recursive:true});
  // Publish complete files exclusively; a collision must never overwrite existing art.
  const tmp = await fs.mkdtemp(path.join(root,'image/character','.import-'));
  let published = false, thumbnailPublished = false;
  try {
    await fs.writeFile(path.join(tmp,'image'),bytes);
    await fs.writeFile(path.join(tmp,'thumb'),thumb);
    await publishNewFile(path.join(tmp,'image'),source);
    published = true;
    await publishNewFile(path.join(tmp,'thumb'),target);
    thumbnailPublished = true;
    if (registerPlacement) {
      const candidates = hover ? [...preview.current.hover, ...preview.current.normal] : preview.current.normal;
      await registerPlacement(name.slice(0, -4), candidates.flatMap(p => [p.id, p.image.slice(0, -4)]));
    }
  } catch (error) {
    if (thumbnailPublished) await fs.unlink(target);
    if (published) await fs.unlink(source);
    throw error;
  } finally {
    await fs.rm(tmp,{recursive:true,force:true});
  }
  return { name };
}
