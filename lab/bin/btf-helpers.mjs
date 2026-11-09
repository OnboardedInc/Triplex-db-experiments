// [EXP-OBS01-R12] Why (UAPI gap, orchestrator decision 3): W0 must not rely on BPF helper ids remembered from linux/bpf.h or on a downloaded header. The running
// kernel states its own helper ids in /sys/kernel/btf/vmlinux as the enum `bpf_func_id` (enumerators BPF_FUNC_<name>). This is a small STRICT BTF reader: it
// checks the header, the string section and every type record, and extracts that one enum. Anything it does not understand refuses (never skips).
// Pure functions (no repo imports) so they are unit-tested on a blob built byte by byte (lab/observer/btf_fixture.mjs, labeled constructed).
// Rejected: a header copy or ids from memory (not primary, not checkable offline); bpftool or pahole in the image (new packages, new trust); a lenient parser that skips
// unknown kinds (it could skip the very enum that matters and still report success).
import {createHash} from 'node:crypto';

export const BTF_MAGIC=0xeb9f,BTF_VERSION=1,BTF_HEADER_MIN=24,BTF_INFO_MASK=0x9f00ffff;
export const BTF_KIND={INT:1,PTR:2,ARRAY:3,STRUCT:4,UNION:5,ENUM:6,FWD:7,TYPEDEF:8,VOLATILE:9,CONST:10,RESTRICT:11,FUNC:12,FUNC_PROTO:13,VAR:14,DATASEC:15,FLOAT:16,DECL_TAG:17,TYPE_TAG:18,ENUM64:19};
export const FUNC_ID_ENUM='bpf_func_id',FUNC_PREFIX='BPF_FUNC_';

export class BtfError extends Error{constructor(message){super(message);this.name='BtfError';}}
const need=(cond,message)=>{if(!cond)throw new BtfError(message);};

/**
 * Parses little-endian BTF and returns every ENUM and ENUM64 type: [{typeId,name,kind,size,signed,values:[{name,value:bigint}]}].
 * Throws BtfError on: short input, wrong magic (a byte-swapped magic is reported as unsupported endianness), wrong version, a header or section that does not fit
 * the blob, a type section that is not consumed exactly, an unknown kind, a record that overruns its section, a string section that does not start and end with NUL,
 * or a name offset outside the string section.
 */
