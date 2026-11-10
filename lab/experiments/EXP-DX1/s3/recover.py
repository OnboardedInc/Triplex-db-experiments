#!/usr/bin/env python3
# [DX-S3] Why: collect the interrupted attempt before prefix-scoped cleanup after daemon recovery. Rejected: restarting the shared VM.
import pathlib,json,sys,shutil
from run import cleanup,ROOT,docker
prefix=sys.argv[1]
assert prefix=='tx2-dxs3-v0-1794271945', 'only this interrupted owned attempt'
dest=ROOT/prefix
assert json.loads((dest/'stack.json').read_text())['prefix']==prefix
# A successful daemon read is required; an error string is not an empty resource inventory.
docker('ps','-a','--filter','name='+prefix,'--format','{{.Names}}')
if (dest/'cleanup.json').exists() and not (dest/'cleanup-first-outage.json').exists():
    shutil.copyfile(dest/'cleanup.json',dest/'cleanup-first-outage.json')
cleanup(prefix,dest)
print((dest/'cleanup.json').read_text())
