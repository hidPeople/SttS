import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {writeAtomicJson} from '../scripts/user-settings-server.mjs';
const server=await createServer({optimizeDeps:{noDiscovery:true},server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'});
const {hostedJsonStorage}=await server.ssrLoadModule('/src/platform/hostedJsonStorage.ts');
const {hostedRunSaveStorage}=await server.ssrLoadModule('/src/platform/runSaveStorage.ts');
const {storageErrorMessage,storageOutcomeUnknown}=await server.ssrLoadModule('/src/models/storageErrors.ts');
await server.close();
const browser=()=>({async read(){return null;},async write(){},async remove(){}});
function host(protocol='test'){
 const h={contents:null,exists:true,token:'token',puts:[],responses:[]};
 h.fetch=async(_url,options={})=>{
  if(!options.method)return Response.json({protocol,contents:h.contents,exists:h.exists,token:h.token});
  h.puts.push(options);
  if(options.headers.Authorization!==`Bearer ${h.token}`)return Response.json({code:'SecurityError'},{status:403});
  h.contents=options.method==='DELETE'?null:options.body;
  const response=Response.json({protocol});h.responses.push(response);return response;
 };
 return h;
}

test('repeated manual/auto save transport never uses unload keepalive, consumes acknowledgements',async()=>{
 const h=host('stts.run-saves-file.v1');const storage=await hostedRunSaveStorage(browser(),h.fetch,true);
 for(let i=0;i<30;i++)await storage.write(JSON.stringify({version:4,slots:[{slot:i%2,data:'x'.repeat(27000)}]}));
 assert.equal(h.puts.length,30);assert.ok(h.puts.every(r=>r.keepalive===false));assert.ok(h.responses.every(r=>r.bodyUsed));
 assert.equal(JSON.parse(h.contents).slots[0].slot,1);
});
test('settings retry a rejected aggregate keepalive quota using an ordinary request',async()=>{
 const h=host();let rejected=0;
 const request=(url,o)=>{if(o?.keepalive){rejected++;throw new TypeError('Failed to fetch');}return h.fetch(url,o);};
 const storage=await hostedJsonStorage('/test','test',browser(),request,true,{keepalive:true});
 await storage.write('new');assert.equal(rejected,1);assert.equal(h.contents,'new');assert.equal(h.puts[0].keepalive,false);
});
test('lost acknowledgement is reconciled against committed host contents',async()=>{
 const h=host();const request=async(url,o)=>{const r=await h.fetch(url,o);if(o?.method)throw new TypeError('reply lost');return r;};
 const storage=await hostedJsonStorage('/test','test',browser(),request,true);
 await storage.write('committed');assert.equal(h.contents,'committed');await storage.remove();assert.equal(h.contents,null);
});
test('failed communication before commit preserves previous data and reports uncertainty',async()=>{
 const h=host();h.contents='previous';const request=(url,o)=>{if(o?.method)throw new TypeError('offline');return h.fetch(url,o);};
 const storage=await hostedJsonStorage('/test','test',browser(),request,true);
 await assert.rejects(storage.write('new'),error=>{assert.equal(error.code,'StorageNetworkError');assert.equal(storageOutcomeUnknown(error),true);assert.match(storageErrorMessage(error).ja,/通信/);return true;});
 assert.equal(h.contents,'previous');
});
test('token renewal, timeout and HTTP quota errors remain distinguishable',async()=>{
 const h=host();const storage=await hostedJsonStorage('/test','test',browser(),h.fetch,true);h.token='rotated';await storage.write('ok');assert.equal(h.contents,'ok');
 const quota=await hostedJsonStorage('/test','test',browser(),(url,o)=>o?.method?Promise.resolve(new Response('',{status:413})):h.fetch(url,o),true);
 await assert.rejects(quota.write('large'),{code:'QuotaExceededError'});
 const timeout=await hostedJsonStorage('/test','test',browser(),(url,o)=>o?.method?new Promise((_,reject)=>o.signal.addEventListener('abort',()=>reject(new DOMException('timeout','AbortError')))):h.fetch(url,o),true,{timeoutMs:5});
 await assert.rejects(timeout.write('new'),{code:'StorageTimeout'});assert.equal(h.contents,'ok');
});
function fakeDisk(errors){
 let content='old',temp,attempts=0,removed=0;const waits=[];
 const io={async mkdir(){},async open(){return{async writeFile(v){temp=v;},async sync(){},async close(){}};},async rename(){const code=errors[attempts++];if(code)throw Object.assign(new Error(code),{code});content=temp;},async rm(){removed++;}};
 return{io,waits,pause:async ms=>{waits.push(ms);},get content(){return content;},get attempts(){return attempts;},get removed(){return removed;}};
}
test('atomic replacement retries temporary Windows locks without deleting the previous save',async()=>{
 const d=fakeDisk(['EPERM','EBUSY']);await writeAtomicJson('C:/temporary-test/save.json','new',d.io,d.pause);
 assert.equal(d.content,'new');assert.equal(d.attempts,3);assert.equal(d.removed,1);assert.deepEqual(d.waits,[40,100]);
 const locked=fakeDisk(['EACCES','EACCES','EACCES','EACCES']);
 await assert.rejects(writeAtomicJson('C:/temporary-test/save.json','new',locked.io,locked.pause),{code:'EACCES'});
 assert.equal(locked.content,'old');assert.equal(locked.attempts,4);
 const full=fakeDisk(['ENOSPC']);await assert.rejects(writeAtomicJson('C:/temporary-test/save.json','new',full.io,full.pause),{code:'ENOSPC'});assert.equal(full.attempts,1);assert.equal(full.content,'old');
});
