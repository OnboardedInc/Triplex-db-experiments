#!/usr/bin/env python3
"""Bound a measured window to less than fifteen minutes, including failed programs."""
import os
import signal
import subprocess
import sys

# [DX-S1] Why: a blocked Datomic future must not retain the global measurement lock. Rejected: relying on normal peer exit.
p = subprocess.Popen(sys.argv[1:], start_new_session=True)
try:
    code = p.wait(timeout=870)
except subprocess.TimeoutExpired:
    print('DX-S1 measured command exceeded 870 seconds', file=sys.stderr)
    os.killpg(p.pid, signal.SIGKILL)
    p.wait()
    names = subprocess.check_output(['docker', 'ps', '--format', '{{.Names}}'], text=True).splitlines()
    for name in names:
        if name.startswith('tx2-dxs1-') and name not in ('tx2-dxs1-pg', 'tx2-dxs1-tx'):
            subprocess.run(['docker', 'rm', '-f', name], check=True, timeout=10)
    code = 124
sys.exit(code)
