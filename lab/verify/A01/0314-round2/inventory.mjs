// [CX-VA01-0314-R2] Why: enumerate adapter/domain declarations beyond selected gates. Rejected: a builder-supplied list without repository-wide search.
import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const out=process.env.V_P2Q_OUT;fs.mkdirSync(out,{recursive:true});
const files=execFileSync('git',['ls-files','-z'],{encoding:'utf8'}).split('\0').filter(p=>p.endsWith('.ts')&&!p.includes('/evidence'));
const declarations=[],providers=[];
for(const file of files){
  const source=fs.readFileSync(file,'utf8'),ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true);
  const visit=n=>{
    if(ts.isPropertyAssignment(n)&&n.name?.getText(ast)==='valueDomain')declarations.push({file,line:ast.getLineAndCharacterOfPosition(n.getStart()).line+1,value:n.initializer.getText(ast)});
    if(ts.isCallExpression(n)&&n.arguments[0]?.getText(ast)==='StorageAdapter')providers.push({file,line:ast.getLineAndCharacterOfPosition(n.getStart()).line+1,call:n.expression.getText(ast),service:n.arguments[1]?.getText(ast)});
    ts.forEachChild(n,visit);
  };visit(ast);
}
fs.writeFileSync(path.join(out,'inventory.json'),JSON.stringify({files:files.length,declarations,providers},null,2));
console.log(JSON.stringify({scanned:files.length,domainDeclarations:declarations.length,adapterProviders:providers.length}));
