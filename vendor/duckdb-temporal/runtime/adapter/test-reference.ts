import {openAuditedPort} from './native-test-fixture.js';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {test} from 'node:test';
import {NativeEntityStore} from './native-entity.js';
import {NativeSchemaCatalog} from './native-schema.js';
const INF=9223372036854775807n;
const schema='schema links version 1 {entity Person {name:text;manager:ref(Person);member:ref(Team) many;} entity Team {name:text;}}';
const quote=(s:string)=>"'"+s.replaceAll("'","''")+"'";
const put=(commandId:string,entityId:string,record:string,type='Person')=>({schema:'links',version:1,type,entityId,commandId,record,validFrom:0n,validTo:INF});
const sqlPut=(command:string,id:string,record:string)=>'PRAGMA td_put_entity(\'links\',1,\'Person\','+[id,command,record].map(quote).join(',')+',0,9223372036854775807)';

test('C++ compiles forward/self references as immutable catalog data and validates reference IDs structurally',async()=>{
  const catalog=await NativeSchemaCatalog.open();
  try{
    const first=await catalog.define(schema);
    const reordered='schema links version 1 {entity Team {name:text one;} entity Person {member:ref(Team) many;manager:ref(Person) one;name:text;}}';
    assert.deepEqual(await catalog.define(reordered),first);
    const ir=JSON.parse((await catalog.get('links',1))!.ir);
    assert.equal(ir.entities[0].attributes.find((a:{key:string})=>a.key==='manager').reference,'Person');
    assert.equal(await catalog.validateRecord('links',1,'Person','{manager="not-yet-declared";member="t";member="t";}'),true);
    assert.equal(await catalog.validateRecord('links',1,'Person','{manager="'+'é'.repeat(64)+'";}'),true);
    for(const record of ['{manager="";}','{manager="'+'é'.repeat(65)+'";}'])
      await assert.rejects(catalog.validateRecord('links',1,'Person',record),/TD_E_SCHEMA_REFERENCE/);
    await assert.rejects(catalog.validateRecord('links',1,'Person','{manager=1;}'),/TD_E_SCHEMA_TYPE/);
    await assert.rejects(catalog.validateRecord('links',1,'Person','{manager="x";manager="y";}'),/TD_E_SCHEMA_CARDINALITY/);
    await assert.rejects(catalog.define('schema bad version 1 {entity A {r:ref(Missing);}}'),/TD_E_SCHEMA_REFERENCE/);
    await assert.rejects(catalog.define(schema.replace('manager:ref(Person)','manager:ref(Team)')),/TD_E_SCHEMA_VERSION/);
  }finally{await catalog.close();}
});

test('native puts enforce same-schema/type target identity atomically, with self-reference, sets and replay',async()=>{
  const store=await NativeEntityStore.open();
  try{
    await store.defineSchema(schema);
    const root=await store.putRecord(put('root','root','{name="Root";manager="root";}'));
    const team=await store.putRecord(put('team','team','{}','Team'));
    await store.defineSchema('schema foreign version 1 {entity Person {}}');
    await store.putRecord({...put('foreign','foreign','{}'),schema:'foreign'});
    for(const id of ['missing','team','foreign']){
      await assert.rejects(store.putRecord(put('bad','child','{manager='+JSON.stringify(id)+';}')),/TD_E_COMMAND_REFERENCE/);
      assert.equal(await store.receipt('bad'),null);assert.deepEqual(await store.history('child'),[]);
    }
    const child=await store.putRecord(put('child','child','{manager="root";member="team";member="team";}'));
    assert.equal(child.position,4n);assert.equal(child.asserted.length,2);
    assert.deepEqual(await store.putRecord(put('child','child','{member="team";manager="root";}')),child);
    await store.putRecord(put('root-empty','root','{}'));
    assert.deepEqual(await store.putRecord(put('child','child','{manager="root";member="team";}')),child);
    assert.deepEqual((await store.at('child',{validAt:0n,knownAt:child.position})).map(a=>a.value.value),['root','team']);
    assert.equal(root.position,1n);assert.equal(team.position,2n);
    // Identity is independent of the target record's valid interval or current properties.
    const future=await store.putRecord({...put('future','future','{}'),validFrom:100n,validTo:200n});
    assert.equal((await store.putRecord({...put('link-future','child','{manager="future";}'),validTo:10n})).position,future.position+1n);
    const unicode='é'.repeat(64);await store.putRecord(put('unicode',unicode,'{}'));
    const linked=await store.put({...put('unicode-link','child','{}'),fields:[{attribute:'manager',value:{tag:'str',value:unicode}}]});
    assert.equal((await store.at('child',{validAt:0n,knownAt:linked.position}))[0]?.value.value,unicode);
  }finally{await store.close();}
});

