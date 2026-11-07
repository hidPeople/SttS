import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
const server = await createServer({optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'});
const {BgmPlayer,battleBgm,conversationBgm} = await server.ssrLoadModule('/src/models/bgm.ts');
const {AUDIO_SETTINGS} = await server.ssrLoadModule('/src/data/bgm.ts');
const {WebBgmOutput} = await server.ssrLoadModule('/src/platform/bgmOutput.ts');
const {UserSettingsStore, normalizeUserSettings} = await server.ssrLoadModule('/src/models/userSettings.ts');
const {normalizeSave} = await server.ssrLoadModule('/src/models/saveCompatibility.ts');
const {createInitialRunState, resetRunState, advanceRunBattle, currentEncounterThreat} = await server.ssrLoadModule('/src/models/RunState.ts');
await server.close();

function harness() {
  const calls=[], output={
    async load(url,signal){calls.push(['load',url]);return url;},
    play(buffer,loop,offset){calls.push(['play',buffer,loop,offset]);return {stop(){calls.push(['stop',buffer]);},async fadeOut(seconds){calls.push(['fade',buffer,seconds]);}};},
    volume(v){calls.push(['volume',v]);},pause(v){calls.push(['pause',v]);},unlock(){},dispose(){},
  };
  const player=new BgmPlayer(output,{a:'a.mp3',b:'b.mp3',Unresolved:'title.mp3'}, {a:{loopStart:2},b:{loopStart:0}}, {...AUDIO_SETTINGS,retryDelayMs:0});
  return {player,output,calls};
}
test('same song keeps playing across scenes; explicit restart starts at zero; old track fades before new playback',async()=>{
  const {player,calls}=harness();await player.play('a');await player.play('a');
  assert.equal(calls.filter(c=>c[0]==='play').length,1);
  await player.play('b');assert.deepEqual(calls.filter(c=>['fade','play'].includes(c[0])).map(c=>c.slice(0,2)),[['play','a.mp3'],['fade','a.mp3'],['play','b.mp3']]);
  await player.play('b',true);assert.equal(calls.at(-1)[3],0);player.dispose();
});
test('rapid selections and stop never start obsolete loaded tracks',async()=>{
  const {player,output,calls}=harness(), requests=[];
  output.load=(url,signal)=>new Promise(resolve=>requests.push({url,signal,resolve}));
  const a=player.play('a'),b=player.play('b');assert.ok(requests[0].signal.aborted);
  requests[1].resolve('new');await b;requests[0].resolve('old');await a;
  assert.deepEqual(calls.filter(c=>c[0]==='play').map(c=>c[1]),['new']);
  const pending=player.play('a');await player.play(null);requests[2].resolve('late');await pending;
  assert.equal(player.state.status,'stopped');assert.equal(calls.filter(c=>c[0]==='play').length,1);player.dispose();
});
test('three retries after initial failure, then error; cancellation during retry does not report error',async()=>{
  const {player,output}=harness();let count=0;output.load=async()=>{count++;throw Error('offline');};
  await player.play('a');assert.equal(count,4);assert.equal(player.state.status,'error');
  output.load=async()=> 'buffer';await player.play('a');assert.equal(player.state.status,'playing');
  count=0;output.load=async()=>{count++;throw Error('offline');};
  const pending=player.play('b');await player.play(null);await pending;assert.equal(player.state.status,'stopped');assert.ok(count<=1);player.dispose();
});
test('Extra audition survives menu transitions including silence',async()=>{
  const {player,calls}=harness();player.audition('b');await new Promise(r=>setImmediate(r));player.enterMenu();await new Promise(r=>setImmediate(r));
  assert.equal(player.state.id,'b');assert.equal(calls.filter(c=>c[0]==='play').length,1);
  await player.play('a');player.enterMenu();await new Promise(r=>setImmediate(r));assert.equal(player.state.id,'b');
  player.audition(null);player.enterMenu();assert.equal(player.state.id,null);player.dispose();
});
test('volume zero mutes, level product scales; nonactive preference only pauses when enabled',()=>{
  const {player,calls}=harness();player.preferences({master:9,bgm:5,pauseOnBlur:true},true);
  assert.deepEqual(calls.slice(-2),[['volume',5/9],['pause',true]]);
  player.preferences({master:0,bgm:9,pauseOnBlur:false},true);assert.deepEqual(calls.slice(-2),[['volume',0],['pause',false]]);player.dispose();
});
test('old preferences migrate, audio levels round and clamp, setting notifications are event driven',async()=>{
  assert.deepEqual(normalizeUserSettings({}).audio,{master:7,bgm:5,pauseOnBlur:true});
  assert.deepEqual(normalizeUserSettings({audio:{master:20,bgm:-3,pauseOnBlur:false}}).audio,{master:9,bgm:0,pauseOnBlur:false});
  let raw=JSON.stringify({version:3,settings:{language:'en',conversation:{opacity:.3}}});
  const storage={async read(){return raw;},async write(v){raw=v;},async remove(){raw=null;}};
  const store=new UserSettingsStore();await store.initialize(storage);assert.equal(store.value.audio.bgm,5);assert.equal(store.value.language,'en');
  let notifications=0;const release=store.subscribe(()=>notifications++);
  store.update({audio:{master:8,bgm:2,pauseOnBlur:false}});store.update({audio:{master:8,bgm:2,pauseOnBlur:false}});assert.equal(notifications,1);
  await store.flush();const next=new UserSettingsStore();await next.initialize(storage);assert.equal(next.value.audio.bgm,2);
  await store.reset();assert.equal(notifications,2);release();
});
test('normal victories reach threat five and keep its battle track on later wins', t=>{
  resetRunState(); t.after(resetRunState);
  const songs = ['Wandering Melody1','夢中の小悪魔','Hollow Motif','Wobbly Woodpecker1','Wobbly Woodpecker2','Wobbly Woodpecker2'];
  songs.forEach((song, i) => {
    assert.equal(currentEncounterThreat(), Math.min(i + 1, 5));
    assert.equal(battleBgm(1, currentEncounterThreat()), song);
    advanceRunBattle();
  });
});
test('battle/event assignments and conversation keep/stop/override resolve deterministically',()=>{
  assert.equal(battleBgm(1,2),'夢中の小悪魔');assert.equal(battleBgm(1,5),'Wobbly Woodpecker2');
  assert.equal(battleBgm(1,5,'prologue'),'混濁の囁き');
  assert.equal(conversationBgm('prologueBeforeBattle',[{}, {bgm:'a'}, {}, {bgm:null}],0),'混濁の囁き');
  assert.equal(conversationBgm('prologueBeforeBattle',[{}, {bgm:'a'}, {}, {bgm:null}],2),'a');
  assert.equal(conversationBgm('prologueBeforeBattle',[{}, {bgm:'a'}, {}, {bgm:null}],3),null);
  assert.equal(conversationBgm('unregistered',[{}],0),undefined);
});
test('save normalization keeps song or silence, tolerates old and malformed song data',()=>{
  const base={slot:1,savedAt:'2026-11-06',floor:1,scene:'novel',run:createInitialRunState(),sceneState:{conversationId:'prologueBeforeBattle',pageIndex:0,completion:'battle'},preview:{kind:'novel'}};
  assert.equal(normalizeSave({...base,bgm:'a'}).save.bgm,'a');assert.equal(normalizeSave({...base,bgm:null}).save.bgm,null);
  assert.equal(normalizeSave(base).save.bgm,undefined);assert.equal(normalizeSave({...base,bgm:{offset:2}}).save.bgm,undefined);
});
test('Web output sets native loop boundaries, preserves a paused voice and frees buffers after fade',async t=>{
  const contexts=[];
  class Context {
    currentTime=0; sources=[]; gains=[]; destination={}; resumed=0; suspended=0;
    constructor(){contexts.push(this);}
    createGain(){const gain={gain:{value:1,setTargetAtTime(v){this.value=v;},cancelScheduledValues(){},setValueAtTime(v){this.value=v;},linearRampToValueAtTime(v){this.value=v;}},connect(){},disconnect(){this.disconnected=true;}};this.gains.push(gain);return gain;}
    createBufferSource(){const source={connect(){},disconnect(){this.disconnected=true;},start(when,offset){this.offset=offset;},stop(){this.stopped=true;}};this.sources.push(source);return source;}
    async decodeAudioData(){return {duration:10};}
    async resume(){this.resumed++;} async suspend(){this.suspended++;} async close(){this.closed=true;}
  }
  const prior=globalThis.AudioContext;globalThis.AudioContext=Context;t.after(()=>{if(prior)globalThis.AudioContext=prior;else delete globalThis.AudioContext;});
  const output=new WebBgmOutput();output.volume(0);output.pause(true);output.unlock();
  const voice=output.play({duration:10},{loopStart:2,loopEnd:9});const context=contexts[0],source=context.sources[0];
  assert.equal(context.gains[0].gain.value,0);assert.equal(source.loop,true);assert.equal(source.loopStart,2);assert.equal(source.loopEnd,9);assert.equal(source.offset,0);
  assert.equal(context.resumed,0);output.pause(false);assert.equal(context.resumed,1);assert.equal(context.sources.length,1);
  assert.throws(()=>output.play({duration:10},{loopStart:11}),/loop range/);
  await voice.fadeOut(0);assert.equal(source.stopped,true);assert.equal(source.buffer,null);assert.equal(source.disconnected,true);
  output.dispose();assert.equal(context.closed,true);
});
