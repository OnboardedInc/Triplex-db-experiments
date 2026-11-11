import json, os, re, subprocess, sys, time, urllib.request
# [DX-M2] Why: alternate only hints on one JVM/storage configuration in a single hold.
# Rejected: measuring different stacks or moving durability/CPU settings along with hints.
prefix, enabled = sys.argv[1:]
assert re.fullmatch(r'tx2-dxm2-[a-z0-9-]+', prefix) and enabled in ('true', 'false')
assert json.load(open('/Users/sam/Claude/Projects/triplex-db-2/locks/measure/owner.json'))['id'] == 'DX-M2'
os.environ['DOCKER_HOST'] = 'unix:///Users/sam/.colima/triplex2/docker.sock'
name = prefix + '-gw-w'
v = json.loads(subprocess.check_output(['docker', 'inspect', name]))[0]
h, c = v['HostConfig'], v['Config']
args = ['docker', 'run', '-d', '--pull', 'never', '--name', name, '--network', h['NetworkMode'],
        '--cpuset-cpus', h['CpusetCpus'], '--memory', str(h['Memory']), '--memory-swap', str(h['MemorySwap'])]
for bind in h['Binds'] or []:
    args += ['-v', bind]
for port, bindings in (h['PortBindings'] or {}).items():
    for binding in bindings:
        args += ['-p', binding['HostIp'] + ':' + binding['HostPort'] + ':' + port]
for env in c['Env']:
    if not env.startswith('TX2_COMMIT_HINTS='):
        args += ['-e', env]
args += ['-e', 'TX2_COMMIT_HINTS=' + enabled]
assert len(c['Entrypoint']) == 1
args += ['--entrypoint', c['Entrypoint'][0], v['Image']] + c['Cmd']
print('write JVM', [e for e in c['Env'] if e.startswith('DATOMIC_JAVA_OPTS=')], 'hints', enabled, flush=True)
subprocess.run(['docker', 'rm', '-f', name], check=True)
subprocess.run(args, check=True)
for _ in range(90):
    try:
        with urllib.request.urlopen('http://127.0.0.1:8546/health', timeout=2) as r:
            assert r.status == 200
        break
    except Exception:
        time.sleep(1)
else:
    raise RuntimeError('restarted write gateway did not become healthy')
