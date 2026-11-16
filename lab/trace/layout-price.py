#!/usr/bin/env python3
"""[DX-T1-11] Why: price replay deltas separately from observed durable latency. Rejected: turn a datom-only slope into a measured layout win."""
import collections
import hashlib
import json
import math
import pathlib
import random
import statistics as stats
import sys


def median(xs):
    return stats.median(xs)


def fit_line(points):
    x = [p[0] for p in points]
    y = [p[1] for p in points]
    mx, my = stats.mean(x), stats.mean(y)
    xx = sum((a-mx)**2 for a in x)
    if xx <= 0:
        raise ValueError('No size variation')
    slope = sum((a-mx)*(b-my) for a, b in points)/xx
    intercept = my-slope*mx
    residual = [b-intercept-slope*a for a, b in points]
    yy = sum((b-my)**2 for b in y)
    return {'intercept': intercept, 'slope': slope,
            'r2': 1-sum(e*e for e in residual)/yy if yy else None,
            'n': len(points), 'medianAbsoluteError': median([abs(e) for e in residual])}


def robust_slope(points):
    slopes = [(b[1]-a[1])/(b[0]-a[0]) for i, a in enumerate(points) for b in points[i+1:] if b[0]-a[0] >= 8]
    if not slopes:
        raise ValueError('Insufficient within-warm-path size bins')
    return median(slopes)


def interval(xs, rng):
    medians = sorted(median(rng.choices(xs, k=len(xs))) for _ in range(400))
    return [medians[9], medians[389]]


