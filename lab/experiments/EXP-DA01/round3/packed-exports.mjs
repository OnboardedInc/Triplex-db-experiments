import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
// [EXP-DA01] Why: verify the changed public testkit exports from real tarballs despite the unrelated root CLI pack failure. Rejected: using workspace source aliases or claiming a fresh dependency install.
const dir=import.meta.dirname,root=process.cwd();
const attempts=fs.readdirSync(path.join(dir,'pack-check')).filter(n=>n.startsWith('triplex-pack-'));
if(attempts.length!==1)throw new Error('Expected one retained package-check attempt');
const tarDir=path.join(dir,'pack-check',attempts[0],'tarballs');
const entries=fs.readdirSync(tarDir);
const core=entries.find(n=>/^triplex-build-triplex-[0-9].*\.tgz$/.test(n));
const kit=entries.find(n=>/^triplex-build-triplex-testkit-.*\.tgz$/.test(n));
if(!core||!kit)throw new Error('Paired tarballs missing');
const consumer=path.join(dir,'packed-exports');fs.mkdirSync(consumer);
fs.writeFileSync(path.join(consumer,'.gitignore'),'node_modules/\n');
const inputs=[];
for(const [name,file] of [['core',core],['testkit',kit]]){
  const source=path.join(tarDir,file),out=path.join(consumer,name);fs.mkdirSync(out);
  const result=spawnSync('tar',['-xzf',source,'-C',out],{encoding:'utf8'});if(result.status!==0)throw new Error(result.stderr);
  inputs.push({name,path:source,sha256:crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex')});
}
fs.mkdirSync(path.join(consumer,'node_modules/@triplex-build'),{recursive:true});
fs.symlinkSync(path.join(consumer,'core/package'),path.join(consumer,'node_modules/@triplex-build/triplex'));
fs.symlinkSync(path.join(consumer,'testkit/package'),path.join(consumer,'node_modules/@triplex-build/triplex-testkit'));
const dependencies=[];
for(const [name,source] of [['effect','packages/datomic/node_modules/effect'],['ulidx','packages/core/node_modules/ulidx']]){
  const target=fs.realpathSync(path.join(root,source));fs.symlinkSync(target,path.join(consumer,'node_modules',name));
  dependencies.push({name,target,version:JSON.parse(fs.readFileSync(path.join(target,'package.json'))).version});
}
fs.writeFileSync(path.join(consumer,'package.json'),JSON.stringify({name:'route-fixture-consumer',private:true,type:'module'},null,2)+'\n');
const code=`import {makeRouteEquivalenceScenario,makeRouteEquivalenceCases} from "@triplex-build/triplex-testkit";
const scenario=makeRouteEquivalenceScenario(29);
if(scenario.groups.flat().length!==40)throw new Error("Missing seeded history");
const tests=makeRouteEquivalenceCases({seed:29,bases:[1],oracle:async()=>[{id:"one"}],advance:async()=>{},routes:[{id:"source",eligible:()=>true,refusals:[],read:async basis=>({rows:[{id:"one"}],route:"source",basis})}]});
const observations=await tests[0].run();
console.log(JSON.stringify({positions:scenario.groups.flat().length,subjects:scenario.subjects.length,observations}));
`;
fs.writeFileSync(path.join(consumer,'smoke.mjs'),code);fs.writeFileSync(path.join(consumer,'smoke.ts'),code);
const commands=[['types',process.execPath,[path.join(root,'node_modules/typescript/bin/tsc'),'--noEmit','--module','nodenext','--moduleResolution','nodenext','--target','ESNext','--skipLibCheck','smoke.ts']],['runtime',process.execPath,['smoke.mjs']]];
const results=[];
for(const [name,command,args] of commands){const result=spawnSync(command,args,{cwd:consumer,encoding:'utf8'});fs.writeFileSync(path.join(consumer,`${name}.stdout.txt`),result.stdout);fs.writeFileSync(path.join(consumer,`${name}.stderr.txt`),result.stderr);results.push({name,command,args,status:result.status});}
fs.writeFileSync(path.join(consumer,'receipt.json'),JSON.stringify({at:new Date().toISOString(),inputs,dependencies,results,freshDependencyInstall:false},null,2)+'\n');
if(results.some(r=>r.status!==0))throw new Error('Packed public exports check failed; inspect retained output');
console.log(JSON.stringify(results));
