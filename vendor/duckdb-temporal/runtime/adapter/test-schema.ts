import {openAuditedPort} from './native-test-fixture.js';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp,readFile,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { NativeSchemaCatalog,NativeSchemaError,encodeSchemaRecord } from './native-schema.js';
import { NativeDuckDBPort } from './native-duckdb-port.mjs';

const root=resolve(fileURLToPath(new URL('../..',import.meta.url)));
const schema='schema crm version 1 { entity Person { "person/name": text required; "person/age": int64; "person/tags": text many; } }';
const quote=(text:string)=>"'"+text.replaceAll("'","''")+"'";
const code=(error:unknown)=>error instanceof Error?error.message.match(/TD_E_(?:SCHEMA|VALUE)_[A-Z_]+/)?.[0]:undefined;

test('callback-local borrowed schema cells reset on changed DSL and still validate late descriptors and facts',async()=>{
  const port=await NativeDuckDBPort.open();
  const integer='schema cells version 1 {entity Row {n:int64;}}';
  const text=integer.replace('int64','text');
  const run=(sql:string,params:readonly (string|bigint)[]=[])=>port.run({name:'borrowed_schema_cells',sql,params});
  try{
    const integerIR=(await run('SELECT td_schema_ir_v1(?)',[integer]))[0]![0];
    const textIR=(await run('SELECT td_schema_ir_v1(?)',[text]))[0]![0];
    assert.equal(typeof integerIR,'string');assert.equal(typeof textIR,'string');
    const rows=await run("SELECT td_validate_schema_fact_v1(dsl,ir,'Row','n',tag) FROM (VALUES (?, ?, 3::UTINYINT), (?, ?, 1::UTINYINT)) s(dsl,ir,tag) CROSS JOIN range(4096)",
      [integer,integerIR as string,text,textIR as string]);
    assert.equal(rows.length,8192);for(const row of rows)assert.deepEqual(row,[true]);
    await assert.rejects(run("SELECT td_schema_check_v1(CASE WHEN range=2050 THEN ? ELSE ? END,?) FROM range(4096)",
      [text,integer,integerIR as string]),error=>code(error)==='TD_E_SCHEMA_CATALOG');
    await assert.rejects(run("SELECT td_schema_check_v1(?,CASE WHEN range=2050 THEN '{}' ELSE ? END) FROM range(4096)",
      [integer,integerIR as string]),error=>code(error)==='TD_E_SCHEMA_CATALOG');
    await assert.rejects(run("SELECT td_validate_schema_fact_v1(?,?,'Row','n',CASE WHEN range=2050 THEN 1::UTINYINT ELSE 3::UTINYINT END) FROM range(4096)",
      [integer,integerIR as string]),error=>code(error)==='TD_E_SCHEMA_TYPE');
    await assert.rejects(run("SELECT td_schema_check_v1(?,CASE WHEN range=2050 THEN NULL ELSE ? END) FROM range(4096)",
      [integer,integerIR as string]),error=>code(error)==='TD_E_SCHEMA_CATALOG');
    assert.deepEqual(await run('SELECT td_schema_check_v1(?,?)',[integer,integerIR as string]),[[true]]);
  }finally{await port.close();}
});

test('native registration is canonical, idempotent and immutable by version',async()=>{
  const catalog=await NativeSchemaCatalog.open();
  try{
    const first=await catalog.define(schema);
    const reordered='schema crm version 1 { entity Person { "person/tags": text many; "person/age": int64 one; "person/name": text required one; } }';
    assert.deepEqual(await catalog.define(reordered),first);
    await assert.rejects(catalog.define(schema.replace('person/age": int64','person/age": text')),
      error=>error instanceof NativeSchemaError&&error.code==='TD_E_SCHEMA_VERSION');
    assert.equal((await catalog.get('crm',1))?.dsl,schema);
    assert.equal((await catalog.define(schema.replace('version 1','version 2'))).version,2);
    assert.equal(await catalog.get('crm',3),null);
  }finally{await catalog.close();}
});

test('C++ validates closed records, required fields, cardinality and set identity',async()=>{
  const catalog=await NativeSchemaCatalog.open();
  try{
    await catalog.define(schema);
    assert.equal(await catalog.validate('crm',1,'Person',[
      {attribute:'person/name',value:{tag:'str',value:'Alice'}},
      {attribute:'person/name',value:{tag:'str',value:'Alice'}},
      {attribute:'person/age',value:{tag:'i64',value:21n}},
      {attribute:'person/tags',value:{tag:'str',value:'a'}},
      {attribute:'person/tags',value:{tag:'str',value:'b'}},
    ]),true);
    const cases=[
      ['{}','TD_E_SCHEMA_REQUIRED'],
      ['{"person/name"="A";"person/name"="B";}','TD_E_SCHEMA_CARDINALITY'],
      ['{"person/name"="A";"person/age"="21";}','TD_E_SCHEMA_TYPE'],
      ['{"person/name"="A";"other"=1;}','TD_E_SCHEMA_ATTRIBUTE'],
    ];
    for(const [record,expected]of cases){
      await assert.rejects(catalog.validateRecord('crm',1,'Person',record!),error=>code(error)===expected);
      assert.equal(await catalog.validateRecord('crm',1,'Person','{"person/name"="healthy";}'),true);
    }
    await assert.rejects(catalog.validateRecord('crm',1,'Missing','{}'),error=>code(error)==='TD_E_SCHEMA_ENTITY');
  }finally{await catalog.close();}
});

