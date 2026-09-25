import ts from 'typescript';
import path from 'node:path';

// Read a deliberately small expression subset. Never execute game or draft code in the editor.
function value(node, bindings) {
    if (!node) return undefined;
    if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isTypeAssertionExpression(node)) return value(node.expression, bindings);
    if (ts.isNumericLiteral(node)) return Number(node.text);
    if (ts.isStringLiteralLike(node)) return node.text;
    if (ts.isIdentifier(node)) return bindings[node.text];
    if (ts.isPropertyAccessExpression(node)) return value(node.expression, bindings)?.[node.name.text];
    if (ts.isPrefixUnaryExpression(node)) return node.operator === ts.SyntaxKind.MinusToken ? -value(node.operand, bindings) : undefined;
    if (ts.isBinaryExpression(node)) {
        const a=value(node.left,bindings),b=value(node.right,bindings);
        if (typeof a!=='number'||typeof b!=='number') return undefined;
        switch(node.operatorToken.kind) {
            case ts.SyntaxKind.PlusToken:return a+b;
            case ts.SyntaxKind.MinusToken:return a-b;
            case ts.SyntaxKind.AsteriskToken:return a*b;
            case ts.SyntaxKind.SlashToken:return a/b;
        }
    }
    if (ts.isObjectLiteralExpression(node)) return Object.fromEntries(node.properties.filter(ts.isPropertyAssignment).map(p=>[p.name.text,value(p.initializer,bindings)]));
}
function variables(scope, inherited={}) {
    const result={...inherited};
    for (const statement of scope.statements ?? []) if(ts.isVariableStatement(statement))
        for(const d of statement.declarationList.declarations) result[d.name.text]=value(d.initializer,result);
    return result;
}
function find(scope,predicate) {
    let result;
    function visit(node) { if(result) return; if(predicate(node)) result=node; else ts.forEachChild(node,visit); }
    visit(scope); if(!result) throw Error('立ち絵プレビュー: 本体の配置処理が変わっています。tools/data-editor/portrait-preview-config.mjs の参照箇所を更新してください。');
    return result;
}
export function portraitPreviewConfig(program, root) {
    const source=file=>{const s=program.getSourceFile(path.join(root,file));if(!s)throw Error('配置の参照元がありません: '+file);return s;};
    let bindings={};
    for(const file of ['src/ui/layout.ts','src/data/ui.ts','src/data/player.ts','src/data/battlePresentation.ts','src/ui/cardPresentation.ts','src/ui/cardMotion.ts','src/scenes/BattleScene.ts'])
        bindings=variables(source(file),bindings);
    const scene=source('src/scenes/BattleScene.ts');
    const method=name=>find(scene,n=>ts.isMethodDeclaration(n)&&n.name.getText(scene)===name).body;
    const call=(name,expression)=>find(method(name),n=>ts.isCallExpression(n)&&n.expression.getText(scene)===expression);
    const args=(node,start=0,end=node.arguments.length)=>[...node.arguments].slice(start,end).map(n=>value(n,bindings));
    const log=variables(method('createBattleLogPanel'),bindings);
    const overlay=variables(method('ensureTurnOverlayTexture'),bindings);
    const [energyX,energyY,energyWidth,energyHeight]=args(find(method('createEnergyHud'),n=>ts.isNewExpression(n)&&n.expression.getText(scene)==='CrayonPatch'),1,5);
    const [hpX,hpY]=args(call('createHud','this.createHudBars'),0,2);
    const faintOffset=value(find(method('playerVisualY'),ts.isConditionalExpression).whenTrue,bindings);
    const handPose=find(source('src/ui/cardMotion.ts'),n=>ts.isFunctionDeclaration(n)&&n.name?.text==='handPose');
    const curve=value(find(handPose,n=>ts.isReturnStatement(n)).expression,{...bindings,offset:1});
    const clamp=find(handPose,n=>ts.isCallExpression(n));
    const bendRange=value(clamp.arguments[0].right,bindings);
    const config={
        width:bindings.SCREEN_WIDTH,height:bindings.SCREEN_HEIGHT,
        player:{x:bindings.PLAYER_VISUAL_X,y:bindings.PLAYER_VISUAL_Y,scale:bindings.PLAYER_VISUAL_SCALE,faintOffset},
        backgrounds:bindings.BATTLE_BACKGROUNDS,
        log:{x:log.x,y:log.y,width:log.width,height:log.height},
        overlay:{top:overlay.fadeTop,solidTop:overlay.solidTop},
        energy:{x:energyX-energyWidth/2,y:energyY-energyHeight/2,width:energyWidth,height:energyHeight},
        hp:{x:hpX,y:hpY,width:bindings.BAR_WIDTH,height:bindings.BAR_HEIGHT},
        epOffset: value(find(method('createHudBars'),n=>ts.isVariableDeclaration(n)&&n.name.getText(scene)==='epY').initializer,{...bindings,y:0}),
        statuses:bindings.PLAYER_STATUS_HUD_LAYOUT,relics:bindings.RELIC_HUD_LAYOUT,
        hand:{y:bindings.HAND_REST_Y,minX:bindings.HAND_MIN_X,maxX:bindings.HAND_MAX_X,centerX:bindings.HAND_CENTER_X,gap:bindings.HAND_CARD_GAP,width:bindings.CARD_WIDTH,height:bindings.CARD_HEIGHT,bendRange,bendY:curve.y-bindings.HAND_REST_Y,bendAngle:curve.angle},
    };
    function check(o,at='配置') { for(const [k,v] of Object.entries(o)) {
        if(v===undefined||typeof v==='number'&&!Number.isFinite(v)) throw Error(`立ち絵プレビュー: ${at}.${k} を本体ソースから取得できません。portrait-preview-config.mjsの対応を確認してください。`);
        if(v&&typeof v==='object') check(v,at+'.'+k);
    }}
    check(config);return config;
}
