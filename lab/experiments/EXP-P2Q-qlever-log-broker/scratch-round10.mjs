// [EXP-P2Q] Why: execute the reviewer's real typed native mutations in owned source copies without editing the measured source.
// Rejected: rewriting the observed position or substituting a synthetic facade for the actual factory.
import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';
const root=process.cwd(),base=process.argv[2];if(!base)throw Error('scratch root required');fs.mkdirSync(base,{recursive:false});
const records=[];
for(const variant of ['foreign','symbol']){
 const dest=path.join(base,variant);fs.mkdirSync(dest);
 for(const file of ['packages/core/src','packages/qlever/src','packages/core/package.json','packages/qlever/package.json','package.json','vitest.workspace-aliases.ts','tsconfig.base.json','tsconfig.node.json','lab/verify/P2Q/vitest.config.ts','lab/verify/P2Q/tests/harness.ts','lab/verify/P2Q/tests/round9-construction.test.ts','lab/verify/P2Q/types','lab/verify/P2Q/tsconfig.round9.json','lab/verify/P2Q/tsconfig.round9-final.json','lab/verify/P2Q/tsconfig.round10.json']){
  fs.mkdirSync(path.dirname(path.join(dest,file)),{recursive:true});fs.cpSync(path.join(root,file),path.join(dest,file),{recursive:true});
 }
 fs.symlinkSync(path.join(root,'node_modules'),path.join(dest,'node_modules'),'dir');
 for(const pkg of ['core','qlever'])fs.symlinkSync(path.join(root,'packages',pkg,'node_modules'),path.join(dest,'packages',pkg,'node_modules'),'dir');
 const file=path.join(dest,'packages/qlever/src/native/NativeQueries.ts');let source=fs.readFileSync(file,'utf8');
 if(variant==='symbol'){
  const anchor='      select: (\n';if(source.split(anchor).length!==2)throw Error('symbol anchor');
  source=source.replace(anchor,'      [round10NativeSymbol]: (contract: NativeQueryContract, input: unknown, build: QleverNativeBuilder, options?: NativeReadOptions) => [contract,input,build,options] as const,\n'+anchor);
 }else{
  source=source.replace('import { createReadConstructor }','import { createReadConstructor, constructReadDispatch, exactReadService }').replace('  return readConstructor.dispatch(','  const originalReads = readConstructor.dispatch(');
  const anchor='  );\n};\n\nexport type QleverNativeQueries';if(source.split(anchor).length!==2)throw Error('foreign anchor');
  source=source.replace(anchor,'  );\n  const added = constructReadDispatch({round10Read:(options?: NativeReadOptions)=>[options] as const}, (_options?: NativeReadOptions)=>Effect.succeed({rows:[]})).round10Read;\n  return exactReadService<typeof originalReads & {readonly [round10NativeSymbol]: typeof added}>()({...originalReads,[round10NativeSymbol]:added});\n};\n\nexport type QleverNativeQueries');
 }
 source+='\nexport const round10NativeSymbol: unique symbol = Symbol("round10NativeRead");\n';fs.writeFileSync(file,source);
 const consumer=`import {round10NativeSymbol,type QleverNativeQueries} from './native/NativeQueries.js';\n${variant==='symbol'?"import {TypeExpr} from '@triplex-build/triplex/config';\n":''}export const invoke=(facade:QleverNativeQueries)=>facade[round10NativeSymbol](${variant==='foreign'?'{basis:{recordedPosition:6144}}':"{name:'r10',parameters:TypeExpr.any,row:TypeExpr.any},{},()=> 'SELECT ?s WHERE { ?s ?p ?o }',{basis:{recordedPosition:6144}}"});\n`;
 fs.writeFileSync(path.join(dest,'packages/qlever/src/round10Consumer.ts'),consumer);
 fs.copyFileSync(path.join(root,'lab/verify/P2Q/round10-probes/native-probe.test.ts.txt'),path.join(dest,'lab/verify/P2Q/tests/round10-native-probe.test.ts'));
 records.push({variant,root:dest,sourceSha256:createHash('sha256').update(source).digest('hex'),consumerSha256:createHash('sha256').update(consumer).digest('hex')});
}
fs.writeFileSync(path.join(base,'inputs.json'),JSON.stringify(records,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(records));
