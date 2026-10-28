import type { SignedRecord } from '../types/probe';
import { verifyTechnocoreSignature } from './technocoreCrypto';
export const validRoom = (name: string) => /^[a-z0-9][a-z0-9_-]{0,47}$/.test(name);
export function roomFromHash(hash: string) {
  const name=new URLSearchParams(hash.replace(/^#/, '')).get('room') ?? '';
  return validRoom(name)?name:'';
}
export function mergeObservedRecords(previous: SignedRecord[], next: SignedRecord[], limit=500) {
 const records=new Map<string,SignedRecord>();
 for(const r of [...previous,...next]) records.set(JSON.stringify([r.room,r.sequence,r.did,r.isoDate,r.message]),r);
 return [...records.values()].sort((a,b)=>b.timestamp-a.timestamp).slice(0,limit);
}
export async function readPublicRoom(room: string, signal: AbortSignal): Promise<SignedRecord[]> {
 if(!validRoom(room)) throw new Error('Invalid public room name.');
 const path=`/r/${encodeURIComponent(room)}?format=json`;
 const bounded=AbortSignal.any([signal,AbortSignal.timeout(10000)]);
 let data: unknown;
 for(const [index,url] of [`/api/technocore${path}`,`https://technocore.chat${path}`].entries()) {
  try {
   const response=await fetch(url,{headers:{Accept:'application/json'},signal:bounded});
   if(response.status===429) throw new Error('Rate limited. Wait before refreshing this room.');
   if(!response.ok) throw new Error(`Public source returned HTTP ${response.status}.`);
   data=await response.json();break;
  }catch(error){if(signal.aborted||bounded.aborted||index===1||(error instanceof Error&&error.message.startsWith('Rate limited')))throw error;}
 }
 if(!data||typeof data!=='object'||!('messages' in data)||!Array.isArray(data.messages)) throw new Error('Public source did not return a room message list.');
 return Promise.all(data.messages.slice(-50).filter((m):m is Record<string,unknown>=>!!m&&typeof m==='object'&&typeof m.text==='string'&&typeof m.ts==='string'&&Number.isFinite(Date.parse(m.ts))).map(async m=>{
  const did=typeof m.from==='string'?m.from:'';
  const signature=typeof m.sig==='string'?m.sig:null;
  const nonce=typeof m.nonce==='number'||typeof m.nonce==='string'?m.nonce:null;
  const result=await verifyTechnocoreSignature({room,did,signature,nonce,text:m.text as string});
  return {room,did,message:m.text as string,signature,verificationStatus:result.status,verificationReason:result.reason,timestamp:Date.parse(m.ts as string),isoDate:m.ts as string,sequence:typeof m.seq==='number'&&Number.isSafeInteger(m.seq)?m.seq:undefined};
 }));
}
