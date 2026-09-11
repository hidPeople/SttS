import { labels, explain } from './help.js';
import { numericPolicy, numericWarnings, duplicateIdentifierStarts, updateLiteralModel } from './field-policy.js';
const $ = id => document.getElementById(id);
const token = document.querySelector('meta[name=editor-token]').content;
let catalog, model, file, declaration, entry = null, focused = null, fullFile = false, codeDirty = false, busy = false;
let spriteFrame = 0, spriteAnimation = 0;
let parsingCode = false;
let duplicateStarts = new Set();
let literalQueue = Promise.resolve(), pendingLiterals = 0;
const failedLiterals = new Map();
const referenceFields = { relicId: ['relics', 'id'], relicIds: ['relics', 'id'], relics: ['relics', 'id'], cardId: ['cards', 'key'], startingDeckIds: ['cards', 'key'], cardIds: ['cards', 'id'], sprite: ['enemySprites', 'key'] };
const openDetails = new Set();
const q = value => JSON.stringify(value);
const element = (tag, text, className) => { const e = document.createElement(tag); if (text !== undefined)
    e.textContent = text; if (className)
    e.className = className; return e; };
const button = (text, action, className) => { const b = element('button', text, className); b.onclick = () => guard(action); return b; };
function notice(text, error = false) { $('notice').textContent = text; $('notice').classList.toggle('error', error); }
function dialog(title, text) { $('dialog-title').textContent = title; $('dialog-log').textContent = text; if (!$('dialog').open)
    $('dialog').showModal(); }
async function api(url, data) { const r = await fetch(`/api/${url}`, { method: data === undefined ? 'GET' : 'POST', headers: { 'X-Editor-Token': token, 'Content-Type': 'application/json' }, body: data === undefined ? undefined : JSON.stringify(data) }); const result = await r.json(); if (!r.ok)
    throw Error(result.error ?? r.statusText); return result; }
async function guard(action, allowUnsaved = false) { if (busy)
    return; busy = true; document.body.classList.add('busy'); const surfaces = [document.querySelector('main'), $('tabs'), document.querySelector('header .actions')]; surfaces.forEach(s => s.inert = true); try {
    await literalQueue;
    if (failedLiterals.size && !allowUnsaved) throw Error('保存できていない入力があります。該当欄を修正して再入力してください。入力内容は画面に残しています。');
    await action();
}
catch (e) {
    notice(e.message, true);
    dialog('操作を完了できませんでした', e.message);
}
finally {
    busy = false;
    surfaces.forEach(s => s.inert = false);
    document.body.classList.remove('busy');
} }
function queueLiteral(action, wrap) {
    pendingLiterals++;
    document.body.dataset.saving = 'true';
    notice('下書きを保存しています…ほかの入力欄も編集できます。');
    literalQueue = literalQueue.then(async () => {
        try { await action(); failedLiterals.delete(wrap); }
        catch (error) { failedLiterals.set(wrap, error); wrap.classList.add('invalid-field'); notice(error.message, true); dialog('入力を保存できませんでした', `${error.message}\n入力内容は画面に残しています。該当欄を修正して再入力してください。`); }
        finally { pendingLiterals--; document.body.dataset.saving = String(pendingLiterals > 0); }
    });
}
function schema(n) { return model.schemas[n?.schema] ?? {}; }
function unwrap(n) { while (n?.kind === 'wrap')
    n = n.inner; return n; }
function object(n) { n = unwrap(n); if (n?.kind === 'call' && n.args.length === 1)
    return object(n.args[0]); return n; }
function chosen() { const d = model?.declarations.find(d => d.name === declaration) ?? model?.declarations[0]; if (!d)
    return null; declaration = d.name; const n = unwrap(d.node); return entry === null ? d.node : n.entries?.find(e => e.key === entry)?.node ?? n.items?.[Number(entry)] ?? d.node; }
function resolveSchema(id, n) {
    let s = model.schemas[id] ?? {};
    if (s.kind === 'union') {
        const variants = s.variants.map(id => ({ id, ...model.schemas[id] }));
        const byShape = variants.find(s => s.kind === n?.kind && (s.kind !== 'object' || n.entries?.every(e => !e.key || s.index || s.properties?.some(p => p.name === e.key))));
        s = byShape ?? variants.find(s => s.kind === n?.kind) ?? variants[0] ?? s;
    }
    return s;
}
function defaultSource(id, depth = 0, builders = true) {
    if (depth > 12)
        return 'undefined';
    const s = model.schemas[id] ?? {};
    if (builders) {
        const preferred = model.constructors.find(c => ['defineCard', 'defineRelic', 'defineEnemyIntent', 'defineStatus', 'effect', 'condition', 'l'].includes(c.name) && model.schemas[c.result]?.name === s.name);
        if (preferred)
            return `${preferred.name}(${preferred.parameters.filter(p => !p.optional).map(p => defaultSource(p.schema, depth + 1, false)).join(', ')})`;
    }
    if (s.kind === 'union') {
        const preferred = s.variants.find(id => model.schemas[id].kind === 'object') ?? s.variants[0];
        return defaultSource(preferred, depth + 1, builders);
    }
    if (s.kind === 'enum')
        return q(s.values[0]);
    if (s.kind === 'string')
        return "''";
    if (s.kind === 'number')
        return '0';
    if (s.kind === 'boolean')
        return 'false';
    if (s.kind === 'array')
        return `[${Array.from({ length: s.minLength ?? 0 }, (_, i) => defaultSource(s.items?.[i] ?? s.element, depth + 1)).join(', ')}]`;
    if (s.kind === 'object')
        return `{\n${(s.properties ?? []).filter(p => !p.optional).map(p => `${q(p.name)}: ${defaultSource(p.schema, depth + 1)},`).join('\n')}\n}`;
    return 'undefined';
}
function objectText(n, entries) { return `{${entries.map(e => e.raw ?? (e.key === null ? `\n...${e.node.source}` : `\n${e.keySource}: ${e.node.source}`)).join(',')}\n}`; }
function rawEntries(n) { return n.entries.map(e => ({ ...e, raw: model.source.slice(e.start, e.end) })); }
function arrayText(items, n) { return n?.separator ? items.map(n => n.source ?? n).join(n.separator) : `[\n${items.map(n => n.source ?? n).join(',\n')}\n]`; }
async function saveSource(source, ensureAt) { model = await api('analyze', { file, source, previousHash: model.sourceHash, ensureAt }); if (model.refs)
    catalog.refs = model.refs; focused = null; catalog.files.find(f => f.file === file).dirty = source !== model.base; render(); notice('下書きを保存しました。本体ソースは「本体へ適用・ビルド」で更新します。'); }
