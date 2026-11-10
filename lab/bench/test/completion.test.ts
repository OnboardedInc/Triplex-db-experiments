import assert from 'node:assert/strict';
import {test} from 'node:test';
import {historyDepthsComplete,observeFinalHead} from '../lib/completion.ts';
test('failed or incomplete history growth cannot establish flatness',()=>{
 const full=[{targetDepth:3,reachedDepth:3,subjects:1000},{targetDepth:10,reachedDepth:10,subjects:1000}];
 assert.equal(historyDepthsComplete(full,1000),true);
 assert.equal(historyDepthsComplete([{...full[0],reachedDepth:1,incomplete:true},full[1]],1000),false);
 assert.equal(historyDepthsComplete([full[0]],1000),false);
 assert.equal(historyDepthsComplete(full,2000),false);
});
test('an unavailable or invalid final head stays unknown and retains its failure',async()=>{
 const errors:string[]=[];
 assert.equal(await observeFinalHead(async()=>42,errors),42);assert.deepEqual(errors,[]);
 assert.equal(await observeFinalHead(async()=>{throw Error('deadline');},errors),null);assert.match(errors[0],/deadline/);
 assert.equal(await observeFinalHead(async()=>NaN,errors),null);assert.equal(errors.length,2);
});
