import { NativeDuckDBPort } from './native-duckdb-port.mjs';
import { encodeSchemaRecord } from './native-schema.js';
import type { NativeQueryValue,SchemaField,SchemaReceipt,SchemaValue } from './native-schema.js';
import type { SqlRows,SqlScalar } from './owned-duckdb-port.mjs';

export interface EntityPut {
  readonly schema:string;readonly version:number;readonly type:string;readonly entityId:string;readonly commandId:string;
  readonly validFrom:bigint;readonly validTo:bigint;readonly fields:readonly SchemaField[];
}
export interface EntityReceipt {
  readonly commandId:string;readonly position:bigint;readonly asserted:readonly string[];readonly retracted:readonly string[];
  readonly schema:string;readonly version:number;readonly type:string;readonly entityId:string;
  readonly schemaHash:string;readonly requestHash:string;
}
export interface EntityBatchMember {
  readonly operation:'put'|'patch';readonly type:string;readonly entityId:string;
  readonly validFrom:bigint;readonly validTo:bigint;readonly fields:readonly SchemaField[];
}
export interface EntityBatch {
  readonly schema:string;readonly version:number;readonly commandId:string;
  readonly members:readonly EntityBatchMember[];
}
export interface EntityBatchRecords extends Omit<EntityBatch,'members'> {
  readonly members:readonly (Omit<EntityBatchMember,'fields'>&{readonly record:string})[];
}
export interface EntityBatchReceipt {
  readonly commandId:string;readonly position:bigint;readonly schema:string;readonly version:number;
  readonly schemaHash:string;readonly requestHash:string;
  readonly members:readonly Readonly<{
    operation:'put'|'patch';type:string;entityId:string;asserted:readonly string[];retracted:readonly string[];
  }>[];
}
export interface EntityAssertion extends SchemaField {
  readonly assertionId:string;readonly entityId:string;readonly validFrom:bigint;readonly validTo:bigint;
  readonly txFrom:bigint;readonly txTo:bigint;readonly commandId:string;readonly correctedBy:string|null;
  readonly schema:string;readonly version:number;readonly type:string;readonly schemaHash:string;
}
export interface NativeQueryOptions {
  readonly validAt:bigint;readonly knownAt?:bigint;
  readonly maxFacts?:number;readonly maxRounds?:number;readonly maxWork?:number;readonly deadlineMs?:number;
  readonly timeoutMs?:number;readonly signal?:AbortSignal;
  /** Omitted: C++ cost preference. true: native. false: SQL first, with proved-budget fallback. */
  readonly forceNative?:boolean;
}
export interface NativeIntervalQueryOptions {
  readonly validFrom:bigint;readonly validTo:bigint;readonly knownAt?:bigint;
  readonly maxSegments?:number;readonly maxFacts?:number;readonly maxRounds?:number;readonly maxWork?:number;
  readonly timeoutMs?:number;readonly signal?:AbortSignal;
}
export interface NativeIntervalQueryResult {
  readonly position:bigint;
  readonly intervals:readonly Readonly<{
    values:readonly NativeQueryValue[];validFrom:bigint;validTo:bigint;
  }>[];
}
export interface NativeQueryCutsOptions {
  readonly cuts:readonly Readonly<{validAt:bigint;knownAt?:bigint}>[];
  readonly maxFacts?:number;readonly maxRounds?:number;readonly maxWork?:number;
  readonly timeoutMs?:number;readonly signal?:AbortSignal;
}
export interface NativeCutAnswer {
  readonly validAt:bigint;readonly position:bigint;
  readonly rows:readonly (readonly NativeQueryValue[])[];
}
export interface NativeLookupOptions {
  readonly attribute:string;readonly validAt:bigint;readonly knownAt?:bigint;
  readonly maxInputFacts?:number;readonly maxCandidates?:number;
  readonly timeoutMs?:number;readonly signal?:AbortSignal;
}
export interface NativeEntityStoreOptions {
  readonly database?:string;
  /** Dedicated readers sharing the writer's instance. Zero preserves serialized execution. */
  readonly readers?:number;
  /** Additional admitted reads beyond the reader count, including reads awaiting prior writes. Default 1024. */
  readonly maxQueuedReads?:number;
  readonly threads?:number;
  readonly memoryLimit?:string;
  readonly maxTempDirectorySize?:string;
  /** Logical retained-row/payload admission. DuckDB memory settings are separate. */
  readonly retainedLimits?:Readonly<{maxFacts:number;maxBytes:number}>;
}
export interface NativeScalableQueryOptions {
  readonly validAt:bigint;readonly knownAt?:bigint;
  readonly maxInputFacts?:number;readonly maxIntermediateRows?:number;readonly maxIntermediateBytes?:number;
  readonly maxOutputRows?:number;readonly maxOutputBytes?:number;
  readonly timeoutMs?:number;readonly signal?:AbortSignal;
}
export interface NativeQueryResult {
  readonly position:bigint;readonly route:'native'|'sql';
  readonly reason:'proved_edb_anti_join'|'anti_join_budget_unproved'|'owned_scalable_anti_join'|'owned_unique_scalable_anti_join'|'owned_allcut_unique_scalable_anti_join'|'bounded_native_store'|'forced_native'|'preferred_native'|'single_atom_budget_unproved'|'proved_single_atom'|'proved_edb_join'|'proved_edb_union'|'edb_join_budget_unproved'|'edb_union_budget_unproved'|'proved_count'|'count_budget_unproved'|'proved_aggregate'|'aggregate_budget_unproved'|'owned_scalable_single_atom'|'owned_scalable_edb_join'|'owned_scalable_edb_union'|'owned_temporal_lookup'|'owned_scalable_count'|'owned_scalable_aggregate'|'owned_unique_scalable_single_atom'|'owned_unique_scalable_edb_join'|'owned_unique_scalable_edb_union'|'owned_unique_scalable_count'|'owned_unique_scalable_aggregate'|'owned_allcut_unique_scalable_single_atom'|'owned_allcut_unique_scalable_edb_join'|'owned_allcut_unique_scalable_edb_union'|'owned_allcut_unique_scalable_count'|'owned_allcut_unique_scalable_aggregate';
  readonly rows:readonly (readonly NativeQueryValue[])[];
  readonly counters:Readonly<{rounds:bigint;derivedFacts:bigint;work:bigint}>|null;
}
export class NativeCommandError extends Error {
  readonly code:string;
  constructor(code:string,cause:Error){super(cause.message,{cause});this.name='NativeCommandError';this.code=code;}
}
function commandError(cause:unknown):unknown{
  if(cause instanceof NativeCommandError)return cause;
  if(cause instanceof Error){
    const code=cause.message.match(/TD_E_(?:COMMAND|SCHEMA|VALUE|QUERY|OWNER)_[A-Z_]+|TD_E_(?:DEADLINE|CANCELED|CONTROL)/)?.[0];
    if(code)return new NativeCommandError(code,cause);
  }
  return cause;
}