async function replace(n, source) { if (codeDirty && !parsingCode)
    throw Error('入力中のTypeScriptを先にフォームへ反映してください。'); await saveSource(model.source.slice(0, n.start) + source + model.source.slice(n.end), parsingCode ? undefined : n.ensureOwner ?? n.start); }
async function saveLiteral(n, value, wrap, key, context) {
    if (codeDirty) throw Error('入力中のTypeScriptを先にフォームへ反映してください。');
    const replacement = q(value);
    if (replacement === n.source) return;
    const oldEnd = n.end, delta = replacement.length - n.source.length;
    const result = await api('literal', { file, previousHash: model.sourceHash, start: n.start, end: n.end, original: n.source, replacement });
    updateLiteralModel(model, n, replacement, value, result.sourceHash);
    for (const field of $('form').querySelectorAll('.field[data-start]')) if (Number(field.dataset.start) >= oldEnd) field.dataset.start = String(Number(field.dataset.start) + delta);
    duplicateStarts = duplicateIdentifierStarts(model);
    catalog.files.find(f => f.file === file).dirty = result.dirty;
    // Update warnings and code without replacing inputs or losing the caret/focus.
    wrap.querySelectorAll(':scope > .warning').forEach(e => e.remove());
    const notes = warning(n, key, context);
    wrap.querySelector(':scope > .controls > input, :scope > .controls > textarea')?.classList.toggle('warn', notes.length > 0);
    notes.forEach(note => wrap.append(element('div', note, 'warning')));
    const blank = typeof value === 'string' && !value.trim();
    if (!blank) {
        model.issues = model.issues.filter(issue => issue.start !== n.start || !issue.message.includes('空欄'));
        wrap.classList.remove('invalid-field');
    } else if (wrap.querySelector(':scope > .field-label > .required')) wrap.classList.add('invalid-field');
    // Syntax/semantic diagnostics from the old source are stale; explicit checks
    // and apply always re-evaluate the current persisted draft.
    model.diagnostics = [];
    $('issues').textContent = model.issues.map(d => `${d.file}:${d.line} ${d.code} ${d.message}`).join('\n');
    if (!codeDirty) setCode(focused ?? chosen());
    renderTabs();
    if (file.endsWith('/enemySprites.ts')) renderSprite(chosen());
    notice('下書きを保存しました。型・動作条件の全体検証は「型をチェック」または適用時に行います。');
}
async function goToDefinition(destination) {
    await parseCode();
    if (destination.file !== file) await load(destination.file);
    if (destination.declaration) {
        const node = unwrap(model.declarations.find(d => d.name === destination.declaration)?.node)?.entries?.find(e => e.key === destination.entry)?.node;
        if (!node) throw Error('参照先が見つかりません。「最新の情報に更新」で定義を取得してください。');
        destination = { ...destination, start: node.start, end: node.end };
    }
    const candidates = model.declarations.filter(d => d.node.start <= destination.start && d.node.end >= destination.end);
    const found = candidates.sort((a, b) => (a.node.end - a.node.start) - (b.node.end - b.node.start))[0];
    if (!found) {
        fullFile = true; focused = null; setCode();
        $('source').focus(); $('source').setSelectionRange(destination.start, destination.end);
        notice(`${destination.file} の ${destination.name} 定義をTypeScript欄に表示しました。`);
        return;
    }
    declaration = found.name;
    entry = unwrap(found.node).entries?.find(e => e.node.start <= destination.start && e.node.end >= destination.end)?.key ?? null;
    fullFile = false; focused = null; $('search').value = ''; render();
    const field = [...$('form').querySelectorAll('.field')].find(e => Number(e.dataset.start) === destination.start) ?? $('form');
    field.scrollIntoView({ block: 'center' }); field.classList.add('definition-highlight');
    setTimeout(() => field.classList.remove('definition-highlight'), 2000);
    notice(`${destination.file} → ${destination.name} の定義を表示しています。`);
}
function warning(n, key, context) {
    const notes = typeof n.value === 'number' ? numericWarnings(n.value, numericPolicy(key, context)) : [];
    if (typeof n.value === 'string') {
        if (key === 'en' && /[^\x00-\x7f]/u.test(n.value))
            notes.push('英語欄にASCII以外の文字があります。');
        if (/^\s|\s$/.test(n.value))
            notes.push('文頭または文末に余分な空白があります。');
        if (context.logKind && context.logKind !== 'quote' && /^「[\s\S]*」$/.test(n.value.trim()))
            notes.push('quote以外の文章が台詞の括弧で囲まれています。');
        if (['id', 'textureKey', 'animationKey'].includes(key) && duplicateStarts.has(n.start)) notes.push('同じ一覧の中で識別子が重複しています。');
    }
    return notes;
}
function refs(key) { const rule = referenceFields[key]; return rule ? (catalog.refs[rule[0]] ?? []).map(r => r[rule[1]] ?? r.key) : []; }
function definitionFor(n, key) {
    if (n.definition) return n.definition;
    const rule = referenceFields[key];
    return rule ? catalog.refs[rule[0]]?.find(r => (r[rule[1]] ?? r.key) === n.value)?.definition : undefined;
}
function optionLabel(value, key) {
    const translated = { relic: 'レリック', status: '状態異常', has: '有', notHas: '無', eq: '一致', notEq: '不一致', gt: '超', gte: '以上', lt: '未満', lte: '以下', quote: '台詞', narration: '描写', system: 'システム', player: 'プレイヤー', self: '実行主体', selectedEnemy: '選択中の敵', triggerEnemy: '発火元の敵', allEnemies: '敵全体' };
    if (['kind', 'operator', 'target'].includes(key) && translated[value])
        return `${translated[value]} (${value})`;
    if (refs(key).length) {
        const found = Object.values(catalog.refs).flat().find(r => r.key === value || r.id === value);
        if (found?.label && found.label !== value)
            return `${found.label} / ${value}`;
    }
    return String(value);
}
function setCode(n = chosen()) {
    focused = n;
    const text = fullFile ? model.source : n?.source ?? model.source;
    const stored = localStorage.getItem(`stts-code:${file}:${fullFile ? 'file' : declaration + ':' + entry}`);
    let pending;
    try {
        pending = stored ? JSON.parse(stored) : null;
    }
    catch {
        pending = stored ? { text: stored } : null;
    }
    if (pending?.start !== undefined && !fullFile) {
        const find = x => { if (x.start === pending.start && x.end === pending.end)
            return x; for (const c of [...(x.args ?? []), ...(x.items ?? []), ...(x.entries ?? []).map(e => e.node), ...(x.inner ? [x.inner] : [])]) {
            const hit = find(c);
            if (hit)
                return hit;
        } return null; };
        focused = model.declarations.map(d => find(d.node)).find(Boolean) ?? focused;
    }
    $('source').value = pending?.text ?? text;
    codeDirty = !!pending && pending.text !== text;
    $('code-state').textContent = codeDirty ? '未解析の入力' : 'フォームと同期';
}
async function parseCode() {
    if (!codeDirty)
        return;
    let source = $('source').value;
    const storageKey = `stts-code:${file}:${fullFile ? 'file' : declaration + ':' + entry}`;
    parsingCode = true;
    try {
        const stored = JSON.parse(localStorage.getItem(storageKey) ?? 'null');
        if (stored?.original && !fullFile && (focused?.start !== stored.start || focused?.end !== stored.end || focused?.source !== stored.original))
            throw Error('入力中の項目と現在のソースが変わっています。TypeScript欄をコピーしてから最新の項目に反映してください。');
        if (stored?.original && fullFile && stored.original !== model.source)
            throw Error('入力開始後にファイルの内容が変わっています。TypeScript欄をコピーし、現在のソースと比較してから反映してください。');
        if (fullFile)
            await saveSource(source);
        else {
            const n = focused ?? chosen();
            if (unwrap(n)?.kind === 'object' && !source.trim().startsWith('{'))
                source = (await api('snippet', { original: n.source, fragment: source })).source;
            await replace(n, source);
        }
        localStorage.removeItem(storageKey);
        codeDirty = false;
        setCode();
    }
    finally {
        parsingCode = false;
    }
}
function field(n, key, context = {}, property, depth = 0) {
    if (n.kind === 'call' && /^define(?:Card|Relic|EnemyIntent|Status)$/.test(n.callee) && n.args.length === 1)
        return field(n.args[0], key, context, property, depth);
    const wrap = element('div', undefined, 'field');
    let fields = n.entries ? Object.fromEntries(n.entries.map(e => [e.key, e.node])) : {};
    if (n.kind === 'call') for (const [i, arg] of n.args.entries()) {
        const name = n.parameters[i]?.name;
        if (name === 'options') Object.assign(fields, Object.fromEntries((arg.entries ?? []).map(e => [e.key, e.node])));
        else fields[name] = arg;
    }
    if (fields.kind) context = { ...context, kind: fields.kind.value, effect: n.callee === 'effect' || schema(n).name === 'EffectDefinition', percentOf: fields.percentOf?.value };
    if (key === 'randomAmount') context = { ...context, randomAmount: true };
    if (model.issues?.some(issue => issue.start === n.start)) wrap.classList.add('invalid-field');
    wrap.dataset.key = key;
    wrap.dataset.start = n.start;
    wrap.dataset.kind = n.kind;
    if (n.kind === 'call') wrap.classList.add(`call-${n.callee.replace(/\W/g, '')}`);
    if (n.callee === 'condition' && ['has', 'notHas'].includes(n.args[1]?.value)) wrap.classList.add('condition-presence');
    if (n.requiredByLogic) property = { ...property, optional: false };
    const title = element('div', undefined, 'field-label');
    const fieldLabels = { kind: '種類', target: '対象', amount: '数値', operator: '判定', relicId: 'レリック', status: '状態異常', value: '比較値', en: '英語 (en)', ja: '日本語 (ja)', text: 'テキスト文', flavors: 'フレーバー', conditions: '条件' };
    title.append(element('span', fieldLabels[key] ?? key));
    const tip = element('span', '?', 'tip');
    tip.tabIndex = 0;
    tip.dataset.help = explain(key, schema(n), property);
    title.append(tip);
    if (property && !property.optional)
        title.append(element('span', '必須', 'required'));
    title.append(button('TS', () => { if (codeDirty)
        throw Error('入力中のTypeScriptを先にフォームへ反映してください。'); fullFile = false; setCode(n); }, 'small'));
    const definition = definitionFor(n, key);
    if (definition) {
        const link = button('定義へ移動', () => goToDefinition(definitionFor(n, key)), 'small definition-link');
        link.dataset.help = `${definition.file} の ${definition.name} 定義を編集画面に表示します。`;
        title.append(link);
    }
    wrap.append(title);
    if (n.kind === 'wrap') {
        wrap.append(field(n.inner, key, context, property, depth));
        return wrap;
    }
    const s = resolveSchema(n.schema, n);
    if (key === 'flavors' && n.kind === 'object') {
        wrap.classList.add('flavors-block');
        wrap.append(flavorTable(n, context, depth));
        return wrap;
    }
    if (n.kind === 'object' || n.kind === 'array' || n.kind === 'call') {
        const details = element('div', undefined, 'structure');
        const body = element('div', undefined, 'nested');
        details.append(body);
        wrap.append(details);
        if (n.kind === 'call') {
            n.args.forEach((a, i) => body.append(field(a, n.parameters[i]?.name ?? `引数${i + 1}`, context, n.parameters[i], depth + 1)));
            const next = n.parameters[n.args.length];
            if (next)
                body.append(button(`＋ ${next.name} を設定`, () => replace(n, `${n.construct ? 'new ' : ''}${n.callee}(${[...n.args.map(a => a.source), next.default ?? defaultSource(next.schema)].join(', ')})`), 'add'));
            if (n.args.length && n.parameters[n.args.length - 1]?.optional && !n.args[n.args.length - 1].requiredByLogic)
                body.append(button('末尾の任意引数を削除', () => replace(n, `${n.construct ? 'new ' : ''}${n.callee}(${n.args.slice(0, -1).map(a => a.source).join(', ')})`), 'small'));
        }
        if (n.kind === 'object') {
            const logKind = n.entries.find(e => e.key === 'kind')?.node.value;
            const ctx = { ...context, ...(logKind ? { logKind } : {}) };
            const duplicates = n.entries.map(e => e.key).filter((v, i, a) => v && a.indexOf(v) !== i);
            n.entries.forEach((e, i) => {
                const item = element('div', undefined, 'item');
                const head = element('div', undefined, 'item-head');
                let p = s.properties?.find(p => p.name === e.key);
                if (e.node.requiredByLogic) p = { ...p, optional: false };
                head.append(element('span', e.key === null ? '展開参照（生成元を維持）' : ''));
                const actions = element('div', undefined, 'actions');
                const swap = async (delta) => { const entries = rawEntries(n); [entries[i], entries[i + delta]] = [entries[i + delta], entries[i]]; await replace(n, objectText(n, entries)); };
                if (i)
                    actions.append(button('↑', () => swap(-1)));
                if (i < n.entries.length - 1)
                    actions.append(button('↓', () => swap(1)));
                if (!p || p.optional) {
                    actions.append(button('複製', async () => { const key = await askKey(n, e.key ? `${e.key}Copy` : 'copy'); if (key === null)
                        return; const entries = rawEntries(n); entries.splice(i + 1, 0, { key, keySource: q(key), node: e.node }); await replace(n, objectText(n, entries)); }));
                    actions.append(button('削除', () => replace(n, objectText(n, rawEntries(n).filter((_, j) => j !== i))), 'danger'));
                }
                head.append(actions);
                item.append(head);
                if (duplicates.includes(e.key))
                    item.append(element('div', 'キーが重複しています。', 'warning'));
                if (s.index && e.key) {
                    const rename = element('input');
                    rename.value = e.key;
                    rename.setAttribute('aria-label', '登録キー');
                    rename.onchange = () => guard(async () => { if (!rename.value.trim())
                        throw Error('登録キーを入力してください。'); const entries = rawEntries(n); entries[i] = { ...e, key: rename.value, keySource: q(rename.value) }; await replace(n, objectText(n, entries)); });
                    item.append(rename);
                }
                item.append(field(e.node, e.key ?? '参照先', ctx, p, depth + 1));
                body.append(item);
            });
            const available = (s.properties ?? []).filter(p => !n.entries.some(e => e.key === p.name));
            if (available.length || s.index) {
                const add = element('div', undefined, 'controls');
                const select = element('select');
                select.setAttribute('aria-label', `${key} の追加項目`);
                for (const p of available) {
                    const opt = element('option', `${p.name}${p.optional ? '' : ' (必須)'}`);
                    opt.value = p.name;
                    opt.title = explain(p.name, model.schemas[p.schema], p);
                    select.append(opt);
                }
                if (s.index) {
                    const opt = element('option', '自由な登録キー');
                    opt.value = '__custom__';
                    select.append(opt);
                }
                add.append(select);
                add.append(button('＋ 項目を追加', async () => { const p = available.find(p => p.name === select.value); const name = p?.name ?? await askKey(n, 'newEntry'); if (name === null)
                    return; const entries = rawEntries(n); entries.push({ key: name, keySource: q(name), node: { source: defaultSource(p?.schema ?? s.index) } }); await replace(n, objectText(n, entries)); }, 'add'));
                body.append(add);
            }
        }
        if (n.kind === 'array') {
            n.items.forEach((item, i) => {
                const box = element('div', undefined, 'item');
                const h = element('div', undefined, 'item-head');
                h.append(element('strong', `#${i + 1}`));
                const actions = element('div', undefined, 'actions');
                const reorder = async (delta) => { const items = [...n.items]; [items[i], items[i + delta]] = [items[i + delta], items[i]]; await replace(n, arrayText(items, n)); };
                if (i)
                    actions.append(button('↑', () => reorder(-1)));
                if (i < n.items.length - 1)
                    actions.append(button('↓', () => reorder(1)));
                actions.append(button('複製', () => replace(n, arrayText([...n.items.slice(0, i + 1), item, ...n.items.slice(i + 1)], n))));
                if (n.items.length > (s.minLength ?? 0))
                    actions.append(button('削除', () => replace(n, arrayText(n.items.filter((_, j) => j !== i), n)), 'danger'));
                h.append(actions);
                box.append(h, field(item, key, context, undefined, depth + 1));
                body.append(box);
            });
            const itemSchema = s.items?.[n.items.length] ?? s.element;
            const addRow = element('div', undefined, 'controls');
            const itemS = model.schemas[itemSchema];
            let variant = itemSchema;
            if (itemS?.kind === 'union') {
                const choice = element('select');
                choice.setAttribute('aria-label', '追加する形式');
                itemS.variants.forEach(id => { const opt = element('option', model.schemas[id].name); opt.value = id; choice.append(opt); });
                variant = choice.value;
                choice.onchange = () => variant = choice.value;
                addRow.append(choice);
            }
            if (itemSchema)
                addRow.append(button(key === 'conditions' ? '＋ 条件を追加' : '＋ 要素を追加', () => replace(n, arrayText([...n.items, defaultSource(variant)], n)), 'add'));
            body.append(addRow);
        }
    }
    else {
        const controls = element('div', undefined, 'controls');
        const options = s.kind === 'enum' ? s.values : refs(key);
        const notes = warning(n, key, context);
        let input;
        if (options.length) {
            const select = element('select');
            select.setAttribute('aria-label', key);
            const match = options.findIndex(v => String(v) === String(n.value ?? n.source));
            if (match < 0) {
                const opt = element('option', n.value === '' ? '未選択（選んでください）' : `${n.source} (式・現在値)`);
                opt.value = '';
                select.append(opt);
            }
            options.forEach((v, i) => { const opt = element('option', optionLabel(v, key)); opt.value = String(i); select.append(opt); });
            select.value = match < 0 ? '' : String(match);
            select.onchange = () => guard(() => select.value === '' ? Promise.resolve() : replace(n, q(options[Number(select.value)])));
            controls.append(select);
            input = select;
        }
        else if (n.kind === 'number') {
            input = element('input');
            input.type = 'number';
            input.step = numericPolicy(key, context).step;
            input.value = n.value ?? n.source;
            input.setAttribute('aria-label', key);
            input.onchange = () => {
                const raw = input.value, value = Number(raw), structural = n.ensureOwner !== undefined || file.endsWith('/types.ts');
                const action = () => { if (raw === '' || !Number.isFinite(value)) throw Error(`${key} は有限の数値を入力してください。`); return structural ? replace(n, String(value)) : saveLiteral(n, value, wrap, key, context); };
                if (structural) guard(action); else queueLiteral(action, wrap);
            };
            controls.append(input);
            if (/color/i.test(key) || declaration === 'CARD_CATEGORY_COLORS') {
                const color = element('input');
                color.type = 'color';
                color.value = `#${Math.max(0, Number(n.value) ?? 0).toString(16).padStart(6, '0').slice(-6)}`;
                color.setAttribute('aria-label', `${key} の色`);
                color.onchange = () => guard(() => replace(n, `0x${color.value.slice(1)}`));
                controls.append(color);
            }
        }
        else if (n.kind === 'boolean') {
            input = element('select');
            for (const val of [true, false]) {
                const opt = element('option', val ? '有効 (true)' : '無効 (false)');
                opt.value = String(val);
                input.append(opt);
            }
            input.value = String(n.value);
            input.onchange = () => guard(() => replace(n, input.value));
            controls.append(input);
        }
        else if (n.kind === 'string') {
            input = ['en', 'ja', 'description', 'text'].includes(key) ? element('textarea', undefined, 'value') : element('input');
            input.value = n.value;
            input.setAttribute('aria-label', key);
            input.onchange = () => {
                const value = input.value;
                if (['id', 'textureKey', 'animationKey', 'source'].includes(key) || model.declarations.some(d => d.typeDefinition) || n.ensureOwner !== undefined) guard(() => replace(n, q(value)));
                else queueLiteral(() => saveLiteral(n, value, wrap, key, context), wrap);
            };
            controls.append(input);
        }
        else {
            input = element('input');
            input.value = n.source;
            input.setAttribute('aria-label', `${key} TypeScript式`);
            input.onchange = () => guard(() => replace(n, input.value));
            controls.append(input);
            wrap.append(element('p', '参照・計算式です。式を保持して編集できます。型チェックで整合性を確認します。', 'hint'));
        }
        if (notes.length)
            input.classList.add('warn');
        wrap.append(controls);
        for (const note of notes)
            wrap.append(element('div', note, 'warning'));
    }
    // Explicit union switch supports number/string values and conditional flavor entries in both directions.
    if (key === 'value' && schema(n).kind === 'union' && schema(n).variants.length > 1) {
        const section = element('details');
        section.append(element('summary', '比較値を数値／真偽値に変更'));
        const row = element('div', undefined, 'controls');
        const choice = element('select');
        for (const id of schema(n).variants) {
            const opt = element('option', model.schemas[id].name);
            opt.value = id;
            choice.append(opt);
        }
        row.append(choice, button('形式を変更', () => replace(n, defaultSource(choice.value)), 'small'));
        section.append(row);
        wrap.append(section);
    }
    return wrap;
}

