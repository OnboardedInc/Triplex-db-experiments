import assert from 'node:assert/strict';
import { test } from 'node:test';
import { observe } from '../../../bench/lib/observe.ts';
import { Model } from '../../../bench/lib/model.ts';
import { ownFacts, sharedFacts, accountOfSubject, memberOf } from '../../../bench/lib/world.ts';
import { Digest } from '../../../bench/lib/rng.ts';
import type { PullResult } from '../../../bench/lib/composition.ts';
const pull=(triples:any[]):PullResult=>({triples,entities:0,roundTrips:1,depth:0,route:'source',language:'test',waitedMs:0});
const freeze=(v:any):any=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
// [DX-H7] Why: preserve the previous full member hashing as the comparison path.
// Rejected: trusting only cache-hit counters (would not detect wrong digest composition).
const slow=(pr:PullResult)=>{
 const d=new Digest();let bytes=0,stamp=-1,stamps=0;
 for(const t of pr.triples){const m=memberOf(t.entityId,t.attribute,t.value);d.add(m);bytes+=m.length;if(t.attribute===':placement/stamp'){stamp=Math.max(stamp,Number(t.value.value));stamps++;}}
 return {digest:d.hex(),stamp,stamps,facts:d.n,bytes};
};
test('every frozen bucket/hop world equals the independent expected model and full hashing',()=>{
 const model=new Model(10000);
 for(let a=0;a<20;a++)for(const hopIndex of [0,7,8,14,15,19]){
  const i=a*20+hopIndex;
  const triples=[...ownFacts(i,model.accounts),...sharedFacts(accountOfSubject(i,model.accounts))].map((f,k)=>freeze({id:String(k),entityId:f.e,attribute:f.a,value:f.v}));
  const p=pull(triples),expected=model.expected(i,Date.now(),Date.now());
  for(let repeat=0;repeat<3;repeat++){const observed=observe(p);assert.deepEqual(observed,slow(p));assert.equal(observed.digest,expected.digest);assert.equal(observed.stamp,expected.stamp);}
  assert.deepEqual(observe(pull([...triples].reverse())),slow(p));
  assert.notEqual(observe(pull(triples.slice(1))).digest,expected.digest);
  assert.notEqual(observe(pull([...triples,triples[0]])).digest,expected.digest);
 }
});
test('mutable, shallow-frozen nested JSON, same-ID revisions and filtered subsets remain exact',()=>{
 const nested={x:[1,{a:'first'}]};
 const t=Object.freeze({id:'same',entityId:'e',attribute:':json',value:Object.freeze({type:'json',value:nested})});
 const p=pull([t]);const first=observe(p);nested.x[1]={a:'changed'};
 assert.notEqual(observe(p).digest,first.digest);assert.deepEqual(observe(p),slow(p));
 const mutable={id:'m',entityId:'e',attribute:':placement/stamp',value:{type:'integer',value:'1'}};
 assert.equal(observe(pull([mutable])).stamp,1);mutable.value.value='2';assert.equal(observe(pull([mutable])).stamp,2);
 const old=freeze({id:'same',entityId:'e',attribute:':v',value:{type:'string',value:'old'}});
 const current=freeze({...old,value:{type:'string',value:'current'}});
 assert.notEqual(observe(pull([old])).digest,observe(pull([current])).digest);
 for(const rows of [[old,current],[old],[current],[],[current,current]])assert.deepEqual(observe(pull(rows)),slow(pull(rows)));
});
