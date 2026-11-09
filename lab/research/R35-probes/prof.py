import sys,argparse
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "receipts"))
from latency_reader import read_latency_receipt
# [EXP-QNODELAY] Why: engine response bodies do not prove a caller connection mode.
# Rejected: taking the profiler environment as historical evidence.
parser=argparse.ArgumentParser()
parser.add_argument("input")
parser.add_argument("--connection-mode",choices=["keep-alive","per-request"])
args=parser.parse_args()
d=read_latency_receipt(args.input)
if args.connection_mode is not None and args.connection_mode != d["qleverConnectionMode"]:
    parser.error("command-line expectation differs from recorded mode")
def emit(*values): print("qleverConnectionMode="+d["qleverConnectionMode"], *values)
emit('rows',d.get('resultsize'),'time',d.get('time'))
def walk(n,dep=0):
  emit('  '*dep+n['description'][:120],'| rows',n.get('result_rows'),'| op/total ms',n.get('operation_time'),n.get('total_time'),'| est',n.get('estimated_size'),'|',n.get('cache_status'), '|', {k:v for k,v in (n.get('details') or {}).items() if k in ('num-blocks-read','num-blocks-all','num-blocks-with-update','num-elements-read','num-blocks-postprocessed','time-for-reading-blocks')})
  for c in n.get('children',[]): walk(c,dep+1)
walk(d['runtimeInformation']['query_execution_tree'])
