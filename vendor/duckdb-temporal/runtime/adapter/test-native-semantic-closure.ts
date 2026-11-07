import assert from 'node:assert/strict';
import {mkdtemp} from 'node:fs/promises';
import {join} from 'node:path';
import {test} from 'node:test';
import {fileURLToPath} from 'node:url';
import {NativeEntityStore} from './native-entity.js';
import type {NativeQueryValue} from './native-schema.js';
import type {NativeDuckDBPort} from './native-duckdb-port.mjs';
import {openAuditedPort} from './native-test-fixture.js';

type Rows=readonly (readonly NativeQueryValue[])[];
type Cut={knownAt:bigint;validAt:bigint};
type AnswerCase={name:string;program:string;rows:Rows;maxWork?:number};
type FaultCase={name:string;program:string;error:RegExp;maxWork?:number};
type Case=AnswerCase|FaultCase;
const zero={knownAt:0n,validAt:0n};
const minimum=-9223372036854775808n,maximum=9223372036854775807n;
const text=(value:string):NativeQueryValue=>({tag:'str',value});
const integer=(value:bigint):NativeQueryValue=>({tag:'i64',value});
const floating=(value:number):NativeQueryValue=>({tag:'f64',value});
const boolean=(value:boolean):NativeQueryValue=>({tag:'bool',value});
const quote=(value:string)=>"'"+value.replaceAll("'","''")+"'";
const healthy:AnswerCase={name:'healthy reuse',program:"answer('healthy').",rows:[[text('healthy')]]};
const freshDatabase=async()=>join(await mkdtemp(fileURLToPath(new URL('../semantic-closure-',import.meta.url))),'facts.duckdb');

function wire(rows:Rows){
  const tags={str:1,bool:2,i64:3,f64:4,ref:5,datetime:6,json:7,blob:8};
  return rows.map(row=>row.map(value=>{
    let f:string|null=null;
    if(value.tag==='f64'||value.tag==='datetime'){
      const bytes=Buffer.alloc(8);bytes.writeDoubleBE(value.value===0?0:value.value);f=bytes.toString('hex');
    }
    return {tag:tags[value.tag],
      s:value.tag==='str'||value.tag==='ref'||value.tag==='json'||value.tag==='blob'?value.value:null,
      b:value.tag==='bool'?value.value:null,i:value.tag==='i64'?String(value.value):null,f};
  }));
}

async function publicAnswer(store:NativeEntityStore,item:AnswerCase,cut:Cut){
  for(const forceNative of [true,false]){
    const result=await store.query(item.program,{...cut,forceNative,maxWork:item.maxWork??5000000,
      deadlineMs:5000,timeoutMs:5000});
    assert.equal(result.position,cut.knownAt,item.name);
    assert.deepEqual(result.rows,item.rows,item.name);
  }
}

async function rawAnswer(port:NativeDuckDBPort,item:AnswerCase,cut:Cut,legacy=false){
  for(const route of [1,0]){
    // The v2 route argument selects physical planning within the sole audited
    // strategy. The v1 counterpart preserves its original seven arguments.
    const entry=legacy?(route?'td_query_store_native':'td_query_store'):'td_query_store_values_v2';
    const args=[quote(item.program),String(cut.validAt),String(cut.knownAt),'100000','1000',
      String(item.maxWork??5000000),'5000',...(legacy?[]:['0',String(route)])];
    const result=await port.runNative({name:'semantic_closure',sql:'PRAGMA '+entry+'('+args.join(',')+')',params:[]});
    assert.ok(result.length>0,item.name);
    const actual:unknown[]=[];
    for(const row of result){
      assert.equal(row.length,7,item.name);assert.equal(row[0],cut.knownAt,item.name);
      if(row[6]===null){assert.equal(result.length,1,item.name);continue;}
      assert.equal(typeof row[6],'string',item.name);actual.push(JSON.parse(row[6] as string));
    }
    assert.deepEqual(actual,wire(item.rows),item.name);
  }
}

