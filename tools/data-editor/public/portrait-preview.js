// Coordinates match the game's top-centred portrait with an outer battle scale.
export function portraitGameRect(image, placement, config, fainted = false) {
    const scale=config.player.scale;
    const height=placement.displayHeight*scale;
    const width=height*image.naturalWidth/image.naturalHeight;
    const centerX=config.player.x+(placement.offsetX??0)*scale;
    return {x:centerX-width/2,y:config.player.y+(fainted?config.player.faintOffset:0)+(placement.offsetY??0)*scale,width,height};
}
export function handPreviewRects(config,count) {
    const h=config.hand,total=Math.min(Math.max(0,count-1)*h.gap,h.maxX-h.minX);
    return Array.from({length:count},(_,i)=>{
        const x=h.centerX-total/2+(count>1?i*total/(count-1):0);
        const offset=Math.max(-1,Math.min(1,(x-h.centerX)/h.bendRange));
        return {x,y:h.y+offset*offset*h.bendY,angle:offset*h.bendAngle,width:h.width,height:h.height};
    });
}
export function drawPortraitGame(ctx,image,placement,config,options={}) {
    const {width,height}=ctx.canvas;
    ctx.clearRect(0,0,width,height);
    ctx.fillStyle='#101720';ctx.fillRect(0,0,width,height);
    const zoom=Math.min(width/config.width,height/config.height);
    ctx.save();ctx.translate((width-config.width*zoom)/2,(height-config.height*zoom)/2);ctx.scale(zoom,zoom);
    ctx.beginPath();ctx.rect(0,0,config.width,config.height);ctx.clip();
    ctx.fillStyle='#394149';ctx.fillRect(0,0,config.width,config.height);
    if(options.background?.complete&&options.background.naturalWidth) ctx.drawImage(options.background,0,0,config.width,config.height);
    const rect=portraitGameRect(image,placement,config,options.fainted);
    ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
    if(image.complete&&image.naturalWidth&&Number.isFinite(rect.width)&&rect.height>0) ctx.drawImage(image,rect.x,rect.y,rect.width,rect.height);
    const label=(text,x,y,color='#f3f6fa')=>{ctx.fillStyle=color;ctx.font='20px sans-serif';ctx.fillText(text,x,y);};
    const panel=(r,color,text)=>{ctx.fillStyle=color;ctx.fillRect(r.x,r.y,r.width,r.height);if(text)label(text,r.x+10,r.y+26);};
    if(options.hud!==false) {
        const gradient=ctx.createLinearGradient(0,config.overlay.top,0,config.overlay.solidTop);
        gradient.addColorStop(0,'rgba(23,61,120,0)');gradient.addColorStop(1,'rgba(23,61,120,1)');
        ctx.fillStyle=gradient;ctx.fillRect(0,config.overlay.top,config.width,config.height-config.overlay.top);
        for(const [offset,color,text] of [[0,'#39b769','HP'],[config.epOffset,'#f28ac6','EP']]) {
            const hp=config.hp;panel({x:hp.x,y:hp.y+offset-hp.height/2,width:hp.width,height:hp.height},color);
            label(text,hp.x+hp.width/2-12,hp.y+offset+7,'#111');
        }
        for(const [row,count,name] of [[config.statuses,3,'状態'],[config.relics,3,'R']]) for(let i=0;i<count;i++) {
            panel({x:row.x+i*(row.iconSize+6)-row.iconSize/2,y:row.y-row.iconSize/2,width:row.iconSize,height:row.iconSize},'#725566');
            label(name,row.x+i*(row.iconSize+6)-14,row.y+7);
        }
        panel(config.energy,'rgba(24,34,48,.95)','ENERGY');
        panel(config.log,'rgba(13,18,24,.78)','ログ');
        ctx.strokeStyle='#40526a';ctx.lineWidth=2;ctx.strokeRect(config.log.x,config.log.y,config.log.width,config.log.height);
        for(const card of handPreviewRects(config,options.handCount??5)) {
            ctx.save();ctx.translate(card.x,card.y);ctx.rotate(card.angle*Math.PI/180);
            panel({x:-card.width/2,y:-card.height/2,width:card.width,height:card.height},'#28344a','カード');
            ctx.strokeStyle='#bc995a';ctx.strokeRect(-card.width/2,-card.height/2,card.width,card.height);ctx.restore();
        }
    }
    ctx.strokeStyle='#80ffbf';ctx.lineWidth=2;ctx.beginPath();
    const anchorY=config.player.y+(options.fainted?config.player.faintOffset:0);
    ctx.moveTo(config.player.x-10,anchorY);ctx.lineTo(config.player.x+10,anchorY);ctx.moveTo(config.player.x,anchorY-10);ctx.lineTo(config.player.x,anchorY+10);ctx.stroke();
    ctx.restore();return rect;
}
