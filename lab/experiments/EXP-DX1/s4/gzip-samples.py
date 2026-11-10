#!/usr/bin/env python3
# [DX-S4] Why: gzip magic is checked by actual decompression of the sampled bytes. Rejected: identifying codecs from file size alone.
import json,pathlib,sys,gzip,base64,hashlib
p=pathlib.Path(sys.argv[1]);out=[]
for line in (p/'gzip-samples.jsonl').open():
 d=json.loads(line);b=base64.b64decode(d['base64']);raw=gzip.decompress(b)
 out.append({'id':d['id'],'compressed_bytes':len(b),'inflated_bytes':len(raw),'compressed_sha256':hashlib.sha256(b).hexdigest(),'inflated_sha256':hashlib.sha256(raw).hexdigest(),'inflated_prefix_hex':raw[:24].hex()})
(p/'gzip-sample-analysis.json').write_text(json.dumps(out,indent=2)+'\n')