test('references preserve original schema meaning, graph joins and same-binary reopen',async()=>{
  const directory=await mkdtemp(resolve(tmpdir(),'native-reference-'));const database=resolve(directory,'data.duckdb');
  const binary=fileURLToPath(new URL('../temporal_datalog.duckdb_extension',import.meta.url));
  const hash=async()=>createHash('sha256').update(await readFile(binary)).digest('hex');const before=await hash();
  try{
    let store=await NativeEntityStore.open({database});await store.defineSchema(schema);
    await store.putRecord(put('person','person','{name="Person";}'));
    await store.putRecord(put('team','team','{name="Team";}','Team'));
    await store.putRecord(put('old','source','{manager="person";}'));await store.close();
    store=await NativeEntityStore.open({database});
    try{
      await store.defineSchema(schema.replace('version 1','version 2').replace('manager:ref(Person)','manager:ref(Team)'));
      await assert.rejects(store.putRecord({...put('wrong','source','{manager="person";}'),version:2}),/TD_E_COMMAND_REFERENCE/);
      await store.putRecord({...put('new','source','{manager="team";}'),version:2});
      const program="answer(?source,?name) :- triple(?source,'manager',?target),triple(?target,'name',?name).";
      for(const [knownAt,name]of [[3n,'Person'],[4n,'Team']]as const){
        const sql=await store.query(program,{validAt:0n,knownAt,forceNative:false});
        assert.equal(sql.route,'sql');assert.deepEqual(sql.rows,[[{tag:'str',value:'source'},{tag:'str',value:name}]]);
        assert.deepEqual(sql.rows,(await store.query(program,{validAt:0n,knownAt,forceNative:true})).rows);
      }
      const history=await store.history('source');assert.deepEqual(history.map(a=>a.version),[1,2]);
      assert.equal(await hash(),before);
    }finally{await store.close();}
  }finally{await rm(directory,{recursive:true});}
});

test('reference target creation participates in caller transactions and catalog introspection',async()=>{
  const port=await openAuditedPort();const run=(sql:string)=>port.runNative({name:'reference_sql',sql,params:[]});
  try{
    await run('PRAGMA td_define_schema('+quote(schema)+')');
    assert.deepEqual(await run("SELECT entity_type,attribute,reference_type FROM td_catalog_v1.schema_references ORDER BY attribute"),
      [['Person','manager','Person'],['Person','member','Team']]);
    await run('BEGIN');await run(sqlPut('target','target','{}'));await run(sqlPut('source','source','{manager="target";}'));
    assert.equal((await run("PRAGMA td_entity_history('source')")).length,1);await run('ROLLBACK');
    assert.deepEqual(await run('SELECT position FROM main.clock'),[[0n]]);
    assert.deepEqual(await run('SELECT * FROM td_catalog_v1.entity_owners'),[]);
    assert.deepEqual(await run('SELECT * FROM main.commands'),[]);
    await assert.rejects(run(sqlPut('source','source','{manager="target";}')),/TD_E_COMMAND_REFERENCE/);
    await run(sqlPut('target','target','{}'));await run(sqlPut('source','source','{manager="target";}'));
    assert.deepEqual(await run('SELECT entity_id,first_position FROM td_catalog_v1.entity_identities ORDER BY entity_id'),[['source',2n],['target',1n]]);
  }finally{await port.close();}
});

test('retained audit rejects removed, wrong-type and not-yet-created targets even for inactive facts',async()=>{
  const mutations=["DELETE FROM td_catalog_v1.entity_owners WHERE entity_id='target'",
      "UPDATE td_catalog_v1.entity_owners SET entity_type='Team' WHERE entity_id='target'",
      "DELETE FROM td_catalog_v1.entity_commands WHERE command_id='target'",
      "DELETE FROM main.commands WHERE command_id='target'",
      "DELETE FROM td_catalog_v1.entity_commands WHERE command_id='source'",
      "DELETE FROM td_catalog_v1.entity_owners WHERE entity_id='source'",
      "DELETE FROM main.commands WHERE command_id='source'",
      "UPDATE main.assertions SET payload='\"future\"',payload_hash=sha256('\"future\"'),v_s=encode('future') WHERE e='source'"];
  for(const mutation of mutations){
    const port=await openAuditedPort();
    const run=(sql:string)=>port.runNative({name:'reference_integrity',sql,params:[]});
    const history="PRAGMA td_entity_history('source')";
    try{
      await run('PRAGMA td_define_schema('+quote(schema)+')');
      await run(sqlPut('target','target','{}'));await run(sqlPut('source','source','{manager="target";}'));
      await run(sqlPut('target-futurer','target','{name="Later";}'));await run(sqlPut('future','future','{}'));
      await run(sqlPut('source-empty','source','{}'));
      assert.equal((await run(history)).length,1);
      await port.run({name:'inject_reference_corruption',sql:mutation,params:[]});
      await assert.rejects(port.activateOwnership(),/TD_E_COMMAND_HISTORY/);
      await assert.rejects(run("PRAGMA td_entity_receipt('missing')"),/TD_E_OWNER_PROBE_INVALID/);
      await assert.rejects(run(history),/TD_E_(OWNER_PROBE_INVALID|COMMAND_HISTORY)/);
      assert.deepEqual(await run('SELECT position FROM main.clock'),[[5n]]);
    }finally{await port.close();}
  }
});
