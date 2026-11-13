#!/usr/bin/env python3
# DX-RE1: summarise the transactor's own per-transaction records (:tx/process, logger datomic.transaction)
# and the Postgres statement log of the same run. Usage: python3 -I tx-log-stats.py RUN_DIR
# RUN_DIR is an evidence directory of a `full` trace run (trace/raw/tx-datomic.log.gz and pg.log).
import collections, datetime, gzip, itertools, re, statistics, sys
run = sys.argv[1]
num = lambda k, s: (lambda m: float(m.group(1)) if m else None)(re.search(r':' + re.escape(k) + r' ([0-9.]+)', s))
rows, errors, threads = [], 0, collections.Counter()
for line in gzip.open(run + '/trace/raw/tx-datomic.log.gz', 'rt', errors='replace'):
    if ':tx/process' not in line: continue
    ts, thread = line.split(' ', 2)[:2]
    threads[thread.split('-s2-')[0].split('-s-')[0]] += 1
    if ':msec' not in line: errors += 1; continue
    reads = dict((k, int(v)) for k, v in re.findall(r':(avet|aevt|eavt|vaet|dir|ocache|valcache|memcache|dev|sql|kvc|ddb)\s+(\d+)', line.split(':pf-stats')[0]))
    rows.append(dict(ts=ts, msec=num('msec', line), apply=num('apply-msec', line), datoms=num('datom-count', line),
                     txfn=num('tx-fn-ms', line), api=num('api-ms', line), reads=reads, t=int(num('t', line) or 0)))
def q(xs, p): xs = sorted(xs); return xs[min(len(xs) - 1, int(p * len(xs)))]
print('records', len(rows), 'rejected/no-data records', errors, 'by thread', dict(threads))
for k in ['msec', 'apply', 'txfn', 'api', 'datoms']:
    xs = [r[k] for r in rows if r[k] is not None]
    print(f'{k:7s} p50 {q(xs,.5):7.2f} p90 {q(xs,.9):7.2f} p99 {q(xs,.99):7.2f} max {max(xs):8.2f}')
w = [r['msec'] - r['apply'] for r in rows]
print(f'msec-apply (queue+serialize+log write) p50 {q(w,.5):.2f} p90 {q(w,.9):.2f} p99 {q(w,.99):.2f}')
agg = collections.Counter()
for r in rows: agg.update(r['reads'])
print('mean index/segment reads per tx during apply', {k: round(v / len(rows), 1) for k, v in agg.items()})
storage = [r for r in rows if any(r['reads'].get(k) for k in ('sql', 'dev', 'kvc', 'valcache', 'memcache'))]
print('txes whose apply read from below the object cache', len(storage))
# batches: consecutive writer records with the same millisecond timestamp are one log append (approximation)
b = [len(list(g)) for _, g in itertools.groupby(rows, key=lambda r: r['ts'])]
print('approx log batches', len(b), 'mean txes/batch', round(len(rows) / len(b), 3), 'batch size histogram', dict(collections.Counter(b)))
# Postgres side: statements per backend
stmts = collections.defaultdict(collections.Counter)
pat = re.compile(r'^(\S+) \S+ \S+ UTC \[(\d+)\] LOG:  duration: ([0-9.]+) ms  execute [^:]+: (\w+) ')
for line in open(run + '/pg.log', errors='replace'):
    m = pat.match(line)
    if m: stmts[m.group(2)][m.group(4).lower()] += 1
