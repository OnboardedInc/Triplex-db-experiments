// [CX-VP2Q-4-R10] Why: type-check a real consumer of the new native symbol, beyond the implementation's own diagnostics.
// Rejected: relying on a type alias in a transpile-only Vitest fixture (it would not check the consumer contract).
import fs from 'node:fs';import path from 'node:path';import ts from 'typescript';import {expect,it} from 'vitest';import {REPO,writeJson} from './harness.js';
it('round10 compiler accepts a consumer calling the dropped native symbol',()=>{
 const sourcePath=path.join(REPO,'packages/qlever/src/native/NativeQueries.ts');
 const mutationPath=path.join(REPO,'lab/verify/P2Q/scratch-round10/native-symbol-retry/packages/qlever/src/native/NativeQueries.ts');
 const mutation=fs.readFileSync(mutationPath,'utf8');
 const clientPath=path.join(REPO,'round10-symbol-consumer.ts');
 const client=`import {makeQleverNativeQueries,round10NativeSymbol} from './packages/qlever/src/native/NativeQueries.js';
 import type {QleverNativeQueries} from './packages/qlever/src/native/NativeQueries.js';
 export type MustBeFunction<T extends (...args:any[])=>any> = T;
 export type SymbolMethod = MustBeFunction<QleverNativeQueries[typeof round10NativeSymbol]>;
 export const consume=(facade: QleverNativeQueries,...args:Parameters<SymbolMethod>)=>facade[round10NativeSymbol](...args);
 export const constructor = makeQleverNativeQueries;`;
 const parsed=ts.getParsedCommandLineOfConfigFile(path.join(REPO,'lab/verify/P2Q/tsconfig.round9.json'),{},ts.sys as any)!;
 const host=ts.createCompilerHost(parsed.options),read=host.readFile.bind(host),exists=host.fileExists.bind(host);
 host.fileExists=f=>f===clientPath||exists(f);host.readFile=f=>f===sourcePath?mutation:f===clientPath?client:read(f);
 const program=ts.createProgram([...parsed.fileNames,clientPath],parsed.options,host);
 const check=(file:string)=>program.getSemanticDiagnostics(program.getSourceFile(file)!).map(d=>({code:d.code,message:ts.flattenDiagnosticMessageText(d.messageText,'\n')}));
 const clientDiagnostics=check(clientPath),implementationDiagnostics=check(sourcePath);
 expect(clientDiagnostics).toEqual([]);expect(implementationDiagnostics).toEqual([]);
 const source=program.getSourceFile(sourcePath)!;
 const fn=source.statements.find(n=>ts.isVariableStatement(n)&&n.declarationList.declarations.some(d=>d.name.getText(source)==='makeQleverNativeQueries')) as ts.VariableStatement;
 const declaration=fn.declarationList.declarations.find(d=>d.name.getText(source)==='makeQleverNativeQueries')!;
 const checker=program.getTypeChecker(),signature=checker.getTypeAtLocation(declaration).getCallSignatures()[0]!;
 const properties=checker.getPropertiesOfType(signature.getReturnType()).map(s=>({name:s.getName(),signatures:checker.getTypeOfSymbolAtLocation(s,declaration).getCallSignatures().length}));
 expect(properties.some(p=>p.name.includes('round10NativeSymbol')&&p.signatures===1)).toBe(true);
 writeJson('round10-symbol-consumer.json',{mutationPath,client,clientDiagnostics,implementationDiagnostics,properties});
});
