// [EXP-OBS01-R11] Why (R10-F3, orchestrator decision): the witness's clock primitive is proven from the PROGRAM, not by observing timestamps.
// An observed timestamp cannot tell CLOCK_MONOTONIC from CLOCK_BOOTTIME when the two are equal (no suspend yet) or closer than the transport
// delay, so W0 binds the exact .bt source hash and the bpftrace version, asks that same bpftrace for its compiled program and checks every time
// read in it. Pure functions only (no repo imports beyond btf-helpers.mjs) so they can be unit-tested without a VM.
// Rejected: passing the clock step on an observational comparison (R10-F3 showed a boot-clock substitution passing with a small offset, a zero
// offset or transport delay larger than the offset).
//
// [EXP-OBS01-R12] Why (round 11 review A1, A2, UAPI gap; orchestrator decisions 1 to 3). The proof is fail-closed by construction:
//  1. A dump is adopted only when every process behind it completed: exit status 0, no signal, no timeout, no spawn error. That holds for the compile, the
//     `--version`, the `sha256sum` and the BTF read. Partial output of a failed compile is kept as a diagnostic and never counted.
//  2. ONE compiled representation is judged: the per-probe BPF disassembly (see DUMP_STAGE_NOTE). That section must be present and complete (a start marker, only
//     instruction lines, and a final `exit` instruction for every probe, at least as many sections as the source has probes). Inside it every line that is a call in ANY
//     spelling must parse to a helper id; a call-like line that does not parse refuses (UNPARSED-CALL). Every id must be on HELPER_ALLOW_LIST; any ktime/jiffies/clock
//     helper except bpf_ktime_get_ns refuses; any other helper refuses. Calls in other stages never rescue or substitute for the section.
//  3. The helper ids come from the running kernel's own BTF enum (btf-helpers.mjs), never from this file. FORBIDDEN_CLOCK_HELPERS below is a reference table of the
//     expected ABI values for tests and the informational note; the verdict never consults it.
// Rejected: counting recognised monotonic calls across all stages (a lower bound; an unrecognised call format can hide beside them); ids from memory or a header copy.
//
// [EXP-OBS01-R13] Why (pending ruling Q109a, orchestrator decision after the round 12 review R12-F1..F3): THREAT MODEL. The dump is produced by the lab-trusted witness
// image (pinned Ubuntu bpftrace 0.20.2) from the lab-pinned .bt source; no candidate can write or shape it, so the proof does not have to survive adversarially constructed
// dumps. The W0 clock step therefore GATES on exactly three things:
//  (1) a static source check: every time read in the pinned .bt is nsecs(monotonic); no bare nsecs, nsecs(boot|tai), elapsed, jiffies, strftime, time() or other clock
//      builtin (sourceTimeSites);
//  (2) the pinned .bt hash computed by the image, the exact bpftrace version 0.20.2, and clean exit statuses of all four processes (A1, kept);
//  (3) the compiled dump recorded in full with its hash, run through a strictness-only scan: any forbidden clock helper NAME token anywhere in it refuses (FORBIDDEN_CLOCK_TOKENS).
// The structured parser of round 12 (sections, allow-list, UNPARSED-CALL, helper ids from the kernel BTF, the per-site count) is KEPT and recorded as `diagnostic`, not gating,
// until a real dump from W0 is stored as a golden file and reviewed; a later round may then make it gating against that golden. Known diagnostic gaps (R12-F2): a proper prefix
// ending at an early `exit` is not detected as truncated, and a numeric helper call without a name token is only visible to the diagnostic.
// Rejected: keeping the structured parser as the gate (each round of review found another constructed dump it mishandled, and none of them can be produced by a candidate);
// dropping it (its output is the evidence a reviewer needs to promote it later).
import {createHash} from 'node:crypto';
import {deriveHelperIds} from './btf-helpers.mjs';

export const BPFTRACE_VERSION='0.20.2';
/** The ONE flag set W0 relies on to make bpftrace emit its compiled program. R49 does not document bpftrace's debug options and no bpftrace or
 * network is available offline, so this is from the builder's knowledge of the 0.20 series, UNVERIFIED against the 0.20.2 man page: `-d STAGE`
 * (stages all, ast, codegen, codegen-opt, dis, libbpf, verifier), which compiles and prints each stage without running the program. If 0.20.2
 * rejects it, the process exits nonzero or the dump is empty and W0 refuses (fail closed); the first W0 run records the real output and settles it. */
export const COMPILE_FLAGS=['-d','all'];
/** Positional arguments for the dump: placeholders. They change only constants in the compiled program, never which helpers it calls. */
export const COMPILE_PLACEHOLDER_ARGS=['1','2','3','4'];

