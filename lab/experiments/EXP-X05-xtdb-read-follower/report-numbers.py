"""EXP-X05: totals across receipts (checked rows, violations, splits, incidents) and burst time-to-failure."""
import datetime
import json
import sys

tot = dict(rows=0, viol=0, faults=0, splits=0, straddled=0, repeatable=0, showed=0, readErr={})
for f in sys.argv[1:]:
    r = json.load(open(f))
    print('==', r['runId'], 'reasons', r['reasons'])
    for w in r['windows']:
        rd = w.get('reads')
        if rd:
            tot['rows'] += rd['checkedRows']; tot['viol'] += rd['violations']
            tot['faults'] += sum(rd['faults'].values())
            s = rd['splits']; tot['splits'] += s['n']; tot['straddled'] += s['straddled']; tot['repeatable'] += s['repeatable']; tot['showed'] += s['showedStraddledCommand']
            for k, v in rd['errors'].items(): tot['readErr'][k] = tot['readErr'].get(k, 0) + v
        lag = w['lag']
        start = datetime.datetime.fromtimestamp(w['start'] / 1000, datetime.timezone.utc).strftime('%H:%M:%S')
        print(f"  {w['name']:8} start {start} lagF p50/p99 {lag['follower'].get('p50')}/{lag['follower'].get('p99')} lagW p50 {lag['writer'].get('p50')} excess p50/p99 {lag['excess'].get('p50')}/{lag['excess'].get('p99')} lagErrors {len(lag['errors'])}")
    for i in r.get('followerIncidents') or []:
        print('  incident', i['win'], i['at'], (i['cause'] or '')[:90], 'readyAfterS', (i.get('recovery') or {}).get('readyAfterS'))
print(json.dumps(tot))
