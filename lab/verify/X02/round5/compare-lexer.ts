// [CX-VX02-5] Why: compare original behavior and traced boundaries with actual resident ANTLR tokens.
// Rejected: using the generated regex patterns as the oracle or treating policy refusal as token agreement.
import{readFileSync,writeFileSync}from'node:fs';import assert from'node:assert/strict';
import{nativeSqlTokens}from'./target/packages/xtdb/src/native/SqlTokens.ts';
import{nativeSqlTokens as traced}from'./traced-SqlTokens.ts';
const dir=import.meta.dirname;const cases=JSON.parse(readFileSync(dir+'/lexer-cases.json','utf8'));
const decode=(x:any):any=>typeof x==='string'?Buffer.from(x,'base64').toString('utf8'):Array.isArray(x)?x.map(decode):x;
const raw=readFileSync(dir+'/oracle.jsonl','utf8').trim().split('\n').map(s=>decode(JSON.parse(s)));
const metadata=raw.filter(x=>x[0]==='_metadata');const refs=new Map(raw.filter(x=>x[0]!=='_metadata').map(x=>[x[0],x]));assert.equal(refs.size,cases.length);
const type=(name:string,text:string)=>/^[A-Za-z_][A-Za-z0-9_$]*$/.test(text)?'WORD':name;
const quote=new Set(['CHARACTER_STRING','C_ESCAPES_STRING','BINARY_STRING','DELIMITED_IDENTIFIER','DOLLAR_TAG']);
const skipped=new Set(['WHITESPACE','BLOCK_COMMENT','LINE_COMMENT']);
const observedRef=new Set<string>();const report:any={at:new Date().toISOString(),metadata,controls:[],counts:{exact:0,refusedValid:0,refusedInvalid:0,acceptedMismatch:0,instrumentationMismatch:0}};
for(const c of cases){
 const [id,rawTokens,errors,mode]:any=refs.get(c.id);assert.equal(id,c.id);
 const offsets=[0];for(const ch of c.sql as string)offsets.push(offsets.at(-1)!+ch.length);
 const ref:any[]=[];
 for(let i=0;i<rawTokens.length;i++){
  let[name,a,b,text]=rawTokens[i];observedRef.add(name);
  if(name==='DOLLAR_TAG'){
   while(i+1<rawTokens.length){const next=rawTokens[++i];observedRef.add(next[0]);b=next[2];if(next[0]==='DM_END_TAG')break;}
  }
  const start=offsets[a],end=offsets[b];ref.push({name:type(name,text),start,end,text:c.sql.slice(start,end)});
 }
 const spans:any[]=[];let actual:any,instrumented:any,actualError:any,traceError:any;
 try{actual=nativeSqlTokens(c.sql)}catch(e){actualError=String(e)}
 try{instrumented=traced(c.sql,spans)}catch(e){traceError=String(e)}
 const instrumentationMatches=JSON.stringify(actual)===JSON.stringify(instrumented)&&actualError===traceError;
 if(!instrumentationMatches)report.counts.instrumentationMismatch++;
 const trace=spans.map(x=>({...x,name:type(x.name,x.text)}));
 const refResult:any={tokens:[],words:[]};
 for(const t of ref){if(skipped.has(t.name))continue;if(t.name==='SEMI'){refResult.end=t.start;continue;}
  refResult.tokens.push(quote.has(t.name)?'<quoted>':t.text.toUpperCase());if(t.name==='WORD')refResult.words.push(t.text.toUpperCase());}
 const referenceValid=errors.length===0&&mode===0;
 let disposition:string;
 if(actualError){disposition=referenceValid?'refused-valid-lexing':'refused-invalid-lexing';report.counts[referenceValid?'refusedValid':'refusedInvalid']++;}
 else{
  const match=referenceValid&&JSON.stringify(trace)===JSON.stringify(ref)&&JSON.stringify(actual)===JSON.stringify(refResult);
  disposition=match?'exact':'accepted-mismatch';report.counts[match?'exact':'acceptedMismatch']++;
 }
 report.controls.push({...c,referenceValid,errors,mode,reference:ref,observed:trace,actual,actualError,instrumentationMatches,disposition});
}
report.referenceTokenClasses=[...observedRef].sort();
writeFileSync(dir+'/lexer-comparison.json',JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({cases:cases.length,counts:report.counts,observedClasses:report.referenceTokenClasses.length,metadata},null,2));
if(report.counts.acceptedMismatch||report.counts.instrumentationMismatch)process.exitCode=1;
