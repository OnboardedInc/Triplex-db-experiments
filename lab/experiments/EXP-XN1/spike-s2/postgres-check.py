#!/usr/bin/env python3
# [XN-S2-PG] Why: bind diagnostic parser observations to this attempt, configs, immutable image and caps before indexing them. Rejected: using a global-looking Known types list as a backend-support verdict.
import datetime,hashlib,json,pathlib
base=pathlib.Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/XN-S2')
root=base/'postgres-log'; run=root/'attempt2'
parse=lambda s: datetime.datetime.fromisoformat(s.strip().replace('Z','+00:00'))
start=parse((run/'window-started.txt').read_text()); end=parse((run/'window-ended.txt').read_text())
# [XN-S2-PG] Why: shell timestamps truncate subsecond precision; preserve that recorded resolution. Rejected: treating the last second's boundary as its beginning.
end_exclusive=end+datetime.timedelta(seconds=1)
assert 0<(end-start).total_seconds()<600
assert (start-parse((root/'window-ended.txt').read_text())).total_seconds()>=120
binding=json.loads((run/'source-binding.json').read_text())
for name,expected in binding['files'].items():
    assert hashlib.sha256(pathlib.Path(name).read_bytes()).hexdigest()==expected, name
image=json.loads((run/'images.json').read_text())[0]['Id']
assert image==json.loads((base/'images.json').read_text())[0]['Id'], 'cached jar image changed'
expected={
'log-types': "at log on line 1, column 6: Value for 'log' is invalid: Unknown type '!XNUnknown'",
'storage-types': "Known types are: !InMemory, !Local, !Remote",
'remote-fields': "Fields [hostname, database, username, password] are required for type with serial name '!Postgres'",
'postgres-log': "at log on line 8, column 6: Value for 'log' is invalid: Unknown type '!Postgres'",
'object-store-types': "at storage.objectStore on line 2, column 16:"
}
observations={}
for name,marker in expected.items():
    c=json.loads((run/f'{name}-container.json').read_text())[0]
    assert c['Id']==(run/f'{name}-container-id.txt').read_text().strip() and c['Image']==image
    assert c['State']['ExitCode']==1 and not c['State']['OOMKilled']
    assert start<=parse(c['State']['StartedAt'])<=parse(c['State']['FinishedAt'])<end_exclusive
    assert c['HostConfig']['CpusetCpus']=='0,1' and c['HostConfig']['Memory']==3758096384
    assert not c['HostConfig']['PortBindings']
    assert (run/f'{name}.exit').read_text().strip()=='1'
    log=(run/f'{name}.log').read_text(); assert marker in log
    observations[name]={'containerId':c['Id'],'imageId':image,'message':next(line for line in log.splitlines() if marker in line)}
c=json.loads((run/'introspect-container.json').read_text())[0]
assert c['Image']==image and c['Id']==(run/'introspect-container-id.txt').read_text().strip()
assert c['State']['ExitCode']==0 and (run/'introspect.exit').read_text().strip()=='0'
assert start<=parse(c['State']['StartedAt'])<=parse(c['State']['FinishedAt'])<end_exclusive
log=(run/'introspect.log').read_text()
for marker in ['xtdb.api.Remote$Factory<xtdb.postgres.PostgresRemote>', 'interface xtdb.api.tx.ExternalSource$Factory', ':remote-default-port 5432', ':name "port", :optional true']:
    assert marker in log
awake=(run/'keep-awake-start.txt').read_text().strip()
assert awake=='already-running' or awake.startswith('started ')
if awake=='already-running': assert not (run/'keep-awake-stop.txt').exists()
else: assert 'remaining 0' in (run/'keep-awake-stop.txt').read_text()
out={'kind':'diagnostic parser observations; no acceptance verdict','sourceCommit':binding['sourceCommit'],'imageId':image,'keepAwake':True,'keeperStart':awake,'windowSeconds':(end-start).total_seconds(),'observations':observations,'indexerSourceSha256':hashlib.sha256(pathlib.Path(__file__).read_bytes()).hexdigest()}
(root/'observation-index.json').write_text(json.dumps(out,indent=2)+'\n')
print(json.dumps(out,indent=2))
