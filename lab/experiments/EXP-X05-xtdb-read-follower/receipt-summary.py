"""EXP-X05: print the receipt fields the report needs that the markdown table leaves out."""
import json
import sys

r = json.load(open(sys.argv[1]))
print('runId', r['runId'], 'kind', r['runKind'])
print('reasons', r['reasons'])
print('tokenCheck equal', r['tokenCheck']['equal'], r['tokenCheck']['minted'], r['tokenCheck']['built'])
print('seed', {k: r['seed'][k] for k in ('subjects', 'ms')}, 'followerCatchUp', r.get('followerCatchUp'))
print('trace', r['trace'])
print('connRss', r.get('connRss'))
print('incidents', json.dumps(r.get('followerIncidents'), indent=0))
print('enginesAtStart writer', {k: r['enginesAtStart']['writer'][k] for k in ('containerId', 'imageId', 'configSha256Label', 'effectiveConfigSha256', 'cpusetCpus', 'memCapBytes')})
print('enginesAtStart follower', {k: r['enginesAtStart']['follower'][k] for k in ('containerId', 'imageId', 'configSha256Label', 'effectiveConfigSha256', 'cpusetCpus', 'memCapBytes', 'mounts')})
print('enginesAtEnd', r['enginesAtEnd'])
print('watermarksAtEnd', r.get('watermarksAtEnd'))
print('logs writer bad', r['logs']['writer']['badLines'], r['logs']['writer']['sample'][:3])
print('logs follower bad', r['logs']['follower']['badLines'])
print('git', r['git']['head'], r['git']['dirty'], r['git']['sourceTreeId'][:16])
for w in r['windows']:
    st = w['stats']
    sp = (w.get('reads') or {}).get('splits')
    print(w['name'], 'followerMemPeakMiB', (st.get('follower') or {}).get('memPeakMiB'), 'writerMemPeakMiB', (st.get('writer') or {}).get('memPeakMiB'),
          'splits', sp, 'capWait', (w.get('reads') or {}).get('capWait'), 'checked', (w.get('reads') or {}).get('checkedRows'), 'lagExcess', w['lag']['excess'].get('p50'),
          'lagF', w['lag']['follower'].get('p50'), w['lag']['follower'].get('p99'), 'lagErr', len(w['lag']['errors']), 'cut', (w.get('blockCut') or {}).get('ms'))
print('e5', json.dumps(r.get('e5'), indent=0)[:2500])
