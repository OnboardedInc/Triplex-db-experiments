#!/usr/bin/env python3
import datetime as dt
import json
import math
import pathlib
import re
import sys


def log_number(line, key):
    match = re.search(rf"(?<![\w-]):{key} (\d+(?:\.\d+)?)\b", line)
    return float(match[1]) if match else None


def wall_ms(line):
    return dt.datetime.fromisoformat(line.split()[0]).timestamp() * 1000


def qs(samples):
    latency = sorted(s["ms"] for s in samples)
    n = len(latency)
    return {"n": n, "p50": latency[math.ceil(.5*n)-1] if n else None,
            "p99": latency[math.ceil(.99*n)-1] if n else None}


def check(directory):
    load = lambda f: json.loads((directory/(f+'.json')).read_text())
    inputs, native, outcome, cleanup = map(load, ('inputs','native','result','cleanup'))
    assert inputs['nonce'] == native['nonce'] == outcome['nonce'] == cleanup['nonce']
    assert native['binding'] == outcome['binding']
    assert cleanup['released'] and not cleanup['errors'] and cleanup['removedNetwork']
    assert set(cleanup['removedContainers']) == set(native['containers'].values())
    assert load('driver-exit') == {'code': 0, 'signal': None}
    lines = (directory/'tx.log').read_text().splitlines()
    entries = []
    for i, arm in enumerate(outcome['data']['arms']):
        req = arm['erase']; t = req['t']
        candidates = [l for l in lines if ':event :excise/ents,' in l and log_number(l,'count')==req['requests']
                      and log_number(l,'next-t') >= t and req['submittedAt']-1 <= wall_ms(l) <= req['finishedAt']+1]
        assert len(candidates) == 1, candidates
        native_t = log_number(candidates[0], 'next-t')
        jobs = [l for l in lines if ':event :index/create-index,' in l and log_number(l,'as-of-t') == native_t]
        assert len(jobs) == 1, jobs
        job = jobs[0]; job_ms = log_number(job,'msec'); job_finished = wall_ms(job)
        assert job_finished <= req['finishedAt'] + 1
        start = job_finished - job_ms + req['offset']['high'] + 1
        end = job_finished + req['offset']['low'] - 1
        data = load('traffic-erase-'+str(i))['data']
        control = load('traffic-control-'+str(i))['data']
        assert load('fresh-'+str(i))['data']['t'] == t
        assert len(data['saved']) == len(control['saved']) == (8 if inputs['mode']=='smoke' else 500)
        per_index = {re.search(r'(?<!\S):index :([a-z]+)',l)[1]: log_number(l,'written')
                     for l in lines if ':event :index/merged-index,' in l and log_number(l,'as-of-t')==native_t}
        samples = {name:{'control':qs(control[name]), 'whole':qs(data[name]),
                         'inside':qs([s for s in data[name] if s['start']>=start and s['end']<=end]),
                         'touching':qs([s for s in data[name] if s['start']<end and s['end']>start])}
                   for name in ('saved','reads')}
        replaced = arm['prepared']['before']
        entries.append({'people':len(arm['group']['people']), 'history':arm['group']['depths'],
                        'matched':sum(replaced[k]['datoms'] for k in ('domainHistory','journalHistory')),
                        't':t,'asOfT':int(native_t),'ackMs':req['ackMs'],'syncMs':req['requestToSyncMs'],
                        'indexMs':job_ms,'lastHeldMs':arm['lastPositiveMs'],
                        'segmentsWritten':int(log_number(job,'written')),'directoriesWritten':int(log_number(job,'dirs-written')),
                        'byIndex':per_index,'samples':samples, 'storageObjects': arm['objects']})
    g = outcome['data']['gc']; after = g.get('afterFull',g['afterVacuum'])
    return {'attempt':directory.name,'people':outcome['people'],'facts':outcome['data']['facts'],'entries':entries,
            'gc':{'deleted':g['objects'].get('deleted',{}),'valueBytes':g['before']['valueBytes']-g['afterGC']['valueBytes'],
                  'relationBytes':g['before']['relationBytes']-g['afterGC']['relationBytes'],
                  'afterVacuumBytes':g['before']['relationBytes']-g['afterVacuum']['relationBytes'],
                  'afterFullBytes':g['before']['relationBytes']-after['relationBytes'],
                  'allocatedWalDeltaBytes':after['walBytes']-g['before']['walBytes'],
                  'generatedWalDeltaBytes':after['walWritten']-g['before']['walWritten']}}


for argument in sys.argv[1:]:
    print(json.dumps(check(pathlib.Path(argument)), sort_keys=True))
