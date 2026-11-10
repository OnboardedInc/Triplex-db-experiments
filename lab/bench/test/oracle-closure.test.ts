import assert from 'node:assert/strict';
import {test} from 'node:test';
import {buildCase} from '../lib/oracle.ts';
// [DX-H3] Why: all members of an atomic history batch need their seed assertion identities.
// Rejected: validating sampled worlds after replay has already diverged on omitted inputs.
const seed=(position:number,id:string,subject:string):any=>({commandId:`seed-${position}`,operations:[{op:'assert',entityId:subject,attribute:':status',value:{type:'string',value:'old'},validFrom:0}],preconditions:[],receipt:{position,instant:position,txId:`tx-${position}`,assertionIds:[id]}});
test('a retained history batch rejects omitted seed parents, and retains the complete atomic command',()=>{
 const a=seed(1,'row-a','sample'),b=seed(2,'row-b','other-history-member');
 const history:any={commandId:'history',operations:[{op:'retract',id:'row-a'},{op:'retract',id:'row-b'}],preconditions:[],receipt:{position:3,instant:3,txId:'tx-3',assertionIds:[null,null]}};
 assert.throws(()=>buildCase({caseId:'incomplete',commands:[a,history],lastPosition:3,reads:[]}),/assertion row-b.*not recorded/);
 const full=buildCase({caseId:'complete',commands:[a,b,history],lastPosition:3,reads:[]});
 assert.deepEqual((full.commands[2] as any).operations,history.operations);
 assert.equal(full.receipts[2].position,3);
});
