// [CX-VP2Q-4-R10] Why: exercise the exact builder descriptor walk with adversarial JavaScript construction routes.
// Rejected: reimplementing its predicate in the reviewer (could hide a flaw in the actual guard).
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import { Effect } from 'effect';
import { expect, it } from 'vitest';
import { constructSnapshotReads, constructReadDispatch, constructReadSurface, exactReadService, isConstructedRead } from '@triplex-build/triplex/runtime';
import { REPO, writeJson } from './harness.js';
const bytes=fs.readFileSync(`${REPO}/lab/verify/P2Q/tests/round9-construction.test.ts`,'utf8');
const source=ts.createSourceFile('guard.ts',bytes,ts.ScriptTarget.Latest,true);
const node=source.statements.filter(n=>ts.isVariableStatement(n)).flatMap(n=>(n as ts.VariableStatement).declarationList.declarations).filter(n=>n.name.getText(source)==='inspect');
expect(node).toHaveLength(1);
const inspect=Function('isConstructedRead',ts.transpile(`const ${node[0]!.getText(source)}; return inspect;`))(isConstructedRead) as (o:object,e:readonly string[])=>string[];
const guardSha256=createHash('sha256').update(bytes).digest('hex');
const raw=(_basis?:unknown)=>Effect.succeed([]);
const wrapped=constructSnapshotReads({good:{run:raw,basis:()=>undefined,rawHistory:false}},{wrap:e=>e});
const sym=Symbol('round10Read');
const routes:{name:string;build:()=>object}[]=[
 {name:'subclass',build:()=>{class Base{};class Child extends Base{round10Read=raw};return Object.assign(new Child(),wrapped)}},
 {name:'subclass-prototype',build:()=>{class Base{};class Child extends Base{round10Read(...args:any[]){return raw(...args)}};return Object.assign(new Child(),wrapped)}},
 {name:'mixin',build:()=>{class Base{};const M=(B:typeof Base)=>class extends B{round10Read=raw};return Object.assign(new (M(Base))(),wrapped)}},
 {name:'assign',build:()=>Object.assign(Object.create(null),wrapped,{round10Read:raw})},
 {name:'inherited',build:()=>Object.assign(Object.create({round10Read:raw}),wrapped)},
 {name:'deep-inherited',build:()=>Object.assign(Object.create(Object.create({round10Read:raw})),wrapped)},
 {name:'getter-function',build:()=>Object.defineProperty(Object.assign(Object.create(null),wrapped),'round10Read',{get:()=>raw})},
 {name:'inherited-getter',build:()=>Object.assign(Object.create(Object.defineProperty(Object.create(null),'round10Read',{get:()=>raw})),wrapped)},
 {name:'symbol',build:()=>Object.assign(Object.create(null),wrapped,{[sym]:raw})},
 {name:'inherited-symbol',build:()=>Object.assign(Object.create({[sym]:raw}),wrapped)},
 {name:'hidden-symbol',build:()=>Object.defineProperty(Object.assign(Object.create(null),wrapped),sym,{value:raw})},
 {name:'nonenumerable',build:()=>Object.defineProperty(Object.assign(Object.create(null),wrapped),'round10Read',{value:raw})},
];
it.each(routes)('round10 actual guard rejects $name unwrapped callable',({name,build})=>{
 const object=build();let error='';try{inspect(object,[])}catch(e){error=String(e)}
 expect(error).toMatch(/unconstructed (read|accessor):/);
 writeJson(`round10-route-${name}.json`,{name,guardSha256,error,keys:Reflect.ownKeys(object).map(String)});
});
it('round10 frozen real construction rejects late assign, define and prototype mutation',()=>{
 for(const change of [()=>Object.assign(wrapped,{round10Read:raw}),()=>Object.defineProperty(wrapped,'round10Read',{value:raw}),()=>Object.setPrototypeOf(wrapped,{round10Read:raw}),()=>Object.defineProperty(wrapped,sym,{value:raw})]) expect(change).toThrow(TypeError);
 expect(inspect(wrapped,[])).toEqual(['good']);
 writeJson('round10-frozen.json',{guardSha256,frozen:Object.isFrozen(wrapped),prototype:Object.getPrototypeOf(wrapped),reads:inspect(wrapped,[]),mutationsRejected:4});
});
it('round10 generic dispatch identity can be laundered into a repository read with no policy call',async()=>{
 let checks=0;
 const policy={wrap:<A,E,R>(e:Effect.Effect<A,E,R>)=>{checks++;return e}};
 const ordinary=constructSnapshotReads({good:{run:raw,basis:()=>undefined,rawHistory:false}},policy);
 const forged=constructReadDispatch({round10Read:(basis:{recordedPosition:number;validAt:number})=>[basis] as const},raw);
 const assembled=exactReadService<{good:typeof ordinary.good;round10Read:typeof forged.round10Read}>()({...ordinary,...forged});
 expect(inspect(assembled,[])).toEqual(['good','round10Read']);
 const requested=6144,value=await Effect.runPromise(assembled.round10Read({recordedPosition:requested,validAt:0}));
 expect(value).toEqual([]);expect(checks).toBe(0);
 writeJson('round10-identity-laundering.json',{guardSha256,requested,observed:2048,value,checks,acceptedReads:inspect(assembled,[]),purpose:'counterexample to identity guard, not a real broker refusal claim'});
});
it('round10 symbol and inherited table keys survive inferred types but are silently omitted at runtime',()=>{
 const op={run:raw,basis:()=>undefined,rawHistory:false};
 const symbolic=constructSnapshotReads({good:op,[sym]:op},{wrap:e=>e});
 class Base{get round10Read(){return op}};class Table extends Base{good=op};
 const inherited=constructSnapshotReads(new Table(),{wrap:e=>e});
 const identity=constructReadSurface({good:raw,[sym]:raw},(fn,args)=>fn(...args));
 expect(typeof symbolic.good).toBe('function');expect(symbolic[sym]).toBeUndefined();
 expect(inherited.round10Read).toBeUndefined();expect(identity[sym]).toBeUndefined();
 expect(inspect(symbolic,[])).toEqual(['good']);expect(inspect(inherited,[])).toEqual(['good']);
 writeJson('round10-dropped-keys.json',{guardSha256,symbolInputs:Reflect.ownKeys({good:op,[sym]:op}).map(String),symbolOutputs:Reflect.ownKeys(symbolic).map(String),inheritedInputs:Object.keys(new Table()),inheritedOutputs:Object.keys(inherited),guardAccepted:true});
});