test('native schema values preserve int64, float bits and escaped Unicode',async()=>{
  const catalog=await NativeSchemaCatalog.open();
  try{
    await catalog.define('schema scalar version 1 { entity Row { s:text; b:boolean; i:int64 many; f:float64; } }');
    assert.equal(await catalog.validate('scalar',1,'Row',[
      {attribute:'s',value:{tag:'str',value:'é🙂\n\t\b\f"\\'}},
      {attribute:'b',value:{tag:'bool',value:false}},
      {attribute:'i',value:{tag:'i64',value:-9223372036854775808n}},
      {attribute:'i',value:{tag:'i64',value:9223372036854775807n}},
      {attribute:'f',value:{tag:'f64',value:Number.MIN_VALUE}},
    ]),true);
    assert.equal(await catalog.validateRecord('scalar',1,'Row','{s="\\u00e9\\ud83d\\ude42"; f=f64("8000000000000000");f=f64("0000000000000000");}'),true);
    await assert.rejects(catalog.validateRecord('scalar',1,'Row','{i=i64(9223372036854775808);}'),error=>code(error)==='TD_E_SCHEMA_VALUE');
    await assert.rejects(catalog.validate('scalar',1,'Row',[{attribute:'f',value:{tag:'f64',value:Infinity}}]),error=>code(error)==='TD_E_VALUE_PAYLOAD');
    await assert.rejects(catalog.validateRecord('scalar',1,'Row','{s="\\ud800";}'),error=>code(error)==='TD_E_SCHEMA_SYNTAX');
    await assert.rejects(catalog.validateRecord('scalar',1,'Row','{s="\\u0000";}'),error=>code(error)==='TD_E_VALUE_TEXT');
  }finally{await catalog.close();}
});

test('native schema registration rolls back and quotes catalog data safely',async()=>{
  const port=await openAuditedPort();
  const run=(sql:string,params:readonly unknown[]=[])=>port.runNative({name:'schema_sql',sql,params});
  try{
    await run('BEGIN');await run('PRAGMA td_define_schema('+quote(schema)+')');await run('ROLLBACK');
    assert.deepEqual(await run('SELECT count(*) FROM td_catalog_v1.schemas'),[[0n]]);
    const attribute="x'); DROP TABLE main.assertions;--";
    const dsl='schema injected version 1 { entity Event { '+JSON.stringify(attribute)+':text required; } }';
    await run('PRAGMA td_define_schema('+quote(dsl)+')');
    assert.deepEqual(await run('SELECT attribute_key FROM td_catalog_v1.attributes'),[[attribute]]);
    assert.deepEqual(await run('SELECT count(*) FROM main.assertions'),[[0n]]);
    assert.deepEqual(await run('SELECT td_validate_entity_v1(dsl,ir,?,?) FROM td_catalog_v1.schemas',[ 'Event','{'+JSON.stringify(attribute)+'="safe";}']),[[true]]);
    await run('UPDATE td_catalog_v1.schemas SET dsl=?',[dsl.replace('text required','int64 required')]);
    await assert.rejects(run('SELECT td_schema_check_v1(dsl,ir) FROM td_catalog_v1.schemas'),error=>code(error)==='TD_E_SCHEMA_CATALOG');
  }finally{await port.close();}
});

test('new entity definitions survive reopen without changing extension binary',async()=>{
  const directory=await mkdtemp(resolve(tmpdir(),'native-schema-'));
  const database=resolve(directory,'schema.duckdb');
  const binary=resolve(root,'build/temporal_datalog.duckdb_extension');
  const hash=async()=>createHash('sha256').update(await readFile(binary)).digest('hex');
  const before=await hash();
  try{
    let catalog=await NativeSchemaCatalog.open({database});
    const first=await catalog.define(schema);await catalog.close();
    catalog=await NativeSchemaCatalog.open({database});
    const next='schema crm version 2 { entity Person { "person/name":text required; "person/age":int64 required; } entity Organization { "org/name":text required; } }';
    await catalog.define(next);await catalog.close();
    catalog=await NativeSchemaCatalog.open({database});
    try{
      assert.equal((await catalog.get('crm',1))?.hash,first.hash);
      assert.equal(await catalog.validate('crm',2,'Organization',[{attribute:'org/name',value:{tag:'str',value:'Acme'}}]),true);
      assert.equal(await catalog.validateRecord('crm',1,'Person','{"person/name"="Alice";}'),true);
      await assert.rejects(catalog.validateRecord('crm',2,'Person','{"person/name"="Alice";}'),error=>code(error)==='TD_E_SCHEMA_REQUIRED');
    }finally{await catalog.close();}
    assert.equal(await hash(),before);
  }finally{await rm(directory,{recursive:true});}
});

