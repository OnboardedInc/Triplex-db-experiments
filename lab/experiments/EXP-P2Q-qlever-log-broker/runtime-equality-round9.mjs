// @ts-nocheck -- [CX-A01-040] Why: integration adds this runtime protocol or command fixture to checkJs; dynamic JSON/message fields lack static record types. Binding errors remain checked by lab/bin/checkjs.mjs. Rejected: excluding current executable code.
// [EXP-P2Q] Why: bind type-only refinements to the exact runtime already exercised by the matrices.
// Rejected: asserting that type edits cannot affect output without comparing emitted bytes.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import ts from 'typescript';
const root = process.cwd();
const base = '/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-P2Q-R3/round9';
const digest = value => createHash('sha256').update(value).digest('hex');
const summary = fs.readFileSync(`${base}/SUMMARY.json`);
const sourceHead = JSON.parse(summary).productSourceHead;
const beforeReceipt = JSON.parse(fs.readFileSync(`${base}/retry/new-offline.json`));
const files = ['packages/core/src/storage/ReadSurface.ts','packages/qlever/src/broker/BrokerStorageAdapter.ts'];
const actualChanged = execFileSync('git',['diff','--name-only',sourceHead,'--','packages'],{encoding:'utf8'}).trim().split('\n').filter(Boolean).sort();
if (JSON.stringify(actualChanged) !== JSON.stringify([...files].sort())) throw new Error('unexpected product change set');
const records = files.map(file => {
 const before=execFileSync('git',['show',`${sourceHead}:${file}`],{encoding:'utf8'});
 const after=fs.readFileSync(file,'utf8');
 if (digest(before)!==beforeReceipt.sourceHashes[file]) throw new Error(`unbound original: ${file}`);
 const emit = text => ts.transpileModule(text,{fileName:file,compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext,removeComments:true}}).outputText;
 const oldJS=emit(before),newJS=emit(after);
 if(oldJS!==newJS) throw new Error(`runtime changed: ${file}`);
 return {file,beforeSha256:digest(before),afterSha256:digest(after),emittedJavaScriptSha256:digest(newJS),identical:true};
});
const self='lab/experiments/EXP-P2Q-qlever-log-broker/runtime-equality-round9.mjs';
const result={sourceHead,summarySha256:digest(summary),head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),createdAt:Date.now(),selfSha256:digest(fs.readFileSync(self)),typescript:ts.version,records};
fs.writeFileSync(`${base}/runtime-equality.json`,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(result,null,2));
