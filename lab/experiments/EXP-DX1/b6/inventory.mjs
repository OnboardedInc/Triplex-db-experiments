// [DX-B6] Why: inspect only owned resources after cleanup, preserving exact command outcomes.
// Rejected: deleting anything outside the attempt's own names to obtain an empty inventory.
import { execFileSync } from 'node:child_process';
import { writeFileSync, readdirSync, readFileSync } from 'node:fs';
const env={...process.env,DOCKER_HOST:'unix:///Users/sam/.colima/triplex2/docker.sock'};
const observations=[];
for (const args of [['ps','-a','--filter','name=tx2-dxb6-','--format','{{.Names}}'],['volume','ls','--filter','name=tx2-dxb6-','--format','{{.Name}}'],['network','ls','--filter','name=tx2-dxb6-','--format','{{.Name}}']]) {
 const stdout=execFileSync('docker',args,{env,encoding:'utf8'});
 observations.push({args,exitCode:0,stdout});
 if(stdout.trim()) throw new Error(`Owned inventory remains: ${stdout}`);
}
const evidenceRoot='/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B6';
const retainedCleanup=[];
for(const name of readdirSync(evidenceRoot).filter(n=>n.startsWith('tx2-dxb6-')&&n.endsWith('-cleanup.txt'))){
 if(readFileSync(`${evidenceRoot}/${name}`,'utf8')!=='') throw new Error(`Nonempty historical cleanup: ${name}`);
 retainedCleanup.push(name);
}
const timedCleanup=readdirSync(evidenceRoot).filter(n=>n.startsWith('tx2-dxb6-')&&n.endsWith('-cleanup.json')).map(name=>{
 const result=JSON.parse(readFileSync(`${evidenceRoot}/${name}`,'utf8'));
 if(!result.inventoryEmpty||result.heldSeconds>900) throw new Error(`Invalid recorded cleanup: ${name}`);
 return {name,...result};
});
const result={retainedCleanup,timedCleanup,purpose:'resource cleanup only; no semantic verdict',observedAt:new Date().toISOString(),observations};
writeFileSync('/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B6/FINAL-INVENTORY.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
