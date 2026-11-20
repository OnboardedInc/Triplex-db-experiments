"""Derive the bare-metal erasure launch and keep its bystander in the affected database."""

import hashlib
import json
from pathlib import Path
import subprocess
import sys

PIN = "4054f548469e57b6aa82b06e93711c39b6867f7c"
BASE = Path("lab/experiments/EXP-DX1/erase1")


def derive(repo):
    assert subprocess.check_output(["git","rev-parse","HEAD"],cwd=repo,text=True).strip() == PIN
    proof = {}
    for name in ("fast.ts","run.ts","server.mjs"):
        file = BASE/name
        raw = (repo/file).read_bytes()
        assert raw == subprocess.check_output(["git","show",f"{PIN}:{file}"],cwd=repo)
        body = raw.decode()

        def replace(old, new):
            nonlocal body
            assert body.count(old) == 1, old
            body = body.replace(old,new)

        if name == "fast.ts":
            replace('import { runtimeApi } from "../../../bench/lib/triplex.ts";\n','')
            replace('''  const quiet = await openComposition("reach", "datomic", f.name + "-quiet");
  const qscope = String(runtimeApi.DatabaseScope.test(f.name + "-quiet"));
  const qdb = "s2-" + Buffer.from(qscope).toString("base64url");
  const quietSubjects = range(4);''','''  // [DX-BM1] Why: keep the independent quiet peer's bystanders in the affected database.
  // Rejected: pricing erasure interference on a second native database.
  const quiet = await openComposition("reach", "datomic", f.name);
  const qdb = f.db;
  const quietSubjects = range(4).map((i) => people + i);''')
            replace('bystander.live.get(subject(0) + attribute)', 'bystander.live.get(subject(quietSubjects[0]!) + attribute)')
            replace('    await client.declareProtection(qdb, [protectedField], true);\n','')
            replace('''    assert(seeded.ok && seeded.value.position === 1);
    bystander.head = seeded.value.position;''','''    assert(seeded.ok && seeded.value.position === local.head + 1);
    local.head = seeded.value.position;
    bystander.head = local.head;''')
            replace('    const a = await traffic("control-before", controlField);',
                    '    bystander.head = local.head;\n    const a = await traffic("control-before", controlField);')
        elif name == "run.ts":
            replace('import("./fast.ts")','import("./.bm1-n20-fast.ts")')
            replace('run.mode === "fast-smoke" ? ([2, 8] as const) : []',
                    'run.mode === "fast-smoke" || process.env.BM1_ERASE_SMALL ? ([2, 8] as const) : []')
        else:
            replace('  people: 100000,','  people: process.env.BM1_ERASE_SMALL ? 128 : 100000,')
            replace('path.join(import.meta.dirname, "run.ts")','path.join(import.meta.dirname, ".bm1-n20-run.ts")')

        derived = repo/file.with_name(".bm1-n20-"+name)
        with derived.open("x") as stream:
            stream.write(body)
        proof[name] = {"original":hashlib.sha256(raw).hexdigest(),"adapted":hashlib.sha256(derived.read_bytes()).hexdigest()}
    return {"source":PIN,"files":proof}


if __name__ == "__main__":
    print(json.dumps(derive(Path(sys.argv[1]).resolve()),indent=2))
