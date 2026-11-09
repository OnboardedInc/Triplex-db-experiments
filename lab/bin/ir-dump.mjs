// [EXP-OBS01-R16] Structured reader for the output of `bpftrace v0.20.2 -d` (the real golden dump, lab/observer/golden/).
// Why: the round 12 parser looked for BPF disassembly (`Disassembly of section`), which 0.20.2 `-d` never prints. What `-d` prints is the AST after five passes and then ONE LLVM IR module
// (the optimised module that is loaded). This reader parses exactly that, strictly, and stays DIAGNOSTIC under Q109a (clockPrimitiveVerdict never lets it change `pass`).
// Rejected: reading the disassembly format again (it does not exist in 0.20.2); matching helper calls with one loose regex over the whole text (an indirect call, an inline-asm call, an
// unknown intrinsic or a call outside a probe function would not be accounted for); promoting it to a gate in the same round (Q109a keeps it diagnostic until reviewed).
//
// What it accounts for, and refuses otherwise (every refusal is a reason string, never an exception):
//   - exactly one `; ModuleID` module (`-dd` prints two and is refused here);
//   - the last AST block: every `call: nsecs` has a child `identifier: monotonic`, and their count equals the source's nsecs(monotonic) sites;
//   - every `define` is closed; every function maps to one source probe (fentry->kfunc, fexit->kretfunc is bpftrace 0.20.2's own spelling); each probe has the source's per-block ktime count;
//   - every line of a function body that mentions call/invoke/callbr is one direct call of the form `[tail ]call <type> <callee>(`; the callee is either a constant helper
//     `inttoptr (i64 N to ptr)` or an allow-listed `@llvm.*` intrinsic. Anything else (a register callee, inline asm, another function, invoke, callbr, a different pointer spelling) is UNPARSED-CALL;
//   - every helper id is in the kernel `bpf_func_id` enum and on the allow-list; any clock helper other than bpf_ktime_get_ns is refused; total ktime calls equal the source sites;
//   - no call-like text outside a probe function; no ERROR/fatal line in stderr.

/** Intrinsics the golden dump uses (lifetime markers, the `llvm.bpf.pseudo` map-fd marker, memset of a stack buffer). Any other `@llvm.*` callee is refused until a reviewer adds it. */
export const IR_INTRINSIC_ALLOW=['llvm.lifetime.start.p0','llvm.lifetime.end.p0','llvm.bpf.pseudo','llvm.memset.p0.i64'];

const CALLISH=/(?<![%@\w.$])(?:call|invoke|callbr)\b/;
const CALL_INSN=/^\s*(?:%[\w.$-]+\s*=\s*)?(?:(?:tail|musttail|notail)\s+)?call\s+(void|i\d+|ptr)\s+(inttoptr\s*\(\s*i64\s+(\d+)\s+to\s+ptr\s*\)|@[A-Za-z0-9_.$]+)\s*\(/;
const DEFINE=/^define\b.*?@("(?:[^"\\]|\\.)+"|[A-Za-z0-9_.$]+)\(.*\{\s*$/;
/** Quoted strings emptied, then the trailing `; comment` removed. */
const clean=line=>line.replace(/"(?:[^"\\]|\\.)*"/g,'""').replace(/;.*$/,'');
/** bpftrace 0.20.2 names a fentry/fexit program kfunc:/kretfunc: in the IR (the same spelling its `-l` prints). */
export const irProbeName=head=>String(head).replace(/\s+/g,'').replace(/^fentry:/,'kfunc:').replace(/^fexit:/,'kretfunc:');

/**
 * @param {string} stdout   the `-d` standard output
 * @param {object} ctx      {nameById: Map<id,name>, allowedNames: string[], isClockName: name=>bool, monotonicName: string,
 *                           probes: [{head, monotonic}] (the source's blocks, from clock-proof sourceProbeBlocks), monotonicSites: number, stderr?: string}
 * @returns {{pass, reasons, format, modules, functions:[{name,probe,calls,ktime}], calls:{name:n}, intrinsics:{name:n}, ktimeCalls, astNsecs, unparsed:[...], forbidden:[...]}}
 */
