// [EXP-G03-R5] Why: compile candidate entry/provider as bytes without executing them on the Mac. Rejected: tsx importing candidate modules into the evaluator.
import fs from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';
const root=path.resolve(import.meta.dirname,'../../../..'),req=createRequire(import.meta.resolve('tsx')),esbuild=req('esbuild');
export function buildCandidate(out){
 fs.mkdirSync(out,{recursive:true});if(fs.readdirSync(out).length)throw Error('candidate build output not fresh');
 // [EXP-G03-R5] Why: this smoke exercises only the public durable-flush export; the manifest records its implementation preimage. Rejected: building unrelated host services into a tiny diagnostic role.
 const built=esbuild.buildSync({entryPoints:[path.join(root,'packages/qualification/workloads/ns-sut.ts')],bundle:true,platform:'node',target:'node22',format:'esm',write:false,metafile:true,alias:{'@triplex-build/triplex-host/feed':path.join(root,'packages/host/src/feed/DurableFlush.ts')}});
 fs.writeFileSync(path.join(out,'ns-sut.mjs'),built.outputFiles[0].contents);
 const provider=esbuild.buildSync({entryPoints:[path.join(root,'lab/experiments/EXP-G03/ns/smoke-provider.mjs')],bundle:true,platform:'node',target:'node22',format:'esm',write:false,metafile:true});fs.writeFileSync(path.join(out,'provider.mjs'),provider.outputFiles[0].contents);
 fs.writeFileSync(path.join(out,'metafile.json'),JSON.stringify({candidate:built.metafile,provider:provider.metafile}));
 return fs.readdirSync(out).filter(n=>n.endsWith('.mjs')).map(n=>[n,{mode:'100644',bytes:fs.readFileSync(path.join(out,n))}]);
}
if(process.argv[1]===fileURLToPath(import.meta.url))buildCandidate(process.argv[2]);
