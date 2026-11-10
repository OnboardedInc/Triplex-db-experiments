#!/usr/bin/env python3
# [XN-S2-LIVE] Why: retire only task-prefixed volumes after preserving raw bytes and observing no live task container. Rejected: deleting volumes during another holder's measurement window.
import datetime,json,os,pathlib,subprocess,time
ROOT=pathlib.Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/XN-S2/live')
LOCK=pathlib.Path('/Users/sam/Claude/Projects/triplex-db-2/locks/measure')
os.environ['DOCKER_HOST']='unix:///Users/sam/.colima/triplex2/docker.sock'
last=ROOT/'last-release.txt'
if last.exists():
    earliest=datetime.datetime.fromisoformat(last.read_text().strip()).timestamp()+120
    while time.time()<earliest:time.sleep(min(5,earliest-time.time()))
while True:
    try:LOCK.mkdir();break
    except FileExistsError:time.sleep(5)
(LOCK/'owner.json').write_text(json.dumps({'id':'XN-S2','pid':os.getpid(),'stage':'cleanup'})+'\n')
receipt={'startedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'commands':[]}
def docker(*args):
    p=subprocess.run(['docker',*args],capture_output=True,text=True,timeout=30)
    receipt['commands'].append({'args':args,'exit':p.returncode,'stdout':p.stdout,'stderr':p.stderr})
    assert p.returncode==0,p.stderr
    return p.stdout
try:
    assert not docker('ps','-a','--filter','name=tx2-xns2-','--format','{{.Names}}').strip(),'task container still exists'
    volumes=docker('volume','ls','--filter','name=tx2-xns2-','--format','{{.Name}}').splitlines()
    assert all(v.startswith('tx2-xns2-') for v in volumes)
    for v in volumes:
        docker('volume','inspect',v)
        docker('volume','rm',v)
    assert not docker('volume','ls','--filter','name=tx2-xns2-','--format','{{.Name}}').strip()
    assert not docker('network','ls','--filter','name=tx2-xns2-','--format','{{.Name}}').strip()
    receipt['removedVolumes']=volumes
finally:
    receipt['finishedAt']=datetime.datetime.now(datetime.timezone.utc).isoformat()
    (ROOT/f'cleanup-{time.time_ns()}.json').write_text(json.dumps(receipt,indent=2)+'\n')
    (ROOT/'last-release.txt').write_text(receipt['finishedAt']+'\n')
    (LOCK/'owner.json').unlink();LOCK.rmdir()
print(json.dumps({'removedVolumes':volumes}))
