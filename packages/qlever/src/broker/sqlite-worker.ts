/** [EXP-SQL01] Why: an embedded JS worker boots from both tsx source and built ESM without a TS loader.
 * Rejected: source-path workers (break packed consumers and test subprocesses). Mechanism: R25 sections 5-7.
 */
export const sqliteWorker = String.raw`
const { parentPort, workerData } = require('node:worker_threads');
const fs = require('node:fs');
const path = require('node:path');
const D = require(workerData.driver);
const { file, role, seed, gateBuffer } = workerData;
const gate = new Int32Array(gateBuffer);
let db, lock, fatal, timer;
const statements = new Map();
const q = sql => { let s=statements.get(sql); if(!s) statements.set(sql,s=db.prepare(sql)); return s; };
const marker = () => q('SELECT lsn,epoch,h,position,crc,size FROM marker WHERE id=1').get();
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
 if(role!=='reader') {
  durablePragmas(db); db.pragma('journal_mode=WAL');
  calibrationMs=calibrate();
  if(workerData.requireFullFsync && process.platform==='darwin' && calibrationMs<1) throw Error('F_FULLFSYNC calibration below 1 ms');
 }
 if(role==='writer') {
  db.exec('CREATE TABLE IF NOT EXISTS frames(lsn INTEGER PRIMARY KEY,epoch INT NOT NULL,kind INT NOT NULL,offset INT NOT NULL,end INT NOT NULL,prev_crc INT NOT NULL,crc INT NOT NULL,payload BLOB NOT NULL,committed_at INT NOT NULL);'+
  'CREATE TABLE IF NOT EXISTS marker(id INTEGER PRIMARY KEY CHECK(id=1),lsn INT NOT NULL,epoch INT NOT NULL,h INT NOT NULL,position INT NOT NULL,crc INT NOT NULL,size INT NOT NULL);'+
  'CREATE TABLE IF NOT EXISTS heads(subject TEXT PRIMARY KEY,pos INT NOT NULL) WITHOUT ROWID;'+
  'CREATE TABLE IF NOT EXISTS claims(command TEXT PRIMARY KEY,txId TEXT NOT NULL,position INT NOT NULL) WITHOUT ROWID;'+
  'CREATE TABLE IF NOT EXISTS operations(op TEXT PRIMARY KEY,receipt TEXT NOT NULL) WITHOUT ROWID;'+
  'CREATE TABLE IF NOT EXISTS recent_rows(entity TEXT NOT NULL,id TEXT NOT NULL,lsn INT NOT NULL,row TEXT NOT NULL,PRIMARY KEY(entity,id)) WITHOUT ROWID;'+
  'CREATE UNIQUE INDEX IF NOT EXISTS recent_id ON recent_rows(id);'+
  'CREATE TABLE IF NOT EXISTS live_rows(entity TEXT NOT NULL,id TEXT NOT NULL,pos INT NOT NULL,row TEXT NOT NULL,PRIMARY KEY(entity,id)) WITHOUT ROWID;'+
  'CREATE UNIQUE INDEX IF NOT EXISTS live_id ON live_rows(id);'+
  'CREATE TABLE IF NOT EXISTS retired_rows(entity TEXT NOT NULL,rpos INT NOT NULL,id TEXT NOT NULL,pos INT NOT NULL,row TEXT NOT NULL,PRIMARY KEY(entity,rpos,id)) WITHOUT ROWID;'+
  'CREATE INDEX IF NOT EXISTS retired_id ON retired_rows(id);'+
  'CREATE INDEX IF NOT EXISTS retired_rpos ON retired_rows(rpos);'+
  'CREATE TABLE IF NOT EXISTS pins(token TEXT PRIMARY KEY,basis INT NOT NULL,owner TEXT NOT NULL) WITHOUT ROWID;');
  q('INSERT OR IGNORE INTO marker VALUES(1,0,0,0,0,?,32)').run(seed);
  // [EXP-SQL01] Why: sync WAL frames adopted by recovery before any reader exists (R25 1.3).
  db.pragma('wal_checkpoint(PASSIVE)'); ackRead();
  db.exec('DELETE FROM pins');
 }
 if(role==='checkpointer') timer=setInterval(()=>{try{db.pragma('wal_checkpoint(PASSIVE)');}catch(e){fatal=String(e);}},4000);
} catch(e) { fatal=String(e); }
const frames = (from,upto,maxBytes,maxFrames=Number.MAX_SAFE_INTEGER) => {
 let bytes=0,out=[],prev=from.seed,next=from.nextLsn,offset=from.offset;
 for(const f of q('SELECT * FROM frames WHERE lsn>=? AND lsn<=? ORDER BY lsn').iterate(next,upto)) {
  if(out.length>=maxFrames || (out.length && bytes+f.end-f.offset>maxBytes))break;
  if(f.prev_crc!==prev || f.lsn!==next || f.offset!==offset)throw Error('Feed chain/cursor mismatch');
  // Frame CRC is independently checked in HostLog.open and readFramesFrom using encodeFrame.
  out.push(f);prev=f.crc;next=f.lsn+1;offset=f.end;bytes+=f.end-f.offset;
 }
 return {frames:out,next:{offset,seed:prev,nextLsn:next}};
};
const gateCheckpoint = () => {
 if(!fs.existsSync(file+'-wal') || fs.statSync(file+'-wal').size<=64*1024*1024)return;
 Atomics.store(gate,0,1);
 const deadline=performance.now()+100;
 while(Atomics.load(gate,1)>0 && performance.now()<deadline) Atomics.wait(gate,1,Atomics.load(gate,1),1);
 try { db.pragma('busy_timeout=100');db.pragma('wal_checkpoint(RESTART)'); }
 finally {db.pragma('busy_timeout=5000');Atomics.store(gate,0,0);Atomics.notify(gate,0);}
};
const append = a => {
 try {
 const result=db.transaction(()=>{
  const m=marker(); if(a.lsn!==m.lsn+1 || a.prev!==m.crc)throw Error('Append chain mismatch');
  q('INSERT INTO frames VALUES(?,?,?,?,?,?,?,?,?)').run(a.lsn,a.epoch,a.kind,m.size,m.size+a.length,a.prev,a.crc,Buffer.from(a.payload),Date.now());
  let position=m.position;
  for(const member of a.members) {
   const last=member.positions[member.positions.length-1];position=Math.max(position,last);
   q('INSERT INTO operations VALUES(?,?)').run(member.operationId,JSON.stringify({lsn:a.lsn,epoch:a.epoch,positions:member.positions}));
   for(const c of member.claims)q('INSERT INTO claims VALUES(?,?,?)').run(c.commandId,c.txId,last);
   for(const s of member.subjects)q('INSERT INTO heads VALUES(?,?) ON CONFLICT(subject) DO UPDATE SET pos=excluded.pos').run(s,last);
   for(const r of member.rows) {
    const json=JSON.stringify(r);
    q('INSERT INTO recent_rows VALUES(?,?,?,?) ON CONFLICT(entity,id) DO UPDATE SET lsn=excluded.lsn,row=excluded.row').run(r.entity_id,r.id,a.lsn,json);
    if(r.retracted_position===null) q('INSERT INTO live_rows VALUES(?,?,?,?) ON CONFLICT(entity,id) DO UPDATE SET pos=excluded.pos,row=excluded.row').run(r.entity_id,r.id,r.recorded_position,json);
    else {
     q('DELETE FROM live_rows WHERE entity=? AND id=?').run(r.entity_id,r.id);
     q('INSERT INTO retired_rows VALUES(?,?,?,?,?) ON CONFLICT(entity,rpos,id) DO UPDATE SET row=excluded.row').run(r.entity_id,r.retracted_position,r.id,r.recorded_position,json);
    }
   }
  }
  q('UPDATE marker SET lsn=?,epoch=?,position=?,crc=?,size=? WHERE id=1').run(a.lsn,a.epoch,position,a.crc,m.size+a.length);
  return {lsn:a.lsn,epoch:a.epoch,kind:a.kind,offset:m.size,end:m.size+a.length,crc:a.crc,payload:Buffer.from(a.payload)};
 })();
 if(a.lsn%25===0)gateCheckpoint();return result;
 }catch(e){fatal='Write failed; fail-stop: '+String(e);throw e;}
};
const rows = (table,selection,extra='',args=[]) => {
 const where=[], vals=[];
 if(selection.id!==undefined){where.push('id=?');vals.push(selection.id);}
 if(selection.entities!==undefined){if(!selection.entities.length)return [];where.push('entity IN ('+selection.entities.map(()=>'?').join(',')+')');vals.push(...selection.entities);}
 if(extra){where.push(extra);vals.push(...args);}
 return q('SELECT row FROM '+table+(where.length?' WHERE '+where.join(' AND '):'')).all(...vals).map(r=>JSON.parse(r.row));
};
const pull = a => {
 const m=marker(), b=a.basis;
 if(!Number.isSafeInteger(b)||b<0)throw Error('Invalid basis');
 if(b<m.h || b>m.lsn*1024+1023)return {snapshot:m,basis:b,eligible:false,rows:[]};
 const out=rows('live_rows',a.selection,'pos<=?',[b]).concat(rows('retired_rows',a.selection,'rpos>? AND pos<=?',[b,b]));
 return {snapshot:m,basis:b,eligible:true,rows:out};
};
const handle = (op,a) => {
 if(op==='close'){clearInterval(timer);db?.close();lock?.close();return;}
 if(fatal)throw Error(fatal);
 if(op==='init')return {marker:marker(),calibrationMs};
 if(op==='append')return append(a);
 if(op==='ack'){
  const m=marker();if(a.lsn!==m.lsn||a.epoch!==m.epoch||a.position!==m.position)throw Error('Publication marker mismatch');
  const b=Buffer.alloc(32);b.writeBigUInt64LE(BigInt(m.lsn),0);b.writeBigUInt64LE(BigInt(m.epoch),8);b.writeBigUInt64LE(BigInt(m.position),16);b.writeUInt32LE(m.crc,24);b.writeUInt32LE(crc32(b.subarray(0,28)),28);
  fs.writeFileSync(ackPath+'.tmp',b);fs.renameSync(ackPath+'.tmp',ackPath);return;
 }
 if(op==='marker')return marker();
 if(op==='frames')return frames(a.from,a.upto,a.maxBytes);
 if(op==='after'){
  const first=q('SELECT lsn,offset,prev_crc FROM frames WHERE lsn>? ORDER BY lsn LIMIT 1').get(a.after);
  return first?frames({offset:first.offset,seed:first.prev_crc,nextLsn:first.lsn},marker().lsn,a.maxBytes,a.maxFrames).frames:[];
 }
 if(op==='operation'){const r=q('SELECT receipt FROM operations WHERE op=?').get(a);return r?JSON.parse(r.receipt):undefined;}
 if(op==='claim')return q('SELECT txId,position FROM claims WHERE command=?').get(a);
 if(op==='head')return q('SELECT pos FROM heads WHERE subject=?').get(a)?.pos??0;
 if(op==='recent')return rows('recent_rows',a.selection,'lsn>?',[a.after]);
 if(op==='pin') {
  const m=marker();if(!Number.isSafeInteger(a.basis)||a.basis<m.h||a.basis>m.lsn*1024+1023)throw Error('Cannot pin unavailable basis');
  q('INSERT INTO pins VALUES(?,?,?)').run(a.token,a.basis,a.owner);return;
 }
 if(op==='unpin'){q('DELETE FROM pins WHERE token=?').run(a);return;}
 if(op==='purge')return db.transaction(()=>{
  const m=marker();if(!Number.isSafeInteger(a)||a<m.h||a>m.lsn*1024+1023)throw Error('Invalid horizon');
  const min=q('SELECT min(basis) b FROM pins').get().b;const h=Math.min(a,min??a);
  q('UPDATE marker SET h=? WHERE id=1').run(h);
  // [EXP-SQL01] Why: bound purge CPU between commit groups, keep history in recent_rows for source fallback.
  return {h,removed:q('DELETE FROM retired_rows WHERE (entity,rpos,id) IN (SELECT entity,rpos,id FROM retired_rows WHERE rpos<=? LIMIT 2000)').run(h).changes};
 })();
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
   // Recheck after entry so the writer cannot miss a reader entering at the gate boundary.
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
