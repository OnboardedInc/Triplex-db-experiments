# [EXP-P2Q] Why: prove the retirement actually reached this attempt's log, not merely a successful API return.
# Rejected: comparing unchanged snapshots after an unverified no-op write (would not exercise masking).
import hashlib, json, os, pathlib, struct, subprocess, time, shutil
root=pathlib.Path.cwd(); base=root/'lab/experiments/EXP-P2Q-qlever-log-broker/evidence-round8'
assert shutil.disk_usage(root).free>=5*1024**3
name=os.environ.get('P2Q_ATTEMPT','retry'); label='CX-P2Q-R8-retirement-readback'
receipt_path=base/name/'new-live.json'; receipt=json.loads(receipt_path.read_text())
assert receipt['exitCode']==0 and receipt['accepted'] and receipt['sourceStillMatches']
assert receipt['finishedAt']<time.time() and receipt['env']['P2Q_ATTEMPT_ID']==receipt['attemptId']
sha=lambda data: hashlib.sha256(data).hexdigest()
locks=pathlib.Path(os.environ.get('TX2_LOCKS_DIR','/Users/sam/projects/triplex-db-2/lab/locks'))/'heavy'
def slot():
    candidates=[]
    for p in locks.glob('*/owner.json'):
        try: raw=p.read_bytes()
        except FileNotFoundError: continue
        owner=json.loads(raw)
        if owner['pid']==os.getppid() and owner['label']==label:
            candidates.append(dict(path=str(p),owner=owner,sha256=sha(raw)))
    assert len(candidates)==1
    return candidates[0]
owner=slot(); started=time.time()
out=base/os.environ.get('P2Q_READBACK_NAME', name+'-retirement-readback');out.mkdir(exist_ok=False)
script=pathlib.Path(__file__).resolve();script_hash=sha(script.read_bytes())

def crc32c(data,seed=0):
    c=(~seed)&0xffffffff
    for byte in data:
        c^=byte
        for _ in range(8): c=(c>>1)^0x82f63b78 if c&1 else c>>1
    return (~c)&0xffffffff
assert crc32c(b'123456789')==0xe3069283
columns=['id','entity_id','attribute','value_type','value_string','value_number','value_boolean','value_datetime','value_json','recorded_at','recorded_position','valid_from','valid_to','created_by','retracted_at','retracted_position','retract_tx_id','entity_type','schema_version','tx_id']
def rows_from_log(raw):
    assert len(raw)>=32 and raw[:8]==b'TRPLXLG1'
    header=bytearray(raw[:32]);version,check=struct.unpack_from('<II',header,8)
    assert version==2;header[12:16]=b'\0'*4;assert crc32c(header)==check
    seed=crc32c(raw[:32]);offset=32;previous=struct.unpack_from('<Q',raw,24)[0]-1;rows=[]
    while offset<len(raw):
        if not any(raw[offset:]): break
        assert offset+36<=len(raw)
        magic,length,lsn,epoch,prev,kind,flags,header_crc=struct.unpack_from('<IIQIIHHI',raw,offset)
        assert magic==0x464c5854 and prev==seed and lsn>previous
        assert crc32c(raw[offset:offset+28],seed)==header_crc
        end=offset+32+length;assert end+4<=len(raw)
        payload=raw[offset+32:end];tail=struct.unpack_from('<I',raw,end)[0]
        assert crc32c(payload,header_crc)==tail
        if kind==1:
            wire=json.loads(payload)
            for member in wire['m']:
                for cells in member['r']:
                    assert len(cells)==len(columns)
                    rows.append((lsn,dict(zip(columns,cells))))
        seed=tail;previous=lsn;offset=end+4
    return rows

runs=pathlib.Path(receipt['env']['V_P2Q_RUNS']);assert receipt['attemptId'] in runs.name
paths=sorted(runs.glob('round8-journal-live-*/segment-000001.log'));assert len(paths)==2, paths
inputs=[]
for path in paths:
    raw=path.read_bytes();assert receipt['startedAt']<=path.stat().st_mtime<=receipt['finishedAt']
    inputs.append((path,raw,rows_from_log(raw)))
results=[];used=set()
for kind in ['standard','fresh']:
    case_path=base/name/'new-live'/('round8-'+kind+'-journal-immutable.json')
    case=json.loads(case_path.read_text());before=json.loads(case['before'])
    assert len(before['transactions'])==1 and before['snapshotPosition']==case['first']
    assert case['before']==case['after']==case['transaction']==case['afterMetadata']==case['transactionAfterMetadata']
    tx=before['transactions'][0]['txId'];matches=[]
    for index,(path,raw,rows) in enumerate(inputs):
        target=[(lsn,row) for lsn,row in rows if row['entity_id']==tx and row['attribute']==':_tx/position']
        if target: matches.append((index,path,raw,target))
    assert len(matches)==1
    index,path,raw,target=matches[0];assert index not in used;used.add(index)
    assert len(target)==2
    (initial_lsn,initial),(retired_lsn,retired)=target
    assert initial_lsn<retired_lsn and initial['retracted_at'] is None and initial['retracted_position'] is None and initial['retract_tx_id'] is None
    assert initial['recorded_position']==initial['value_number']==case['first']
    assert retired['retract_tx_id']=='internal-fixture-retirement'
    assert retired['retracted_position']>case['first'] and retired['retracted_at']>initial['recorded_at']
    assert retired_lsn*1024<=retired['retracted_position']<=(retired_lsn+1)*1024-1
    for key in columns:
        if key not in ['retracted_at','retracted_position','retract_tx_id']: assert initial[key]==retired[key],key
    assert path.read_bytes()==raw
    copy=out/(kind+'-segment.log');copy.write_bytes(raw)
    results.append(dict(kind=kind,source=str(path),sourceSha256=sha(raw),copy=copy.name,case=str(case_path),caseSha256=sha(case_path.read_bytes()),
                        scope=case['scope'],required=case['first'],initialLsn=initial_lsn,retiredLsn=retired_lsn,initial=initial,retired=retired,
                        snapshotBytesUnchanged=True))
assert len(used)==2 and slot()==owner and sha(script.read_bytes())==script_hash
record=dict(accepted=True,startedAt=started,finishedAt=time.time(),head=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),
            attemptId=receipt['attemptId'],sourceScript=str(script.relative_to(root)),sourceScriptSha256=script_hash,heavySlot=owner,
            inputGate=str(receipt_path),inputGateSha256=sha(receipt_path.read_bytes()),inputGateHeavySlot=receipt['heavySlot'],cases=results)
(out/'readback.json').write_text(json.dumps(record,indent=2)+'\n')
print(json.dumps({'accepted':True,'retirementsVerified':len(results),'head':record['head'],'output':str(out/'readback.json')},indent=2))
