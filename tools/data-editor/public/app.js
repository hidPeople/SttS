import { sourceLiteral, propertyKey, sourceValue, objectSource, arraySource, definitionEntry, portraitId, portraitChoices } from './source-format.js';
import { diagnosticLinks, diagnosticRange, diagnosticNode } from './diagnostic-navigation.js';
import { drawPortraitGame, portraitGameRect, previewGamePoint, draggedPlacement } from './portrait-preview.js';
import { createCardArtworkEditor } from './card-artwork-editor.js';
import { createSelectionGlowPreview } from './selection-glow-preview.js';
import { updateCardArtworkSource } from './card-artwork-edit.js';
import { referenceFieldRule } from './reference-fields.js';
import { spriteValues as readSpriteValues, literal } from './sprite-values.js';
import { labels, explain } from './help.js';
import { createSpriteChecker } from './sprite-checker.js';
import { updateSpriteSource } from './sprite-edit.js';
import { createPortraitAnchorEditor, beginPortraitAnchorDrag, previousPortraitAnchors, portraitDetailRect, zoomPortraitDetail, pointInImage, snapshotPlacement, updatePortraitSource } from './portrait-anchors.js';
import { numericPolicy, numericWarnings, duplicateIdentifierStarts, updateLiteralModel, isColorField } from './field-policy.js';
import { EditorSession } from './editor-session.js';
const $ = id => document.getElementById(id);
const token = document.querySelector('meta[name=editor-token]').content;
let catalog, model, file, declaration, entry = null, focused = null, fullFile = false, codeDirty = false, busy = false;
let spriteFrame = 0, spriteAnimation = 0;
let spriteChecker;
let portraitDetailRequested = false, releasePortraitDetail;
const editorSidebar = document.querySelector('main > aside');
const sidebarHome = editorSidebar.parentNode, sidebarNext = editorSidebar.nextSibling;
function preservePortraitMenuScroll(action) {
    const position = portraitDetailRequested ? {top: editorSidebar.scrollTop, left: editorSidebar.scrollLeft} : undefined;
    try {return action();}
    finally {
        if (position && portraitDetailRequested) {
            editorSidebar.scrollTop = position.top;
            editorSidebar.scrollLeft = position.left;
        }
    }
}
// Keep unfinished placement edits per portrait, including aliases, for this page session.
const portraitAdjustments = new Map();
let codeScope, codeNeedsRefresh = false;
let codeBaseline = '';
const cancelledOperation = Symbol('cancelledOperation');
const session = new EditorSession();
let preparation, releasePreparation;
const writeLocked = new Set();
function updateWriteLock() {
    for (const control of writeLocked) control.inert = false;
    writeLocked.clear();
    $('source').readOnly = busy || (codeNeedsRefresh && !codeDirty);
    if (!busy) return;
    for (const control of document.querySelectorAll('main button, main input, main select, main textarea, main canvas, header .actions button, #discard')) {
        if (control.dataset.navigation === 'true' || control.id === 'search' || control.id === 'source' || control.closest('legend') || control.closest('.portrait-zoom-controls')) continue;
        control.inert = true;writeLocked.add(control);
    }
}
async function navigate(action) {
    if (preparation) await preparation;
    try {
        confirmCodeNavigation();
        const menuFocus = document.activeElement?.closest('#declarations');
        const revision = session.navigate();
        await action();
        if (session.current(revision)) {
            const selected = $('declarations').querySelector('button.active');
            if (menuFocus) {
                selected?.focus({preventScroll:true});
                if (!portraitDetailRequested) selected?.scrollIntoView({block:'nearest'});
            }
        }
    } catch (error) {
        if (error !== cancelledOperation) {notice(error.message, true);dialog('表示を切り替えられませんでした', error.message);}
    } finally {updateWriteLock();}
}
const navigationButton = (text, action, className) => {
    const control = element('button', text, className);control.dataset.navigation = 'true';control.onclick = () => navigate(action);return control;
};
let selectionGlowPreview;
const SPRITE_CHECKER = '@sprite-checker';
const isSpriteTab = () => /\/(enemySprites|sprites|characterPortraits)\.ts$/.test(file ?? '');
const isSpriteChecker = () => isSpriteTab() && declaration === SPRITE_CHECKER;
const spriteValues = n => readSpriteValues(n, model);
let parsingCode = false, parsingCodeScope;
let duplicateStarts = new Set();
let literalQueue = Promise.resolve(), pendingLiterals = 0;
const failedLiterals = new Map();
const openDetails = new Set();
const q = value => sourceLiteral(value);
const element = (tag, text, className) => { const e = document.createElement(tag); if (text !== undefined)
    e.textContent = text; if (className)
    e.className = className; return e; };
const button = (text, action, className) => { const b = element('button', text, className); b.onclick = () => guard(action); return b; };
function notice(text, error = false) { $('notice').textContent = text; $('notice').classList.toggle('error', error); }
function dialog(title, text, diagnostics = []) { $('dialog-title').textContent = title; $('dialog-log').textContent = text; renderDiagnosticLinks($('dialog-issues'), diagnosticLinks(text, diagnostics, catalog?.files ?? [])); if (!$('dialog').open)
    $('dialog').showModal(); }
async function api(url, data) { const r = await fetch(`/api/${url}`, { method: data === undefined ? 'GET' : 'POST', headers: { 'X-Editor-Token': token, 'Content-Type': 'application/json' }, body: data === undefined ? undefined : JSON.stringify(data) }); const result = await r.json(); if (!r.ok)
    throw Error(result.error ?? r.statusText); return result; }
