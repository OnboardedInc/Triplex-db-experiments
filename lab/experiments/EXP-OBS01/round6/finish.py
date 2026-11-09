#!/usr/bin/env python3
"""Final cleanup commands are retained separately from the original failed VM receipt."""
import json
from pathlib import Path
import subprocess
import sys
out=Path(sys.argv[1])
for name,argv in [('fstrim-after-proof',['colima','ssh','-p','triplex2','--','sudo','fstrim','-av']),('context-after-proof',['docker','context','use','colima'])]:
    result=subprocess.run(argv,capture_output=True,timeout=120)
    (out/(name+'.json')).write_text(json.dumps({'status':result.returncode,'stdout':result.stdout.decode(),'stderr':result.stderr.decode()},sort_keys=True)+'\n')
    if result.returncode:raise RuntimeError(name+' failed')
