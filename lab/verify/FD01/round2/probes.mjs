import './disk-guard.mjs';
import { subject, base } from './hook.mjs';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const { auditConsumerAtomicity, auditFeedLag } = await import('@triplex-build/triplex-testkit/feed');
const { publicationLagMs } = await import('@triplex-build/triplex/feed');
const before = { effects:[], affected:[], checkpoint:null };
const after = { effects:[{epoch:'1',position:'1',subject:'subject'}], affected:[{epoch:'1',position:'1',subject:'subject'}], checkpoint:{source:'generic/source',token:'1'} };
const result = { head:'b60cce1e5acd3f9bf3a3ae4f697271867692eac2', base, slot:null, engines:false, atomic:[], lag:[], consumers:[] };
const source = JSON.parse(fs.readFileSync(base+'/source.json'));
const checkSources = () => { for (const [f,h] of Object.entries(source.files)) assert.equal(createHash('sha256').update(fs.readFileSync(subject+'/'+f)).digest('hex'),h,f); };
checkSources();
for (const mode of ['atomic','checkpoint-first-atomic','two-connections','checkpoint-first-split','checkpoint-deferred','both-begin-immediate']) {
  for (const point of ['after-commit','before-commit','before-effect','after-effect','after-checkpoint']) {
    if (mode === 'both-begin-immediate' && point !== 'after-commit') continue;
    const file = `${base}/${mode}-${point}.db`;
    const child = spawnSync(process.execPath,[fileURLToPath(new URL('./atomic-child.mjs',import.meta.url)),file,mode,point],{encoding:'utf8'});
    const db = new DatabaseSync(file);
    const row = db.prepare('SELECT source,token FROM checkpoints').get();
    const snapshot = {effects:db.prepare('SELECT * FROM effects').all(),affected:db.prepare('SELECT * FROM affected').all(),checkpoint:row ? {...row} : null};
    db.close();
    let rejected = null;
    try { auditConsumerAtomicity(snapshot,{before,after},point); } catch(e) { rejected=String(e); }
    result.atomic.push({mode,point,exit:child.status,stderr:child.stderr,snapshot,rejected});
    if (mode === 'atomic' || mode === 'checkpoint-first-atomic') { assert.equal(child.status,77); assert.equal(rejected,null); }
  }
}
for (const mode of ['two-connections','checkpoint-first-split','checkpoint-deferred'])
  assert.ok(result.atomic.some((r)=>r.mode===mode && r.exit===77 && r.rejected),mode);
const bound = {source:'generic/source',stream:'s',epoch:'1',position:'1',clock:'host-monotonic'};
const page = {entries:[{kind:'commit',stream:'s',epoch:'1',offset:'1',transactions:[{positions:['1']}]}],cursor:{source:bound.source,token:'1'}};
const pub = {...bound,atMonoMs:100};
for (const lagMs of [200,250,260,300]) {
  const known = {...bound,atMonoMs:100+lagMs,lagMs};
  result.lag.push({case:'correct interval',lagMs,audit:auditFeedLag([page],[pub],[known]),under250:lagMs<=250});
}
for (const lagMs of [1,200,260]) {
  let error;
  try { auditFeedLag([page],[pub],[{...bound,atMonoMs:400,lagMs}]); } catch(e) { error=String(e); }
  assert.match(error,/Lag differs/); result.lag.push({case:'incorrect claim for 300ms true interval',lagMs,error});
}
for (const publication of [undefined,{...pub,clock:'another-process-clock'}]) {
  let error; try { publicationLagMs(publication,{...bound,atMonoMs:400}); } catch(e) { error=String(e); }
  assert.ok(error); result.lag.push({case:'missing or distinct clock',publication,error});
}
// [CX-VFD01-R2] Why: timestamps from ACK/poll or a skewed process may retain a plausible clock label.
// Rejected: checking only that two arbitrary clock strings are equal.
result.lag.push({case:'later publication substitution',truePublication:100,suppliedPublication:200,trueKnown:400,
  accepted:auditFeedLag([page],[{...pub,atMonoMs:200}],[{...bound,atMonoMs:400,lagMs:200}])});
result.lag.push({case:'same-label process clock skew',truePublication:100,trueKnown:400,reportedKnown:300,
  accepted:auditFeedLag([page],[pub],[{...bound,atMonoMs:300,lagMs:200}])});
const { FeedConsumer } = await import(pathToFileURL(subject+'/lab/bench/lib/feed.ts').href);
for (const mode of ['correct','late-map','skew','missing']) {
  const dir = base+'/consumer-'+mode; fs.mkdirSync(dir);
  let consumer;
  const handle = {feedPage:async()=>{ consumer.stop();return {next:1,transactions:[{position:1,txId:'tx1',changes:[{op:'assert',tripleId:'a1',entityId:'pl:00000000',attribute:':a',validFrom:0}]}]};},close:async()=>{}};
  consumer = new FeedConsumer({dir,epoch:'1',startAfter:0,now:()=> mode==='skew'?300:400,
    publicationOf:(key)=> mode==='missing'?undefined:{...key,clock:'host-monotonic',atMonoMs:mode==='late-map'?200:100},
    commitOf:()=>({instant:399,ackAt:200,subject:0,subjects:[0],stamp:399000,correction:false,correctionValidFrom:null}),
    open:async()=>handle,log:()=>{},crashes:[]});
  let error=null; try {await consumer.run();} catch(e) {error=String(e);}
  result.consumers.push({mode,error,checkpoint:consumer.checkpoint,lags:consumer.lags,truePublicationLagMs:300});
  assert.equal(mode==='missing'?consumer.checkpoint:consumer.lags[0].lagMs,mode==='missing'?0:mode==='correct'?300:200);
  consumer.close();
}
checkSources(); result.sourceUnchanged=true;
fs.writeFileSync(base+'/probes.json',JSON.stringify(result,null,2)); console.log(JSON.stringify(result,null,2));
