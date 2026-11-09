/** [EXP-SQL01] Why: an embedded JS worker boots from both tsx source and built ESM without a TS loader.
 * Rejected: source-path workers (break packed consumers and test subprocesses). Mechanism: R25 sections 5-7.
 */
import { rowCodec } from "./row-codec.js";

export const sqliteWorker = String.raw`
${rowCodec}
const { parentPort, workerData } = require('node:worker_threads');
const fs = require('node:fs');
const path = require('node:path');
const D = require(workerData.driver);
const { file, role, seed, gateBuffer } = workerData;
const gate = new Int32Array(gateBuffer);
let db, lock, fatal, timer, passiveTimer;
const checkpointEvents=[], checkpointCounts={};
const checkpointStatus=()=>({counts:{...checkpointCounts},events:[...checkpointEvents]});
const recordCheckpoint=(mode,outcome,start,result={})=>{
 checkpointCounts[outcome]=(checkpointCounts[outcome]??0)+1;
 checkpointEvents.push({at:Date.now(),mode,outcome,ms:performance.now()-start,...result});
 if(checkpointEvents.length>128)checkpointEvents.shift();
};
const statements = new Map();
const q = sql => { let s=statements.get(sql); if(!s) statements.set(sql,s=db.prepare(sql)); return s; };
const publicMarker = m => ({lsn:m.lsn,epoch:m.epoch,h:m.h,position:m.position,crc:m.crc,size:m.size});
const marker = () => q('SELECT lsn,epoch,h,position,crc,size,base_lsn,base_crc,base_end FROM marker WHERE id=1').get();
const durablePragmas = d => {
 d.pragma('synchronous=FULL'); d.pragma('fullfsync=ON'); d.pragma('checkpoint_fullfsync=ON');
 d.pragma('wal_autocheckpoint=0'); d.pragma('journal_size_limit=16777216');
};
const crc32 = (b, seed=0) => { let c=(seed ^ 0xffffffff)>>>0; for(const v of b){c ^= v;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0x82f63b78:0);}return (c ^ 0xffffffff)>>>0; };
const ackPath = path.join(path.dirname(file),'ACKED');
const ackRead = () => {
 if(!fs.existsSync(ackPath)) return;
 const b=fs.readFileSync(ackPath); if(b.length!==32 || crc32(b.subarray(0,28))!==b.readUInt32LE(28)) throw Error('ACKED sidecar corrupt; refusing to start');
 const lsn=Number(b.readBigUInt64LE(0)), crc=b.readUInt32LE(24);
 const f=q('SELECT crc FROM frames WHERE lsn=?').get(lsn);
 if(!f || f.crc!==crc || marker().lsn<lsn) throw Error('ACKED names a lost acknowledged frame; refusing to start');
};
const calibrate = () => {
 const f=path.join(path.dirname(file),'.sqlite-calibration-'+role), d=new D(f);
 durablePragmas(d); d.exec('CREATE TABLE IF NOT EXISTS calibration(n);');
 const times=[]; for(let i=0;i<12;i++){const t=performance.now();d.exec('INSERT INTO calibration VALUES(1)');times.push(performance.now()-t);} d.close();
 fs.rmSync(f,{force:true}); times.sort((a,b)=>a-b); return times[6];
};
let calibrationMs=0;
try {
 if(role==='writer') {
  lock=new D(path.join(path.dirname(file),'broker.lock'),{timeout:0}); durablePragmas(lock);
  lock.pragma('locking_mode=EXCLUSIVE'); lock.exec('BEGIN EXCLUSIVE; COMMIT');
 }
 db=new D(file,{readonly:role==='reader',fileMustExist:role!=='writer',timeout:5000});
 const version=db.prepare('SELECT sqlite_version() v').get().v.split('.').map(Number);
 if(version[0]<3 || (version[0]===3 && (version[1]<51 || (version[1]===51 && version[2]<3)))) throw Error('SQLite >= 3.51.3 required');
 db.pragma('fullfsync=ON'); db.pragma('checkpoint_fullfsync=ON');
 if(role==='reader')db.pragma('mmap_size=268435456');
 if(role!=='reader') {
  durablePragmas(db); db.pragma('journal_mode=WAL');
  calibrationMs=calibrate();
  if(workerData.requireFullFsync && process.platform==='darwin' && calibrationMs<1) throw Error('F_FULLFSYNC calibration below 1 ms');
 }
 if(role==='writer') {
  // [EXP-HS01] Why: v1 has different semantics; reject rather than silently adopt or migrate. Rejected: CREATE IF NOT EXISTS over legacy tables.
  if(q("SELECT 1 FROM sqlite_master WHERE name='live_rows'").get())throw Error('Legacy broker layout v1 requires explicit migration');
  if(q("SELECT 1 FROM sqlite_master WHERE name='facts'").get()&&!q('PRAGMA table_info(facts)').all().some(c=>c.name==='o'))throw Error('Broker layout v2 without owner key requires explicit migration');
  db.exec('CREATE TABLE IF NOT EXISTS frames(lsn INTEGER PRIMARY KEY,epoch INT NOT NULL,kind INT NOT NULL,offset INT NOT NULL,end INT NOT NULL,prev_crc INT NOT NULL,crc INT NOT NULL,payload BLOB NOT NULL,committed_at INT NOT NULL);'+
  'CREATE INDEX IF NOT EXISTS frames_commits ON frames(lsn) WHERE kind=1;'+
  'CREATE TABLE IF NOT EXISTS marker(id INTEGER PRIMARY KEY CHECK(id=1),lsn INT NOT NULL,epoch INT NOT NULL,h INT NOT NULL,position INT NOT NULL,crc INT NOT NULL,size INT NOT NULL,base_lsn INT NOT NULL,base_crc INT NOT NULL,base_end INT NOT NULL);'+
  'CREATE TABLE IF NOT EXISTS heads(subject TEXT PRIMARY KEY,pos INT NOT NULL) WITHOUT ROWID;'+
  'CREATE TABLE IF NOT EXISTS claims(command TEXT PRIMARY KEY,txId TEXT NOT NULL,position INT NOT NULL) WITHOUT ROWID;'+
  'CREATE TABLE IF NOT EXISTS operations(op TEXT PRIMARY KEY,receipt TEXT NOT NULL) WITHOUT ROWID;'+
  'CREATE TABLE IF NOT EXISTS ents(eid INTEGER PRIMARY KEY,name TEXT NOT NULL UNIQUE);'+
  'CREATE TABLE IF NOT EXISTS attrs(aid INTEGER PRIMARY KEY,name TEXT NOT NULL UNIQUE);'+
  'CREATE TABLE IF NOT EXISTS strs(sid INTEGER PRIMARY KEY,s TEXT NOT NULL UNIQUE);'+
  'CREATE TABLE IF NOT EXISTS txs(pos INTEGER PRIMARY KEY,tx INT NOT NULL,at INT NOT NULL);'+
  ['facts','history','journal'].map(t=>'CREATE TABLE IF NOT EXISTS '+t+'(o INT NOT NULL,e INT NOT NULL,'+(t==='history'?'rpos INT NOT NULL,':'')+'id BLOB NOT NULL,a INT NOT NULL,pos INT NOT NULL,t INT NOT NULL,v,vf INT,vto INT,c INT,y INT,sv INT,x BLOB,PRIMARY KEY(o,e,'+(t==='history'?'rpos,':'')+'id)) WITHOUT ROWID;CREATE '+(t==='history'?'':'UNIQUE ')+'INDEX IF NOT EXISTS '+t+'_id ON '+t+'(id);').join('')+
  'CREATE TABLE IF NOT EXISTS retention(holder TEXT PRIMARY KEY,lsn INT NOT NULL,expires INT) WITHOUT ROWID;'+
  'CREATE TABLE IF NOT EXISTS epochs(epoch INTEGER PRIMARY KEY,begin_lsn INT NOT NULL,previous_epoch INT NOT NULL,aborted TEXT NOT NULL);'+
  'CREATE TABLE IF NOT EXISTS pins(token TEXT PRIMARY KEY,basis INT NOT NULL,owner TEXT NOT NULL) WITHOUT ROWID;');
  q('INSERT OR IGNORE INTO marker VALUES(1,0,0,0,0,?,32,0,?,32)').run(seed,seed);
  // [EXP-SQL01] Why: sync WAL frames adopted by recovery before any reader exists (R25 1.3).
  db.pragma('wal_checkpoint(PASSIVE)'); ackRead();
  db.exec('DELETE FROM pins');
 }
 if(role==='checkpointer') {
  // [EXP-SQL01] Why: even a separate RESTART connection can hold the writer lock while waiting on a reader.
  // Rejected: a 100 ms busy handler on either ACK or checkpoint connection (reader-dependent commit delay).
  db.pragma('busy_timeout=0');
  timer=setInterval(()=>{if(Atomics.exchange(gate,2,0))checkpoint(true);},100);
  passiveTimer=setInterval(()=>checkpoint(walLarge()),4000);
 }
} catch(e) { fatal=String(e); }
const frames = (from,upto,maxBytes,maxFrames=Number.MAX_SAFE_INTEGER) => {
 const m=marker();if(from.nextLsn<=m.base_lsn)throw Error('FEED_RETENTION_EXPIRED:'+JSON.stringify({requested:from.nextLsn-1,retainedFrom:m.base_lsn}));
 let bytes=0,out=[],prev=from.seed,next=from.nextLsn,offset=from.offset;
 for(const f of q('SELECT * FROM frames WHERE lsn>=? AND lsn<=? ORDER BY lsn').iterate(next,upto)) {
  if(out.length>=maxFrames || (out.length && bytes+f.end-f.offset>maxBytes))break;
  if(f.prev_crc!==prev || f.lsn!==next || f.offset!==offset)throw Error('Feed chain/cursor mismatch');
  // Frame CRC is independently checked in HostLog.open and readFramesFrom using encodeFrame.
  out.push(f);prev=f.crc;next=f.lsn+1;offset=f.end;bytes+=f.end-f.offset;
 }
 return {frames:out,next:{offset,seed:prev,nextLsn:next}};
};
const walLarge = () => fs.existsSync(file+'-wal') && fs.statSync(file+'-wal').size>64*1024*1024;
const checkpoint = restart => {
 const start=performance.now(), mode=restart?'RESTART':'PASSIVE';
 try {
  if(restart) {
   Atomics.store(gate,0,1);
   // [EXP-SQL01] Why: wait only on this maintenance thread, before acquiring SQLite locks.
   // Rejected: calling RESTART with active readers (can wait holding the writer lock, R25 finding 6).
   const deadline=performance.now()+20;
   while(Atomics.load(gate,1)>0 && performance.now()<deadline)Atomics.wait(gate,1,Atomics.load(gate,1),1);
   if(Atomics.load(gate,1)>0){recordCheckpoint(mode,'readers-busy',start);return checkpointStatus();}
  }
  const passive=db.pragma('wal_checkpoint(PASSIVE)')[0];
  if(passive.busy || passive.log!==passive.checkpointed) {
   recordCheckpoint(mode,'incomplete',start,passive);return checkpointStatus();
  }
  const result=restart?db.pragma('wal_checkpoint(RESTART)')[0]:passive;
  recordCheckpoint(mode,result.busy?'busy':'complete',start,result);
 }catch(e){recordCheckpoint(mode,'error',start,{error:String(e)});}
 finally{if(restart){Atomics.store(gate,0,0);Atomics.notify(gate,0);}}
 return checkpointStatus();
};
// [EXP-HS01] Why: dictionary names may contain lone surrogates; BLOB preserves those exact UTF-16 strings.
// Rejected: SQLite TEXT replacement of invalid UTF-8 (aliases distinct names).
const textKey=s=>Buffer.from(s,'utf8').toString('utf8')===s?s:Buffer.from(JSON.stringify(s));
const dictCol=t=>t==='strs'?'s':'name';
const dictId=t=>t==='ents'?'eid':t==='attrs'?'aid':'sid';
// [EXP-QH1] Why: owner is only a clustering hint; misses are fetched by exact entity. Rejected: assuming naming implies reachability (R46 3.5).
const owner=s=>s.split('/')[0];
const names=new Map(), writerIds=new Map();
const name=(t,id)=>{const key=t+':'+id;if(names.has(key))return names.get(key);let v=q('SELECT '+dictCol(t)+' v FROM '+t+' WHERE '+dictId(t)+'=?').get(id)?.v;if(Buffer.isBuffer(v))v=JSON.parse(v.toString());if(v===undefined)throw Error('Missing dictionary entry');names.set(key,v);return v;};
const storedRow=id=>{for(const t of ['facts','history','journal']){const s=q('SELECT * FROM '+t+' WHERE id=?').get(packId(id));if(s)return decodeRow(s,readCodec);}return undefined;};
const readCodec={name,tx:pos=>q('SELECT tx,at FROM txs WHERE pos=?').get(pos),row:storedRow};
db?.function('qh_fallback',id=>verbatim(storedRow(unpackId(id))).toString());
const prepare=a=>{
 const additions=[],local=new Map(),pendingNames=new Map(),next={},transactions=new Map(),inputRows=new Map();
 for(const t of ['ents','attrs','strs'])next[t]=q('SELECT coalesce(max('+dictId(t)+'),0)+1 n FROM '+t).get().n;
 const intern=(t,v)=>{const key=t+':'+JSON.stringify(v);if(local.has(key))return local.get(key);if(writerIds.has(key))return writerIds.get(key);const old=q('SELECT '+dictId(t)+' id FROM '+t+' WHERE '+dictCol(t)+'=?').get(textKey(v));const id=old?.id??next[t]++;local.set(key,id);pendingNames.set(t+':'+id,v);if(!old)additions.push([t,id,v]);return id;};
 for(const member of a.members)for(const r of member.rows){inputRows.set(r.id,r);if(!transactions.has(r.recorded_position)&&!readCodec.tx(r.recorded_position))transactions.set(r.recorded_position,{tx:intern('ents',r.tx_id??''),at:r.recorded_at});if(r.retracted_position!=null&&!transactions.has(r.retracted_position)&&!readCodec.tx(r.retracted_position))transactions.set(r.retracted_position,{tx:intern('ents',r.retract_tx_id??''),at:r.retracted_at});}
 const c={intern,name:(t,id)=>pendingNames.get(t+':'+id)??name(t,id),tx:pos=>transactions.get(pos)??readCodec.tx(pos),row:id=>inputRows.get(id)??storedRow(id)};
 return {additions,transactions,rows:a.members.map(member=>member.rows.map(r=>({r,s:{...encodeRow(r,c),o:intern('ents',owner(r.entity_id))}})))};
};
const append = a => {
 try {
 const prepared=prepare(a);
 // [EXP-SQL01] Why: acquire the writer lock before the marker read; maintenance may concurrently RESTART.
 // Rejected: deferred read-to-write upgrade (SQLITE_BUSY can bypass busy_timeout and fail-stop commits).
 const result=db.transaction(()=>{
  const m=marker(); if(a.lsn!==m.lsn+1 || a.prev!==m.crc)throw Error('Append chain mismatch');
  q('INSERT INTO frames VALUES(?,?,?,?,?,?,?,?,?)').run(a.lsn,a.epoch,a.kind,m.size,m.size+a.length,a.prev,a.crc,Buffer.from(a.payload),Date.now());
  if(a.kind===2){const e=JSON.parse(Buffer.from(a.payload).toString());q('INSERT INTO epochs VALUES(?,?,?,?)').run(e.epoch,a.lsn,e.previousEpoch,JSON.stringify(e.abortedLsns));}
  for(const [t,id,v]of prepared.additions)q('INSERT OR IGNORE INTO '+t+' VALUES(?,?)').run(id,textKey(v));
  for(const [pos,tx]of prepared.transactions)q('INSERT OR IGNORE INTO txs VALUES(?,?,?)').run(pos,tx.tx,tx.at);
  let position=m.position,mi=0;
  for(const member of a.members) {
   const last=member.positions[member.positions.length-1];position=Math.max(position,last);
   q('INSERT INTO operations VALUES(?,?)').run(member.operationId,JSON.stringify({lsn:a.lsn,epoch:a.epoch,positions:member.positions}));
   // [EXP-HS01] Why: a nested claim resolves its own transaction ordinal (P5B R2). Rejected: the member's last ordinal.
   for(const c of member.claims){const own=member.rows.find(r=>r.tx_id===c.txId);q('INSERT INTO claims VALUES(?,?,?)').run(c.commandId,c.txId,own?.recorded_position??last);}
   for(const s of member.subjects)q('INSERT INTO heads VALUES(?,?) ON CONFLICT(subject) DO UPDATE SET pos=excluded.pos').run(s,last);
   for(const {r,s} of prepared.rows[mi++]) {
    const retired=r.retracted_position!=null,t=retired?'history':isJournalRow(r)?'journal':'facts';
    // [EXP-HS01] Why: preserve one latest version per id, including journal retirements. Rejected: a second recent_rows copy.
    for(const other of ['facts','history','journal'])q('DELETE FROM '+other+' WHERE id=?').run(s.id);
    const keys=['o','e',...(retired?['rpos']:[]),'id','a','pos','t','v','vf','vto','c','y','sv','x'];
    q('INSERT INTO '+t+'('+keys.join(',')+') VALUES('+keys.map(()=>'?').join(',')+')').run(...keys.map(k=>s[k]));
   }
  }
  q('UPDATE marker SET lsn=?,epoch=?,position=?,crc=?,size=? WHERE id=1').run(a.lsn,a.epoch,position,a.crc,m.size+a.length);
  return {lsn:a.lsn,epoch:a.epoch,kind:a.kind,offset:m.size,end:m.size+a.length,crc:a.crc,payload:Buffer.from(a.payload)};
 }).immediate();
 // [EXP-HS01] Why: publish writer dictionary cache only after SQLite commits. Rejected: keeping provisional ids from failed transactions.
 for(const [t,id,v]of prepared.additions)writerIds.set(t+':'+JSON.stringify(v),id);
 // [EXP-SQL01] Why: ACK only signals maintenance; it never waits for readers or runs a checkpoint.
 // Rejected: synchronous gateCheckpoint after commit (the pinned-reader regression adds 100 ms).
 if(a.lsn%25===0 && walLarge())Atomics.store(gate,2,1);return result;
 }catch(e){fatal='Write failed; fail-stop: '+String(e);throw e;}
};
const rows = (table,selection,extra='',args=[]) => {
 const where=[], vals=[];
 if(selection.id!==undefined){where.push('id=?');vals.push(packId(selection.id));}
 if(selection.entities!==undefined){if(!selection.entities.length)return [];where.push('o IN (SELECT eid FROM ents WHERE name IN ('+selection.entities.map(()=>'?').join(',')+')) AND e IN (SELECT eid FROM ents WHERE name IN ('+selection.entities.map(()=>'?').join(',')+'))');vals.push(...selection.entities.map(e=>textKey(owner(e))),...selection.entities.map(textKey));}
 if(extra){where.push(extra);vals.push(...args);}
 return q('SELECT * FROM '+table+(where.length?' WHERE '+where.join(' AND '):'')).all(...vals).map(r=>decodeRow(r,readCodec));
};
const pull = a => {
 // [CX-INT-Q] Why: Q89b covers H1 itself, including direct worker requests.
 // Rejected: an eligible:false empty answer (Q89c requires typed refusal at the RPC boundary).
 if(a.recordedAt!==undefined)throw Error('H1_RECORD_TIME_UNSUPPORTED');
 const m=marker(), b=a.basis;
 if(!Number.isSafeInteger(b)||b<0)throw Error('Invalid basis');
 if(b<m.h || b>m.lsn*1024+1023)return {snapshot:publicMarker(m),basis:b,eligible:false,rows:[]};
 const out=rows('facts',a.selection,'pos<=?',[b]).concat(rows('journal',a.selection,'pos<=?',[b]),rows('history',a.selection,'rpos>? AND pos<=?',[b,b]));
 return {snapshot:publicMarker(m),basis:b,eligible:true,rows:out};
};
// [EXP-QH1] Why: one transaction owns the whole reach; SQL emits tuple text, REAL lexemes stay exact.
// Rejected: per-hop RPC and json_array(REAL) (R46/Q105b: silent rounding).
// [EXP-QH1-R3] Why: R46 shape. One statement per owner covers facts, journal and history; a name-to-id cache replaces the
// per-entity eid probes; integer timestamps and integer values skip printf (only REAL needs %!.17g, Q105b); ref discovery is
// one statement per fetch. Rejected: three statements per table per owner (round 2 measured 17.7 statements and 304 probes per pull).
const sn=x=>"CASE WHEN typeof("+x+")='integer' AND "+x+" BETWEEN -9007199254740991 AND 9007199254740991 THEN "+x+" ELSE printf('%!.17g',"+x+") END";
const safeText=x=>"CASE WHEN typeof("+x+")='blob' THEN NULL ELSE "+x+" END";
const h1Cols='o,e,id,a,pos,t,v,vf,vto,c,y,sv,x';
const h1Union=sel=>['facts','journal','history'].map(t=>'SELECT '+h1Cols+' FROM '+t+' WHERE '+sel+(t==='history'?' AND rpos>@b':'')+' AND pos<=@b').join(' UNION ALL ');
const h1Row="json_array(typeof(f.id)='blob',CASE WHEN typeof(f.id)='blob' THEN hex(f.id) ELSE f.id END,"+safeText('e.name')+","+safeText('a.name')+",f.t,CASE WHEN f.t IN (1,3) THEN "+sn('f.v')+" WHEN f.t=5 THEN "+safeText('ref.name')+" WHEN f.t=7 THEN NULL ELSE f.v END,"+sn('tx.at')+",f.pos,"+sn('(tx.at+f.vf)')+",CASE WHEN f.vto IS NULL THEN NULL ELSE "+sn('f.vto')+" END,"+safeText('c.s')+","+safeText('y.s')+","+sn('coalesce(f.sv,1)')+","+safeText('te.name')+",json(CASE WHEN f.x IS NOT NULL THEN CAST(f.x AS TEXT) WHEN f.t=7 OR (f.t IN (1,3) AND typeof(f.v) NOT IN ('real','integer')) THEN qh_fallback(f.id) ELSE NULL END))";
const h1Joins=' f JOIN ents e ON e.eid=f.e JOIN attrs a ON a.aid=f.a JOIN txs tx ON tx.pos=f.pos JOIN ents te ON te.eid=tx.tx LEFT JOIN strs c ON c.sid=f.c LEFT JOIN strs y ON y.sid=f.y LEFT JOIN ents ref ON f.t=5 AND ref.eid=f.v';
const h1Rows=sel=>q('SELECT json_group_array('+h1Row+') FROM ('+h1Union(sel)+')'+h1Joins).pluck();
// All refs are followed as a superset, even expired refs: valid-time filtering stays in the adapter. Refs from verbatim rows (x) are found by JS.
const h1Refs=(sel,skip)=>q('SELECT DISTINCT f.v,f.x FROM ('+h1Union(sel)+') f WHERE (f.t=5 AND f.x IS NULL'+skip+') OR f.x IS NOT NULL').raw();
// Dictionary rows are immutable once committed and a reader sees only committed rows, so positive name lookups never go stale.
// Misses are never cached (a later commit may add the name). The maps are bounded by clearing.
const entIds=new Map(),entNames=new Map();
const entId=s=>{let x=entIds.get(s);if(x===undefined){x=q('SELECT eid FROM ents WHERE name=?').pluck().get(textKey(s));if(x===undefined)return undefined;if(entIds.size>=200000)entIds.clear();entIds.set(s,x);}return x;};
const entName=id=>{let x=entNames.get(id);if(x===undefined){x=name('ents',id);if(entNames.size>=200000)entNames.clear();entNames.set(id,x);}return x;};
const wholePull = a => {
 if(a.recordedAt!==undefined)throw Error('H1_RECORD_TIME_UNSUPPORTED');
 const m=marker(),b=a.basis;
 if(!Number.isSafeInteger(b)||b<0)throw Error('Invalid basis');
 if(b<m.h)throw Error('H1_SNAPSHOT_EXPIRED');
 if(b>m.position)throw Error('H1_BASIS_NOT_AVAILABLE');
 const parts=[],seen=new Set(),owners=new Set(),ownerNames=[];let frontier=a.roots,hops=0,statements=0;
 const ownerRows=h1Rows('o=@o'),entityRows=h1Rows('o=@o AND e=@e');
 const ownerRefs=h1Refs('o=@o'," AND f.v NOT IN (SELECT e FROM facts WHERE o=@o)"),entityRefs=h1Refs('o=@o AND e=@e','');
 const collect=(rows,refs)=>{
  const text=rows;if(text.length>2)parts.push(text);
  const out=[];
  for(const [v,x] of refs){const target=x!==null?unverb(x):null;if(target){if(target.value_type==='ref')out.push(target.value_string);}else out.push(entName(v));}
  return out;
 };
 // The first touch of an owner by a requested root fetches the whole owner (clustering hint); any entity reached by a ref is fetched by exact (owner, entity)
 // unless its owner is already complete. Refs found from rows are exact misses, so the owner rule never decides reachability.
 let roots=true;
 while(frontier.length){
  hops++;const next=[];
  for(const entity of frontier){
   if(seen.has(entity))continue;seen.add(entity);
   const on=owner(entity),o=entId(on);
   if(o===undefined||owners.has(o))continue;
   if(roots){
    owners.add(o);ownerNames.push(on);
    const rows=ownerRows.get({o,b});statements+=2;
    next.push(...collect(rows,ownerRefs.all({o,b})));
   }else{
    const e=entId(entity);if(e===undefined)continue;
    const rows=entityRows.get({o,b,e});statements+=2;
    next.push(...collect(rows,entityRefs.all({o,b,e})));
   }
  }
  roots=false;
  frontier=next.filter(e=>!seen.has(e));
 }
 return {snapshot:publicMarker(m),basis:b,entities:[...seen],owners:ownerNames,parts,counters:{hops,rows:0,bytes:a.bytes?parts.reduce((n,p)=>n+Buffer.byteLength(p),0):0,statements}};
};
const handle = (op,a) => {
 if(op==='close'){clearInterval(timer);clearInterval(passiveTimer);db?.close();lock?.close();return;}
 if(fatal)throw Error(fatal);
 if(op==='checkpoint' || op==='checkpointStatus'){
  if(role!=='checkpointer')throw Error('Maintenance requires checkpointer connection');
  return op==='checkpoint'?checkpoint(true):checkpointStatus();
 }
 if(op==='threadCpu')return process.threadCpuUsage();
 if(op==='init')return {marker:marker(),calibrationMs};
 if(op==='append')return append(a);
 if(op==='ack'){
  const m=marker();if(a.lsn!==m.lsn||a.epoch!==m.epoch||a.position!==m.position)throw Error('Publication marker mismatch');
  const b=Buffer.alloc(32);b.writeBigUInt64LE(BigInt(m.lsn),0);b.writeBigUInt64LE(BigInt(m.epoch),8);b.writeBigUInt64LE(BigInt(m.position),16);b.writeUInt32LE(m.crc,24);b.writeUInt32LE(crc32(b.subarray(0,28)),28);
  fs.writeFileSync(ackPath+'.tmp',b);fs.renameSync(ackPath+'.tmp',ackPath);return;
 }
 if(op==='retain'){
  const m=marker();if(!Number.isSafeInteger(a.lsn)||a.lsn<m.base_lsn||a.lsn>m.lsn||!a.holder||a.ttlMs!==undefined&&(!Number.isFinite(a.ttlMs)||a.ttlMs<=0))throw Error('Invalid retention holder');
  q('INSERT INTO retention VALUES(?,?,?) ON CONFLICT(holder) DO UPDATE SET lsn=excluded.lsn,expires=excluded.expires').run(a.holder,a.lsn,a.ttlMs===undefined?null:Date.now()+a.ttlMs);return;
 }
 if(op==='release'){q('DELETE FROM retention WHERE holder=?').run(a);return;}
 if(op==='frameHeaders')return q('SELECT lsn,kind FROM frames ORDER BY lsn').all();
 if(op==='epochs')return q('SELECT * FROM epochs ORDER BY epoch').all();
 if(op==='purgeFrames')return db.transaction(()=>{
  const m=marker();if(a===Infinity)return {removed:0,anchor:m.base_lsn};
  if(!Number.isSafeInteger(a)||a<0)throw Error('Invalid frame tail');
  const held=q('SELECT min(lsn) n FROM retention WHERE expires IS NULL OR expires>?').get(Date.now()).n;
  const ack=fs.existsSync(ackPath)?Number(fs.readFileSync(ackPath).readBigUInt64LE(0)):m.lsn;
  const floor=Math.min(held??m.lsn,m.lsn-a,m.lsn-1,ack-1);
  let bytes=0,last,removed=0;
  for(const f of q('SELECT lsn,crc,end,offset FROM frames WHERE lsn<=? ORDER BY lsn LIMIT 16').all(floor)){
   if(bytes+f.end-f.offset>16*1024*1024)break;bytes+=f.end-f.offset;last=f;removed++;
  }
  // [EXP-HS01] Why: deletion and anchor publish atomically. Rejected: anchoring in a later transaction (restart loses its chain).
  if(last){q('DELETE FROM frames WHERE lsn<=?').run(last.lsn);q('UPDATE marker SET base_lsn=?,base_crc=?,base_end=? WHERE id=1').run(last.lsn,last.crc,last.end);}
  return {removed,anchor:last?.lsn??m.base_lsn};
 }).immediate();
 // [EXP-HS01] Why: anchors are internal recovery metadata; preserve existing marker/pull result shapes. Rejected: stripping extra fields only in equivalence tests.
 if(op==='anchor')return marker();
 if(op==='marker')return publicMarker(marker());
 if(op==='frames')return frames(a.from,a.upto,a.maxBytes);
 if(op==='after'){
  if(a.after<marker().base_lsn)throw Error('FEED_RETENTION_EXPIRED:'+JSON.stringify({requested:a.after,retainedFrom:marker().base_lsn}));
  // [EXP-SQL01] Why: epoch-only prefixes must not consume the commit batch budget.
  // Rejected: limiting all frame kinds (repeated restarts can retry an empty page forever).
  const out=[];let bytes=0;
  for(const f of q('SELECT * FROM frames WHERE kind=1 AND lsn>? ORDER BY lsn LIMIT ?').iterate(a.after,a.maxFrames??Number.MAX_SAFE_INTEGER)){
   if(out.length && bytes+f.end-f.offset>a.maxBytes)break;
   out.push(f);bytes+=f.end-f.offset;
  }
  return out;
 }
 if(op==='operation'){const r=q('SELECT receipt FROM operations WHERE op=?').get(a);return r?JSON.parse(r.receipt):undefined;}
 if(op==='claim')return q('SELECT txId,position FROM claims WHERE command=?').get(a);
 if(op==='head')return q('SELECT pos FROM heads WHERE subject=?').get(a)?.pos??0;
 if(op==='readback')return a.map(storedRow).filter(Boolean);
 if(op==='recent')return rows('facts',a.selection,'pos>=?',[(a.after+1)*1024]).concat(rows('journal',a.selection,'pos>=?',[(a.after+1)*1024]),rows('history',a.selection,'rpos>=?',[(a.after+1)*1024]));
 if(op==='pin') {
  const m=marker();if(!Number.isSafeInteger(a.basis)||a.basis<m.h||a.basis>m.lsn*1024+1023)throw Error('Cannot pin unavailable basis');
  q('INSERT INTO pins VALUES(?,?,?)').run(a.token,a.basis,a.owner);return;
 }
 if(op==='unpin'){q('DELETE FROM pins WHERE token=?').run(a);return;}
 if(op==='purge')return db.transaction(()=>{
  const m=marker();if(!Number.isSafeInteger(a)||a<m.h||a>m.lsn*1024+1023)throw Error('Invalid horizon');
  const min=q('SELECT min(basis) b FROM pins').get().b;const h=Math.min(a,min??a);
  q('UPDATE marker SET h=? WHERE id=1').run(h);
  // [EXP-HS01] Why: H limits eligibility, not durable history. Rejected: deleting the only retired version.
  return {h,removed:0};
 }).immediate();
 if(op==='wholePull')return wholePull(a);
 if(op==='pull')return pull(a);
 throw Error('Unknown SQLite request '+op);
};
parentPort.on('message',message=>{
 const {op,args,response,signal}=message;
 let result;
 try {
  if(role==='reader') {
   while(Atomics.load(gate,0)===1)Atomics.wait(gate,0,1,100);
   Atomics.add(gate,1,1);
   // [EXP-SQL01] Why: recheck entry so maintenance cannot miss a reader at the gate boundary.
   // Rejected: a single pre-entry check (races the checkpointer closing the gate).
   if(Atomics.load(gate,0)===1){Atomics.sub(gate,1,1);while(Atomics.load(gate,0)===1)Atomics.wait(gate,0,1,100);Atomics.add(gate,1,1);}
   try {
    if(fatal)throw Error(fatal);
    db.exec('BEGIN');marker();result=handle(op,args);if(op!=='close')db.exec('COMMIT');
   }catch(e){try{db.exec('ROLLBACK');}catch{}throw e;}
   finally{Atomics.sub(gate,1,1);Atomics.notify(gate,1);}
  } else result=handle(op,args);
  response.postMessage({result});
 }catch(e){response.postMessage({error:String(e)});}
 finally{response.close();if(signal){Atomics.store(new Int32Array(signal),0,1);Atomics.notify(new Int32Array(signal),0);}}
});
`;