interface QueryControls {readonly timeoutMs?:number;readonly signal?:AbortSignal;}
interface ReadWaiter<T> {resolve:(value:T)=>void;reject:(error:unknown)=>void;}

/** One public query's invocation clock; native controls still own active cleanup. */
class QueryInvocation {
  readonly signal:AbortSignal|undefined;
  #controller:AbortController|undefined;#deadline:number|undefined;
  #reason:'signal'|'timeout'|undefined;#timer:ReturnType<typeof setTimeout>|undefined;
  #source:AbortSignal|undefined;#onAbort:(()=>void)|undefined;
  constructor({timeoutMs,signal}:QueryControls){
    if(timeoutMs!==undefined&&(!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>60000))
      throw new TypeError('timeoutMs must be an integer in 1..60000');
    if(signal!==undefined&&!(signal instanceof AbortSignal))throw new TypeError('signal must be an AbortSignal');
    if(timeoutMs===undefined&&signal===undefined)return;
    this.#controller=new AbortController();this.signal=this.#controller.signal;
    if(timeoutMs!==undefined){
      this.#deadline=performance.now()+timeoutMs;
      this.#timer=setTimeout(()=>this.#stop('timeout'),timeoutMs);
    }
    if(signal){
      this.#source=signal;this.#onAbort=()=>this.#stop('signal');
      signal.addEventListener('abort',this.#onAbort,{once:true});
      if(signal.aborted)this.#stop('signal');
    }
  }
  #stop(reason:'signal'|'timeout'):void{
    this.#reason??=reason;this.#controller?.abort();
  }
  check():void{
    if(this.#deadline!==undefined&&performance.now()>=this.#deadline)this.#stop('timeout');
    if(this.#reason==='timeout')throw new NativeCommandError('TD_E_DEADLINE',new Error('TD_E_DEADLINE: whole-query timeout exceeded'));
    if(this.#reason==='signal')throw new NativeCommandError('TD_E_CANCELED',new Error('TD_E_CANCELED: query canceled'));
  }
  controls():QueryControls{
    this.check();
    return {...(this.#deadline===undefined?{}:{timeoutMs:Math.max(1,Math.ceil(this.#deadline-performance.now()))}),
      ...(this.signal===undefined?{}:{signal:this.signal})};
  }
  /** Notify tokenless cancellation early, retaining the actual internal drain. */
  notifyQueued<T>(pending:Promise<T>,started:()=>boolean,checkHealth:()=>void):Promise<T>{
    if(!this.signal)return pending;
    const signal=this.signal;
    return new Promise((resolve,reject)=>{
      const onAbort=()=>{
        if(started())return;
        signal.removeEventListener('abort',onAbort);this.finish();
        try{checkHealth();this.check();}catch(error){reject(error);}
      };
      signal.addEventListener('abort',onAbort,{once:true});
      pending.then(value=>{signal.removeEventListener('abort',onAbort);resolve(value);},
        error=>{signal.removeEventListener('abort',onAbort);reject(error);});
      if(signal.aborted)onAbort();
    });
  }
  rejected(cause:unknown,port:NativeDuckDBPort):unknown{
    // Only translate this invocation's timeout-induced cancellation. Native fatal
    // and uncertain-cleanup errors, including their primary causes, remain intact.
    if(this.#reason==='timeout'&&port.status()==='ready'&&cause instanceof NativeCommandError&&cause.code==='TD_E_CANCELED')
      return new NativeCommandError('TD_E_DEADLINE',new Error('TD_E_DEADLINE: whole-query timeout exceeded',{cause}));
    return cause;
  }
  finish():void{
    clearTimeout(this.#timer);
    if(this.#source&&this.#onAbort)this.#source.removeEventListener('abort',this.#onAbort);
    this.#source=undefined;this.#onAbort=undefined;
  }
}

/** A granted resource is never lost to a cancellation race after resolution. */
function queueWait<T>(waiting:ReadWaiter<T>[],invocation?:QueryInvocation):Promise<T>{
  return new Promise((resolve,reject)=>{
    const signal=invocation?.signal;
    const detach=()=>signal?.removeEventListener('abort',onAbort);
    const entry:ReadWaiter<T>={resolve:value=>{detach();resolve(value);},reject:error=>{detach();reject(error);}};
    const onAbort=()=>{
      const index=waiting.indexOf(entry);
      if(index<0)return;
      waiting.splice(index,1);
      try{invocation?.check();}catch(error){entry.reject(error);}
    };
    waiting.push(entry);signal?.addEventListener('abort',onAbort,{once:true});
    if(signal?.aborted)onAbort();
  });
}
const inputText=(value:string):string=>{
  if(typeof value!=='string'||!value.isWellFormed()||value.includes('\0'))
    throw new TypeError('Native text encoding requires well-formed NUL-free Unicode');
  return value;
};
const quote=(value:string):string=>"'"+inputText(value).replaceAll("'","''")+"'";
const integer=(value:bigint|number):string=>{
  if(typeof value==='bigint'||typeof value==='number'&&Number.isSafeInteger(value))return String(value);
  throw new TypeError('Native integer encoding requires bigint or a safe integer');
};
const text=(value:SqlScalar|undefined):string=>{
  if(typeof value!=='string')throw new Error('Malformed native text result');return value;
};
const bigint=(value:SqlScalar|undefined):bigint=>{
  if(typeof value!=='bigint')throw new Error('Malformed native integer result');return value;
};
function ids(decoded:unknown):readonly string[]{
  if(!Array.isArray(decoded)||!decoded.every(item=>typeof item==='string'))throw new Error('Malformed native ID list');
  return Object.freeze(decoded);
}
function strings(value:SqlScalar|undefined):readonly string[]{return ids(JSON.parse(text(value)));}
function receipt(rows:SqlRows):EntityReceipt|null{
  if(!rows.length)return null;
  if(rows.length!==1||rows[0]?.length!==10)throw new Error('Malformed native entity receipt');
  const r=rows[0];
  return Object.freeze({commandId:text(r[0]),position:bigint(r[1]),asserted:strings(r[2]),retracted:strings(r[3]),
    schema:text(r[4]),version:Number(bigint(r[5])),type:text(r[6]),entityId:text(r[7]),schemaHash:text(r[8]),requestHash:text(r[9])});
}
function batchReceipt(rows:SqlRows):EntityBatchReceipt|null{
  if(!rows.length)return null;
  if(rows.length!==1||rows[0]?.length!==7)throw new Error('Malformed native batch receipt');
  const row=rows[0],decoded:unknown=JSON.parse(text(row[6]));
  if(!Array.isArray(decoded)||decoded.length<1||decoded.length>32)throw new Error('Malformed native batch members');
  const members=decoded.map((item:unknown)=>{
    if(typeof item!=='object'||item===null)throw new Error('Malformed native batch member');
    const member=item as Record<string,unknown>;
    if(member.operation!=='put'&&member.operation!=='patch'||typeof member.type!=='string'||typeof member.entityId!=='string')
      throw new Error('Malformed native batch member identity');
    const asserted=ids(member.asserted),retracted=ids(member.retracted);
    return Object.freeze({operation:member.operation,type:member.type,entityId:member.entityId,asserted,retracted});
  });
  return Object.freeze({commandId:text(row[0]),position:bigint(row[1]),schema:text(row[2]),version:Number(bigint(row[3])),
    schemaHash:text(row[4]),requestHash:text(row[5]),members:Object.freeze(members)});
}
function scalarValue(tag:string,decoded:unknown):Exclude<SchemaValue,{tag:'blob'}>{
  switch(tag){
    case 'str':case 'ref':case 'json':if(typeof decoded==='string')return Object.freeze({tag,value:decoded});break;
    case 'bool':if(typeof decoded==='boolean')return Object.freeze({tag,value:decoded});break;
    case 'i64':if(typeof decoded==='string')return Object.freeze({tag,value:BigInt(decoded)});break;
    case 'f64':case 'datetime':if(typeof decoded==='string'&&/^[0-9a-f]{16}$/.test(decoded)){
      const number=Buffer.from(decoded,'hex').readDoubleBE();
      if(Number.isFinite(number))return Object.freeze({tag,value:number});
    }break;
  }
  throw new Error('Malformed native scalar encoding');
}
function assertionValue(tag:string,decoded:unknown):SchemaValue{
  if(tag!=='blob')return scalarValue(tag,decoded);
  if(typeof decoded==='object'&&decoded!==null){
    const {id,mimeType,size,filename}=decoded as Record<string,unknown>;
    if(typeof id==='string'&&typeof mimeType==='string'&&typeof size==='number'&&
      Number.isSafeInteger(size)&&size>=0&&(filename===undefined||typeof filename==='string')){
      return Object.freeze({tag,value:id,mimeType,size,...(filename===undefined?{}:{filename})});
    }
  }
  throw new Error('Malformed native assertion value');
}
function assertions(rows:SqlRows):readonly EntityAssertion[]{
  return Object.freeze(rows.map(r=>{
    if(r.length!==15||r[10]!==null&&typeof r[10]!=='string')throw new Error('Malformed native assertion');
    return Object.freeze({assertionId:text(r[0]),entityId:text(r[1]),attribute:text(r[2]),value:assertionValue(text(r[3]),JSON.parse(text(r[4]))),
      validFrom:bigint(r[5]),validTo:bigint(r[6]),txFrom:bigint(r[7]),txTo:bigint(r[8]),commandId:text(r[9]),correctedBy:r[10],
      schema:text(r[11]),version:Number(bigint(r[12])),type:text(r[13]),schemaHash:text(r[14])});
  }));
}
function queryTuple(wire:SqlScalar|undefined):NativeQueryValue[]{
  const tuple:unknown=JSON.parse(text(wire));
  if(!Array.isArray(tuple)||tuple.length>8)throw new Error('Malformed native query tuple');
  return tuple.map((cell:unknown)=>{
    if(typeof cell!=='object'||cell===null||!('tag'in cell))throw new Error('Malformed native query cell');
    const v=cell as Record<string,unknown>;
    const tag=v.tag===1?'str':v.tag===2?'bool':v.tag===3?'i64':v.tag===4?'f64':v.tag===5?'ref':v.tag===6?'datetime':
      v.tag===7?'json':v.tag===8?'blob':null;
    if(!tag)throw new Error('Malformed native query tag');
    if(tag==='blob'){
      if(typeof v.s!=='string')throw new Error('Malformed native blob ID');
      return Object.freeze({tag,value:v.s});
    }
    return scalarValue(tag,tag==='str'||tag==='ref'||tag==='json'?v.s:tag==='bool'?v.b:tag==='i64'?v.i:v.f);
  });
}
function queryResult(raw:SqlRows,poll?:()=>void):NativeQueryResult{
  const first=raw[0];
  if(!first||first.length!==7||!(first[1]==='sql'&&(first[2]==='proved_edb_anti_join'||first[2]==='owned_scalable_anti_join'||first[2]==='owned_unique_scalable_anti_join'||first[2]==='owned_allcut_unique_scalable_anti_join'||first[2]==='proved_single_atom'||first[2]==='proved_edb_join'||first[2]==='proved_edb_union'||first[2]==='proved_count'||first[2]==='proved_aggregate'||first[2]==='owned_scalable_single_atom'||first[2]==='owned_scalable_edb_join'||first[2]==='owned_scalable_edb_union'||first[2]==='owned_temporal_lookup'||first[2]==='owned_scalable_count'||first[2]==='owned_scalable_aggregate'||first[2]==='owned_unique_scalable_single_atom'||first[2]==='owned_unique_scalable_edb_join'||first[2]==='owned_unique_scalable_edb_union'||first[2]==='owned_unique_scalable_count'||first[2]==='owned_unique_scalable_aggregate'||first[2]==='owned_allcut_unique_scalable_single_atom'||first[2]==='owned_allcut_unique_scalable_edb_join'||first[2]==='owned_allcut_unique_scalable_edb_union'||first[2]==='owned_allcut_unique_scalable_count'||first[2]==='owned_allcut_unique_scalable_aggregate')||first[1]==='native'&&
    (first[2]==='anti_join_budget_unproved'||first[2]==='bounded_native_store'||first[2]==='forced_native'||first[2]==='preferred_native'||first[2]==='single_atom_budget_unproved'||first[2]==='edb_join_budget_unproved'||first[2]==='edb_union_budget_unproved'||first[2]==='count_budget_unproved'||first[2]==='aggregate_budget_unproved')))
    throw new Error('Malformed native query result');
  const rows:NativeQueryValue[][]=[];
  for(const row of raw){
    if(poll&&(rows.length&1023)===0)poll();
    if(row.length!==7||row.slice(0,6).some((cell,i)=>cell!==first[i]))throw new Error('Incoherent native query metadata');
    if(row[6]===null){if(raw.length!==1)throw new Error('Malformed empty native answer');continue;}
    rows.push(queryTuple(row[6]));
  }
  if(first[1]==='sql'&&first.slice(3,6).some(v=>v!==null))throw new Error('SQL route cannot claim native counters');
  return Object.freeze({position:bigint(first[0]),route:first[1] as NativeQueryResult['route'],reason:first[2] as NativeQueryResult['reason'],
    rows:Object.freeze(rows.map(tuple=>Object.freeze(tuple))),
    counters:first[1]==='sql'?null:Object.freeze({rounds:bigint(first[3]),derivedFacts:bigint(first[4]),work:bigint(first[5])})});
}

/** Local transport and codecs only. C++ owns schemas, commands and temporal cuts. */
export class NativeEntityStore {
  #port:NativeDuckDBPort;#tail:Promise<unknown>=Promise.resolve();#closed=false;#close:Promise<void>|undefined;
  #readers:NativeDuckDBPort[];#available:NativeDuckDBPort[];#reads=new Set<Promise<unknown>>();
  #leased=new Set<NativeDuckDBPort>();#retainedLimits:readonly string[];#maxQueuedReads:number;
  #revalidation:Promise<void>|undefined;#ownerReady=false;
  #waiting:ReadWaiter<NativeDuckDBPort>[]=[];
  #heavyActive=0;#heavyWaiting:ReadWaiter<void>[]=[];
  private constructor(port:NativeDuckDBPort,readers:NativeDuckDBPort[],retainedLimits:readonly string[],maxQueuedReads:number){
    this.#port=port;this.#readers=readers;this.#available=[...readers];this.#retainedLimits=retainedLimits;
    this.#maxQueuedReads=maxQueuedReads;
  }
  static async open(options:NativeEntityStoreOptions={}):Promise<NativeEntityStore>{
    const count=options.readers===undefined?0:options.readers;
    if(!Number.isSafeInteger(count)||count<0||count>32)throw new TypeError('readers must be an integer in 0..32');
    const maxQueuedReads=options.maxQueuedReads===undefined?1024:options.maxQueuedReads;
    if(!Number.isSafeInteger(maxQueuedReads)||maxQueuedReads<0||maxQueuedReads>100000)
      throw new TypeError('maxQueuedReads must be an integer in 0..100000');
    const limits=options.retainedLimits;
    const retainedLimits=limits===undefined?[]:Object.freeze([integer(limits.maxFacts),integer(limits.maxBytes)]);
    const port=await NativeDuckDBPort.openWithOwner(options),readers:NativeDuckDBPort[]=[];
    try{
      for(let i=0;i<count;i++)readers.push(await port.forkReader());
      const store=new NativeEntityStore(port,readers,retainedLimits,maxQueuedReads);
      await store.revalidate();
      return store;
    }catch(primary){
      const writerErrors:unknown[]=[];
      try{await port.closeWriter();}catch(cleanup){writerErrors.push(cleanup);}
      const cleanup=await Promise.allSettled(readers.map(reader=>reader.close()));
      if(port.writerRetired())cleanup.push(...await Promise.allSettled([port.close()]));
      const errors=[...writerErrors,...cleanup.flatMap(result=>result.status==='rejected'?[result.reason]:[])];
      if(errors.length)throw new AggregateError([primary,...errors],'Native reader initialization cleanup failed',{cause:primary});
      throw primary;
    }
  }
  #run<T>(work:()=>Promise<T>):Promise<T>{
    if(this.#closed)return Promise.reject(new Error('Native entity store is closed'));
    if(this.#revalidation)return Promise.reject(new NativeCommandError('TD_E_QUERY_BUSY',new Error('TD_E_QUERY_BUSY: ownership revalidation is in progress')));
    try{this.#port.checkInstance();}catch(error){return Promise.reject(error);}
    if(!this.#ownerReady)
      return Promise.reject(new NativeCommandError('TD_E_OWNER_PROBE_INVALID',new Error('TD_E_OWNER_PROBE_INVALID: native store requires successful revalidation')));
    const result=this.#tail.then(async()=>{const value=await work();this.#port.checkInstance();return value;});
    this.#tail=result.then(()=>undefined,()=>undefined);return result;
  }
  #acquire(invocation?:QueryInvocation):Promise<NativeDuckDBPort>{
    this.#port.checkInstance();
    invocation?.check();
    const reader=this.#available.shift();
    if(reader){this.#leased.add(reader);return Promise.resolve(reader);}
    if(!this.#readers.some(port=>port.status()==='ready'))return Promise.reject(new Error('Native reader pool is fenced'));
    return queueWait(this.#waiting,invocation);
  }
  #release(port:NativeDuckDBPort):void{
    this.#leased.delete(port);
    try{this.#port.checkInstance();}
    catch(error){for(const waiting of this.#waiting.splice(0))waiting.reject(error as Error);return;}
    if(port.status()==='ready'){
      const next=this.#waiting.shift();
      if(next){this.#leased.add(port);next.resolve(port);}else this.#available.push(port);
    }else if(!this.#readers.some(reader=>reader.status()==='ready')){
      for(const waiting of this.#waiting.splice(0))waiting.reject(new Error('Native reader pool is fenced'));
    }
  }
  #acquireHeavy(invocation:QueryInvocation):Promise<void>{
    invocation.check();
    if(this.#heavyActive<this.#readers.length){
      this.#heavyActive++;return Promise.resolve();
    }
    return queueWait(this.#heavyWaiting,invocation);
  }
  #releaseHeavy():void{
    const next=this.#heavyWaiting.shift();
    if(next)next.resolve();else this.#heavyActive--;
  }
  #read<T>(work:(port:NativeDuckDBPort)=>Promise<T>):Promise<T>{return this.#admitRead(work);}
  #queryRead<T>(options:QueryControls,work:(port:NativeDuckDBPort,controls:QueryControls)=>Promise<T>):Promise<T>{
    return this.#admitRead(work,options);
  }
  #admitRead<T>(work:(port:NativeDuckDBPort,controls:QueryControls)=>Promise<T>,options?:QueryControls):Promise<T>{
    if(this.#closed)return Promise.reject(new Error('Native entity store is closed'));
    if(this.#revalidation)return Promise.reject(new NativeCommandError('TD_E_QUERY_BUSY',new Error('TD_E_QUERY_BUSY: ownership revalidation is in progress')));
    try{this.#port.checkInstance();}catch(error){return Promise.reject(error);}
    if(!this.#ownerReady)
      return Promise.reject(new NativeCommandError('TD_E_OWNER_PROBE_INVALID',new Error('TD_E_OWNER_PROBE_INVALID: native store requires successful revalidation')));
    if(this.#readers.length&&this.#reads.size>=this.#readers.length+this.#maxQueuedReads)
      return Promise.reject(new NativeCommandError('TD_E_QUERY_BUSY',new Error('TD_E_QUERY_BUSY: pooled read admission is full')));
    let invocation:QueryInvocation|undefined;
    try{if(options)invocation=new QueryInvocation(options);}catch(error){return Promise.reject(error);}
    // Capture at invocation, before FIFO admission: later writes cannot extend it.
    const priorWrites=this.#tail;
    const execute=async(port:NativeDuckDBPort)=>{
      try{
        const value=await work(port,invocation?.controls()??{});
        this.#port.checkInstance();invocation?.check();
        return value;
      }catch(cause){throw invocation?invocation.rejected(cause,port):cause;}
    };
    if(!this.#readers.length){
      let started=false;
      const result=priorWrites.then(()=>{started=true;return execute(this.#port);}).finally(()=>invocation?.finish());
      this.#tail=result.then(()=>undefined,()=>undefined);
      return invocation?invocation.notifyQueued(result,()=>started,()=>this.#port.checkInstance()):result;
    }
    let started=false;
    const result=(async()=>{
      let admitted=false;
      try{
        if(invocation){await this.#acquireHeavy(invocation);admitted=true;}
        // Keep the drain tracked until this barrier settles, even if a queued
        // caller is notified of cancellation first. Repeated aborted calls
        // cannot accumulate uncounted continuations on a blocked writer.
        await priorWrites;
        const port=await this.#acquire(invocation);
        try{started=true;return await execute(port);}finally{this.#release(port);}
      }finally{if(admitted)this.#releaseHeavy();invocation?.finish();}
    })();
    this.#reads.add(result);
    result.then(()=>this.#reads.delete(result),()=>this.#reads.delete(result));
    return invocation?invocation.notifyQueued(result,()=>started,()=>this.#port.checkInstance()):result;
  }
  async #call(sql:string,params:readonly unknown[]=[],port=this.#port):Promise<SqlRows>{
    try{return await port.runNative({name:'native_entity',sql,params});}
    catch(cause){
      throw commandError(cause);
    }
  }
  async #writerCall(sql:string,params:readonly unknown[]=[]):Promise<SqlRows>{
    try{return await this.#port.runWriter({name:'native_entity_writer',sql,params});}
    catch(cause){throw commandError(cause);}
  }
  #decodeWriter<T>(decode:()=>T):T{
    try{return decode();}catch(cause){throw commandError(this.#port.writerDeliveryError(cause));}
  }
  defineSchema(dsl:string):Promise<SchemaReceipt>{return this.#run(async()=>{
    await this.#writerCall('SELECT system.main.td_schema_ir_v2(?)',[dsl]);
    const rows=await this.#writerCall('PRAGMA td_define_schema_v2('+quote(dsl)+')');
    return this.#decodeWriter(()=>{const r=rows[0];
      if(rows.length!==1||r?.length!==3)throw new Error('Malformed native schema receipt');
      return Object.freeze({name:text(r[0]),version:Number(bigint(r[1])),hash:text(r[2])});});
  });}
  async put(request:EntityPut):Promise<EntityReceipt>{
    return this.putRecord({...request,record:encodeSchemaRecord(request.fields)});
  }
  putRecord(request:Omit<EntityPut,'fields'>&{readonly record:string}):Promise<EntityReceipt>{return this.#run(async()=>{
    const entry=this.#retainedLimits.length?'td_put_entity_with_limits_v2':'td_put_entity_v2';
    const rows=await this.#writerCall('PRAGMA '+entry+'('+[quote(request.schema),integer(request.version),quote(request.type),
      quote(request.entityId),quote(request.commandId),quote(request.record),integer(request.validFrom),integer(request.validTo),...this.#retainedLimits].join(',')+')');
    return this.#decodeWriter(()=>{const result=receipt(rows);if(!result)throw new Error('Native command produced no receipt');return result;});
  });}
  async patch(request:EntityPut):Promise<EntityReceipt>{
    return this.patchRecord({...request,record:encodeSchemaRecord(request.fields)});
  }
  /** Complete-record replacement inside the supplied half-open valid interval. */
  patchRecord(request:Omit<EntityPut,'fields'>&{readonly record:string}):Promise<EntityReceipt>{return this.#run(async()=>{
    const entry=this.#retainedLimits.length?'td_patch_entity_with_limits_v2':'td_patch_entity_v2';
    const rows=await this.#writerCall('PRAGMA '+entry+'('+[quote(request.schema),integer(request.version),quote(request.type),
      quote(request.entityId),quote(request.commandId),quote(request.record),integer(request.validFrom),integer(request.validTo),...this.#retainedLimits].join(',')+')');
    return this.#decodeWriter(()=>{const result=receipt(rows);if(!result)throw new Error('Native command produced no receipt');return result;});
  });}
  batch(request:EntityBatch):Promise<EntityBatchReceipt>{
    return this.#batch(request,request.members,index=>encodeSchemaRecord(request.members[index]!.fields));
  }
  /** One native command and one knowledge position for all supplied entities. */
  batchRecords(request:EntityBatchRecords):Promise<EntityBatchReceipt>{
    return this.#batch(request,request.members,index=>request.members[index]!.record);
  }
  #batch(request:Pick<EntityBatch,'schema'|'version'|'commandId'>,
    members:readonly Omit<EntityBatchMember,'fields'>[],recordAt:(index:number)=>string):Promise<EntityBatchReceipt>{return this.#run(async()=>{
    if(!Array.isArray(members)||members.length<1||members.length>32)
      throw new NativeCommandError('TD_E_COMMAND_LIMIT',new Error('TD_E_COMMAND_LIMIT: batch requires one to 32 members'));
    const encoded:string[]=[];let bytes=2;
    for(let index=0;index<members.length;index++){
      const member=members[index]!,record=recordAt(index);
      if(typeof record!=='string')throw new TypeError('Native batch record requires text');
      if(record.length>65536||Buffer.byteLength(record)>65536)
        throw new NativeCommandError('TD_E_COMMAND_LIMIT',new Error('TD_E_COMMAND_LIMIT: record byte admission exceeded'));
      const item=JSON.stringify({operation:member.operation,type:inputText(member.type),entityId:inputText(member.entityId),
        record:inputText(record),validFrom:integer(member.validFrom),validTo:integer(member.validTo)});
      bytes+=Buffer.byteLength(item)+(index?1:0);
      if(bytes>98304)
        throw new NativeCommandError('TD_E_COMMAND_LIMIT',new Error('TD_E_COMMAND_LIMIT: batch JSON exceeds 96 KiB'));
      encoded.push(item);
    }
    const json='['+encoded.join(',')+']';
    const rowsByRevision=await this.#writerCall(
      'SELECT CASE WHEN system.main.td_owner_probe_validated_check() THEN revision END '+
      'FROM td_catalog_v1.catalog_revision WHERE singleton');
    const revision=rowsByRevision[0]?.[0];
    this.#decodeWriter(()=>{if(rowsByRevision.length!==1||(revision!==2n&&revision!==3n))throw new Error('Malformed native catalog revision');});
    const initial=revision===2n;
    const entry='td_batch_entities'+(initial?'_initial':'')+(this.#retainedLimits.length?'_with_limits':'');
    const rows=await this.#writerCall('PRAGMA '+entry+'('+[quote(request.schema),integer(request.version),quote(request.commandId),
      quote(json),...this.#retainedLimits].join(',')+')');
    return this.#decodeWriter(()=>{const result=batchReceipt(rows);if(!result)throw new Error('Native batch produced no receipt');return result;});
  });}
  batchReceipt(commandId:string):Promise<EntityBatchReceipt|null>{
    return this.#read(async port=>batchReceipt(await this.#call('PRAGMA td_batch_receipt('+quote(commandId)+')',[],port)));
  }
  receipt(commandId:string):Promise<EntityReceipt|null>{return this.#read(async port=>receipt(await this.#call('PRAGMA td_entity_receipt('+quote(commandId)+')',[],port)));}
  history(entityId:string):Promise<readonly EntityAssertion[]>{return this.#read(async port=>assertions(await this.#call('PRAGMA td_entity_history_v2('+quote(entityId)+')',[],port)));}
  at(entityId:string,cuts:{readonly knownAt:bigint;readonly validAt:bigint}):Promise<readonly EntityAssertion[]>{
    return this.#read(async port=>assertions(await this.#call('PRAGMA td_entity_at_v2('+[quote(entityId),integer(cuts.knownAt),integer(cuts.validAt)].join(',')+')',[],port)));
  }
  presenceAt(entityId:string,cuts:{readonly knownAt:bigint;readonly validAt:bigint}):Promise<boolean|null>{
    return this.#read(async port=>{
      const rows=await this.#call('PRAGMA td_entity_presence_at('+[quote(entityId),integer(cuts.knownAt),integer(cuts.validAt)].join(',')+')',[],port);
      const value=rows[0]?.[0];
      if(rows.length!==1||rows[0]?.length!==1||value!==null&&typeof value!=='boolean')
        throw new Error('Malformed native entity presence');
      return value;
    });
  }
  query(program:string,options:NativeQueryOptions):Promise<NativeQueryResult>{return this.#queryRead(options,async(port,controls)=>{
    if(options.forceNative!==undefined&&typeof options.forceNative!=='boolean')throw new TypeError('forceNative encoding requires boolean');
    const execute=async(call:(sql:string,params?:readonly unknown[],reuse?:boolean)=>Promise<SqlRows>,token?:bigint,poll?:()=>void)=>{
      const source=quote(program);
      let route=options.forceNative?1:0;
      if(options.forceNative===undefined){
        const hint=await call('SELECT CASE WHEN system.main.td_owner_probe_validated_check() THEN system.main.td_prefer_native_v1(retained_count) END FROM main.storage_usage WHERE singleton');
        if(hint.length!==1||typeof hint[0]?.[0]!=='boolean')throw new Error('Malformed native cost hint');
        if(hint[0][0])route=2;
      }
      const numeric=[integer(options.validAt),integer(options.knownAt??-1n),integer(options.maxFacts??100000),
        integer(options.maxRounds??1000),integer(options.maxWork??5000000),integer(options.deadlineMs??1000)];
      if(token){
        const compiled=await call('SELECT system.main.td_query_store_values_sql_v2(?,?,?,?,?,?,?,?)',[program,...numeric.map(v=>BigInt(v)),BigInt(route)]);
        const row=compiled[0];
        if(compiled.length!==1||row?.length!==1||row[0]!==null&&typeof row[0]!=='string')throw new Error('Malformed native query template');
        if(typeof row[0]==='string')return queryResult(await call(row[0],[token],true),poll);
      }
      return queryResult(await call('PRAGMA td_query_store_values_v2('+[source,...numeric,
        integer(token??0n),integer(route)].join(',')+')'),poll);
    };
    if(controls.timeoutMs===undefined&&controls.signal===undefined)return execute((sql,params=[])=>this.#call(sql,params,port));
    try{return await port.withNativeQueryControl(controls,async control=>{
      const result=await execute((sql,params=[],reuse=false)=>control.run({name:'controlled_native_query',sql,params,...(reuse?{reuse:true}:{})}),control.token,control.check);
      control.check();return result;
    });}catch(cause){throw commandError(cause);}
  });}
  queryIntervals(program:string,options:NativeIntervalQueryOptions):Promise<NativeIntervalQueryResult>{return this.#queryRead(
    {timeoutMs:options.timeoutMs??5000,...(options.signal===undefined?{}:{signal:options.signal})},async(port,controls)=>{
    const args=[quote(program),integer(options.validFrom),integer(options.validTo),integer(options.knownAt??-1n),
      integer(options.maxSegments??32),integer(options.maxFacts??100000),integer(options.maxRounds??1000),
      integer(options.maxWork??500000)];
    try{return await port.withNativeQueryControl(controls,async control=>{
      const rows=await control.run({name:'native_query_intervals',params:[],
        sql:'PRAGMA td_query_store_intervals_v1('+[...args,integer(control.token)].join(',')+')'});
      if(rows[0]?.length!==4)throw new Error('Malformed native interval query result');
      const position=bigint(rows[0][0]),intervals=[];
      for(const row of rows){
        if((intervals.length&1023)===0)control.check();
        if(row.length!==4||row[0]!==position)throw new Error('Incoherent native interval query metadata');
        if(row[3]===null){
          if(rows.length!==1||row[1]!==null||row[2]!==null)throw new Error('Malformed empty native interval answer');
          continue;
        }
        const validFrom=bigint(row[1]),validTo=bigint(row[2]);
        if(validFrom<options.validFrom||validFrom>=validTo||validTo>options.validTo)
          throw new Error('Malformed native answer interval');
        intervals.push(Object.freeze({validFrom,validTo,values:Object.freeze(queryTuple(row[3]))}));
      }
      return Object.freeze({position,intervals:Object.freeze(intervals)});
    });}catch(cause){throw commandError(cause);}
  });}
  queryCuts(program:string,options:NativeQueryCutsOptions):Promise<readonly NativeCutAnswer[]>{return this.#queryRead(
    {timeoutMs:options.timeoutMs??5000,...(options.signal===undefined?{}:{signal:options.signal})},async(port,controls)=>{
    if(options.cuts.length<1||options.cuts.length>16)
      throw new NativeCommandError('TD_E_QUERY_MULTI_LIMIT',new Error('TD_E_QUERY_MULTI_LIMIT: multi-cut requires 1..16 cuts'));
    const cuts=options.cuts.map(({validAt,knownAt})=>({validAt,knownAt}));
    const packed=cuts.map(cut=>integer(cut.validAt)+','+integer(cut.knownAt??-1n)).join(';');
    const args=[quote(program),quote(packed),integer(options.maxFacts??100000),integer(options.maxRounds??1000),
      integer(options.maxWork??500000)];
    try{return await port.withNativeQueryControl(controls,async control=>{
      const wire=await control.run({name:'native_query_cuts',params:[],
        sql:'PRAGMA td_query_store_cuts_v1('+[...args,integer(control.token)].join(',')+')'});
      const answers:NativeCutAnswer[]=[];
      let offset=0;
      for(const cut of cuts){
        const ordinal=BigInt(answers.length),first=wire[offset];
        if(first?.length!==4||first[0]!==ordinal||first[1]!==cut.validAt)
          throw new Error('Malformed native cut query metadata');
        const position=bigint(first[2]),rows:(readonly NativeQueryValue[])[]=[];
        if(cut.knownAt!==undefined&&cut.knownAt!==-1n&&position!==cut.knownAt)
          throw new Error('Incoherent native knowledge cut');
        do{
          if((offset&1023)===0)control.check();
          const row=wire[offset++];
          if(row?.length!==4||row[1]!==cut.validAt||row[2]!==position)
            throw new Error('Incoherent native cut query metadata');
          if(row[3]===null){
            if(rows.length!==0||wire[offset]?.[0]===ordinal)throw new Error('Malformed empty native cut answer');
          }else rows.push(Object.freeze(queryTuple(row[3])));
        }while(wire[offset]?.[0]===ordinal);
        answers.push(Object.freeze({validAt:cut.validAt,position,rows:Object.freeze(rows)}));
      }
      if(offset!==wire.length)throw new Error('Unexpected native cut answer ordinal');
      control.check();
      return Object.freeze(answers);
    });}catch(cause){throw commandError(cause);}
  });}
  queryLookupAt(driver:string,options:NativeLookupOptions):Promise<NativeQueryResult>{return this.#queryRead(
    {timeoutMs:options.timeoutMs??5000,...(options.signal===undefined?{}:{signal:options.signal})},async(port,controls)=>{
    const args=[quote(driver),quote(options.attribute),integer(options.validAt),integer(options.knownAt??-1n),
      integer(options.maxInputFacts??100000),integer(options.maxCandidates??100000)];
    try{return await port.withNativeQueryControl(controls,async control=>{
      const wire=await control.run({name:'native_temporal_lookup',params:[],
        sql:'PRAGMA td_query_store_lookup_v1('+[...args,integer(control.token)].join(',')+')'});
      return queryResult(wire,control.check);
    });}catch(cause){throw commandError(cause);}
  });}
  queryScalable(program:string,options:NativeScalableQueryOptions):Promise<NativeQueryResult>{return this.#queryRead(options,async(port,controls)=>{
    const entry='td_query_store_scalable_v2';
    const numeric=[integer(options.validAt),integer(options.knownAt??-1n),integer(options.maxInputFacts??10000000),
      integer(options.maxIntermediateRows??10000000),integer(options.maxIntermediateBytes??536870912),
      integer(options.maxOutputRows??100000),integer(options.maxOutputBytes??16777216)];
    const execute=async(call:(sql:string,params?:readonly unknown[],reuse?:boolean)=>Promise<SqlRows>,token=0n,poll?:()=>void)=>{
      if(token){
        const compiled=await call('SELECT system.main.td_query_store_scalable_sql_v2(?,?,?,?,?,?,?,?)',[program,...numeric.map(v=>BigInt(v))]);
        const row=compiled[0];
        if(compiled.length!==1||row?.length!==1||row[0]!==null&&typeof row[0]!=='string')throw new Error('Malformed scalable query template');
        if(typeof row[0]==='string')return queryResult(await call(row[0],[token],true),poll);
      }
      return queryResult(await call('PRAGMA '+entry+'('+[quote(program),...numeric,integer(token)].join(',')+')'),poll);
    };
    if(controls.timeoutMs===undefined&&controls.signal===undefined)return execute((sql,params=[])=>this.#call(sql,params,port));
    try{return await port.withNativeQueryControl(controls,control=>execute(
        (sql,params=[],reuse=false)=>control.run({name:'scalable_native_query',sql,params,...(reuse?{reuse:true}:{})}),control.token,control.check));
    }catch(cause){throw commandError(cause);}
  });}
  revalidate():Promise<void>{
    if(this.#closed)return Promise.reject(new Error('Native entity store is closed'));
    if(this.#revalidation)return Promise.reject(new NativeCommandError('TD_E_QUERY_BUSY',new Error('TD_E_QUERY_BUSY: ownership revalidation is in progress')));
    this.#ownerReady=false;
    this.#revalidation=Promise.allSettled([this.#tail,...this.#reads]).then(async()=>{
      await this.#port.activateOwnership(this.#readers);
      this.#ownerReady=true;
    }).catch(cause=>{throw commandError(cause);}).finally(()=>{this.#revalidation=undefined;});
    return this.#revalidation;
  }
  /** waiting counts lease waiters. Reads awaiting a prior write also consume admission capacity. */
  readerStats():Readonly<{capacity:number;available:number;active:number;waiting:number}>{
    return Object.freeze({capacity:this.#readers.length,available:this.#available.length,
      active:this.#leased.size,waiting:this.#waiting.length});
  }
  resourceStats():Promise<Readonly<{memoryBytes:bigint;temporaryStorageBytes:bigint}>>{
    return this.#run(async()=>{
      const rows=await this.#writerCall('SELECT coalesce(sum(memory_usage_bytes),0)::BIGINT, coalesce(sum(temporary_storage_bytes),0)::BIGINT FROM system.main.duckdb_memory() HAVING system.main.td_owner_probe_validated_check()');
      return this.#decodeWriter(()=>{
        if(rows.length!==1||rows[0]?.length!==2)throw new Error('Malformed DuckDB resource statistics');
        return Object.freeze({memoryBytes:bigint(rows[0][0]),temporaryStorageBytes:bigint(rows[0][1])});});
    });
  }
  close():Promise<void>{
    if(!this.#close){
      this.#closed=true;
      this.#close=Promise.allSettled([this.#tail,...this.#reads,...(this.#revalidation?[this.#revalidation]:[])]).then(async()=>{
        this.#available=[];
        const writerErrors:unknown[]=[];
        try{await this.#port.closeWriter();}catch(error){writerErrors.push(error);}
        const results=await Promise.allSettled(this.#readers.map(port=>port.close()));
        if(this.#port.writerRetired())results.push(...await Promise.allSettled([this.#port.close()]));
        const errors=[...writerErrors,...results.flatMap(result=>result.status==='rejected'?[result.reason]:[])];
        if(errors.length===1)throw errors[0];
        if(errors.length)throw new AggregateError(errors,'Native store cleanup failed');
      }).catch(error=>{this.#close=undefined;throw error;});
    }
    return this.#close;
  }
}
