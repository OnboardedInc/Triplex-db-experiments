import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';

// [CX-VDF01-R4] Why: admit only fresh, content-checked executions tied to pinned sources, probe inputs and offline grant.
// Rejected: adopting a builder's passing receipt or overwriting a failed reviewer attempt.
const review = import.meta.dirname, root = path.resolve(review, '../../..');
const name = process.argv[2]; assert.match(name ?? '', /^attempt-[0-9]+$/);
const out = path.join(review, 'round4', name); fs.mkdirSync(out);
const sha = data => createHash('sha256').update(data).digest('hex');
const bindings = JSON.parse(fs.readFileSync(path.join(review, 'round4/source-bindings.json')));
const nativeLink = path.join(review, 'round4/sources/broker/node_modules/better-sqlite3');
if (!fs.existsSync(nativeLink)) {
  fs.mkdirSync(path.dirname(nativeLink), { recursive: true });
  fs.symlinkSync(path.resolve(bindings.nativeAddon.file, '../../..'), nativeLink);
}
const git = args => execFileSync('git', args, { cwd: root }).toString().trim();
const dist = '/Users/sam/Claude/Projects/triplex-db-2/downloads/datomic-pro-1.0.7745/extracted/datomic-pro-1.0.7745';
const java = '/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-DF01/jdk-21.0.13+9-jre/Contents/Home/bin/java';
const jars = [dist, path.join(dist, 'lib')].flatMap(dir => fs.readdirSync(dir).filter(p => p.endsWith('.jar')).map(p => path.join(dir, p)));
const probe = ['run-round4.mjs', 'round4_verify.clj', 'round4-feeds.test.ts', 'round4-core.test.ts', 'round4-feeds.config.ts', 'prepare-round4.mjs'];
fs.mkdirSync(path.join(out, 'probe'));
for (const file of probe) fs.copyFileSync(path.join(review, file), path.join(out, 'probe', file));
const files = [...probe.flatMap(p => [path.join(review,p), path.join(out,'probe',p)]), path.join(review,'round4/source-bindings.json'),
  ...bindings.bindings.map(b => path.join(review, b.copy)), ...Object.keys(bindings.coreInputs).map(file => path.join(root,file)),
  ...jars, java, path.resolve(path.dirname(java),'../lib/server/libjvm.dylib'), bindings.nativeAddon.file,
  path.join(root,'vitest.workspace-aliases.ts'), path.join(root,'packages/host/vitest.config.ts'), path.join(root,'pnpm-lock.yaml')];
const hashes = () => Object.fromEntries(files.map(p => [path.relative(root,p),sha(fs.readFileSync(p))]));
const inputs = hashes();
for (const b of bindings.bindings) assert.equal(inputs[path.relative(root,path.join(review,b.copy))],b.sha256);
for (const [file, hash] of Object.entries(bindings.coreInputs)) assert.equal(inputs[file],hash);
const locks='/Users/sam/projects/triplex-db-2/lab/locks/heavy';
const grant=fs.readdirSync(locks).filter(p=>/^\d+$/.test(p)).flatMap(p=>{try{return [JSON.parse(fs.readFileSync(path.join(locks,p,'owner.json')))];}catch{return [];}}).find(p=>p.pid===process.ppid);
assert.ok(grant,'Parent heavy grant required');
const space=fs.statfsSync(root); assert.ok(space.bavail*space.bsize>5*1024**3,'Disk below 5 GiB');
const identity={ startedAt:new Date().toISOString(), reviewerHead:git(['rev-parse','HEAD']), sources:[...new Set(bindings.bindings.map(b=>`${b.label}:${b.commit}`))], slot:null, offline:true, parentGrant:grant, availableDiskBytes:space.bavail*space.bsize, inputs };
fs.writeFileSync(path.join(out,'inputs.json'),JSON.stringify(identity,null,2)+'\n');
const env={...process.env,CX_VDF01_OUTPUT:out};
const results=[];
const run=(label,cmd,args)=>{
 const r=spawnSync(cmd,args,{cwd:root,env,encoding:'utf8',timeout:90000,maxBuffer:8*1024**2});
 fs.writeFileSync(path.join(out,`${label}.stdout.log`),r.stdout??''); fs.writeFileSync(path.join(out,`${label}.stderr.log`),r.stderr??'');
 const record={label,cmd,args,code:r.status,signal:r.signal,error:r.error?.message??null};results.push(record);
 process.stdout.write(JSON.stringify(record)+'\n');return r.status===0;
};
const vitest=path.join(root,'node_modules/vitest/vitest.mjs');
const coreOK=run('core',process.execPath,[vitest,'run','--config','packages/host/vitest.config.ts','lab/verify/DF01/round4-core.test.ts','--reporter=json','--outputFile='+path.join(out,'core.json')]);
const tsOK=run('feeds',process.execPath,[vitest,'run','--config','lab/verify/DF01/round4-feeds.config.ts','lab/verify/DF01/round4-feeds.test.ts','--reporter=json','--outputFile='+path.join(out,'feeds.json')]);
let cljOK=false;
if(tsOK){const src=path.join(review,'round4/sources/datomic/packages/datomic');
 cljOK=run('datomic',java,['-Xmx256m',`-Dtriplex.codec.spec=${path.join(src,'src/codec-spec.json')}`,'-cp',[path.join(dist,'*'),path.join(dist,'lib/*'),path.join(dist,'resources'),path.join(src,'gateway/src'),review].join(path.delimiter),'clojure.main','-m','round4-verify']);}
assert.deepEqual(hashes(),inputs,'Inputs changed during execution');
const outputs=fs.readdirSync(out).filter(p=>fs.statSync(path.join(out,p)).isFile()&&p!=='result.json');
fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({ ...identity, inputs:undefined, finishedAt:new Date().toISOString(),results,outputs:Object.fromEntries(outputs.map(p=>[p,sha(fs.readFileSync(path.join(out,p)))])),coreOK,tsOK,cljOK },null,2)+'\n');
process.exitCode=coreOK&&tsOK&&cljOK?0:1;
