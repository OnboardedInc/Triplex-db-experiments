// @ts-nocheck -- [EXP-XN1] Why: Docker JSON records are runtime observations. Rejected: product dependencies for a cleanup check.
// [EXP-XN1] Why: verify actual slot release instead of treating engine.mjs exit zero as proof.
// Rejected: deleting any remaining resource here (unknown state must remain inspectable).
import fs from 'node:fs';
import {docker,save,dir} from './common.mjs';
const profile=JSON.parse(fs.readFileSync(`${dir}/engine-profile.json`));
const lock='/Users/sam/projects/triplex-db-2/lab/locks/xtdb-s1';
const ledger=JSON.parse(fs.readFileSync('/Users/sam/projects/triplex-db-2/lab/locks/pool.json'));
const containers=docker('ps','-a','--filter','name=^/tx2-xtdb-s1$','--format','json').trim();
const reservations=ledger.reservations.filter(x=>x.container==='tx2-xtdb-s1');
const volume=JSON.parse(docker('volume','inspect','tx2-xtdb-s1-data'));
const residents=docker('ps','-a','--filter','name=tx2-xtdb-dev','--filter','name=tx2-qlever-dev','--format','json').trim().split('\n').filter(Boolean).map(JSON.parse);
const identity=r=>r.map(x=>[x.Names,x.ID]).sort();
const residentIdentitiesUnchanged=JSON.stringify(identity(profile.residents))===JSON.stringify(identity(residents));
const slotReleased=containers===''&&!fs.existsSync(lock)&&reservations.length===0;
save('cleanup-verification',{at:new Date().toISOString(),removedContainerId:profile.id,containers,slotLockExists:fs.existsSync(lock),reservations,volume,residents,residentIdentitiesUnchanged,slotReleased});
if(!slotReleased||!residentIdentitiesUnchanged||volume[0]?.Name!=='tx2-xtdb-s1-data')throw Error('cleanup read-back differs from declared retention');
console.log('Owned slot released; volume retained; resident identities unchanged.');