export function parseIrDump(stdout,ctx){
 const reasons=[],unparsed=[],forbidden=[],functions=[],calls={},intrinsics={};
 const lines=String(stdout??'').split(/\r?\n/);
 const moduleAt=lines.map((l,i)=>/^; ModuleID = /.test(l)?i:-1).filter(i=>i>=0);
 const out=extra=>({pass:reasons.length===0,reasons,format:'llvm-ir',modules:moduleAt.length,functions,calls,intrinsics,ktimeCalls:calls[ctx.monotonicName]??0,astNsecs:extra?.astNsecs??null,unparsed,forbidden:[...new Set(forbidden)]});
 if(moduleAt.length!==1){reasons.push('expected exactly one LLVM IR module (bpftrace -d), found '+moduleAt.length);return out();}
 const modStart=moduleAt[0];

 // ---- AST: the last AST block's nsecs calls ----
 const astStarts=lines.map((l,i)=>/^AST after: /.test(l)?i:-1).filter(i=>i>=0&&i<modStart);
 let astNsecs=0;
 if(!astStarts.length)reasons.push('no AST block before the IR module');
 else{
  const ast=lines.slice(astStarts.at(-1),modStart);
  ast.forEach((l,k)=>{
   if(!/^\s*call: nsecs\b/.test(l))return;
   const depth=/^(\s*)/.exec(l)[1].length,next=ast[k+1]??'';
   if(/^\s*identifier: monotonic\b/.test(next)&&/^(\s*)/.exec(next)[1].length>depth)astNsecs+=1;
   else reasons.push('AST nsecs call at dump line '+(astStarts.at(-1)+k+1)+' is not nsecs(monotonic)');
  });
  if(astNsecs!==ctx.monotonicSites)reasons.push('AST has '+astNsecs+' nsecs(monotonic) calls, the source has '+ctx.monotonicSites);
 }

 // ---- IR: functions and calls ----
 let current=null;
 const seen=new Set();
 for(let i=modStart;i<lines.length;i++){
  const raw=lines[i],code=clean(raw),at=i+1;
  if(current===null){
   if(/^define\b/.test(raw)){
    const m=DEFINE.exec(raw);
    if(!m){reasons.push('UNPARSED-DEFINE at dump line '+at+': '+raw.trim().slice(0,80));continue;}
    const name=m[1].startsWith('"')?m[1].slice(1,-1):m[1];
    if(seen.has(name))reasons.push('probe function '+name+' is defined twice');seen.add(name);
    current={name,calls:{},ktime:0,line:at};continue;
   }
   if(/^\s*(?:;|!|declare\b|attributes\b|target\b|source_filename\b|@|$)/.test(raw))continue;
   if(CALLISH.test(code)){unparsed.push({line:at,text:raw.trim().slice(0,120),reason:'call-like text outside a probe function'});reasons.push('UNPARSED-CALL outside a probe function at dump line '+at+': '+raw.trim().slice(0,80));}
   continue;
  }
  if(/^\}\s*$/.test(raw)){functions.push(current);current=null;continue;}
  if(!CALLISH.test(code))continue;
  const m=CALL_INSN.exec(code),tokens=(code.match(/(?<![%@\w.$])(?:call|invoke|callbr)\b/g)??[]).length;
  if(!m||tokens>1){unparsed.push({line:at,function:current.name,text:raw.trim().slice(0,120),reason:tokens>1?'more than one call token on a line':'call-like line that is not a direct helper or allow-listed intrinsic call'});
   reasons.push('UNPARSED-CALL in '+current.name+' at dump line '+at+': '+raw.trim().slice(0,80));continue;}
  if(m[3]===undefined){   // an @callee
   const callee=m[2].slice(1);
   if(!IR_INTRINSIC_ALLOW.includes(callee)){unparsed.push({line:at,function:current.name,text:raw.trim().slice(0,120),reason:'call of '+m[2]+' (not an allow-listed intrinsic)'});
    reasons.push('UNPARSED-CALL in '+current.name+' at dump line '+at+': call of '+m[2]+' is not an allow-listed intrinsic');continue;}
   intrinsics[callee]=(intrinsics[callee]??0)+1;continue;
  }
  const id=Number(m[3]),name=ctx.nameById.get(id);
  if(name===undefined){reasons.push('helper id '+id+' in '+current.name+' at dump line '+at+' is not in the kernel bpf_func_id enum');continue;}
  calls[name]=(calls[name]??0)+1;current.calls[name]=(current.calls[name]??0)+1;
  if(name===ctx.monotonicName)current.ktime+=1;
  else if(ctx.isClockName(name)){forbidden.push(name+'#'+id+' (in '+current.name+')');}
  else if(!ctx.allowedNames.includes(name))reasons.push('helper '+name+'#'+id+' in '+current.name+' at dump line '+at+' is not on the allow-list');
 }
 if(current!==null)reasons.push('probe function '+current.name+' (dump line '+current.line+') is not closed');
 if(forbidden.length)reasons.push('compiled program reads another clock: '+[...new Set(forbidden)].join(', '));

 // ---- bind functions to the source's probe blocks ----
 const want=ctx.probes.map(p=>({name:irProbeName(p.head),monotonic:p.monotonic}));
 if(functions.length!==want.length)reasons.push('compiled program has '+functions.length+' probe functions, the source has '+want.length+' probes');
 const pool=[...want];
 for(const f of functions){
  const k=pool.findIndex(w=>w.name===f.name);
  if(k<0){reasons.push('probe function '+f.name+' matches no source probe');f.probe=null;continue;}
  const w=pool.splice(k,1)[0];f.probe=w.name;
  if(f.ktime!==w.monotonic)reasons.push('probe function '+f.name+' has '+f.ktime+' bpf_ktime_get_ns calls, the source block has '+w.monotonic+' nsecs(monotonic)');
 }
 for(const w of pool)reasons.push('source probe '+w.name+' has no compiled function');
 const ktime=calls[ctx.monotonicName]??0;
 if(ktime!==ctx.monotonicSites)reasons.push('compiled program has '+ktime+' bpf_ktime_get_ns calls, the source has '+ctx.monotonicSites+' nsecs(monotonic) sites');
 if(astStarts.length&&ktime!==astNsecs)reasons.push('compiled program has '+ktime+' bpf_ktime_get_ns calls, the AST has '+astNsecs+' nsecs(monotonic) calls');
 const err=String(ctx.stderr??'').split(/\r?\n/).find(l=>/^\s*(error|fatal)\b/i.test(l));
 if(err)reasons.push('bpftrace stderr has an error line: '+err.trim().slice(0,80));
 return out({astNsecs});
}
