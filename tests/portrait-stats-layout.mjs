import assert from 'node:assert/strict';
import { createServer } from 'vite';
import sharp from 'sharp';
import { existsSync } from 'node:fs';

// Check geometry against the actual registered battle poses, without rendering a game screen.
const vite = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, optimizeDeps: { noDiscovery: true }, appType: 'custom' });
try {
  const { planPortraitStats, leaderPoints, pairedOrigin, labelWidth, STAT_PARTS } = await vite.ssrLoadModule('/src/ui/portraitStatsLayout.ts');
  const { characterPortraitAssets, characterPortraitFiles } = await vite.ssrLoadModule('/src/models/portraitAssets.ts');
  const { DEFAULT_PORTRAIT_EP_POINTS } = await vite.ssrLoadModule('/src/data/characterPortraits.ts');
  const { PLAYER_PORTRAIT } = await vite.ssrLoadModule('/src/data/player.ts');
  const { PLAYER_STATUS_HUD_LAYOUT } = await vite.ssrLoadModule('/src/data/ui.ts');
  const y0 = PLAYER_STATUS_HUD_LAYOUT.y + PLAYER_STATUS_HUD_LAYOUT.iconSize / 2;
  const orient = (a,b,c) => Math.sign((b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x));
  const check = (origins, mode, name, coverage) => {
    const slots = planPortraitStats(origins, mode, coverage);
    const lines = slots.map((s,i) => leaderPoints(origins[i], s, labelWidth(mode)));
    for (const [i,s] of slots.entries()) {
      assert.ok(s.x >= 0 && s.x + labelWidth(mode) < 390);
      if (mode === 'adaptive' && i) assert.ok(s.y > slots[i-1].y);
      for (const path of lines.slice(0,i)) for (const j of [0,1]) for (const k of [0,1]) {
        const [a,b] = lines[i].slice(j), [c,d] = path.slice(k);
        assert.ok(!(orient(a,b,c)*orient(a,b,d)<0 && orient(c,d,a)*orient(c,d,b)<0), name+' / '+mode+' / '+STAT_PARTS[i]);
      }
    }
  };
  const shared = Array(5).fill({x:145,y:410});
  check(shared,'adaptive','shared point',x=>Number(x<200));
  const centered = STAT_PARTS.map((_, i) => ({ x: 190, y: 140 + 120*i }));
  const leftB = {x: 154, y: 255}, rightB = {x: 222, y: 262};
  const bIndex = STAT_PARTS.indexOf('B');
  centered[bIndex] = pairedOrigin(rightB, leftB);
  for (const faceLeft of [true, false]) {
    const slots = planPortraitStats(centered, 'adaptive', x => Number((x<150) === faceLeft));
    assert.ok(slots.every(slot => slot.left !== faceLeft), 'labels use the transparent side of each band');
    assert.equal(leaderPoints(centered[bIndex], slots[bIndex], labelWidth('adaptive'))[0], faceLeft ? rightB : leftB);
  }
  let count = 0;
  for (const file of characterPortraitFiles) {
    const pose = characterPortraitAssets[file.slice(0,-4)], source = 'image/character/'+file;
    if (!pose || !existsSync(source)) continue;
    const { data, info } = await sharp(source).resize(64,64,{fit:'fill'}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    const meta = await sharp(source).metadata();
    const scale = PLAYER_PORTRAIT.battleScale, h = pose.displayHeight*scale, w = h*meta.width/meta.height;
    const top = y0+(pose.offsetY??0)*scale, left = 145+(pose.offsetX??0)*scale-w/2;
    const coverage = (x,y,width,height) => {
      let sum=0,n=0;
      for(let py=y+3;py<y+height;py+=6) for(let px=x+3;px<x+width;px+=6) {
        const u=Math.floor((px-left)/w*64), v=Math.floor((py-top)/h*64);
        if(u>=0&&u<64&&v>=0&&v<64) sum+=data[(v*64+u)*info.channels+3];
        n++;
      }
      return sum/(n*255);
    };
    const origins=STAT_PARTS.map(part=>{
      const p=pose.epPoints;
      const world = point => ({x:left+w*point.x,y:top+h*point.y});
      if (part==='B' && p?.B1 && p.B2) return pairedOrigin(world(p.B1),world(p.B2));
      const point=part==='B' ? p?.B1??p?.B2??p?.B : p?.[part];
      return point?world(point):{x:290*DEFAULT_PORTRAIT_EP_POINTS[part].x,y:y0+(720-y0)*DEFAULT_PORTRAIT_EP_POINTS[part].y};
    });
    for(const mode of ['right','narrow','adaptive']) check(origins,mode,file,mode==='adaptive'?coverage:undefined);
    count++;
  }
  console.log('Checked '+count+' portrait images across three layouts.');
} finally { await vite.close(); }
