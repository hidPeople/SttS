import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
const server=await createServer({server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'});
const {NovelPlayback,novelAutoDuration}=await server.ssrLoadModule('/src/models/novelPlayback.ts');
const {NOVEL_CONTROLS}=await server.ssrLoadModule('/src/data/conversations.ts');
await server.close();
test('auto timing weights Japanese characters twice, including mixed text and excluding line breaks',()=>{
 assert.equal(novelAutoDuration(''),3000);
 assert.equal(novelAutoDuration('abc'),3090);
 assert.equal(novelAutoDuration('あいう'),3180);
 assert.equal(novelAutoDuration('HPが10回復。\n'),3360);
});
test('page clock restarts per page, excludes blocked time, and skip uses the Ctrl interval',()=>{
 const p=new NovelPlayback();p.page('abc');p.setMode('auto');assert.equal(p.update(0,true),false);
 assert.equal(p.update(3000,true),false);assert.equal(p.update(3090,true),true);
 p.page('あ');assert.equal(p.update(3090,true),false);assert.equal(p.update(6150,true),true);
 p.update(7000,false);assert.equal(p.update(50000,true),false);assert.equal(p.update(53060,true),true);
 p.setMode('off');assert.equal(p.update(90000,true),false);
 p.setMode('skip');assert.equal(p.update(90000,true),false);assert.equal(p.update(90000+NOVEL_CONTROLS.skip.intervalMs,true),true);
});
