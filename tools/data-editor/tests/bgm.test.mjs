import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { analyze, programFor } from '../schema.mjs';
import { validateBgm, bgmFiles } from '../bgm-validation.mjs';
import { numericPolicy } from '../public/field-policy.js';
import { referenceFieldRule } from '../public/reference-fields.js';
const root=process.cwd(), file='src/data/bgm.ts', source=fs.readFileSync(file,'utf8');
const conversationFile='src/data/conversations.ts', conversationSource=fs.readFileSync(conversationFile,'utf8');
const validate=(text=source, conversations=conversationSource)=>{
 const program=programFor(root,{[file]:text,[conversationFile]:conversations});
 const model=analyze(program,root,file);
 return [...model.issues,...validateBgm(root,model,analyze(program,root,conversationFile),analyze(program,root,'src/data/eventBattles.ts'))];
};
test('BGM defaults, null stop, empty maps and auto-detected files are valid',()=>{
 assert.ok(bgmFiles(root).every(file=>!file.includes('/')&&!file.includes('_first')&&!file.includes('_Loop')));
 assert.deepEqual(validate(),[]);
 assert.deepEqual(validate(source.replace("title: 'Obsidian Veil'",'title: null'),conversationSource.replace("speaker: 'narration'", "speaker: 'narration', bgm: null")),[]);
});
test('invalid loops, unknown scene/asset IDs and audio settings are explained',()=>{
 const bad=source.replace("'Obsidian Veil': { loopStart: 20.980875 }","'Obsidian Veil': { loopStart: 20, loopEnd: 1 }")
  .replace("title: 'Obsidian Veil'","title: 'missing-song'").replace('prologueBeforeBattle:', 'missingConversation:').replace("prologue: 'Frayed Reverie'", "unknownEvent: 'Frayed Reverie'")
  .replace('defaultBgm: 5','defaultBgm: 90').replace('retryCount: 3','retryCount: -1');
 const issues=validate(bad);for(const text of ['loopEnd','missing-song','missingConversation','unknownEvent','defaultBgm','retryCount']) assert.ok(issues.some(i=>i.message.includes(text)),text);
});
test('audio fields have ranges and reference destinations',()=>{
 assert.deepEqual(referenceFieldRule('bgm','CONVERSATIONS'),['bgm','key']);
 assert.deepEqual(referenceFieldRule('1','BGM_BINDINGS'),['bgm','key']);
 assert.equal(numericPolicy('loopStart',{declaration:'BGM_TRACKS'}).step,.001);
 assert.equal(numericPolicy('defaultBgm',{declaration:'AUDIO_SETTINGS'}).max,9);
});
