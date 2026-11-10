// [DX-S4] Why: use the lane's full a0 RDF mapping, not a blob-only floor, and verify reversible payload projection. Rejected: dropping numeric shadows or metadata to make the index look small.
import fs from 'node:fs';import readline from 'node:readline';import crypto from 'node:crypto';import {columns,numericColumns,encodeRow,rowFields} from './qlever-rdf.mjs';
const input=process.argv[2],out=process.argv[3],summary=JSON.parse(fs.readFileSync(`${input}/summary.json`));fs.mkdirSync(out);
const file=fs.openSync(`${out}/facts.nq`,'wx'),sourceHash=crypto.createHash('sha256'),nqHash=crypto.createHash('sha256');
const graph='<urn:triplex:scope:c3RvcmFnZS1zcGlrZQ>';let n=0,triples=0,buffer='';
const stream=fs.createReadStream(`${input}/rows.jsonl`);stream.on('data',b=>sourceHash.update(b));
function flush(){if(buffer){fs.writeSync(file,buffer);nqHash.update(buffer);buffer=''}}
for await(const line of readline.createInterface({input:stream})){
 const cells=JSON.parse(line),row=Object.fromEntries(columns.map(k=>[k,null]));
 summary.fields.forEach((k,i)=>row[k]=i===0?Number(cells[i]):cells[i]);
 if(!Number.isSafeInteger(row.recorded_position)||String(row.recorded_position).padStart(16,'0')!==cells[0])throw Error('position precision/lexical roundtrip');
 const decoded=JSON.parse(encodeRow(row));
 const back=summary.fields.map((k,i)=>i===0?String(Number(decoded[k])).padStart(16,'0'):decoded[k]===null?null:numericColumns.has(k)?Number(decoded[k]):decoded[k]);
 if(back.some((v,i)=>!Object.is(v,cells[i])))throw Error(`RDF row roundtrip ${cells[1]}`);
 const subject=`<urn:triplex:assertion:${Buffer.from(row.id).toString('base64url')}>`;
 for(const [field,value] of rowFields(row)){buffer+=`${subject} <urn:triplex:field:${field}> ${value} ${graph} .\n`;triples++}
 n++;if(buffer.length>1024*1024)flush();
}
flush();fs.closeSync(file);const sourceSha256=sourceHash.digest('hex');if(n!==442410||sourceSha256!==summary.input_files['rows.jsonl'].sha256)throw Error('source binding');
const sha=f=>crypto.createHash('sha256').update(fs.readFileSync(new URL(f,import.meta.url))).digest('hex');
const result={classification:'DIAGNOSTIC-LOSSLESS-RDF-PROJECTION',rows:n,triples,graph,sourceSha256,nqSha256:nqHash.digest('hex'),nqBytes:fs.statSync(`${out}/facts.nq`).size,originalRdfSha256:sha('./qlever-rdf-source.txt'),adaptedRdfSha256:sha('./qlever-rdf.mjs'),prepareSha256:sha('./prepare-qlever.mjs'),mapping:'packages/qlever/src/rdf.ts rowFields, default a0; original _row plus scalar and numeric shadows; bare assertions only'};
fs.writeFileSync(`${out}/summary.json`,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