/** Reference ABI values (helper name -> id) the reviewer's round 11 report lists. TESTS AND AN INFORMATIONAL NOTE ONLY: the verdict reads the ids from the kernel BTF. */
export const REFERENCE_CLOCK_IDS=new Map([[5,'bpf_ktime_get_ns'],[118,'bpf_jiffies64'],[125,'bpf_ktime_get_boot_ns'],[160,'bpf_ktime_get_coarse_ns'],[208,'bpf_ktime_get_tai_ns']]);
export const FORBIDDEN_CLOCK_HELPERS=new Map([...REFERENCE_CLOCK_IDS].filter(([,name])=>name!=='bpf_ktime_get_ns'));
export const MONOTONIC_HELPER={name:'bpf_ktime_get_ns'};
/** The clock helpers W0 must find in the kernel enum (a missing name refuses W0). */
export const CLOCK_HELPER_NAMES=[...REFERENCE_CLOCK_IDS.values()];

/**
 * The helpers the pinned program legitimately uses, derived from lab/observer/vm_syncwitness.bt construct by construct (checked against the source by sourceHelperNeeds):
 *   nsecs(monotonic)                      bpf_ktime_get_ns
 *   @m[k], @m[k] = v, @n[cpu]++           bpf_map_lookup_elem, bpf_map_update_elem
 *   delete(@m[k])                         bpf_map_delete_elem
 *   cpu / tid / cgroup                    bpf_get_smp_processor_id / bpf_get_current_pid_tgid / bpf_get_current_cgroup_id
 *   printf(...)                           bpf_perf_event_output (perf buffer, BPFTRACE_PERF_RB_PAGES) or the bpf_ringbuf_* family when bpftrace picks the ring buffer
 *   $file->f_inode, args->iocb->ki_filp   bpf_probe_read_kernel (bpf_probe_read in the older spelling)
 * BEGIN/END triggers and map clearing run in user space and use no extra helper. Which of the alternatives bpftrace 0.20.2 really emits is an UNVERIFIED first-W0
 * observation; an unused entry cannot read a clock, a missing one makes W0 refuse and the report names it.
 */
export const HELPER_ALLOW_LIST=[
 {name:'bpf_ktime_get_ns',why:'nsecs(monotonic)'},
 {name:'bpf_map_lookup_elem',why:'@m[k] reads, @n[cpu]++'},{name:'bpf_map_update_elem',why:'@m[k] = v, @n[cpu]++'},{name:'bpf_map_delete_elem',why:'delete(@m[k])'},
 {name:'bpf_get_smp_processor_id',why:'cpu'},{name:'bpf_get_current_pid_tgid',why:'tid'},{name:'bpf_get_current_cgroup_id',why:'cgroup'},
 {name:'bpf_perf_event_output',why:'printf over the perf buffer'},
 {name:'bpf_ringbuf_output',why:'printf over the ring buffer'},{name:'bpf_ringbuf_reserve',why:'printf over the ring buffer'},{name:'bpf_ringbuf_submit',why:'printf over the ring buffer'},{name:'bpf_ringbuf_discard',why:'printf over the ring buffer'},
 {name:'bpf_probe_read_kernel',why:'kernel struct field chains'},{name:'bpf_probe_read',why:'kernel struct field chains (older spelling)'},
];
export const ALLOWED_HELPER_NAMES=HELPER_ALLOW_LIST.map(h=>h.name);
/** Every helper name W0 must resolve from the kernel enum. */
export const REQUIRED_HELPER_NAMES=[...new Set([...CLOCK_HELPER_NAMES,...ALLOWED_HELPER_NAMES])];

/** What the dump stage is and why (R12 decision 2). Marker spellings below are CONSTRUCTED from bpftrace's documented stage names, UNVERIFIED until W0 records a real dump. */
export const DUMP_STAGE_NOTE='dis: the per-probe BPF bytecode disassembly, the last form bpftrace produces for the program it loads. The LLVM IR stages come before the optimiser and the BPF backend; the verifier log is kernel output that exists only after a load and is cut at the log buffer size.';
const SECTION_START=/^[ \t]*Disassembly of section[ \t]+([^\s:]+)[ \t]*:?[ \t]*$/i;
const INSN_LINE=/^[ \t]*(\d+):[ \t]*(.*)$/;
const RAW_BYTES=/^((?:[0-9a-f]{2}[ \t]+){7}[0-9a-f]{2})(?=[ \t]|$)[ \t]*/i;

export const sha256Hex=data=>createHash('sha256').update(data).digest('hex');

