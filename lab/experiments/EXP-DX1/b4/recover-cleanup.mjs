import fs from "node:fs";
import path from "node:path";
import {execFileSync,spawnSync} from "node:child_process";
// [DX-B4-T4] Why: resume only this interrupted stack's cleanup after the authorized daemon returns.
// Rejected: restarting the VM, using a default daemon, or deleting a replacement container with a different ID.
const prefix="tx2-dxb4-full-1794272803358";
const dir=`/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B4/${prefix}`;
const lock="/Users/sam/Claude/Projects/triplex-db-2/locks/measure";
const env={...process.env,DOCKER_HOST:"unix:///Users/sam/.colima/triplex2/docker.sock"};
const docker=args=>execFileSync("docker",args,{env,encoding:"utf8"}).trim();
const receipt={at:new Date().toISOString(),prefix,cleaned:false};
try {
 docker(["version","--format","{{.Server.Version}}"]);
 const proof=JSON.parse(fs.readFileSync(path.join(dir,"stack.json"),"utf8"));
 for(const c of proof.containers) {
  if(!c.name.startsWith(prefix+"-"))throw Error("Foreign container in cleanup proof");
  const result=spawnSync("docker",["container","inspect",c.name,"--format","{{.Id}}"],{env,encoding:"utf8"});
  if(result.status!==0) {if(result.stderr.includes("No such"))continue;throw Error(result.stderr);}
  if(result.stdout.trim()!==c.id)throw Error(`Replacement container: ${c.name}`);
 }
 const down=spawnSync("bash",["lab/experiments/EXP-DX1/stack/down.sh",prefix,"--volumes"],{env,encoding:"utf8"});
 receipt.down={exitCode:down.status,stdout:down.stdout,stderr:down.stderr};
 for(const [kind,args] of [["containers",["ps","-a","--filter",`name=${prefix}-`,"--format","{{.Names}}"]],
   ["networks",["network","ls","--filter",`name=${prefix}-`,"--format","{{.Name}}"]],
   ["volumes",["volume","ls","--filter",`name=${prefix}-`,"--format","{{.Name}}"]]]) {
  const remaining=docker(args);receipt[kind]=remaining;
  if(remaining)throw Error(`Owned ${kind} remain`);
 }
 receipt.cleaned=true;
 const owner=JSON.parse(fs.readFileSync(path.join(lock,"owner.json"),"utf8"));
 if(owner.prefix!==prefix)throw Error("Measurement lock now has another owner");
 fs.unlinkSync(path.join(lock,"owner.json"));fs.rmdirSync(lock);receipt.lockReleased=true;
} catch(error) {receipt.error=String(error);process.exitCode=1;}
finally {fs.writeFileSync(path.join(dir,`cleanup-recovery-${Date.now()}.json`),JSON.stringify(receipt,null,2)+"\n");console.log(JSON.stringify(receipt));}
