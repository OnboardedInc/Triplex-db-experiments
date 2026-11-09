// [EXP-OBS01-R12] Why: unit-test the BTF helper-id reader on a blob built byte by byte. CONSTRUCTED: nothing here is a recording of a kernel's BTF; the layout follows the
// documented BTF format (header, type records, string section) and the enum is shaped like `enum bpf_func_id`. The ids in REFERENCE_FUNC_IDS are the ones the
// reviewer's round 11 report lists as stable ABI knowledge; they are fixture data only and are never consulted by the clock proof (it reads the kernel's own enum).
// Rejected: a blob copied from a running kernel (not available offline).

export const REFERENCE_FUNC_IDS={
 bpf_map_lookup_elem:1,bpf_map_update_elem:2,bpf_map_delete_elem:3,bpf_probe_read:4,bpf_ktime_get_ns:5,bpf_get_smp_processor_id:8,bpf_get_current_pid_tgid:14,
 bpf_perf_event_output:25,bpf_get_current_cgroup_id:80,bpf_probe_read_kernel:113,bpf_jiffies64:118,bpf_ktime_get_boot_ns:125,bpf_ringbuf_output:130,bpf_ringbuf_reserve:131,
 bpf_ringbuf_submit:132,bpf_ringbuf_discard:133,bpf_ktime_get_coarse_ns:160,bpf_ktime_get_tai_ns:208,bpf_get_current_comm:16,bpf_timer_start:170,bpf_get_prandom_u32:7,
};

/** Builds a BTF blob. `types` is a list of {kind:'int'|'ptr'|'struct'|'enum'|'enum64'|'funcproto'|..., name, ...}; names are interned into the string section. */
export function buildBtf({types=[],hdrLen=24,magic=0xeb9f,version=1,flags=0}={}){
 const strings=[0];let strBytes=Buffer.from([0]);
 const intern=name=>{if(!name)return 0;const off=strBytes.length;strBytes=Buffer.concat([strBytes,Buffer.from(name+'\0','utf8')]);return off;};
 const parts=[];
 const u32=n=>{const b=Buffer.alloc(4);b.writeUInt32LE(n>>>0);return b;};
 const i32=n=>{const b=Buffer.alloc(4);b.writeInt32LE(n);return b;};
 const rec=(nameOff,kind,vlen,kindFlag,sizeOrType)=>Buffer.concat([u32(nameOff),u32(((kindFlag?1:0)<<31|kind<<24|vlen)>>>0),u32(sizeOrType)]);
 for(const t of types){
  const name=intern(t.name);
  switch(t.kind){
   case 'int':parts.push(rec(name,1,0,0,t.size??4),u32(0x20));break;
   case 'ptr':parts.push(rec(0,2,0,0,t.to??1));break;
   case 'array':parts.push(rec(0,3,0,0,0),Buffer.alloc(12));break;
   case 'struct':case 'union':{const members=t.members??[];parts.push(rec(name,t.kind==='struct'?4:5,members.length,0,t.size??0));for(const m of members)parts.push(u32(intern(m)),u32(1),u32(0));break;}
   case 'enum':{const values=t.values??[];parts.push(rec(name,6,values.length,t.signed,t.size??4));for(const [n,v] of values)parts.push(u32(intern(n)),t.signed?i32(v):u32(v));break;}
   case 'enum64':{const values=t.values??[];parts.push(rec(name,19,values.length,t.signed,8));for(const [n,v] of values){const big=BigInt.asUintN(64,BigInt(v));parts.push(u32(intern(n)),u32(Number(big&0xffffffffn)),u32(Number(big>>32n)));}break;}
   case 'fwd':parts.push(rec(name,7,0,0,0));break;
   case 'typedef':parts.push(rec(name,8,0,0,t.to??1));break;
   case 'funcproto':{const n=t.params??0;parts.push(rec(0,13,n,0,0));for(let i=0;i<n;i++)parts.push(u32(0),u32(1));break;}
   case 'var':parts.push(rec(name,14,0,0,1),u32(1));break;
   case 'datasec':{const n=t.vars??0;parts.push(rec(name,15,n,0,0));for(let i=0;i<n;i++)parts.push(u32(1),u32(0),u32(4));break;}
   case 'raw':parts.push(t.bytes);break;
   default:throw new Error('buildBtf: unknown fixture type '+t.kind);
  }
 }
 const typeSection=Buffer.concat(parts),header=Buffer.alloc(hdrLen);
 header.writeUInt16LE(magic,0);header[2]=version;header[3]=flags;header.writeUInt32LE(hdrLen,4);
 header.writeUInt32LE(0,8);header.writeUInt32LE(typeSection.length,12);header.writeUInt32LE(typeSection.length,16);header.writeUInt32LE(strBytes.length,20);
 return Buffer.concat([header,typeSection,strBytes]);
}

/** A kernel-like blob: some ordinary types around one `enum bpf_func_id` holding BPF_FUNC_<name> = id for every entry of `ids`. */
export function buildKernelLikeBtf({ids=REFERENCE_FUNC_IDS,kind='enum',omit=[],extra={},enumName='bpf_func_id',extraEnums=[]}={}){
 const all={...ids,...extra};for(const name of omit)delete all[name];
 const values=[['BPF_FUNC_unspec',0],...Object.entries(all).map(([n,id])=>['BPF_FUNC_'+n.slice(4),id]),['__BPF_FUNC_MAX_ID',999]];
 return buildBtf({types:[{kind:'int',name:'int'},{kind:'ptr',to:1},{kind:'struct',name:'file',members:['f_inode','f_path'],size:16},{kind:'array'},
  {kind:kind==='enum64'?'enum64':'enum',name:enumName,values},{kind:'funcproto',params:2},{kind:'typedef',name:'u64',to:1},{kind:'var',name:'x'},{kind:'datasec',name:'.data',vars:1},...extraEnums]});
}