async function publicFault(store:NativeEntityStore,item:FaultCase,cut:Cut){
  for(const forceNative of [true,false]){
    await assert.rejects(store.query(item.program,{...cut,forceNative,maxWork:item.maxWork??5000000,
      deadlineMs:5000,timeoutMs:5000}),item.error,item.name);
    await publicAnswer(store,healthy,cut);
  }
}

async function rawFault(port:NativeDuckDBPort,item:FaultCase,cut:Cut,legacy=false){
  for(const route of [1,0]){
    const entry=legacy?(route?'td_query_store_native':'td_query_store'):'td_query_store_values_v2';
    const args=[quote(item.program),String(cut.validAt),String(cut.knownAt),'100000','1000',
      String(item.maxWork??5000000),'5000',...(legacy?[]:['0',String(route)])];
    await assert.rejects(port.runNative({name:'semantic_closure_fault',
      sql:'PRAGMA '+entry+'('+args.join(',')+')',params:[]}),item.error,item.name);
    await rawAnswer(port,healthy,cut,legacy);
  }
}

test('original typed arithmetic and comparisons agree through public and both raw generations',async()=>{
  const store=await NativeEntityStore.open(),port=await openAuditedPort();
  const arithmetic=(name:string,input:string,filter:string,value:NativeQueryValue):AnswerCase=>({
    name,program:`input(${input}). answer(?n) :- input(?n),[${filter}].`,rows:[[value]],
  });
  const cases:AnswerCase[]=[
    arithmetic('integer precedence','7','?n+3*2=13',integer(7n)),
    arithmetic('integer parentheses','7','(?n+3)*2=20',integer(7n)),
    arithmetic('integer subtraction','7','?n-3=4',integer(7n)),
    arithmetic('integer multiplication','7','?n*3=21',integer(7n)),
    arithmetic('integer division','7','?n/2=3',integer(7n)),
    arithmetic('integer division truncates toward zero','-7','?n/2=-3',integer(-7n)),
    arithmetic('integer unary minus','7','-(?n)=-7',integer(7n)),
    arithmetic('integer lower endpoint',String(minimum),`?n+0=${minimum}`,integer(minimum)),
    arithmetic('integer upper endpoint',String(maximum),`?n-0=${maximum}`,integer(maximum)),
    arithmetic('float addition','1.5','?n+0.5=2.0',floating(1.5)),
    arithmetic('float subtraction','1.5','?n-0.5=1.0',floating(1.5)),
    arithmetic('float multiplication','1.5','?n*2.0=3.0',floating(1.5)),
    arithmetic('float division','1.5','?n/2.0=0.75',floating(1.5)),
    arithmetic('float unary minus','1.5','-(?n)=-1.5',floating(1.5)),
    arithmetic('float parentheses','1.5','(?n+0.5)*2.0=4.0',floating(1.5)),
    arithmetic('subnormal addition','5e-324','?n+?n=1e-323',floating(Number.MIN_VALUE)),
    arithmetic('canonical zero','-0.0','?n=-0.0',floating(0)),
    arithmetic('no numeric equality coercion','1','?n!=1.0',integer(1n)),
    arithmetic('boolean equality','true','?n=true',boolean(true)),
    arithmetic('binary UTF-8 order',"'é'","?n>'z'",text('é')),
    {name:'all comparison operators',program:'input(7). answer(?n) :- input(?n),'+
      '[?n=7],[?n!=8],[?n<8],[?n<=7],[?n>6],[?n>=7].',rows:[[integer(7n)]]},
    {name:'empty relational product does not evaluate division',
      program:"answer(?n) :- triple('missing','amount',?n),[?n/0=1].",rows:[]},
  ];
  try{
    for(const item of cases){
      await publicAnswer(store,item,zero);
      await rawAnswer(port,item,zero);
      await rawAnswer(port,item,zero,true);
    }
  }finally{await store.close();await port.close();}
});

