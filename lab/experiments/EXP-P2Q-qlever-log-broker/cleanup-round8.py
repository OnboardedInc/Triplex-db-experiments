# [EXP-P2Q] Why: bind cleanup observations to actual recorded owners, current process bytes and reader inputs.
# Rejected: searching only path strings (flock helpers inherit an FD and do not name their lock path in argv).
import hashlib, json, pathlib, subprocess, time
root=pathlib.Path.cwd();base=root/'lab/experiments/EXP-P2Q-qlever-log-broker/evidence-round8'
script=pathlib.Path(__file__).resolve();script_hash=hashlib.sha256(script.read_bytes()).hexdigest()
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
process_bytes=subprocess.check_output(['ps','-axo','pid=,ppid=,comm=,args='])
processes={};matching=[]
for line in process_bytes.decode().splitlines():
    fields=line.strip().split(None,3)
    if len(fields)!=4:continue
    pid,ppid,comm,args=fields
    processes[int(pid)]=dict(pid=int(pid),ppid=int(ppid),comm=comm,args=args)
    if pathlib.Path(comm).name not in ['node','perl','flock','python3','python3.14']:continue
    if ('agent-a56ab43df1f0e0ef7' in args or 'CX-P2Q-R8' in args) and any(key in args for key in ['vitest','heavy.mjs','lock-holder','lockHolder']):matching.append(line)
assert not matching
owners=[];live=[]
for path in sorted((root/'runs/broker').glob('CX-P2Q-R8-*/*/LOCK')):
    raw=path.read_bytes()
    if not raw.strip().isdigit():continue
    pid=int(raw.strip());row=dict(path=str(path.relative_to(root)),pid=pid,sha256=hashlib.sha256(raw).hexdigest(),liveProcess=processes.get(pid))
    owners.append(row)
    if pid in processes:live.append(row)
assert owners and not live
reader=base/'retry-retirement-readback/readback.json';r=json.loads(reader.read_text())
assert r['accepted'] and len(r['cases'])==2 and r['head']=='3536d8da7ac33a7fa4ccdeb588edcfe379d60b1f'
assert sha(root/r['sourceScript'])==r['sourceScriptSha256'] and sha(pathlib.Path(r['inputGate']))==r['inputGateSha256']
for case in r['cases']:
    assert sha(reader.parent/case['copy'])==sha(pathlib.Path(case['source']))==case['sourceSha256']
    assert sha(pathlib.Path(case['case']))==case['caseSha256']
assert sha(script)==script_hash
record=dict(checkedAt=time.time(),head=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),worktree=str(root),
            sourceScript=str(script.relative_to(root)),sourceScriptSha256=script_hash,processListSha256=hashlib.sha256(process_bytes).hexdigest(),
            ownActiveMatchingTestHeavyProcesses=matching,recordedLockFiles=len(owners),distinctRecordedOwnerPids=len(set(x['pid'] for x in owners)),
            liveRecordedLockOwners=live,engineLifecycleActions=[],exclusiveEngineSlotsTaken=0,heavySlot=None,
            operation='read-only process/owned-artifact observation; no heavy job or engine reservation claimed',
            hostFreeBytes=int(subprocess.check_output(['df','-k','.'],text=True).splitlines()[-1].split()[3])*1024,
            stateRetention='runs/broker/CX-P2Q-R8-*',supplementalRetirementReadbackSha256=sha(reader))
(base/'cleanup.json').write_text(json.dumps(record,indent=2)+'\n')
(base/'lock-owner-readback.json').write_text(json.dumps(dict(checkedAt=record['checkedAt'],scope='runs/broker/CX-P2Q-R8-*',owners=owners,liveRecordedOwners=live),indent=2)+'\n')
print(json.dumps({k:record[k] for k in ['recordedLockFiles','distinctRecordedOwnerPids','liveRecordedLockOwners','hostFreeBytes']},indent=2))
