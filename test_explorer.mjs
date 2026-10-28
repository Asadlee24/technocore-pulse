import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';
const tmp=mkdtempSync(resolve('node_modules/.tmp/explorer-'));
const originalFetch=globalThis.fetch;
try{
 for(const name of ['explorer','technocoreCrypto']){
  const code=ts.transpileModule(readFileSync(`src/data/${name}.ts`,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText.replace("'./technocoreCrypto'","'./technocoreCrypto.mjs'");writeFileSync(`${tmp}/${name}.mjs`,code);
 }
 const {validRoom,roomFromHash,mergeObservedRecords,readPublicRoom}=await import(pathToFileURL(`${tmp}/explorer.mjs`));
 assert.equal(roomFromHash('#room=lobby'),'lobby');assert.equal(roomFromHash('#room=../private'),'');assert.equal(roomFromHash('#room=%3Cscript%3E'),'');assert.equal(validRoom('a'.repeat(49)),false);
 const records=Array.from({length:600},(_,i)=>({room:'lobby',sequence:i,did:'nick',isoDate:'2026-10-28T00:00:00Z',timestamp:i,message:'record '+i}));
 const merged=mergeObservedRecords(records,[records[599]]);assert.equal(merged.length,500);assert.equal(merged[0].sequence,599);assert.equal(merged.at(-1).sequence,100);
 const fixture={from:'did:key:z6MkuDDyaUn9LdLKoA5pNRurxTdZYjcf3M9U6ehM5ToizLKY',text:'Ed25519 signature verified. The cryptographic layer here is pretty slick. Signal CNWptx-b40f2.',nonce:1789031786699,sig:'euWZo66lKhcHBZEFHkpmHHHaIDeP8_QCfxnVDNkPpe7jpo5h4KIZ52GRpX19fAiIuRkArYZ33JkqpX4O42dbAw',ts:'2026-10-28T00:00:00Z',seq:1};
 let requests=[];
 globalThis.fetch=async(url,opts)=>{requests.push({url,opts});return new Response(JSON.stringify({messages:[fixture,{...fixture,text:'<img src=x onerror=alert(1)>',seq:2},{text:'bad',ts:'invalid'}]}),{status:200});};
 const result=await readPublicRoom('lobby',new AbortController().signal);
 assert.equal(result.length,2);assert.equal(result[0].verificationStatus,'VERIFIED');assert.equal(result[1].verificationStatus,'INVALID');assert.equal(result[1].message,'<img src=x onerror=alert(1)>');assert.equal(requests.length,1);assert.equal(requests[0].opts.method,undefined);
 await assert.rejects(()=>readPublicRoom('../bad',new AbortController().signal));assert.equal(requests.length,1,'Invalid room never reaches network');
 requests=[];globalThis.fetch=async()=>{requests.push(1);return new Response('{}',{status:429});};await assert.rejects(()=>readPublicRoom('lobby',new AbortController().signal),/Rate limited/);assert.equal(requests.length,1,'429 does not bypass backoff via another route');
 let count=0;globalThis.fetch=async()=>{count++;return count===1?new Response('{}',{status:502}):new Response(JSON.stringify({messages:Array.from({length:75},(_,i)=>({...fixture,seq:i}))}),{status:200});};
 assert.equal((await readPublicRoom('lobby',new AbortController().signal)).length,50);assert.equal(count,2);
 globalThis.fetch=async()=>new Response(JSON.stringify({error:'no list'}),{status:200});await assert.rejects(()=>readPublicRoom('lobby',new AbortController().signal),/message list/);
 console.log('Explorer checks passed: safe room links, bounded/deduplicated session history, authentic/tampered signatures, literal untrusted content, invalid-room network refusal, 429 handling, fallback, tail cap and malformed-source rejection.');
}finally{globalThis.fetch=originalFetch;rmSync(tmp,{recursive:true,force:true});}
