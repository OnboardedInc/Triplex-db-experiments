import assert from 'node:assert/strict';
import {SCALE_INFINITY} from './scale-fixture.mjs';

const definition = 'schema mixed_scale version 1 { entity Anchor {s:text required;} '+
  'entity Row {b:boolean;r:ref_value(Anchor);s:text many;i:int64 many;f:float64 many;'+
  'dt:datetime many;j:json many;z:blob many;} }';
const schema = 'mixed_scale';
const anchorId = 'typed-anchor';
const suffix = number => String(number).padStart(8,'0');
const entityId = index => 'typed-e-'+suffix(index);
const make = (tag,value) => ({tag,value});
const repeating = ['s','i','f','dt','j','z'];
const attributes = ['b','dt','f','i','j','r','s','z'];
const historyRows = 3;

function field(attribute,index) {
  let value;
  switch (attribute) {
    case 'b': value=make('bool',index%2===0);break;
    case 'r': value=make('ref',anchorId);break;
    case 's': value=make('str','text-é-'+suffix(index));break;
    case 'i': value=make('i64',BigInt(index));break;
    case 'f': value=make('f64',index+0.125);break;
    case 'dt': value=make('datetime',index-10000.25);break;
    case 'j': {
      const prefix='{"i":'+index+',"p":"';
      const width=index%1024===6?4096:index%16===0?1024:64;
      value=make('json',prefix+'x'.repeat(width-prefix.length-2)+'"}');
      break;
    }
    case 'z':value={...make('blob','blob:'+suffix(index)),mimeType:'application/octet-stream',
      size:index,...(index%2===0?{filename:'é-'+suffix(index)+'.bin'}:{})};break;
    default:throw new Error('Unknown mixed fixture attribute '+attribute);
  }
  return {attribute,value};
}

function fields(start,length) {
  return Array.from({length},(_,offset)=>field(offset===0?'b':offset===1?'r':
    repeating[(offset-2)%repeating.length],start+offset));
}

function attributeCount(attribute,width) {
  if (attribute==='b') return Number(width>=1);
  if (attribute==='r') return Number(width>=2);
  return Math.max(0,Math.ceil((width-2-repeating.indexOf(attribute))/repeating.length));
}

function insertedCount(attribute,added) {
  return Math.max(0,Math.ceil((added-attributes.indexOf(attribute))/attributes.length));
}

function counts(size,groupSize,added) {
  const facts=size-historyRows-1;
  const full=Math.floor(facts/groupSize),tail=facts%groupSize;
  return attributes.map(attribute=>[attribute,BigInt(full*attributeCount(attribute,groupSize)+
    attributeCount(attribute,tail)+insertedCount(attribute,added)+Number(attribute==='s'))]);
}

function projection(size,groupSize) {
  return fields(0,Math.min(size-historyRows-1,groupSize)).sort((a,b)=>{
    const byAttribute=attributes.indexOf(a.attribute)-attributes.indexOf(b.attribute);
    if (byAttribute) return byAttribute;
    const left=a.value.value,right=b.value.value;
    return typeof left==='string' ? Buffer.compare(Buffer.from(left),Buffer.from(right)) :
      Number(left>right)-Number(left<right);
  }).map(({attribute,value})=>[make('str',attribute),make(value.tag,value.value)]);
}

function literal({tag,value,mimeType,size,filename}) {
  switch (tag) {
    case 'str':return JSON.stringify(value);
    case 'bool':case 'i64':return String(value);
    case 'ref':case 'json':return tag+'('+JSON.stringify(value)+')';
    case 'f64':case 'datetime': {
      const bits=Buffer.alloc(8);bits.writeDoubleBE(value);
      return tag+'("'+bits.toString('hex')+'")';
    }
    case 'blob': {
      const args=[JSON.stringify(value),JSON.stringify(mimeType),size];
      if (filename!==undefined) args.push(JSON.stringify(filename));
      return 'blob('+args.join(',')+')';
    }
    default:throw new Error('Unknown fixture type '+tag);
  }
}

export const mixedScaleWorkload = {
  queries:[
    {kind:'count',program:'answer(count()) :- triple(?e,?a,?v).'},
    {kind:'grouped_count',program:'answer(?a,count()) :- triple(?e,?a,?v).'},
    {kind:'projection',program:"answer(?a,?v) :- triple('"+entityId(0)+"',?a,?v)."},
  ],
  expected({size,groupSize,initialAdded=0},kind,added) {
    const inserts=initialAdded+added;
    switch (kind) {
      case 'count':return [[make('i64',BigInt(size-historyRows+inserts))]];
      case 'grouped_count':return counts(size,groupSize,inserts).filter(([,count])=>count>0n)
        .map(([attribute,count])=>[make('str',attribute),make('i64',count)]);
      case 'projection':return projection(size,groupSize);
      default:throw new Error('Unknown mixed-scale query '+kind);
    }
  },
  write({size,initialAdded=0,writePrefix='typed-live-e-',commandPrefix='typed-live-c-'},index) {
    const ordinal=initialAdded+index;
    const attribute=attributes[ordinal%attributes.length];
    const input=field(attribute,size+ordinal);
    return {request:{schema,version:1,type:'Row',entityId:writePrefix+suffix(index),
      commandId:commandPrefix+suffix(index),validFrom:0n,validTo:SCALE_INFINITY,
      record:'{'+attribute+'='+literal(input.value)+';}'},value:attribute};
  },
};

