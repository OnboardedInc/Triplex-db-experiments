// [EXP-G03-R5] Why: the boxed smoke needs real independent WAL stores and RPC-only replication. Rejected: shared broker/consumer files or candidate callbacks on the evaluator.
import {DatabaseSync} from 'node:sqlite';
import {rpc} from '../../../bench/ns-driver/rpc.mjs';
export async function openNsRole(role,c){
 if(role==='readers'){

  async function pull({request}){const rows=new Map();const page=await rpc(c.broker,c.runId,'feedPage',{cursor:{after:0}});for(const e of page.entries){if(e.position<=Number(request.basis))rows.set(e.subject,e.value)}
   return {subject:request.subject,value:rows.get(request.subject)??0,basis:request.basis};}
  return {read:pull,pull,close(){}};
 }
 const db=new DatabaseSync(c.storeFile);db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA wal_autocheckpoint=0; CREATE TABLE IF NOT EXISTS marker(id INTEGER PRIMARY KEY,lsn INTEGER); INSERT OR IGNORE INTO marker VALUES(1,0); CREATE TABLE IF NOT EXISTS subjects(subject TEXT PRIMARY KEY,value INTEGER); CREATE TABLE IF NOT EXISTS entries(position INTEGER PRIMARY KEY,subject TEXT,value INTEGER);');
 const marker=()=>Number(db.prepare('SELECT lsn FROM marker').get().lsn);
 if(role==='broker'){
 let next=0;const pending=new Map();
 const write=(command)=>{
   const t=process.hrtime.bigint();db.exec('BEGIN IMMEDIATE');
   try{
    if(command.kind==='seed'){const insert=db.prepare('INSERT INTO subjects VALUES(?,0)');for(let i=0;i<command.population;i++)insert.run('subject-'+i);db.exec('COMMIT');return {seeded:command.population}}
    const n=marker()+1;db.prepare('INSERT INTO entries VALUES(?,?,?)').run(n,command.subject,command.value);db.prepare('UPDATE subjects SET value=? WHERE subject=?').run(command.value,command.subject);db.prepare('UPDATE marker SET lsn=?').run(n);db.exec('COMMIT');
    return {commandId:command.id,status:'committed',receipt:{position:String(n),epoch:'0',txId:'tx-'+n},commitNs:String(process.hrtime.bigint()-t)};
   }catch(e){db.exec('ROLLBACK');throw e}
  };
  return {async commit({command}){
   if(command.kind==='seed')return write(command);
   // [EXP-G03-R5] Why: the smoke defines explicit source order while TCP arrivals may reorder. Rejected: inferring source order from connection completion or weakening the final prefix assertion.
   if(!Number.isSafeInteger(command.sequence)||command.sequence<next||command.sequence>next+1024||pending.has(command.sequence))throw Error('invalid/duplicate diagnostic sequence');
   return new Promise((resolve,reject)=>{pending.set(command.sequence,{command,resolve,reject});while(pending.has(next)){const row=pending.get(next);pending.delete(next);try{const result=write(row.command);next++;row.resolve(result)}catch(e){row.reject(e);break}}});
  },
  async feedPage({cursor}){return {entries:db.prepare('SELECT position,subject,value FROM entries WHERE position>? ORDER BY position').all(cursor?.after??0),frontier:marker(),cursor:{after:marker()}}},close(){db.close()}
 };
 }
 // [EXP-G03-R6] Why: the same blocking transaction boundaries exist in normal and crash runs; restart opens the same WAL. Rejected: a crash-only hook path or clean replacement database.
 let stage=null,page=null,pageId=null;
 const hook=()=>({hook:{event:'at-point',role:'consumer',point:stage,page:pageId,cursor:{after:marker()}}});
 return {async consumerControl({action,data}){
  if(action==='step'){
   if(stage)throw Error('hook requires release');
   pageId=data?.page??0;page=await rpc(c.broker,c.runId,'feedPage',{cursor:{after:marker()}});
   db.exec('BEGIN IMMEDIATE');stage='before-effect';return hook();
  }
  if(action==='release'){
   if(!stage||data?.page!==pageId||data.point!==stage)throw Error('hook release mismatch');
   if(stage==='before-effect'){for(const e of page.entries){db.prepare('INSERT INTO entries VALUES(?,?,?)').run(e.position,e.subject,e.value);db.prepare('INSERT OR REPLACE INTO subjects VALUES(?,?)').run(e.subject,e.value)}stage='after-effect';return hook()}
   if(stage==='after-effect'){db.prepare('UPDATE marker SET lsn=?').run(page.frontier);db.exec('COMMIT');stage='after-checkpoint';return hook()}
   stage=null;
  }
  if(action==='stop'&&stage)throw Error('blocked hook');
  return {frontier:marker(),effects:db.prepare('SELECT position,subject,value FROM entries ORDER BY position').all()};
 },close(){db.close()}};
}
