// @ts-nocheck -- Diagnostic bytes are validated at the immutable-log boundary.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const hash = (value) => createHash('sha256').update(value).digest('hex');
// [DX-T1-5] Why: a census is a fresh exact-operation observation, never an estimate promoted from a request payload.
// Rejected: joining by the latest transaction or ignoring missing/corrupt/foreign returned attributes.
export function qualifyShape(inputText, stdout, manifest, now = Date.now()) {
  const input = JSON.parse(inputText);
  const results = stdout.split('\n').flatMap(line => {try {const r=JSON.parse(line);return r.schema==='triplex.transaction-shape.v1'?[r]:[];}catch{return [];}});
  if (results.length!==1) throw Error('Expected exactly one native census');
  const result=results[0];
  if(result.run!==manifest.tag || result.source!==manifest.source || result.slot!==manifest.slot ||
    result.scope!==input.scope || result.requestHash!==hash(inputText) || result.run!==input.run ||
    !Number.isFinite(result.startedAt) || !Number.isFinite(result.endedAt) ||
    result.startedAt<input.createdAt-1000 || result.endedAt<result.startedAt || result.endedAt>now+1000 ||
    result.transactions?.length!==input.commands.length) throw Error('Census content/freshness/binding mismatch');
  const seen=new Set();
  for(let i=0;i<input.commands.length;i++) {
    const actual=result.transactions[i], expected=input.commands[i];
    if(actual.operationId!==expected.operationId || actual.position!==expected.position || seen.has(actual.operationId) ||
      !Number.isSafeInteger(actual.t) || actual.t<0 || !Array.isArray(actual.attributes) || !actual.attributes.length)
      throw Error('Census native transaction identity mismatch');
    seen.add(actual.operationId);
    const attrs=new Set();
    for(const a of actual.attributes) {
      if(typeof a.attribute!=='string' || !a.attribute.startsWith(':') || attrs.has(a.attribute) ||
        !['datoms','added','retracted','valueUtf8Bytes','ednUtf8Bytes'].every(k=>Number.isSafeInteger(a[k])&&a[k]>=0) ||
        a.datoms!==a.added+a.retracted) throw Error('Invalid census attribute totals');
      attrs.add(a.attribute);
    }
    for(const k of ['datoms','valueUtf8Bytes','ednUtf8Bytes'])
      if(actual[k]!==actual.attributes.reduce((n,a)=>n+a[k],0)) throw Error('Census totals do not close');
  }
  return result;
}
if(process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  const [mode,dir]=process.argv.slice(2), manifest=JSON.parse(fs.readFileSync(path.join(dir,'trace-run.json'),'utf8'));
  const request=path.join(dir,'transaction-shape-input.json');
  if(mode==='prepare') {
    const bench=JSON.parse(fs.readFileSync(path.join(dir,'driver/ns-report.json'),'utf8'));
    if(bench.status!=='DONE' || !bench.scope) throw Error('Census needs the completed bound benchmark');
    const writes=fs.readFileSync(path.join(dir,'driver/ns-writes.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
    const commands=writes.filter(w=>w.outcome==='committed'&&w.stream==='background'&&!w.resend&&w.facts<=64).slice(0,64)
      .map(w=>({operationId:w.publicationOperationId,position:w.position}));
    if(commands.length!==64 || commands.some(w=>!w.operationId||!Number.isSafeInteger(w.position))) throw Error('Missing census writer identities');
    const {DatabaseScope}=await import('../../packages/core/dist/runtime/index.js');
    fs.writeFileSync(request,JSON.stringify({run:manifest.tag,source:manifest.source,slot:manifest.slot,scope:DatabaseScope.test(bench.scope),createdAt:Date.now(),commands})+'\n');
  } else if(mode==='qualify') {
    const result=qualifyShape(fs.readFileSync(request,'utf8'),fs.readFileSync(path.join(dir,'transaction-shape-stdout.jsonl'),'utf8'),manifest);
    fs.writeFileSync(path.join(dir,'transaction-shape.json'),JSON.stringify(result,null,2)+'\n');
    const byAttribute=new Map();
    for(const tx of result.transactions) for(const a of tx.attributes) {
      const row=byAttribute.get(a.attribute)??{datoms:0,added:0,retracted:0,valueUtf8Bytes:0,ednUtf8Bytes:0};
      for(const k of Object.keys(row))row[k]+=a[k]; byAttribute.set(a.attribute,row);
    }
    const n=result.transactions.length;
    const rows=['# Native transaction shape','',`Source ${manifest.source}; ${n} exact operation/position-bound small transactions from ${manifest.tag}. Census runs after timed work; no transaction data is changed.`, '',result.units,'','| Attribute | datoms/tx | added/tx | retracted/tx | value UTF-8 bytes/tx | EDN datom bytes/tx |','| --- | ---: | ---: | ---: | ---: | ---: |'];
    for(const [a,r]of [...byAttribute].sort((a,b)=>b[1].valueUtf8Bytes-a[1].valueUtf8Bytes))rows.push(`| ${a} | ${ (r.datoms/n).toFixed(2)} | ${(r.added/n).toFixed(2)} | ${(r.retracted/n).toFixed(2)} | ${(r.valueUtf8Bytes/n).toFixed(2)} | ${(r.ednUtf8Bytes/n).toFixed(2)} |`);
    fs.writeFileSync(path.join(dir,'TRANSACTION-SHAPE.md'),rows.join('\n')+'\n');
  } else throw Error('Usage: transaction-shape.mjs prepare|qualify RUN_DIR');
}
