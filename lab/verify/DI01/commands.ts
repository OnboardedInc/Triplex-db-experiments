// [CX-VDI01] Why: replay pinned generators without the DI01 Replay/index/checker. Rejected: validating deliveries using the producer's own page builder.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {seedCommands} from '../../bench/lib/w0-seed.ts';
import {generateTrace,traceDigest} from '../../bench/lib/trace.ts';
import {mapW0Trace} from '../../bench/lib/w0-trace.ts';
import {Rng,seedOf} from '../../bench/lib/rng.ts';
import * as W0 from '../../../packages/w0/dist/index.js';
const base='/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-DI01';
const r=JSON.parse(fs.readFileSync(base+'/final-r12/trace/result.json','utf8'));
const pins=JSON.parse(fs.readFileSync(base+'/final-r12/binding.json','utf8'));
const sha=(b:any)=>createHash('sha256').update(b).digest('hex');
for(const pin of pins.files) if(pin.path.startsWith('packages/w0/src/')||['lab/bench/lib/w0-seed.ts','lab/bench/lib/w0-trace.ts','lab/bench/lib/trace.ts','lab/bench/lib/rng.ts'].includes(pin.path)) assert.equal(sha(fs.readFileSync(pin.path)),pin.sha256,pin.path);
const out=fs.openSync(process.argv[2]!,'wx'),canon=W0.canonicalPlain,R=W0.rung(10000),V=Date.parse(W0.POPULATION_VALID_TIME);
const raises=Array.from({length:10000},(_,i)=>W0.plan(R,i)).filter(p=>p.raise).map(p=>p.S);
const events=generateTrace({seed:'DI01-trace-1',subjects:10000,durationS:180});
assert.equal(traceDigest(events),r.traceSha256);
const rng=new Rng(seedOf('DI01-overlay-1')); const ballast=rng.next();
assert.equal(r.overlay.at(-1).rows[1][2],String(ballast));
const stride=Math.max(2,Math.floor(events.filter(e=>!e.resend).length/13));
for(let i=0;i<r.overlay.length;i++) assert.deepEqual(r.overlaySchedule[i],{atEvent:(i+1)*stride+rng.int(Math.max(1,Math.floor(stride/2))),...r.overlay[i]});
fs.writeSync(out,JSON.stringify({raises,seedEnd:r.traceResult.seedEnd})+'\n');
let p=0;
const append=(rows:any,validFrom:number,retract:any[]=[],seed=false)=>fs.writeSync(out,canon({position:++p,rows,validFrom,retract,seed})+'\n');
for(const c of seedCommands(10000)){append(c.rows,c.validFrom,[],true); assert.equal(p,c.position);}
let e=0,o=0;
for(const event of events){if(event.resend)continue;const m=mapW0Trace(event);append(m.rows,m.validFrom);e++;if(o<r.overlay.length&&e>=r.overlaySchedule[o].atEvent){const v=r.overlay[o++];append(v.rows,V,v.retract??[]);}}
while(o<r.overlay.length){const v=r.overlay[o++];append(v.rows,V,v.retract??[]);}
assert.equal(p,438140); fs.closeSync(out);
