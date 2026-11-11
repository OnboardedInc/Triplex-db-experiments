"""Compare retained engine log bytes against the stopped owned container before reclaiming them."""
import json
import io
import os
from pathlib import Path
import re
import subprocess
import sys
import tarfile
import tempfile

# [DX-S5] Why: log reclamation requires proven quiescence and recovery of every original byte.
# Rejected: trusting a gzip exit status, entry sizes alone, or truncating an active JVM's log.
container, archive, *flags = sys.argv[1:]
assert flags in ([], ['--reclaim'])
assert container in ['tx2-dxs5-seed-100000-' + r for r in ('tx', 'gw-w', 'gw-r')]
root = Path('/Users/sam/Claude/Projects/triplex-db-2')
lock = root / 'locks/measure/owner.json'
owner = json.loads(lock.read_text())
assert owner['id'] == 'DX-S5' and owner['kind'] == 'seed-100000'
os.kill(owner['pid'], 0)
path = Path(archive).resolve()
assert path.parent == root / 'evidence/DX-S5'
assert path.stat().st_mtime_ns >= lock.stat().st_mtime_ns
env = dict(os.environ, DOCKER_HOST='unix:///Users/sam/.colima/triplex2/docker.sock')
def inspect():
    state = json.loads(subprocess.check_output(['docker', 'inspect', container], env=env))[0]
    assert not state['State']['Running'] and not state['State']['Paused']
    return state['Id']
identity = inspect()
processes = []
try:
    original = subprocess.Popen(['docker', 'cp', container + ':/opt/datomic/log/.', '-'], stdout=subprocess.PIPE, env=env)
    retained = subprocess.Popen(['gzip', '-dc', str(path)], stdout=subprocess.PIPE)
    processes = [original, retained]
    count = 0
    files = []
    with tarfile.open(fileobj=original.stdout, mode='r|') as a, tarfile.open(fileobj=retained.stdout, mode='r|') as b:
        left, right = iter(a), iter(b)
        while True:
            x, y = next(left, None), next(right, None)
            assert (x is None) == (y is None), 'archive entry coverage differs'
            if x is None:
                break
            assert (x.name, x.type, x.size) == (y.name, y.type, y.size)
            if x.isfile():
                aa, bb = a.extractfile(x), b.extractfile(y)
                while True:
                    av, bv = aa.read(65536), bb.read(65536)
                    assert av == bv, 'retained log bytes differ'
                    count += len(av)
                    if not av:
                        break
                files.append({'name': x.name, 'bytes': x.size})
    for p in processes:
        p.stdout.read()
        assert p.wait() == 0, 'archive transport/CRC failure'
    assert files and count > 0
    assert inspect() == identity
    assert json.loads(lock.read_text()) == owner
    if flags:
        # [DX-S5] Why: reclaim only the fully retained, closed log files, then read back the new logging configuration.
        # Rejected: deleting unknown files or changing any database/durability setting to make the seed fit.
        config = Path(__file__).with_name('logback.xml')
        with tempfile.NamedTemporaryFile() as empty:
            for entry in files:
                name = entry['name'].removeprefix('./')
                assert re.fullmatch(r'\d{4}-\d{2}-\d{2}\.log', name)
                target = container + ':/opt/datomic/log/' + name
                subprocess.run(['docker', 'cp', empty.name, target], check=True, env=env, stdout=subprocess.DEVNULL)
                raw = subprocess.check_output(['docker', 'cp', target, '-'], env=env)
                with tarfile.open(fileobj=io.BytesIO(raw)) as check:
                    members = [m for m in check if m.isfile()]
                    assert len(members) == 1 and members[0].size == 0
                    assert check.extractfile(members[0]).read() == b''
        target = container + ':/opt/datomic/bin/logback.xml'
        subprocess.run(['docker', 'cp', str(config), target], check=True, env=env, stdout=subprocess.DEVNULL)
        raw = subprocess.check_output(['docker', 'cp', target, '-'], env=env)
        with tarfile.open(fileobj=io.BytesIO(raw)) as check:
            members = [m for m in check if m.isfile()]
            assert len(members) == 1 and check.extractfile(members[0]).read() == config.read_bytes()
        assert inspect() == identity and json.loads(lock.read_text()) == owner
    print(json.dumps({'container': container, 'containerId': identity, 'archive': str(path), 'files': files, 'comparedBytes': count, 'equal': True, 'quiescent': True, 'reclaimed': bool(flags), 'configurationReadbackEqual': bool(flags)}))
finally:
    for p in processes:
        if p.poll() is None:
            p.terminate()
            p.wait()