function flavorTable(n, context, depth) {
    const table = element('div', undefined, 'flavor-table');
    const keys = resolveSchema(n.schema, n).properties ?? [];
    const lineSource = () => `{ kind: 'narration', text: ${model.constructors.some(c => c.name === 'l') ? "l('', '')" : "{ en: '', ja: '' }"} }`;
    function linesView(array) {
        const list = element('div', undefined, 'flavor-lines');
        array.items.forEach((line, index) => {
            const row = element('div', undefined, 'flavor-line');
            const obj = object(line), fields = obj?.entries ?? [];
            const kind = fields.find(e => e.key === 'kind'), text = fields.find(e => e.key === 'text');
            const variants = fields.find(e => e.key === 'lines');
            if (kind && text) {
                row.append(field(kind.node, 'kind', context, { optional: false }, depth + 1), field(text.node, 'text', { ...context, logKind: kind.node.value }, { optional: false }, depth + 1));
            } else if (variants?.node.kind === 'array') {
                const group = element('div', undefined, 'conditional-lines');
                const conditions = fields.find(e => e.key === 'conditions');
                if (conditions) group.append(field(conditions.node, 'conditions', context, undefined, depth + 1));
                else group.append(button('＋ 条件を追加', () => replace(obj, objectText(obj, [...rawEntries(obj), { key: 'conditions', keySource: 'conditions', node: { source: '[]' } }])), 'add'));
                group.append(linesView(variants.node)); row.append(group);
            } else row.append(field(line, '文章・参照', context, undefined, depth + 1));
            const actions = element('div', undefined, 'actions line-actions');
            if (kind && text) actions.append(button('条件を付ける', () => replace(line, `{ conditions: [], lines: [${line.source}] }`), 'small'));
            const swap = delta => { const items = [...array.items]; [items[index], items[index + delta]] = [items[index + delta], items[index]]; return replace(array, arrayText(items)); };
            if (index) actions.append(button('↑', () => swap(-1)));
            if (index < array.items.length - 1) actions.append(button('↓', () => swap(1)));
            actions.append(button('複製', () => replace(array, arrayText([...array.items.slice(0, index + 1), line, ...array.items.slice(index + 1)]))), button('削除', () => replace(array, arrayText(array.items.filter((_, i) => i !== index))), 'danger'));
            row.append(actions); list.append(row);
        });
        list.append(button('＋ 文章を追加', () => replace(array, arrayText([...array.items, lineSource()])), 'add'));
        return list;
    }
    n.entries.forEach((event, index) => {
        if (!event.key || event.node.kind !== 'array') { table.append(field(event.node, event.key ?? '展開参照', context, undefined, depth + 1)); return; }
        const group = element('div', undefined, 'flavor-event');
        const eventCell = element('div', undefined, 'event-cell');
        eventCell.append(element('strong', '要因（イベント）'));
        const select = element('select'); select.setAttribute('aria-label', 'フレーバーの要因');
        for (const p of keys.filter(p => p.name === event.key || !n.entries.some(e => e.key === p.name))) { const option = element('option', p.name); option.value = p.name; select.append(option); }
        select.value = event.key;
        select.onchange = () => guard(() => { const entries = rawEntries(n); entries[index] = { ...event, key: select.value, keySource: q(select.value) }; return replace(n, objectText(n, entries)); });
        eventCell.append(select);
        const actions = element('div', undefined, 'actions');
        const swap = delta => { const entries = rawEntries(n); [entries[index], entries[index + delta]] = [entries[index + delta], entries[index]]; return replace(n, objectText(n, entries)); };
        if (index) actions.append(button('↑', () => swap(-1)));
        if (index < n.entries.length - 1) actions.append(button('↓', () => swap(1)));
        actions.append(button('要因を削除', () => replace(n, objectText(n, rawEntries(n).filter((_, i) => i !== index))), 'danger'));
        eventCell.append(actions); group.append(eventCell, linesView(event.node)); table.append(group);
    });
    const available = keys.filter(p => !n.entries.some(e => e.key === p.name));
    if (available.length) {
        const add = element('div', undefined, 'controls'); const select = element('select'); select.setAttribute('aria-label', '追加するフレーバーの要因');
        for (const p of available) { const option = element('option', p.name); option.value = p.name; select.append(option); }
        add.append(select, button('＋ 要因を追加', () => replace(n, objectText(n, [...rawEntries(n), { key: select.value, keySource: q(select.value), node: { source: `[${lineSource()}]` } }])), 'add')); table.append(add);
    }
    return table;
}

