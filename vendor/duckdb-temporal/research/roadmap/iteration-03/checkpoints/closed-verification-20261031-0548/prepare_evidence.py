"""Local evidence packaging only; never imports or executes application code."""
from pathlib import Path, PurePosixPath
from collections import Counter
import argparse
import base64
import datetime
import gzip
import hashlib
import io
import json
import os
import re
import stat
import tarfile

OUT = Path(__file__).resolve().parent
TMP = Path('/tmp/temporal-roadmap-research/iteration-03')
LOG = Path('/workspace/scratch/497cfb3c035e/.agent-logs')
ROOTS = [
    ('native-ir', TMP/'native-ir', False),
    ('python-planner', TMP/'python-planner', True),
    ('python-workspace', LOG/'goal3-python-planner', True),
    ('python-genuine-001', LOG/'goal3-python-planner/genuine-001', True),
    ('python-fp-preparation-001', LOG/'goal3-python-planner/genuine-fp-001', True),
    ('python-fp-002', LOG/'goal3-python-planner/genuine-fp-002', True),
    ('independent-original-tmp', TMP/'independent-acceptance', False),
    ('independent-workspace', LOG/'goal3-independent-acceptance', False),
    ('full-regression', LOG/'goal3-full-regression', True),
    ('coordinator', LOG/'goal3-coordinator', False),
    ('code-review-semantics', TMP/'code-review/semantics', True),
]
ALLOW_SUFFIXES = {'.md','.json','.jsonl','.txt','.log','.py','.program','.exit','.stderr','.stdout','.receipt'}
ALLOW_NAMES = {'HANDOFF-SHA256SUMS'}
SKIP_DIR_EXACT = {'source','build','tmp','data','__pycache__','.git','.codex','.agents',
                  'baseline','freeze-001','freeze-002','development-003','performance-methods-001'}
SECRET_PATTERNS = [re.compile(p) for p in [
    rb'\bgh[pousr]_[A-Za-z0-9]{20,}\b', rb'\bgithub_pat_[A-Za-z0-9_]{20,}\b',
    rb'\bAKIA[0-9A-Z]{16}\b', rb'\bsk-[A-Za-z0-9_-]{35,}\b',
    rb'(?m)^-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----\s*$',
]]
HIDDEN_MARKERS = [b'<persistent_mode>', b'<permissions instructions>',
                  b'## Namespace: functions', b'# Tools\n\nTools are grouped by namespace']
SHA = lambda b: hashlib.sha256(b).hexdigest()
now = lambda: datetime.datetime.now(datetime.timezone.utc).isoformat()


def write_json(name, value):
    (OUT/name).write_text(json.dumps(value, indent=2, ensure_ascii=True)+'\n', encoding='utf-8')


def skip_dir(name):
    return name in SKIP_DIR_EXACT or name.startswith('mirror') or name.startswith('candidate-') or name.startswith('root-candidate-')


def safe_logical(alias, relative):
    name = str(PurePosixPath(alias)/PurePosixPath(relative.as_posix()))
    p = PurePosixPath(name)
    assert not p.is_absolute() and all(x not in ('','.', '..') for x in p.parts)
    return name


