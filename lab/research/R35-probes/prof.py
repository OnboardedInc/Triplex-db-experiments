import json,sys
d=json.load(open(sys.argv[1]))
print('rows',d.get('resultsize'),'time',d.get('time'))
def walk(n,dep=0):
  print('  '*dep+n['description'][:120],'| rows',n.get('result_rows'),'| op/total ms',n.get('operation_time'),n.get('total_time'),'| est',n.get('estimated_size'),'|',n.get('cache_status'), '|', {k:v for k,v in (n.get('details') or {}).items() if k in ('num-blocks-read','num-blocks-all','num-blocks-with-update','num-elements-read','num-blocks-postprocessed','time-for-reading-blocks')})
  for c in n.get('children',[]): walk(c,dep+1)
walk(d['runtimeInformation']['query_execution_tree'])