test('arithmetic faults remain eager and exact without partial answers or lost reader reuse',async()=>{
  const store=await NativeEntityStore.open({readers:1}),port=await openAuditedPort();
  const fault=(name:string,input:string,filter:string,error:RegExp):FaultCase=>({
    name,program:`input(${input}). answer(?n) :- input(?n),[${filter}].`,error,
  });
  const overflow=/TD_E_EXPR_OVERFLOW/,type=/TD_E_EXPR_TYPE/,divide=/TD_E_EXPR_DIV_ZERO/;
  const cases:FaultCase[]=[
    fault('integer addition overflow',String(maximum),'?n+1=0',overflow),
    fault('integer subtraction overflow',String(minimum),'?n-1=0',overflow),
    fault('integer multiplication overflow',String(maximum),'?n*2=0',overflow),
    fault('integer unary overflow',String(minimum),'-(?n)=0',overflow),
    fault('integer division overflow',String(minimum),'?n/-1=0',overflow),
    fault('integer division zero','1','?n/0=0',divide),
    fault('float finite overflow','1.7976931348623157e308','?n*2.0=0.0',overflow),
    fault('float nonzero rounds to zero','5e-324','?n/2.0=0.0',/TD_E_EXPR_UNDERFLOW/),
    fault('float division zero','1.0','?n/0.0=0.0',divide),
    fault('float division negative zero','1.0','?n/-0.0=0.0',divide),
    fault('boolean arithmetic','true','?n+?n=2',type),
    fault('mixed numeric arithmetic','1','?n+1.0=2.0',type),
    fault('mixed ordered tags','1',"?n<'2'",type),
    {name:'earlier false filter is not an error guard',
      program:'input(1). answer(?n) :- input(?n),[false=true],[1/0=0].',error:divide},
    {name:'filter variables must already be bound',
      program:'input(1). answer(?n) :- input(?n),[?missing=1].',error:/TD_E_EXPR_UNBOUND/},
    {name:'expression work budget',program:'input(1). answer(?n) :- input(?n),[?n+1=2].',
      maxWork:1,error:/TD_E_EXPR_LIMIT/},
  ];
  try{
    for(const item of cases){
      await publicFault(store,item,zero);
      await rawFault(port,item,zero);
      await rawFault(port,item,zero,true);
    }
    assert.deepEqual(store.readerStats(),{capacity:1,available:1,active:0,waiting:0});
  }finally{await store.close();await port.close();}
});

test('recursive completed relations and layered absence retain correction cuts and reopen',async()=>{
  const database=await freshDatabase();
  const rules=[
    "path(?a,?b) :- triple(?a,'edge',?b).",
    "path(?a,?c) :- path(?a,?b),triple(?b,'edge',?c).",
    "denied(?n) :- triple('switch','ban',?n).",
    "safe(?n) :- path('a',?n),!denied(?n).",
    "answer(?n) :- path('a',?n),!safe(?n).",
  ];
  const variants=[rules.join(' '),[
    "answer(?n) :- !safe(?n),path('a',?n).",rules[3],rules[2],
    "path(?a,?c) :- triple(?b,'edge',?c),path(?a,?b).",rules[0],
  ].join(' ')];
  const cuts:readonly (readonly [bigint,bigint,readonly string[]])[]=[
    [0n,4n,[]],[3n,4n,[]],[4n,4n,['c']],[5n,2n,['c']],[5n,3n,['d']],
    [6n,4n,[]],[6n,6n,['d']],[6n,7n,['c']],[6n,10n,[]],
  ];
  const checks=cuts.flatMap(([knownAt,validAt,values])=>variants.map(program=>({
    cut:{knownAt,validAt},item:{name:`layered absence K${knownAt}/V${validAt}`,program,
      rows:values.map(value=>[text(value)])} satisfies AnswerCase,
  })));
  const request=(entityId:string,commandId:string,record:string,validFrom=0n,validTo=10n)=>({
    schema:'absence_closure',version:1,type:'Row',entityId,commandId,record,validFrom,validTo,
  });
  const store=await NativeEntityStore.open({database,readers:2});
  try{
    await store.defineSchema('schema absence_closure version 1 {entity Row {edge:text many;ban:text;}}');
    for(const [id,edge] of [['a','b'],['b','c'],['c','d']] as const)
      await store.putRecord(request(id,'edge-'+id,'{edge='+JSON.stringify(edge)+';}'));
    assert.equal((await store.putRecord(request('switch','first-ban','{ban="c";}'))).position,4n);
    assert.equal((await store.patchRecord(request('switch','change-ban','{ban="d";}',3n,7n))).position,5n);
    assert.equal((await store.patchRecord(request('b','edge-gap','{}',4n,6n))).position,6n);
    for(const {item,cut} of checks)await publicAnswer(store,item,cut);
  }finally{await store.close();}
  const port=await openAuditedPort({database});
  try{for(const {item,cut} of checks)await rawAnswer(port,item,cut);}finally{await port.close();}
  const reopened=await NativeEntityStore.open({database,readers:2});
  try{for(const {item,cut} of checks)await publicAnswer(reopened,item,cut);}finally{await reopened.close();}
});

