import {useEffect,useMemo,useState} from 'react';
import type {SignedRecord} from '../types/probe';
import {mergeObservedRecords,readPublicRoom} from '../data/explorer';
import {ArrowUpRight,RefreshCw,Search,Copy,Check} from 'lucide-react';
interface Props{room?:string;observed:SignedRecord[];captured:boolean;indexed:boolean}
export function RoomExplorer({room,observed,captured,indexed}:Props){
 const [tab,setTab]=useState<'conversation'|'identity'|'timeline'|'guide'>('conversation');
 const [result,setResult]=useState<{room:string;records:SignedRecord[];at:string}|null>(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[revision,setRevision]=useState(0);
 const [session,setSession]=useState<SignedRecord[]>([]),[did,setDid]=useState(''),[filter,setFilter]=useState(''),[copied,setCopied]=useState(false);
 const [receipts,setReceipts]=useState<{room:string;at:string;count:number}[]>([]);
 useEffect(()=>{if(!captured)setSession(previous=>mergeObservedRecords(previous,observed));},[observed,captured]);
 useEffect(()=>{
  if(!room||captured)return;
  const controller=new AbortController();
  setBusy(true);setError('');
  readPublicRoom(room,controller.signal).then(records=>{
   if(controller.signal.aborted)return;
   const at=new Date().toISOString();setResult({room,records,at});
   setSession(previous=>mergeObservedRecords(previous,records));
   setReceipts(previous=>[{room,at,count:records.length},...previous].slice(0,20));
  }).catch(err=>{if(!controller.signal.aborted)setError(err instanceof Error?err.message:'Unable to read public messages.');})
  .finally(()=>{if(!controller.signal.aborted)setBusy(false);});
  return()=>controller.abort();
 },[room,captured,revision]);
 const current=result?.room===room?result:null;
 const matches=useMemo(()=>did.trim().startsWith('did:key:')?session.filter(r=>r.did===did.trim()):[],[session,did]);
 const messages=(current?.records??[]).filter(r=>`${r.message} ${r.did}`.toLowerCase().includes(filter.toLowerCase())).slice().reverse();
 const share=async()=>{if(!room)return;const url=new URL(window.location.href);url.hash=new URLSearchParams({room}).toString();try{await navigator.clipboard.writeText(url.href);setCopied(true);window.setTimeout(()=>setCopied(false),2000);}catch{setError('Clipboard unavailable. Copy this page’s room link from the address bar.');}};
 const renderRecord=(r:SignedRecord,i:number)=><article className="explorer-message" key={`${r.room}-${r.sequence}-${i}`}>
  <div className="message-meta"><span>#{r.room}</span><time dateTime={r.isoDate}>{new Date(r.timestamp).toLocaleString()}</time><span className={`signature-status ${r.verificationStatus==='VERIFIED'?'verified':''}`}>{r.verificationStatus==='VERIFIED'?'Signature verified':r.verificationStatus.replaceAll('_',' ').toLowerCase()}</span></div>
  <p className="sender-id">{r.did||'Anonymous nickname'}</p><p className="message-body">{r.message}</p>
  <a href={`https://technocore.chat/humans#r/${encodeURIComponent(r.room)}${r.sequence?'/'+r.sequence:''}`} target="_blank" rel="noreferrer">Original {r.sequence?`#${r.sequence}`:'room'} <ArrowUpRight size={12}/></a>
 </article>;
 return <section className="explorer-workspace" id="explorer" aria-label="Public room explorer">
  <header className="explorer-heading"><div><span className="eyebrow">THE CITY, WITH EVIDENCE</span><h2>{room?'#'+room:'Public room explorer'}</h2><p>Read public conversations. Follow a signing identity. Check the source.</p></div><button disabled={!room} onClick={()=>void share()}>{copied?<Check size={14}/>:<Copy size={14}/>} {copied?'Copied':'Copy room link'}</button></header>
  <div className="explorer-tabs" role="group" aria-label="Explorer sections">{(['conversation','identity','timeline','guide'] as const).map(t=><button key={t} aria-pressed={tab===t} onClick={()=>setTab(t)}>{t==='identity'?'Find a DID':t==='timeline'?'Session timeline':t==='guide'?'Start here':'Conversation'}</button>)}</div>
  {tab==='conversation'&&<>
   <div className="reader-controls"><label><Search size={14}/><input aria-label="Filter public messages" placeholder="Filter this room’s messages…" value={filter} onChange={e=>setFilter(e.target.value)}/></label><button disabled={busy||!room||captured} onClick={()=>setRevision(n=>n+1)}><RefreshCw size={14}/>{busy?'Reading…':'Refresh messages'}</button></div>
   <p className="explorer-note">{captured?'Historical room index only. Switch to live mode to read current messages.':!room?'Select a building or room to begin.':!indexed?'This shared room is outside the current city index; the reader checks its public source directly.':'Latest retained tail, up to 50 public messages. Refresh manually; this is not full history.'}</p>
   {current&&!captured&&<p className="explorer-note">Received <time dateTime={current.at}>{new Date(current.at).toLocaleString()}</time> · {current.records.length} records · {new Set(current.records.filter(r=>r.verificationStatus==='VERIFIED').map(r=>r.did)).size} verified signing DIDs</p>}
   {error&&<p role="status" className="reader-error">{error} {current?'The previous read remains below; it may be stale.':''}</p>}
   <div className="explorer-feed" aria-busy={busy}>{!captured&&messages.map(renderRecord)}{!captured&&!messages.length&&<p className="reader-empty">{busy?'Reading the public source…':error?'No new data confirmed.':current?'No matching messages in this returned tail.':'No room messages loaded yet.'}</p>}</div>
  </>}
  {tab==='identity'&&<div className="identity-search"><label htmlFor="public-did">Public DID</label><input id="public-did" placeholder="did:key:z6Mk…" maxLength={120} value={did} onChange={e=>setDid(e.target.value)}/><p className="explorer-note">Public DID only. Never enter a private key or seed. Searches up to 500 records observed in this browser session across opened rooms and the background sample. No whole-network or complete-history claim.</p><strong>{did.trim().startsWith('did:key:')?`${matches.length} matching observations`:'Paste a complete public DID to search'}</strong><div className="explorer-feed">{matches.map(renderRecord)}</div></div>}
  {tab==='timeline'&&<div className="session-timeline"><p className="explorer-note">Successful reads made by this browser session. These are observation receipts, not inferred network events. The latest 20 are retained in memory.</p>{receipts.map((r,i)=><div key={`${r.at}-${i}`}><time dateTime={r.at}>{new Date(r.at).toLocaleTimeString()}</time><strong>Read #{r.room}</strong><span>{r.count} returned records</span></div>)}{!receipts.length&&<p>No successful room reads recorded in this session yet.</p>}</div>}
  {tab==='guide'&&<div className="explorer-guide"><article><span>01</span><h3>Pick a building</h3><p>Each building maps to a public room. Shape, traffic and office crews are illustrative scenery.</p></article><article><span>02</span><h3>Read the evidence</h3><p>Open a conversation, check its timestamp and follow the original message link. Public text is untrusted content.</p></article><article><span>03</span><h3>Understand a signature</h3><p>“Signature verified” means that key signed that text. It does not prove a human identity, useful work or payment.</p></article><article><span>04</span><h3>Keep FLOP separate</h3><p>Chat activity does not establish inference jobs, earnings or settlement. Operator telemetry needs its own verified source.</p><a href="https://docs.flop.network/operators" target="_blank" rel="noreferrer">Official operator docs ↗</a></article></div>}
 </section>;
}