export function parseBtfEnums(bytes){
 need(Buffer.isBuffer(bytes)||bytes instanceof Uint8Array,'BTF input is not a byte buffer');
 const buf=Buffer.isBuffer(bytes)?bytes:Buffer.from(bytes);
 need(buf.length>=BTF_HEADER_MIN,'BTF blob shorter than its header ('+buf.length+' bytes)');
 const magic=buf.readUInt16LE(0);
 need(magic===BTF_MAGIC,magic===0x9feb?'BTF magic is byte-swapped (big-endian BTF is not supported)':'BTF magic is 0x'+magic.toString(16)+', expected 0xeb9f');
 need(buf[2]===BTF_VERSION,'BTF version '+buf[2]+', expected '+BTF_VERSION);
 need(buf[3]===0,'BTF header flags are 0x'+buf[3].toString(16)+', expected 0 (reserved)');   // [EXP-OBS01-R13] Why (R12-F3): reserved flags are not understood, so not accepted. Rejected: ignoring them.
 const hdrLen=buf.readUInt32LE(4),typeOff=buf.readUInt32LE(8),typeLen=buf.readUInt32LE(12),strOff=buf.readUInt32LE(16),strLen=buf.readUInt32LE(20);
 need(hdrLen>=BTF_HEADER_MIN&&hdrLen<=buf.length,'BTF header length '+hdrLen+' is outside 24..'+buf.length);
 const typeStart=hdrLen+typeOff,typeEnd=typeStart+typeLen,strStart=hdrLen+strOff,strEnd=strStart+strLen;
 need(typeEnd<=buf.length,'BTF type section ends at '+typeEnd+' beyond the blob ('+buf.length+' bytes)');
 need(strEnd<=buf.length,'BTF string section ends at '+strEnd+' beyond the blob ('+buf.length+' bytes)');
 // the kernel accepts only contiguous sections that start right after the header; so does this reader (no gap, overlap or trailing bytes can hide a record)
 const order=[[typeOff,typeLen,'type'],[strOff,strLen,'string']].sort((a,b)=>a[0]-b[0]);
 need(order[0][0]===0&&order[0][0]+order[0][1]===order[1][0]&&hdrLen+order[1][0]+order[1][1]===buf.length,'BTF sections are not contiguous from the header to the end of the blob');
 need(strLen>0&&buf[strStart]===0&&buf[strEnd-1]===0,'BTF string section must start and end with NUL');
 need(typeLen%4===0,'BTF type section length is not a multiple of 4');
 const nameAt=off=>{
  need(off<strLen,'BTF name offset '+off+' outside the string section ('+strLen+' bytes)');
  const end=buf.indexOf(0,strStart+off);need(end>=0&&end<strEnd,'BTF string at '+off+' is not NUL-terminated inside its section');
  return buf.toString('utf8',strStart+off,end);
 };
 const enums=[];let pos=typeStart,typeId=0;
 while(pos<typeEnd){
  need(pos+12<=typeEnd,'BTF type record at '+pos+' overruns the type section');
  const nameOff=buf.readUInt32LE(pos),info=buf.readUInt32LE(pos+4),sizeOrType=buf.readUInt32LE(pos+8);
  const vlen=info&0xffff,kind=(info>>>24)&0x1f,kindFlag=info>>>31;typeId+=1;pos+=12;
  need((info&~BTF_INFO_MASK)>>>0===0,'BTF type '+(typeId)+' has reserved type-info bits set (info 0x'+info.toString(16)+')');   // [EXP-OBS01-R13] Why (R12-F3): bits 16-23 and 29-30 are reserved (the kernel's BTF_INFO_MASK).
  need(nameOff<strLen,'BTF type '+typeId+' has name offset '+nameOff+' outside the string section ('+strLen+' bytes)');
  const tail=n=>{need(pos+n<=typeEnd,'BTF type '+typeId+' (kind '+kind+') overruns the type section');const at=pos;pos+=n;return at;};
  switch(kind){
   case BTF_KIND.INT:tail(4);break;
   case BTF_KIND.PTR:case BTF_KIND.FWD:case BTF_KIND.TYPEDEF:case BTF_KIND.VOLATILE:case BTF_KIND.CONST:case BTF_KIND.RESTRICT:case BTF_KIND.FUNC:case BTF_KIND.FLOAT:case BTF_KIND.TYPE_TAG:break;
   case BTF_KIND.ARRAY:tail(12);break;
   case BTF_KIND.STRUCT:case BTF_KIND.UNION:{const at=tail(12*vlen);for(let i=0;i<vlen;i++)need(buf.readUInt32LE(at+12*i)<strLen,'BTF member name offset outside the string section');break;}
   case BTF_KIND.DATASEC:tail(12*vlen);break;
   case BTF_KIND.FUNC_PROTO:tail(8*vlen);break;
   case BTF_KIND.VAR:case BTF_KIND.DECL_TAG:tail(4);break;
   case BTF_KIND.ENUM:{
    need([1,2,4,8].includes(sizeOrType),'BTF enum type '+typeId+' has size '+sizeOrType);
    const at=tail(8*vlen),values=[];
    for(let i=0;i<vlen;i++)values.push({name:nameAt(buf.readUInt32LE(at+8*i)),value:BigInt(kindFlag?buf.readInt32LE(at+8*i+4):buf.readUInt32LE(at+8*i+4))});
    enums.push({typeId,name:nameOff?nameAt(nameOff):'',kind:'ENUM',size:sizeOrType,signed:Boolean(kindFlag),values});break;
   }
   case BTF_KIND.ENUM64:{
    need(sizeOrType===8,'BTF enum64 type '+typeId+' has size '+sizeOrType);
    const at=tail(12*vlen),values=[];
    for(let i=0;i<vlen;i++){const lo=buf.readUInt32LE(at+12*i+4),hi=buf.readUInt32LE(at+12*i+8);const raw=(BigInt(hi)<<32n)|BigInt(lo);values.push({name:nameAt(buf.readUInt32LE(at+12*i)),value:kindFlag?BigInt.asIntN(64,raw):raw});}
    enums.push({typeId,name:nameOff?nameAt(nameOff):'',kind:'ENUM64',size:8,signed:Boolean(kindFlag),values});break;
   }
   default:throw new BtfError('BTF type '+typeId+' has unknown kind '+kind);
  }
 }
 need(pos===typeEnd,'BTF type section not consumed exactly ('+pos+' vs '+typeEnd+')');
 return {typeCount:typeId,enums};
}