def capture():
    entries, excluded, missing, blobs = [], [], [], {}
    for alias, root, top in ROOTS:
        if not root.exists():
            missing.append({'alias':alias,'source':str(root),'reason':'authorized input root missing'})
            continue
        assert not root.is_symlink(), f'input root symlink refused: {root}'
        stack = [root]
        while stack:
            directory = stack.pop()
            for p in sorted(directory.iterdir()):
                relative = p.relative_to(root)
                logical = safe_logical(alias,relative)
                info = p.lstat()
                if p.is_symlink():
                    excluded.append({'path':logical,'source':str(p),'kind':'symlink','reason':'never follow/trust symlinks'})
                    continue
                if stat.S_ISDIR(info.st_mode):
                    if top or skip_dir(p.name):
                        reason = ('top-files-only scope; separately selected evidence subroots have their own aliases' if top
                                  else 'excluded app/source/candidate/build/runtime/cache or in-flight performance tree')
                        excluded.append({'path':logical,'source':str(p),'kind':'directory','reason':reason})
                    else:
                        stack.append(p)
                    continue
                if not stat.S_ISREG(info.st_mode):
                    excluded.append({'path':logical,'source':str(p),'kind':'nonregular','reason':'nonregular input refused'})
                    continue
                reason = None
                if p.name in {'AGENTS.md','SKILL.md'}:
                    reason = 'instruction/skill dump excluded'
                elif p.name.startswith('main-ledger-'):
                    reason = 'opaque main-ledger/user-history seed; outside goal3 evidence scope and root retains publication state'
                elif p.name == 'native-source.diff' or p.name == 'api-tree-request.json':
                    reason = 'inline application source/patch; code retained only on PR7'
                elif p.suffix not in ALLOW_SUFFIXES and p.name not in ALLOW_NAMES:
                    reason = 'binary/generated/archive or non-evidence type; retain identity, not payload'
                if info.st_size > 32 * 1024 * 1024:
                    reason = 'outside bounded text evidence size; not copied'
                if reason:
                    record={'path':logical,'source':str(p),'kind':'file','bytes':info.st_size,'mode':f'{stat.S_IMODE(info.st_mode):04o}','reason':reason}
                    # Hash small excluded files only (never traverse/hash DB trees).
                    if info.st_size <= 2 * 1024 * 1024:
                        record['sha256']=SHA(p.read_bytes())
                    excluded.append(record)
                    continue
                before = p.stat()
                raw = p.read_bytes()
                second = p.read_bytes()
                after = p.stat()
                if raw != second or (before.st_size,before.st_mtime_ns,before.st_ino) != (after.st_size,after.st_mtime_ns,after.st_ino):
                    excluded.append({'path':logical,'source':str(p),'kind':'mutable-file','reason':'changed during consecutive capture reads; not archived'})
                    continue
                if raw.startswith(b'\x7fELF') or raw.startswith(b'PK\x03\x04'):
                    excluded.append({'path':logical,'source':str(p),'kind':'binary','bytes':len(raw),'sha256':SHA(raw),'reason':'binary magic despite evidence-like suffix; excluded'})
                    continue
                if any(pattern.search(raw) for pattern in SECRET_PATTERNS) or any(marker in raw for marker in HIDDEN_MARKERS):
                    excluded.append({'path':logical,'source':str(p),'kind':'sensitive-content','bytes':len(raw),'reason':'credential/private-platform signature; exact content not republished'})
                    continue
                digest=SHA(raw)
                try:
                    raw.decode('utf-8')
                    utf={'valid':True}
                except UnicodeDecodeError as e:
                    utf={'valid':False,'error_start':e.start,'error_end':e.end,'policy':'raw bytes preserved losslessly; never decoded/repaired'}
                entries.append({'path':logical,'source_path':str(p),'bytes':len(raw),'sha256':digest,
                                'mode':f'{stat.S_IMODE(after.st_mode):04o}','utf8':utf,
                                'source_mtime_ns_at_capture':after.st_mtime_ns,
                                'capture':'two consecutive identical reads; selected operational logs are exact cut snapshots, not a claim that their parent task is globally complete'})
                blobs.setdefault(digest,raw)
    entries.sort(key=lambda x:x['path'])
    excluded.sort(key=lambda x:x['path'])
    assert len({x['path'] for x in entries}) == len(entries)
    return entries,excluded,missing,blobs


def fixed_tar(members, destination):
    # Reproducible gzip header and sorted PAX-free fixed metadata.
    with destination.open('wb') as f:
        with gzip.GzipFile(filename='',mode='wb',fileobj=f,mtime=0,compresslevel=9) as z:
            with tarfile.open(fileobj=z,mode='w',format=tarfile.USTAR_FORMAT) as tar:
                for name,raw,mode in sorted(members):
                    info=tarfile.TarInfo(name)
                    info.size=len(raw);info.mode=mode;info.mtime=0
                    info.uid=info.gid=0;info.uname=info.gname=''
                    tar.addfile(info,io.BytesIO(raw))


