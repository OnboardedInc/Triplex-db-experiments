from pathlib import Path
p=Path('lab/experiments/EXP-DX1/m1')
# [DX-M1] Why: instrument a measurement copy and stop at 200 trace seconds. Rejected: editing the shared benchmark or running its full ladder.
s=Path('lab/bench/driver.ts').read_text().replace('"./lib/', '"../../../bench/lib/').replace('"../receipts/', '"../../../receipts/').replace('"./reader-worker.ts"','"../../../bench/reader-worker.ts"')
s=s.replace('const save = () =>', "report.measurementOnly = true; report.measurementScope = 'DX-M1 truncated 200-second diagnostic; inherited bars are not acceptance';\nconst save = () =>")
s=s.replace('const plan = nsPlan(profile, config.zeroReaders).map((p) => (config.levelS && p.seconds ? { ...p, seconds: Math.min(p.seconds, config.levelS) } : p));','const plan = [{name:"m1-zero",readers:0,seconds:200,measured:true}];')
s=s.replace('  await sleep(Math.max(0, traceStart - now()));','''  if (process.env.M1_PREINDEX === '1') setTimeout(async () => {
    const event = await requestIndex(indexClient, indexDb, 'm1-before-burst', now, 60000);
    fs.writeFileSync('/driver/preindex.json', JSON.stringify(event));
    log('M1 index '+JSON.stringify(event));
  }, Math.max(0, traceStart + 110000 - now()));
  await sleep(Math.max(0, traceStart - now()));''')
# [DX-M1] Why: retain existing operation-bound phase hooks without synchronous writes in the burst. Rejected: per-commit file flushes that could create the stall being measured.
anchor='const datomicMaintenanceJobs: any[] = [];'
s=s.replace(anchor,anchor+"""
const m1Phases: any[] = [];
const m1Api = await import(pathToFileURL(path.join(REPO, 'packages/datomic/dist/index.js')).href);
const m1Transact = m1Api.DatomicClient.prototype.transact;
m1Api.DatomicClient.prototype.transact = function(...args: any[]) {
 this.onCommit = (s: any) => m1Phases.push({epochOrigin:performance.timeOrigin, ...s});
 return m1Transact.apply(this, args);
};
process.on('exit', () => fs.writeFileSync('/driver/commit-phases.jsonl', m1Phases.map(s=>JSON.stringify(s)).join('\\n')+'\\n'));
""")
(p/'driver.ts').write_text(s)
orig=Path('lab/experiments/EXP-DX1/b6/lone-commit.mjs').read_text()
s=orig.replace("await phase('coldSparse',120,()=>1000);", "console.log(new Date().toISOString(),'q3-sparse-start'); await phase('sparse',60,()=>1000);").replace("await phase('backToBack',2000);", "console.log(new Date().toISOString(),'q3-dense-start'); await phase('backToBack',500); console.log(new Date().toISOString(),'q3-end');").replace(" await phase('sparse',120,()=>1000);", "").replace(" await phase('poisson',0,()=>-Math.log(1-arrivals())*1000/15,true);", "").replace("return {offeredAt,started,returnedAt,ms:","return {epochOrigin:performance.timeOrigin,offeredAt,started,returnedAt,ms:").replace("if(process.env.B6_WRITES_ONLY!=='1')await import('./pull-load.mjs');", "")
s=s.replace('  const receipt=await runtime.runPromise', '  const transactCalledAt=performance.now();\n  const receipt=await runtime.runPromise').replace('return {epochOrigin:performance.timeOrigin,offeredAt,started,returnedAt,ms:', 'return {epochOrigin:performance.timeOrigin,transactCalledAt,offeredAt,started,returnedAt,ms:')
# [DX-M1] Why: Q3 must include the 10k rung's bounded SDK row cache, not only a 400-subject cache that fits entirely. Rejected: treating the small warm-cache arm as the whole NS commit path.
s=s.replace('subjects=400','subjects=10000').replace("console.log(new Date().toISOString(),'q3-sparse-start');", "fs.writeFileSync('/driver/q3-ready',''); while(!fs.existsSync('/driver/q3-go')) await sleep(1000); console.log(new Date().toISOString(),'q3-sparse-start');")
# [DX-M1] Why: group only untimed seed facts at the NS driver's roughly 400-fact batch size. Rejected: spending the measurement lease on 10,000 tiny setup commits.
s=s.replace("for(let i=0;i<subjects;i++)remember(await runtime.runPromise(triples.assertBatch(ownFacts(i,accounts).map(f=>({entityId:f.e,attribute:f.a,value:f.v,validFrom:SEED_VALID_FROM})))));", "for(let i=0;i<subjects;i+=10)remember(await runtime.runPromise(triples.assertBatch(Array.from({length:Math.min(10,subjects-i)},(_,j)=>ownFacts(i+j,accounts)).flat().map(f=>({entityId:f.e,attribute:f.a,value:f.v,validFrom:SEED_VALID_FROM})))));")
(p/'lone-commit.mjs').write_text(s)
s=Path('lab/experiments/EXP-DX1/stack/run-in-vm.sh').read_text()
s=s.replace('repo=$(cd "$(dirname "$0")/../../../.." && pwd)', 'repo=$(pwd)')
s=s.replace('-v "$repo:$repo"', '-v "/Users/sam/projects/triplex-db-2/.claude/worktrees/d-native:$repo:ro" -v "$repo/lab/experiments/EXP-DX1:$repo/lab/experiments/EXP-DX1:ro"')
(p/'run-in-vm.sh').write_text(s)
