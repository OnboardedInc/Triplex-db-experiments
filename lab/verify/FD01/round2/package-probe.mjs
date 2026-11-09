import './disk-guard.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
const { base } = JSON.parse(fs.readFileSync(new URL('./subject.json',import.meta.url)));
const dir=base+'/package-probe-'+randomUUID(); fs.mkdirSync(dir,{recursive:true});
const source='/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-FD01/round2-pack/triplex-pack-rhW0cq/tarballs';
const core=source+'/triplex-build-triplex-0.2.0.tgz', testkit=source+'/triplex-build-triplex-testkit-0.2.0.tgz';
const user=dir+'/empty-user.npmrc', global=dir+'/empty-global.npmrc';fs.writeFileSync(user,'');fs.writeFileSync(global,'');
const steps=[];
const run=(name,cwd,args)=>{
  const cmd=['--offline','--userconfig='+user,'--globalconfig='+global,'--cache='+dir+'/cache',...args];
  const r=spawnSync('npm',cmd,{cwd,encoding:'utf8',maxBuffer:16*1024*1024});
  fs.writeFileSync(dir+'/'+name+'.log',r.stdout+'\n'+r.stderr);steps.push({name,args:cmd,status:r.status});return r;
};
// [CX-VFD01-R2] Why: keep exact published peer ranges, varying only availability of local dependency bytes.
// Rejected: --force/--legacy-peer-deps or changing ranges (would conceal a real peer conflict).
const missing=dir+'/missing';fs.mkdirSync(missing);
fs.writeFileSync(missing+'/package.json',JSON.stringify({name:'offline-peer-probe',version:'1.0.0',private:true,dependencies:{'@triplex-build/triplex':'file:'+core,effect:'4.0.3'}}));
const failure=run('missing-effect',missing,['install','--ignore-scripts','--no-audit','--no-fund']);
assert.equal(failure.status,1);assert.match(failure.stderr,/ERESOLVE/);assert.match(failure.stderr,/effect@undefined/);
const main='/Users/sam/projects/triplex-db-2/node_modules/.pnpm';
const dependencies=[['effect','4.0.3'],['ulidx','2.4.1'],['layerr','3.0.0']];
const packed={};
for(const [name,version] of dependencies){
  const installed=main+'/'+name+'@'+version+'/node_modules/'+name;
  const manifest=JSON.parse(fs.readFileSync(installed+'/package.json'));assert.equal(manifest.version,version);
  // [CX-VFD01-R2] Why: npm pack invoked ulidx prepare even with --ignore-scripts in the first attempt.
  // Rejected: executing package hooks inside the shared installed dependency tree.
  const stage=dir+'/stage-'+name;fs.mkdirSync(stage);fs.symlinkSync(fs.realpathSync(installed),stage+'/package');
  const tarball=dir+'/'+name+'-'+version+'.tgz';
  const out=spawnSync('tar',['-czhf',tarball,'--exclude=node_modules','-C',stage,'package'],{encoding:'utf8'});
  assert.equal(out.status,0,out.stderr);packed[name]='file:'+tarball;
}
const provided=dir+'/provided';fs.mkdirSync(provided);
fs.writeFileSync(provided+'/package.json',JSON.stringify({name:'offline-peer-probe',version:'1.0.0',private:true,dependencies:{
  '@triplex-build/triplex':'file:'+core,'@triplex-build/triplex-testkit':'file:'+testkit,...packed}}));
const success=run('provided-effect',provided,['install','--ignore-scripts','--no-audit','--no-fund','--strict-peer-deps']);
assert.equal(success.status,0,success.stderr);
const installedEffect=JSON.parse(fs.readFileSync(provided+'/node_modules/effect/package.json'));
const installedCore=JSON.parse(fs.readFileSync(provided+'/node_modules/@triplex-build/triplex/package.json'));
const installedTestkit=JSON.parse(fs.readFileSync(provided+'/node_modules/@triplex-build/triplex-testkit/package.json'));
assert.equal(installedCore.peerDependencies.effect,installedEffect.version);
assert.equal(installedTestkit.peerDependencies.effect,installedEffect.version);
const tree=run('npm-ls',provided,['ls','effect','--all','--json']);assert.equal(tree.status,0,tree.stderr);
const inputs=Object.fromEntries([core,testkit,...Object.values(packed).map(p=>p.slice(5))].map(p=>[p,createHash('sha256').update(fs.readFileSync(p)).digest('hex')]));
const result={steps,inputs,effect:installedEffect.version,corePeer:installedCore.peerDependencies.effect,testkitPeer:installedTestkit.peerDependencies.effect,
  conclusion:'Initial ERESOLVE reproduced with missing offline Effect metadata; exact same core/testkit peers install under strict resolution when local bytes are supplied. No registry access or peer relaxation.',
  limit:'Minimal core/testkit dependency install only; not a full 13-package consumer or runtime build qualification.'};
fs.writeFileSync(dir+'/result.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
