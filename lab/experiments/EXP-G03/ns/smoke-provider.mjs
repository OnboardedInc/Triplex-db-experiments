// [EXP-G03-R5] Why: the boxed smoke needs real independent WAL stores and RPC-only replication. Rejected: shared broker/consumer files or candidate callbacks on the evaluator.
import {DatabaseSync} from 'node:sqlite';
import {rpc} from '../../../bench/ns-driver/rpc.mjs';
export async function openNsRole(role,c){
 if(role==='readers'){

  async function pull({request}){const rows=new Map();const page=await rpc(c.broker,c.runId,'feedPage',{cursor:{after:0}});for(const e of page.entries){if(e.position<=Number(request.basis))rows.set(e.subject,e.value)}
   return {subject:request.subject,value:rows.get(request.subject)??0,basis:request.basis};}
  return {read:pull,pull,close(){}};
 }
 const db=new DatabaseSync(c.storeFile);db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA wal_autocheckpoint=0; CREATE TABLE marker(id INTEGER PRIMARY KEY,lsn INTEGER); INSERT INTO marker VALUES(1,0); CREATE TABLE subjects(subject TEXT PRIMARY KEY,value INTEGER); CREATE TABLE entries(position INTEGER PRIMARY KEY,subject TEXT,value INTEGER);');
 const marker=()=>Number(db.prepare('SELECT lsn FROM marker').get().lsn);
 if(role==='broker')return {
  async commit({command}){
   const t=process.hrtime.bigint();db.exec('BEGIN IMMEDIATE');
   try{
    if(command.kind==='seed'){const insert=db.prepare('INSERT INTO subjects VALUES(?,0)');for(let i=0;i<command.population;i++)insert.run('subject-'+i);db.exec('COMMIT');return {seeded:command.population}}
    const n=marker()+1;db.prepare('INSERT INTO entries VALUES(?,?,?)').run(n,command.subject,command.value);db.prepare('UPDATE subjects SET value=? WHERE subject=?').run(command.value,command.subject);db.prepare('UPDATE marker SET lsn=?').run(n);db.exec('COMMIT');
    return {commandId:command.id,status:'committed',receipt:{position:String(n),epoch:'0',txId:'tx-'+n},commitNs:String(process.hrtime.bigint()-t)};
   }catch(e){db.exec('ROLLBACK');throw e}
  },
  async feedPage({cursor}){return {entries:db.prepare('SELECT position,subject,value FROM entries WHERE position>? ORDER BY position').all(cursor?.after??0),frontier:marker(),cursor:{after:marker()}}},close(){db.close()}
 };
 return {async consumerControl({action}){
  if(action==='step'||action==='stop'){
   const page=await rpc(c.broker,c.runId,'feedPage',{cursor:{after:marker()}});db.exec('BEGIN IMMEDIATE');try{for(const e of page.entries){db.prepare('INSERT INTO entries VALUES(?,?,?)').run(e.position,e.subject,e.value);db.prepare('INSERT OR REPLACE INTO subjects VALUES(?,?)').run(e.subject,e.value)}db.prepare('UPDATE marker SET lsn=?').run(page.frontier);db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e}
  }
  return {frontier:marker(),effects:db.prepare('SELECT position,subject,value FROM entries ORDER BY position').all()};
 },close(){db.close()}};
}
