// [CX-VG03-56-R7A] Why: compare actual source preimages, bundle output and contract pins independently. Rejected: accepting the builder's reported hash or changing a pinned file to test an old version.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {createRequire} from 'node:module';import {execFileSync} from 'node:child_process';
import {compileDriver} from '../../../bench/ns-driver/compile.mjs';import {EVALUATOR_FILES} from '../../../bin/claim.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex'),root=path.resolve(import.meta.dirname,'../../../..');
const git=args=>execFileSync('git',args,{cwd:root,maxBuffer:32*1024*1024});
const changes=git(['diff','--name-only','95b0593c','9c4b68aa']).toString().trim().split('\n');
assert.equal(git(['diff','95b0593c','9c4b68aa','--','lab/acceptance']).length,0);
assert.equal(git(['diff','9c4b68aa','--','lab/bin','lab/bench/ns-driver','lab/experiments/EXP-G03','lab/acceptance']).length,0);
const contract=JSON.parse(fs.readFileSync(path.join(root,'lab/acceptance/obligations.json'))),changedDirectPins=changes.filter(p=>Object.hasOwn(contract.inputs,p));assert.deepEqual(changedDirectPins,[]);
const changedEvaluatorClosure=EVALUATOR_FILES.filter(p=>changes.includes(p));assert.deepEqual(changedEvaluatorClosure,[]);
const declared=JSON.parse(fs.readFileSync(path.join(root,'lab/experiments/EXP-G03/round7a/pin-changes.json')));
for(const p of declared.changes){assert.equal(sha(git(['show','95b0593c:'+p.path])),p.oldSha256);assert.equal(sha(fs.readFileSync(path.join(root,p.path))),p.newSha256)}
const entry=path.join(root,'lab/bench/ns-driver/driver.mjs'),current=compileDriver(entry,root),oldSource=git(['show','95b0593c:lab/bench/ns-driver/driver.mjs']);
const requireTool=createRequire(import.meta.resolve('tsx')),esbuild=requireTool('esbuild');
const old=await esbuild.build({absWorkingDir:root,entryPoints:[entry],outfile:'driver.mjs',bundle:true,splitting:false,format:'esm',platform:'node',target:'node24',metafile:true,write:false,logLevel:'silent',plugins:[{name:'review-old-driver-preimage',setup(build){build.onLoad({filter:/\/lab\/bench\/ns-driver\/driver\.mjs$/},()=>({contents:oldSource.toString(),loader:'js',resolveDir:path.dirname(entry)}))}}]});
const oldBundleSha256=sha(old.outputFiles[0].contents);assert.notEqual(oldBundleSha256,current.bundleSha256);
assert.equal(current.files['lab/bench/ns-driver/driver.mjs'],declared.changes[0].newSha256);
const report=fs.readFileSync(path.join(root,'lab/experiments/EXP-G03/REPORT.md'),'utf8').split('## Round 7a:')[1];assert.match(report,/driver bundle hash changes with driver\.mjs; the next contract builder must re-pin it/);
console.log(JSON.stringify({review:'CX-VG03-56-R7A',reviewedCode:'ef1a9216',head:git(['rev-parse','HEAD']).toString().trim(),acceptanceUnchanged:true,changedDirectPins,changedEvaluatorClosure,sourceHashPairs:declared.changes,driverBundle:{oldSha256:oldBundleSha256,newSha256:current.bundleSha256,bundler:current.bundler,oldSourceSha256:sha(oldSource),newSourceSha256:current.files['lab/bench/ns-driver/driver.mjs'],allOtherInputs:'current unchanged reviewed dependency files; old entry substituted by an esbuild onLoad plugin only',reportExplicitlyRequiresRepin:true},qualification:false},null,2));
