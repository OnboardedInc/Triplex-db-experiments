/** [EXP-HS01] Why: identical codec bytes in source and packed eval workers.
 * Rejected: worker source imports (unavailable to CommonJS eval in packed consumers).
 * Mechanism: R45 5.2 C/D, verified compact rows with verbatim fallback.
 */
export const rowCodec = String.raw`
const kinds=['string','number','boolean','datetime','json','ref','integer'];
const channel=t=>t==='ref'||t==='integer'?'value_string':'value_'+t;
const alphabet='0123456789ABCDEFGHJKMNPQRSTVWXYZ';
// [EXP-HS01] Why: R2 id codec. Core's deterministic generator emits <8 base-36 hash chars><18 base-36 counter chars>; storing
// that as 26 TEXT bytes cost 27 bytes in the row and 27 in the id index. A structured id becomes ONE SQLite INTEGER:
// tailValue*64+headSlot, where headSlot names (head chars, tail length) in the bounded hds dictionary (63 slots). Decode
// is by storage class: integer = structured, 16-byte blob = canonical Crockford ULID, text = anything else.
// Rejected: a global id dictionary (unbounded growth for random ids), a surrogate row id (loses entity clustering, R45 5.3),
// and base-36 to a minimal big-endian blob (17 bytes, saves only 9 of 27 and ignores the constant hash head).
const HEAD_SLOTS=64,TAIL_LIMIT=2**43;
const structured=/^([0-9A-Z]{8})([0-9A-Z]{1,18})$/;
const crockford=/^[0-7][0-9A-HJKMNP-TV-Z]{25}$/;
// c.hid(key) returns the slot for "<head>/<tail length>" or undefined (writer: allocates while a slot is free).
// Any id that does not match, does not round-trip, or finds no slot stays as before (ULID blob or TEXT): only bytes change.
const packId=(s,c)=>{
 if(typeof s!=='string')return s;
 const m=structured.exec(s);
 if(m&&c){
  const v=parseInt(m[2],36);
  if(Number.isSafeInteger(v)&&v<TAIL_LIMIT&&v.toString(36).toUpperCase().padStart(m[2].length,'0')===m[2]){
   const h=c.hid(m[1]+'/'+m[2].length);
   // BigInt binds as SQLite INTEGER; a JS number would be stored as an 8-byte REAL in this untyped column.
   if(h!==undefined)return BigInt(v)*BigInt(HEAD_SLOTS)+BigInt(h);
  }
 }
 // [EXP-HS01] Why: SQLite TEXT rewrites a lone surrogate to U+FFFD, so two different ids could collide in the unique id index.
 // Such ids are kept as a tag byte plus UTF-16LE code units (odd length, never the 16 bytes of a ULID). Rejected: TEXT.
 if(Buffer.from(s,'utf8').toString('utf8')!==s)return Buffer.concat([Buffer.from([1]),Buffer.from(s,'utf16le')]);
 if(!crockford.test(s))return s;
 let n=0n;for(const ch of s)n=n*32n+BigInt(alphabet.indexOf(ch));
 const b=Buffer.alloc(16);b.writeBigUInt64BE(n>>64n);b.writeBigUInt64BE(n&((1n<<64n)-1n),8);return b;
};
const unpackId=(b,c)=>{
 if(typeof b==='bigint')b=Number(b);
 if(typeof b==='number'){
  const h=b%HEAD_SLOTS,key=c.name('hds',h),at=key.indexOf('/');
  return key.slice(0,at)+((b-h)/HEAD_SLOTS).toString(36).toUpperCase().padStart(Number(key.slice(at+1)),'0');
 }
 if(!Buffer.isBuffer(b))return b;
 if(b.length!==16)return b.subarray(1).toString('utf16le');
 let n=b.readBigUInt64BE(0)<<64n|b.readBigUInt64BE(8),s='';
 for(let i=0;i<26;i++){s=alphabet[Number(n&31n)]+s;n>>=5n;}return s;
};
// [EXP-HS01] Why: JSON alone loses -0 and own undefined columns. Rejected: a lossy verbatim fallback.
// The envelope retains full JSON and exceptional scalar tags; no fact value is interned.
const verbatim=r=>Buffer.from(JSON.stringify({row:r,special:Object.keys(r).filter(k=>r[k]===undefined||typeof r[k]==='number'&&(!Number.isFinite(r[k])||Object.is(r[k],-0))).map(k=>[k,r[k]===undefined?'undefined':Object.is(r[k],-0)?'-0':String(r[k])])}));
const unverb=b=>{const x=JSON.parse(Buffer.from(b).toString());for(const [k,v]of x.special)x.row[k]=v==='undefined'?undefined:v==='-0'?-0:Number(v);return x.row;};
const sameRow=(a,b)=>Object.keys(a).length===Object.keys(b).length&&Object.keys(a).every(k=>Object.hasOwn(b,k)&&Object.is(a[k],b[k]));
const isJournalRow=r=>r.entity_type==='_Transaction'&&r.entity_id===r.tx_id;
// [EXP-HS01] Why: assertions may later retire; derive only immutable assertion columns and this change's tx.
// Rejected: copying the target's current retirement tuple into an earlier journal entry.
const deriveChange=(r,target)=>{
 const op=r.recorded_position===target.recorded_position?'assert':'retract';
 let value=target[channel(target.value_type)];
 if(target.value_type==='json')value=JSON.parse(value);
 if(target.value_type==='boolean')value=!!value;
 return JSON.stringify({op,tripleId:target.id,entityId:target.entity_id,attribute:target.attribute,
 ...(target.entity_type===null?{}:{entityType:target.entity_type}),value:{type:target.value_type,value},
 validFrom:target.valid_from,...(target.valid_to===null?{}:{validTo:target.valid_to}),recordedAt:target.recorded_at,
 ...(op==='retract'?{retractedAt:r.recorded_at}:{}),...(target.tx_id===null?{}:{assertionTxId:target.tx_id}),
 ...(op==='retract'?{retractionTxId:r.tx_id}:{})});
};
const decodeRow=(s,c)=>{
 if(s.x!==null)return unverb(s.x);
 const tx=c.tx(s.pos),rt=s.rpos==null?null:c.tx(s.rpos);
 if(!tx||s.rpos!=null&&!rt)throw Error('Missing row transaction');
 let type=kinds[s.t],value=s.v;
 if(s.t===8){type='number';value=s.pos;}
 if(s.t===9){type='datetime';value=tx.at;}
 const r={id:unpackId(s.id,c),entity_id:c.name('ents',s.e),attribute:c.name('attrs',s.a),value_type:type,
 value_string:null,value_number:null,value_boolean:null,value_datetime:null,value_json:null,
 recorded_at:tx.at,recorded_position:s.pos,valid_from:tx.at+s.vf,valid_to:s.vto,created_by:s.c===null?null:c.name('strs',s.c),
 retracted_at:rt?.at??null,retracted_position:s.rpos??null,retract_tx_id:rt?c.name('ents',rt.tx):null,
 entity_type:s.y===null?null:c.name('strs',s.y),schema_version:s.sv??1,tx_id:c.name('ents',tx.tx)};
 if(s.t===7){
  r.value_type='json';const target=c.row(unpackId(s.v,c));
  if(!target)throw Error('Missing journal reference');r.value_json=deriveChange(r,target);
 }else r[channel(type)]=type==='ref'?c.name('ents',value):value;
 return r;
};
const encodeRow=(r,c)=>{
 const s={e:c.intern('ents',r.entity_id),id:packId(r.id,c),a:c.intern('attrs',r.attribute),pos:r.recorded_position,
 t:kinds.indexOf(r.value_type),v:r[channel(r.value_type)]??null,vf:r.valid_from-r.recorded_at,vto:r.valid_to??null,
 c:r.created_by==null?null:c.intern('strs',r.created_by),y:r.entity_type==null?null:c.intern('strs',r.entity_type),sv:r.schema_version===1?null:r.schema_version??null,x:null,rpos:r.retracted_position??null};
 if(r.value_type==='ref')s.v=c.intern('ents',s.v);
 if(isJournalRow(r)){
  if(r.attribute===':_tx/position'&&Object.is(r.value_number,r.recorded_position)){s.t=8;s.v=null;}
  if(r.attribute===':_tx/instant'&&Object.is(r.value_datetime,r.recorded_at)){s.t=9;s.v=null;}
  if(r.attribute===':_tx/change')try{const id=JSON.parse(r.value_json).tripleId,target=c.row(id);if(target&&deriveChange(r,target)===r.value_json){s.t=7;s.v=packId(id,c);}}catch{}
 }
 // [EXP-HS01] Why: SQLite normalizes -0, NaN and malformed UTF-8 after JS encoding.
 // Rejected: checking only the pre-bind object (would miss storage conversion).
 const unsafe=Object.values(r).some(v=>typeof v==='number'&&(Object.is(v,-0)||!Number.isFinite(v))||typeof v==='string'&&Buffer.from(v,'utf8').toString('utf8')!==v);
 try{if(unsafe||!sameRow(r,decodeRow(s,c)))s.x=verbatim(r);}catch{s.x=verbatim(r);}
 return s;
};

// [EXP-HS01-R3] Why: better-sqlite3 binds a JS number as an 8-byte REAL in the untyped value column. An integral number within the signed
// 64-bit range is bound as INTEGER (1 to 8 bytes; interned refs and booleans become 1 to 3 bytes) and comes back as the same JS number:
// every integral double below 2^63 is exactly an int64, and better-sqlite3 returns int64 as the nearest double, which is that double.
// -0, NaN, infinities, fractions and values of 2^63 or more stay REAL, so no value changes (Q105b: no silent precision loss).
// Rejected: BigInt for every number (a REAL value would read back as an INTEGER and change its storage class for any other reader).
const bindV=s=>{const v=s.v;return typeof v==='number'&&Number.isInteger(v)&&!Object.is(v,-0)&&v>=-9223372036854775808&&v<9223372036854775808?BigInt(v):v;};
const sameId=(a,b)=>Buffer.isBuffer(a)||Buffer.isBuffer(b)?Buffer.isBuffer(a)&&Buffer.isBuffer(b)&&a.equals(b):typeof a==='string'||typeof b==='string'?a===b:BigInt(a)===BigInt(b);
// Stored-row order of the (e, id) key: integer ids, then TEXT ids (by UTF-8 bytes), then BLOB ids (by bytes), exactly as SQLite compares them.
const idClass=x=>typeof x==='string'?1:Buffer.isBuffer(x)?2:0;
const compareStored=(a,b)=>{
 if(a.e!==b.e)return a.e<b.e?-1:1;
 const p=idClass(a.id),q=idClass(b.id);
 if(p!==q)return p-q;
 if(p===0){const x=BigInt(a.id),y=BigInt(b.id);return x<y?-1:x>y?1:0;}
 return p===1?Buffer.compare(Buffer.from(a.id),Buffer.from(b.id)):Buffer.compare(a.id,b.id);
};
// [EXP-HS01-R3] Why: R47 journal record. The id k places after a stored id, in the id's own storage class: an integer id steps its tail
// (same head slot, same tail width), a 16-byte blob steps its 128-bit value. Any other form, or a step leaving the class, has no successor,
// so a transaction using it keeps verbatim rows. Rejected: stepping logical strings (the generators differ: base 36 versus Crockford).
const idAdd=(x,k,c)=>{
 if(typeof x==='bigint'||typeof x==='number'){
  const v=BigInt(x),slot=v%BigInt(HEAD_SLOTS),tail=(v-slot)/BigInt(HEAD_SLOTS)+BigInt(k);
  if(slot===0n||tail<0n||tail>=BigInt(TAIL_LIMIT))return undefined;
  const key=c.name('hds',Number(slot)),len=Number(key.slice(key.indexOf('/')+1));
  return tail>=36n**BigInt(len)?undefined:tail*BigInt(HEAD_SLOTS)+slot;
 }
 if(Buffer.isBuffer(x)&&x.length===16){
  const n=(x.readBigUInt64BE(0)<<64n|x.readBigUInt64BE(8))+BigInt(k);
  if(n<0n||n>=1n<<128n)return undefined;
  const b=Buffer.alloc(16);b.writeBigUInt64BE(n>>64n);b.writeBigUInt64BE(n&((1n<<64n)-1n),8);return b;
 }
 return undefined;
};
const sameField=(a,b)=>Buffer.isBuffer(a)||Buffer.isBuffer(b)?sameId(a,b):typeof a==='bigint'||typeof b==='bigint'?(typeof a!=='string'&&typeof b!=='string'&&a!==null&&b!==null&&BigInt(a)===BigInt(b)):Object.is(a,b);
const jrecFields=['e','id','a','pos','t','v','vf','vto','c','y','sv','x','rpos'];
const jrecNames={pos:':_tx/position',inst:':_tx/instant',actor:':_tx/actor',cmd:':_tx/command-id',cor:':_tx/correlation-id',cau:':_tx/causation-id',cfg:':_tx/config-snapshot',ce:':_tx/changed-entity',ch:':_tx/change'};
const jrecExtra=[['cor','cor'],['cau','cau'],['cfg','cfg']];
// Rebuild every stored-row struct of one transaction's journal from its record. Throws when a name, id or target is missing.
const jrecSynth=(rec,c)=>{
 const tx=c.tx(rec.pos),y=c.look('strs','_Transaction');
 if(!tx||y===undefined)throw Error('Journal record cannot be expanded');
 const j0=rec.jh===0?Buffer.from(rec.jt):BigInt(rec.jt)*BigInt(HEAD_SLOTS)+BigInt(rec.jh),out=[];
 const push=(name,t,v)=>{
  const a=c.look('attrs',name),id=out.length?idAdd(j0,out.length,c):j0;
  if(a===undefined||id===undefined)throw Error('Journal record cannot be expanded');
  out.push({e:tx.tx,id,a,pos:rec.pos,t,v,vf:rec.vf,vto:null,c:null,y,sv:null,x:null,rpos:null});
 };
 if(!(rec.f&1))push(jrecNames.pos,8,null);
 if(!(rec.f&2))push(jrecNames.inst,9,null);
 if(rec.ac!=null)push(jrecNames.actor,0,c.name('strs',rec.ac));
 if(rec.cm!=null)push(jrecNames.cmd,0,rec.cm);
 if(rec.ex!=null){const x=JSON.parse(rec.ex);for(const [key,field] of jrecExtra)if(x[key]!==undefined)push(jrecNames[field],0,x[key]);}
 // The change list is the run of ids just before the first journal id unless the record carries it explicitly.
 const targets=rec.rf!=null?JSON.parse(rec.rf).map(l=>packId(l,c)):Array.from({length:rec.nc},(_,i)=>idAdd(j0,i-rec.nc,c));
 const ents=[],seen=new Set();
 for(const t of targets){
  const e=t===undefined?undefined:c.ent(t);
  if(e===undefined)throw Error('Journal record cannot be expanded');
  if(!seen.has(e)){seen.add(e);ents.push(e);}
 }
 if(out.length+ents.length+targets.length!==rec.n)throw Error('Journal record cannot be expanded');
 for(const e of ents)push(jrecNames.ce,5,e);
 for(const t of targets)push(jrecNames.ch,7,t);
 return out;
};
// Encode one new transaction's journal rows (stored-row structs, in write order) as a record, or return undefined. The record is accepted
// only if jrecSynth reproduces EVERY column of EVERY row (Object.is for scalars, bytes for ids), so correctness never depends on the shape.
const jrecEncode=(rows,pos,c)=>{
 const first=rows[0];
 if(!first)return undefined;
 let jh,jt;
 if(typeof first.id==='bigint'){const v=first.id,slot=v%BigInt(HEAD_SLOTS);jh=Number(slot);jt=(v-slot)/BigInt(HEAD_SLOTS);}
 else if(Buffer.isBuffer(first.id)&&first.id.length===16){jh=0;jt=first.id;}
 else return undefined;
 const j0=jh===0?jt:jt*BigInt(HEAD_SLOTS)+BigInt(jh);
 let i=0,f=0,ac=null,cm=null,nc=0,ne=0;const ex={};
 const next=(name,t)=>{const a=c.look('attrs',name),r=rows[i];return a!==undefined&&r!==undefined&&r.a===a&&r.t===t;};
 if(next(jrecNames.pos,8))i++;else f|=1;
 if(next(jrecNames.inst,9))i++;else f|=2;
 if(next(jrecNames.actor,0)&&typeof rows[i].v==='string'){ac=c.intern('strs',rows[i].v);i++;}
 if(next(jrecNames.cmd,0)&&typeof rows[i].v==='string'){cm=rows[i].v;i++;}
 for(const [key,field] of jrecExtra)if(next(jrecNames[field],0)&&typeof rows[i].v==='string'){ex[key]=rows[i].v;i++;}
 while(next(jrecNames.ce,5)){ne++;i++;}
 while(next(jrecNames.ch,7)){nc++;i++;}
 if(i!==rows.length)return undefined;
 let rf=null;
 const targets=rows.slice(rows.length-nc);
 if(!targets.every((r,k)=>{const x=idAdd(j0,k-nc,c);return x!==undefined&&sameId(r.v,x);}))rf=JSON.stringify(targets.map(r=>unpackId(r.v,c)));
 const rec={pos,jh,jt,n:rows.length,nc,f,vf:first.vf,ac,cm,ex:Object.keys(ex).length?JSON.stringify(ex):null,rf};
 try{
  const out=jrecSynth(rec,c);
  if(out.length!==rows.length)return undefined;
  for(let k=0;k<out.length;k++)for(const key of jrecFields)if(!sameField(out[k][key],rows[k][key]))return undefined;
 }catch{return undefined;}
 return rec;
};
`;
