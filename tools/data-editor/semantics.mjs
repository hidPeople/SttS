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
export const playerOnlyEffects = ['discardHand', 'setEpReserveRatio', 'setEpReserve', 'setEp', 'setEpRatio', 'retainBlock', 'epReserveHeal'];
export const presenceConditions = ['status', 'relic', 'enemyTrait', 'bodyPartStatus'];
export function requirements(node, schemas, context = {}) {
  const f = fieldsOf(node), value = key => unwrap(f[key])?.value;
  const name = schemas[node.schema]?.name ?? '';
  const effect = node.callee === 'effect' || name === 'EffectDefinition';
  const condition = node.callee === 'condition' || name === 'ConditionDefinition';
  const required = [];
  if (effect) {
    if (value('chancePerStack') === true) required.push('chance');
    if (value('kind') === 'status') required.push('status');
    if (value('kind') === 'copyEpSensitivity') required.push('sensitivityPart');
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
  if (value('anchor') === 'card') required.push('cardId');
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
    // This event deliberately reserves an empty localized narration for later writing.
    const reservedNarration = /\.flavors\.status\.epDamageOverridden\[\d+\]\.text\.(en|ja)$/.test(path);
    if (required && n.kind === 'string' && !n.value.trim() && !reservedNarration) issue(n, path, '必須の入力が空欄です。');
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
    for (const key of ['kind', 'operator', 'chanceBonusStatus', 'chanceBonusPerStack', 'chancePerStack']) if (rule.fields[key] && (rule.effect || rule.condition || rule.required.length)) rule.fields[key].ensureOwner = n.start;
    const val = key => unwrap(rule.fields[key])?.value;
    if (rule.effect && ['shareEpDamage', 'copyEpSensitivity'].includes(val('kind'))) {
      if (!['selectedEnemy', 'triggerEnemy', 'allEnemies'].includes(val('target'))) issue(n, path, '敵を対象に指定してください。');
      if (val('amount') !== 0) issue(n, path + '.amount', '量を指定しない効果です。amountは0にしてください。');
    }
    const numericCondition = ['cardsPlayedThisTurn', 'intentUsageCount', 'playerOrgasmsThisBattle', 'aliveEnemyCount', 'hp', 'hpPercent', 'ep', 'epPercent', 'block', ...presenceConditions].includes(val('kind'));
    const booleanCondition = ['isPlayerTurn', 'purgeCausedOrgasm', 'purgeWillCauseOrgasm', 'enemyHasBindingAction', 'enemyHasEIntents', 'enemyOrgasmAftershocks', 'hasEp'].includes(val('kind'));
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
      if (map.effects && map.categories && map.id) {
        const effectNodes = unwrap(map.effects)?.items ?? [];
        const effects = effectNodes.map(e => fieldsOf(e));
        const val = (e, key) => unwrap(e[key])?.value;
        const ids = effects.map(e=>val(e,'textId')).filter(Boolean);
        if (new Set(ids).size !== ids.length) issue(n, path + '.effects', 'textIdはカード内で一意にしてください。');
        if (ids.some(id => !/^[^\s.{}]+$/.test(id))) issue(n, path + '.effects', 'textIdに空白・ピリオド・波括弧は使えません。');
        for (const section of unwrap(map.textOrder)?.items ?? []) if (section.value?.startsWith('effect.') && ids.filter(id => id === section.value.slice(7)).length !== 1) issue(section, path + '.textOrder', '並べ替え対象のtextIdが存在しないか重複しています。');
        const descriptionNode = unwrap(map.description);
        const textFields = descriptionNode?.kind === 'call' && ['l', 'text'].includes(descriptionNode.callee)
          ? Object.fromEntries(descriptionNode.args.map((arg, i) => [i, arg])) : fieldsOf(descriptionNode);
        for (const textNode of Object.values(textFields)) {
          const text = unwrap(textNode)?.value;
          if (typeof text !== 'string') continue;
          for (const [, token] of text.matchAll(/\{([^{}]+)\}/g)) {
            if (token === 'amount') issue(textNode, path + '.description', '{amount}だけでは対象が曖昧です。{selectedEnemy.hpDamage.amount}等を指定してください。');
            if (!token.includes('.')) continue;
            const [target, kind, field, extra] = token.split('.');
            const matches = effects.filter(e=>target==='effect' ? val(e,'textId')===kind : val(e,'target')===target && val(e,'kind')===kind);
            if (extra || matches.length !== 1 || !['amount','times','status','stacks','ratio','base','chance','text'].includes(field)) issue(textNode, path + '.description', '{' + token + '}の参照が存在しないか重複しています。対象・効果・値を確認し、同種効果はtextIdで区別してください。');
          }
        }
      }
      if (s.name === 'StatusDefinition') {
        for (const key of ['turnStartEnergy', 'receivedEpDamage']) {
          const value = unwrap(map[key]);
          if (value?.kind === 'number' && value.value < 0) issue(value, `${path}.${key}`, '0以上の数値にしてください。');
        }
        const ratio = unwrap(map.removeAboveHpRatio);
        if (ratio?.kind === 'number' && (ratio.value < 0 || ratio.value > 1)) issue(ratio, `${path}.removeAboveHpRatio`, '0以上1以下の割合にしてください。');
        const count = unwrap(fieldsOf(map.hpDrainProgress).count);
        if (count?.kind === 'number' && (!Number.isInteger(count.value) || count.value < 1)) issue(count, `${path}.hpDrainProgress.count`, '1以上の整数にしてください。');
      }
      if (s.name === 'StatusDefinition' && map.durationTurns) {
        const duration = unwrap(map.durationTurns);
        if (duration.kind === 'number' && (!Number.isInteger(duration.value) || duration.value < 1)) issue(duration, `${path}.durationTurns`, '持続ターン数は1以上の整数にしてください。');
        if (unwrap(map.consumeEachTurn)?.value === 1) issue(n, path, '固定持続時間を使う場合、consumeEachTurnは0にしてください。');
      }
      if (map.epDamageTakenMultiplierPerOrgasm) {
        const factor = unwrap(map.epDamageTakenMultiplierPerOrgasm);
        if (factor?.kind === 'number' && factor.value <= 0) issue(factor, path + '.epDamageTakenMultiplierPerOrgasm', '0より大きい倍率にしてください。');
      }
      if (map.orgasmInterval) {
        const interval = unwrap(map.orgasmInterval);
        if (interval.kind === 'number' && (!Number.isInteger(interval.value) || interval.value < 1)) issue(interval, path + '.orgasmInterval', '1以上の整数を指定してください。');
        if (unwrap(map.timing)?.value !== 'playerOrgasm') issue(n, path, 'orgasmIntervalはplayerOrgasm専用です。');
      }
      if (map.orgasmPhase) {
        if (unwrap(map.timing)?.value !== 'playerOrgasm') issue(n, path, 'orgasmPhaseはplayerOrgasm専用です。');
        for (const effect of unwrap(map.effects)?.items ?? []) {
          const f = fieldsOf(effect);
          if (unwrap(f.kind)?.value !== 'epDamage' || !['selectedEnemy', 'triggerEnemy', 'allEnemies'].includes(unwrap(f.target)?.value)) issue(effect, path + '.effects', 'damageフェーズは敵へのepDamage専用です。');
        }
      }
      if (map.statusConsumptionBonus) {
        for (const [status, node] of Object.entries(fieldsOf(map.statusConsumptionBonus))) {
          const value = unwrap(node);
          if (value.kind === 'number' && (!Number.isInteger(value.value) || value.value < 0)) issue(value, path + '.statusConsumptionBonus.' + status, '0以上の整数を指定してください。');
        }
      }
      if (map.idleOrgasmsRule) {
        const idle = fieldsOf(map.idleOrgasmsRule);
        for (const key of ['turns', 'stacks']) {
          const value = unwrap(idle[key]);
          if (value?.kind === 'number' && (!Number.isInteger(value.value) || value.value < 1)) issue(value, `${path}.idleOrgasmsRule.${key}`, '1以上の整数にしてください。');
        }
      }
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
  if (model.file === 'src/data/ui.ts') {
    const find = name => fieldsOf(model.declarations.find(d => d.name === name)?.node);
    const scales = unwrap(find('CARD_HOVER').scales);
    if (scales?.kind === 'array' && !scales.items.some(item => item.source.startsWith('...')) && scales.items.length !== 3)
      issue(scales, 'CARD_HOVER.scales', '小・中・大の倍率を3個指定してください。');
    const inspection = find('CARD_INSPECTION'), start = unwrap(inspection.progressStartMs), open = unwrap(inspection.openMs);
    if (start?.kind === 'number' && open?.kind === 'number' && open.value <= start.value)
      issue(open, 'CARD_INSPECTION.openMs', 'progressStartMsより大きい長押し時間を指定してください。');
    const ribbon = find('RIBBON_HUD');
    for (const key of ['hpColors', 'lowHpColors', 'epColors', 'reserveColors', 'blockColors', 'retainedBlockColors']) {
      const node = unwrap(ribbon[key]);
      if (node?.kind === 'array' && (node.items.length !== 3 || node.items.some(n => n.kind === 'string' && !/^#[0-9a-f]{6}$/i.test(n.value))))
        issue(node, `RIBBON_HUD.${key}`, '#RRGGBB形式の色を3個指定してください。');
    }
    const drain = fieldsOf(ribbon.playerDrain);
    for (const key of ['delay', 'cycle', 'radius', 'drift']) {
      const node = unwrap(drain[key]);
      if (node?.kind === 'array' && (node.items.length !== 2 || node.items[0]?.value > node.items[1]?.value))
        issue(node, `RIBBON_HUD.playerDrain.${key}`, '最小値・最大値の順に2個指定してください。');
    }
    const pulses = unwrap(ribbon.enemyPulses);
    if (pulses?.kind === 'array') {
      let end = 0, remaining = 1;
      if (!pulses.items.length) issue(pulses, 'RIBBON_HUD.enemyPulses', '放出を少なくとも1回指定してください。');
      pulses.items.forEach((node, i) => {
        const fields = fieldsOf(node), value = key => unwrap(fields[key])?.value;
        if (!(value('start') >= end && value('start') < value('end') && value('end') <= 1 && value('remaining') >= 0 && value('remaining') < remaining))
          issue(node, `RIBBON_HUD.enemyPulses[${i + 1}]`, '0～1の範囲で開始<終了を時間順に設定し、残量は前段より小さくしてください。');
        end = value('end'); remaining = value('remaining');
      });
      if (pulses.items.length && remaining !== 0) issue(pulses, 'RIBBON_HUD.enemyPulses', '最後の放出のremainingは0にしてください。');
    }
  }
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
  const obsolete = (rule.effect || rule.condition) ? ['status', 'cardId', 'relicId', 'valueKey', 'enemyTrait', 'sensitivityPart'].filter(key =>
    !required.includes(key) && unwrap(fields[key])?.kind === 'string' && unwrap(fields[key]).value === '') : [];
  const booleanCondition = ['isPlayerTurn', 'purgeCausedOrgasm', 'purgeWillCauseOrgasm', 'enemyHasBindingAction', 'enemyHasEIntents', 'enemyOrgasmAftershocks', 'hasEp'].includes(fields.kind?.value);
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
