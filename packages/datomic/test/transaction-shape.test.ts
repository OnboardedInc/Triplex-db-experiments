import {it,expect} from 'vitest';
import {createHash} from 'node:crypto';
import {qualifyShape} from '../../../lab/trace/transaction-shape.mjs';
it('rejects stale, foreign, substituted and incomplete immutable-log census output',()=>{
  const input=JSON.stringify({run:'run',source:'head',slot:'run',scope:'scope',createdAt:100,commands:[{operationId:'op',position:1}]});
  const result={schema:'triplex.transaction-shape.v1',run:'run',source:'head',slot:'run',scope:'scope',requestHash:createHash('sha256').update(input).digest('hex'),startedAt:101,endedAt:102,
    transactions:[{operationId:'op',position:1,t:1000,datoms:2,valueUtf8Bytes:5,ednUtf8Bytes:10,attributes:[{attribute:':a',datoms:2,added:1,retracted:1,valueUtf8Bytes:5,ednUtf8Bytes:10}]}]};
  const manifest={tag:'run',source:'head',slot:'run'};
  const qualify=(r:unknown)=>qualifyShape(input,JSON.stringify(r),manifest,103);
  expect(qualify(result)).toEqual(result);
  for(const change of [{source:'old'},{slot:'other'},{scope:'other'},{requestHash:'wrong'},{endedAt:99},{startedAt:-2000},{transactions:[]}])
    expect(()=>qualify({...result,...change})).toThrow();
  for(const change of [{operationId:'foreign'},{position:2},{datoms:3},{attributes:[]}])
    expect(()=>qualify({...result,transactions:[{...result.transactions[0],...change}]})).toThrow();
  expect(()=>qualifyShape(input,JSON.stringify(result)+'\n'+JSON.stringify(result),manifest,103)).toThrow();
});