export function mixedBaselineFromEvidence(source) {
  assert.equal(source.schema,'temporal-scale-benchmark/1');
  assert.equal(source.status,'passed');
  assert.equal(source.configuration.fixtureMode,'mixed');
  assert.equal(source.stages.length,1,'Mixed clone requires a single-stage receipt');
  const [stage]=source.stages;
  assert.equal(stage.status,'passed');
  const {size,fixture}=stage;
  const {groupSize}=source.configuration;
  const groups=Math.ceil((size-historyRows-1)/groupSize);
  assert.equal(fixture.size,size);
  assert.equal(fixture.groupSize,groupSize);
  assert.equal(fixture.groups,groups);
  assert.ok(['mixed_native_commands','closed_fixture_clone'].includes(fixture.setupRoute));
  assert.ok(fixture.setupRoute!=='mixed_native_commands'||fixture.initialAdded===undefined);
  const prior=fixture.initialAdded??0;
  assert.ok(Number.isSafeInteger(prior)&&prior>=0);
  const position=BigInt(groups+2+prior);
  assert.equal(BigInt(fixture.position),position);
  const mixed=stage.cells.filter(cell=>cell.mixedIngestion);
  assert.ok(mixed.length<=1);
  const writes=mixed[0]?.writes??[];
  if (mixed.length) {
    assert.equal(mixed[0].reopenVerified,true,'Mixed clone requires verified reopened answers');
    assert.equal(mixed[0].finalReadVerified,true);
    assert.equal(mixed[0].errors.length,0);
    assert.equal(mixed[0].writeAcknowledgementErrors.length,0);
  }
  for (const [index,write] of writes.entries()) {
    assert.equal(write.index,index);
    assert.equal(BigInt(write.position),position+BigInt(index+1));
    assert.equal(write.value,attributes[(prior+index)%attributes.length]);
    assert.equal(write.reconciled,false);
  }
  return {size,groupSize,groups,initialAdded:prior+writes.length,position:position+BigInt(writes.length),latestCut:true};
}

/** All retained rows, including the closed interval and its fragments, come from native commands. */
export async function createMixedScaleFixture({NativeEntityStore,NativeDuckDBPort,database,
  size,groupSize,openOptions,onProgress}) {
  const payloadFacts=size-historyRows-1;
  const groups=Math.ceil(payloadFacts/groupSize);
  const request={schema,version:1,validFrom:0n,validTo:SCALE_INFINITY};
  const anchor={...request,type:'Anchor',entityId:anchorId};
  const store=await NativeEntityStore.open({...openOptions,database});
  let position;
  let previousProgress=performance.now();
  try {
    await store.defineSchema(definition);
    const seed=await store.put({...anchor,commandId:'typed-anchor-create',fields:[field('s',0)]});
    assert.equal(seed.position,1n);
    for (let group=0;group<groups;group++) {
      const start=group*groupSize;
      const length=Math.min(groupSize,payloadFacts-start);
      const put=await store.put({...request,type:'Row',entityId:entityId(group),commandId:'typed-c-'+suffix(group),
        fields:fields(start,length)});
      assert.equal(put.position,BigInt(group+2));
      assert.equal(put.asserted.length,length);
      if (group===0||group===groups-1||performance.now()-previousProgress>5000) {
        await onProgress?.({phase:'mixed_native_ingestion',acknowledgedFixtureFacts:start+length+1,
          completedCommands:group+2,requestedFacts:size,setupRoute:'mixed_native_commands'});
        previousProgress=performance.now();
      }
    }
    const patch=await store.patch({...anchor,commandId:'typed-anchor-patch',validFrom:10n,validTo:20n,fields:[field('s',1)]});
    assert.equal(patch.asserted.length,historyRows);
    assert.equal(patch.retracted.length,1);
    position=patch.position;
    assert.equal(position,BigInt(groups+2));
    for (const [knownAt,validAt,index] of [[1n,10n,0],[position,0n,0],[position,10n,1],[position,20n,0]]) {
      const point=await store.at(anchorId,{knownAt,validAt});
      assert.deepEqual(point.map(assertion=>assertion.value),[field('s',index).value]);
    }
  } finally {await store.close();}

  const port=await NativeDuckDBPort.open({...openOptions,database});
  const run=sql=>port.run({name:'mixed_scale_fixture_audit',sql,params:[]});
  try {
    const [[retained,closed,bytes]]=await run('SELECT count(*),count(*) FILTER (WHERE tx_to<9223372036854775807),'+
      'sum(octet_length(encode(e))+octet_length(encode(a))+octet_length(encode(payload))+'+
      'coalesce(octet_length(encode(extra_json)),0))::BIGINT FROM main.assertions');
    assert.equal(retained,BigInt(size));
    assert.equal(closed,1n);
    assert.deepEqual(await run('SELECT position,retained_count,retained_bytes FROM main.clock,main.storage_usage '+
      'WHERE main.clock.singleton AND main.storage_usage.singleton'),[[position,retained,bytes]]);
    assert.deepEqual(await run('SELECT a,count(*) FROM main.assertions WHERE valid_from<=0 AND valid_to>0 '+
      'AND tx_to=9223372036854775807 GROUP BY a ORDER BY a'),counts(size,groupSize,0).filter(([,count])=>count>0n));
    return {size,groupSize,groups,position,latestCut:true,retainedBytes:bytes,
      closedRows:closed,setupRoute:'mixed_native_commands',schema:definition};
  } finally {await port.close();}
}