test('multi-rule negated sources complete sums before extrema and downstream joins',async()=>{
  const database=await freshDatabase();
  const first="source(?e,?g,?v) :- triple(?e,'group',?g),triple(?e,'amount',?v),"+
    "triple(?e,'enabled',true),!triple(?e,'block',true).";
  const second="source(?e,?g,?v) :- !triple(?e,'block',true),triple(?e,'enabled',true),"+
    "triple(?e,'amount',?v),triple(?e,'group',?g).";
  const source=first+' '+second+' ';
  const pipeline=source+'total(?g,sum_i64(?v)) :- source(?e,?g,?v). '+
    'highest(max(?total)) :- total(?g,?total). answer(?g,?total) :- total(?g,?total),highest(?total).';
  const count=source+'answer(?g,count()) :- source(?e,?g,?v).';
  const min=source+'answer(?g,min(?v)) :- source(?e,?g,?v).';
  const cases:{item:Case;cut:Cut}[]=[
    {item:{name:'empty completed aggregate chain',program:pipeline,rows:[]},cut:zero},
    ...([
      [4n,3n,'x',10n],[5n,3n,'x',5n],[6n,4n,'y',2n],[6n,6n,'x',5n],
      [6n,7n,'x',10n],[10n,4n,'y',2n],
    ] as const).map(([knownAt,validAt,group,value])=>({cut:{knownAt,validAt},
      item:{name:`aggregate chain K${knownAt}/V${validAt}`,program:pipeline,rows:[[text(group),integer(value)]]} satisfies AnswerCase})),
    {item:{name:'complete tuple contributions',program:count,rows:[[text('x'),integer(2n)],[text('y'),integer(1n)]]},
      cut:{knownAt:4n,validAt:4n}},
    {item:{name:'range fault in completed lower aggregate',program:pipeline,error:/TD_E_AGG_SUM_RANGE/},cut:{knownAt:7n,validAt:4n}},
    {item:{name:'all group tags precede lower aggregate range finalization',program:pipeline,error:/TD_E_AGG_MEASURE_TAG/},
      cut:{knownAt:8n,validAt:4n}},
    {item:{name:'count remains independent of measure tags',program:count,rows:[[text('y'),integer(2n)],[text('z'),integer(1n)]]},
      cut:{knownAt:8n,validAt:4n}},
    {item:{name:'different valid measure tags in separate groups',program:min,
      rows:[[text('y'),integer(1n)],[text('z'),text('bad')]]},cut:{knownAt:8n,validAt:4n}},
    {item:{name:'valid-time empty chain',program:pipeline,rows:[]},cut:{knownAt:10n,validAt:10n}},
  ];
  const request=(entityId:string,commandId:string,record:string,validFrom=0n,validTo=10n,type='Row')=>({
    schema:'aggregate_closure',version:1,type,entityId,commandId,record,validFrom,validTo,
  });
  const store=await NativeEntityStore.open({database,readers:2});
  try{
    await store.defineSchema('schema aggregate_closure version 1 {'+
      'entity Row {group:text;amount:int64 many;enabled:boolean;block:boolean;} '+
      'entity Other {group:text;amount:text;enabled:boolean;}}');
    for(const [entityId,record] of [
      ['a','{group="x";amount=5;amount=5;enabled=true;}'],
      ['b','{group="x";amount=5;enabled=true;}'],
      ['c','{group="y";amount=2;enabled=true;}'],
      ['d','{group="y";amount=100;enabled=false;}'],
    ])await store.putRecord(request(entityId!,entityId!,record!));
    assert.equal((await store.patchRecord(request('a','disable-a','{group="x";amount=5;enabled=false;}',3n,7n))).position,5n);
    assert.equal((await store.patchRecord(request('b','block-b','{group="x";amount=5;enabled=true;block=true;}',4n,6n))).position,6n);
    assert.equal((await store.putRecord(request('c','overflow','{group="y";amount=9223372036854775807;amount=1;enabled=true;}'))).position,7n);
    assert.equal((await store.putRecord(request('z','bad-tag','{group="z";amount="bad";enabled=true;}',0n,10n,'Other'))).position,8n);
    assert.equal((await store.putRecord(request('z','exclude-bad-tag','{group="z";amount="bad";enabled=false;}',0n,10n,'Other'))).position,9n);
    assert.equal((await store.putRecord(request('c','healthy-c','{group="y";amount=2;enabled=true;}'))).position,10n);
    for(const {item,cut} of cases){
      if('rows' in item)await publicAnswer(store,item,cut);else await publicFault(store,item,cut);
    }
  }finally{await store.close();}
  const port=await openAuditedPort({database});
  try{
    for(const {item,cut} of cases){
      if('rows' in item)await rawAnswer(port,item,cut);else await rawFault(port,item,cut);
    }
  }finally{await port.close();}
  const reopened=await NativeEntityStore.open({database,readers:2});
  try{
    for(const {item,cut} of cases){
      if('rows' in item)await publicAnswer(reopened,item,cut);else await publicFault(reopened,item,cut);
    }
  }finally{await reopened.close();}
});

