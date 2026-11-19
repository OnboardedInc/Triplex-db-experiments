"""Run the adversarial native gate on fresh in-memory Datomic scopes."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import uuid

java, distribution, output = map(lambda x:Path(x).resolve(),sys.argv[1:])
output.mkdir()
source=Path("packages/datomic/gateway/src").resolve()
codec=Path("packages/datomic/src/codec-spec.json").resolve()
def sha(file):
    return hashlib.sha256(file.read_bytes()).hexdigest()
def inputs():
    return {str(file.relative_to(Path.cwd())):sha(file) for file in [codec,*sorted(source.rglob("*.clj"))]}
before=inputs()
jars=[distribution/"peer-1.0.7745.jar",distribution/"datomic-transactor-pro-1.0.7745.jar",*sorted((distribution/"lib").glob("*.jar"))]
classpath=os.pathsep.join(str(f) for f in [source,*jars,distribution/"resources"])
nonce=str(uuid.uuid4())
log=output/"gate.log"
cmd=[java,"-Xms64m","-Xmx512m","-XX:ActiveProcessorCount=2","-Dtriplex.codec.spec="+str(codec),"-cp",classpath,
     "clojure.main","-m","triplex.gateway.group-test",nonce]
with log.open("x") as stream:
    child=subprocess.run(cmd,stdout=stream,stderr=subprocess.STDOUT,env=dict(os.environ,TX2_GROUP_QUEUE_CLOCK="1",W1_PROOF_URI="datomic:mem://{db}"))
assert child.returncode==0 and before==inputs()
end=[json.loads(line[len("W1_NATIVE "):]) for line in log.read_text().splitlines() if line.startswith("W1_NATIVE ")]
assert len(end)==1 and end[0]["attempt"]==nonce and end[0]["test"]==4 and end[0]["pass"]==281 and end[0]["error"]==end[0]["fail"]==0
(output/"verified.json").write_text(json.dumps({"attempt":nonce,"slot":"fresh-in-process-datomic","summary":end[0],"log":sha(log),
    "source":before,"java":sha(java),"jars":{p.name:sha(p) for p in jars}},indent=2)+"\n")
