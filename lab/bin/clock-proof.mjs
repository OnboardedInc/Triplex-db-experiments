// [EXP-OBS01-R11] Why (R10-F3, orchestrator decision): the witness's clock primitive is proven from the PROGRAM, not by observing timestamps.
// An observed timestamp cannot tell CLOCK_MONOTONIC from CLOCK_BOOTTIME when the two are equal (no suspend yet) or closer than the transport
// delay, so W0 binds the exact .bt source hash and the bpftrace version, asks that same bpftrace for its compiled program and checks every time
// read in it. Pure functions only (no repo imports) so they can be unit-tested without a VM.
// Rejected: passing the clock step on an observational comparison (R10-F3 showed a boot-clock substitution passing with a small offset, a zero
// offset or transport delay larger than the offset).
import {createHash} from 'node:crypto';

export const BPFTRACE_VERSION='0.20.2';
/** The ONE flag set W0 relies on to make bpftrace emit its compiled program. R49 does not document bpftrace's debug options and no bpftrace or
 * network is available offline, so this is from the builder's knowledge of the 0.20 series, UNVERIFIED against the 0.20.2 man page: `-d STAGE`
 * (stages all, ast, codegen, codegen-opt, dis, libbpf, verifier), which compiles and prints each stage without running the program. If 0.20.2
 * rejects it, the dump is empty, the parser finds no time read and W0 refuses (fail closed); the first W0 run records the real output and settles it. */
export const COMPILE_FLAGS=['-d','all'];
/** Positional arguments for the dump: placeholders. They change only constants in the compiled program, never which helpers it calls. */
export const COMPILE_PLACEHOLDER_ARGS=['1','2','3','4'];
/** Helper ids from linux include/uapi/linux/bpf.h (BPF_FUNC_*), written from memory of that header (not verifiable offline). Only the helpers that
 * read a clock matter here: ktime_get_ns (CLOCK_MONOTONIC) is the only one allowed; the others are the forbidden clocks. */
export const MONOTONIC_HELPER={id:5,name:'bpf_ktime_get_ns'};
export const FORBIDDEN_CLOCK_HELPERS=new Map([[118,'bpf_jiffies64'],[125,'bpf_ktime_get_boot_ns'],[160,'bpf_ktime_get_coarse_ns'],[208,'bpf_ktime_get_tai_ns']]);
const CLOCK_NAME_BY_ID=new Map([[MONOTONIC_HELPER.id,MONOTONIC_HELPER.name],...FORBIDDEN_CLOCK_HELPERS]);
const CLOCK_ID_BY_NAME=new Map([...CLOCK_NAME_BY_ID].map(([id,name])=>[name,id]));

export const sha256Hex=data=>createHash('sha256').update(data).digest('hex');

