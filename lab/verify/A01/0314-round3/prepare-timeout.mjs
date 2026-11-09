// [CX-VA01-0314-R3] Why: hold the committed memory workload and 5 s limit constant across real source trees. Rejected: weakening values or treating absent main test files as a passing baseline.
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { ValueDomains } from '../../../../packages/core/src/ValueDomain.ts';
const root=path.resolve(import.meta.dirname,'../../../..');
const out=process.env.V_P2Q_OUT;fs.mkdirSync(out,{recursive:true});
const git=(...a)=>execFileSync('git',a,{cwd:root,maxBuffer:100<<20});
const sha=b=>createHash('sha256').update(b).digest('hex');
const testPath='test/integration/test/value-domains.test.ts';
const name='memory accepted endpoints survive journal, callback, get and receipt without conversion';
function extract(bytes){
  const ast=ts.createSourceFile(testPath,bytes.toString(),ts.ScriptTarget.Latest,true),parts={};
  for(const n of ast.statements){
    if(ts.isVariableStatement(n))for(const d of n.declarationList.declarations)if(['valid','nested'].includes(d.name.getText(ast)))parts[d.name.getText(ast)]=n.getText(ast);
    if(ts.isExpressionStatement(n)&&ts.isCallExpression(n.expression)&&n.expression.expression.getText(ast)==='it'&&n.expression.arguments[0]?.text===name){parts.test=n.getText(ast);parts.body=n.expression.arguments[1].getText(ast);}
  }
  if(!parts.valid||!parts.nested||!parts.body)throw Error('missing exact fixture');return parts;
}
const current=extract(fs.readFileSync(path.join(root,testPath)));
const historical=extract(git('show','f8d1c3da:'+testPath));
for(const key of ['valid','nested','body'])if(current[key]!==historical[key])throw Error(key+' changed since historical test commit');
const fixture='import { Effect } from "effect";\nimport { it, expect } from "vitest";\nimport { Triples, KvTriples, EntityId } from "@triplex-build/triplex";\ntype TripleValue = any; type ValueDomain = any;\nconst ValueDomains = '+JSON.stringify({memory:ValueDomains.memory})+';\n'+current.nested+'\n'+current.valid+'\n'+current.test+'\n';
const tools=import.meta.dirname;
fs.writeFileSync(path.join(tools,'memory-fixture.test.ts'),fixture);
const record={head:git('rev-parse','HEAD').toString().trim(),main:git('rev-parse','main').toString().trim(),historical:git('rev-parse','f8d1c3da').toString().trim(),testPath,testName:name,testBodySha256:sha(current.body),generatorSha256:sha(current.valid),fixtureSha256:sha(fixture),memoryDomain:ValueDomains.memory,baselines:{}};
for(const [label,ref] of [['main',record.main],['historical',record.historical]]){
  const snapshot=path.join(root,'runs','verify-A01-0314-round3',label);fs.mkdirSync(snapshot,{recursive:true});
  const tar=git('archive','--format=tar',ref,'packages/core','package.json','pnpm-lock.yaml');
  fs.writeFileSync(path.join(out,label+'-source.tar'),tar);
  const result=spawnSync('tar',['-x','-C',snapshot],{input:tar});if(result.status!==0)throw Error(result.stderr.toString());
  fs.symlinkSync(path.join(root,'node_modules'),path.join(snapshot,'node_modules'),'dir');
  const list=git('ls-tree','-r','--name-only',ref,'packages/core','package.json','pnpm-lock.yaml').toString().trim().split('\n');
  const hashes=Object.fromEntries(list.map(p=>[p,sha(fs.readFileSync(path.join(snapshot,p)))]));
  const mainHasTest=spawnSync('git',['cat-file','-e',ref+':'+testPath],{cwd:root}).status===0;
  const target=path.join(snapshot,'packages/core/src/index.ts');
  fs.writeFileSync(path.join(tools,'memory-'+label+'.config.ts'),`import { defineConfig } from 'vitest/config';\nexport default defineConfig({resolve:{alias:[{find:/^@triplex-build\\/triplex$/,replacement:${JSON.stringify(target)}}]},test:{root:import.meta.dirname,include:['memory-fixture.test.ts'],maxWorkers:1,fileParallelism:false,testTimeout:5000}});\n`);
  record.baselines[label]={commit:ref,snapshot,sourceArchiveSha256:sha(tar),hashes,originalHasTest:mainHasTest,originalHasDomain:spawnSync('git',['cat-file','-e',ref+':packages/core/src/ValueDomain.ts'],{cwd:root}).status===0,lockSha256:sha(git('show',ref+':pnpm-lock.yaml'))};
}
fs.writeFileSync(path.join(tools,'memory-branch.config.ts'),`import { defineConfig } from 'vitest/config';\nexport default defineConfig({resolve:{alias:[{find:/^@triplex-build\\/triplex$/,replacement:${JSON.stringify(path.join(root,'packages/core/src/index.ts'))}}]},test:{root:import.meta.dirname,include:['memory-fixture.test.ts'],maxWorkers:1,fileParallelism:false,testTimeout:5000}});\n`);
fs.writeFileSync(path.join(out,'comparison-source.json'),JSON.stringify(record,null,2));
fs.writeFileSync(path.join(tools,'comparison-source.json'),JSON.stringify({...record,baselines:Object.fromEntries(Object.entries(record.baselines).map(([k,{hashes,...v}])=>[k,v]))},null,2));
console.log(JSON.stringify({main:record.main,historical:record.historical,testBodySha256:record.testBodySha256,fixtureSha256:record.fixtureSha256,mainHasOriginalTest:record.baselines.main.originalHasTest}));
