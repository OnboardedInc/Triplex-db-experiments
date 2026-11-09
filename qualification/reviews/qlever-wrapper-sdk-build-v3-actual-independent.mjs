// @ts-nocheck -- [EXP-CHECKJS] runtime coercion (Buffer JSON), dynamic collections, or validated inputs without static narrowing. Binding errors remain checked by lab/bin/checkjs.mjs.
/** Retained build/artifact review. Parser/printer only; no tsc/tsdown/SDK/engine. */
import assert from 'node:assert/strict';
import {readFile,readdir,lstat,writeFile}from'node:fs/promises';
import path from'node:path';import{pathToFileURL}from'node:url';import{createHash}from'node:crypto';
import{openContext,readState,loadJobManifest}from'../devloop/state.mjs';
import{verifyAttempt}from'../devloop/evidence.mjs';
const root=path.resolve(import.meta.dirname,'../..'),sha=b=>createHash('sha256').update(b).digest('hex'),json=async p=>JSON.parse(await readFile(path.resolve(root,p)));
const context=await openContext(root),checked=await verifyAttempt(context,'qlever-wrapper-sdk-build-v3','0001');
assert.equal(checked.terminalSha256,'e29e43c4bc6c855767a12d1895aa89253cd0eb9b3d57e9fa6cf9a9da7359226e');
assert.equal(checked.terminal.status,'completed_verified_bytes');assert.equal(checked.terminal.cleanup.groupGone,true);
const state=await readState(context),manifest=await loadJobManifest(context,state.jobs['qlever-wrapper-sdk-build-v3']);
for(const entry of manifest.inputs)assert.equal(sha(await readFile(path.resolve(root,entry.path))),entry.sha256,entry.path);
const directory='.devloop/jobs/qlever-wrapper-sdk-build-v3/attempts/0001',artifacts=directory+'/artifacts';
const buildFile=path.join(root,artifacts,'build.json'),build=await json(buildFile);assert.equal(sha(await readFile(buildFile)),'fb7da4121b7c23c9788e3134c73fe8b25b495bfe72feb9b5ba76af94c9512a84');
assert.equal(build.status,'GENERATED_PRIVATE_PUBLIC_ARTIFACT_ONLY');assert.equal(build.engineCalls,0);assert.equal(build.liveSourceOrDistWrites,false);assert.equal(build.loaderInstalled,false);
const contract=await json(manifest.command.argv.at(-1));
const target=path.join(root,build.packageRoot);assert.equal(build.packageRoot,'packages/qlever/.artifacts/wrapper-repair-sdk-v1/qlever-wrapper-sdk-build-v3-0001');
assert.equal(build.sourceCopies.length,21);assert.equal(build.generated.length,70);
for(const row of build.sourceCopies){const actual=await readFile(path.resolve(root,row.copy.path));assert.equal(sha(actual),row.copy.sha256);assert.equal(actual.length,row.copy.bytes);
 assert.notEqual((await lstat(path.resolve(root,row.copy.path))).ino,(await lstat(path.resolve(root,row.original.path))).ino);
 const rel=path.relative('packages/qlever',row.original.path);
 if(rel==='src/compiler.ts')assert.equal(sha(actual),contract.candidateCompiler.sha256);
 else if(rel==='tsconfig.json'){const before=await json(row.original.path);before.extends=path.join(root,'tsconfig.node.json');assert.deepEqual(JSON.parse(actual),before);}
 else assert.equal(sha(actual),row.original.sha256);
}
assert.deepEqual(await readFile(path.join(target,'public.types.ts')),await readFile(path.resolve(root,contract.publicWitness.path)));
assert.deepEqual(await json(path.join(target,'public.types.tsconfig.json')),{extends:path.join(root,'tsconfig.node.json'),compilerOptions:{noEmit:true},files:['./public.types.ts'],include:[]});
const members=[];const walk=async p=>{for(const name of await readdir(p)){const file=path.join(p,name),s=await lstat(file);assert(!s.isSymbolicLink());if(s.isDirectory())await walk(file);else members.push(path.relative(path.join(target,'dist'),file));}};await walk(path.join(target,'dist'));
assert.deepEqual(members.sort(),contract.baselineDist.map(row=>path.relative('packages/qlever/dist',row.path)).sort());
for(const row of build.generated){const actual=await readFile(path.resolve(root,row.path));assert.equal(sha(actual),row.sha256);assert.equal(actual.length,row.bytes);assert.equal((await lstat(path.resolve(root,row.path))).mode&0o222,0);}
for(const phase of build.phases){assert.equal(phase.status,0);assert.equal(phase.signal,null);const input=await json(`${artifacts}/${phase.label}-inputs.json`);assert.equal(input.cwd,build.packageRoot);assert.equal(input.nodeOptions,'--max-old-space-size=768');assert(input.argv[1]===path.resolve(root,contract.tsdownCli)||input.argv[1]===path.resolve(root,contract.typescriptCli));}
assert.deepEqual(build.phases.map(row=>row.label),['ordinary-tsdown','ordinary-declarations','actual-public-declaration-witness']);
assert.equal(build.publicFacadeResolution.url,pathToFileURL(path.join(target,'dist/index.js')).href);assert.equal(build.publicFacadeResolution.modulesImported,0);
const ts=(await import(pathToFileURL(path.resolve(root,contract.typescriptModule)).href)).default;
const parse=(text,name)=>ts.createSourceFile(name,text,ts.ScriptTarget.Latest,true,name.endsWith('.js')?ts.ScriptKind.JS:ts.ScriptKind.TS);
const printer=ts.createPrinter({removeComments:true}),normalized=(text,name)=>printer.printFile(parse(text,name));
const comparisons=[];
for(const row of build.comparisons){const before=await readFile(path.resolve(root,row.before.path),'utf8'),after=await readFile(path.resolve(root,row.after.path),'utf8');const equal=normalized(before,row.name)===normalized(after,row.name);assert.equal(equal,row.equal);assert(equal||row.name==='compiler.js');comparisons.push({name:row.name,equal});}
assert.deepEqual(comparisons.filter(row=>!row.equal).map(row=>row.name),['compiler.js']);
const compiler=build.comparisons.find(row=>row.name==='compiler.js'),before=await readFile(path.resolve(root,compiler.before.path),'utf8'),after=await readFile(path.resolve(root,compiler.after.path),'utf8');
const shape=node=>{const children=[];ts.forEachChild(node,child=>{children.push(shape(child));});return {
  kind:node.kind,...(node.kind!==ts.SyntaxKind.SourceFile&&typeof node.text==='string'?{text:node.text}:{}),
  ...(typeof node.operator==='number'?{operator:node.operator}:{}),
  ...(node.kind===ts.SyntaxKind.VariableDeclarationList?{declarationFlags:node.flags&(ts.NodeFlags.Let|ts.NodeFlags.Const|ts.NodeFlags.Using|ts.NodeFlags.AwaitUsing)}:{}),
  ...(node.questionDotToken?{optionalChain:true}:{}),children};};
