import { createHash } from 'node:crypto';
import { MAX_STATEMENT_PARAMETERS,TransactionOwner,statementPlan,appendPlan } from './transaction-owner.mjs';
const fields=['id','entity_id','attribute','value_type','value_string','value_number','value_boolean','value_datetime','value_json','recorded_at','recorded_position','valid_from','valid_to','created_by','retracted_at','retracted_position','retract_tx_id','entity_type','schema_version','tx_id'];
const base='td_triplex_public_v1.';
export class PublicBackendError extends Error{constructor(code,message){super(message);this.name='PublicBackendError';this.code=code;}}
const fail=(code,message)=>{throw new PublicBackendError(code,message);};
const ensure=(ok,message='Malformed public SQL result')=>{if(!ok)fail('ROW',message);};
const own=(x,k)=>Object.hasOwn(x,k);
const variable=x=>typeof x==='object'&&x!==null&&x._tag==='Variable';
const text=(v,nonempty=false)=>{if(typeof v!=='string'||!v.isWellFormed()||v.includes('\0')||v.length>1048576||(nonempty&&!v.length))fail('TEXT','Unsupported public text');return v;};
const finite=v=>{if(typeof v!=='number'||!Number.isFinite(v))fail('NUMBER','Expected finite binary64');return v===0?0:v;};
const instant=v=>{v=finite(v);if(v<0)fail('TIME','Expected nonnegative instant');return v;};
const position=v=>{if(!Number.isSafeInteger(v)||v<0)fail('POSITION','Expected safe nonnegative commit position');return v;};
function jsonCopy(v,seen=new Set(),budget={n:0},depth=0){
 if(++budget.n>100000||depth>64)fail('JSON_LIMIT','JSON logical admission exceeded');
 if(v===null||typeof v==='boolean')return v;if(typeof v==='number')return finite(v);
 if(typeof v==='string'){if(!v.isWellFormed())fail('JSON','Malformed JSON text');return v;}
 if(typeof v!=='object'||seen.has(v))fail('JSON','Unsupported JSON value');
 const array=Array.isArray(v),proto=Object.getPrototypeOf(v);if(array?proto!==Array.prototype:![Object.prototype,null].includes(proto))fail('JSON','Expected ordinary JSON data');
 const ds=Object.getOwnPropertyDescriptors(v);for(const k of Reflect.ownKeys(ds))if(typeof k!=='string'||!own(ds[k],'value')||(!ds[k].enumerable&&!(array&&k==='length')))fail('JSON','Unsupported JSON property');
 seen.add(v);try{if(array){const n=ds.length.value;if(Object.keys(ds).length!==n+1)fail('JSON','Sparse/decorated array');const out=[];for(let i=0;i<n;i++){if(!own(ds,i))fail('JSON','Sparse JSON');out.push(jsonCopy(ds[i].value,seen,budget,depth+1));}return out;}
 const out=Object.create(null);for(const k of Object.keys(ds)){if(!k.isWellFormed())fail('JSON','Malformed key');Object.defineProperty(out,k,{value:jsonCopy(ds[k].value,seen,budget,depth+1),enumerable:true});}return out;}finally{seen.delete(v);}
}
function pack(value){
 if(!value||typeof value!=='object')fail('VALUE','Expected typed value');
 const out={value_type:value.type,value_string:null,value_number:null,value_boolean:null,value_datetime:null,value_json:null};
 switch(value.type){
  case 'string':case 'ref':out.value_string=text(value.value,value.type==='ref');break;
  case 'number':out.value_number=finite(value.value);break;
  case 'datetime':out.value_datetime=finite(value.value);break;
  case 'boolean':if(typeof value.value!=='boolean')fail('VALUE','Expected boolean');out.value_boolean=value.value?1:0;break;
  case 'json':out.value_json=JSON.stringify(jsonCopy(value.value));break;
  case 'blob':{const size=position(value.size);out.value_string=text(value.value);out.value_json=JSON.stringify({mimeType:text(value.mimeType),size,...(own(value,'filename')?{filename:text(value.filename)}:{})});break;}
  default:fail('VALUE','Unsupported public tag');
 }
 if(out.value_json!==null)text(out.value_json);return out;
}
/** @internal Public input ownership and shape only; physical storage conversion is separate. */
export function buildRow(input,txId,timestamp,id,pos){
 if(!input||typeof input!=='object')fail('INPUT','Expected TripleInput');const value=pack(input.value),from=instant(input.validFrom??timestamp),to=input.validTo==null?null:instant(input.validTo);if(to!==null&&to<=from)fail('INTERVAL','Expected nonempty valid interval');
 return Object.freeze({id:text(id,true),entity_id:text(input.entityId,true),attribute:text(input.attribute),...value,recorded_at:instant(timestamp),recorded_position:position(pos),valid_from:from,valid_to:to,created_by:input.createdBy==null?null:text(input.createdBy),retracted_at:null,retracted_position:null,retract_tx_id:null,entity_type:input.entityType==null?null:text(input.entityType),schema_version:1,tx_id:txId===null?null:text(txId,true)});
}
const MAX_POSITION=9223372036854775807n;
const nativeInstant=(v)=>v===null?MAX_POSITION:(v>=9223372036854775808?MAX_POSITION:BigInt(Math.ceil(v)));
const floatBits=value=>{const bytes=Buffer.allocUnsafe(8);bytes.writeDoubleBE(value===0?0:value);return bytes.toString('hex');};
function bound(row){
 const kind={string:'str',boolean:'bool',number:'f64',ref:'ref',datetime:'datetime',json:'json',blob:'blob'}[row.value_type];
 const wire=row.value_type==='boolean'?row.value_boolean===1:
  ['number','datetime'].includes(row.value_type)?floatBits(row.value_type==='number'?row.value_number:row.value_datetime):
  row.value_type==='json'?row.value_json:row.value_string;
 const payload=JSON.stringify(wire);
 return [row.id,row.entity_id,row.attribute,kind,payload,nativeInstant(row.valid_from),nativeInstant(row.valid_to),
  BigInt(row.recorded_position),row.retracted_position===null?MAX_POSITION:BigInt(row.retracted_position),null,null,
  createHash('sha256').update(payload).digest('hex'),
  {string:1,boolean:2,number:4,ref:5,datetime:6,json:7,blob:8}[row.value_type],
  ['string','ref','json','blob'].includes(row.value_type)?wire:null,
  row.value_type==='boolean'?wire:null,null,['number','datetime'].includes(row.value_type)?(row.value_type==='number'?row.value_number:row.value_datetime):null,
  row.recorded_at,row.retracted_at,row.valid_from,row.valid_to,row.created_by,row.entity_type,row.tx_id,row.retract_tx_id,
  row.value_type==='blob'?row.value_json:null,'triplex',true];
}

