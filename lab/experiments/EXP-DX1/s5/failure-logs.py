"""Emit stopped owned JVM diagnostics into the hold's single raw output stream."""
import gzip
import json
import os
import re
import subprocess
import sys
import tarfile

# [DX-S5] Why: the first long failure lost the transactor's diagnostics when its container was removed.
# Rejected: claiming a root cause from the verifier's connection error or deleting closed logs before retention.
prefix = sys.argv[1]
assert re.fullmatch(r'tx2-dxs5-seed-(1000|10000|100000)', prefix)
env = dict(os.environ, DOCKER_HOST='unix:///Users/sam/.colima/triplex2/docker.sock')
for role in ('gw-r', 'gw-w', 'tx', 'pg'):
    name = prefix + '-' + role
    result = subprocess.run(['docker', 'inspect', name], env=env, capture_output=True)
    if result.returncode:
        print(json.dumps({'event': 'failure-container-missing', 'name': name}), flush=True)
        continue
    state = json.loads(result.stdout)[0]
    print(json.dumps({'event': 'failure-container', 'name': name, 'id': state['Id'],
                      'state': state['State'], 'restarts': state['RestartCount']}), flush=True)
    subprocess.run(['docker', 'logs', name], env=env, check=False)
    if role == 'pg' or state['State']['Running']:
        continue
    p = subprocess.Popen(['docker', 'cp', name + ':/opt/datomic/log/.', '-'], env=env, stdout=subprocess.PIPE)
    try:
        with tarfile.open(fileobj=p.stdout, mode='r|') as archive:
            for member in archive:
                if not member.isfile() or not member.name.endswith(('.log', '.gz')):
                    continue
                print(json.dumps({'event': 'failure-log-begin', 'container': name,
                                  'file': member.name, 'bytes': member.size}), flush=True)
                data = archive.extractfile(member)
                stream = gzip.GzipFile(fileobj=data) if member.name.endswith('.gz') else data
                emitted = 0
                while block := stream.read(65536):
                    emitted += len(block)
                    sys.stdout.buffer.write(block)
                sys.stdout.buffer.flush()
                print('\n' + json.dumps({'event': 'failure-log-end', 'container': name, 'file': member.name, 'emittedBytes': emitted}), flush=True)
        p.stdout.read()
        if p.wait():
            print(json.dumps({'event': 'failure-log-copy-error', 'container': name}), flush=True)
    finally:
        if p.poll() is None:
            p.terminate()
            p.wait()

    # [DX-S5] Why: Clojure writes the full peer-connect exception to /tmp, outside active.log.
    # Rejected: retaining only the console's exception summary.
    p = subprocess.Popen(['docker', 'cp', name + ':/tmp/.', '-'], env=env, stdout=subprocess.PIPE)
    with tarfile.open(fileobj=p.stdout, mode='r|') as archive:
        for member in archive:
            if member.isfile() and re.fullmatch(r'(?:\./)?(?:clojure-[^/]+\.edn|gc\.log(?:\.[0-9]+)?)', member.name):
                print(json.dumps({'event': 'failure-clojure-report', 'container': name, 'file': member.name}), flush=True)
                sys.stdout.buffer.write(archive.extractfile(member).read())
                sys.stdout.buffer.flush()
    p.stdout.read()
    p.wait()
