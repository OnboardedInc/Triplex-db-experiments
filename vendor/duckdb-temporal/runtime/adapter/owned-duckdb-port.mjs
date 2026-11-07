import { spawn } from 'node:child_process';

const MAX_FRAME = 16 * 1024 * 1024;
const frameDecoder=new TextDecoder('utf-8',{fatal:true});
const own = (x,k) => Object.hasOwn(x,k);
const fail = (code, message) => { throw new DuckDBPortError(code,message); };
export class DuckDBPortError extends Error {
  constructor(code,message) { super(message); this.name='DuckDBPortError'; this.code=code; }
}
export class DuckDBSqlError extends DuckDBPortError {
  constructor(type) { super('SQL_REJECTED','DuckDB rejected the statement'); this.name='DuckDBSqlError'; this.sqlType=type; }
}
function encode(value) {
  if(value===null) return ['null'];
  if(typeof value==='boolean') return ['bool',value];
  if(typeof value==='bigint' && value>=-9223372036854775808n && value<=9223372036854775807n) return ['i64',String(value)];
  if(typeof value==='number' && Number.isFinite(value)){const view=new DataView(new ArrayBuffer(8));view.setFloat64(0,value===0?0:value,false);return ['f64',view.getBigUint64(0,false).toString(16).padStart(16,'0')];}
  if(typeof value==='string' && value.isWellFormed() && !value.includes('\0') && value.length<=1048576) return ['str',value];
  fail('PARAMETER','Unsupported typed wire parameter');
}
function decode(cell) {
  if(!Array.isArray(cell) || ![1,2].includes(cell.length)) fail('PROTOCOL','Invalid typed wire cell');
  const [tag,value]=cell;
  if(tag==='null' && cell.length===1) return null;
  if(cell.length!==2) fail('PROTOCOL','Invalid typed wire cell arity');
  if(tag==='bool' && typeof value==='boolean') return value;
  if(tag==='str' && typeof value==='string' && value.isWellFormed() && !value.includes('\0') && value.length<=1048576) return value;
  if(tag==='i64' && typeof value==='string' && /^(?:0|-?[1-9][0-9]*)$/.test(value) && value.length<=20) {
    const integer=BigInt(value);
    if(String(integer)===value && integer>=-9223372036854775808n && integer<=9223372036854775807n) return integer;
  }
  if(tag==='f64' && typeof value==='string' && value.length===16 && /^[0-9a-f]{16}$/.test(value)){
    const view=new DataView(new ArrayBuffer(8));view.setBigUint64(0,BigInt('0x'+value),false);const number=view.getFloat64(0,false);
    if(Number.isFinite(number))return number===0?0:number;
  }
  fail('PROTOCOL','Unsupported typed wire cell');
}
function record(value,keys) {
  return value!==null && typeof value==='object' && !Array.isArray(value) && Object.keys(value).length===keys.length && keys.every(k=>own(value,k));
}

