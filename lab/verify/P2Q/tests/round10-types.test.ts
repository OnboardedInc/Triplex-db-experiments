// [CX-VP2Q-4-R10] Why: check real implementation diagnostics as well as the independent resolved-interface/table witness.
// Rejected: a synthetic type fixture alone (would not prove the production constructor accepts a bypass).
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { expect, it } from 'vitest';
import { REPO, writeJson } from './harness.js';
const field='readonly round10Read: (basis?: { readonly recordedPosition: number; readonly validAt: number }) => Effect.Effect<readonly Triple[], ReadError>;';
const contract=path.join(REPO,'packages/core/src/store/Triples.ts');
const implementation=path.join(REPO,'packages/core/src/store/TriplesLive.ts');
const original=fs.readFileSync(implementation,'utf8');
const body='round10Read: (_basis?: { readonly recordedPosition: number; readonly validAt: number }) => Effect.succeed([]),';
const forged='...constructReadDispatch({ round10Read: (basis?: { readonly recordedPosition: number; readonly validAt: number }) => [basis] as const }, (_basis?: { readonly recordedPosition: number; readonly validAt: number }): Effect.Effect<readonly Triple[], ReadError> => Effect.succeed([]))';
const launder=(text:string)=>text.replace('constructSnapshotReads, exactReadService','constructReadDispatch, constructSnapshotReads, exactReadService').replace('const reads = constructSnapshotReads({','const reads = { ...constructSnapshotReads({').replace('}, adapter.snapshotReadPolicy ?? { wrap: (effect) => effect });',`}, adapter.snapshotReadPolicy ?? { wrap: (effect) => effect }), ${forged} };`);
it.each(['baseline','direct','inherited','merged','laundered'])('round10 actual resolved checker %s addition',(kind)=>{
 let source=fs.readFileSync(contract,'utf8'),impl=original;
 if(kind==='direct'||kind==='laundered') source=source.replace('export interface TriplesService {',`export interface TriplesService { ${field}`);
 if(kind==='inherited') source=source.replace('export interface TriplesService {',`export interface Round10Reads { ${field} }\nexport interface TriplesService extends Round10Reads {`);
 if(kind==='merged') source+=`\nexport interface TriplesService { ${field} }`;
 if(kind!=='baseline') impl=kind==='laundered'?launder(impl):impl.replace('    assert: assert_,',`    ${body}\n    assert: assert_,`);
 expect(impl!==original).toBe(kind!=='baseline');
 const parsed=ts.getParsedCommandLineOfConfigFile(path.join(REPO,'lab/verify/P2Q/tsconfig.round9.json'),{},ts.sys as any)!;
 const host=ts.createCompilerHost(parsed.options),read=host.readFile.bind(host);
 host.readFile=file=>file===contract?source:file===implementation?impl:read(file);
 const program=ts.createProgram(parsed.fileNames,parsed.options,host);
 const diagnostics=(file:string)=>program.getSemanticDiagnostics(program.getSourceFile(file)!).map(d=>({code:d.code,message:ts.flattenDiagnosticMessageText(d.messageText,'\n')}));
 const implementationDiagnostics=diagnostics(implementation),coverageDiagnostics=diagnostics(path.join(REPO,'lab/verify/P2Q/types/round9.ts'));
 if(kind==='baseline'||kind==='laundered') {expect(implementationDiagnostics).toEqual([]);expect(coverageDiagnostics).toEqual([])}
 else {expect(implementationDiagnostics.map(d=>d.message).join('\n')).toContain('round10Read');expect(coverageDiagnostics.map(d=>d.message).join('\n')).toContain('round10Read')}
 writeJson(`round10-checker-${kind}.json`,{kind,source,impl,implementationDiagnostics,coverageDiagnostics});
});
