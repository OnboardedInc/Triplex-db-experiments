"""Short native prefetch gate and bound collector for the five-arm storage comparison."""

import hashlib
import json
from pathlib import Path
import subprocess
import sys

PIN="d3bd6a8b3e6924ebf5c1b53e77a5ca2d78d6b2f2"
BASE=Path("lab/experiments/EXP-DX1/prep1")
NAMES=("1-group-K","1-old-S","1-fixed-S","1-prefetch-S","1-cache-S")


def derive(repo):
    assert subprocess.check_output(["git","rev-parse","HEAD"],cwd=repo,text=True).strip()==PIN
    proof={}
    for name in ("server.sh","server-produce.ts","server-tape.ts","server-collect.py"):
        path=BASE/name
        original=(repo/path).read_bytes()
        assert original==subprocess.check_output(["git","show",f"{PIN}:{path}"],cwd=repo)
        body=original.decode()
        def replace(old,new,expected=1):
            nonlocal body
            assert body.count(old)==expected,(name,old)
            body=body.replace(old,new)
        if name=="server.sh":
            replace('git status --porcelain','git status --porcelain --untracked-files=no')
            replace('bash "$here/server.sh"','bash "$here/.bm1-storage-server.sh"',3)
            replace('$here/server-produce.ts','$here/.bm1-storage-server-produce.ts')
            replace('$here/server-collect.py','$here/.bm1-storage-server-collect.py')
            replace('cells=(1-group-K 1-old-S 1-fixed-S 1-prefetch-S 1-cache-S)','cells=(1-prefetch-S)')
        elif name=="server-produce.ts":
            replace('from "./server-tape.ts"','from "./.bm1-storage-server-tape.ts"')
        elif name=="server-tape.ts":
            replace('export const fairSeconds = 60;','export const fairSeconds = 1;')
        else:
            replace('(60 if followup else 144)','(1 if followup else 144)')
        # [DX-BM1] Why: validate the new native route on real restored rows before the five unchanged long arms.
        # Rejected: using a simulated transport or changing the main campaign's dose to make a fixture pass.
        target=repo/path.with_name(".bm1-storage-"+name)
        with target.open("x") as stream: stream.write(body)
        proof[name]=dict(original=hashlib.sha256(original).hexdigest(),derived=hashlib.sha256(target.read_bytes()).hexdigest())
    return dict(source=PIN,files=proof)


def checked(root, seconds, since):
    def read(file):
        assert file.stat().st_mtime>=since
        return json.loads(file.read_bytes())
    plan=read(root/"plan.json")
    assert plan["campaign"]=="storage" and plan["seconds"]==seconds and [a["id"] for a in plan["arms"]]==list(NAMES)
    names=("1-prefetch-S",) if seconds==1 else NAMES
    observations=[]
    for name in names:
        directory=root/name
        info, complete, summary=(read(directory/f) for f in ("header.json","complete.json","summary.json"))
        assert info["commit"]==complete["commit"]==summary["source"]==PIN and not summary["fixture"]
        assert info["slot"]==complete["slot"]==summary["slot"] and info["nonce"]==complete["nonce"]==summary["nonce"]
        expected=next(r for r in plan["arms"] if r["id"]==name)
        assert info["arm"]=={k:v for k,v in expected.items() if k!="cells"}
        assert len(summary["cells"])==len(expected["cells"])==4
        for reading, inputs in zip(summary["cells"],expected["cells"],strict=True):
            assert (reading["cell"],reading["offered"])==(inputs["label"],inputs["offered"])
            assert reading["durable"]>0 and (reading["prepared"]>0)==name.endswith("-S")
        seal=directory.parent/"comparison.SEAL.sha256"
        assert summary["seedSha"]==seal.read_text().splitlines()[0].split()[0]
        assert summary["dumpSha"]==seal.read_text().splitlines()[1].split()[0]
        assert summary["planSha"]==hashlib.sha256((root/"plan.json").read_bytes()).hexdigest()
        observations.append(dict(name=name,slot=info["slot"],nonce=info["nonce"],summary=summary))
    return dict(source=PIN,seconds=seconds,observations=observations)


if __name__=="__main__":
    action, path, *args=sys.argv[1:]
    result=derive(Path(path)) if action=="derive" else checked(Path(path),int(args[0]),int(args[1]))
    print(json.dumps(result,indent=2))