async function guard(action, allowUnsaved = false) { if (busy)
    return; const menuFocus = document.activeElement?.closest('#declarations button'), revision = session.revision; busy = true; preparation = new Promise(resolve => releasePreparation = resolve); document.body.classList.add('busy'); updateWriteLock(); try {
    await literalQueue;
    if (failedLiterals.size && !allowUnsaved) throw Error('保存できていない入力があります。該当欄を修正して再入力してください。入力内容は画面に残しています。');
    const task = action();
    releasePreparation();preparation = undefined;
    await task;
}
catch (e) {
    if (e === cancelledOperation) return;
    notice(e.message, true);
    dialog('操作を完了できませんでした', e.message);
}
finally {
    busy = false;
    releasePreparation?.();preparation = undefined;updateWriteLock();
    document.body.classList.remove('busy');
    if (menuFocus && session.current(revision) && !document.querySelector('dialog[open]')) {
        const selected = $('declarations').querySelector('button.active') ?? (menuFocus.isConnected ? menuFocus : null);
        selected?.focus({ preventScroll: true });
        selected?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
} }
function queueLiteral(action, wrap, node, target, value) {
    if (codeDirty) {dialog('入力を保存できませんでした', '入力中のTypeScriptを先にフォームへ反映してください。');return;}
    pendingLiterals++;
    document.body.dataset.saving = 'true';
    notice('下書きを保存しています…ほかの入力欄も編集できます。');
    literalQueue = literalQueue.then(async () => {
        try { await action(); failedLiterals.delete(node); }
        catch (error) { failedLiterals.set(node, {error, file: target.file, value}); wrap.classList.add('invalid-field'); notice(error.message, true); dialog('入力を保存できませんでした', `${target.file}\n${error.message}\n該当項目に戻ると入力内容を確認できます。修正して再入力してください。`); }
        finally { pendingLiterals--; document.body.dataset.saving = String(pendingLiterals > 0); }
    });
}
function schema(n) { return model.schemas[n?.schema] ?? {}; }
function unwrap(n) { while (n?.kind === 'wrap')
    n = n.inner; return n; }
function object(n) { n = unwrap(n); if (n?.kind === 'call' && n.args.length === 1)
    return object(n.args[0]); return n; }
function chosen() { if (isSpriteChecker()) return null; const d = model?.declarations.find(d => d.name === declaration) ?? model?.declarations[0]; if (!d)
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
        return `{\n${(s.properties ?? []).filter(p => !p.optional).map(p => `${propertyKey(p.name)}: ${defaultSource(p.schema, depth + 1)},`).join('\n')}\n}`;
    return 'undefined';
}
function objectText(n, entries) { return objectSource(n, entries); }
function rawEntries(n) { return n.entries.map(e => ({ ...e, raw: model.source.slice(e.start, e.end) })); }
function arrayText(items, n) { return arraySource(items, n, model.source); }
async function saveSource(source, ensureAt, target = model) {
    const result = await api('analyze', { file: target.file, source, previousHash: target.sourceHash, ensureAt });
    session.remember(result);
    if (result.refs) {catalog.refs = result.refs;for (const key of session.models.keys()) if (key !== target.file) session.models.delete(key);}
    catalog.files.find(f => f.file === target.file).dirty = result.source !== result.base;
    if (file === target.file) {model = result;focused = null;codeNeedsRefresh = true;render();}
    else renderTabs();
    notice(target.file + ' の下書きを保存しました。本体への反映は適用ボタンから実行できます。');
}
async function replace(n, source, target = model) {
    if (codeDirty && !parsingCode) throw Error('入力中のTypeScriptを先にフォームへ反映してください。');
    await saveSource(target.source.slice(0, n.start) + source + target.source.slice(n.end), parsingCode ? undefined : n.ensureOwner ?? n.start, target);
}
async function saveLiteral(n, value, wrap, key, context, target) {
    const replacement = sourceLiteral(value, n.source);
    if (replacement === n.source) return;
    const oldEnd = n.end, delta = replacement.length - n.source.length;
    const result = await api('literal', { file: target.file, previousHash: target.sourceHash, start: n.start, end: n.end, original: n.source, replacement });
    if (result.refs) catalog.refs = result.refs;
    updateLiteralModel(target, n, replacement, value, result.sourceHash);
    session.remember(target);
    target.diagnostics = [];
    if (typeof value !== 'string' || value.trim()) target.issues = target.issues.filter(issue => issue.start !== n.start || !issue.message.includes('空欄'));
    catalog.files.find(f => f.file === target.file).dirty = result.dirty;
    if (model !== target) {renderTabs();return;}
    for (const field of $('form').querySelectorAll('.field[data-start]')) if (Number(field.dataset.start) >= oldEnd) field.dataset.start = String(Number(field.dataset.start) + delta);
    duplicateStarts = duplicateIdentifierStarts(model);

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
    renderIssues(model.issues);
    codeNeedsRefresh = true;
    updateCodeState();
    renderTabs();
    if (isSpriteTab()) renderSprite(chosen());
    notice('下書きを保存しました。全体検証は「入力内容整合チェック」または「ビルドして適用」で行います。');
}
function renderDiagnosticLinks(host, diagnostics) {
    host.replaceChildren();
    for (const issue of diagnostics) {
        const row=element('div',undefined,'diagnostic-item');
        row.append(element('div', issue.message));
        const location=issue.file ? issue.file+(issue.line?':'+issue.line:'')+(issue.column?':'+issue.column:'') : '場所情報なし';
        if (issue.destination) {
            const link=navigationButton(location+' の設定へ移動',async()=>{await goToDiagnostic(issue);$('dialog').close();if(issue.line||Number.isInteger(issue.start))requestAnimationFrame(()=>{if(!codeDirty)$('source').focus({preventScroll:true});});},'definition-link');
            link.dataset.help='該当タブを開き、特定できた設定欄またはTypeScriptの該当位置を表示します。';row.append(link);
        } else row.append(element('small',location+'（ツールの編集対象外のファイル）'));
        host.append(row);
    }
}
function renderIssues(issues) { renderDiagnosticLinks($('issues'),diagnosticLinks('',issues,catalog.files)); }
async function goToDiagnostic(issue) {
    confirmCodeNavigation();
    if (issue.destination !== file && !await load(issue.destination)) return;
    if (!issue.line && !Number.isInteger(issue.start)) { notice(file+' の設定タブを表示しました。ログに行番号がないため、詳細位置は特定できません。');return; }
    const range=diagnosticRange(model.source,issue), node=diagnosticNode(model,range);
    await goToDefinition({file,...(node?{start:node.start,end:node.end}:range),name:issue.line+'行目'});
    if (node) { fullFile=false;setCode(node); }
    if (!codeDirty) {
        const base=fullFile?0:node?.start??0;
        const start=Math.max(0,range.start-base),end=Math.max(start+1,range.end-base);
        $('source').focus();$('source').setSelectionRange(start,end);
        $('source').scrollTop=$('source').value.slice(0,start).split('\n').length*18-60;
    }
}
async function goToDefinition(destination) {
    confirmCodeNavigation();
    if (destination.file !== file && !await load(destination.file)) return;
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
function referenceRule(key) {
    if (declaration === 'CARD_ARTWORK' && catalog.refs.cardArtwork?.some(r => r.key === key)) return ['cardArtwork', 'key'];
    return declaration === 'CHARACTER_PORTRAITS' && key === entry ? ['characterSprites', 'key'] : referenceFieldRule(key, declaration);
}
function refs(key) { if (declaration === 'BATTLE_BACKGROUNDS') return (catalog.imageFiles ?? []).filter(f => /^background\/[^/]+\.(png|jpe?g|webp)$/i.test(f)).map(f => f.slice('background/'.length)); const rule = referenceRule(key); return rule ? (catalog.refs[rule[0]] ?? []).map(r => r[rule[1]] ?? r.key) : []; }
function definitionFor(n, key) {
    if (n.definition) return n.definition;
    const rule = referenceRule(key);
    return rule ? catalog.refs[rule[0]]?.find(r => (r[rule[1]] ?? r.key) === n.value)?.definition : undefined;
}
function optionLabel(value, key) {
    const translated = { relic: 'レリック', status: '状態異常', enemyTrait: '敵の性質', bodyPartStatus: '部位の状態', insert: '挿入', intruded: '侵入', male: '男性', softBody: '軟体', sexToy: '性玩具', has: '有', notHas: '無', eq: '一致', notEq: '不一致', gt: '超', gte: '以上', lt: '未満', lte: '以下', quote: '台詞', narration: '描写', system: 'システム', player: 'プレイヤー', self: '実行主体', selectedEnemy: 'カード解決対象敵', triggerEnemy: '発火元の敵', allEnemies: '敵全体' };
    if (['kind', 'operator', 'target', 'enemyTrait', 'enemyTraits', 'bodyPartStatusKinds'].includes(key) && translated[value])
        return `${translated[value]} (${value})`;
    if (refs(key).length) {
        const found = Object.values(catalog.refs).flat().find(r => r.key === value || r.id === value);
        if (found?.label && found.label !== value)
            return `${found.label} / ${value}`;
    }
    return String(value);
}
function updateCodeState() {
    $('parse').disabled = !codeDirty;
    $('discard-code').disabled = !codeDirty;
    $('source').readOnly = busy || (codeNeedsRefresh && !codeDirty);
    $('code-note').textContent = codeDirty ? '未反映のTS入力（ブラウザに保存済み）' : codeNeedsRefresh ? 'フォームが更新されています。「実装結果を更新」で表示を更新できます。' : 'フォームと一致';
}
function requireCodeSynced() {
    if (codeDirty) throw Error('未反映のTypeScript入力があります。「入力を解析してフォームへ反映」または「未反映のTS入力を破棄」を選んでください。');
}
function codeStorageKey() { return `stts-code:${file}:${fullFile ? 'file' : declaration + ':' + entry}`; }
function discardCodeInput() {
    localStorage.removeItem(codeStorageKey());
    codeDirty = false;
    setCode(focused ?? chosen(), true);
    notice('未反映のTS入力を破棄しました。フォームに反映済みの下書きは保持しています。');
}
function confirmCodeNavigation() {
    if (parsingCodeScope === codeStorageKey()) return;
    if (!codeDirty) return;
    if (!confirm('未反映のTypeScript入力があります。入力を破棄して操作を続けますか？\nフォームに反映済みの下書きは残ります。')) throw cancelledOperation;
    discardCodeInput();
}
function setCode(n = chosen(), force = false) {
    const scope = `${file}:${declaration}:${entry}:${fullFile}`;
    if (!force && codeNeedsRefresh && codeScope === scope) { updateCodeState(); return; }
    codeScope = scope;
    codeNeedsRefresh = false;
    focused = n;
    const text = fullFile ? model.source : n?.source ?? model.source;
    const stored = localStorage.getItem(codeStorageKey());
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
    codeBaseline = fullFile ? model.source : focused?.source ?? text;
    $('source').value = pending?.text ?? codeBaseline;
    codeDirty = !!pending && pending.text !== codeBaseline;
    updateCodeState();
}
async function parseCode() {
    if (!codeDirty)
        return;
    let source = $('source').value;
    const storageKey = codeStorageKey(), target = model;
    parsingCode = true;parsingCodeScope = storageKey;
    try {
        const stored = JSON.parse(localStorage.getItem(storageKey) ?? 'null');
        if (stored?.original && !fullFile && (focused?.start !== stored.start || focused?.end !== stored.end || focused?.source !== stored.original))
            throw Error('入力中の項目と現在のソースが変わっています。TypeScript欄をコピーしてから最新の項目に反映してください。');
        if (stored?.original && fullFile && stored.original !== model.source)
            throw Error('入力開始後にファイルの内容が変わっています。TypeScript欄をコピーし、現在のソースと比較してから反映してください。');
        if (fullFile)
            await saveSource(source, undefined, target);
        else {
            const n = focused ?? chosen();
            if (unwrap(n)?.kind === 'object' && !source.trim().startsWith('{'))
                source = (await api('snippet', { original: n.source, fragment: source })).source;
            await saveSource(target.source.slice(0, n.start) + source + target.source.slice(n.end), undefined, target);
        }
        localStorage.removeItem(storageKey);
        if (codeStorageKey() === storageKey) {codeDirty = false;setCode(chosen(), true);}
    }
    finally {
        parsingCode = false;parsingCodeScope = undefined;
    }
}
function field(n, key, context = {}, property, depth = 0) {
    context = { ...context, declaration };
    if (n.kind === 'call' && /^define(?:Card|Relic|EnemyIntent|Status)$/.test(n.callee) && n.args.length === 1)
        return field(n.args[0], key, context, property, depth);
    const wrap = element('div', undefined, 'field');
    let fields = n.entries ? Object.fromEntries(n.entries.map(e => [e.key, e.node])) : {};
    if (fields.maxAlpha) context = { ...context, maxAlpha: fields.maxAlpha.value };
    if (n.kind === 'call') for (const [i, arg] of n.args.entries()) {
        const name = n.parameters[i]?.name;
        if (name === 'options') Object.assign(fields, Object.fromEntries((arg.entries ?? []).map(e => [e.key, e.node])));
        else fields[name] = arg;
    }
    if (fields.kind) context = { ...context, kind: fields.kind.value, effect: n.callee === 'effect' || schema(n).name === 'EffectDefinition', percentOf: fields.percentOf?.value };
    if (key === 'randomAmount') context = { ...context, randomAmount: true };
    if (key === 'hpDrainProgress') context = { ...context, hpDrainProgress: true };
    if (failedLiterals.has(n) || model.issues?.some(issue => issue.start === n.start)) wrap.classList.add('invalid-field');
    wrap.dataset.key = key;
    wrap.dataset.start = n.start;
    wrap.dataset.kind = n.kind;
    if (n.kind === 'call') wrap.classList.add(`call-${n.callee.replace(/\W/g, '')}`);
    if (n.callee === 'condition' && ['has', 'notHas'].includes(n.args[1]?.value)) wrap.classList.add('condition-presence');
    if (n.requiredByLogic) property = { ...property, optional: false };
    const title = element('div', undefined, 'field-label');
    const fieldLabels = { kind: '種類', target: '対象', amount: '数値', operator: '判定', relicId: 'レリック', status: '状態異常', value: '比較値', en: '英語 (en)', ja: '日本語 (ja)', text: 'テキスト文', flavors: 'フレーバー', conditions: '条件', displayNameRules: '条件付きカード名', enemyTrait: '敵の性質', enemyTraits: '敵の性質（複数）', parts: '対象部位', bodyPartStatusKinds: '状態種別' };
    title.append(element('span', fieldLabels[key] ?? key));
    const tip = element('span', '?', 'tip');
    tip.tabIndex = 0;
    tip.dataset.help = explain(key, schema(n), property);
    title.append(tip);
    if (property && !property.optional)
        title.append(element('span', '必須', 'required'));
    title.append(navigationButton('TS', () => { if (codeDirty)
        confirmCodeNavigation(); fullFile = false; setCode(n, true); }, 'small'));
    const definition = definitionFor(n, key);
    if (definition) {
        const link = navigationButton('定義へ移動', () => goToDefinition(definitionFor(n, key)), 'small definition-link');
        link.dataset.help = `${definition.file} の ${definition.name} 定義を編集画面に表示します。`;
        title.append(link);
    }
    wrap.append(title);
    if (file.endsWith('/conversations.ts') && ['portrait', 'background'].includes(key) && n.kind === 'string') {
        const select = element('select'); select.setAttribute('aria-label', key);
        const values = key === 'portrait' ? portraitChoices(catalog.refs.characterSprites ?? [], n.value) : [...new Set(['', ...(catalog.imageFiles ?? []), n.value])];
        for (const value of values) { const option = element('option', value || (key === 'portrait' ? '既存の立ち絵を維持' : '表示なし')); option.value = value; select.append(option); }
        select.value = key === 'portrait' ? portraitId(n.value) : n.value;
        select.onchange = () => guard(() => replace(n, sourceLiteral(select.value, n.source)));
        wrap.append(select);
        return wrap;
    }
    if (isSpriteTab() && key === 'source') {
        const select = element('select');
        select.setAttribute('aria-label', 'source');
        const current = n.source.match(/image\/(character\/[^'"`]+\.(?:png|webp|jpg|jpeg))/i)?.[1] ?? n.source.match(/Sprite\/([^'"`]+\.(?:png|webp|jpg|jpeg))/i)?.[1] ?? n.value;
        const empty = element('option', 'Sprite画像を選択してください');
        empty.value = '';
        select.append(empty);
        for (const name of catalog.assets) { const opt = element('option', name); opt.value = name; select.append(opt); }
        select.value = current ?? '';
        select.onchange = () => guard(() => select.value ? replace(n, `new URL(${q((select.value.startsWith('character/') ? '../../image/' : '../../Sprite/') + select.value)}, import.meta.url).href`) : Promise.resolve());
        wrap.append(select);
        return wrap;
    }
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
                        return; const entries = rawEntries(n); entries.splice(i + 1, 0, { key, keySource: propertyKey(key), node: e.node }); await replace(n, objectText(n, entries)); }));
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
                        throw Error('登録キーを入力してください。'); const entries = rawEntries(n); entries[i] = { ...e, key: rename.value, keySource: propertyKey(rename.value) }; await replace(n, objectText(n, entries)); });
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
                    return; const entries = rawEntries(n); entries.push({ key: name, keySource: propertyKey(name), node: { source: defaultSource(p?.schema ?? s.index) } }); await replace(n, objectText(n, entries)); }, 'add'));
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
            select.onchange = () => guard(() => select.value === '' ? Promise.resolve() : replace(n, sourceLiteral(options[Number(select.value)], n.source)));
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
                const target = model;
                const raw = input.value, value = Number(raw), structural = n.ensureOwner !== undefined || file.endsWith('/types.ts');
                const action = () => { if (raw === '' || !Number.isFinite(value)) throw Error(`${key} は有限の数値を入力してください。`); return structural ? replace(n, String(value)) : saveLiteral(n, value, wrap, key, context, target); };
                if (structural) guard(action); else queueLiteral(action, wrap, n, target, raw);
            };
            controls.append(input);
            if (isColorField(key, declaration)) {
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
                const value = input.value, target = model;
                if (['id', 'textureKey', 'animationKey', 'source'].includes(key) || model.declarations.some(d => d.typeDefinition) || n.ensureOwner !== undefined) guard(() => replace(n, q(value)));
                else queueLiteral(() => saveLiteral(n, value, wrap, key, context, target), wrap, n, target, value);
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
        if (failedLiterals.has(n)) input.value = failedLiterals.get(n).value;
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
    if (declaration === 'CARD_ARTWORK' && entry && depth === 0) {
        const row = element('div', undefined, 'controls');
        if (n.kind === 'object') {
            const select = element('select'); select.setAttribute('aria-label', 'カード画像の参照先');
            for (const ref of catalog.refs.cardArtwork ?? []) if (ref.key !== entry) {
                const option = element('option', ref.key); option.value = ref.key; select.append(option);
            }
            row.append(select, button('画像・配置を参照する', () => {
                if (!select.value) throw Error('参照先を選択してください。');
                return replace(n, q(select.value));
            }));
        } else if (n.kind === 'string') {
            row.append(button('参照をやめて個別配置を設定', async () => {
                const target = model;
                const config = await api('card-artwork-preview?entry=' + encodeURIComponent(entry));
                await replace(n, sourceValue(config.artworkSettings), target);
            }));
            row.append(element('p', '個別配置へ戻すと、このカード自身のIDの画像が必要になります。', 'hint'));
        }
        wrap.append(row);
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
            const swap = delta => { const items = [...array.items]; [items[index], items[index + delta]] = [items[index + delta], items[index]]; return replace(array, arrayText(items, array)); };
            if (index) actions.append(button('↑', () => swap(-1)));
            if (index < array.items.length - 1) actions.append(button('↓', () => swap(1)));
            actions.append(button('複製', () => replace(array, arrayText([...array.items.slice(0, index + 1), line, ...array.items.slice(index + 1)], array))), button('削除', () => replace(array, arrayText(array.items.filter((_, i) => i !== index), array)), 'danger'));
            row.append(actions); list.append(row);
        });
        list.append(button('＋ 文章を追加', () => replace(array, arrayText([...array.items, lineSource()], array)), 'add'));
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
        select.onchange = () => guard(() => { const entries = rawEntries(n); entries[index] = { ...event, key: select.value, keySource: propertyKey(select.value) }; return replace(n, objectText(n, entries)); });
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
        add.append(select, button('＋ 要因を追加', () => replace(n, objectText(n, [...rawEntries(n), { key: select.value, keySource: propertyKey(select.value), node: { source: `[${lineSource()}]` } }])), 'add')); table.append(add);
    }
    return table;
}

