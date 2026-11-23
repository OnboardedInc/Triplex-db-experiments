"""[DX-LOAD2] WAL written but not yet reported: redo-LSN advance between checkpoints against pg_stat_wal.

Usage: python3 -I vacuum_lsn.py ROOT. ROOT holds `*-S/postgres.log` (log_checkpoints) and `*-S/counters.ndjson`.
pg_stat_wal counts a backend's WAL only when that backend flushes its statistics; an autovacuum worker on one
large table flushes at the end of the table, so a steady difference is WAL from a long-running vacuum."""
import json,re,sys,glob,datetime,os,bisect
def lsn(s): a,b=s.split('/'); return (int(a,16)<<32)+int(b,16)
for arm in sorted(glob.glob(sys.argv[1]+'/**/1-*-S',recursive=True)):
  S=[json.loads(l) for l in open(arm+'/counters.ndjson')]
  S=[s for s in S if 'pg' in s and 'wal' in s['pg']]
  at=[int(s['wallNs'])/1e6 for s in S]
  cps=[]
  for l in open(arm+'/postgres.log'):
    m=re.search(r'(\d{4}-\d\d-\d\d \d\d:\d\d:\d\d\.\d+) UTC \[\d+\] LOG:  checkpoint complete.*distance=(\d+) kB.*redo lsn=([0-9A-F/]+)',l)
    st=re.search(r'(\d{4}-\d\d-\d\d \d\d:\d\d:\d\d\.\d+) UTC \[\d+\] LOG:  checkpoint starting: (\w+)',l)
    if st: start=datetime.datetime.fromisoformat(st.group(1)).replace(tzinfo=datetime.timezone.utc).timestamp()*1000; kind=st.group(2)
    if m: cps.append((start,kind,int(m.group(2))*1024,lsn(m.group(3))))
  print('##',arm.split('/')[-1])
  for (t0,k0,d0,r0),(t1,k1,d1,r1) in zip(cps,cps[1:]):
    i0=bisect.bisect_left(at,t0); i1=bisect.bisect_left(at,t1)
    if i0>=len(S) or i1>=len(S) or i0==0: 
      print(f'  {datetime.datetime.fromtimestamp(t0/1000, datetime.timezone.utc):%H:%M:%S}->{datetime.datetime.fromtimestamp(t1/1000, datetime.timezone.utc):%H:%M:%S} LSN {(r1-r0)/1e6:8.1f} MB  (no counters)'); continue
    w=S[i1]['pg']['wal']['wal_bytes']-S[i0]['pg']['wal']['wal_bytes']
    print(f'  {datetime.datetime.fromtimestamp(t0/1000, datetime.timezone.utc):%H:%M:%S}->{datetime.datetime.fromtimestamp(t1/1000, datetime.timezone.utc):%H:%M:%S} {k1:4s} LSN advance {(r1-r0)/1e6:8.1f} MB  pg_stat_wal {w/1e6:8.1f} MB  unreported {(r1-r0-w)/1e6:8.1f} MB over {(t1-t0)/1000:.0f} s')
