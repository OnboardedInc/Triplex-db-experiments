import json,sys,argparse
# [EXP-QNODELAY] Why: engine response bodies do not prove a caller connection mode.
# Rejected: taking the profiler environment as historical evidence.
parser=argparse.ArgumentParser()
parser.add_argument("input")
parser.add_argument("--connection-mode",required=True,choices=["keep-alive","per-request"])
args=parser.parse_args()
def emit(*values): print("qleverConnectionMode="+args.connection_mode, "modeEvidence=caller-declared", *values)
d=json.load(open(args.input))
emit('rows',d.get('resultsize'),'time',d.get('time'))
def walk(n,dep=0):
  emit('  '*dep+n['description'][:120],'| rows',n.get('result_rows'),'| op/total ms',n.get('operation_time'),n.get('total_time'),'| est',n.get('estimated_size'),'|',n.get('cache_status'), '|', {k:v for k,v in (n.get('details') or {}).items() if k in ('num-blocks-read','num-blocks-all','num-blocks-with-update','num-elements-read','num-blocks-postprocessed','time-for-reading-blocks')})
  for c in n.get('children',[]): walk(c,dep+1)
walk(d['runtimeInformation']['query_execution_tree'])
