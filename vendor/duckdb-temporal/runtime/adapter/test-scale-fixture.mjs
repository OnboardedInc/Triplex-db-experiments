import assert from 'node:assert/strict';
import {test} from 'node:test';
import {parseScaleOptions,readCell} from './benchmark-scale.mjs';
import {baselineFromEvidence} from './scale-fixture.mjs';
import {countWriteOverlaps,fixtureExpected,quantiles,scaleExpected,scaleRecord} from './scale-fixture.mjs';
import {mixedBaselineFromEvidence,mixedScaleWorkload} from './mixed-scale-fixture.mjs';

test('scale oracle preserves exact sums, partial groups and committed ingestion',()=>{
  assert.deepEqual(scaleExpected(5,2,'count',2),[[{tag:'i64',value:7n}]]);
  assert.deepEqual(scaleExpected(5,2,'sum',2),[[{tag:'i64',value:21n}]]);
  assert.deepEqual(scaleExpected(5,2,'grouped_sum'),[
    [{tag:'str',value:'scale-e-00000000'},{tag:'i64',value:1n}],
    [{tag:'str',value:'scale-e-00000001'},{tag:'i64',value:5n}],
    [{tag:'str',value:'scale-e-00000002'},{tag:'i64',value:4n}],
  ]);
  assert.equal(scaleRecord(2,5),'{i=2;i=3;i=4;}');
  const mixed={size:13,groupSize:8};
  assert.deepEqual(mixedScaleWorkload.expected(mixed,'count',3),[[{tag:'i64',value:13n}]]);
  assert.deepEqual(mixedScaleWorkload.expected(mixed,'grouped_count',3).map(([attribute,count])=>[attribute.value,count.value]),
    [['b',3n],['dt',2n],['f',2n],['i',1n],['j',1n],['r',1n],['s',2n],['z',1n]]);
  const projected=mixedScaleWorkload.expected(mixed,'projection',0);
  assert.equal(projected.length,8);
  assert.equal(Buffer.byteLength(projected.find(([,value])=>value.tag==='json')[1].value),4096);
  assert.deepEqual(projected.at(-1)[1],{tag:'blob',value:'blob:00000007'});
  const wide=mixedScaleWorkload.expected({size:260,groupSize:256},'projection',0);
  const jsonIndices=wide.filter(([,value])=>value.tag==='json').map(([,value])=>JSON.parse(value.value).i);
  assert.deepEqual(jsonIndices.slice(0,3),[102,108,114]);
});

test('scale CLI rejects accidental options and invalid ranges',()=>{
  assert.deepEqual(parseScaleOptions(['--sizes','100,200','--readers','1,4','--writes','0']).sizes,[100,200]);
  assert.equal(parseScaleOptions(['--duration-seconds','60','--max-writes','100']).durationSeconds,60);
  assert.equal(parseScaleOptions([]).readOnlyDurationSeconds,0);
  assert.equal(parseScaleOptions(['--read-duration-seconds','60']).readOnlyDurationSeconds,60);
  assert.equal(parseScaleOptions(['--read-duration-seconds','0']).readOnlyDurationSeconds,0);
  for (const value of ['-1','0.5','later']) assert.throws(()=>parseScaleOptions(['--read-duration-seconds',value]));
  for (const args of [['--unknown','x'],['--samples','0'],['--sizes','1,no'],['--group-size','4097'],['--fixture-mode','other']]) {
    assert.throws(()=>parseScaleOptions(args));
  }
  assert.throws(()=>parseScaleOptions(['--resume-commands','1']));
  assert.throws(()=>parseScaleOptions(['--resume-database','fixture.duckdb','--resume-commands','1']));
  assert.equal(parseScaleOptions(['--sizes','1000','--resume-database','fixture.duckdb',
    '--resume-commands','1','--resume-evidence','earlier.json','--resume-recovery','recovery.json']).resumeCommands,1);
  for(const value of ['strict','owned','auto','other']) assert.throws(()=>parseScaleOptions(['--integrity',value]));
  assert.throws(()=>parseScaleOptions(['--clone-database','fixture.duckdb']));
  assert.throws(()=>parseScaleOptions(['--fixture-mode','mixed']));
  assert.equal(parseScaleOptions(['--fixture-mode','mixed','--group-size','256']).fixtureMode,'mixed');
  assert.equal(parseScaleOptions(['--sizes','1000','--clone-database','fixture.duckdb',
    '--clone-evidence','earlier.json']).cloneDatabase,'fixture.duckdb');
});

test('write-overlap counting excludes touching endpoints and handles nested intervals',()=>{
  assert.equal(countWriteOverlaps([{startOffsetMs:10,elapsedMs:10}],
    [{startOffsetMs:0,elapsedMs:10},{startOffsetMs:20,elapsedMs:10}]),0);
  assert.equal(countWriteOverlaps([{startOffsetMs:10,elapsedMs:10},{startOffsetMs:0,elapsedMs:30}],
    [{startOffsetMs:11,elapsedMs:2},{startOffsetMs:0,elapsedMs:30}]),4);
});

test('empirical quantiles keep all samples and use nearest ranks',()=>{
  assert.equal(quantiles([]),null);
  assert.deepEqual(quantiles([4,1,3,2]),{count:4,min:1,p50:2,p95:4,p99:4,max:4});
});