async function askKey(n, suggested) { const name = window.prompt('登録キーを入力してください（同じ種類の中で一意）', suggested); if (name === null)
    return null; if (!name.trim())
    throw Error('登録キーが空です。'); return name; }
function renderTabs() { const tabs = $('tabs'); tabs.replaceChildren(); for (const f of catalog.files) {
    const stem = f.file.split('/').at(-1).replace('.ts', '');
    tabs.append(button(`${labels[stem] ?? stem}${f.dirty ? ' ●' : ''}${f.conflict ? ' ⚠' : ''}`, async () => { await parseCode(); await load(f.file); }, file === f.file ? 'active' : ''));
} }
function renderList() {
    const list = $('declarations');
    list.replaceChildren();
    const search = $('search').value.toLowerCase();
    for (const d of model.declarations) {
        const n = unwrap(d.node);
        const entries = n.entries?.filter(e => e.key).map(e => ({ key: e.key, node: e.node })) ?? n.items?.map((node, i) => ({ key: String(i), node })) ?? [];
        if (!search || d.name.toLowerCase().includes(search) || entries.some(e => e.key.toLowerCase().includes(search))) {
            list.append(button(`${d.template ? '⚙ ' : ''}${d.name}`, async () => { await parseCode(); declaration = d.name; entry = null; fullFile = false; focused = null; render(); }, `group ${declaration === d.name && entry === null ? 'active' : ''}`));
            for (const e of entries) {
                if (search && !`${e.key} ${e.node.source}`.toLowerCase().includes(search))
                    continue;
                const b = button(e.key, async () => { await parseCode(); declaration = d.name; entry = e.key; fullFile = false; focused = null; render(); }, `entry ${declaration === d.name && entry === e.key ? 'active' : ''}`);
                list.append(b);
            }
        }
        if (d.name === declaration && !d.template && (schema(n).index || ['STATUS_DESCRIPTIONS', 'CARD_CATEGORY_COLORS'].includes(d.name))) {
            list.append(button('＋ 新規データ', async () => { if (codeDirty)
                throw Error('TypeScript入力を先にフォームへ反映してください。'); const key = await askKey(n, 'newEntry'); if (key === null)
                return; const s = schema(n), type = s.index ?? s.properties?.[0]?.schema; let source = defaultSource(type); source = source.replace(/(["']?id["']?\s*:\s*)(?:'[^']*'|"[^"]*")/, (_, prefix) => prefix + q(key)); entry = key; await replace(n, objectText(n, [...rawEntries(n), { key, keySource: q(key), node: { source } }])); }, 'add'));
            if (entry !== null) {
                const index = n.entries.findIndex(e => e.key === entry), current = n.entries[index];
                if (current) {
                    list.append(button('選択データを複製', async () => { if (codeDirty)
                        throw Error('TypeScript入力を先にフォームへ反映してください。'); const key = await askKey(n, `${entry}Copy`); if (key === null)
                        return; const source = current.node.source.replace(/(["']?id["']?\s*:\s*)(?:'[^']*'|"[^"]*")/, (_, prefix) => prefix + q(key)); entry = key; const entries = rawEntries(n); entries.splice(index + 1, 0, { key, keySource: q(key), node: { source } }); await replace(n, objectText(n, entries)); }));
                    list.append(button('選択データを削除', async () => { if (codeDirty)
                        throw Error('TypeScript入力を先にフォームへ反映してください。'); if (!confirm(`${entry} を下書きから削除しますか？参照が残る場合はビルド時に確認します。`))
                        return; entry = null; await replace(n, objectText(n, rawEntries(n).filter((_, i) => i !== index))); }, 'danger'));
                }
            }
        }
    }
}
function renderDrift() { const box = $('drift'); box.replaceChildren(); const relevant = catalog.changes; if (relevant.length) {
    const d = element('details');
    d.append(element('summary', `本体の定義変更 ${relevant.length} 件を検出（最新の型で表示中）`));
    d.append(element('p', '新しい選択肢は自動で反映されます。構造変更は以下の内容で対応確認を依頼できます。', 'hint'));
    d.append(button('Codexへの修正依頼を表示・コピー', () => dialog('本体定義の変更', relevant.map(c => c.message).join('\n\n'))));
    box.append(d);
} }
function render() { duplicateStarts = duplicateIdentifierStarts(model); renderTabs(); renderList(); renderDrift(); $('filename').textContent = file; $('heading').textContent = entry ?? declaration; $('form').replaceChildren(); const n = chosen(); if (n)
    $('form').append(field(n, entry ?? declaration, {}, undefined, 0));
else
    $('form').append(element('p', 'このファイルには通常のデータ宣言がありません。ファイル全体のTypeScript入力で編集できます。')); setCode(focused ?? n); $('issues').textContent = [...(model.diagnostics ?? []), ...(model.issues ?? [])].map(d => `${d.file}:${d.line} TS${d.code} ${d.message}`).join('\n'); renderSprite(n); }
async function load(next) { file = next; model = await api(`file?file=${encodeURIComponent(file)}`); declaration = (file.endsWith('/types.ts') ? model.declarations.find(d => d.typeDefinition)?.name : null) ?? model.declarations.find(d => d.exported)?.name ?? model.declarations[0]?.name; entry = null; focused = null; fullFile = false; render(); notice(`${file} を読み込みました。`); }
// Preview reads only literals and the existing sprite helper's documented arguments; it never executes source.
function spriteValues(n) {
    n = unwrap(n);
    const values = {};
    if (n?.kind === 'call' && n.callee === 'sprite') {
        ['textureKey', 'source', 'size', 'opaqueBounds', 'bodyOffsetY'].forEach((key, i) => { values[key] = literal(n.args[i]); });
        const template = model.declarations.find(d => d.name.startsWith('sprite /'))?.node;
        const defaults = literal(template) ?? {};
        Object.assign(values, defaults, { textureKey: literal(n.args[0]), source: assetPath(n.args[1]), displayWidth: literal(n.args[2]), displayHeight: literal(n.args[2]), opaqueBounds: literal(n.args[3]), bodyOffsetY: literal(n.args[4]) ?? 0 });
    }
    if (n?.kind === 'object')
        for (const e of n.entries) {
            if (e.key === null)
                Object.assign(values, spriteValues(e.node));
            else
                values[e.key] = e.key === 'source' ? assetPath(e.node) : literal(e.node);
        }
    return values;
}
function assetPath(n) { if (!n)
    return undefined; const match = n.source.match(/Sprite\/([^'"`]+\.(?:png|webp|jpg|jpeg))/i); return match?.[1] ?? n.value; }
function literal(n) { n = unwrap(n); if (!n)
    return undefined; if (['string', 'number', 'boolean'].includes(n.kind))
    return n.value; if (n.kind === 'object')
    return Object.fromEntries(n.entries.filter(e => e.key).map(e => [e.key, literal(e.node)])); const arithmetic = n.source.match(/^([\d.]+)\s*\/\s*([\d.]+)$/); if (arithmetic)
    return Number(arithmetic[1]) / Number(arithmetic[2]); return undefined; }
function renderSprite(n) {
    cancelAnimationFrame(spriteAnimation);
    const box = $('sprite');
    box.replaceChildren();
    if (!file.endsWith('/enemySprites.ts') || entry === null)
        return;
    const values = spriteValues(n);
    if (!values.source)
        return;
    const panel = element('div', undefined, 'preview');
    panel.append(element('h3', 'アニメーション / 不透明領域プレビュー'));
    const canvas = element('canvas');
    canvas.width = 440;
    canvas.height = 300;
    panel.append(canvas);
    const ctx = canvas.getContext('2d'), image = new Image();
    image.src = `/asset?name=${encodeURIComponent(values.source)}`;
    const controls = element('div', undefined, 'controls');
    const assets = element('select');
    assets.setAttribute('aria-label', 'Sprite画像');
    for (const name of catalog.assets) {
        const opt = element('option', name);
        opt.value = name;
        assets.append(opt);
    }
    assets.value = values.source;
    assets.onchange = () => { values.source = assets.value; image.src = `/asset?name=${encodeURIComponent(values.source)}`; };
    controls.append(assets);
    panel.append(controls);
    for (const key of ['frameWidth', 'frameHeight', 'frameCount', 'frameRate', 'displayWidth', 'displayHeight', 'bodyOffsetY']) {
        const label = element('label', key);
        label.title = explain(key);
        const input = element('input');
        input.type = 'number';
        input.step = 'any';
        input.value = values[key] ?? 0;
        input.setAttribute('aria-label', `preview ${key}`);
        input.oninput = () => { values[key] = Number(input.value); };
        label.append(input);
        controls.append(label);
    }
    values.opaqueBounds ??= { left: 0, right: 199, top: 0, bottom: 199 };
    for (const key of ['left', 'right', 'top', 'bottom']) {
        const label = element('label', key);
        label.title = explain(key);
        const input = element('input');
        input.type = 'number';
        input.value = values.opaqueBounds[key];
        input.setAttribute('aria-label', `preview ${key}`);
        input.oninput = () => values.opaqueBounds[key] = Number(input.value);
        label.append(input);
        controls.append(label);
    }
    let playing = true, last = performance.now(), elapsed = 0;
    const info = element('p', undefined, 'hint');
    panel.append(info);
    const action = element('div', undefined, 'controls');
    action.append(button('再生 / 停止', () => { playing = !playing; }), button('次のコマ', () => { playing = false; spriteFrame++; }), button('プレビュー値を下書きへ反映', async () => {
        for (const key of ['frameWidth', 'frameHeight', 'frameCount', 'frameRate', 'displayWidth', 'displayHeight'])
            if (!(values[key] > 0 && Number.isFinite(values[key])))
                throw Error(`${key} は正の数値を入力してください。`);
        if (values.opaqueBounds.left > values.opaqueBounds.right || values.opaqueBounds.top > values.opaqueBounds.bottom)
            throw Error('不透明領域の左右または上下が逆転しています。');
        const target = unwrap(n);
        const overrides = Object.entries(values).filter(([k]) => !['size'].includes(k));
        const properties = overrides.map(([k, v]) => `${q(k)}: ${k === 'source' ? `new URL(${q('../../Sprite/' + v)}, import.meta.url).href` : q(v)}`).filter(x => !x.endsWith('undefined'));
        // An explicit override preserves any present/future helper fields and enables all sprite parameters per entry.
        await replace(target, `{\n...${target.source},\n${properties.join(',\n')}\n}`);
    }, 'primary'));
    panel.append(action);
    box.append(panel);
    function draw(now) {
        const delta = Math.min(1000, now - last);
        last = now;
        const fw = values.frameWidth, fh = values.frameHeight, cols = Math.floor(image.naturalWidth / fw);
        ctx.clearRect(0, 0, 440, 300);
        if (image.complete && image.naturalWidth && fw > 0 && fh > 0 && cols > 0 && values.frameCount > 0) {
            if (playing) {
                elapsed += delta * values.frameRate / 1000;
                spriteFrame += Math.floor(elapsed);
                elapsed %= 1;
            }
            spriteFrame %= values.frameCount;
            const dw = values.displayWidth, dh = values.displayHeight, scale = Math.min(1, 380 / Math.max(1, dw), 250 / Math.max(1, dh)), w = dw * scale, h = dh * scale, x = 220 - w / 2, y = 150 - h / 2 + (values.bodyOffsetY ?? 0) * scale;
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(image, (spriteFrame % cols) * fw, Math.floor(spriteFrame / cols) * fh, fw, fh, x, y, w, h);
            const b = values.opaqueBounds;
            ctx.strokeStyle = '#80ffbf';
            ctx.lineWidth = 2;
            ctx.strokeRect(x + b.left / fw * w, y + b.top / fh * h, (b.right - b.left + 1) / fw * w, (b.bottom - b.top + 1) / fh * h);
            const overflow = b.left < 0 || b.top < 0 || b.right >= fw || b.bottom >= fh || b.left > b.right || b.top > b.bottom || values.frameCount > cols * Math.floor(image.naturalHeight / fh);
            info.textContent = `コマ ${spriteFrame + 1} / ${values.frameCount} · ${values.frameRate.toFixed(2)} fps · 緑枠 = 不透明領域${overflow ? ' ⚠ 領域・コマ数が画像範囲外です。' : ''}`;
            info.classList.toggle('warning', overflow);
        }
        else
            info.textContent = '画像・フレーム寸法を確認してください。';
        spriteAnimation = requestAnimationFrame(draw);
    }
    spriteAnimation = requestAnimationFrame(draw);
}

const buttonDescriptions = {
    TS: 'この項目のTypeScriptを右の入力欄に表示します。手入力後はフォームへ反映できます。',
    '↑': 'この要素を1つ前へ移動します。配列の実行・表示順も変わります。',
    '↓': 'この要素を1つ後ろへ移動します。配列の実行・表示順も変わります。',
    '複製': 'この要素をコピーして直後に追加します。',
    '削除': 'この要素を下書きから削除します。本体には適用まで反映されません。',
    'このファイルの下書きを破棄': '選択中のデータ種別の下書きを破棄し、現在の本体ソースを読み込みます。確認画面が出ます。',
    '本体へ適用・ビルド': '必須入力・動作条件・型を確認し、バックアップ後に本体へ適用してビルドします。',
    '最新の情報に更新': '本体の最新データ・型・画像一覧を読み込み直します。下書きは保持します。',
    '型をチェック': '型と動作に必要な入力の不足を、本体を書き換えずに確認します。',
    '条件を付ける': 'この文章を条件付きにします。文章はそのまま残り、条件を追加できます。',
    '形式を変更': '比較値の入力型を切り替えます。現在の値は初期値に置き換わります。'
    ,'＋ 項目を追加': '隣の選択欄で選んだ任意項目を、この設定に追加します。'
    ,'＋ 要素を追加': 'この配列の末尾に新しい要素を追加します。'
    ,'＋ 条件を追加': '実行・表示する状況を絞り込む条件を追加します。複数条件はすべて成立した場合に実行されます。'
    ,'＋ 要因を追加': '選択したイベントに対する文章の設定を追加します。'
    ,'＋ 文章を追加': 'このイベント・条件で表示する文章の候補を追加します。'
    ,'要因を削除': 'このイベントに属する文章と条件をまとめて削除します。'
    ,'ファイル全体を編集': '右のTypeScript欄を、選択項目からファイル全体の編集へ切り替えます。'
    ,'入力を解析してフォームへ反映': '手入力したコードを読み込み、インデントを整えて選択欄と入力フォームを更新します。'
    ,'プレビュー値を下書きへ反映': '再生速度・寸法・境界などのプレビュー設定をソースの下書きに書き込みます。'
    ,'末尾の任意引数を削除': '任意の追加設定を外し、生成処理のデフォルトに戻します。'
    ,'＋ 新規データ': '登録キーを入力して、このデータ種別に新しい定義を追加します。'
    ,'選択データを複製': '選択中の定義を新しい登録キー・IDで複製します。'
    ,'選択データを削除': '選択中の定義を下書きから削除します。参照が残っていれば適用前に通知します。'
    ,'再生 / 停止': 'スプライトのプレビュー再生と一時停止を切り替えます。'
    ,'次のコマ': '再生を停止し、次のフレームを表示します。'
    ,'内容をコピー': 'このダイアログの説明・エラーログをクリップボードへコピーします。'
    ,'閉じる': 'ダイアログを閉じて編集に戻ります。下書きはそのまま残ります。'
};
const hoverHelp = $('hover-help');
let helpOwner;
function showHelp(target) {
    const owner = target.closest('[data-help],button');
    if (!owner) return hideHelp();
    const host = owner.closest('dialog') ?? document.body;
    if (hoverHelp.parentElement !== host) host.append(hoverHelp);
    const text = owner.dataset.help ?? buttonDescriptions[owner.textContent.trim()] ?? `${owner.textContent.trim()}：${owner.closest('#tabs') ? 'このデータ種別を表示します。' : owner.closest('#declarations') ? 'このデータを編集画面に表示します。' : '選択中の項目に対してこの操作を行います。変更は下書きに保存されます。'}`;
    helpOwner = owner; hoverHelp.textContent = text; hoverHelp.hidden = false;
    const bounds = owner.getBoundingClientRect();
    hoverHelp.style.left = `${Math.max(8, Math.min(bounds.left, innerWidth - hoverHelp.offsetWidth - 8))}px`;
    const above = bounds.top - hoverHelp.offsetHeight - 6;
    hoverHelp.style.top = `${Math.max(8, above >= 8 ? above : Math.min(innerHeight - hoverHelp.offsetHeight - 8, bounds.bottom + 6))}px`;
}
function hideHelp() { hoverHelp.hidden = true; helpOwner = null; }
document.addEventListener('pointerover', event => showHelp(event.target));
document.addEventListener('pointerout', event => { if (helpOwner && !helpOwner.contains(event.relatedTarget)) hideHelp(); });
document.addEventListener('focusin', event => showHelp(event.target));
document.addEventListener('focusout', hideHelp);
document.addEventListener('pointerdown', hideHelp);
document.addEventListener('scroll', hideHelp, true);
new MutationObserver(() => { if (helpOwner && !helpOwner.isConnected) hideHelp(); }).observe($('form'), { childList: true, subtree: true });

$('source').oninput = () => { codeDirty = true; $('code-state').textContent = '未解析の入力'; localStorage.setItem(`stts-code:${file}:${fullFile ? 'file' : declaration + ':' + entry}`, JSON.stringify({ text: $('source').value, start: focused?.start, end: focused?.end, original: fullFile ? model.source : focused?.source })); };
$('parse').onclick = () => guard(parseCode);
$('search').oninput = renderList;
$('filemode').onclick = () => guard(async () => { await parseCode(); fullFile = !fullFile; $('filemode').textContent = fullFile ? '選択項目を編集' : 'ファイル全体を編集'; setCode(); });
$('refresh').onclick = () => guard(async () => { await parseCode(); catalog = await api('refresh', {}); model = await api(`file?file=${encodeURIComponent(file)}`); render(); notice('最新の定義・参照先・画像を取得しました。下書きは保持しています。'); });
$('validate').onclick = () => guard(async () => { await parseCode(); notice('本体の型定義で確認しています…'); const r = await api('validate', {}); dialog(r.diagnostics.length ? '型チェック結果' : '型チェック成功', r.diagnostics.map(d => `${d.file}:${d.line} TS${d.code}\n${d.message}`).join('\n\n') || 'TypeScriptエラーはありません。'); });
$('apply').onclick = () => guard(async () => { const invalid = [...document.querySelectorAll('#form input[type=number]')].find(input => input.value === '' || input.validity.badInput || !Number.isFinite(Number(input.value))); if (invalid) throw Error(`${invalid.getAttribute('aria-label')} の数値入力を確認してください。本体は変更していません。`); await parseCode(); notice('必須入力と型を確認し、問題がなければバックアップ・適用・ビルドを実行します…'); $('apply').disabled = true; try {
    const r = await api('apply', {});
    catalog = await api('catalog');
    model = await api(`file?file=${encodeURIComponent(file)}`);
    render();
    notice(r.ok ? '本体ソースへの適用が完了しました。' : '適用に失敗しました。入力内容とログから修正できます。', !r.ok);
    dialog(r.ok ? '適用・ビルド成功' : r.validationFailed ? '入力を確認してください：本体は変更していません' : r.restored ? 'ビルド失敗：本体ソースを復元しました' : '適用失敗：復元結果を確認してください', `${r.log}\n\n${r.backup ? 'バックアップ: ' + r.backup : ''}${r.conflicts?.length ? '\n外部変更を保護したファイル: ' + r.conflicts.join(', ') : ''}\n${r.ok ? '' : '入力した設定は下書きとして保持しています。'}`);
}
finally {
    $('apply').disabled = false;
} });
$('discard').onclick = () => guard(async () => { if (!confirm(`${file} のツール内の下書きを破棄し、現在の本体ソースを読み込みますか？`))
    return; catalog = await api('discard', { file }); for (const k of Object.keys(localStorage))
    if (k.startsWith(`stts-code:${file}:`))
        localStorage.removeItem(k); failedLiterals.clear(); await load(file); }, true);
$('close-dialog').onclick = () => $('dialog').close();
$('copy-log').onclick = () => guard(async () => { await navigator.clipboard.writeText($('dialog-log').textContent); notice('コピーしました。'); }, true);
window.addEventListener('beforeunload', event => { if (codeDirty || pendingLiterals || failedLiterals.size) {
    event.preventDefault();
    event.returnValue = '';
} });
await guard(async () => { catalog = await api('catalog'); await load(catalog.files.find(f => f.file.endsWith('/cards.ts'))?.file ?? catalog.files[0].file); if (catalog.recovery.length)
    dialog('前回の未完了処理を復元しました', JSON.stringify(catalog.recovery, null, 2)); });
