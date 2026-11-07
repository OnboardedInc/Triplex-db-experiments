"""Seal the already-restored local package. No live inputs or remote actions."""
from pathlib import Path
from collections import Counter
import base64
import datetime
import hashlib
import json
import stat

OUT = Path(__file__).resolve().parent
SHA = lambda b: hashlib.sha256(b).hexdigest()
GIT = lambda b: hashlib.sha1(f'blob {len(b)}\0'.encode()+b).hexdigest()
now = lambda: datetime.datetime.now(datetime.timezone.utc).isoformat()


def write(name, obj):
    (OUT/name).write_text(json.dumps(obj, indent=2)+'\n')


if __name__ == '__main__':
    assert not (OUT/'CLOSED-PUBLICATION-FILES.json').exists(), 'already sealed; never overwrite'
    evidence = json.loads((OUT/'EVIDENCE-MANIFEST.json').read_text())
    package = json.loads((OUT/'PACKAGE-MANIFEST.json').read_text())
    restore = json.loads((OUT/'RESTORE-VERIFICATION.json').read_text())
    archive = (OUT/package['archive']['path']).read_bytes()
    assert SHA(archive) == package['archive']['sha256'] == restore['archive_sha256']
    assert archive == (OUT/'determinism-repeat.tar.gz').read_bytes() == (OUT/'parts-reconstructed.tar.gz').read_bytes()
    chunks = []
    for part in package['parts']:
        raw = (OUT/part['path']).read_bytes()
        assert len(raw) == part['bytes'] <= 240000 and SHA(raw) == part['sha256']
        part['expected_git_blob_sha1'] = GIT(raw)
        chunks.append(raw)
    assert base64.b64decode(b''.join(chunks), validate=True) == archive
    assert restore['status'] == 'PASS_ALL_MEMBERS_AND_LOGICAL_FILES_RESTORED'
    assert restore['logical_files'] == len(evidence['files']) == 1922
    by_path = {f['path']: f for f in evidence['files']}
    by_source = {f['source_path']: f for f in evidence['files']}
    by_content = {(f['sha256'], f['bytes']): f for f in evidence['files']}
    critical = {
        'python-fp-002/EVIDENCE-MANIFEST.json':'54fc5e6bcdae8c12db965223f8c2bc10ef895193b4071506abff3421ee508ee2',
        'independent-workspace/INDEPENDENT-REPORT.md':'71c0f0080c91921d2954743569997f6356407e89476d5ff98d62e5ef9475b3bf',
        'independent-workspace/candidate001-checker003-final-receipt.json':'b7c5595f3b1a5358e75d3ae626936ea2b52fffc0becf2f6362dbde980a126e93',
        'full-regression/HANDOFF.json':'c31b494516ebf6fd61415a9f5da6d8a2592aa5a93c4d943d1687b7faeefb447f',
        'full-regression/FINAL-CHECK-INDEX.json':'e843bbcfec2035acf7bb401e7e6e2c7ea69e28281f6f12f6c33d7c331f4329c2',
        'full-regression/EVIDENCE-MANIFEST.json':'e9d172649ed8488c1f60ef176fb45cc4f8712e31043f046d5d3a5e76fd1c1a50',
        'code-review-semantics/EVIDENCE-MANIFEST.json':'297a9068cde669c364254b13a8c9a74dd0546c8e4d44f32d66537c70b255ad13',
    }
    for path, expected in critical.items():
        assert by_path[path]['sha256'] == expected, path
    assert 'coordinator/integration/ROOT-INDEPENDENT-156-READBACK.json' in by_path
    assert not any('main-ledger-' in p or 'api-tree-request.json' in p or p.endswith('native-source.diff') for p in by_path)
    # Cross-check command receipt raw-byte closure from captured files only.
    raw_refs, unresolved, content_only = [], [], []
    campaign_receipts = Counter()
    for entry in evidence['files']:
        if not entry['path'].endswith('.receipt.json'):
            continue
        raw = (OUT/'restore-check/evidence'/entry['path']).read_bytes()
        try:
            obj = json.loads(raw)
        except (UnicodeError, json.JSONDecodeError):
            continue
        if not isinstance(obj, dict) or obj.get('schema') != 'td.command_receipt/1':
            continue
        if '/genuine-candidate-' in entry['path'] and '/commands/' in entry['path']:
            campaign_receipts[entry['path'].split('/commands/')[0]] += 1
        for stream in ['stdout','stderr']:
            path = obj[stream+'_path']
            expected = (obj[stream+'_sha256'], obj[stream+'_bytes'])
            actual = by_source.get(path)
            if actual:
                assert (actual['sha256'], actual['bytes']) == expected
                resolution = 'exact captured source path'
            elif expected in by_content:
                actual = by_content[expected]
                resolution = 'exact bytes retained under another captured alias'
                content_only.append({'receipt':entry['path'],'stream':stream,'declared_source_path':path,'retained_as':actual['path']})
            else:
                unresolved.append({'receipt':entry['path'],'stream':stream,'declared_source_path':path,'expected_bytes':expected[1],'expected_sha256':expected[0]})
                continue
            raw_refs.append({'receipt':entry['path'],'stream':stream,'resolution':resolution,'retained_as':actual['path']})
    assert not unresolved, 'raw command receipt reference closure is incomplete'
    final_campaign = 'independent-workspace/checkpoint-003/genuine-candidate-001-checker003-campaign-001'
    original_campaign = 'independent-workspace/checkpoint-002/genuine-candidate-001-workspace-campaign-001'
    partial_campaign = 'independent-original-tmp/checkpoint-002/genuine-candidate-001-run-001'
    assert campaign_receipts[final_campaign] == campaign_receipts[original_campaign] == 156
    assert campaign_receipts[partial_campaign] == 6
    partial_path = partial_campaign+'/commands/006-binary_unicode_order.stdout'
    partial = (OUT/'restore-check/evidence'/partial_path).read_bytes()
    assert len(partial) == 32768 and SHA(partial) == 'f5d2b10a9a58587950e65e67a8678e849656b31e3e5e75b7004f0461e0300918'
    incomplete = False
    try:
        json.loads(partial)
    except (UnicodeError, json.JSONDecodeError):
        incomplete = True
    assert incomplete and partial_campaign+'/commands/006-binary_unicode_order.receipt.json' not in by_path
    submitted = [by_path[f'coordinator/publication/pr7-body-0528-{kind}.txt'] for kind in ['submitted','returned','reread']]
    assert len({(f['bytes'], f['sha256']) for f in submitted}) == 1 and submitted[0]['bytes'] == 11713
    reference = {'status':'PASS_CAPTURED_RAW_REFERENCE_CLOSURE','raw_stream_references_verified':len(raw_refs),
                 'exact_path_or_content_resolution':True,'content_only_resolutions':content_only,
                 'unresolved':unresolved,'app_campaign_receipts':dict(campaign_receipts),
                 'partial006':{'bytes':len(partial),'sha256':SHA(partial),'utf8_valid':True,'complete_json':False,
                               'terminal_receipt':'absent as originally observed; outcome unknown, not passed'},
                 'required_closed_receipts':critical,'PRbody11713_exact_three_copies':True}
    write('RAW-REFERENCE-VERIFICATION.json', reference)
    package['status'] = 'FINAL_CLOSED_LOCAL_PACKAGE_FULL_RESTORE_VERIFIED_NOT_REMOTE_DURABLE'
    package['verification_completed_utc'] = now()
    package['restore_verification_sha256'] = SHA((OUT/'RESTORE-VERIFICATION.json').read_bytes())
    package['raw_reference_verification_sha256'] = SHA((OUT/'RAW-REFERENCE-VERIFICATION.json').read_bytes())
    package['archive']['expected_git_blob_sha1'] = GIT(archive)
    package['archive_embedded_pending_status_is_historical'] = True
    write('PACKAGE-MANIFEST.json', package)
    index = {'status':'SEALED_LOCAL_RESTORE_AND_RAW_REFERENCE_PASS_ROOT_PUBLICATION_REQUIRED',
             'capture_utc':evidence['created_utc'],'verification_completed_utc':package['verification_completed_utc'],
             'archive':package['archive'],'parts':len(package['parts']),'part_max_bytes':240000,
             'logical_paths':len(evidence['files']),'logical_bytes':sum(f['bytes'] for f in evidence['files']),
             'archive_members':restore['archive_members'],'unique_payloads':restore['unique_payloads'],
             'embedded_manifest':{'path':'EVIDENCE-MANIFEST.json','bytes':(OUT/'EVIDENCE-MANIFEST.json').stat().st_size,
                                  'sha256':SHA((OUT/'EVIDENCE-MANIFEST.json').read_bytes()),
                                  'publication':'inside archive only; do not submit as an oversized individual blob'},
             'package_manifest_sha256':SHA((OUT/'PACKAGE-MANIFEST.json').read_bytes()),
             'restoration':restore,'raw_reference_summary':{k:v for k,v in reference.items() if k not in ['content_only_resolutions']},
             'exclusions':{'records':len(json.loads((OUT/'EXCLUSIONS.json').read_text())['records']),
                           'missing_roots':[],'mutable_during_capture':[],'sensitive_content_matches':[],
                           'application_code_binaries_DB_cache_instructions':'excluded; metadata/digests only',
                           'opaque_main_ledger_seeds':'excluded', 'inflight_performance_methods':'excluded'},
             'status_scope':'Embedded earlier pending statuses are historical inputs; this external index and restore PASS supersede them. Not goal3 acceptance/performance or durable publication.',
             'previous_local_capture':{'sha256':'cf047376d5514d7c4f72bbfd76fb110c7c17194033d290413b7d042ab4f54e2a',
                                       'path':'attempt-001-capture/','preserved_not_published':True},
             'goal_state':'1–2 bounded accepted;3 not accepted/performance UNRUN;4–10 queued',
             'remote_actions_by_packager':0}
    write('ARCHIVE-INDEX.json', index)
    with (OUT/'command-exit.jsonl').open('a') as f:
        for command, result in [
            ('python prepare_evidence.py --inventory-only', '0; sanitized inventory, explicit exclusions'),
            ('python prepare_evidence.py; python restore_bundle.py (initial local capture)', '0; deterministic build/parts/full restore; later narrowed by root, retained without deletion'),
            ('python prepare_evidence.py; python restore_bundle.py (final capture)', '0; deterministic build/parts/all 1206 members +1922 logical paths verified'),
            (f'python {__file__}', '0; final part hashes/Git blob identities/raw reference closure/known closed manifests verified; no app execution')]:
            f.write(json.dumps({'utc':now(),'command':command,'exit_code':0,'result':result})+'\n')
    with (OUT/'progress.jsonl').open('a') as f:
        f.write(json.dumps({'utc':now(),'task':'goal3-durable-evidence-prep','worker':'semantics','state':'complete',
                            'summary':'Final package excludes opaque ledger seed. Deterministic tar bytes identical twice;10 Base64 parts reconstruct;1206 members/1922 logical paths hash+mode verify;raw receipt references and original partial006 verified. No remote/application action; root publication still required.',
                            'pending_call':'none','approval':'none','session':'none',
                            'checkpoint':'ARCHIVE-INDEX.json; PACKAGE-MANIFEST.json; RESTORE-VERIFICATION.json; PUBLICATION-PROPOSAL.json',
                            'next':'Root inspects proposal, obtains own write lease/CAS, publishes private checkpoint and verifies read-back; no app acceptance inferred.'})+'\n')
    publish_names=['README.md','ARCHIVE-INDEX.json','PACKAGE-MANIFEST.json','restore_bundle.py',
                   'RESTORE-VERIFICATION.json','EXCLUSIONS.json','RAW-REFERENCE-VERIFICATION.json',
                   'prepare_evidence.py','finalize_package.py','PACKAGING-HISTORY.json','command-exit.jsonl','progress.jsonl']
    publish_names += [p['path'] for p in package['parts']]
    prefix='projects/temporal-datalog/evidence/goal3-20261031-0550'
    proposal=[]
    for name in publish_names:
        p=OUT/name;raw=p.read_bytes()
        assert len(raw)<=240000,name
        proposal.append({'local_path':str(p),'proposed_repo_path':f'{prefix}/{name}',
                         'bytes':len(raw),'sha256':SHA(raw),'expected_git_blob_sha1':GIT(raw),
                         'git_mode':'100644','local_sealed_mode':'0444'})
    plan={'status':'PROPOSAL_ONLY_NO_GIT_OBJECT_OR_REMOTE_WRITE','root_sole_publisher':True,
          'suggested_prefix':prefix,'scope':'root may choose destination; inspect/lease/CAS/read-back required',
          'archive_sha256':SHA(archive),'embedded_inventory_sha256':index['embedded_manifest']['sha256'],
          'file_count':len(proposal),'all_individual_files_at_most_240000_bytes':True,'files':proposal,
          'not_proposed':['oversized embedded EVIDENCE-MANIFEST.json','raw tar/duplicate verification tars','attempt-001-capture','restore-check trees','application source/native/helper/DB binaries','inflight performance methods']}
    write('PUBLICATION-PROPOSAL.json', plan)
    all_closed=[]
    for name in publish_names+['PUBLICATION-PROPOSAL.json']:
        p=OUT/name;p.chmod(0o444);raw=p.read_bytes()
        all_closed.append({'path':name,'bytes':len(raw),'sha256':SHA(raw),'expected_git_blob_sha1':GIT(raw),'mode':'0444'})
    seal={'utc':now(),'status':'CLOSED_READY_FOR_ROOT_INSPECTION_NOT_REMOTE_DURABLE',
          'archive_sha256':SHA(archive),'publication_proposal_sha256':SHA((OUT/'PUBLICATION-PROPOSAL.json').read_bytes()),
          'file_count':len(all_closed),'files':all_closed,'pending_call':'none','approval':'none','session':'none',
          'writes':'only new own packaging directory','application_runtime_remote_calls':0}
    write('CLOSED-PUBLICATION-FILES.json', seal)
    (OUT/'CLOSED-PUBLICATION-FILES.json').chmod(0o444)
    for f in all_closed:
        p=OUT/f['path'];assert SHA(p.read_bytes())==f['sha256'] and stat.S_IMODE(p.stat().st_mode)==0o444
    print(json.dumps({'archive_sha256':SHA(archive),'archive_bytes':len(archive),'parts':len(package['parts']),
                      'logical_paths':len(evidence['files']),'raw_references_verified':len(raw_refs),
                      'publication_files':len(proposal),'proposal_sha256':seal['publication_proposal_sha256'],
                      'closed_manifest_sha256':SHA((OUT/'CLOSED-PUBLICATION-FILES.json').read_bytes()),
                      'pending_call':'none','approval':'none','session':'none','remote_writes':0},indent=2))
