import { NativeDuckDBPort } from './native-duckdb-port.mjs';
import type { SqlRows } from './owned-duckdb-port.mjs';

type ScalarValue =
  | Readonly<{tag:'str';value:string}>
  | Readonly<{tag:'bool';value:boolean}>
  | Readonly<{tag:'i64';value:bigint}>
  | Readonly<{tag:'f64';value:number}>
  | Readonly<{tag:'ref';value:string}>
  | Readonly<{tag:'datetime';value:number}>
  | Readonly<{tag:'json';value:string}>;
type BlobId = Readonly<{tag:'blob';value:string}>;
type BlobDescriptor = BlobId & Readonly<{mimeType:string;size:number;filename?:string}>;
export type SchemaValue = ScalarValue | BlobDescriptor;
export type NativeQueryValue = ScalarValue | BlobId;
export interface SchemaField {readonly attribute:string;readonly value:SchemaValue;}
export interface SchemaReceipt {readonly name:string;readonly version:number;readonly hash:string;}
export interface SchemaDefinition extends SchemaReceipt {readonly dsl:string;readonly ir:string;}
export class NativeSchemaError extends Error {
  readonly code:string;
  constructor(code:string,cause:Error){super(cause.message,{cause});this.name='NativeSchemaError';this.code=code;}
}

/** Encoding only: native C++ decides schema meaning, types and constraints. */
export function encodeSchemaRecord(fields:readonly SchemaField[]):string {
  if(!Array.isArray(fields)||fields.length>4096)throw new RangeError('Native record encoding admits at most 4096 fields');
  const literal=(value:SchemaValue):string=>{
    switch(value.tag){
      case 'str':if(typeof value.value==='string')return JSON.stringify(value.value);break;
      case 'ref':case 'json':if(typeof value.value==='string')return `${value.tag}(${JSON.stringify(value.value)})`;break;
      case 'blob':if(typeof value.value==='string'&&typeof value.mimeType==='string'&&
        Number.isSafeInteger(value.size)&&(value.filename===undefined||typeof value.filename==='string')){
        const parts=[JSON.stringify(value.value),JSON.stringify(value.mimeType),String(value.size)];
        if(value.filename!==undefined)parts.push(JSON.stringify(value.filename));
        return `blob(${parts.join(',')})`;
      }break;
      case 'bool':if(typeof value.value==='boolean')return String(value.value);break;
      case 'i64':if(typeof value.value==='bigint')return `i64(${value.value})`;break;
      case 'f64':case 'datetime':if(typeof value.value==='number'){
        const bytes=Buffer.allocUnsafe(8);bytes.writeDoubleBE(value.value);
        return `${value.tag}("${bytes.toString('hex')}")`;
      }break;
    }
    throw new TypeError('Unsupported native value encoding');
  };
  const parts:string[]=[];let bytes=2;
  for(const field of fields){
    if(typeof field.attribute!=='string')throw new TypeError('Attribute encoding requires a string');
    const part=JSON.stringify(field.attribute)+'='+literal(field.value)+';';
    bytes+=Buffer.byteLength(part);
    if(bytes>65536)throw new RangeError('Native record encoding exceeds 65536 bytes');
    parts.push(part);
  }
  return '{'+parts.join('')+'}';
}