/** Source text without comments, the `#!` line and string-literal contents irrelevant here (the programs contain no clock words in strings). */
export function stripBtComments(source){
 return String(source).replace(/\/\*[\s\S]*?\*\//g,'').split('\n').filter(l=>!l.trim().startsWith('//')&&!l.trim().startsWith('#')).map(l=>l.replace(/\/\/.*$/,'')).join('\n');
}

/** Time reads in the .bt source: nsecs(monotonic) sites, and anything else that reads a clock (bare nsecs, nsecs(boot|tai), jiffies, elapsed, strftime, time). */
export function sourceTimeSites(source){
 const code=stripBtComments(source);
 const monotonic=(code.match(/\bnsecs\s*\(\s*monotonic\s*\)/g)??[]).length;
 const other=(code.match(/\bnsecs\b(?!\s*\(\s*monotonic\s*\))|\bjiffies\b|\belapsed\b|\bstrftime\b|\btime\s*\(/g)??[]);
 return {monotonic,other};
}

/**
 * Helper calls in bpftrace's compiled-program output. Three formats are recognised (all CONSTRUCTED here from the documented shapes, see the
 * tests, until W0 records a real dump):
 *  - LLVM IR (stages codegen/codegen-opt):  `%get_ns = call i64 inttoptr (i64 5 to i64 ()*)()`  (LLVM 18: `... to ptr)()`)
 *  - BPF disassembly (stage dis):           `  12:   85 00 00 00 05 00 00 00   call 5`
 *  - verifier log (stage verifier):         `12: (85) call bpf_ktime_get_ns#5`
 * Returns per-format counts by helper id, the named calls, and problems that make the output untrustworthy (a name that disagrees with its id).
 */
export function parseCompiledHelpers(text){
 const out={ir:{},asm:{},named:{},problems:[],namedCalls:[]},bump=(map,id)=>{map[id]=(map[id]??0)+1;};
 const body=String(text??'');
 for(const m of body.matchAll(/\bcall\b[^\n]*?\binttoptr\s*\(\s*i64\s+(\d+)\s+to\s+[^\n]*?\)\s*\(/g))bump(out.ir,Number(m[1]));
 for(const m of body.matchAll(/^[ \t]*(?:\d+:[ \t]*)?(?:[0-9a-f]{2}(?:[ \t]+[0-9a-f]{2})*[ \t]+)?call[ \t]+(0x[0-9a-f]+|\d+)[ \t]*$/gim))bump(out.asm,m[1].toLowerCase().startsWith('0x')?parseInt(m[1],16):Number(m[1]));
 for(const m of body.matchAll(/\bcall[ \t]+(bpf_[a-z0-9_]+)#(\d+)/g)){
  const name=m[1],id=Number(m[2]);out.namedCalls.push({name,id});bump(out.named,id);
  if(CLOCK_ID_BY_NAME.has(name)&&CLOCK_ID_BY_NAME.get(name)!==id)out.problems.push('helper '+name+' is listed with id '+id+', expected '+CLOCK_ID_BY_NAME.get(name));
  if(CLOCK_NAME_BY_ID.has(id)&&CLOCK_NAME_BY_ID.get(id)!==name)out.problems.push('helper id '+id+' is listed as '+name+', expected '+CLOCK_NAME_BY_ID.get(id));
  if(/^bpf_(ktime_get_|jiffies)/.test(name)&&!CLOCK_ID_BY_NAME.has(name))out.problems.push('unrecognised clock-reading helper '+name);
 }
 // any mention of a forbidden clock helper by name, in any stage
 for(const m of body.matchAll(/\bbpf_(?:ktime_get_(?:boot|coarse|tai)_ns|jiffies64)\b/g))out.problems.push('forbidden clock helper named in the compiled output: '+m[0]);
 return out;
}

const sum=map=>Object.values(map).reduce((a,b)=>a+b,0);
/**
 * W0 clock primitive step (a): pure verdict over facts the harness recorded in the same W0 window.
 *  facts: {expectedSourceSha256 (hash of the pinned .bt read by the harness), mountedSourceSha256 (sha256sum run by the same image on the mounted file),
 *          sourceText, versionOutput (stdout of `bpftrace --version`), compiled:{stdout,stderr,exitCode,timedOut}}
 * Passes only when: the source hash binds, the version is exactly 0.20.2, the source has only nsecs(monotonic) time reads, and the compiled program
 * calls bpf_ktime_get_ns at least once per source site and never any other clock helper.
 */
export function clockPrimitiveVerdict(facts,{version=BPFTRACE_VERSION}={}){
 const bad=[],hex=/^[0-9a-f]{64}$/;
 if(!hex.test(facts?.expectedSourceSha256??'')||!hex.test(facts?.mountedSourceSha256??''))bad.push('program source hash not recorded');
 else if(facts.expectedSourceSha256!==facts.mountedSourceSha256)bad.push('bpftrace container read a different program than the pinned source (sha256 '+facts.mountedSourceSha256+' vs '+facts.expectedSourceSha256+')');
 if(facts?.sourceText!==undefined&&hex.test(facts?.expectedSourceSha256??'')&&sha256Hex(Buffer.from(String(facts.sourceText)))!==facts.expectedSourceSha256)bad.push('source text analysed is not the pinned source');
 if(String(facts?.versionOutput??'').trim()!=='bpftrace v'+version)bad.push('bpftrace version is not exactly v'+version+': '+JSON.stringify(String(facts?.versionOutput??'').trim().slice(0,80)));
 const sites=sourceTimeSites(facts?.sourceText??'');
 if(sites.monotonic<1)bad.push('pinned source has no nsecs(monotonic) read');
 if(sites.other.length)bad.push('pinned source reads a clock other than nsecs(monotonic): '+sites.other.slice(0,5).join(', '));
 const compiled=facts?.compiled??{};
 if(compiled.timedOut)bad.push('compile dump did not terminate (bpftrace ran the program instead of only emitting it)');
 const text=[compiled.stdout,compiled.stderr].filter(s=>typeof s==='string'&&s.length).join('\n');
 const parsed=parseCompiledHelpers(text);
 const forbidden=[];
 for(const [form,map] of [['ir',parsed.ir],['asm',parsed.asm],['named',parsed.named]])for(const id of Object.keys(map).map(Number))if(FORBIDDEN_CLOCK_HELPERS.has(id))forbidden.push(form+':'+FORBIDDEN_CLOCK_HELPERS.get(id)+'#'+id+' x'+map[id]);
 if(forbidden.length)bad.push('compiled program reads another clock: '+forbidden.join(', '));
 for(const problem of parsed.problems)bad.push(problem);
 const monotonicCalls={ir:parsed.ir[MONOTONIC_HELPER.id]??0,asm:parsed.asm[MONOTONIC_HELPER.id]??0,named:parsed.named[MONOTONIC_HELPER.id]??0};
 if(!text.length)bad.push('compile dump is empty (the debug flag was not accepted, or the program did not compile)');
 else if(sum(parsed.ir)+sum(parsed.asm)+sum(parsed.named)===0)bad.push('compile dump contains no recognisable helper calls');
 else if(Math.max(monotonicCalls.ir,monotonicCalls.asm,monotonicCalls.named)<sites.monotonic)bad.push('compiled program has fewer bpf_ktime_get_ns calls ('+Math.max(monotonicCalls.ir,monotonicCalls.asm,monotonicCalls.named)+' in its best-represented format) than the '+sites.monotonic+' nsecs(monotonic) sites in the source');
 return {pass:bad.length===0,reasons:bad,flags:COMPILE_FLAGS,version:String(facts?.versionOutput??'').trim(),sourceSha256:facts?.mountedSourceSha256??null,expectedSourceSha256:facts?.expectedSourceSha256??null,
  sourceMonotonicSites:sites.monotonic,monotonicCalls,helperCalls:{ir:parsed.ir,asm:parsed.asm,named:parsed.named},forbidden,compiledSha256:sha256Hex(Buffer.from(text)),compiledBytes:Buffer.byteLength(text),
  claim:'every time read in the compiled program is the bpf_ktime_get_ns helper (CLOCK_MONOTONIC); proven from the program, not by observation'};
}