/** Gate (3): clock helper NAME tokens that must not occur anywhere in the compiled dump. Matching is a case-insensitive substring match, deliberately stricter than a word match. */
export const FORBIDDEN_CLOCK_TOKENS=['bpf_ktime_get_boot_ns','ktime_get_boot','bpf_ktime_get_coarse_ns','bpf_ktime_get_tai_ns','bpf_jiffies64',
 'BPF_FUNC_ktime_get_boot_ns','BPF_FUNC_ktime_get_coarse_ns','BPF_FUNC_ktime_get_tai_ns','BPF_FUNC_jiffies64'];
/** Every occurrence of a forbidden token: [{token,line}] (1-based line), in text order. */
export function forbiddenClockTokens(text){
 const hits=[];
 String(text??'').split(/\r?\n/).forEach((line,k)=>{
  const lower=line.toLowerCase();
  for(const token of FORBIDDEN_CLOCK_TOKENS)if(lower.includes(token.toLowerCase()))hits.push({token,line:k+1});
 });
 return hits;
}

// [EXP-OBS01-R14] Why (R13-F1): comments and string literals are lexed together. The round 13 regexes removed `/* ... */` and `//` text without knowing whether the delimiter sat inside a string,
// so `printf("https://clock"); @x = nsecs(boot);` and `printf("/*"); @x = nsecs(boot); printf("*/");` hid a real time read from the source check. This lexer walks the text once and tracks
// string literals (with backslash escapes), char literals and both comment forms; only a real comment is removed and string contents are blanked to "". It is fail closed: an unterminated string
// (a newline or end of text before the closing quote), char literal or block comment is reported in `errors`, and sourceTimeSites turns each into a refusal. A `#` line (the `#!` line, preprocessor lines) is
// dropped only where a line starts outside any string or comment. Rejected: refusing every `//` or `/*` inside a string (simpler, but it would reject a harmless URL in a printf); keeping the regexes.
/** Returns {code, errors}: the source without comments, string and char literal contents emptied (`""`, `''`), newlines kept. */
export function lexBt(source){
 const t=String(source),out=[],errors=[];let i=0,line=1,atLineStart=true;
 while(i<t.length){
  const c=t[i],n=t[i+1];
  if(c==='\n'){out.push(c);i+=1;line+=1;atLineStart=true;continue;}
  if(atLineStart&&c==='#'){while(i<t.length&&t[i]!=='\n')i+=1;continue;}
  if(c===' '||c==='\t'||c==='\r'){out.push(c);i+=1;continue;}
  atLineStart=false;
  if(c==='/'&&n==='/'){while(i<t.length&&t[i]!=='\n')i+=1;continue;}
  if(c==='/'&&n==='*'){
   const start=line;i+=2;let closed=false;
   while(i<t.length){if(t[i]==='*'&&t[i+1]==='/'){i+=2;closed=true;break;}if(t[i]==='\n'){out.push('\n');line+=1;atLineStart=true;}i+=1;}
   if(!closed)errors.push('unterminated block comment starting at line '+start);
   else out.push(' ');
   continue;
  }
  if(c==='"'||c==="'"){
   const start=line;i+=1;let closed=false;
   while(i<t.length&&t[i]!=='\n'){if(t[i]==='\\'){i+=2;continue;}if(t[i]===c){i+=1;closed=true;break;}i+=1;}
   if(!closed)errors.push('unterminated '+(c==='"'?'string':'character')+' literal starting at line '+start);
   out.push(c+c);continue;
  }
  out.push(c);i+=1;
 }
 return {code:out.join(''),errors};
}

