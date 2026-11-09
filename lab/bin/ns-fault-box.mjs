// [EXP-G03-R6] Why: lifecycle stays in engine.mjs and DR stays in the observer, never in the candidate or driver. Rejected: host SQLite, SIGKILL by guest PID, or restart without retained proof.
import {inspect} from './lib.mjs';
export function boxedFaultTransport(box,{target,restart,snapshot,recover,stamp}){
 const current=()=>{const c=inspect(target.name);if(!c||c.Id!==target.id||!c.Mounts.some(m=>m.Type==='volume'&&m.Name===target.volume&&m.Destination==='/state'&&m.RW===true)||!box.resources.some(([kind,n])=>kind==='container'&&n===target.name))throw Error('CRASH-TARGET-MISMATCH');return c};
 return {
  async pause({target:t}){if(t.id!==target.id)throw Error('CRASH-TARGET-MISMATCH');current();return box.engine('pause',['--name',t.name,'--expected-id',t.id]);},
  async snapshot(context){return snapshot(context);},
  async kill({target:t,attempt}){
   current();const proof=box.engine('remove',['--name',t.name,'--expected-id',t.id,'--proof-image',box.config.imageId]);
   // [EXP-G03-R6] Why: failed proof must retain ownership and its sticky reservation. Rejected: clearing resources before proof.
   if(proof.id!==t.id||proof.cgroupGone!==true)throw Error('ISOLATION-NOT-IN-FORCE');
   box.resources=box.resources.filter(([,n])=>n!==t.name);box.records.push(proof);
   return {...proof,signal:'SIGKILL',attempt,observedAtNs:await stamp()};
  },
  async restart(context){const next=await restart(context);target=next;return next;},
  async recover(context){return recover(context);},
 };
}
// [EXP-G03-R6] Why: new observer RO transactions read actual durable bytes. Rejected: candidate-supplied snapshots.
export function snapshotScript(context,store){return `import json,sqlite3,os,time,hashlib,base64,struct\ncfg=json.loads(${JSON.stringify(JSON.stringify({schema:'ns-dr/1',attempt:context.attempt,phase:context.phase,binding:context.binding,targetId:context.target.id,volume:context.target.volume}))})\nc=sqlite3.connect('file:'+${JSON.stringify(store)}+'?mode=ro',uri=True,isolation_level=None)\nc.execute('PRAGMA query_only=ON');c.execute('BEGIN')\ncfg['checkpoint']=c.execute('SELECT lsn FROM marker WHERE id=1').fetchone()[0]\ncfg['effects']=c.execute('SELECT position,subject,value FROM entries ORDER BY position').fetchall()\ncfg['rowCount']=len(cfg['effects']);cfg['frontier']=max([r[0] for r in cfg['effects']],default=0);cfg['observedAtNs']=str(time.monotonic_ns())\nc.execute('COMMIT');c.close()\ncfg['walBytes']=os.path.getsize(${JSON.stringify(store+'-wal')}) if os.path.exists(${JSON.stringify(store+'-wal')}) else 0\nwal=open(${JSON.stringify(store+'-wal')},'rb').read(8*1024*1024+1) if cfg['walBytes'] else b''\nif len(wal)!=cfg['walBytes'] or len(wal)>8*1024*1024: raise RuntimeError('FAULT-WAL-CAP')\ncfg['walSha256']=hashlib.sha256(wal).hexdigest();cfg['walBase64']=base64.b64encode(wal).decode()\ncfg['walStructure']={'class':'structural-only; checksum and sync provenance require O-OBS','frames':0,'lastCommitFrame':0,'uncommittedFramesAfterLastCommit':False}\nif wal:\n if len(wal)<32: raise RuntimeError('FAULT-WAL-HEADER')\n magic,version,page=struct.unpack('>III',wal[:12])\n if magic not in [0x377f0682,0x377f0683] or version!=3007000 or page<512 or page>65536 or page&(page-1): raise RuntimeError('FAULT-WAL-HEADER')\n size=24+page;frames=(len(wal)-32)//size;last=0\n for i in range(frames):\n  frame=wal[32+i*size:32+(i+1)*size]\n  if frame[8:16]!=wal[16:24]: break\n  if struct.unpack('>I',frame[4:8])[0]: last=i+1\n cfg['walStructure'].update(frames=frames,lastCommitFrame=last,uncommittedFramesAfterLastCommit=frames>last,trailingBytes=(len(wal)-32)%size)\nprint(json.dumps(cfg,separators=(',',':')))\n`;}