const expectedBranch=parse('if ([">", ">=", "<", "<="].includes(filter.op) && typeof filter.value === "string" && !b.integerSum && !b.average && !b.nativeOrder) { const value = fixed(filter.value); filters.push(`(${b.family} = ${value.family} && ${b.order} ${filter.op} ${value.order})`); }','expected.js').statements[0];
const condition=shape(expectedBranch.expression),body=shape(expectedBranch.thenStatement);
const source=parse(after,'compiler.js');let branches=0;
const result=ts.transform(source,[ctx=>file=>{const visit=node=>{
 if(ts.isIfStatement(node)&&JSON.stringify(shape(node.expression))===JSON.stringify(condition)){
  branches++;assert.deepEqual(shape(node.thenStatement),body);assert(node.elseStatement);return node.elseStatement;
 }
 return ts.visitEachChild(node,visit,ctx);
};return ts.visitNode(file,visit);}]);
assert.equal(branches,1);assert.deepEqual(shape(result.transformed[0]),shape(parse(before,'compiler.js')),'ONLY_REVIEWED_BRANCH_REMOVAL_MUST_RESTORE_BASELINE');result.dispose();
const js=comparisons.filter(row=>row.name.endsWith('.js')),dts=comparisons.filter(row=>row.name.endsWith('.d.ts'));
assert.equal(js.length,18);assert.equal(dts.length,18);
const report={format:'triplex-independent-q-sdk-build-actual-review/1',reviewer:'xtdb-native-independent',status:'CLEAR_ACTUAL_PRIVATE_BUILD_DTS_AND_RESOLUTION_ONLY',
 terminalSha256:checked.terminalSha256,manifestSha256:checked.terminal.manifestSha256,buildSha256:sha(await readFile(buildFile)),currentDeclaredPins:manifest.inputs.length,currentDrift:[],
 retainedOutputs:checked.terminal.outputs.length,sourcePreimages:checked.sourcePreimages,privatePackage:build.packageRoot,actualSourceCopies:21,actualGeneratedMembers:70,
 executableIdentity:{unchangedOtherJs:17,unchangedDts:18,changedModule:'compiler.js',reviewedBranchCount:branches,branchRemovalRestoresParsedBaseline:true,scope:'Parser/printing and exact inserted branch token checks; not arbitrary JS equivalence'},
 actualCompilerPhases:build.phases,publicWitness:'Actual private-package DTS typecheck exited0; witness bytes/config independently retained',selfResolution:build.publicFacadeResolution,
 cleanup:checked.terminal.cleanup,limits:['No tsc/tsdown command, SDK facade, runtime, engine or service was executed by this reviewer. Only the pinned TypeScript parser/printer library was evaluated.',
 'Build/source/declaration/resolution evidence only; actual SDK/Core/Effect runtime module consumption, backend answers and collation remain unqualified.',
 'Existing installed dependencies were checksum-bound in place; no whole OS/conditional environment closure or kernel immutable snapshot claim.',
 'Private artifacts stay separately selectable; no live source/dist/default integration or performance promotion.'],reviewerCompilerCommandInvocations:0,reviewerSdkImports:0,reviewerEngineCalls:0};
const out=path.join(root,'qualification/reviews/qlever-wrapper-sdk-build-v3-actual-independent.json');await writeFile(out,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({output:path.relative(root,out),sha256:sha(await readFile(out)),generated:70,unchangedJs:17,unchangedDts:18,branches}));
