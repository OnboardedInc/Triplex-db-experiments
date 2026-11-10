#!/usr/bin/env python3
# [DX-S4] Why: compressor floors count only when decompression restores the exact source stream. Rejected: trusting successful compressor exit status.
import pathlib,sys,gzip,lzma,hashlib,json
p=pathlib.Path(sys.argv[1]);checks={}
def digest(f):
 h=hashlib.sha256();n=0
 with f:
  while b:=f.read(1024*1024):h.update(b);n+=len(b)
 return h.hexdigest(),n
for name in ['rows.jsonl','rowtexts.jsonl']:
 expected=digest((p/name).open('rb'))
 for ext,op in [('gz',gzip.open),('xz',lzma.open)]:
  actual=digest(op(p/(name+'.'+ext),'rb'));assert actual==expected
  checks[name+'.'+ext]={'restored_sha256':actual[0],'restored_bytes':actual[1]}
(p/'archive-content-check.json').write_text(json.dumps({'classification':'DIAGNOSTIC-EXACT-RESTORE-NOT-ACCEPTANCE','script_sha256':hashlib.sha256(pathlib.Path(__file__).read_bytes()).hexdigest(),'streams':checks},indent=2)+'\n')
print(json.dumps(checks))
