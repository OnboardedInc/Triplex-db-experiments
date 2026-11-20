"""Run the adversarial native gate on fresh in-memory Datomic scopes."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import uuid

java, distribution, output = map(lambda x:Path(x).resolve(),sys.argv[1:4])
gate_name = sys.argv[4] if len(sys.argv) == 5 else "group"
gate = Path("lab/experiments/EXP-DX1/w1/field") / (gate_name + "_test.clj")
if gate_name in ("small", "budget", "prepared", "packed-group"):
    gate = gate.parent.parent / "small" / {"small": "parity.clj", "packed-group": "packed_group.clj"}.get(gate_name, gate.name)
prefix, count, checks = {
    "group": ("W1_NATIVE ", 4, 281),
    "policy": ("W1_FIELD_POLICY ", 3, 357),
    "predecessor": ("W1_PREDECESSOR ", 3, 350),
    "small": ("W1_SMALL_PARITY ", 2, 641),
    "budget": ("W1_BUDGET ", 1, 9),
    "prepared": ("W1_PREPARED ", 1, 266),
    "packed-group": ("W1_PACKED_GROUP ", 1, 17),
}[gate_name]
output.mkdir()
source=Path("packages/datomic/gateway/src").resolve()
codec=Path("packages/datomic/src/codec-spec.json").resolve()
def sha(file):
    return hashlib.sha256(file.read_bytes()).hexdigest()
def inputs():
    files = [codec,*sorted(source.rglob("*.clj")),Path(__file__).resolve()]
    if gate_name != "group":
        files.append(gate.resolve())
    if gate_name == "packed-group":
        files.extend([gate.with_name("native_cost.clj").resolve(), (gate.parent.parent / "field/field_probe.clj").resolve()])
    return {str(file.relative_to(Path.cwd())):sha(file) for file in files}
before=inputs()
jars=[distribution/"peer-1.0.7745.jar",distribution/"datomic-transactor-pro-1.0.7745.jar",*sorted((distribution/"lib").glob("*.jar"))]
classpath=os.pathsep.join(str(f) for f in [source,*jars,distribution/"resources"])
nonce=str(uuid.uuid4())
log=output/"gate.log"
cmd=[java,"-Xms64m","-Xmx512m","-XX:ActiveProcessorCount=2","-Dtriplex.codec.spec="+str(codec),"-cp",classpath,
     "clojure.main",*(["-m","triplex.gateway.group-test",nonce] if gate_name == "group" else [str(gate)])]
with log.open("x") as stream:
    child=subprocess.run(cmd,stdout=stream,stderr=subprocess.STDOUT,env=dict(os.environ,TX2_GROUP_QUEUE_CLOCK="1",
        TX2_GROUP_COMMIT="0",TX2_FIELD_COALESCE="0",TX2_LIVE_PRIORITY="0",TX2_PREDECESSOR_LOOKUP="0",TX2_READ_ATTRIBUTION="0",
        W1_ATTEMPT=nonce,W1_PROOF_URI="datomic:mem://{db}"))
assert child.returncode==0 and before==inputs()
end=[json.loads(line[len(prefix):]) for line in log.read_text().splitlines() if line.startswith(prefix)]
assert len(end)==1 and end[0]["attempt"]==nonce and end[0]["test"]==count and end[0]["pass"]==checks and end[0]["error"]==end[0]["fail"]==0, end
(output/"verified.json").write_text(json.dumps({"attempt":nonce,"slot":"fresh-in-process-datomic","gate":gate_name,"summary":end[0],"log":sha(log),
    "source":before,"java":sha(java),"jars":{p.name:sha(p) for p in jars}},indent=2)+"\n")
