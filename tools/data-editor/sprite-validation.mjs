import { spriteValues, literal } from './public/sprite-values.js';

/** Inspect data literals without executing the game's configuration code. */
export function validateSpriteModels(models) {
    const issues = [], keys = new Map(), effectIds = new Set();
    const add = (model, node, message) => issues.push({ file: model.file, line: model.source.slice(0, node.start).split('\n').length, code: 'CONFIG', message });
    for (const model of models) {
        for (const decl of model.declarations.filter(d => ['ENEMY_SPRITES', 'EFFECT_SPRITES', 'UI_SPRITES'].includes(d.name))) {
            for (const entry of decl.node.entries ?? []) {
                if (!entry.key) continue;
                const v = spriteValues(entry.node, model), prefix = decl.name + '.' + entry.key;
                if (decl.name === 'EFFECT_SPRITES') effectIds.add(entry.key);
                for (const key of ['textureKey', 'animationKey']) {
                    if (typeof v[key] !== 'string' || !v[key].trim()) add(model, entry.node, prefix + '.' + key + ': 空欄または解析できない式です。文字列を指定してください。');
                    else {
                        const identity = key + ':' + v[key];
                        if (keys.has(identity)) add(model, entry.node, prefix + '.' + key + ': ' + keys.get(identity) + ' と重複しています。敵・演出・UI全体で一意にしてください。');
                        keys.set(identity, model.file + ':' + prefix);
                    }
                }
                for (const key of ['frameWidth', 'frameHeight', 'frameCount', 'frameRate', 'displayWidth', 'displayHeight']) {
                    if (!(Number.isFinite(v[key]) && v[key] > 0)) add(model, entry.node, prefix + '.' + key + ': 正の数値を指定してください。');
                    else if (['frameWidth', 'frameHeight', 'frameCount'].includes(key) && !Number.isInteger(v[key])) add(model, entry.node, prefix + '.' + key + ': 整数を指定してください。');
                }
                const repeat = v.repeat ?? 0;
                if (!Number.isInteger(repeat) || repeat < (decl.name === 'EFFECT_SPRITES' ? 0 : -1)) add(model, entry.node, prefix + '.repeat: 敵・UIは-1以上、終了する演出は0以上の整数を指定してください。');
                const b = v.opaqueBounds;
                if (b && (!Object.values(b).every(Number.isFinite) || b.left < 0 || b.top < 0 || b.right >= v.frameWidth || b.bottom >= v.frameHeight || b.left > b.right || b.top > b.bottom)) add(model, entry.node, prefix + '.opaqueBounds: 不透明範囲がフレーム外または逆転しています。');
            }
        }
    }
    for (const model of models) {
        const decl = model.declarations.find(d => d.name === 'DAMAGE_SPRITE_EFFECTS');
        for (const entry of decl?.node.entries ?? []) {
            const v = literal(entry.node), prefix = 'DAMAGE_SPRITE_EFFECTS.' + entry.key;
            if (!v) continue;
            if (!Array.isArray(v.spriteIds) || !v.spriteIds.length) add(model, entry.node, prefix + '.spriteIds: 素材候補を1件以上選択してください。');
            else for (const id of v.spriteIds) if (!effectIds.has(id)) add(model, entry.node, prefix + '.spriteIds: EFFECT_SPRITESに未登録の素材です: ' + id);
            const positive = (value, name) => { if (!(Number.isFinite(value) && value > 0)) add(model, entry.node, prefix + '.' + name + ': 正の数値を指定してください。'); };
            const nonnegative = (value, name) => { if (!(Number.isFinite(value) && value >= 0)) add(model, entry.node, prefix + '.' + name + ': 0以上の数値を指定してください。'); };
            if (v.count) {
                positive(v.count.amountPerSprite, 'count.amountPerSprite');
                if (!Number.isInteger(v.count.max) || v.count.max < 1) add(model, entry.node, prefix + '.count.max: 1以上の整数を指定してください。');
            }
            if (v.scatter) for (const key of ['x', 'y']) nonnegative(v.scatter[key], 'scatter.' + key);
            if (v.motion) for (const key of ['duration', 'distanceRatio', 'verticalRatio']) nonnegative(v.motion[key], 'motion.' + key);
            if (v.finish) { nonnegative(v.finish.duration, 'finish.duration'); positive(v.finish.scaleMultiplier, 'finish.scaleMultiplier'); }
            for (const [name, value] of [['alpha', v.alpha], ['finish.alpha', v.finish?.alpha]]) {
                if (!Number.isFinite(value) || value < 0 || value > 1) add(model, entry.node, prefix + '.' + name + ': 0〜1の数値を指定してください。');
            }
        }
    }
    return issues;
}
