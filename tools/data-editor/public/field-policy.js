// UI-only guidance. Bounds are warnings, never browser min/max constraints.
export function numericPolicy(key, context = {}) {
    if (key === 'repeat') return { step: 1, min: -1 };
    if (key === 'alpha') return { step: 0.01, min: 0, max: 1 };
    if (['scaleMultiplier', 'amountPerSprite'].includes(key)) return { step: 0.1, min: 0, exclusiveMin: true };
    if (['duration', 'distanceRatio', 'verticalRatio'].includes(key)) return { step: 0.1, min: 0 };
    if (key === 'chance') return { step: 0.01, min: 0, max: 1 };
    // A signed bonus is valid: it can reduce the final chance.
    if (key === 'chanceBonusPerStack') return { step: 0.01 };
    if (key === 'amount' && context.kind === 'setEpReserveRatio') return { step: 0.01, min: 0, max: 1 };
    if (['selfHpDamagePercent', 'selfEpDamagePercent'].includes(key) || key === 'amount' && context.percentOf) return { step: 0.01, min: 0 };
    if (key === 'value' && ['hpPercent', 'epPercent'].includes(context.kind)) return { step: 1, min: 0, max: 100 };
    if (key === 'value' && ['hp', 'ep', 'block', 'cardsPlayedThisTurn', 'intentUsageCount', 'aliveEnemyCount', 'status', 'relic', 'enemyTrait', 'bodyPartStatus'].includes(context.kind)) return { step: 1, min: 0 };
    if (['frameRate', 'attackAnimationTimeScale'].includes(key)) return { step: 0.1, min: 0, exclusiveMin: true };
    if (key === 'maxEp') return { step: 1, min: 0 }; // Zero disables enemy EP.
    if (['frameWidth', 'frameHeight', 'frameCount', 'displayWidth', 'displayHeight', 'size', 'maxHp'].includes(key)) return { step: 1, min: 0, exclusiveMin: true };
    if (['times', 'timesLimit', 'stacks', 'cost', 'counter', 'maxEnergy', 'threat', 'stages', 'hpDamage', 'hpDrain', 'epDamage', 'selfHpDamage', 'selfEpDamage', 'hpHeal', 'epHeal', 'epReserveHeal', 'drawCards', 'energyGain', 'block', 'hpDamageTimes', 'epDamageTimes', 'selfHpDamageTimes', 'selfEpDamageTimes', 'minBaseAmount'].includes(key)) return { step: 1, min: 0 };
    if ((key === 'amount' && context.effect) || (['min', 'max'].includes(key) && context.randomAmount)) return { step: 1, min: 0 };
    if (['left', 'right', 'top', 'bottom'].includes(key)) return { step: 1, min: 0 };
    // Modifiers, priorities, offsets and arbitrary comparison values can be signed.
    return { step: 'any' };
}
export function numericWarnings(value, policy) {
    if (!Number.isFinite(value)) return [];
    const notes = [];
    if (policy.min !== undefined && (policy.exclusiveMin ? value <= policy.min : value < policy.min)) notes.push(`${policy.min}${policy.exclusiveMin ? 'より大きい' : '以上の'}数値を指定してください（範囲外の警告）。`);
    if (policy.max !== undefined && value > policy.max) notes.push(`${policy.max}以下の数値を指定してください${policy.max === 1 ? '（1 = 100%）' : ''}（範囲外の警告）。`);
    return notes;
}
export function duplicateIdentifierStarts(model) {
    const groups = new Map(), duplicates = new Set();
    function walk(n, scope) {
        if (!n) return;
        // Each collection has its own ID namespace (including each intent pool).
        const nextScope = n.kind === 'array' ? `array:${n.start}` : scope;
        for (const e of n.entries ?? []) {
            if (['id', 'textureKey', 'animationKey'].includes(e.key) && e.node.value !== undefined) {
                const group = `${e.key === 'id' ? nextScope : 'file'}:${e.key}:${e.node.value}`;
                if (!groups.has(group)) groups.set(group, []);
                groups.get(group).push(e.node.start);
            }
            walk(e.node, nextScope);
        }
        for (const child of [...(n.args ?? []), ...(n.items ?? []), ...(n.inner ? [n.inner] : [])]) walk(child, nextScope);
    }
    for (const d of model.declarations.filter(d => !d.template && !d.typeDefinition)) walk(d.node, `declaration:${d.name}`);
    for (const starts of groups.values()) if (starts.length > 1) for (const start of starts) duplicates.add(start);
    return duplicates;
}
// Keep existing node identities so all mounted input handlers retain valid offsets.
export function updateLiteralModel(model, target, source, value, sourceHash) {
    const start = target.start, end = target.end, delta = source.length - (end - start);
    model.source = model.source.slice(0, start) + source + model.source.slice(end);
    const visited = new Set();
    function span(object) {
        if (object.start >= end) object.start += delta;
        if (object.end >= end) object.end += delta;
    }
    function walk(n) {
        if (!n || visited.has(n)) return;
        visited.add(n);
        if (n.start === start && n.end === end) n.value = value;
        span(n);
        if (n.ensureOwner >= end) n.ensureOwner += delta;
        if (n.definition?.file === model.file) span(n.definition);
        n.source = model.source.slice(n.start, n.end);
        for (const e of n.entries ?? []) { span(e); walk(e.node); }
        for (const child of [...(n.args ?? []), ...(n.items ?? []), ...(n.inner ? [n.inner] : [])]) walk(child);
    }
    model.declarations.forEach(d => walk(d.node));
    for (const issue of model.issues ?? []) if (issue.start >= end) issue.start += delta;
    model.sourceHash = sourceHash;
}