/** Exclusive fresh Python-owned DuckDB connection; no automatic RPC replay. */
export class OwnedDuckDBPort {
  #child; #state='starting'; #next=1; #pending=null; #buffer=Buffer.alloc(0); #stderr=Buffer.alloc(0);
  #ready; #readyResolve; #readyReject; #exit; #closePromise=null; #closeAck=false; #action; #trace=[]; #columns=new WeakMap();
  constructor(options) {
    this.#action=options.actionHash;
    this.#ready=new Promise((resolve,reject)=>{this.#readyResolve=resolve;this.#readyReject=reject;});
    this.#child=spawn(options.python,['-u',options.worker,options.database??':memory:'],{cwd:options.cwd,env:process.env,stdio:['pipe','pipe','pipe']});
    this.#child.stdout.on('data',chunk=>{
      try {
        this.#buffer=Buffer.concat([this.#buffer,chunk]);
        if(this.#buffer.length>MAX_FRAME) fail('PROTOCOL','Worker frame limit exceeded');
        let index;
        while((index=this.#buffer.indexOf(10))!==-1) {
          const frame=this.#buffer.subarray(0,index);this.#buffer=this.#buffer.subarray(index+1);
          this.#frame(JSON.parse(frameDecoder.decode(frame)));
        }
      } catch(error) { this.#fail(error); }
    });
    this.#child.stderr.on('data',chunk=>{
      this.#stderr=Buffer.concat([this.#stderr,chunk]);
      if(this.#stderr.length>8192) this.#fail(new DuckDBPortError('WORKER_STDERR','Unexpected worker diagnostics'));
    });
    this.#child.on('error',()=>this.#fail(new DuckDBPortError('WORKER_START','Worker could not start')));
    this.#child.stdin.on('error',()=>this.#fail(new DuckDBPortError('WRITE_UNKNOWN','Worker pipe failed')));
    this.#exit=new Promise(resolve=>this.#child.on('close',(code,signal)=>{
      const outcome={code,signal};
      if(!(this.#closeAck && this.#state==='closing' && code===0 && signal===null && this.#buffer.length===0 && this.#stderr.length===0)) this.#fail(new DuckDBPortError('WORKER_EXIT','Worker terminated without a clean acknowledged close'));
      resolve(outcome);
    }));
    Object.freeze(this);
  }
  static async open(options) { const port=new OwnedDuckDBPort(options);await port.#ready;return port; }
  #fail(error) {
    const failure=error instanceof DuckDBPortError?error:new DuckDBPortError('PROTOCOL','Malformed worker response');
    this.#state='fenced';this.#readyReject(failure);
    const pending=this.#pending;this.#pending=null;if(pending)pending.reject(failure);
    this.#child.stdin.end();
  }
  #frame(frame) {
    if(this.#state==='starting') {
      if(!record(frame,['v','kind','action','runtime']) || frame.v!==3 || frame.kind!=='ready' || frame.action!==this.#action || frame.runtime!=='2.0.0') fail('PROTOCOL','Invalid worker ready acknowledgment');
      this.#state='ready';this.#readyResolve();return;
    }
    const pending=this.#pending;
    if(!pending || !record(frame,frame.ok===true?['v','kind','id','ok','rows','columns']:['v','kind','id','ok','error']) || frame.v!==3 || frame.kind!=='response' || frame.id!==pending.id || typeof frame.ok!=='boolean') fail('PROTOCOL','Invalid worker operation acknowledgment');
    if(frame.ok) {
      if(!Array.isArray(frame.rows)||!Array.isArray(frame.columns)||frame.columns.some(name=>typeof name!=='string'||!name.length||!name.isWellFormed()||name.includes('\0'))) fail('PROTOCOL','Expected complete row/column arrays');
      if(frame.rows.some(row=>!Array.isArray(row)||row.length!==frame.columns.length))fail('PROTOCOL','Row/column arity mismatch');
      const rows=Object.freeze(frame.rows.map(row=>{if(!Array.isArray(row))fail('PROTOCOL','Expected complete row');return Object.freeze(row.map(decode));}));
      this.#columns.set(rows,Object.freeze([...frame.columns]));
      this.#pending=null;if(pending.op==='close')this.#closeAck=true;
      this.#trace.push(Object.freeze({id:pending.id,op:pending.op,name:pending.name,ok:true,rows:rows.length}));pending.resolve(rows);
    } else {
      if(typeof frame.error!=='string' || !/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(frame.error)) fail('PROTOCOL','Invalid SQL rejection type');
      this.#pending=null;this.#trace.push(Object.freeze({id:pending.id,op:pending.op,name:pending.name,ok:false,error:frame.error}));pending.reject(new DuckDBSqlError(frame.error));
    }
  }
  #request(op,name,sql=null,params=[]) {
    if(this.#pending || (this.#state!=='ready' && !(op==='close' && this.#state==='closing'))) return Promise.reject(new DuckDBPortError('FENCED','Physical connection is not ready'));
    if(typeof name!=='string' || !name.length || name.length>128 || !Array.isArray(params) || params.length>1024) return Promise.reject(new DuckDBPortError('PLAN','Invalid physical statement plan'));
    let encoded;
    try { encoded=params.map(encode); } catch(error) { return Promise.reject(error); }
    const id=this.#next;
    const data=JSON.stringify({v:3,id,op,name,sql,params:encoded})+'\n';
    if(Buffer.byteLength(data)>MAX_FRAME) return Promise.reject(new DuckDBPortError('FRAME_LIMIT','Statement exceeds selected frame profile'));
    this.#next++;
    return new Promise((resolve,reject)=>{
      this.#pending={id,op,name,resolve,reject};
      this.#child.stdin.write(data,'utf8',error=>{if(error)this.#fail(new DuckDBPortError('WRITE_UNKNOWN','Worker write was not acknowledged'));});
    });
  }
  begin() { return this.#request('begin','begin'); }
  run(plan) {
    if(!plan || typeof plan.sql!=='string' || !plan.sql.length || plan.sql.length>65536 || plan.sql.includes('\0')) return Promise.reject(new DuckDBPortError('PLAN','Invalid SQL plan'));
    return this.#request('run',plan.name,plan.sql,plan.params);
  }
  commit() { return this.#request('commit','commit'); }
  rollback() { return this.#request('rollback','rollback'); }
  close() {
    if(this.#closePromise)return this.#closePromise;
    if(this.#pending)return Promise.reject(new DuckDBPortError('BUSY','Cannot close an in-flight physical operation'));
    this.#closePromise=(async()=>{
      if(this.#state!=='ready') { this.#child.stdin.end();throw new DuckDBPortError('CLOSE_UNKNOWN','Physical close cannot be acknowledged'); }
      this.#state='closing';await this.#request('close','close');
      const result=await this.#exit;
      if(result.code!==0 || result.signal!==null || !this.#closeAck || this.#buffer.length || this.#stderr.length) throw new DuckDBPortError('CLOSE_UNKNOWN','Worker close did not complete cleanly');
      this.#state='closed';
    })();
    return this.#closePromise;
  }
  columnsFor(rows){if(!this.#columns.has(rows))fail('ROW_OWNER','Rows do not belong to this port');return this.#columns.get(rows);}
  trace() { return Object.freeze([...this.#trace]); }
  status() { return this.#state; }
}

/** Canonical typed scalar codec; finite DOUBLE uses exact IEEE754 bits. */
export const parameterWire=Object.freeze({encode,decode});
