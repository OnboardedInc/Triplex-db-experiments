"""Interrupt the 10k proof only after a verified 5k chunk and a nonempty next-command suffix."""
import datetime
import json
import os
from pathlib import Path
import re
import signal
import subprocess
import sys
import time

# [DX-S5] Why: automate a whole-controller interruption without racing its automatic driver retry.
# Rejected: killing an arbitrary PID, stopping another holder, or killing before a durable suffix exists.
log = Path(sys.argv[1]).resolve()
assert log.parent == Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-S5').resolve()
lock = Path('/Users/sam/Claude/Projects/triplex-db-2/locks/measure/owner.json')
env = dict(os.environ, DOCKER_HOST='unix:///Users/sam/.colima/triplex2/docker.sock', TZ='UTC', LC_ALL='C')
for _ in range(600):
    text = log.read_text()
    verified = False
    finished = False
    for line in text.splitlines():
        if not line.startswith('{'):
            continue
        try:
            event = json.loads(line)
        except ValueError:
            continue
        verified |= event.get('event') == 'chunk-readback' and event.get('scope') == 'dxs5-w0-10000-v1' and event.get('endSubjects') == 5000
        finished |= event.get('event') == 'chunk-seeded' and event.get('endSubjects') == 10000
    commands = [int(x) for x in re.findall(r'\[DX-H6 seed\] (\d+) commands', text)]
    if finished:
        raise RuntimeError('missed the partial-chunk interruption window')
    if verified and commands and 216000 <= commands[-1] < 434000:
        owner = json.loads(lock.read_text())
        assert owner['id'] == 'DX-S5' and owner['kind'] == 'seed-10000'
        assert log.stat().st_mtime_ns >= lock.stat().st_mtime_ns
        pid = owner['pid']
        os.kill(pid, 0)
        command = subprocess.check_output(['ps', '-p', str(pid), '-o', 'command='], env=env, text=True).strip()
        assert 'lab/experiments/EXP-DX1/s5/hold.sh 10000 5000' in command
        born = subprocess.check_output(['ps', '-p', str(pid), '-o', 'lstart='], env=env, text=True).strip()
        epoch = datetime.datetime.strptime(born, '%a %b %d %H:%M:%S %Y').replace(tzinfo=datetime.timezone.utc).timestamp()
        assert epoch <= lock.stat().st_mtime + 1
        name = 'tx2-dxs5-seed-10000-driver'
        driver = json.loads(subprocess.check_output(['docker', 'inspect', name], env=env))[0]
        assert driver['State']['Running'] and driver['Name'] == '/' + name
        assert driver['Config']['Cmd'][-3:] == ['10000', '10000', 'seed']
        print(json.dumps({'event': 'interrupt-proof', 'owner': owner, 'nativeCommand': command, 'nativeStartedAt': born,
                          'driverId': driver['Id'], 'lastOfferedPosition': commands[-1],
                          'time': datetime.datetime.now(datetime.timezone.utc).isoformat()}), flush=True)
        os.kill(pid, signal.SIGSTOP)
        try:
            assert json.loads(lock.read_text()) == owner
            subprocess.run(['docker', 'rm', '-f', name], env=env, check=True)
            os.kill(pid, signal.SIGTERM)
        finally:
            os.kill(pid, signal.SIGCONT)
        print('owned controller interrupted; await its partial-retention cleanup before resume', flush=True)
        break
    time.sleep(1)
else:
    raise TimeoutError('no verified chunk/nonempty suffix within the interruption window')
