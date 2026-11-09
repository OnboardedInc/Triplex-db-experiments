// [CX-VP2Q-4-R10] Why: a symbol operation in the real native table must be rejected or exist behind its gated continuation.
// Rejected: a helper-only example (does not establish whether actual public-surface guards catch it).
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
const root=process.cwd(),dest=path.join(root,'lab/verify/P2Q/scratch-round10/native-symbol');
fs.mkdirSync(dest);
for(const file of ['packages/core/src','packages/qlever/src','packages/core/package.json','packages/qlever/package.json','package.json','vitest.workspace-aliases.ts','tsconfig.node.json','tsconfig.base.json','lab/verify/P2Q/vitest.config.ts','lab/verify/P2Q/tests/harness.ts','lab/verify/P2Q/tests/round8-policy.test.ts','lab/verify/P2Q/tests/round9-construction.test.ts','lab/verify/P2Q/types','lab/verify/P2Q/tsconfig.round9.json']){fs.mkdirSync(path.dirname(path.join(dest,file)),{recursive:true});fs.cpSync(path.join(root,file),path.join(dest,file),{recursive:true});}
fs.symlinkSync(path.join(root,'node_modules'),path.join(dest,'node_modules'),'dir');
for(const pkg of ['core','qlever']) fs.symlinkSync(path.join(root,'packages',pkg,'node_modules'),path.join(dest,'packages',pkg,'node_modules'),'dir');
const file=path.join(dest,'packages/qlever/src/native/NativeQueries.ts');
const original=fs.readFileSync(file,'utf8');
const prefix='      select: (\n';
if(original.split(prefix).length!==2)throw Error('mutation anchor not unique');
const addition=`      [round10NativeSymbol]: (\n        contract: NativeQueryContract,\n        input: unknown,\n        build: QleverNativeBuilder,\n        options?: NativeReadOptions,\n      ) => [contract, input, build, options] as const,\n`;
const mutated=original.replace(prefix,addition+prefix)+'\nexport const round10NativeSymbol: unique symbol = Symbol("round10NativeRead");\n';
fs.writeFileSync(file,mutated);
const probe=`// [CX-VP2Q-4-R10] Why: prove the inferred public native symbol is absent despite unchanged runtime guards accepting the service.\n// Rejected: an untyped invented property (does not exercise the exported QleverNativeQueries type).\nimport ts from 'typescript';\nimport path from 'node:path';\nimport { expect,it } from 'vitest';\nimport { makeQleverNativeQueries,round10NativeSymbol } from '../../../../packages/qlever/src/native/NativeQueries.js';\nimport { ModelReplica,REPO,writeJson } from './harness.js';\nimport { graphIri } from '../../../../packages/qlever/src/rdf.js';\nit('round10 real native symbol is accepted by types and omitted by construction',()=>{\n const parsed=ts.getParsedCommandLineOfConfigFile(path.join(REPO,'lab/verify/P2Q/tsconfig.round9.json'),{},ts.sys as any)!;\n const program=ts.createProgram(parsed.fileNames,parsed.options);\n const nativeFile=program.getSourceFile(path.join(REPO,'packages/qlever/src/native/NativeQueries.ts'))!;\n const diagnostics=program.getSemanticDiagnostics(nativeFile).map(d=>ts.flattenDiagnosticMessageText(d.messageText,'\\n'));\n expect(diagnostics).toEqual([]);\n const scope='round10-symbol';const facade=makeQleverNativeQueries(new ModelReplica(graphIri(scope)),scope);\n type MustBeFunction<T extends (...args:any[])=>any>=T;\n type PublicSymbolRead=MustBeFunction<typeof facade[typeof round10NativeSymbol]>;\n expect(facade[round10NativeSymbol]).toBeUndefined();\n let error='';try{facade[round10NativeSymbol]({} as any,{},()=>'',{basis:{recordedPosition:6144}})}catch(e){error=String(e)}\n expect(error).toContain('is not a function');\n writeJson('round10-native-symbol.json',{diagnostics,error,expectedPublicSymbol:String(round10NativeSymbol),keys:Reflect.ownKeys(facade).map(String),future:6144,purpose:'counterexample, not acceptance'});\n});\n`;
fs.writeFileSync(path.join(dest,'lab/verify/P2Q/tests/round10-native-symbol.test.ts'),probe);
console.log(JSON.stringify({dest,originalSha256:createHash('sha256').update(original).digest('hex'),mutatedSha256:createHash('sha256').update(mutated).digest('hex')}));