/**
 * Derives helper ids from the kernel's `enum bpf_func_id`. `names` are helper function names (`bpf_ktime_get_ns`) that must all be present.
 * Returns {ok,reasons,btfSha256,btfBytes,typeCount,enumKind,ids:{<every helper name in the enum>:id},missing:[...]}. Refuses when the enum is missing, appears more than once (empty ones counted), is empty,
 * has duplicate enumerator names, two enumerators with one id (any entry, not only the needed names), a value outside 0..65535 for a needed name, a needed name that is absent, or two needed names with one id.
 */
export function deriveHelperIds(bytes,names){
 const out={ok:false,reasons:[],btfSha256:null,btfBytes:0,typeCount:0,enumKind:null,ids:{},missing:[]};
 try{
  const buf=Buffer.isBuffer(bytes)?bytes:Buffer.from(bytes??[]);out.btfSha256=createHash('sha256').update(buf).digest('hex');out.btfBytes=buf.length;
  const parsed=parseBtfEnums(buf);out.typeCount=parsed.typeCount;
  // [EXP-OBS01-R13] Why (R12-F3): count EVERY enum named bpf_func_id (an empty one included) before anything else, and reject any two enumerators that share an id: the
  // helper-id -> name inversion the diagnostic uses must receive a validated one-to-one mapping, so enum order cannot decide which name an id has.
  // Rejected: filtering out empty enums first (a second, empty bpf_func_id enum passed); checking collisions only among the required names (an unrelated clock-like name could alias id 5).
  const found=parsed.enums.filter(e=>e.name===FUNC_ID_ENUM);
  if(found.length!==1){out.reasons.push('kernel BTF has '+found.length+' enum '+FUNC_ID_ENUM+' (need exactly one)');return out;}
  const [en]=found;out.enumKind=en.kind;
  if(en.values.length===0){out.reasons.push('kernel BTF enum '+FUNC_ID_ENUM+' is empty');return out;}
  const namesById=new Map();
  for(const {name,value} of en.values){
   if(!name.startsWith(FUNC_PREFIX)||name==='__BPF_FUNC_MAX_ID')continue;
   const helper='bpf_'+name.slice(FUNC_PREFIX.length);
   if(Object.hasOwn(out.ids,helper)){out.reasons.push('enum '+FUNC_ID_ENUM+' lists '+name+' twice');continue;}
   if(value<0n||value>65535n){out.reasons.push(name+' has value '+value+' outside 0..65535');continue;}
   out.ids[helper]=Number(value);
   const list=namesById.get(Number(value))??[];list.push(helper);namesById.set(Number(value),list);
  }
  for(const [id,list] of namesById)if(list.length>1)out.reasons.push('enum '+FUNC_ID_ENUM+' gives id '+id+' more than one name: '+list.join(', '));
  const seen=new Map();
  for(const name of names){
   if(!Object.hasOwn(out.ids,name)){out.missing.push(name);continue;}
   if(seen.has(out.ids[name]))out.reasons.push(name+' and '+seen.get(out.ids[name])+' share id '+out.ids[name]);else seen.set(out.ids[name],name);
  }
  if(out.missing.length)out.reasons.push('kernel enum '+FUNC_ID_ENUM+' has no entry for: '+out.missing.join(', '));
  out.ok=out.reasons.length===0;
 }catch(e){
  if(!(e instanceof BtfError))throw e;
  out.reasons.push('kernel BTF unreadable: '+e.message);
 }
 return out;
}
