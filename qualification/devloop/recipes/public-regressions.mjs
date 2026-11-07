import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdir, readFile, readdir, writeFile, copyFile } from 'node:fs/promises';
import { join, resolve, relative } from 'node:path';

// Invoke the repository's real mandatory checks; successful process exit is only
// accepted after their concrete package/runtime or Vitest assertions execute.
// Inspiration/rationale: CONTRIBUTING.md and scripts/check-packages.mjs.
const root=resolve(import.meta.dirname,'../../..');
const mode=process.argv[2],directory=process.env.TRIPLEX_RUN_DIRECTORY,artifacts=process.env.TRIPLEX_RUN_ARTIFACTS;
assert(['pack','postgres'].includes(mode)&&directory&&artifacts,'Use an admitted pack/postgres job');
assert(resolve(directory).startsWith(root+'/')&&resolve(artifacts).startsWith(resolve(directory)+'/'));
const scratch=join(directory,'scratch');await mkdir(scratch,{recursive:true});
const env={...process.env,NODE_OPTIONS:'--max-old-space-size=768'};
if(mode==='pack'){
  env.TRIPLEX_PACK_ARTIFACT_ROOT=join(scratch,'pack');
  env.npm_config_registry='http://127.0.0.1:48731';
}else{
  // The secret is read inside the admitted process, never put in a manifest.
  env.PG_TEST_URL=(await readFile(join(root,'.runtime/engines/aux-postgres-compiler-tests-v3/url'),'utf8')).trim();
}
const argv=mode==='pack'
  ? ['scripts/check-packages.mjs']
  : ['--filter','@triplex-build/triplex-postgres','exec','vitest','run','test/integration/postgresql.test.ts','--maxWorkers','1','--reporter','json','--outputFile',join(artifacts,'vitest.json')];
const child=spawnSync(mode==='pack'?process.execPath:join(root,'tools/bootstrap/pnpm'),argv,{cwd:root,env,encoding:'utf8',maxBuffer:16*1024**2});
await writeFile(join(artifacts,'check.stdout.log'),child.stdout??'');await writeFile(join(artifacts,'check.stderr.log'),child.stderr??'');
const report={format:'triplex-public-required-regression/1',mode,status:'FAIL',command:{executable:mode==='pack'?process.execPath:'tools/bootstrap/pnpm',argv},exitCode:child.status,signal:child.signal,error:child.error?String(child.error):null};
await writeFile(join(artifacts,'report.json'),JSON.stringify(report,null,2)+'\n');
assert.equal(child.error,undefined);assert.equal(child.status,0,'Required repository check failed; inspect retained stdout/stderr');
if(mode==='postgres'){
  const result=JSON.parse(await readFile(join(artifacts,'vitest.json'),'utf8'));
  assert(result.success&&result.numTotalTests>0&&result.numPassedTests===result.numTotalTests&&result.numPendingTests===0&&result.numTodoTests===0&&result.numFailedTests===0,'No skipped/unexecuted PostgreSQL checks may count as passes');
  report.tests={total:result.numTotalTests,passed:result.numPassedTests,pending:result.numPendingTests,todo:result.numTodoTests};
}else{
  const work=(await readdir(env.TRIPLEX_PACK_ARTIFACT_ROOT)).filter(name=>name.startsWith('triplex-pack-'));
  assert.equal(work.length,1);const base=join(env.TRIPLEX_PACK_ARTIFACT_ROOT,work[0]);
  report.tarballs=[];
  for(const file of (await readdir(join(base,'tarballs'))).sort()){
    const bytes=await readFile(join(base,'tarballs',file));report.tarballs.push({path:relative(root,join(base,'tarballs',file)),bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
  }
  for(const file of ['package.json','package-lock.json','consumer.ts','tsconfig.json','smoke.mjs'])await copyFile(join(base,'consumer',file),join(artifacts,'consumer-'+file));
  assert.equal(report.tarballs.length,13);
}
report.status='PASS';await writeFile(join(artifacts,'report.json'),JSON.stringify(report,null,2)+'\n');
await writeFile(join(artifacts,'result.json'),JSON.stringify({format:'triplex-public-required-regression/1',mode,status:'PASS'})+'\n');