test('paired baseline includes previously acknowledged native writes and rejects receipt gaps',()=>{
  const source={configuration:{groupSize:2},stages:[{status:'passed',size:5,cells:[{
    mixedIngestion:true,status:'passed',finalReadVerified:true,writes:[{position:'4'},{position:'5'}],
  }]}]};
  assert.deepEqual(baselineFromEvidence(source),{size:5,groupSize:2,groups:3,initialAdded:2,
    initialEntityIds:['write-e-00000000','write-e-00000001'],position:5n,latestCut:true});
  source.stages[0].cells[0].writes[1].position='6';
  assert.throws(()=>baselineFromEvidence(source));
});

test('cloned mixed fixture keeps old facts and names new entities independently',()=>{
  const fixture={size:2,groupSize:2,initialAdded:1,initialEntityIds:['write-e-00000000'],writePrefix:'campaign-unique-'};
  assert.deepEqual(fixtureExpected(fixture,'count',1),[[{tag:'i64',value:4n}]]);
  assert.deepEqual(fixtureExpected(fixture,'sum',1),[[{tag:'i64',value:6n}]]);
  assert.deepEqual(fixtureExpected(fixture,'grouped_sum',1),[
    [{tag:'str',value:'campaign-unique-00000000'},{tag:'i64',value:3n}],
    [{tag:'str',value:'scale-e-00000000'},{tag:'i64',value:1n}],
    [{tag:'str',value:'write-e-00000000'},{tag:'i64',value:2n}],
  ]);
  const mixed={schema:'temporal-scale-benchmark/1',status:'passed',configuration:{fixtureMode:'mixed',groupSize:8},stages:[{
    status:'passed',size:13,fixture:{size:13,groupSize:8,groups:2,position:'4',setupRoute:'mixed_native_commands'},
    cells:[{mixedIngestion:true,reopenVerified:true,finalReadVerified:true,errors:[],writeAcknowledgementErrors:[],
      writes:[{index:0,position:'5',value:'b',reconciled:false},{index:1,position:'6',value:'dt',reconciled:false}]}],
  }]};
  const baseline=mixedBaselineFromEvidence(mixed);
  assert.equal(baseline.position,6n);
  assert.equal(baseline.initialAdded,2);
  assert.deepEqual(mixedScaleWorkload.expected(baseline,'count',1),[[{tag:'i64',value:13n}]]);
  const write=mixedScaleWorkload.write({...baseline,writePrefix:'new-e-',commandPrefix:'new-c-'},0);
  assert.equal(write.value,'f');
  assert.equal(write.request.commandId,'new-c-00000000');
  assert.match(write.request.record,/^\{f=f64\("/);
  mixed.stages[0].cells[0].writes[1].value='f';
  assert.throws(()=>mixedBaselineFromEvidence(mixed));
});


test('read-only timed cell keeps its query and cut, drains readers and never writes',async()=>{
  const fixture={size:2,groupSize:2,position:1n};
  const query={kind:'count',program:'count-query'};
  const requests=[];
  let puts=0;
  const store={
    readerStats:()=>({capacity:1,available:1,active:0,waiting:0}),
    putRecord:async()=>{puts++;throw new Error('Unexpected write');},
    queryScalable:async(program,options)=>{
      requests.push({program,options});
      await new Promise(resolve=>setTimeout(resolve,10));
      return {position:1n,rows:fixtureExpected(fixture,'count'),route:'sql',reason:'scalable_count'};
    },
  };
  const options={...parseScaleOptions([]),readerCount:1,warmup:1,samples:1,readOnlyDurationSeconds:0.03};
  const cell=await readCell({store,fixture,query,options,scalable:true});
  assert.equal(cell.status,'passed');
  assert.equal(cell.measurementMode,'read_only_duration');
  assert.equal(cell.requestedDurationMs,30);
  assert.ok(cell.wallMs>=30);
  assert.ok(cell.drainMs>=0);
  assert.ok(cell.samples.length>=1);
  assert.ok(cell.samples.every(sample=>sample.startOffsetMs<cell.requestedDurationMs));
  assert.equal(cell.windows.reduce((total,window)=>total+window.completedReads,0),cell.samples.length);
  assert.ok(requests.every(request=>request.program===query.program && request.options.knownAt===1n));
  assert.ok(cell.samples.every(sample=>sample.kind==='count' && sample.cut==='fixed'));
  assert.equal(puts,0);
  assert.deepEqual(cell.writes,[]);
});

test('default read-only cell preserves sample-count measurement',async()=>{
  const fixture={size:2,groupSize:2,position:1n};
  let calls=0;
  const store={queryScalable:async()=>{
    calls++;
    return {position:1n,rows:fixtureExpected(fixture,'count'),route:'sql',reason:'scalable_count'};
  }};
  const options={...parseScaleOptions([]),readerCount:1,warmup:1,samples:2};
  const cell=await readCell({store,fixture,query:{kind:'count',program:'count-query'},options,scalable:true});
  assert.equal(cell.status,'passed');
  assert.equal(cell.measurementMode,'sample_count');
  assert.equal(cell.requestedDurationMs,null);
  assert.equal(cell.drainMs,null);
  assert.equal(cell.samples.length,2);
  assert.equal(calls,4);
});
