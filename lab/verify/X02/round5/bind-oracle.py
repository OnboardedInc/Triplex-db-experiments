# [CX-VX02-5] Why: bind the bytecode actually used by the independent lexer oracle.
# Rejected: naming a source tag without the running image and loaded class identity.
from pathlib import Path
import subprocess,os,json
r=Path(__file__).resolve().parent
args=['docker','exec','--env','JDK_JAVA_OPTIONS=','tx2-xtdb-dev','java','-Xmx128m','-XX:MaxDirectMemorySize=16m','-XX:-UsePerfData','-XX:ActiveProcessorCount=1','-cp','xtdb.jar:lib/*','clojure.main','-e',(r/'oracle-class-binding.clj').read_text()]
with (r/'oracle-class-binding.json').open('x')as out,(r/'oracle-class-binding.stderr.txt').open('x')as err:result=subprocess.run(args,text=True,stdout=out,stderr=err,env={**os.environ,'DOCKER_HOST':'unix:///Users/sam/.colima/triplex2/docker.sock'})
(r/'oracle-class-execution.json').write_text(json.dumps({'args':args,'exitCode':result.returncode},indent=2)+'\n')
raise SystemExit(result.returncode)
