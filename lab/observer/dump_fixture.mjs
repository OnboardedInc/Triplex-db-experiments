// [EXP-OBS01-R12] Why: build CONSTRUCTED compiled-program dumps in the section format lab/bin/clock-proof.mjs judges, to test the fail-closed proof before W0 records a real one.
// Nothing here is a recording of bpftrace output; the `Disassembly of section` marker and the per-instruction spellings are the proof's own convention, UNVERIFIED until W0.
// Rejected: reusing one recorded dump (none exists offline).
import {REFERENCE_FUNC_IDS} from './btf_fixture.mjs';

/** Instruction spelling of a helper call. forms: numeric `call 5`, bytes (8 raw bytes + `call 5`), named `call bpf_x#5` with the verifier-style `(85)`, name `call bpf_x`, paren `(85) call 5`. */
export function callInsn(index,id,form='bytes',name=null){
 const raw=['85','00','00','00',(id&255).toString(16).padStart(2,'0'),((id>>8)&255).toString(16).padStart(2,'0'),((id>>16)&255).toString(16).padStart(2,'0'),((id>>24)&255).toString(16).padStart(2,'0')].join(' ');
 switch(form){
  case 'numeric':return `  ${index}:\tcall ${id}`;
  case 'bytes':return `  ${index}:\t${raw}\tcall ${id}`;
  case 'named':return `  ${index}: (85) call ${name}#${id}`;
  case 'name':return `  ${index}: (85) call ${name}`;
  case 'paren':return `  ${index}: (85) call ${id}`;
  case 'bytes-only':return `  ${index}:\t${raw}`;
  default:throw new Error('callInsn: unknown form '+form);
 }
}
export const EXIT_INSN=index=>`  ${index}:\t95 00 00 00 00 00 00 00\texit`;
export const MOV_INSN=index=>`  ${index}:\tb7 01 00 00 00 00 00 00\tr1 = 0`;

/**
 * One section per probe. `sections` is a list of {name, calls:[ids], form, endsWithExit:true, extra:[lines]}; by default 15 sections named s_probe_<n>, each calling
 * bpf_ktime_get_ns (id 5) once plus a map lookup (1) and cpu id (8).
 */
export function sectionedDump({count=15,sections=null,form='bytes',ids=REFERENCE_FUNC_IDS,tail=''}={}){
 const nameById=new Map(Object.entries(ids).map(([n,i])=>[i,n]));
 const list=sections??Array.from({length:count},(_,i)=>({name:'s_probe_'+(i+1),calls:[1,5,8],form}));
 const out=[];
 for(const sec of list){
  out.push(`Disassembly of section ${sec.name}:`);
  let n=0;out.push(MOV_INSN(n++));
  for(const id of sec.calls??[])out.push(callInsn(n++,id,sec.form??form,nameById.get(id)??'bpf_unknown'));
  for(const line of sec.extra??[])out.push(line.replace('@@',String(n++)));
  if(sec.endsWithExit!==false)out.push(EXIT_INSN(n++));
  out.push('');
 }
 return out.join('\n')+tail;
}
