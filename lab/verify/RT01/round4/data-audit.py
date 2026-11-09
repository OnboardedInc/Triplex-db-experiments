# [CX-VRT01-R4] Why: enumerate stored journal cells and metadata tables first, then trace their consumers and temporal lowering. Rejected: searching only function names that the builder chose to change.
import pathlib,subprocess,hashlib,json,datetime
b=pathlib.Path(__file__).resolve().parent;r=b.parents[3];out=b/'data-audit';out.mkdir(exist_ok=True)
files=[p for p in subprocess.check_output(['git','ls-files','packages','experiments','qualification']).decode().splitlines() if pathlib.Path(p).suffix in ['.ts','.mjs','.py','.rs','.cpp','.hpp','.h']]
patterns={'stored-data':r':_tx/|_Transaction|TxAttributes\.|tx_meta|tx_attempts|tx_claims|urn:triplex:(operation|claim|meta)|intents\.jsonl|at_ns|triplex_(commit_position|command_receipts)|COMMAND_RECEIPT_PREFIX|COMMIT_POSITION_KEY|claimIri|metaIri|operationIri', 'consumers':r'transactionRecordFromTriples|transactionRecordsFromTriples|\.transactions\(|\.transaction\(|transactionByCommand|transactionsForEntity', 'time-lowering':r'allValidTime|journalBasis|basis\??\.validAt|valid_from.*<=|valid_to.*>'}
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();before={p:sha(r/p) for p in files};matches={}
for name,pattern in patterns.items():
 parts=[]
 for offset in range(0,len(files),120):
  v=subprocess.run(['rg','-n','--no-heading',pattern,*files[offset:offset+120]],capture_output=True);assert v.returncode in [0,1];parts.append(v.stdout)
 raw=b''.join(parts);(out/(name+'.txt')).write_bytes(raw);matches[name]=sorted(set(line.split(':',1)[0]for line in raw.decode().splitlines()))
after={p:sha(r/p)for p in files};assert before==after
(out/'inventory.json').write_text(json.dumps({'at':datetime.datetime.now(datetime.UTC).isoformat(),'head':subprocess.check_output(['git','rev-parse','HEAD']).decode().strip(),'filesSearched':len(files),'hashes':before,'patterns':patterns,'matchedFiles':matches,'stable':True,'limitation':'Stored-data search and manual call/lowering inspection, not a proof about code absent from this checkout'},indent=2)+'\n')
print({k:len(v)for k,v in matches.items()})