function temporal(basis,params){
 if(basis===undefined)return ['retracted_at IS NULL'];const parts=[];instant(basis.validAt);
 if(basis.recordedPosition!==undefined){parts.push('recorded_position <= ?');params.push(BigInt(position(basis.recordedPosition)));}
 if(basis.recordedAt!==undefined){parts.push('recorded_at <= ?');params.push(instant(basis.recordedAt));}
 const retracted=['retracted_at IS NULL'];
 if(basis.recordedPosition!==undefined){retracted.push('retracted_position > ?');params.push(BigInt(position(basis.recordedPosition)));}
 if(basis.recordedAt!==undefined){retracted.push('retracted_at > ?');params.push(instant(basis.recordedAt));}
 parts.push('('+retracted.join(' OR ')+')','valid_from <= ?','(valid_to IS NULL OR valid_to > ?)');params.push(basis.validAt,basis.validAt);return parts;
}
function validateRow(row){
 ensure(Object.keys(row).length===fields.length&&fields.every(k=>own(row,k)));text(row.id,true);text(row.entity_id,true);text(row.attribute);instant(row.recorded_at);position(row.recorded_position);ensure(row.recorded_position>=1);instant(row.valid_from);ensure(row.valid_to===null||instant(row.valid_to)>row.valid_from);ensure(row.schema_version===1);
 for(const k of ['created_by','retract_tx_id','entity_type','tx_id'])if(row[k]!==null)text(row[k]);
 const inactive={string:['value_string'],ref:['value_string'],number:['value_number'],boolean:['value_boolean'],datetime:['value_datetime'],json:['value_json'],blob:['value_string','value_json']}[row.value_type];ensure(inactive!==undefined);
 for(const k of ['value_string','value_number','value_boolean','value_datetime','value_json'])ensure(inactive.includes(k)?row[k]!==null:row[k]===null);
 if(row.value_string!==null)text(row.value_string);if(row.value_number!==null)finite(row.value_number);if(row.value_datetime!==null)finite(row.value_datetime);if(row.value_boolean!==null)ensure(row.value_boolean===0||row.value_boolean===1);if(row.value_json!==null){text(row.value_json);jsonCopy(JSON.parse(row.value_json));}
 ensure((row.retracted_at===null&&row.retracted_position===null&&row.retract_tx_id===null)||(row.retracted_at!==null&&row.retracted_position!==null&&row.retract_tx_id!==null&&position(row.retracted_position)>=row.recorded_position));if(row.retracted_at!==null)instant(row.retracted_at);return Object.freeze(row);
}

