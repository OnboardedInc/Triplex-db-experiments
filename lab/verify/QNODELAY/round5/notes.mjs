// [CX-VQNODELAY-R5] Why: record a non-blocking producer compatibility observation from a successful QG1 fixture.
// Rejected: reopening the scoped malformed-timing finding for a fail-closed output-format issue.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readLatencyRun } from '../../../receipts/parse.ts';
const file='/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VQNODELAY/round5/attempt1/fixtures/qg1/positive-keep-alive/output.json';
const result=readLatencyRun(file,{lane:'qlever'});
assert.equal(result.ok,false);assert.equal(result.refusal.code,'WRITER');
const report={classification:'NOTE FOR LATER; not a new blocking finding',source:file,sourceSha256:createHash('sha256').update(fs.readFileSync(file)).digest('hex'),refusal:{code:result.refusal.code,message:result.refusal.message},detail:'The final QG1 aggregate output has no registered latencyWriter. Its accepted inputs and numeric output do not become an ingestible run through readLatencyRun.'};
fs.writeFileSync('lab/verify/QNODELAY/round5/notes-result.json',JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(report,null,2));