/** Time reads in the .bt source: nsecs(monotonic) sites, and anything else that reads a clock (bare nsecs, nsecs(boot|tai), jiffies, elapsed, strftime, time). */
export function sourceTimeSites(source){
 const {code,errors}=lexBt(source);
 const monotonic=(code.match(/\bnsecs\s*\(\s*monotonic\s*\)/g)??[]).length;
 const other=(code.match(/\bnsecs\b(?!\s*\(\s*monotonic\s*\))|\bnsecs_\w+|\bjiffies\w*|\belapsed\b|\bstrftime\b|\btime\s*\(|\bktime\w*|\buptime\b/g)??[]);
 other.push(...errors);   // [EXP-OBS01-R14] a source this lexer cannot read to the end is refused, never partly checked
 return {monotonic,other};
}

/** Probe headers of the .bt source (text before each top-level `{`). A comma list of attach points refuses: this reader does not map one block to several programs. */
export function sourceProbes(source){
 const code=lexBt(source).code,probes=[];let depth=0,head='';
 for(const ch of code){
  if(ch==='{'){if(depth===0)probes.push(head.trim());depth+=1;head='';continue;}
  if(ch==='}'){depth-=1;continue;}
  if(depth===0)head+=ch;
 }
 return probes.filter(Boolean);
}

/** Helpers the source can need, from its constructs; `unmodeled` lists constructs that would call a helper this derivation does not model (the proof then refuses). */
export function sourceHelperNeeds(source){
 const code=lexBt(source).code,needs=new Set();
 if(/\bnsecs\s*\(\s*monotonic\s*\)/.test(code))needs.add('bpf_ktime_get_ns');
 if(/@\w+\s*\[/.test(code)||/@\w+\s*(?:=|\+\+)/.test(code)){needs.add('bpf_map_lookup_elem');needs.add('bpf_map_update_elem');}
 if(/\bdelete\s*\(/.test(code))needs.add('bpf_map_delete_elem');
 if(/(?<![\w@$.>])cpu\b/.test(code))needs.add('bpf_get_smp_processor_id');
 if(/(?<![\w@$.>])tid\b/.test(code))needs.add('bpf_get_current_pid_tgid');
 if(/(?<![\w@$.>])cgroup\b/.test(code))needs.add('bpf_get_current_cgroup_id');
 if(/\bprintf\s*\(/.test(code))for(const n of ['bpf_perf_event_output','bpf_ringbuf_output','bpf_ringbuf_reserve','bpf_ringbuf_submit','bpf_ringbuf_discard'])needs.add(n);
 if(/->/.test(code)){needs.add('bpf_probe_read_kernel');needs.add('bpf_probe_read');}
 const banned=new Set(['comm','pid','uid','gid','username','ustack','kstack','curtask','rand','elapsed','str','strncmp','strcontains','ntop','kaddr','uaddr','usym','ksym','join','system','signal','override','cat','time','strftime','hist','lhist','stats','count','sum','avg','min','max','cpid','ppid','numaid','usermode','kretval','func','probe','ctx','buf','macaddr','pton','path','print','bswap','reg','percpu_kaddr','skboutput','socket','jiffies','nsecs_boot']);
 const unmodeled=[...code.matchAll(/(?<![\w@$.>-])([A-Za-z_]\w*)\b(?!\s*->)/g)].map(m=>m[1]).filter(w=>banned.has(w)||/^(?:arg|sarg)\d+$/.test(w));
 for(const m of code.matchAll(/\bnsecs\b(?!\s*\(\s*monotonic\s*\))/g))unmodeled.push(m[0]);
 return {needs:[...needs].sort(),unmodeled:[...new Set(unmodeled)]};
}

const countCallWords=s=>(s.match(/\bcall\b|\bcallx?\w*/gi)??[]).length;
function splitInsn(line){
 const idx=INSN_LINE.exec(line);let rest=idx[2],raw=null,op=null;
 const rm=RAW_BYTES.exec(rest);if(rm){raw=rm[1].split(/\s+/).map(h=>parseInt(h,16));rest=rest.slice(rm[0].length);}
 const om=/^\(([0-9a-f]{2})\)[ \t]*/i.exec(rest);if(om){op=parseInt(om[1],16);rest=rest.slice(om[0].length);}
 return {index:Number(idx[1]),rest:rest.trim(),raw,op};
}
const callLikeText=s=>/call/i.test(s)||/\bbpf_[a-z0-9_]+/i.test(s);
/** A line that could be a call in any spelling. */
export function callLike(line){
 const s=INSN_LINE.test(line)?splitInsn(line):{rest:line,raw:null,op:null};
 return callLikeText(s.rest)||callLikeText(line)||s.op===0x85||s.op===0x8d||(s.raw!==null&&(s.raw[0]===0x85||s.raw[0]===0x8d));
}
/**
 * Parses ONE line that is a call in a recognised spelling into {id?,name?,via}. Returns null when the line is not a call, or {unparsed:reason} when it is call-like but does not parse
 * to exactly one helper. Spellings: `call bpf_x#5`, `call bpf_x`, `call 5`, `call 0x7d`, `85 00 00 00 05 00 00 00 call 5`, `85 00 00 00 05 00 00 00` alone, `(85) call 125`,
 * and LLVM `call i64 inttoptr (i64 5 to i64 ()*)()`. The `(8d)`/`callx` forms and pseudo calls (`call pc+N`, bytes with src_reg != 0) are unparsed: no static id.
 */
export function parseCallLine(line){
 const insn=INSN_LINE.test(line),s=insn?splitInsn(line):{rest:line.trim(),raw:null,op:null};
 if(!callLike(line))return null;
 if(s.op===0x8d||(s.raw&&s.raw[0]===0x8d)||/\bcallx\b/i.test(s.rest))return {unparsed:'indirect call (callx)'};
 if(countCallWords(s.rest)>1)return {unparsed:'more than one call token on a line'};
 const found=[];
 let m;
 if((m=/\bcall[ \t]+(bpf_[a-z0-9_]+)#(\d+)\b/i.exec(s.rest)))found.push({via:'named',name:m[1],id:Number(m[2])});
 else if((m=/\bcall[ \t]+(bpf_[a-z0-9_]+)[ \t]*(?:\(\))?[ \t]*(?:[;#].*)?$/i.exec(s.rest)))found.push({via:'name',name:m[1]});
 else if((m=/\bcall[ \t]+(0x[0-9a-f]+|\d+)[ \t]*(?:[;#].*)?$/i.exec(s.rest)))found.push({via:'numeric',id:m[1].toLowerCase().startsWith('0x')?parseInt(m[1],16):Number(m[1])});
 else if((m=/\bcall\b[^\n]*?\binttoptr\s*\(\s*i64\s+(\d+)\s+to\s+[^\n]*?\)\s*\(/.exec(s.rest)))found.push({via:'ir',id:Number(m[1])});
 if(s.raw&&s.raw[0]===0x85){
  if((s.raw[1]>>4)!==0)return {unparsed:'call with src_reg != 0 (not a helper call)'};
  found.push({via:'bytes',id:(s.raw[4]|s.raw[5]<<8|s.raw[6]<<16|s.raw[7]<<24)>>>0});
 }
 else if(s.raw&&found.length)return {unparsed:'the mnemonic is a call but the instruction bytes are not a call opcode'};
 if(!found.length)return {unparsed:'call-like line with no recognised helper form'};
 const withId=found.filter(f=>f.id!==undefined);
 if(new Set(withId.map(f=>f.id)).size>1)return {unparsed:'the spellings on one line name different helper ids'};
 const named=found.find(f=>f.name);
 return {via:found.map(f=>f.via).join('+'),id:withId[0]?.id,name:named?.name};
}

/**
 * Whole-text scan, kept as the SECONDARY check (forbidden clocks anywhere, in any stage) and for the unit tests of the spellings. Returns per-format counts by helper id,
 * named calls, and problems. `ids` is {name:id} from the kernel enum; without it only the by-name rules that need no id apply.
 */
export function parseCompiledHelpers(text,ids=null){
 const out={ir:{},asm:{},named:{},problems:[],namedCalls:[]},bump=(map,id)=>{map[id]=(map[id]??0)+1;};
 const body=String(text??''),idByName=new Map(Object.entries(ids??{})),nameById=new Map(Object.entries(ids??{}).map(([n,i])=>[i,n]));
 for(const m of body.matchAll(/\bcall\b[^\n]*?\binttoptr\s*\(\s*i64\s+(\d+)\s+to\s+[^\n]*?\)\s*\(/g))bump(out.ir,Number(m[1]));
 for(const m of body.matchAll(/^[ \t]*(?:\d+:[ \t]*)?(?:[0-9a-f]{2}(?:[ \t]+[0-9a-f]{2})*[ \t]+)?(?:\([0-9a-f]{2}\)[ \t]+)?call[ \t]+(0x[0-9a-f]+|\d+)[ \t]*$/gim))bump(out.asm,m[1].toLowerCase().startsWith('0x')?parseInt(m[1],16):Number(m[1]));
 for(const m of body.matchAll(/\bcall[ \t]+(bpf_[a-z0-9_]+)#(\d+)/g)){
  const name=m[1],id=Number(m[2]);out.namedCalls.push({name,id});bump(out.named,id);
  if(idByName.has(name)&&idByName.get(name)!==id)out.problems.push('helper '+name+' is listed with id '+id+', expected '+idByName.get(name));
  if(nameById.has(id)&&nameById.get(id)!==name)out.problems.push('helper id '+id+' is listed as '+name+', expected '+nameById.get(id));
  if(/^bpf_(ktime_get_|jiffies)/.test(name)&&!isClockName(name))out.problems.push('unrecognised clock-reading helper '+name);
 }
 return out;
}
const CLOCK_WORD=/(?:^|_)(?:ktime|jiffies\d*|time|clock|tai|boot|coarse)(?:_|$)/;
const isClockName=name=>CLOCK_HELPER_NAMES.includes(name)||CLOCK_WORD.test(name.replace(/^bpf_/,''));

/** Splits the dump into per-probe sections of the chosen representation (see DUMP_STAGE_NOTE). */
export function extractSections(text){
 const lines=String(text??'').split(/\r?\n/),sections=[],problems=[];
 for(let i=0;i<lines.length;i++){
  const start=SECTION_START.exec(lines[i]);if(!start)continue;
  const sec={name:start[1],startLine:i+1,instructions:[],endedBy:'eof',complete:false};
  let j=i+1,blank=false;
  for(;j<lines.length;j++){
   const l=lines[j];
   if(SECTION_START.test(l)){sec.endedBy='next-section';break;}
   if(/^\s*$/.test(l)){blank=true;continue;}
   if(INSN_LINE.test(l)){sec.instructions.push({line:j+1,text:l});blank=false;continue;}
   if(!blank&&callLike(l))problems.push('UNPARSED-CALL in section '+sec.name+' line '+(j+1)+': call-like line that is not an instruction line: '+l.trim().slice(0,80));
   sec.endedBy='stage-end';break;
  }
  const last=sec.instructions.at(-1);
  sec.complete=Boolean(last)&&isExit(last.text);
  sections.push(sec);i=j-1;
 }
 return {sections,problems};
}
// [EXP-OBS01-R13] Why (R12-F2, diagnostic only): raw instruction bytes, when present, decide; a textual `exit` over bytes that are a call is not an exit. Rejected: trusting the mnemonic alone.
function isExit(line){const s=splitInsn(line);if(s.raw!==null)return s.raw[0]===0x95;return /^exit$/i.test(s.rest)||(s.op===0x95&&s.rest==='');}

const sum=map=>Object.values(map).reduce((a,b)=>a+b,0);
function runFailure(run,label,{compile=false}={}){
 if(run===undefined||run===null||typeof run!=='object')return label+' status was not recorded';
 if(run.timedOut===true)return compile?'compile dump did not terminate (bpftrace ran the program instead of only emitting it)':label+' timed out';
 if(run.timedOut!==false)return label+' timeout status was not recorded';
 if(run.error!==undefined&&run.error!==null&&run.error!==false)return label+' failed to run: '+String(run.error).slice(0,120);
 if(run.signal!==undefined&&run.signal!==null&&run.signal!=='')return label+' was killed by signal '+run.signal;
 if(!Number.isInteger(run.exitCode))return label+' exit status is missing';
 if(run.exitCode!==0)return label+' exited with status '+run.exitCode;
 return null;
}

/**
 * W0 clock primitive step (a): pure verdict over facts the harness recorded in the same W0 window.
 *  facts: {expectedSourceSha256 (hash of the pinned .bt read by the harness), mountedSourceSha256 (sha256sum run by the same image on the mounted file),
 *          sourceText, versionOutput (stdout of `bpftrace --version`),
 *          versionRun, hashRun, btf, compiled: each {exitCode,signal,timedOut,error}; btf also {bytes} (the raw /sys/kernel/btf/vmlinux), compiled also {stdout,stderr}}
 * [EXP-OBS01-R13] GATES (`pass`, `reasons`) only on: the source hash binding, the static source check (only nsecs(monotonic) time reads), the exact bpftrace version, the clean
 * completion of all four processes, a non-empty compiled dump, and the absence of every forbidden clock helper NAME token from that dump. The structured parser's findings
 * (sections, allow-list, UNPARSED-CALL, kernel-BTF helper ids, per-site count) are in `diagnostic` and never change `pass`. Pending ruling Q109a.
 */
export function clockPrimitiveVerdict(facts,{version=BPFTRACE_VERSION}={}){
 const bad=[],diag=[],hex=/^[0-9a-f]{64}$/;
 // ---- gate (2): the program hash computed by the image, the version, and clean process statuses ----
 if(!hex.test(facts?.expectedSourceSha256??'')||!hex.test(facts?.mountedSourceSha256??''))bad.push('program source hash not recorded');
 else if(facts.expectedSourceSha256!==facts.mountedSourceSha256)bad.push('bpftrace container read a different program than the pinned source (sha256 '+facts.mountedSourceSha256+' vs '+facts.expectedSourceSha256+')');
 if(facts?.sourceText!==undefined&&hex.test(facts?.expectedSourceSha256??'')&&sha256Hex(Buffer.from(String(facts.sourceText)))!==facts.expectedSourceSha256)bad.push('source text analysed is not the pinned source');
 const failures={version:runFailure(facts?.versionRun,'bpftrace --version'),hash:runFailure(facts?.hashRun,'sha256sum of the program'),btf:runFailure(facts?.btf,'kernel BTF read'),compile:runFailure(facts?.compiled,'compile dump',{compile:true})};
 for(const reason of Object.values(failures))if(reason)bad.push(reason);
 if(String(facts?.versionOutput??'').trim()!=='bpftrace v'+version)bad.push('bpftrace version is not exactly v'+version+': '+JSON.stringify(String(facts?.versionOutput??'').trim().slice(0,80)));
 // ---- gate (1): static source check ----
 const sites=sourceTimeSites(facts?.sourceText??''),probes=sourceProbes(facts?.sourceText??''),needs=sourceHelperNeeds(facts?.sourceText??'');
 if(sites.monotonic<1)bad.push('pinned source has no nsecs(monotonic) read');
 if(sites.other.length)bad.push('pinned source reads a clock other than nsecs(monotonic) (or cannot be lexed): '+sites.other.slice(0,5).join(', '));
 // ---- gate (3): the dump, recorded in full with its hash, scanned for forbidden clock helper name tokens ----
 const compiled=facts?.compiled??{};
 const text=[compiled.stdout,compiled.stderr].filter(s=>typeof s==='string'&&s.length).join('\n');
 const tokens=forbiddenClockTokens(text);
 if(!text.length&&!failures.compile)bad.push('compile dump is empty (the debug flag was not accepted, or the program did not compile)');
 if(tokens.length)bad.push('compiled dump names a forbidden clock helper: '+[...new Set(tokens.map(t=>t.token))].join(', ')+' (first at dump line '+tokens[0].line+')');

 // ---- DIAGNOSTIC: the round 12 structured parser; never gating ----
 if(!probes.length)diag.push('pinned source has no probe blocks');
 if(probes.some(p=>p.includes(',')))diag.push('pinned source has a comma list of attach points (not supported by the section check)');
 if(needs.unmodeled.length)diag.push('pinned source uses a construct outside the allow-list derivation: '+needs.unmodeled.slice(0,5).join(', '));
 const notAllowed=needs.needs.filter(n=>!ALLOWED_HELPER_NAMES.includes(n));
 if(notAllowed.length)diag.push('pinned source needs a helper that is not on the allow-list: '+notAllowed.join(', '));
 const derived=deriveHelperIds(facts?.btf?.bytes,REQUIRED_HELPER_NAMES);
 if(!failures.btf)for(const reason of derived.reasons)diag.push(reason);
 const ids=derived.ok&&!failures.btf?derived.ids:null,nameById=new Map(ids?Object.entries(ids).map(([n,i])=>[i,n]):[]);
 const result={sections:[],calls:{},forbidden:[],unparsed:[],monotonicCalls:0};
 // the structured parse is adopted only from a run where all four processes completed (A1) and only with ids from the kernel; otherwise it is not attempted
 const adopt=Object.values(failures).every(f=>!f)&&ids!==null&&text.length>0;
 if(adopt){
  const {sections,problems:sectionProblems}=extractSections(text);
  for(const p of sectionProblems)diag.push(p);
  if(!sections.length)diag.push('compiled program section not found: no "Disassembly of section" start marker in the dump');
  else if(sections.length<probes.length)diag.push('compiled program has '+sections.length+' probe sections, the source has '+probes.length+' probes');
  const names=new Set();
  for(const sec of sections){
   const row={name:sec.name,instructions:sec.instructions.length,complete:sec.complete,calls:{}};result.sections.push(row);
   if(names.has(sec.name))diag.push('probe section '+sec.name+' appears twice');names.add(sec.name);
   if(!sec.instructions.length)diag.push('probe section '+sec.name+' has no instructions');
   else if(!sec.complete)diag.push('probe section '+sec.name+' is incomplete: it does not end with an exit instruction (ended by '+sec.endedBy+')');
   for(const insn of sec.instructions){
    if(!callLike(insn.text))continue;
    const call=parseCallLine(insn.text);
    if(call===null)continue;
    if(call.unparsed){result.unparsed.push({section:sec.name,line:insn.line,text:insn.text.trim().slice(0,120),reason:call.unparsed});diag.push('UNPARSED-CALL in section '+sec.name+' line '+insn.line+': '+call.unparsed+': '+insn.text.trim().slice(0,80));continue;}
    const id=call.id??ids[call.name];
    if(id===undefined||id===null){diag.push('helper '+call.name+' (section '+sec.name+' line '+insn.line+') has no id in the kernel enum');continue;}
    const name=nameById.get(id);
    if(name===undefined){diag.push('helper id '+id+' (section '+sec.name+' line '+insn.line+') is not in the kernel bpf_func_id enum');continue;}
    if(call.name&&call.name!==name)diag.push('helper '+call.name+' is listed with id '+id+', the kernel enum says '+name);
    row.calls[name]=(row.calls[name]??0)+1;result.calls[name]=(result.calls[name]??0)+1;
    if(name!==MONOTONIC_HELPER.name&&isClockName(name)){result.forbidden.push(name+'#'+id+' x1 (section '+sec.name+')');}
    else if(!ALLOWED_HELPER_NAMES.includes(name))diag.push('helper '+name+'#'+id+' (section '+sec.name+' line '+insn.line+') is not on the allow-list');
   }
  }
  result.monotonicCalls=result.calls[MONOTONIC_HELPER.name]??0;
  // outside the chosen section, any stage: a clock helper by id, and (R12-F1) any call-like line that does not parse
  const clockIds=new Map([...nameById].filter(([,n])=>n!==MONOTONIC_HELPER.name&&isClockName(n))),inSection=new Set(sections.flatMap(sec=>sec.instructions.map(i=>i.line)));
  text.split(/\r?\n/).forEach((line,k)=>{
   if(inSection.has(k+1))return;
   const call=parseCallLine(line);if(!call)return;
   if(call.unparsed){if(!SECTION_START.test(line))diag.push('UNPARSED-CALL outside a chosen section at dump line '+(k+1)+': '+call.unparsed+': '+line.trim().slice(0,80));return;}
   const id=call.id??ids[call.name];if(clockIds.has(id))result.forbidden.push(clockIds.get(id)+'#'+id+' x1 (outside the chosen section, line '+(k+1)+')');
  });
  for(const m of text.matchAll(/\bbpf_[a-z0-9_]+\b/g))if(m[0]!==MONOTONIC_HELPER.name&&isClockName(m[0]))diag.push('clock helper named in the compiled output: '+m[0]);
  const parsedLoose=parseCompiledHelpers(text,ids);for(const p of parsedLoose.problems)diag.push(p);
  if(result.forbidden.length)diag.push('compiled program reads another clock: '+[...new Set(result.forbidden)].join(', '));
  // secondary sanity check only: completeness never comes from this count
  if(sections.length&&result.monotonicCalls<sites.monotonic)diag.push('compiled program has fewer bpf_ktime_get_ns calls ('+result.monotonicCalls+') than the '+sites.monotonic+' nsecs(monotonic) sites in the source');
 }
 else diag.push('structured parse not attempted: '+(Object.values(failures).some(Boolean)?'a process did not complete':ids===null?'no helper ids from the kernel BTF':'the dump is empty'));
 if(ids!==null){const note=[];for(const [id,name] of REFERENCE_CLOCK_IDS)if(ids[name]!==id)note.push(name+': kernel '+ids[name]+', reference '+id);result.referenceNote=note;}
 const claim='the pinned source reads time only with nsecs(monotonic) (CLOCK_MONOTONIC) and the compiled dump, from the lab-trusted image, names no other clock helper; the structured parse of the dump is diagnostic until a golden dump is reviewed (Q109a)';
 return {pass:bad.length===0,reasons:bad,gate:{checks:['source hash binding','static source check: only nsecs(monotonic)','bpftrace version exactly v'+version,'all four processes exit 0 cleanly','non-empty compiled dump','no forbidden clock helper name token in the dump'],
   forbiddenTokens:FORBIDDEN_CLOCK_TOKENS,forbiddenTokenHits:tokens},
  diagnostic:{role:'DIAGNOSTIC, not gating (Q109a): becomes gating only against a reviewed golden dump from a real W0',pass:diag.length===0,reasons:diag,adopted:adopt},
  flags:COMPILE_FLAGS,version:String(facts?.versionOutput??'').trim(),sourceSha256:facts?.mountedSourceSha256??null,expectedSourceSha256:facts?.expectedSourceSha256??null,
  representation:DUMP_STAGE_NOTE,processes:Object.fromEntries(Object.entries(failures).map(([k,v])=>[k,v?{ok:false,reason:v}:{ok:true}])),
  sourceMonotonicSites:sites.monotonic,sourceProbes:probes.length,sourceHelperNeeds:needs.needs,allowList:ALLOWED_HELPER_NAMES,
  helperIds:ids?Object.fromEntries(REQUIRED_HELPER_NAMES.map(n=>[n,ids[n]])):null,btfSha256:derived.btfSha256,btfBytes:derived.btfBytes,btfEnum:derived.enumKind,referenceNote:result.referenceNote??null,
  sections:result.sections,monotonicCalls:result.monotonicCalls,helperCalls:result.calls,forbidden:[...new Set(result.forbidden)],unparsedCalls:result.unparsed,
  compiledSha256:sha256Hex(Buffer.from(text)),compiledBytes:Buffer.byteLength(text),claim};
}