if __name__ == '__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--inventory-only',action='store_true')
    args=parser.parse_args()
    entries,excluded,missing,blobs=capture()
    summary={'utc':now(),'selected_paths':len(entries),'logical_bytes':sum(x['bytes'] for x in entries),
             'unique_payloads':len(blobs),'unique_payload_bytes':sum(map(len,blobs.values())),
             'invalid_utf8_paths':[x['path'] for x in entries if not x['utf8']['valid']],
             'selected_by_alias':dict(Counter(x['path'].split('/')[0] for x in entries)),
             'excluded_records':len(excluded),'missing_roots':missing,
             'sensitive_exclusions':[x for x in excluded if x['kind']=='sensitive-content'],
             'mutable_exclusions':[x for x in excluded if x['kind']=='mutable-file']}
    write_json('INVENTORY-PREVIEW.json',summary)
    write_json('EXCLUSIONS.json',{'scope':'No excluded payloads are copied; app source is on PR7; old DB archive is metadata only','records':excluded,'missing_roots':missing})
    if args.inventory_only:
        print(json.dumps(summary,indent=2));raise SystemExit(0)
    assert not missing and not summary['sensitive_exclusions'], 'missing/sensitive inputs require root review'
    manifest={'format':'td.goal3.closed-text-evidence/1','created_utc':summary['utc'],
              'status':'LOCAL_RESTORE_VERIFICATION_REQUIRED_NOT_REMOTE_DURABLE',
              'scope':'Closed goal3 verification/research plus exact operational cut snapshots; no app source, binaries, runtime DBs/caches or in-flight performance methods',
              'source_PR7_head':'52b1e81f1d71590bdefb376e62924c9f717d4344',
              'source_manifest_sha256':'5e30c8b2dfaaac103c647a42440fb7d6c39d83846cc107913452b4e62db2c384',
              'native_sha256':'260b430a462a66b53e71728e860e9920b524a31c63dd117158e8524d73353a1a',
              'goal3_accepted':False,'performance':'UNRUN/not included','later_goals':'4–10 queued',
              'payload_layout':'payloads/<sha256>; exact logical paths and original modes reconstructed by restore_bundle.py',
              'root_aliases':[{'alias':a,'source_root':str(r),'selection':'top-files-only' if top else 'recursive allowlist with strict tree exclusions'} for a,r,top in ROOTS],
              'summary':summary,'files':entries}
    write_json('EVIDENCE-MANIFEST.json',manifest)
    required=['README.md','restore_bundle.py','EVIDENCE-MANIFEST.json','EXCLUSIONS.json']
    for name in required:assert (OUT/name).is_file(),name
    members=[(name,(OUT/name).read_bytes(),0o644) for name in required]
    members += [(f'payloads/{digest}',raw,0o444) for digest,raw in blobs.items()]
    archive=OUT/'goal3-closed-evidence.tar.gz'
    fixed_tar(members,archive)
    repeat=OUT/'determinism-repeat.tar.gz'
    fixed_tar(members,repeat)
    raw=archive.read_bytes()
    assert raw==repeat.read_bytes(), 'same fixed members did not produce identical gzip/tar'
    # No cleanup/deletion: retain second archive as a local verification artifact.
    encoded=base64.b64encode(raw)
    parts=[]
    for i,start in enumerate(range(0,len(encoded),240000),1):
        name=f'archive.part{i:04d}.b64';data=encoded[start:start+240000]
        (OUT/name).write_bytes(data)
        assert len(data)<=240000
        parts.append({'path':name,'bytes':len(data),'sha256':SHA(data)})
    reconstructed=base64.b64decode(b''.join((OUT/x['path']).read_bytes() for x in parts),validate=True)
    assert reconstructed==raw
    (OUT/'parts-reconstructed.tar.gz').write_bytes(reconstructed)
    package={'format':'td.goal3.base64-package/1','created_utc':summary['utc'],
             'status':'LOCAL_PARTS_RECONSTRUCTED_PENDING_FULL_RESTORE',
             'archive':{'path':archive.name,'bytes':len(raw),'sha256':SHA(raw)},
             'deterministic_second_build_identical':True,'parts_max_bytes':240000,
             'parts':parts,'parts_reconstructed_sha256':SHA(reconstructed),
             'evidence_manifest_sha256':SHA((OUT/'EVIDENCE-MANIFEST.json').read_bytes()),
             'restore_script_sha256':SHA((OUT/'restore_bundle.py').read_bytes())}
    write_json('PACKAGE-MANIFEST.json',package)
    print(json.dumps({'inventory':summary,'archive':package['archive'],'parts':len(parts),'deterministic':True},indent=2))