test('SQL and thin TypeScript share validation results and reject malformed definitions',async()=>{
  const directory=await mkdtemp(resolve(tmpdir(),'native-schema-parity-'));
  const database=resolve(directory,'schema.duckdb');
  const records=['{"person/name"="Alice";}','{}','{"person/name"=21;}','{"person/name"="A";"person/name"="B";}'];
  const expected:string[]=[];
  try{
    const catalog=await NativeSchemaCatalog.open({database});await catalog.define(schema);
    await assert.rejects(catalog.validateRecord('missing',1,'Person','{}'),error=>code(error)==='TD_E_SCHEMA_CATALOG');
    for(const record of records){try{await catalog.validateRecord('crm',1,'Person',record);expected.push('ok');}catch(error){expected.push(code(error)??'unknown');}}
    await catalog.close();
    const port=await NativeDuckDBPort.open({database});
    try{
      assert.deepEqual(await port.run({name:'catalog_rows',sql:'SELECT entity_name,attribute_key,value_tag,required,many FROM td_catalog_v1.attributes ORDER BY attribute_key',params:[]}),[
        ['Person','person/age',3n,false,false],['Person','person/name',1n,true,false],['Person','person/tags',1n,false,true],
      ]);
      for(const [index,record]of records.entries()){
        let actual='ok';
        try{await port.run({name:'parity',sql:'SELECT td_validate_entity_v1(dsl,ir,?,?) FROM td_catalog_v1.schemas WHERE name=? AND version=?',params:['Person',record,'crm',1n]});}
        catch(error){actual=code(error)??'unknown';}
        assert.equal(actual,expected[index]);
      }
      for(const bad of ['schema x version 0 { entity A {} }','schema x version 1 { entity A {a:text;a:int64;} }',
        'schema x version 1 { entity A {a:ref;} }','schema x version 1 { entity A {a:text unique;} }','schema x version 1 {}',
        'schema x version 1 { entity A {} } trailing','x'.repeat(16385)]){
        await assert.rejects(port.run({name:'bad_schema',sql:'SELECT td_schema_ir_v1(?)',params:[bad]}));
      }
      await assert.rejects(port.run({name:'missing',sql:'SELECT td_validate_entity_v1(NULL,NULL,?,?)',params:['Person','{}']}),error=>code(error)==='TD_E_SCHEMA_CATALOG');
      assert.deepEqual(await port.run({name:'vector',sql:"SELECT td_validate_entity_v1(s.dsl,s.ir,entity,record) FROM td_catalog_v1.schemas s CROSS JOIN (VALUES ('Person','{\"person/name\"=\"A\";}'),('Person','{\"person/name\"=\"B\";}')) t(entity,record)",params:[]}),[[true],[true]]);
      await assert.rejects(port.run({name:'late_invalid_record',sql:"SELECT td_validate_entity_v1(s.dsl,s.ir,'Person',CASE WHEN range=0 THEN '{\"person/name\"=\"A\";}' ELSE '{}' END) FROM td_catalog_v1.schemas s CROSS JOIN range(2)",params:[]}),error=>code(error)==='TD_E_SCHEMA_REQUIRED');
      await assert.rejects(port.run({name:'late_invalid_descriptor',sql:"SELECT td_validate_entity_v1(s.dsl,CASE WHEN range=0 THEN s.ir ELSE '{}' END,'Person','{\"person/name\"=\"A\";}') FROM td_catalog_v1.schemas s CROSS JOIN range(2)",params:[]}),error=>code(error)==='TD_E_SCHEMA_CATALOG');
      assert.equal(encodeSchemaRecord([{attribute:'person/age',value:{tag:'i64',value:21n}}]),'{"person/age"=i64(21);}');
      await port.run({name:'corrupt_definition',sql:'UPDATE td_catalog_v1.schemas SET dsl=? WHERE name=?',params:[schema.replace('text required','int64 required'),'crm']});
    }finally{await port.close();}
    await assert.rejects(NativeSchemaCatalog.open({database}),error=>code(error)==='TD_E_SCHEMA_CATALOG');
  }finally{await rm(directory,{recursive:true});}
});