/** Granular SQL backend for the pinned public row/transaction contract, no Effect import. */
export class PublicDuckDBBackend{
 #port;#owner;#scope;#tail=Promise.resolve();#closed=false;#ready=false;#initializing=null;#closePromise=null;
 constructor(port,scope){this.#port=port;this.#owner=new TransactionOwner(port);this.#scope=text(scope,true);Object.freeze(this);}
 #enqueue(work,initializing=false){if(this.#closed)return Promise.reject(new PublicBackendError('CLOSED','Backend closed'));if(!initializing&&!this.#ready)return Promise.reject(new PublicBackendError('INITIALIZE','Backend not initialized'));const op=this.#tail.then(work);this.#tail=op.then(()=>undefined,()=>undefined);return op;}
 #session(tx){
  let active=true;const run=async(name,sql,params=[])=>{if(!active)fail('CONTEXT_CLOSED','Transaction session expired');return tx.run(statementPlan({name,sql,params}));};
  const records=async(name,sql,params=[])=>{const rows=await run(name,sql,params),columns=this.#port.columnsFor(rows);ensure(new Set(columns).size===columns.length,'Duplicate result aliases');return Object.freeze(rows.map(row=>Object.freeze(Object.fromEntries(columns.map((name,i)=>{let value=row[i];if(typeof value==='bigint'){ensure(value>=-9007199254740991n&&value<=9007199254740991n,'Integer cannot be safely exposed to public Number');value=Number(value);}return[name,value];})))));};
  const readRows=async(name,sql,params=[])=>Object.freeze((await records(name,sql,params)).map(row=>validateRow(row)));
  const query=async(pattern={},basis)=>{const params=[],where=temporal(basis,params);for(const [key,column]of [['entityId','entity_id'],['attribute','attribute'],['entityType','entity_type']])if(pattern[key]!==undefined&&!variable(pattern[key])){where.push(column+'=?');params.push(text(pattern[key]));}
   if(pattern.value!==undefined&&!variable(pattern.value)){const packed=pack(pattern.value);where.push('value_type=?');params.push(packed.value_type);const key={string:'value_string',ref:'value_string',number:'value_number',boolean:'value_boolean',datetime:'value_datetime',json:'value_json',blob:'value_string'}[packed.value_type];where.push(key+'=?');params.push(packed[key]);}
   return readRows('public_query','SELECT * FROM '+base+'triples WHERE '+where.join(' AND ')+' ORDER BY recorded_at ASC,id ASC',params);
  };
  const insertRows=async(rows)=>{
   try{
   const nativeAppend=this.#port.supportsAppend?.()===true,chunkSize=nativeAppend?2048:32;
   for(let i=0;i<rows.length;){
    const chunk=[],canonical=[];let bytes=0;
    while(i<rows.length&&chunk.length<chunkSize){
      const next=bound(rows[i]);
      const size=next.reduce((sum,value)=>sum+(typeof value==='string'?Buffer.byteLength(value):8),0);
      if(chunk.length&&bytes+size>8*1024*1024)break;
      chunk.push(rows[i++]);canonical.push(next);bytes+=size;
    }
    const added=canonical.reduce((sum,row)=>sum+Buffer.byteLength(row[1])+Buffer.byteLength(row[2])+Buffer.byteLength(row[4])+(row[25]===null?0:Buffer.byteLength(row[25])),0);
    // Reserve before appending on the same caller transaction so a later chunk failure rolls back both.
    const reserved=await run('public_reserve_retained_usage',
      'UPDATE main.storage_usage SET retained_count=retained_count+$1::BIGINT,retained_bytes=retained_bytes+$2::BIGINT '+
      'WHERE singleton AND system.main.td_triplex_reserve_usage_v1(retained_count,retained_bytes,$1::BIGINT,$2::BIGINT) '+
      'RETURNING singleton',[BigInt(chunk.length),BigInt(added)]);
    ensure(reserved.length===1&&reserved[0].length===1&&reserved[0][0]===true,'Shared retained storage admission exceeded');
    const placeholders=Array.from({length:28},(_,n)=>n===13?'encode(?::VARCHAR)':'?');
    const result=nativeAppend?
      await tx.run(appendPlan({name:'public_insert_chunk',schema:'main',table:'assertions',rows:canonical})):
      await run('public_insert_chunk','INSERT INTO main.assertions VALUES '+chunk.map(()=> '('+placeholders.join(',')+')').join(','),canonical.flat());
    ensure(result.length===1&&result[0].length===1&&result[0][0]===BigInt(chunk.length));
   }
   return Object.freeze(rows);
   }catch(error){tx.fail(error);throw error;}
  };

  const session=Object.freeze({
   runRecords:(sql,params=[])=>records('public_runner',sql,params),
   nextCommitPosition:async()=>{const rows=await records('next_position','UPDATE main.clock SET position=position+1 WHERE singleton RETURNING position');ensure(rows.length===1);return position(rows[0].position);},
   currentCommitPosition:async()=>{const rows=await records('current_position','SELECT position FROM main.clock WHERE singleton');ensure(rows.length===1);return position(rows[0].position);},
   claimCommand:async(commandId,transactionId,timestamp)=>{commandId=text(commandId,true);transactionId=text(transactionId,true);timestamp=instant(timestamp);const rows=await records('lookup_public_claim','SELECT transaction_id FROM '+base+'triplex_command_receipts WHERE command_id=?',[commandId]);ensure(rows.length<=1);if(rows.length)return text(rows[0].transaction_id,true);await run('claim_public_command',"INSERT INTO main.commands(command_id,transaction_id,recorded_at,origin) VALUES (?,?,?,'triplex')",[commandId,transactionId,timestamp]);return null;},
   insert:async(input,txId,timestamp,id,pos)=>(await insertRows([buildRow(input,txId,timestamp,id,pos)]))[0],
   batchInsert:async(inputs,txId,timestamp,ids,pos)=>{if(!Array.isArray(inputs)||!Array.isArray(ids)||inputs.length!==ids.length||inputs.length>4096)fail('BATCH','Expected matching selected batch inputs/ids');return insertRows(inputs.map((input,i)=>buildRow(input,txId,timestamp,ids[i],pos)));},
   retract:async(id,timestamp,txId,pos)=>{const rows=await records('public_retract','UPDATE main.assertions SET retracted_at=?,tx_to=?,retract_transaction_id=? WHERE assertion_id=? AND tx_to=9223372036854775807 RETURNING assertion_id id',[instant(timestamp),BigInt(position(pos)),text(txId,true),text(id,true)]);ensure(rows.length<=1);return rows.length===1;},
   getById:async id=>{const rows=await readRows('public_get_id','SELECT * FROM '+base+'triples WHERE id=? AND retracted_at IS NULL',[text(id,true)]);ensure(rows.length<=1);return rows[0]??null;},
   getByEntity:(entityId,basis)=>query({entityId},basis),
   getByEntities:async(entityIds,basis)=>{if(!Array.isArray(entityIds))fail('INPUT','Expected entity IDs');const unique=[...new Set(entityIds.map(id=>text(id,true)))],result=new Map(unique.map(id=>[id,[]]));if(!unique.length)return result;const params=[...unique],where=['entity_id IN ('+unique.map(()=>'?').join(',')+')',...temporal(basis,params)];for(const row of await readRows('public_entities','SELECT * FROM '+base+'triples WHERE '+where.join(' AND ')+' ORDER BY recorded_at ASC,id ASC',params))result.get(row.entity_id).push(row);for(const [id,rows]of result)result.set(id,Object.freeze(rows));return result;},
   query,
   history:entityId=>readRows('public_history','SELECT * FROM '+base+'triples WHERE entity_id=? ORDER BY recorded_at ASC,id ASC',[text(entityId,true)]),
   dependencyState:async(attributes,basis)=>{
    if(!Array.isArray(attributes))fail('INPUT','Expected attributes');
    const unique=[...new Set(attributes.map(attribute=>text(attribute)))];
    const validAt=instant(basis.validAt);
    if(!unique.length)return Object.freeze({sourcePosition:0});
    if(unique.length>MAX_STATEMENT_PARAMETERS)fail('INPUT','Too many distinct dependency attributes');
    const selectors=[validAt,basis.recordedAt===undefined?null:instant(basis.recordedAt),
      basis.recordedPosition===undefined?null:BigInt(position(basis.recordedPosition))];
    const capacity=MAX_STATEMENT_PARAMETERS-selectors.length;
    let sourcePosition=0,next;
    // Each chunk returns one scalar pair in the same physical transaction.
    for(let offset=0;offset<unique.length;offset+=capacity){
      const chunk=unique.slice(offset,offset+capacity);
      const rows=await records('public_dependency_state',
        'SELECT coalesce(max(contribution.source_position),0::BIGINT) source_position,'+
        'min(contribution.next_boundary) next_boundary FROM (SELECT system.main.td_triplex_dependency_entry_v1('+
        'recorded_at,recorded_position,retracted_at,retracted_position,valid_from,valid_to,'+
        'CAST(? AS DOUBLE),CAST(? AS DOUBLE),CAST(? AS BIGINT)) contribution FROM '+base+'triples WHERE attribute IN ('+
        chunk.map(()=>'?').join(',')+'))',[...selectors,...chunk]);
      ensure(rows.length===1);
      const row=rows[0],boundary=row.next_boundary;
      sourcePosition=Math.max(sourcePosition,position(row.source_position));
      if(boundary!==null){const value=instant(boundary);if(next===undefined||value<next)next=value;}
    }
    return Object.freeze({sourcePosition,...(next===undefined?{}:{nextTemporalBoundary:next})});
   },
  });return {session,invalidate:()=>{active=false;}};
 }
 initialize(schema){
  if(this.#initializing)return this.#initializing;
  this.#initializing=this.#enqueue(async()=>{
   ensure(schema.trim()==='-- temporal-store/shared/5','Unknown canonical schema contract');
   await this.#owner.transaction(async tx=>{
    const version=await tx.run(statementPlan({name:'shared_version',sql:'SELECT version FROM main.store_meta',params:[]}));
    ensure(version.length===1&&version[0][0]===5n,'Shared schema version5 required');
    const unsupported=await tx.run(statementPlan({name:'shared_interop',sql:'SELECT count(*) FROM main.assertions WHERE NOT interop',params:[]}));
    ensure(unsupported.length===1&&unsupported[0][0]===0n,'Exact Python integers or valid-time bounds cannot be represented by Triplex');
    const identity=await tx.run(statementPlan({name:'public_existing_scope',sql:'SELECT scope_id,profile FROM '+base+'scope_identity WHERE singleton=1',params:[]}));
    if(identity.length===0){
     await tx.run(statementPlan({name:'public_scope',sql:'INSERT INTO '+base+'scope_identity VALUES (1,?,?)',params:[this.#scope,'triplex-public-duckdb/1']}));
    }else ensure(identity.length===1&&identity[0][0]===this.#scope&&identity[0][1]==='triplex-public-duckdb/1','Persisted database scope/profile mismatch');
    await tx.run(statementPlan({name:'public_search_path',sql:"SET search_path='td_triplex_public_v1,main'",params:[]}));
   });
   this.#ready=true;
  },true);
  return this.#initializing;
 }

 withTransaction(work){return this.#enqueue(async()=>{const result=await this.#owner.transaction(async tx=>{const holder=this.#session(tx);try{return await work(holder.session);}finally{holder.invalidate();}});return result.value;});}
 read(work){return this.withTransaction(work);}
 /** Original-fiber Effect adapter can await started, then settle work once and await completion. */
 startTransaction(){let resolveStarted,rejectStarted,resolveWork,rejectWork,settled=false;const started=new Promise((r,j)=>{resolveStarted=r;rejectStarted=j;}),work=new Promise((r,j)=>{resolveWork=r;rejectWork=j;});work.catch(()=>undefined);
  const completion=this.withTransaction(async session=>{resolveStarted(session);return work;});completion.catch(error=>rejectStarted(error));completion.catch(()=>undefined);
  return Object.freeze({started,completion,succeed:value=>{if(settled)fail('SETTLED','Transaction already settled');settled=true;resolveWork(value);},fail:error=>{if(settled)fail('SETTLED','Transaction already settled');settled=true;rejectWork(error);}});
 }
 close(){if(this.#closePromise)return this.#closePromise;this.#closed=true;this.#closePromise=this.#tail.then(()=>this.#owner.close());return this.#closePromise;}
 status(){return Object.freeze({closed:this.#closed,initialized:this.#ready,owner:this.#owner.status()});}
}
