// Editor-only rules audited against BattleScene.executeEffect and models/conditions.ts.
export const unwrap = n => n?.kind === 'wrap' ? unwrap(n.inner) : n;
export function fieldsOf(node) {
  node = unwrap(node);
  if (node?.kind === 'object') return Object.fromEntries(node.entries.filter(e => e.key).map(e => [e.key, e.node]));
  if (node?.kind === 'call' && node.parameters.some(p => p.name === 'kind')) {
    const fields = {};
    node.args.forEach((arg, i) => { const key = node.parameters[i]?.name; if (key === 'options') Object.assign(fields, fieldsOf(arg)); else if (key) fields[key] = arg; });
    return fields;
  }
  return {};
}
export const playerOnlyEffects = ['discardHand', 'setEpReserveRatio', 'setEp', 'retainBlock', 'epReserveHeal'];
export const presenceConditions = ['status', 'relic', 'enemyTrait', 'bodyPartStatus'];
export function requirements(node, schemas, context = {}) {
  const f = fieldsOf(node), value = key => unwrap(f[key])?.value;
  const name = schemas[node.schema]?.name ?? '';
  const effect = node.callee === 'effect' || name === 'EffectDefinition';
  const condition = node.callee === 'condition' || name === 'ConditionDefinition';
  const required = [];
  if (effect) {
    if (value('kind') === 'status') required.push('status');
    if (value('kind') === 'addCardToHand') required.push('cardId');
    if (value('kind') === 'removeStatus' && !context.statusOwner && !f.statusGroup) required.push('status');
  }
  if (condition) {
    if (value('kind') === 'status') required.push(f.statuses ? 'statuses' : 'status');
    if (value('kind') === 'relic') required.push(f.relicIds ? 'relicIds' : 'relicId');
    if (value('kind') === 'enemyTrait') required.push(f.enemyTraits ? 'enemyTraits' : 'enemyTrait');
    if (value('kind') === 'bodyPartStatus') required.push('parts');
    if (value('kind') === 'flavorValue') required.push('valueKey');
    if (value('operator') !== undefined && !['has', 'notHas'].includes(value('operator'))) required.push('value');
  }
  if (f.chanceBonusStatus || f.chanceBonusPerStack) {
    required.push('chanceBonusStatus', 'chanceBonusPerStack');
    required.push('chance');
  }
  return { fields: f, required, effect, condition };
}
function schemaFor(model, n) {
  let s = model.schemas[n.schema] ?? {};
  if (s.kind === 'union') {
    const matches = s.variants.map(id => model.schemas[id]).filter(s => s.kind === n.kind);
    s = matches.find(s => s.kind !== 'object' || n.entries.every(e => !e.key || s.index || s.properties?.some(p => p.name === e.key))) ?? matches[0] ?? s;
  }
  return s;
}
export function inspectModel(model) {
  const issues = [], visited = new Set();
  const issue = (n, path, message) => issues.push({ file: model.file, line: model.source.slice(0, n.start).split('\n').length, start: n.start, path, code: 'CONFIG', message: `${path}: ${message}` });
  function visit(n, path, required = false, context = {}) {
    if (!n || visited.has(n.start)) return;
    visited.add(n.start);
    const s = schemaFor(model, n);
    if (required && n.kind === 'string' && !n.value.trim()) issue(n, path, '必須の入力が空欄です。');
    if (required && n.source === 'undefined') issue(n, path, '必須項目が未設定です。');
    if (n.kind === 'wrap') { visited.delete(n.start); visit(n.inner, path, required, context); return; }
    const rule = requirements(n, model.schemas, context);
    n.logicalRequired = rule.required;
    if (n.kind === 'call' && rule.required.length) {
      const optionsIndex = n.parameters.findIndex(p => p.name === 'options');
      if (n.args[optionsIndex]) n.args[optionsIndex].requiredByLogic = true;
    }
    for (const key of rule.required) {
      const child = rule.fields[key];
      if (!child) issue(n, `${path}.${key}`, '選択した動作に必要な項目がありません。');
      else {
        child.requiredByLogic = true;
        if (child.kind === 'array' && !child.items.length) issue(child, `${path}.${key}`, '少なくとも1件を選択してください。');
      }
    }
    for (const key of ['kind', 'operator', 'chanceBonusStatus', 'chanceBonusPerStack']) if (rule.fields[key] && (rule.effect || rule.condition || rule.required.length)) rule.fields[key].ensureOwner = n.start;
    const val = key => unwrap(rule.fields[key])?.value;
    const numericCondition = ['cardsPlayedThisTurn', 'intentUsageCount', 'aliveEnemyCount', 'hp', 'hpPercent', 'ep', 'epPercent', 'block', ...presenceConditions].includes(val('kind'));
    const booleanCondition = ['isPlayerTurn', 'purgeCausedEpPeak', 'purgeWillCauseEpPeak'].includes(val('kind'));
    if (rule.condition && rule.fields.value?.value !== undefined && !['has', 'notHas'].includes(val('operator'))) {
      if (numericCondition && typeof val('value') !== 'number') issue(rule.fields.value, `${path}.value`, 'この条件の比較値には数値が必要です。');
      if (booleanCondition && typeof val('value') !== 'boolean') issue(rule.fields.value, `${path}.value`, 'この条件の比較値には真偽値が必要です。');
      if (booleanCondition && !['eq', 'notEq'].includes(val('operator'))) issue(n, `${path}.operator`, '真偽値の条件には一致／不一致を選択してください。');
    }
    if (rule.condition && ['has', 'notHas'].includes(val('operator')) && !presenceConditions.includes(val('kind'))) issue(n, path, '有／無は状態異常・レリック・敵の性質・部位の状態の条件で使用します。他の条件は比較演算子を選択してください。');
    if (rule.condition && val('kind') === 'bodyPartStatus' && rule.fields.bodyPartStatusKinds?.kind === 'array' && !rule.fields.bodyPartStatusKinds.items.length) issue(rule.fields.bodyPartStatusKinds, `${path}.bodyPartStatusKinds`, '確認する状態種別を1件以上選択するか、項目を削除して両方を確認してください。');
    if (rule.effect && playerOnlyEffects.includes(val('kind')) && val('target') && val('target') !== 'player' && !(val('target') === 'self' && context.actor !== 'enemy')) issue(n, `${path}.target`, 'この効果はプレイヤー対象でのみ実行されます。');
    if (rule.effect && val('kind') === 'hpDrain' && (val('target') === 'player' || val('target') === 'self' && context.actor === 'player')) issue(n, `${path}.target`, 'HP吸収は敵を対象にしてください。');
    if (n.kind === 'object') {
      if (!(context.template && s.name?.startsWith('Record<')) && !n.entries.some(e => !e.key)) for (const p of s.properties ?? []) if (!p.optional && !n.entries.some(e => e.key === p.name)) issue(n, `${path}.${p.name}`, '型定義の必須項目がありません。');
      const map = fieldsOf(n);
      if (typeof map.min?.value === 'number' && typeof map.max?.value === 'number' && map.min.value > map.max.value) issue(n, path, '最小値が最大値を超えています。');
      for (const e of n.entries) {
        const p = s.properties?.find(p => p.name === e.key);
        visit(e.node, `${path}.${e.key ?? '展開参照'}`, p && !p.optional || e.node.requiredByLogic, { ...context, statusOwner: context.statusOwner || e.key === 'statusTriggers' });
      }
    }
    if (n.kind === 'call') {
      n.args.forEach((a, i) => {
        const p = n.parameters[i];
        visit(a, `${path}.${p?.name ?? i}`, p && !p.optional || a.requiredByLogic, context);
      });
    }
    if (n.kind === 'array') {
      if (!n.items.some(item => item.source.startsWith('...')) && n.items.length < (s.minLength ?? 0)) issue(n, path, `少なくとも${s.minLength}件必要です。`);
      n.items.forEach((a, i) => visit(a, `${path}[${i + 1}]`, true, context));
    }
    if (n.kind === 'number' && !Number.isFinite(n.value)) issue(n, path, '有限の数値を入力してください。');
  }
  for (const d of model.declarations.filter(d => !d.typeDefinition)) visit(d.node, d.name, true, { template: d.template, statusOwner: d.name === 'STATUS_DESCRIPTIONS' || d.template && model.file.endsWith('/statuses.ts'), actor: /enemies/.test(model.file) ? 'enemy' : /cards|relics/.test(model.file) ? 'player' : undefined });
  return issues;
}
export function ensureRequirements(model, start) {
  let target;
  function find(n) { if (n.start === start) target = n; for (const c of [...(n.args ?? []), ...(n.items ?? []), ...(n.entries ?? []).map(e => e.node), ...(n.inner ? [n.inner] : [])]) find(c); }
  model.declarations.forEach(d => find(d.node));
  if (!target) return model.source;
  const rule = requirements(target, model.schemas, { statusOwner: model.file.endsWith('/statuses.ts') });
  const fields = rule.fields, required = target.logicalRequired ?? rule.required;
  const missing = required.filter(k => !fields[k]);
  // A previous kind may have activated an unselected enum. Retain meaningful
  // values, but do not leave an invalid empty selector for an inactive kind.
  const obsolete = (rule.effect || rule.condition) ? ['status', 'cardId', 'relicId', 'valueKey', 'enemyTrait'].filter(key =>
    !required.includes(key) && unwrap(fields[key])?.kind === 'string' && unwrap(fields[key]).value === '') : [];
  const booleanCondition = ['isPlayerTurn', 'purgeCausedEpPeak', 'purgeWillCauseEpPeak'].includes(fields.kind?.value);
  const entries = missing.map(key => `${key}: ${key === 'parts' ? '[]' : key === 'value' ? booleanCondition ? 'false' : '0' : key === 'chance' ? '1' : key === 'chanceBonusPerStack' ? '0' : "''"}`);
  if (!entries.length && !obsolete.length) {
    // Adding a new effect/condition in a collection also activates its default kind.
    let descendant;
    function search(n) {
      for (const c of [...(n.args ?? []), ...(n.items ?? []), ...(n.entries ?? []).map(e => e.node), ...(n.inner ? [n.inner] : [])]) {
        const r = requirements(c, model.schemas, { statusOwner: model.file.endsWith('/statuses.ts') });
        if (!descendant && (c.logicalRequired ?? r.required).some(key => !r.fields[key])) descendant = c;
        if (!descendant) search(c);
      }
    }
    search(target);
    return descendant ? ensureRequirements(model, descendant.start) : model.source;
  }
  const append = object => {
    const retained = object.entries.filter(e => !obsolete.includes(e.key));
    const parts = retained.map(e => model.source.slice(e.start, e.end));
    const last = object.entries.at(-1);
    // Keep trailing comments, placing the separator before a line comment.
    const tail = model.source.slice(last?.end ?? object.start + 1, object.end - 1).replace(/^\s*,/, '');
    return `{${parts.join(',')}${parts.length && entries.length ? ',' : ''}${tail}\n${entries.join(',\n')}\n}`;
  };
  let replacement;
  if (target.kind === 'call') {
    const index = target.parameters.findIndex(p => p.name === 'options'), args = target.args.map(a => a.source);
    if (index < 0) return model.source;
    args[index] = target.args[index]?.kind === 'object' ? append(target.args[index]) : `{ ${args[index] ? `...${args[index]},` : ''} ${entries.join(', ')} }`;
    replacement = `${target.callee}(${args.join(', ')})`;
  } else if (target.kind === 'object') replacement = append(target);
  if (!replacement) return model.source;
  return model.source.slice(0, target.start) + replacement + model.source.slice(target.end);
}