async function askKey(n, suggested) { const name = window.prompt('登録キーを入力してください（同じ種類の中で一意）', suggested); if (name === null)
    return null; if (!name.trim())
    throw Error('登録キーが空です。'); return name; }
function renderTabs() { const tabs = $('tabs'); tabs.replaceChildren(); for (const f of catalog.files) {
    const stem = f.file.split('/').at(-1).replace('.ts', '');
    tabs.append(navigationButton(`${labels[stem] ?? stem}${f.dirty ? ' ●' : ''}${f.conflict ? ' ⚠' : ''}`, async () => { confirmCodeNavigation(); await load(f.file); }, file === f.file ? 'active' : ''));
} }
function renderList() {
    const list = $('declarations');
    list.replaceChildren();
    const search = $('search').value.toLowerCase();
    if (isSpriteTab()) {
        const checker = navigationButton('素材用スプライトチェッカー', async () => { confirmCodeNavigation(); declaration = SPRITE_CHECKER; entry = null; focused = null; fullFile = false; render(); document.querySelector('.workspace').scrollTop = 0; }, `group ${isSpriteChecker() ? 'active' : ''}`);
        checker.dataset.help = '任意の画像を再生して確認する専用画面を開きます。本体や下書きには保存しません。';
        list.append(checker);
    }
    for (const d of model.declarations) {
        const n = unwrap(d.node);
        const entries = n.entries?.filter(e => e.key).map(e => ({ key: e.key, node: e.node })) ?? n.items?.map((node, i) => ({ key: String(i), node })) ?? [];
        if (!search || d.name.toLowerCase().includes(search) || entries.some(e => e.key.toLowerCase().includes(search))) {
            list.append(navigationButton(`${d.template ? '⚙ ' : ''}${d.name}`, async () => { confirmCodeNavigation(); declaration = d.name; entry = null; fullFile = false; focused = null; render(); }, `group ${declaration === d.name && entry === null ? 'active' : ''}`));
            for (const e of entries) {
                if (search && !`${e.key} ${e.node.source}`.toLowerCase().includes(search))
                    continue;
                const b = navigationButton(e.key, async () => { confirmCodeNavigation(); declaration = d.name; entry = e.key; fullFile = false; focused = null; render(); }, `entry ${declaration === d.name && entry === e.key ? 'active' : ''}`);
                list.append(b);
            }
        }
        if (d.name === declaration && !d.template && (schema(n).index || ['STATUS_DESCRIPTIONS', 'CARD_CATEGORY_COLORS'].includes(d.name))) {
            list.append(button('＋ 新規データ', async () => { if (codeDirty)
                throw Error('TypeScript入力を先にフォームへ反映してください。'); const key = await askKey(n, 'newEntry'); if (key === null)
                return; const s = schema(n), type = s.index ?? s.properties?.[0]?.schema; let source = defaultSource(type);
                if (model.schemas[type]?.name === 'SpriteDefinition') {
                    const seed = spriteValues(model.declarations.find(d => d.name === 'EFFECT_SPRITES')?.node.entries?.[0]?.node);
                    source = sourceValue({ textureKey: key, animationKey: `${key}-play`, source: '', frameWidth: seed.frameWidth ?? 200, frameHeight: seed.frameHeight ?? 200, frameCount: seed.frameCount ?? 16, frameRate: seed.frameRate ?? 1000 / 120, repeat: declaration === 'UI_SPRITES' ? -1 : 0, displayWidth: seed.displayWidth ?? 200, displayHeight: seed.displayHeight ?? 200 }, true);
                }
                if (d.name === 'CHARACTER_PORTRAITS') {
                    const defaults = literal(model.declarations.find(d => d.name === 'DEFAULT_CHARACTER_PLACEMENT')?.node);
                    source = sourceValue({ displayHeight: defaults?.displayHeight ?? 700, offsetX: defaults?.offsetX ?? 0, offsetY: defaults?.offsetY ?? 0 });
                }
                if (d.name === 'CARD_ARTWORK') source = '{ normal: {} }';
                source = source.replace(/(["']?id["']?\s*:\s*)(?:'[^']*'|"[^"]*")/, (_, prefix) => prefix + q(key)); entry = key; await replace(n, objectText(n, [...rawEntries(n), definitionEntry(d.name, key, source)])); }, 'add'));
            if (entry !== null) {
                const index = n.entries.findIndex(e => e.key === entry), current = n.entries[index];
                if (current) {
                    if (d.name === 'CHARACTER_PORTRAITS') list.append(button('参照として追加', async () => {
                        if (codeDirty) throw Error('TypeScript入力を先にフォームへ反映してください。');
                        const target = entry, key = await askKey(n, entry.replace(/_\d+$/, '_2'));
                        if (key === null) return;
                        const entries = rawEntries(n); entries.splice(index + 1, 0, { key, keySource: propertyKey(key), node: { source: q(target) } });
                        entry = key; await replace(n, objectText(n, entries));
                    }));
                    list.append(button('選択データを複製', async () => { if (codeDirty)
                        throw Error('TypeScript入力を先にフォームへ反映してください。'); const key = await askKey(n, `${entry}Copy`); if (key === null)
                        return; const source = current.node.source.replace(/(["']?id["']?\s*:\s*)(?:'[^']*'|"[^"]*")/, (_, prefix) => prefix + q(key)); entry = key; const entries = rawEntries(n); entries.splice(index + 1, 0, definitionEntry(d.name, key, source)); await replace(n, objectText(n, entries)); }));
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
function render() {return preservePortraitMenuScroll(renderContent);}
function renderContent() { const checker = isSpriteChecker(); document.querySelector('main').classList.toggle('checker-mode', checker); $('filemode').hidden = checker; duplicateStarts = duplicateIdentifierStarts(model); renderTabs(); renderList(); renderDrift(); $('filename').textContent = file; $('heading').textContent = checker ? '素材用スプライトチェッカー' : entry ?? declaration; $('form').replaceChildren(); if (checker) { renderSprite(null); updateWriteLock();return; } const n = chosen(); if (n)
    $('form').append(field(n, entry ?? declaration, {}, undefined, 0));
else
    $('form').append(element('p', 'このファイルには通常のデータ宣言がありません。ファイル全体のTypeScript入力で編集できます。')); renderCardTextPreviewButton(n); setCode(focused ?? n); renderIssues([...(model.diagnostics ?? []), ...(model.issues ?? [])]); renderSprite(n); updateWriteLock(); }
async function load(next) {
    const revision = session.revision;
    notice(next + ' を読み込んでいます…');
    const result = await session.read(next, name => api('file?file=' + encodeURIComponent(name)));
    if (!session.current(revision)) return false;
    file = next;model = result;
    declaration = (file.endsWith('/types.ts') ? model.declarations.find(d => d.typeDefinition)?.name : null) ?? model.declarations.find(d => d.exported)?.name ?? model.declarations[0]?.name;
    entry = null;focused = null;fullFile = false;render();notice(file + ' を読み込みました。');return true;
}

function renderSprite(n) {return preservePortraitMenuScroll(() => renderSpriteContent(n));}
function renderSpriteContent(n) {
    // Rescue the shared navigation before removing the previous preview/dialog.
    releasePortraitDetail?.();releasePortraitDetail = undefined;
    selectionGlowPreview?.dispose(); selectionGlowPreview = undefined;
    cancelAnimationFrame(spriteAnimation);
    const box = $('sprite');
    box.replaceChildren();
    if (file.endsWith('/ui.ts') && declaration === 'SELECTION_GLOW') {
        selectionGlowPreview = createSelectionGlowPreview(() => literal(model.declarations.find(d => d.name === 'SELECTION_GLOW')?.node));
        box.append(selectionGlowPreview.panel);
    }
    if (file.endsWith('/cardAppearance.ts') && declaration === 'CARD_ARTWORK' && entry && ['object', 'string'].includes(n?.kind)) {
        const sourceAtOpen = n.source;
        box.append(createCardArtworkEditor({ cardId: entry, node: n, catalog, api, refresh: () => render(),
            goToSource: id => navigate(() => goToDefinition({ file: 'src/data/cardAppearance.ts', declaration: 'CARD_ARTWORK', entry: id, name: id })),
            report: error => dialog('カード画像プレビュー', error.message),
            save: changes => guard(async () => {
                if (chosen() !== n || n.source !== sourceAtOpen) throw Error('フォームが変更されています。「プレビューを再読込」してから調整してください。');
                const source = updateCardArtworkSource(n, changes);
                if (source !== n.source) await replace(n, source);
            }),
        }));
    }
    const spriteTab = isSpriteTab();
    if (isSpriteChecker()) {
        const first = model.declarations.find(d => d.name === 'ENEMY_SPRITES')?.node.entries?.[0]?.node;
        spriteChecker ??= createSpriteChecker(spriteValues(first));
        box.append(spriteChecker.panel);
    }
    spriteChecker?.setActive(isSpriteChecker());
    if (!spriteTab || isSpriteChecker() || entry === null) {
        portraitDetailRequested = false;
        return;
    }
    const values = spriteValues(n);
    if (!values.source) {
        portraitDetailRequested = false;
        return;
    }
    const originalValues = structuredClone(values);
    const portrait = declaration === 'CHARACTER_PORTRAITS';
    if (!portrait) portraitDetailRequested = false;
    const alias = portrait && n.kind === 'string';
    const adjustmentId = entry;
    if (portrait) Object.assign(values, portraitAdjustments.get(adjustmentId));
    const placementInputs = {};
    let anchorEditor, fullImageRect;
    let detailMode = false, detailView = {zoom: 1, x: 0, y: 0}, zoomInfo;
    let openDetailMode;
    let sizeSlider, restorePlacementButton, detailRestoreActions;
    const syncPlacement = patch => {
        Object.assign(values, patch);
        portraitAdjustments.set(adjustmentId, snapshotPlacement(values));
        anchorEditor?.sync();
        for (const [key, input] of Object.entries(placementInputs)) input.value = values[key];
        if (sizeSlider) {
            sizeSlider.max = Math.max(2000, values.displayHeight || 0);
            sizeSlider.value = values.displayHeight;
        }
    };
    const positiveKeys = portrait ? ['displayHeight'] : ['frameWidth', 'frameHeight', 'frameCount', 'frameRate', 'displayWidth', 'displayHeight'];
    const panel = element('div', undefined, 'preview');
    panel.append(element('h3', portrait ? '立ち絵プレビュー' : values.opaqueBounds ? 'アニメーション / 不透明領域プレビュー' : 'アニメーションプレビュー'));
    panel.append(element('p', portrait ? '左は画像全体、右はゲーム内の配置・見切れを確認できます。右には共通倍率も反映します。緑十字は配置基準。UIは重なり確認用の簡略表示です（待機状態・手札ホバーなし）。' : '素材確認のため繰り返し再生します。本体の繰り返し回数は repeat で指定します。', 'hint'));
    const canvas = element('canvas');
    canvas.width = portrait ? 220 : 440;
    canvas.height = 300;
    let gameCanvas, gameInfo, gameConfig, background, previewOptions;
    if (portrait) {
        const row = element('div', undefined, 'portrait-preview-pair');
        const original = element('div', undefined, 'portrait-full-image'), game = element('div');
        original.append(element('h4', '画像全体'), canvas);
        const defaults = literal(model.declarations.find(d => d.name === 'DEFAULT_PORTRAIT_EP_POINTS')?.node);
        anchorEditor = createPortraitAnchorEditor(values, defaults, () => syncPlacement({}), alias, {
            id: adjustmentId, previous: () => previousPortraitAnchors(adjustmentId, model, portraitAdjustments),
            modeChanged: moving => {canvas.style.cursor = moving ? 'move' : '';},
        });
        panel.append(anchorEditor.panel);
        const detailDialog = element('dialog', undefined, 'portrait-detail-dialog');
        detailDialog.setAttribute('aria-label', '立ち絵の部位指定モード');
        const detailGrid = element('div', undefined, 'portrait-detail-grid'), detailRight = element('div', undefined, 'portrait-detail-right');
        const detailFooter = element('div', undefined, 'portrait-detail-footer');
        detailDialog.append(detailGrid, detailFooter);panel.append(detailDialog);
        const zoomControls = element('div', undefined, 'portrait-zoom-controls');zoomControls.hidden = true;
        zoomInfo = element('span');
        const fit = element('button', '全体に合わせる');fit.type = 'button';fit.onclick = () => {detailView = {zoom: 1, x: 0, y: 0};};
        zoomControls.append(zoomInfo, fit, element('small', 'ホイール: 拡大縮小 / 右ドラッグ: 画像移動 / 左クリック: 座標指定（「移動」時はマーカーをドラッグ）'));
        original.insertBefore(zoomControls, canvas);
        const restoreSidebar = () => {
            sidebarHome.insertBefore(editorSidebar, sidebarNext);
            editorSidebar.classList.remove('portrait-detail-menu');
        };
        openDetailMode = () => {
            portraitDetailRequested = true;detailMode = true;anchorEditor.setDetailMode(true);zoomControls.hidden = false;
            editorSidebar.classList.add('portrait-detail-menu');
            detailGrid.append(editorSidebar, original, detailRight);detailRight.append(anchorEditor.panel, game);
            if (restorePlacementButton) {detailRestoreActions ??= element('div', undefined, 'portrait-detail-reset');detailRestoreActions.append(restorePlacementButton);detailRight.append(detailRestoreActions);}
            detailFooter.append(action);
            original.querySelector('h4').textContent = '画像全体 / ' + adjustmentId;
            detailDialog.showModal();anchorEditor.modeButton.focus({preventScroll:true});
        };
        anchorEditor.modeButton.onclick = () => {
            if (detailMode) {portraitDetailRequested = false;detailDialog.close();}else openDetailMode();
        };
        detailDialog.oncancel = () => {portraitDetailRequested = false;};
        detailDialog.onclose = () => {
            portraitDetailRequested = false;restoreSidebar();
            detailMode = false;anchorEditor.setDetailMode(false);zoomControls.hidden = true;
            original.querySelector('h4').textContent = '画像全体';
            panel.insertBefore(anchorEditor.panel, row);row.append(original, game);
            if (restorePlacementButton) controls.append(restorePlacementButton);
            panel.append(action);
            canvas.width = 220;canvas.height = 300;anchorEditor.modeButton.focus();
        };
        releasePortraitDetail = () => {
            detailDialog.onclose = null;
            if (detailMode) {restoreSidebar();detailDialog.close();}
        };
        const canvasPoint = event => {
            const bounds = canvas.getBoundingClientRect();
            return {x: (event.clientX - bounds.left) * canvas.width / bounds.width, y: (event.clientY - bounds.top) * canvas.height / bounds.height};
        };
        let imageDrag, anchorDrag;
        canvas.oncontextmenu = event => {if (detailMode) event.preventDefault();};
        canvas.addEventListener('wheel', event => {
            if (!detailMode || !image.naturalWidth) return;
            event.preventDefault();
            if (anchorDrag) return;
            const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? canvas.height : 1);
            detailView = zoomPortraitDetail({width: image.naturalWidth, height: image.naturalHeight}, canvas, detailView, canvasPoint(event), delta);
        }, {passive: false});
        canvas.onpointermove = event => {
            if (anchorDrag) {if (!busy) anchorEditor.move(anchorDrag, canvasPoint(event));return;}
            if (!imageDrag) return;
            const at = canvasPoint(event);detailView.x += at.x - imageDrag.x;detailView.y += at.y - imageDrag.y;imageDrag = at;
        };
        canvas.onpointerup = canvas.onpointercancel = event => {
            imageDrag = anchorDrag = undefined;
            if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
        };
        canvas.onlostpointercapture = () => {imageDrag = anchorDrag = undefined;};
        canvas.onpointerdown = event => {
            if (imageDrag || anchorDrag) return;
            if (detailMode && event.button === 2) {imageDrag = canvasPoint(event);canvas.setPointerCapture(event.pointerId);event.preventDefault();return;}
            if (event.button !== 0 || busy) return;
            if (anchorEditor.moving) {
                const bounds = canvas.getBoundingClientRect();
                anchorDrag = beginPortraitAnchorDrag(values, canvasPoint(event), fullImageRect, {x:12*canvas.width/bounds.width,y:12*canvas.height/bounds.height});
                if (anchorDrag) {canvas.setPointerCapture(event.pointerId);event.preventDefault();}
                return;
            }
            const point = pointInImage(event.clientX, event.clientY, canvas.getBoundingClientRect(), canvas, fullImageRect);
            if (point) anchorEditor.place(point);
        };
        gameCanvas = element('canvas');gameCanvas.width = 960;gameCanvas.height = 540;
        gameCanvas.setAttribute('aria-label', 'ゲーム内の立ち絵配置プレビュー');
        sizeSlider = element('input');sizeSlider.type = 'range';sizeSlider.min = 1;sizeSlider.max = Math.max(2000, values.displayHeight);sizeSlider.step = 1;sizeSlider.value = values.displayHeight;
        sizeSlider.className = 'portrait-size-slider';sizeSlider.setAttribute('aria-label', '立ち絵の表示高さ');sizeSlider.title = '上下につまみを動かしてdisplayHeightを調整';
        sizeSlider.oninput = () => syncPlacement({ displayHeight: Number(sizeSlider.value) });
        const stage = element('div', undefined, 'portrait-game-stage');stage.append(sizeSlider, gameCanvas);
        game.append(element('h4', 'ゲーム画面（ドラッグで位置調整）'), stage);row.append(original, game);panel.append(row);
        gameInfo = element('p', 'ゲーム内の配置を読み込み中…', 'hint');panel.append(gameInfo);
        if (alias) {
            const reference = element('p', '参照元: ', 'hint portrait-reference');
            const destinationId = n.value;
            const link = navigationButton(destinationId, async () => {
                confirmCodeNavigation();
                const entries = model.declarations.find(d => d.name === 'CHARACTER_PORTRAITS')?.node.entries ?? [];
                if (entries.some(e => e.key === destinationId)) {
                    await goToDefinition({file, declaration: 'CHARACTER_PORTRAITS', entry: destinationId, name: destinationId});
                } else {
                    declaration = 'DEFAULT_CHARACTER_PLACEMENT';entry = null;focused = null;fullFile = false;render();
                    notice('参照元は個別配置が未登録のため、共通の既定配置を表示しました。画像ごとに変更する場合はCHARACTER_PORTRAITSへ登録してください。');
                }
            }, 'definition-link');
            link.title = '参照元の立ち絵の編集位置へ移動します。';
            reference.append(link, document.createTextNode('（画像と配置を共有。配置を変える場合は参照元を編集してください。）'));panel.append(reference);
        }
        previewOptions = {hud: true, handCount: 5, fainted: /(?:^|_)Fainted(?:_|$)/.test(entry)};
        const previewControls = element('div', undefined, 'controls portrait-game-controls');
        for (const [key, caption] of [['hud', 'UIを重ねる'], ['fainted', '失神中の位置']]) {
            const label = element('label', caption), input = element('input');input.type = 'checkbox';input.checked = previewOptions[key];
            input.onchange = () => previewOptions[key] = input.checked;label.prepend(input);previewControls.append(label);
        }
        const countLabel = element('label', '手札枚数'), count = element('input');count.type = 'number';count.min = 0;count.max = 10;count.value = 5;
        count.oninput = () => previewOptions.handCount = Math.max(0, Math.min(10, Math.floor(Number(count.value) || 0)));countLabel.append(count);previewControls.append(countLabel);
        const backgrounds = element('select');backgrounds.setAttribute('aria-label', 'プレビュー背景');previewControls.append(backgrounds);
        panel.append(previewControls);
        api('portrait-preview').then(config => {
            if (!panel.isConnected) return;
            gameConfig = config;background = new Image();
            const options = new Map([[config.backgrounds.fallback, '既定背景'], ...Object.entries(config.backgrounds.stages).map(([key,name]) => [name, 'ステージ ' + key]), ...Object.entries(config.backgrounds.events).map(([key,name]) => [name, key])]);
            for (const [name,label] of options) {const option = element('option', label + ' / ' + name);option.value = name;backgrounds.append(option);}
            const eventId = Object.keys(config.backgrounds.events).find(key => entry?.includes('_' + key + '_'));
            backgrounds.value = config.backgrounds.events[eventId] ?? config.backgrounds.stages[1] ?? config.backgrounds.fallback;
            const loadBackground = () => background.src = '/asset?name=' + encodeURIComponent('background/' + backgrounds.value);
            backgrounds.onchange = loadBackground;loadBackground();
        }).catch(error => {if(panel.isConnected) {gameInfo.textContent = error.message;gameInfo.classList.add('warning');}});
    } else panel.append(canvas);
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
    if (portrait) { assets.disabled = true; assets.title = '画像は項目のファイル名で決まります。別画像を使う場合は左の項目名を変更してください。'; }
    assets.onchange = () => { values.source = assets.value; image.src = `/asset?name=${encodeURIComponent(values.source)}`; };
    controls.append(assets);
    panel.append(controls);
    for (const key of [...positiveKeys, ...(portrait ? ['offsetX', 'offsetY'] : values.opaqueBounds ? ['bodyOffsetY'] : [])]) {
        const label = element('label', key);
        label.title = explain(key);
        const input = element('input');
        input.type = 'number';
        input.step = 'any';
        input.value = values[key] ?? 0;
        if (portrait) placementInputs[key] = input;
        input.setAttribute('aria-label', `preview ${key}`);
        input.oninput = () => {
            if (portrait) {
                values[key] = input.value === '' ? NaN : Number(input.value);
                portraitAdjustments.set(adjustmentId, snapshotPlacement(values));
                if (sizeSlider && values.displayHeight > 0) { sizeSlider.max = Math.max(2000, values.displayHeight);sizeSlider.value = values.displayHeight; }
            } else values[key] = Number(input.value);
        };
        label.append(input);
        controls.append(label);
    }
    if (portrait) {
        const portraitId = entry;
        restorePlacementButton = button('実装値に戻す', async () => syncPlacement({ epPoints: undefined, sigilPoint: undefined, ...await api('portrait-placement?id=' + encodeURIComponent(portraitId)) }));
        controls.append(restorePlacementButton);
        let drag;
        const point = event => previewGamePoint(event.clientX, event.clientY, gameCanvas.getBoundingClientRect(), gameCanvas, gameConfig);
        gameCanvas.onpointerdown = event => {
            if (event.button !== 0 || !gameConfig || !image.naturalWidth) return;
            const at = point(event), rect = portraitGameRect(image, values, gameConfig, previewOptions.fainted);
            if (at.x < 0 || at.x > gameConfig.width || at.y < 0 || at.y > gameConfig.height || at.x < rect.x || at.x > rect.x + rect.width || at.y < rect.y || at.y > rect.y + rect.height) return;
            drag = { at, values: { offsetX: values.offsetX ?? 0, offsetY: values.offsetY ?? 0 } };
            gameCanvas.setPointerCapture(event.pointerId);event.preventDefault();
        };
        gameCanvas.onpointermove = event => { if (drag) syncPlacement(draggedPlacement(drag.values, drag.at, point(event), gameConfig)); };
        gameCanvas.onpointerup = gameCanvas.onpointercancel = event => {
            drag = undefined;
            if (gameCanvas.hasPointerCapture(event.pointerId)) gameCanvas.releasePointerCapture(event.pointerId);
        };
        gameCanvas.onlostpointercapture = () => { drag = undefined; };
    }
    for (const key of values.opaqueBounds ? ['left', 'right', 'top', 'bottom'] : []) {
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
    let playing = !portrait, last = performance.now(), elapsed = 0;
    const info = element('p', undefined, 'hint');
    panel.append(info);
    const action = element('div', undefined, 'controls');
    if (!portrait) action.append(button('再生 / 停止', () => { playing = !playing; }), button('次のコマ', () => { playing = false; spriteFrame++; }));
    if (!alias) action.append(button('プレビュー値を下書きへ反映', async () => {
        for (const key of positiveKeys)
            if (!(values[key] > 0 && Number.isFinite(values[key])))
                throw Error(`${key} は正の数値を入力してください。`);
        for (const key of portrait ? [] : ['frameWidth', 'frameHeight', 'frameCount']) if (!Number.isInteger(values[key])) throw Error(`${key} は整数を入力してください。`);
        if (portrait && ['offsetX', 'offsetY'].some(key => !Number.isFinite(values[key] ?? 0))) throw Error('位置補正には有限の数値を入力してください。');
        if (!Number.isFinite(values.bodyOffsetY ?? 0) || Object.values(values.opaqueBounds ?? {}).some(v => !Number.isFinite(v))) throw Error('位置・不透明範囲には有限の数値を入力してください。');
        if (values.opaqueBounds && (values.opaqueBounds.left > values.opaqueBounds.right || values.opaqueBounds.top > values.opaqueBounds.bottom))
            throw Error('不透明領域の左右または上下が逆転しています。');
        const source = portrait ? updatePortraitSource(n, originalValues, values) : updateSpriteSource(n, originalValues, values);
        if (source !== n.source) await replace(n, source);
    }, 'primary'));
    panel.append(action);
    box.append(panel);
    if (portraitDetailRequested) openDetailMode?.();
    function draw(now) {
        const delta = Math.min(1000, now - last);
        last = now;
        const fw = portrait ? image.naturalWidth : values.frameWidth, fh = portrait ? image.naturalHeight : values.frameHeight, cols = Math.floor(image.naturalWidth / fw), frameCount = portrait ? 1 : values.frameCount;
        if (detailMode) {
            const bounds = canvas.getBoundingClientRect();
            const width = Math.max(32, Math.round(bounds.width)), height = Math.max(32, Math.round(bounds.height));
            if (canvas.width !== width) canvas.width = width;
            if (canvas.height !== height) canvas.height = height;
            zoomInfo.textContent = Math.round(detailView.zoom * 100) + '%';
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (image.complete && image.naturalWidth && fw > 0 && fh > 0 && cols > 0 && frameCount > 0) {
            if (playing) {
                elapsed += delta * values.frameRate / 1000;
                spriteFrame += Math.floor(elapsed);
                elapsed %= 1;
            }
            spriteFrame %= frameCount;
            const dh = values.displayHeight, dw = portrait ? dh * fw / fh : values.displayWidth, scale = Math.min(1, (canvas.width - 40) / Math.max(1, dw), 250 / Math.max(1, dh));
            const {x, y, width: w, height: h} = detailMode
                ? portraitDetailRect({width: fw, height: fh}, canvas, detailView)
                : {x: canvas.width / 2 - dw * scale / 2, y: portrait ? 25 : 150 - dh * scale / 2 + (values.bodyOffsetY ?? 0) * scale, width: dw * scale, height: dh * scale};
            ctx.imageSmoothingEnabled = portrait;
            ctx.drawImage(image, (spriteFrame % cols) * fw, Math.floor(spriteFrame / cols) * fh, fw, fh, x, y, w, h);
            if (portrait) { fullImageRect = { x, y, width: w, height: h };anchorEditor.draw(ctx, fullImageRect); }
            const b = values.opaqueBounds;
            ctx.strokeStyle = '#80ffbf';
            ctx.lineWidth = 2;
            if (portrait) {
                ctx.beginPath(); ctx.moveTo(x + w / 2 - 10, y); ctx.lineTo(x + w / 2 + 10, y); ctx.moveTo(x + w / 2, y - 10); ctx.lineTo(x + w / 2, y + 10); ctx.stroke();
            }
            if (b) ctx.strokeRect(x + b.left / fw * w, y + b.top / fh * h, (b.right - b.left + 1) / fw * w, (b.bottom - b.top + 1) / fh * h);
            const overflow = (b && (b.left < 0 || b.top < 0 || b.right >= fw || b.bottom >= fh || b.left > b.right || b.top > b.bottom)) || frameCount > cols * Math.floor(image.naturalHeight / fh);
            info.textContent = portrait ? `画像 ${fw} × ${fh} px · 基準表示 ${dw.toFixed(1)} × ${dh} · 緑十字 = 上端中央の基準位置` : `コマ ${spriteFrame + 1} / ${frameCount} · ${values.frameRate.toFixed(2)} fps${b ? ' · 緑枠 = 不透明領域' : ''}${overflow ? ' ⚠ 領域・コマ数が画像範囲外です。' : ''}`;
            info.classList.toggle('warning', overflow);
        }
        else
            info.textContent = '画像・フレーム寸法を確認してください。';
        if (gameConfig) {
            const rect = drawPortraitGame(gameCanvas.getContext('2d'), image, values, gameConfig, {...previewOptions, background, drawAnchors: (ctx, rect, screenRect) => anchorEditor.draw(ctx, rect, screenRect)});
            gameInfo.textContent = 'ゲーム ' + gameConfig.width + ' × ' + gameConfig.height + ' / 共通倍率 ' + gameConfig.player.scale + ' / 表示 ' + rect.width.toFixed(1) + ' × ' + rect.height.toFixed(1) + ' / 左上 (' + rect.x.toFixed(1) + ', ' + rect.y.toFixed(1) + ')';
        }
        spriteAnimation = requestAnimationFrame(draw);
    }
    spriteAnimation = requestAnimationFrame(draw);
}

const buttonDescriptions = {
    'ビルド実行': '現在の本体ソースをビルドします。ツールの下書きは適用しません。',
    'ビルドせず適用': 'バックアップと外部変更検出を行い、全下書きを本体へ適用します。ビルドと全体整合チェックは省略します。',
    '未反映のTS入力を破棄': 'TypeScript欄の未反映の編集だけを破棄します。フォームに反映済みの下書きと本体ソースは変更しません。',
    '実装結果を更新': '現在のフォームの下書きをTypeScript欄に表示します。',
    '実装値に戻す': '選択中の立ち絵の本体ソースに保存されている配置へ、プレビュー値を戻します。下書きは変えません。',
    '参照として追加': '選択した画像と配置を共有する、新しい名前の立ち絵を追加します。',
    TS: 'この項目のTypeScriptを右の入力欄に表示します。手入力後はフォームへ反映できます。',
    '↑': 'この要素を1つ前へ移動します。配列の実行・表示順も変わります。',
    '↓': 'この要素を1つ後ろへ移動します。配列の実行・表示順も変わります。',
    '複製': 'この要素をコピーして直後に追加します。',
    '削除': 'この要素を下書きから削除します。本体には適用まで反映されません。',
    'このファイルの下書きを破棄': '選択中のデータ種別の下書きを破棄し、現在の本体ソースを読み込みます。確認画面が出ます。',
    'ビルドして適用': '必須入力・動作条件・型を確認し、バックアップ後に本体へ適用してビルドします。',
    '最新の情報に更新': '本体の最新データ・型・画像一覧を読み込み直します。下書きは保持します。',
    '入力内容整合チェック': '型と動作に必要な入力の不足を、本体を書き換えずに確認します。',
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
    if (!owner || owner.closest('#declarations')) return hideHelp();
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

$('source').oninput = () => {
    codeDirty = $('source').value !== codeBaseline;
    if (codeDirty) localStorage.setItem(codeStorageKey(), JSON.stringify({ text: $('source').value, start: focused?.start, end: focused?.end, original: fullFile ? model.source : focused?.source }));
    else localStorage.removeItem(codeStorageKey());
    updateCodeState();
};
$('parse').onclick = () => guard(parseCode);
$('discard-code').dataset.navigation = 'true';
$('discard-code').onclick = () => navigate(discardCodeInput);
$('source-refresh').dataset.navigation = 'true';
$('source-refresh').onclick = () => navigate(() => { confirmCodeNavigation(); setCode(chosen(), true); });
$('search').oninput = () => {renderList();updateWriteLock();};
$('declarations').addEventListener('keydown', event => {
    if (!['ArrowUp', 'ArrowDown'].includes(event.key) || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    event.preventDefault();
    // Only editing destinations participate; never trigger add/delete actions.
    const items = [...$('declarations').querySelectorAll('button.group, button.entry')].filter(item => !item.disabled);
    if (!items.length) return;
    const focusedItem = event.target.closest('button');
    let index = items.indexOf(focusedItem);
    if (index < 0) index = items.findIndex(item => item.classList.contains('active'));
    const nextIndex = index < 0 ? 0 : Math.max(0, Math.min(items.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1)));
    const next = items[nextIndex];
    if (next === focusedItem) return;
    next.focus({ preventScroll: true });
    next.click();
});
$('filemode').dataset.navigation = 'true';
$('filemode').onclick = () => navigate(async () => { confirmCodeNavigation(); fullFile = !fullFile; $('filemode').textContent = fullFile ? '選択項目を編集' : 'ファイル全体を編集'; setCode(); });
$('refresh').onclick = () => guard(async () => { confirmCodeNavigation();const targetFile = file;catalog = await api('refresh', {});session.models.clear();const result = await api('file?file=' + encodeURIComponent(targetFile));session.remember(result);if (file === targetFile) {model = result;focused = null;render();}else renderTabs();notice('最新の定義・参照先・画像を取得しました。下書きは保持しています。'); });
$('validate').onclick = () => guard(async () => { requireCodeSynced(); notice('本体の型定義で確認しています…'); const r = await api('validate', {}); dialog(r.diagnostics.length ? '型チェック結果' : '型チェック成功', r.diagnostics.map(d => `${d.file}:${d.line} TS${d.code}\n${d.message}`).join('\n\n') || 'TypeScriptエラーはありません。', r.diagnostics); });
const applyDrafts = build => guard(async () => { const invalid = [...document.querySelectorAll('#form input[type=number]')].find(input => input.value === '' || input.validity.badInput || !Number.isFinite(Number(input.value))); if (invalid) throw Error(`${invalid.getAttribute('aria-label')} の数値入力を確認してください。本体は変更していません。`); requireCodeSynced(); notice(build ? '入力を確認し、バックアップ・適用・ビルドを実行します…' : 'バックアップを保存し、ビルド・全体整合チェックを省略して適用します…'); $('apply').disabled = true; try {
    const r = await api('apply', { build });
    if (r.ok) { for (const tab of catalog.files) { tab.dirty = false;tab.conflict = false; } model.base = model.source;for (const cached of session.models.values()) cached.base = cached.source; }
    render();
    notice(r.ok ? '本体ソースへの適用が完了しました。' : '適用に失敗しました。入力内容とログから修正できます。', !r.ok);
    dialog(r.ok ? build ? '適用・ビルド成功' : '適用成功（ビルド未実行）' : r.validationFailed ? '入力を確認してください：本体は変更していません' : r.restored ? 'ビルド失敗：本体ソースを復元しました' : '適用失敗：復元結果を確認してください', `${r.log}\n\n${r.backup ? 'バックアップ: ' + r.backup : ''}${r.conflicts?.length ? '\n外部変更を保護したファイル: ' + r.conflicts.join(', ') : ''}\n${r.ok ? '' : '入力した設定は下書きとして保持しています。'}`, r.diagnostics ?? []);
}
finally {
    $('apply').disabled = false;
} });
$('apply').onclick = () => applyDrafts(true);
$('apply-no-build').onclick = () => applyDrafts(false);
$('build').onclick = () => guard(async () => {
    notice('現在の本体ソースをビルドしています。下書きは適用しません。');
    const result = await api('build', {});
    dialog(result.ok ? '本体のビルド成功' : '本体のビルド失敗', result.log);
    notice(result.ok ? '本体のビルドが完了しました。下書きは変更していません。' : 'ビルドに失敗しました。ログを確認してください。', !result.ok);
});
$('discard').onclick = () => guard(async () => {
    const targetFile = file;
    if (!confirm(targetFile + ' のツール内の下書きを破棄し、現在の本体ソースを読み込みますか？')) return;
    catalog = await api('discard', { file: targetFile });session.models.delete(targetFile);
    for (const k of Object.keys(localStorage)) if (k.startsWith('stts-code:' + targetFile + ':')) localStorage.removeItem(k);
    for (const [node, failure] of failedLiterals) if (failure.file === targetFile) failedLiterals.delete(node);
    if (file === targetFile) await load(targetFile);else renderTabs();
}, true);
$('close-dialog').onclick = () => $('dialog').close();
$('copy-log').onclick = () => guard(async () => { await navigator.clipboard.writeText($('dialog-log').textContent); notice('コピーしました。'); }, true);
window.addEventListener('beforeunload', event => { if (codeDirty || busy || pendingLiterals || failedLiterals.size) {
    event.preventDefault();
    event.returnValue = '';
} });
await guard(async () => { catalog = await api('catalog'); await load(catalog.files.find(f => f.file.endsWith('/cards.ts'))?.file ?? catalog.files[0].file); if (catalog.recovery.length)
    dialog('前回の未完了処理を復元しました', JSON.stringify(catalog.recovery, null, 2)); });

function renderCardTextPreviewButton(n) {
    if (!file.endsWith('/cards.ts') || !entry || !n) return;
    const box = element('div', undefined, 'preview');
    const artworkId = literal(object(n))?.id ?? entry;
    box.append(navigationButton('カード画像の配置へ', () => goToDefinition({ file: 'src/data/cardAppearance.ts', declaration: 'CARD_ARTWORK', entry: artworkId, name: artworkId })));
    box.append(button('カード説明プレビュー（日英・基本値）', async () => {
        try {
            const result = await api('card-text-preview?entry=' + encodeURIComponent(entry));
            const content = element('div');
            for (const lang of ['ja', 'en']) {
                content.append(element('h4', lang === 'ja' ? '日本語' : 'English'));
                for (const line of result[lang]) {
                    const paragraph = element('p');
                    for (const segment of line) {
                        const span = element(segment.bold ? 'strong' : 'span', segment.text);
                        if (segment.term) { span.style.color = segment.color ?? '#e74b86'; span.style.textDecoration = 'underline'; }
                        paragraph.append(span);
                    }
                    content.append(paragraph);
                }
            }
            if (result.issues.length) content.append(element('pre', result.issues.join('\n')));
            box.querySelector('.card-text-result')?.remove();
            content.classList.add('card-text-result');box.append(content);
        } catch(error) { dialog('説明プレビュー', String(error.message ?? error)); }
    }));
    box.append(element('p', '下書きから基本値の文章を確認します。手札の補正値・カード枠内の改行はゲーム側で確認してください。', 'hint'));
    $('form').append(box);
}
