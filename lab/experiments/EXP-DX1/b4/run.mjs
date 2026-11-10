import fs from "node:fs";
import {createHash} from "node:crypto";
import path from "node:path";
import {spawn, execFileSync} from "node:child_process";
const kind = process.argv[2] ?? "small";
const root = "/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B4";
const prefix = `tx2-dxb4-${kind}-${Date.now()}`;
const dir = path.join(root,prefix); fs.mkdirSync(dir,{recursive:true});
const lock = "/Users/sam/Claude/Projects/triplex-db-2/locks/measure";
while(true) {try {fs.mkdirSync(lock); break;} catch(e) {if(e.code!=="EEXIST") throw e; await new Promise(r=>setTimeout(r,5000));}}
fs.writeFileSync(path.join(dir,"lock-acquired.json"), JSON.stringify({at:new Date().toISOString(),kind,prefix}));
const env = {...process.env, DOCKER_HOST:"unix:///Users/sam/.colima/triplex2/docker.sock", DX_STACK_EVIDENCE:root,
 DATOMIC_URL:"http://127.0.0.1:8501", DATOMIC_READ_URLS:"http://127.0.0.1:8502", TX2_ENGINE_CPUS:"5",
 TX2_ENGINE_CONTAINER:["pg","tx","gw-w","gw-r"].map(r=>`${prefix}-${r}`).join(",")};
let child;
const timer = kind === "full" ? null : setTimeout(() => child?.kill("SIGTERM"), 890000);
const command = (cmd,args,file) => new Promise((resolve,reject)=>{const fd=fs.openSync(path.join(dir,file),"w");const p=spawn(cmd,args,{env,stdio:["ignore",fd,fd]});p.on("error",reject);p.on("exit",code=>{fs.closeSync(fd);code===0?resolve():reject(Error(`${cmd} exited ${code}`));});});
const snapshot = async phase => {
 const stats = await Promise.all([8501,8502].map(async port => ({port,stats:await (await fetch(`http://127.0.0.1:${port}/v2/admin/scan-stats`)).json()})));
 fs.appendFileSync(path.join(dir,"scan-stats.jsonl"),JSON.stringify({phase,at:new Date().toISOString(),stats})+"\n");
};
try {
 const files = execFileSync("git",["ls-files","packages/core/src","packages/datomic/src","packages/datomic/gateway","lab/bench"],{encoding:"utf8"}).trim().split("\n");
 const walk = folder => fs.readdirSync(folder,{withFileTypes:true}).flatMap(e => e.isDirectory()?walk(path.join(folder,e.name)):[path.join(folder,e.name)]);
 for(const folder of ["packages/core/dist","packages/datomic/dist","packages/host/dist"]) files.push(...walk(folder));
 files.push("lab/experiments/EXP-DX1/b4/run.mjs");
 const hashes={};
 for(const file of files) { const bytes=fs.readFileSync(file); hashes[file]=createHash("sha256").update(bytes).digest("hex"); const dest=path.join(dir,"source",file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,bytes); }
 fs.writeFileSync(path.join(dir,"source-hashes.json"),JSON.stringify(hashes,null,2));
 fs.writeFileSync(path.join(dir,"head.txt"),execFileSync("git",["rev-parse","HEAD"]));
 fs.writeFileSync(path.join(dir,"diff.patch"),execFileSync("git",["diff"]));
 await command("bash",["lab/experiments/EXP-DX1/stack/up.sh",prefix,"--cpus-pg","0","--cpus-tx","0,1","--cpus-gw-write","2","--cpus-gw-read","3,4","--port-write","8501","--port-read","8502"],"stack.log");
 fs.mkdirSync("runs",{recursive:true}); const link=path.resolve("runs",prefix); fs.symlinkSync(dir,link,"dir");
 const oracle=path.join(root,"oracle");
 const args=["lab/bench/driver.ts","--lane","datomic","--composition","reach","--oracle-root",oracle,"--output",path.join(link,"ns-report.json"),
 ...(kind==="full"?["--rung","10k","--profile","smoke","--reader-threads","6"]:["--subjects","2000","--level-s","20","--max-readers","64","--sweep-max","2000","--history-sample","200","--reader-threads","4"])];
 fs.writeFileSync(path.join(dir,"command.json"),JSON.stringify({args,env:{DATOMIC_URL:env.DATOMIC_URL,DATOMIC_READ_URLS:env.DATOMIC_READ_URLS,TX2_ENGINE_CPUS:env.TX2_ENGINE_CPUS,TX2_ENGINE_CONTAINER:env.TX2_ENGINE_CONTAINER}},null,2));
 await snapshot("start");
 const fd=fs.openSync(path.join(dir,"driver.log"),"w");child=spawn(process.execPath,args,{env,stdio:["ignore","pipe","pipe"]});
 let snapshots=Promise.resolve(); let pending="";
 const output=b=>{fs.writeSync(fd,b);pending+=b.toString(); const lines=pending.split("\n");pending=lines.pop();for(const line of lines) {if(line.includes("phase ")) {process.stdout.write(line+"\n"); snapshots=snapshots.then(()=>snapshot(line));}}};
 child.stdout.on("data",output);child.stderr.on("data",output);
 const code=await new Promise((resolve,reject)=>{child.on("error",reject);child.on("exit",resolve);});fs.closeSync(fd); await snapshots;await snapshot("final");
 fs.writeFileSync(path.join(dir,"exit.json"),JSON.stringify({code,endedAt:new Date().toISOString()}));
 if(code!==0) throw Error(`driver exit ${code}`);
} finally {
 if(timer) clearTimeout(timer);
 child?.kill("SIGTERM");
 try { await command("bash",["lab/experiments/EXP-DX1/stack/down.sh",prefix,"--volumes"],"cleanup.log"); }
 finally { fs.rmdirSync(lock); fs.writeFileSync(path.join(dir,"lock-released.json"),JSON.stringify({at:new Date().toISOString()})); }
 console.log(dir);
}