/** Thin, serialized local binding to the engine's versioned schema catalog. */
export class NativeSchemaCatalog {
  #port:NativeDuckDBPort;#tail:Promise<unknown>=Promise.resolve();#closed=false;#close:Promise<void>|undefined;
  private constructor(port:NativeDuckDBPort){this.#port=port;}
  static async open(options:{readonly database?:string}={}):Promise<NativeSchemaCatalog>{
    const port=await NativeDuckDBPort.openWithOwner(options);
    try{
      await port.activateOwnership();
      return new NativeSchemaCatalog(port);
    }catch(primary){
      try{await port.close();}
      catch(cleanup){throw new AggregateError([primary,cleanup],'Native schema catalog initialization cleanup failed',{cause:primary});}
      throw primary;
    }
  }
  #run<T>(work:()=>Promise<T>):Promise<T>{
    if(this.#closed)return Promise.reject(new Error('Native schema catalog is closed'));
    const result=this.#tail.then(async()=>{const value=await work();this.#port.checkInstance();return value;});
    this.#tail=result.then(()=>undefined,()=>undefined);return result;
  }
  async #call(sql:string,params:readonly unknown[]=[]):Promise<SqlRows>{
    try{return await this.#port.runNative({name:'native_schema',sql,params});}
    catch(cause){
      if(cause instanceof Error){const code=cause.message.match(/TD_E_(?:SCHEMA|VALUE|OWNER)_[A-Z_]+/)?.[0];
        if(code)throw new NativeSchemaError(code,cause);}
      throw cause;
    }
  }
  async #writerCall(sql:string,params:readonly unknown[]=[]):Promise<SqlRows>{
    try{return await this.#port.runWriter({name:'native_schema_writer',sql,params});}
    catch(cause){
      if(cause instanceof Error){const code=cause.message.match(/TD_E_(?:SCHEMA|VALUE|OWNER)_[A-Z_]+/)?.[0];
        if(code)throw new NativeSchemaError(code,cause);}
      throw cause;
    }
  }
  define(dsl:string):Promise<SchemaReceipt>{return this.#run(async()=>{
    // The native compiler validates the bound text before it becomes a SQL literal.
    await this.#writerCall('SELECT system.main.td_schema_ir_v2(?)',[dsl]);
    const rows=await this.#writerCall("PRAGMA td_define_schema_v2('"+dsl.replaceAll("'","''")+"')");
    try{
      const row=rows[0];
      if(rows.length!==1||typeof row?.[0]!=='string'||typeof row[1]!=='bigint'||typeof row[2]!=='string')
        throw new Error('Malformed native schema receipt');
      return Object.freeze({name:row[0],version:Number(row[1]),hash:row[2]});
    }catch(cause){throw this.#port.writerDeliveryError(cause);}
  });}
  get(name:string,version:number):Promise<SchemaDefinition|null>{return this.#run(async()=>{
    const rows=await this.#call('WITH ownership AS MATERIALIZED (SELECT system.main.td_owner_probe_validated_check() ok) SELECT name,version,content_hash,dsl,ir FROM td_catalog_v1.schemas WHERE name=? AND version=? AND system.main.td_schema_check_v2(dsl,ir) UNION ALL SELECT NULL,NULL,NULL,NULL,NULL FROM ownership WHERE NOT ok',[name,version]);
    if(!rows.length)return null;const row=rows[0];
    if(rows.length!==1||typeof row?.[0]!=='string'||typeof row[1]!=='bigint'||typeof row[2]!=='string'||
      typeof row[3]!=='string'||typeof row[4]!=='string')throw new Error('Malformed native schema definition');
    return Object.freeze({name:row[0],version:Number(row[1]),hash:row[2],dsl:row[3],ir:row[4]});
  });}
  validateRecord(name:string,version:number,entity:string,record:string):Promise<true>{return this.#run(async()=>{
    const rows=await this.#call('SELECT CASE WHEN system.main.td_owner_probe_validated_check() THEN system.main.td_validate_entity_v2(s.dsl,s.ir,?,?) END FROM (VALUES(1)) seed(x) LEFT JOIN td_catalog_v1.schemas s ON s.name=? AND s.version=?',
      [entity,record,name,version]);
    if(rows.length!==1||rows[0]?.[0]!==true)throw new Error('Malformed native schema validation result');
    return true as const;
  });}
  async validate(name:string,version:number,entity:string,fields:readonly SchemaField[]):Promise<true>{
    return this.validateRecord(name,version,entity,encodeSchemaRecord(fields));
  }
  close():Promise<void>{
    if(!this.#close){this.#closed=true;this.#close=this.#tail.then(()=>this.#port.close()).catch(error=>{this.#close=undefined;throw error;});}
    return this.#close;
  }
}
