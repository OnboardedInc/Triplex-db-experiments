"""Keep the published numeric-owner fallback to the authorized 235/s tape."""

import hashlib
import json
from pathlib import Path
import subprocess
import sys

PIN = "afd94a9fe0bc2e4485f200bab436c7cb58b289ed"
BASE = Path("lab/experiments/EXP-DX1/prep1")


def derive(repo):
    assert subprocess.check_output(["git","rev-parse","HEAD"],cwd=repo,text=True).strip() == PIN
    proof = {}
    for name in ("server.sh","server-produce.ts","server-tape.ts","server-collect.py"):
        file = BASE/name
        original = (repo/file).read_bytes()
        assert original == subprocess.check_output(["git","show",f"{PIN}:{file}"],cwd=repo)
        body = original.decode()

        def replace(a,b,n=1):
            nonlocal body
            assert body.count(a) == n,(name,a)
            body=body.replace(a,b)

        if name == "server.sh":
            replace('git status --porcelain','git status --porcelain --untracked-files=no')
            replace('bash "$here/server.sh"','bash "$here/.bm1-owner-server.sh"',3)
            replace('$here/server-produce.ts','$here/.bm1-owner-server-produce.ts')
            replace('$here/server-collect.py','$here/.bm1-owner-server-collect.py')
        elif name == "server-produce.ts":
            replace('from "./server-tape.ts"','from "./.bm1-owner-server-tape.ts"')
        elif name == "server-tape.ts":
            # [DX-BM1] Why: use only the baked 235/s offered schedule and reuse its staged existing predecessors.
            # Rejected: running the superseded 394/s dose or fabricating a smaller logical seed.
            replace('export const fairSeconds = 60;', 'export const fairSeconds = process.env.BM1_OWNER_SMALL ? 1 : 60;')
            replace('rate === 235 || rate === 394','rate === 235')
        else:
            replace('import collections','import collections\nimport os')
            replace('for rate in (235, 394) for phase in phases','for rate in (235,) for phase in phases')
            replace('(60 if followup else 144)','((1 if os.environ.get("BM1_OWNER_SMALL") else 60) if followup else 144)')
        target = repo/file.with_name(".bm1-owner-"+name)
        with target.open("x") as stream:
            stream.write(body)
        proof[name] = {"original":hashlib.sha256(original).hexdigest(),"derived":hashlib.sha256(target.read_bytes()).hexdigest()}
    return {"source":PIN,"files":proof}


def validate(root, seconds):
    rows = []
    for name in ("1-group-K","1-old-S","1-fixed-S"):
        directory=root/name
        def read(file):
            return json.loads((directory/file).read_bytes())
        summary, head, complete = (read(file) for file in ("summary.json","header.json","complete.json"))
        assert not summary["fixture"] and summary["source"] == head["commit"] == complete["commit"] == PIN
        assert summary["slot"] == head["slot"] == complete["slot"] and summary["nonce"] == head["nonce"] == complete["nonce"]
        assert head["seconds"] == seconds and head["arm"]["id"] == name
        assert head["arm"]["numericOwner"] == (name=="1-fixed-S")
        solo,load=summary["cells"]
        assert (solo["cell"],load["cell"]) == ("r235-alone","r235-loaded")
        assert solo["offered"] == int(3.5*seconds+.5) and load["offered"] == 235*seconds
        assert solo["durable"] and load["durable"]
        assert (load["prepared"]>0) == name.endswith("-S")
        rows.append(summary)
    return {"source":PIN,"seconds":seconds,"arms":rows}


if __name__ == "__main__":
    action, path, *rest = sys.argv[1:]
    print(json.dumps(derive(Path(path)) if action=="derive" else validate(Path(path),int(rest[0])),indent=2))
