#!/usr/bin/env python3
# [DX-S4] Why: bind each fresh store to the prepared complete corpus, not merely whatever file the loader happened to read. Rejected: accepting a self-consistent truncated load.
import pathlib,sys,json,hashlib
p=pathlib.Path(sys.argv[1]);s=json.loads((p/'summary.json').read_text());proof=json.loads((p/'native-corpus-check.json').read_text())
assert proof['rows']==s['rows'] and s['rows'] in [442196,442410]
files=s['input_files']
assert proof['recorded_input_sha256']==files['variants.jsonl']['sha256']
for name,expected in files.items():
 f=p/name;h=hashlib.sha256()
 with f.open('rb') as stream:
  while b:=stream.read(1024*1024):h.update(b)
 assert f.stat().st_size==expected['bytes'] and h.hexdigest()==expected['sha256'],name
print(json.dumps({'classification':'DIAGNOSTIC-SOURCE-BOUND-INPUT','rows':s['rows'],'input_path':str(p),'input_files':files,'summary_sha256':hashlib.sha256((p/'summary.json').read_bytes()).hexdigest(),'corpus_proof_sha256':hashlib.sha256((p/'native-corpus-check.json').read_bytes()).hexdigest()}))
