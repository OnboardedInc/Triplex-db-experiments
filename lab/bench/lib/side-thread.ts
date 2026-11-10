import { Worker } from 'node:worker_threads';
// [DX-H4] Why: keep a read-only final snapshot for the existing P3 predicates.
// Rejected: replacing feed correctness with worker exit status.
export class SideThread {
  readonly name='dependency-index'; readonly epoch:string;
  checkpoint=0; counts:any={}; firstSeen=new Map(); lags:any[]=[]; crashes:any[]=[]; duplicates=0;
  elus:any[]=[];
  private worker:Worker; private serial=0; private pending=new Map<number,any>();
  private done:Promise<void>; ready:Promise<void>;
  constructor(cfg:any,log:(s:string)=>void) {
    this.epoch=cfg.epoch;this.checkpoint=cfg.startAfter;
    this.worker=new Worker(new URL('../side-worker.ts',import.meta.url),{workerData:cfg});
    let readyResolve:any,doneResolve:any,doneReject:any;
    this.ready=new Promise(r=>readyResolve=r);
    this.done=new Promise((r,j)=>{doneResolve=r;doneReject=j;});
    void this.done.catch(()=>{});
    this.worker.on('message',m=>{
      if(m.type==='ready')readyResolve();
      if(m.type==='log')log(m.line);
      if(m.type==='progress'){this.checkpoint=m.checkpoint;this.elus.push({t:m.t,elu:m.elu});}
      if(m.type==='done'){Object.assign(this,m.snapshot);if(m.error)doneReject(Error(m.error));else doneResolve();}
      if(m.type==='reply'){const p=this.pending.get(m.id);this.pending.delete(m.id);if(m.error)p?.reject(Error(m.error));else p?.resolve(m.value);}
    });
    this.worker.on('error',e=>{doneReject(e);for(const p of this.pending.values())p.reject(e);});
    this.worker.on('exit',code=>{if(code)doneReject(Error(`side worker exited ${code}`));});
  }
  private rpc(type:string,args:any):Promise<any>{const id=++this.serial;return new Promise((resolve,reject)=>{this.pending.set(id,{resolve,reject});this.worker.postMessage({type,id,...args});});}
  ack(position:number,info:any){this.worker.postMessage({type:'ack',position,info});}
  ackArrived(_p:number){}
  set lifeMaxTarget(target:number){this.worker.postMessage({type:'target',target});}
  publicationKey(position:number){const source=JSON.stringify({route:'A0-control',dir:this.dir,epoch:this.epoch});return {source,stream:source,epoch:'0',position:String(position)};}
  dir='';
  run(){return this.done;}
  stop(){this.worker.postMessage({type:'stop'});}
  crashReport(){return this.crashes;}
  visibleDuplicateEffects(){return this.duplicates;}
  replayCheck(_handle:any,from:number){return this.rpc('replay',{from});}
  ryow(subject:number,receipt:any,basis:any,start:number){return this.rpc('ryow',{subject,receipt:{instant:receipt.instant,position:receipt.position},basis,start});}
  close(){return this.worker.terminate();}
}