def price(data):
    if data['schema'] != 'triplex.layout-calibration.v1' or len(data['arms']) != 3:
        raise ValueError('Expected complete zero/loaded/zero calibration')
    arms, results = data['arms'], []
    rng = random.Random(1107745)
    for arm in arms:
        replay = arm['replay']
        if len(replay) != 3000 or len({r['operationId'] for r in replay}) != 300:
            raise ValueError('Replay denominator differs')
        indexed = {(r['operationId'], r['shape'], r['round']): r for r in replay}
        originals = [r for r in replay if r['shape'] == 'A' and r['round'] == 0]
        byte_model = fit_line([(r['facts'], r['fressianBytes']) for r in originals])
        warm = [r for r in arm['native'] if r['idleMs'] is not None and 0 <= r['idleMs'] < 50]
        groups = collections.defaultdict(list)
        for r in warm:
            groups[r['facts']].append(r)
        bins = []
        for n, rs in sorted(groups.items()):
            if len(rs) >= 8:
                bins.append({'facts': n, 'n': len(rs), 'datoms': median([r['datoms'] for r in rs]),
                             'bytes': byte_model['intercept']+byte_model['slope']*n,
                             **{k: median([r[k] for r in rs]) for k in ['service', 'peer', 'apply']},
                             'peerRemainder': median([r['peer']-r['apply'] for r in rs])})
        slopes = {k: robust_slope([(r['datoms'], r[k]) for r in bins]) for k in ['service', 'peer', 'apply', 'peerRemainder']}
        # [DX-T1-11] Why: the observed remainder removes native apply before predicting the byte-dependent logging/notification cost.
        # Rejected: double-count the measured replay apply delta, or pretend this observational slope isolates disk sync from CPU/hand-offs.
        datom_model = fit_line([(r['facts'], r['datoms']) for r in bins])
        byte_slope = slopes['peerRemainder']/byte_model['slope']*datom_model['slope']
        mean_bytes = stats.mean(byte_model['intercept']+byte_model['slope']*r['facts'] for r in arm['native'])
        write_slope = (arm['storage']['writeCommitsPerTransaction']-2)/mean_bytes
        # Two durable SQL statements are fixed; the remaining measured writes are amortised byte-driven resets/treeification/background.
        # This is a model of the existing layout, not a transaction-by-transaction SQL identity or a measured new-layout result.
        prediction = []
        for band in ['small', 'medium', 'large']:
            ops = [r['operationId'] for r in originals if r['band'] == band]
            if len(ops) != 100:
                raise ValueError('Expected 100 independent payloads per band')
            band_rows = [r for r in originals if r['band'] == band]
            for shape in 'ABCDE':
                rs = [indexed[(op, shape, round_)] for op in ops for round_ in [0, 1]]
                deltas = [stats.mean(indexed[(op, shape, round_)]['wallMs']-indexed[(op, 'A', round_)]['wallMs']
                                     for round_ in [0, 1]) for op in ops]
                byte_deltas = [indexed[(op, shape, 0)]['fressianBytes']-indexed[(op, 'A', 0)]['fressianBytes'] for op in ops]
                apply_delta, bytes_delta = median(deltas), median(byte_deltas)
                total_delta = apply_delta+byte_slope*bytes_delta
                base_p50 = arm['bands'][band]['wall']['p50']
                key = {'small': '5-10', 'medium': '11-25', 'large': '26-50'}[band]
                window_base = arm['instrument']['definitions']['observed']['bandsAtL256'][key]['p50Ms']
                row = {'band': band, 'shape': shape, 'payloads': 100, 'rounds': 2,
                       'datoms': median([r['datoms'] for r in rs]), 'fressianBytes': median([r['fressianBytes'] for r in rs]),
                       'valueUtf8Bytes': median([r['valueUtf8Bytes'] for r in rs]),
                       'replayApplyMs': median([r['wallMs'] for r in rs]),
                       'replayFunctionMs': median([r['txStats']['tx-fn-ms'] for r in rs]),
                       'replayAvetVisits': median([r['ioStats']['reads'].get('avet', 0) for r in rs]),
                       'replayEavtVisits': median([r['ioStats']['reads'].get('eavt', 0) for r in rs]),
                       'replayAevtVisits': median([r['ioStats']['reads'].get('aevt', 0) for r in rs]),
                       'replaySqlReads': median([r['ioStats']['reads'].get('sql', 0) for r in rs]),
                       'pairedApplyDeltaMs': apply_delta, 'pairedApplyDelta95': interval(deltas, rng),
                       'applySavingFraction': -apply_delta/median([r['wallMs'] for r in band_rows]),
                       'bytesDelta': bytes_delta,
                       'predictedPgCommits': 2+write_slope*median([r['fressianBytes'] for r in rs]),
                       'observedOriginalP50Ms': base_p50, 'predictedOriginalP50Ms': base_p50+total_delta,
                       'observedL256P50Ms': window_base, 'predictedL256P50Ms': window_base+total_delta,
                       'predictedTotalDeltaMs': total_delta, 'logicalRowsEqual': shape != 'D'}
                prediction.append(row)
        results.append({'tag': arm['tag'], 'level': arm['level'], 'host': arm['host'], 'replayHost': arm['replayHost'], 'latency': arm['latency'],
                        'slow': arm['slow'], 'byteModel': byte_model, 'datomModel': datom_model, 'warmCount': len(warm), 'warmBins': bins,
                        'nativeMsPerAddedDatom': slopes, 'peerRemainderMsPerKiB': byte_slope*1024,
                        'meanPredictedFressianBytes': mean_bytes, 'writeCommitsPerKiB': write_slope*1024,
                        'storage': arm['storage'], 'prediction': prediction})
    return {'schema': 'triplex.layout-price.v1', 'source': data['source'], 'session': data['prefix'], 'results': results,
            'status': 'observational predictions only; no new-layout durable latency or oracle result',
            'model': 'Band p50 plus paired warm peer apply delta plus native warm peer-minus-apply size slope times byte delta. Queue, idle penalty, TypeScript and readers held unchanged.',
            'units': 'Canonical Datomic Fressian using fixed transaction UUID and speculative native ids; not physical WAL/disk bytes. PG commits include background autocommits.',
            'limits': 'Datoms and bytes co-vary on the current layout. The remainder slope is not causal; no reader overhead, cold-cache 100k, tail interference or P99 benefit is predicted. D lacks exact generated row identities.'}


if __name__ == '__main__':
    if sys.argv[1:] == ['--self-test']:
        f = fit_line([(1, 5), (2, 8), (3, 11)])
        assert f['intercept'] == 2 and f['slope'] == 3 and f['r2'] == 1
        assert robust_slope([(0, 1), (10, 21), (20, 41)]) == 2
        print('linear and robust slope fixtures passed')
    else:
        source = pathlib.Path(sys.argv[1])
        raw = source.read_bytes()
        result = price(json.loads(raw))
        result['calibrationSha256'] = hashlib.sha256(raw).hexdigest()
        result['pricingScriptSha256'] = hashlib.sha256(pathlib.Path(__file__).read_bytes()).hexdigest()
        out = pathlib.Path(sys.argv[2])
        with out.open('x') as f:
            json.dump(result, f, indent=2)
            f.write('\n')
