// [XN-S2-LIVE] Why: retain actual role/indexing/compaction counters without sampling subprocesses in a timed query. Rejected: inferring which node compacts from port placement.
import {save} from './common.mjs';
const phase=process.argv[2]??'final',observations={};
for(const role of ['write','read']){const response=await fetch(`http://tx2-xns2-${role}:8080/metrics`,{signal:AbortSignal.timeout(10000)});const text=await response.text();if(!response.ok)throw Error('metrics '+response.status);observations[role]={status:response.status,at:new Date().toISOString(),text}}
save(`${phase}-metrics`,observations);
