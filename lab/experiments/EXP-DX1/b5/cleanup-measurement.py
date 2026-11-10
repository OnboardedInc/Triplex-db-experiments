# [DX-B5-L6] Why: failed Docker inventories are unknown, and a replacement container is not ours to remove.
# Rejected: treating empty stdout from a failed command as successful cleanup or releasing another owner's lock.
import datetime, json, pathlib, re, subprocess, sys, time
prefix, job_exit = sys.argv[1], int(sys.argv[2])
assert re.fullmatch(r'tx2-dxb5-[a-z0-9-]+', prefix)
root = pathlib.Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B5')
lock = pathlib.Path('/Users/sam/Claude/Projects/triplex-db-2/locks/measure')
docker = ['docker', '--host', 'unix:///Users/sam/.colima/triplex2/docker.sock']
def call(args):
    r = subprocess.run(args, text=True, capture_output=True)
    return {'exitCode': r.returncode, 'stdout': r.stdout, 'stderr': r.stderr}
record = {'prefix': prefix, 'jobExitCode': job_exit, 'observedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'containers': [], 'releasedLock': False}
proof = root / prefix / 'stack.json'
identity_ok = True
if proof.exists():
    for bound in json.loads(proof.read_text())['containers']:
        observed = call(docker + ['inspect', bound['name']])
        row = {'name': bound['name'], 'expectedId': bound['id'], **observed}
        if observed['exitCode'] == 0:
            actual = json.loads(observed['stdout'])[0]
            row['actualId'] = actual['Id']
            if actual['Id'] != bound['id']: identity_ok = False
        elif not re.search(r'No such (object|container)', observed['stderr'], re.I):
            identity_ok = False
        record['containers'].append(row)
else:
    record['binding'] = 'exclusive owned prefix; startup did not complete stack proof'
if identity_ok:
    record['remove'] = call(['bash', 'lab/experiments/EXP-DX1/b5/down.sh', prefix, '--volumes'])
else:
    record['reason'] = 'container identity mismatch or unavailable daemon; no removal attempted'
record['inventories'] = {
    'containers': call(docker + ['ps', '-a', '--filter', 'name=' + prefix + '-', '--format', '{{.Names}}']),
    'networks': call(docker + ['network', 'ls', '--filter', 'name=' + prefix + '-', '--format', '{{.Name}}']),
    'volumes': call(docker + ['volume', 'ls', '--filter', 'name=' + prefix + '-', '--format', '{{.Name}}']),
}
empty = all(r['exitCode'] == 0 and not r['stdout'].strip() for r in record['inventories'].values())
try:
    owner = json.loads((lock / 'owner.json').read_text())
except Exception as error:
    owner = None
    record['ownerError'] = str(error)
record['owner'] = owner
if identity_ok and empty and owner and owner.get('prefix') == prefix:
    (lock / 'owner.json').unlink()
    lock.rmdir()
    record['releasedLock'] = True
out = root / ('cleanup-' + prefix + '-' + str(time.time_ns()) + '.json')
out.write_text(json.dumps(record, indent=2) + '\n')
print(out)
if not record['releasedLock']:
    raise SystemExit(1)
