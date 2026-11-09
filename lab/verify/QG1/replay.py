#!/usr/bin/env python3
"""Offline retained-byte review. Does not call builder verification code or an engine."""
import argparse
import base64
import gzip
import hashlib
import json
import math
from pathlib import Path
import re
import struct
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[3]
EXP = ROOT / 'lab/experiments/EXP-QG1-qlever-generations'


def sha(b):
    return hashlib.sha256(b).hexdigest()


def read(p):
    p = Path(p)
    if not p.exists():
        p = p.with_name(p.name + '.gz')
    return gzip.decompress(p.read_bytes()) if p.suffix == '.gz' else p.read_bytes()


def js(p):
    return json.loads(read(p))


def compact(v):
    return json.dumps(v, ensure_ascii=False, separators=(',', ':'))


def canonical(rows):
    # [CX-VQG1] Why: preserve duplicate rows and lexical RDF terms; reject count-only
    # identity. Rejected: a set (would hide multiplicity differences).
    assert isinstance(rows, list) and rows
    return sorted(compact(row) for row in rows)


def delta(p):
    # [CX-VQG1] Why: independently decode the upstream v1 envelope, including EOF;
    # rejected: importing the builder's decoder or subtracting live COUNT from base.
    b = read(p)
    assert b[:15] == b'QLEVER.UPDATE\x01\x00'
    at = 15
    def u64():
        nonlocal at
        assert at + 8 <= len(b)
        v, = struct.unpack_from('<Q', b, at)
        at += 8
        return v
    def skip(n):
        nonlocal at
        at += n
        assert at <= len(b)
    assert u64() == 0, 'unsupported blank nodes'
    words = u64()
    for _ in range(words):
        skip(8)
        skip(u64())
    assert u64() == 2
    counts = []
    for _ in range(2):
        n = u64()
        assert n % 4 == 0
        counts.append(n // 4)
        skip(n * 8)
    assert at == len(b)
    return dict(deleted=counts[0], inserted=counts[1], total=sum(counts), words=words, bytes=len(b))


def fit(points):
    n = len(points)
    mx = sum(x for x, _ in points) / n
    my = sum(y for _, y in points) / n
    xx = sum((x-mx)**2 for x, _ in points)
    yy = sum((y-my)**2 for _, y in points)
    xy = sum((x-mx)*(y-my) for x, y in points)
    slope = xy / xx
    residual = sum((y-(my-slope*mx+slope*x))**2 for x, y in points)
    se = math.sqrt(residual / (n-2) / xx)
    return dict(n=n, interceptMs=my-slope*mx, slopeMsPerMillionDelta=slope,
                rSquared=xy*xy/xx/yy, descriptiveSlopeSE=se,
                nominal95CI=[slope-2.570582*se, slope+2.570582*se])


def main():
    a = argparse.ArgumentParser()
    a.add_argument('evidence', type=Path)
    a.add_argument('expected', type=Path)
    a.add_argument('output', type=Path)
    args = a.parse_args()
    assert not args.output.exists()
    e = args.evidence
    report = dict(started=datetime.now(timezone.utc).isoformat(),
                  reviewer='CX-VQG1', subjectCommit='2fb0a49119440b14c93dde7f0ad4b994d70cd4c0',
                  evidence=str(e), scriptSha256=sha(Path(__file__).read_bytes()))
    report['inputHashes'] = {
        str(p.relative_to(ROOT)) if p.is_relative_to(ROOT) else str(p): sha(p.read_bytes())
        for p in [EXP/'SHA256SUMS', args.expected,
                  ROOT/'lab/verify/QG1/expected.mjs',
                  ROOT/'lab/bench/lib/world.ts', ROOT/'lab/bench/lib/samples.ts',
                  ROOT/'lab/bench/lib/rng.ts',
                  ROOT/'packages/qualification/test/c8-reads-never-write.test.ts']
    }
    inventory = {}
    for line in (EXP/'SHA256SUMS').read_text().splitlines():
        h, name = line.split('  ', 1)
        p = e/name
        with p.open('rb') as f:
            actual = hashlib.file_digest(f, 'sha256').hexdigest()
        assert h == actual, name
        inventory[name] = h
    report['inventory'] = dict(matched=len(inventory), bytes=sum((e/n).stat().st_size for n in inventory),
                               unlisted=sorted(str(p.relative_to(e)) for p in e.rglob('*') if p.is_file() and str(p.relative_to(e)) not in inventory))
    print('inventory matched', len(inventory), flush=True)
    # Bind every retained raw request/response pair before using it below.
    requests = {}
    for attempt in ['phase0-attempt1', 'grid-M-attempt2', 'grid-U-attempt2']:
        d = e/attempt
        metas = sorted(d.glob('*.request.json*'), key=lambda p: int(p.name.split('.')[0]))
        reqs = {}
        prev = ''
        for p in metas:
            i = int(p.name.split('.')[0])
            meta = js(p)
            raw = read(d/f'{i}.response')
            assert meta['sha256'] == sha(raw), str(p)
            assert meta['status'] == 200
            assert meta['at'] >= prev
            prev = meta['at']
            reqs[i] = dict(meta=meta, data=json.loads(raw))
        requests[attempt] = reqs
    report['rawPairsVerified'] = {k: len(v) for k, v in requests.items()}
    d = e/'phase0-attempt1'
    receipt = js(d/'receipt.json')
    report['phase0SourceBinding'] = dict(receiptHash=receipt['source']['probe'],
        retainedHash=sha((e/'source-attempt1/probe.mjs').read_bytes()),
        exactRetainedPreimageMatches=receipt['source']['probe'] == sha((e/'source-attempt1/probe.mjs').read_bytes()))
    ci = js(e/'phase0-container.json')[0]
    assert ci['Name'] == '/tx2-qlever-s1'
    assert ci['Config']['Labels']['tx2.holder'] == receipt['owner']['holder'] == 'CX-QG1'
    assert next(m for m in ci['Mounts'] if m['Destination'] == '/seed')['RW'] is False
    assert next(m for m in ci['Mounts'] if m['Destination'] == '/data')['Name'] == 'tx2-qlever-s1-data'
    m = js(d/'measurements.json')
    phase0 = []
    for name, before in m['before'].items():
        after = m['after'][name]
        b, c = [requests['phase0-attempt1'][x['id']] for x in [before, after]]
        assert b['meta']['params'] == c['meta']['params']
        assert receipt['started'] <= b['meta']['at'] < requests['phase0-attempt1'][20]['meta']['at'] < c['meta']['at'] <= receipt['finished']
        assert canonical(b['data']['res']) == canonical(c['data']['res'])
        assert compact(canonical(b['data']['res'])) == before['answer'] == after['answer']
        phase0.append(dict(query=name, beforeId=before['id'], afterId=after['id'], rows=len(b['data']['res']),
                           canonicalSha256=sha(compact(canonical(b['data']['res'])).encode()),
                           orderedRowsEqual=b['data']['res'] == c['data']['res']))
    assert len(phase0) == 8
    report['phase0'] = dict(samples=phase0, copiedDelta=delta(e/'phase0-copy/triplex.update-triples'),
                            containerId=ci['Id'], rebuildMs=requests['phase0-attempt1'][20]['meta']['ms'])
    report['cells'] = []
    expected = js(args.expected)
    expected_by_subject = {s['subject']: s for s in expected['expected']}
    fits = {}
    for arm in ['M', 'U']:
        d = e/f'grid-{arm}-attempt2'
        binding = js(d/'binding.json')
        assert binding['owner']['endpoint'] == 'http://127.0.0.1:7071'
        assert binding['owner']['holder'] == 'CX-QG1'
        assert binding['sources']['grid.mjs'] == sha((e/'source-attempt2/grid.mjs').read_bytes())
        reqs = requests[f'grid-{arm}-attempt2']
        assert min(x['meta']['at'] for x in reqs.values()) >= binding['owner']['createdAt']
        source_test_hash = sha((ROOT/'packages/qualification/test/c8-reads-never-write.test.ts').read_bytes())
        cells = js(d/'summary.json')
        assert len(cells) == 8
        filler = 0
        last_measured_id = 0
        previous_after = 0
        seen = set()
        injections = []
        for c in cells:
            assert c == js(d/(c['label']+'.json'))
            assert c['binding'] == binding
            for side in ['before', 'after']:
                assert delta(d/f'{c["label"]}-{side}.update-triples') == c[side]['deltaTriples']
            assert c['c8']['status'] == c['p4']['status'] == 0
            assert c['c8']['testSha256'] == source_test_hash
            log = read(d/f'{c["label"]}-c8.log').decode()
            assert re.search(r'Tests\s+1 passed \| 1 skipped', log)
            cutoff = min(v[0]['id'] for v in c['results'].values())
            for i in range(last_measured_id+1, cutoff):
                u = reqs[i]['meta']['params'].get('update', '')
                if not u or u == 'INSERT DATA {}' or 'qg1:f05' in u:
                    continue
                assert u.startswith('INSERT DATA { GRAPH ')
                # Use the public wire grammar emitted here: exactly one quad per physical line.
                lines = u[u.index(' { ', len('INSERT DATA { GRAPH '))+3:-4].splitlines()
                count = len(lines)
                # Avoid accepting a partial parser: every line must be one emitted triple.
                line_terms = []
                for line in lines:
                    match = re.fullmatch(r'<urn:triplex:assertion:([^>]+)> <urn:triplex:field:([^>]+)> (.*) \.', line)
                    assert match, line[:200]
                    line_terms.append(match.groups())
                row_ids = [(enc, json.loads(value)) for enc, field, value in line_terms if field == 'id']
                assert count == len(row_ids)*21
                for enc, value in row_ids:
                    assert base64.urlsafe_b64decode(enc + '='*((-len(enc)) % 4)).decode() == value
                    assert enc not in seen
                    seen.add(enc)
                    assert value.startswith('zz-qg1-') if arm == 'M' else ':qg1:' in value
                op = reqs[i]['data']['operations'][0]['delta-triples']
                assert op['difference'] == dict(deleted=0, inserted=count, total=count)
                assert op['operation']['inserted'] == count
                assert op['after']['total']-op['before']['total'] == count
                filler += count
                injections.append(dict(id=i, triples=count, cumulative=filler))
            if c['label'] != 'rebuilt':
                target = int(c['label'][1:])
                assert filler == math.ceil(target/21)*21
                injected_this_cell = filler - (report['cells'][-1]['injectedCumulative'] if report['cells'] and report['cells'][-1]['arm'] == arm else 0)
                assert c['before']['deltaTriples']['total'] == previous_after + injected_this_cell
                assert c['before']['baseTriples'] == 10000000
            p4 = js(d/f'{c["label"]}-p4.json')
            assert p4['subjects'] == expected['manifestSubjects']
            assert p4['basis'] == dict(recordedPosition=expected['basis'], validAt=1700000000000)
            assert [s['subject'] for s in p4['sample']] == list(expected_by_subject)
            for s in p4['sample']:
                ex = expected_by_subject[s['subject']]
                assert s['expectedCount'] == s['actualCount'] == ex['count']
                assert s['expectedSha256'] == s['actualSha256'] == ex['sha256']
                assert s['contentEqual'] is True
            ts = sorted(s['ms'] for s in p4['sample'])
            assert p4['summary'] == dict(n=20, p50=ts[9], p99=ts[-1])
            for name, values in c['results'].items():
                for v in values:
                    raw = reqs[v['id']]['data']
                    assert len(raw['res']) == v['rows']
                    assert sha(compact(raw['res']).encode()) == v['answerSha256']
                    assert raw['runtimeInformation']['query_execution_tree'] == v['tree']
            report['cells'].append(dict(arm=arm, label=c['label'], before=c['before']['deltaTriples']['total'],
                after=c['after']['deltaTriples']['total'], injectedCumulative=filler,
                coldJoinMs=c['results']['join'][0]['ms'], coldBaseMs=c['results']['base'][0]['ms'],
                p4MaxMs=p4['summary']['p99'], p4P50Ms=p4['summary']['p50'],
                pairedC8Rows=[c['results'][k][0]['rows'] for k in ['c8base', 'c8edge']]))
            previous_after = c['after']['deltaTriples']['total']
            last_measured_id = max(v[-1]['id'] for v in c['results'].values())
        report[f'injections{arm}'] = injections
        for q in ['join', 'base']:
            points = [(c['before']['deltaTriples']['total']/1e6, c['results'][q][0]['ms']) for c in cells if c['label'] != 'rebuilt']
            fits[f'{arm}/{q}'] = fit(points)
        for fname, key in [('rebuild.json', None), ('f05.json', 'f05')]:
            obs = js(d/fname)
            b, c = [reqs[obs[side]['id']]['data']['res'] for side in ['before', 'after']]
            assert canonical(b) == canonical(c)
            if key:
                assert b == c == [['"after"']]
        print(arm, '8 cells, injections and persisted counts verified', flush=True)
    report['fits'] = fits
    stored = js(e/'summary-final-reviewed.json')
    for key, value in fits.items():
        for k in ['slopeMsPerMillionDelta', 'rSquared', 'interceptMs']:
            assert math.isclose(value[k], stored['fits'][key][k], rel_tol=1e-12, abs_tol=1e-12)
    report['screening'] = {}
    for arm in ['M', 'U']:
        cells = [c for c in report['cells'] if c['arm'] == arm and c['label'] != 'rebuilt']
        limit = 1.1*cells[0]['p4MaxMs']
        isolated = [c['before'] for c in cells if c['p4MaxMs'] <= limit]
        report['screening'][arm] = dict(baselineMax=cells[0]['p4MaxMs'], limit=limit,
            isolatedPassingDeltas=isolated, maxSampleCandidate=max(isolated),
            firstSampleFailure=next(c['before'] for c in cells if c['p4MaxMs'] > limit),
            iidProbabilitySampleMaxAtLeastPopulationP99=1-0.99**20)
        assert max(isolated) == stored['screening'][arm]['sampleOnlyCandidate']
    report['finished'] = datetime.now(timezone.utc).isoformat()
    # [CX-VQG1] Why: assertions above precede the replay verdict; this is retained-byte
    # consistency for these identified attempts, not independent engine qualification.
    report['result'] = 'RETAINED-BYTE CHECKS COMPLETED; no production threshold or live rerun'
    with args.output.open('x') as f:
        json.dump(report, f, indent=2)
        f.write('\n')
    print('retained-byte replay completed', flush=True)


if __name__ == '__main__':
    main()
