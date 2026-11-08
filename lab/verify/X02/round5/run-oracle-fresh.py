# [CX-VX02-5] Why: read-only, heap-bounded lexer process in the shared resident; SQL is only lexer input data.
# Rejected: a new engine/container, changing resident files, or calling the SQL endpoint with mutations.
from pathlib import Path
import subprocess,os,json,sys,hashlib,datetime
r=Path(__file__).resolve().parent
source=(r/'lexer-oracle-fresh.clj').read_text()
probe='--probe' in sys.argv
inputs=[[str(i),s] for i,s in enumerate(['SELECT 1','/* a /* b */ c */ SELECT 1','a$tag$;DELETE','SELECT $X$雪$X$','/* /* */ SELECT 1','SELECT E\'x\\n\''])] if probe else json.loads((r/'oracle-fresh-inputs.json').read_text())
args=['docker','exec','--env','JDK_JAVA_OPTIONS=','-i','tx2-xtdb-dev','java','-Xmx128m','-XX:MaxDirectMemorySize=16m','-XX:-UsePerfData','-XX:ActiveProcessorCount=1','-cp','xtdb.jar:lib/*','clojure.main','-e',source]
prefix='oracle-fresh-probe' if probe else 'oracle-fresh'
with (r/(prefix+'.jsonl')).open('x') as out,(r/(prefix+'.stderr.txt')).open('x') as err:
 result=subprocess.run(args,input=json.dumps(inputs,ensure_ascii=True),text=True,stdout=out,stderr=err,env={**os.environ,'DOCKER_HOST':'unix:///Users/sam/.colima/triplex2/docker.sock'})
(r/(prefix+'-execution.json')).write_text(json.dumps({'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'args':args,'exitCode':result.returncode,'inputs':len(inputs),'sourceSha256':hashlib.sha256(source.encode()).hexdigest()},indent=2)+'\n')
sys.exit(result.returncode)