print('postgres statements by backend', {k: dict(v) for k, v in stmts.items()})
# Steady window: per-transaction storage work, from the transactor log and Postgres log of the same window.
if len(sys.argv) > 3:
    lo, hi = sys.argv[2], sys.argv[3]  # ISO-8601 UTC prefixes, e.g. 2026-11-13T00:53:00
    txs = [r for r in rows if lo <= r['ts'] < hi]
    ev = collections.Counter(); resets = 0; podms = []; valms = []
    for line in gzip.open(run + '/trace/raw/tx-datomic.log.gz', 'rt', errors='replace'):
        ts = line[:23]
        if not (lo <= ts < hi) or 'datomic.kv-cluster' not in line or ':phase :end' not in line: continue
        e = re.search(r':event :kv-cluster/([a-z-]+)', line).group(1); ev[e] += 1
        m = re.search(r':msec ([0-9.]+)', line)
        if e == 'update-pod':
            podms.append(float(m.group(1)) if m else 0)
            if ':etag nil' in line and 'pod-log-tail' in line: resets += 1
        if e == 'create-val' and m: valms.append(float(m.group(1)))
    pg = collections.Counter(); gaps = []; last = {}
    for line in open(run + '/pg.log', errors='replace'):
        m = pat.match(line)
        if not m or not (lo <= m.group(1)[:19] < hi): continue
        kind = m.group(4).lower(); pg[kind] += 1
        pid = m.group(2); t = m.group(1)
        if kind == 'update' and last.get(pid, ('', ''))[0] == 'insert':
            f = lambda s: datetime.datetime.fromisoformat(s[:26])
            gaps.append((f(t) - f(last[pid][1])).total_seconds() * 1000)
        last[pid] = (kind, t)
    n = len(txs)
    print(f'window {lo}..{hi}: {n} txes; storage events', dict(ev), 'tail resets', resets)
    print('  per tx: postgres', {k: round(v / n, 2) for k, v in pg.items()}, 'pod updates', round(ev['update-pod'] / n, 2), 'create-val', round(ev['create-val'] / n, 2))
    if podms: print(f'  update-pod msec p50 {q(podms,.5):.2f} p90 {q(podms,.9):.2f} p99 {q(podms,.99):.2f}')
    if valms: print(f'  create-val msec p50 {q(valms,.5):.2f} p90 {q(valms,.9):.2f} p99 {q(valms,.99):.2f}')
    if gaps: print(f'  insert->update gap on one backend (ms) p50 {q(gaps,.5):.3f} p90 {q(gaps,.9):.3f} p99 {q(gaps,.99):.3f}')
    for k in ['msec', 'apply', 'txfn', 'datoms']:
        xs = [r[k] for r in txs if r[k] is not None]
        print(f'  {k:7s} p50 {q(xs,.5):7.2f} p90 {q(xs,.9):7.2f} p99 {q(xs,.99):7.2f} max {max(xs):8.2f}')
    w = [r['msec'] - r['apply'] for r in txs]
    print(f'  msec-apply p50 {q(w,.5):.2f} p90 {q(w,.9):.2f} p99 {q(w,.99):.2f}')
    agg = collections.Counter()
    for r in txs: agg.update(r['reads'])
    print('  mean reads per tx during apply', {k: round(v / n, 1) for k, v in agg.items()}, 'txes with storage reads in apply', sum(1 for r in txs if r['reads'].get('sql')))
# Join the peer's :peer/transact start/end (gw-w) with the transactor's :tx/process by transaction UUID.
# Timestamps are millisecond log times from one VM clock; each leg carries about +-1 ms of quantisation.
P = lambda s: datetime.datetime.fromisoformat(s[:23])
peer = collections.defaultdict(dict)
for line in gzip.open(run + '/trace/raw/gw-w-datomic.log.gz', 'rt', errors='replace'):
    if ':peer/transact' not in line: continue
    u = re.search(r'#uuid "([0-9a-f-]+)"', line).group(1); ph = re.search(r':phase :(\w+)', line).group(1)
    peer[u][ph] = P(line)
legs = []
for line in gzip.open(run + '/trace/raw/tx-datomic.log.gz', 'rt', errors='replace'):
    if ':tx/process' not in line or ':msec' not in line: continue
    u = re.search(r':txid #uuid "([0-9a-f-]+)"', line).group(1); p = peer.get(u)
    if not p or 'start' not in p or 'end' not in p: continue
    if len(sys.argv) > 3 and not (sys.argv[2] <= line[:23] < sys.argv[3]): continue
    written = P(line); msec = num('msec', line); read = written - datetime.timedelta(milliseconds=msec)
    ms = lambda a, b: (b - a).total_seconds() * 1000
    legs.append((ms(p['start'], p['end']), ms(p['start'], read), msec, ms(written, p['end'])))
if legs:
    print('joined peer/transactor records', len(legs))
    for i, name in enumerate(['peer transact start->end', 'send leg: peer start->transactor read', 'transactor read->log written', 'ack leg: log written->peer end']):
        xs = [l[i] for l in legs]; print(f'  {name:40s} p50 {q(xs,.5):6.2f} p90 {q(xs,.9):6.2f} p99 {q(xs,.99):7.2f}')
