import assert from 'node:assert/strict';
import handler from './api/technocore.ts';
import {readFileSync} from 'node:fs';
const originalFetch=globalThis.fetch;
let upstream;
globalThis.fetch=async (url,options)=>{upstream={url,options};return new Response(JSON.stringify({rooms:[{room:'lobby'}]}),{status:200,headers:{'Content-Type':'application/json'}});};
function response(){return {code:200,headers:{},data:null,setHeader(k,v){this.headers[k]=v;},status(n){this.code=n;return this;},json(data){this.data=data;return this;}};}
try {
 let res=response();await handler({method:'GET',url:'/api/technocore?path=rooms'},res);
 assert.equal(res.code,200);assert.equal(upstream.url,'https://technocore.chat/rooms?format=json');assert.equal(res.data.rooms[0].room,'lobby');
 res=response();await handler({method:'GET',url:'/api/technocore?path=r/lobby&since=12'},res);assert.equal(upstream.url,'https://technocore.chat/r/lobby?since=12&format=json');
 res=response();await handler({method:'POST',url:'/api/technocore?path=rooms'},res);assert.equal(res.code,405);
 res=response();await handler({method:'GET',url:'/api/technocore?path=r/../../private'},res);assert.equal(res.code,400);
 const config=JSON.parse(readFileSync('vercel.json','utf8'));assert.ok(config.rewrites.some(r=>r.source==='/api/technocore/:path*'&&r.destination==='/api/technocore?path=:path*'));
 console.log('Public proxy: 7 routing and read-only assertions passed.');
}finally{globalThis.fetch=originalFetch;}