test('signed cycles, unsafe negatives and invalid aggregate producers reject before empty evaluation',async()=>{
  const store=await NativeEntityStore.open(),port=await openAuditedPort();
  const cases:FaultCase[]=[
    {name:'negative cycle with ground safe terms',program:"a('x') :- !b('x'). b('x') :- !a('x'). answer('x') :- a('x').",
      error:/TD_E_STRAT_CYCLE/},
    {name:'unused negative self-cycle',program:"bad('x') :- !bad('x'). answer('healthy').",error:/TD_E_STRAT_CYCLE/},
    {name:'negative-only variable',program:"answer(?x) :- !triple(?x,'edge','x').",error:/TD_E_STRAT_UNSAFE/},
    {name:'extra negative variable',program:"blocked('x'). answer(?x) :- triple(?x,'edge',?y),!blocked(?other).",
      error:/TD_E_STRAT_UNSAFE/},
    {name:'aggregate dependency cycle',program:'source(?n) :- total(?n). total(count()) :- source(?n). answer(?n) :- total(?n).',
      error:/TD_E_STRAT_CYCLE/},
    {name:'aggregate and negative dependency cycle',program:"source(1). a(count()) :- b(?n). b(1) :- !a(0). answer(?n) :- a(?n).",
      error:/TD_E_STRAT_CYCLE/},
    {name:'multiple aggregate producers',program:'source(1). total(count()) :- source(?n). '+
      'total(sum_i64(?n)) :- source(?n). answer(?n) :- total(?n).',error:/TD_E_AGG_PRODUCER/},
    {name:'ordinary and aggregate producers',program:'source(1). total(count()) :- source(?n). '+
      'total(0). answer(?n) :- total(?n).',error:/TD_E_AGG_PRODUCER/},
    {name:'aggregate key is not a source column',program:'source(1). answer(?missing,count()) :- source(?n).',
      error:/TD_E_AGG_DESCRIPTOR/},
    {name:'aggregate source columns must be variables',program:'source(1). answer(count()) :- source(1).',
      error:/TD_E_AGG_BODY/},
  ];
  try{for(const item of cases){await publicFault(store,item,zero);await rawFault(port,item,zero);}}
  finally{await store.close();await port.close();}
});
