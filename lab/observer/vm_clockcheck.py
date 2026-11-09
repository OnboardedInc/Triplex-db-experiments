#!/usr/bin/env python3
"""Probe W0 clock step (R49): run a child command whose stdout lines are `CK|<nsecs(monotonic)>|<nsecs(boot)>` (the bpftrace clock probe,
lab/observer/vm_clockprobe.bt) and stamp this process's CLOCK_MONOTONIC on receipt of each line. Stdlib only.

Run inside the triplex2 VM by sync-witness.mjs (python3 -c <this file> -- docker start -a <container>), so the receipt clock is the same
CLOCK_MONOTONIC the observer and driver read. One JSON object per line: {"monotonicNs","bootNs","receivedNs"}. The judgement
(clockVerdict in lab/bin/sync-witness.mjs) is separate and pure. Exit 0 only when the child exited 0 and every line parsed.
[EXP-OBS01-R10] Why: bpftrace's bare `nsecs` is CLOCK_BOOTTIME (R49); W0 must prove nsecs(monotonic) is the observer's clock.
Rejected: bracketing one container start (a start takes about a second, which would hide an offset of that size)."""
import json
import re
import subprocess
import sys
import time

def parse_line(line):
    match=re.fullmatch(r'CK\|([0-9]{1,19})\|([0-9]{1,19})',line)
    if not match:raise ValueError('unparseable clock probe line: '+line[:80])
    return int(match[1]),int(match[2])

def main(argv):
    if len(argv)<2 or argv[0]!='--':print('usage: vm_clockcheck.py -- <command> [args...]',file=sys.stderr);return 2
    child=subprocess.Popen(argv[1:],stdout=subprocess.PIPE,text=True,bufsize=1);count=0
    try:
        for raw in child.stdout:
            received=time.monotonic_ns();line=raw.rstrip('\n')
            if not line.strip():continue
            monotonic,boot=parse_line(line);count+=1
            print(json.dumps({'monotonicNs':monotonic,'bootNs':boot,'receivedNs':received},sort_keys=True,separators=(',',':')),flush=True)
    except ValueError as error:
        child.kill();child.wait();print(str(error),file=sys.stderr);return 2
    status=child.wait()
    if status!=0:return status
    if count==0:print('clock probe produced no samples',file=sys.stderr);return 2
    return 0

if __name__=='__main__':sys.exit(main(sys.argv[1:]))
