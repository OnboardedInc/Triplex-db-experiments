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
`;
