"""Derive a real one-second server collector rehearsal from the pinned PREP1 producer."""

import hashlib
import json
from pathlib import Path
import subprocess
import sys

SOURCE = "7ca8525a9ea0c3810c7af6ba0b5a0e15552dd534"
DIRECTORY = Path("lab/experiments/EXP-DX1/prep1")


def generate(repo):
    assert subprocess.check_output(["git","rev-parse","HEAD"],cwd=repo,text=True).strip() == SOURCE
    outputs = {}
    for filename in ("server.sh","server-produce.ts","server-tape.ts","server-collect.py"):
        path = DIRECTORY/filename
        original = (repo/path).read_bytes()
        assert original == subprocess.check_output(["git","show",f"{SOURCE}:{path}"],cwd=repo)
        text = original.decode()

        def replace(old,new):
            nonlocal text
            assert text.count(old) == 1, (filename, old)
            text = text.replace(old,new)

        if filename == "server.sh":
            replace('-z $(git status --porcelain)', '-z $(git diff --name-only HEAD)')
            replace('producer=(node --import tsx "$here/server-produce.ts")','producer=(node --import tsx "$here/.bm1-small-server-produce.ts")')
            replace('for n in 1 2 4; do','for n in 1; do')
            replace('for entry in 0-K 1-S 2-S 3-K; do','for entry in 0-K 1-S; do')
            replace('bash "$here/server.sh" arm','bash "$here/.bm1-small-server.sh" arm')
            replace('python3 "$here/server-collect.py"','python3 "$here/.bm1-small-server-collect.py"')
        elif filename == "server-tape.ts":
            replace("export const seconds = 144;", "export const seconds = 1;")
        elif filename == "server-collect.py":
            replace('assert header["seconds"] == 144','assert header["seconds"] == 1')
        else:
            replace('} from "./server-tape.ts";','} from "./.bm1-small-server-tape.ts";')
            replace("const population = await seedPooled(c, init.db);\n    let head = population.head;", "let head = 0;")
            replace("    const fields = new Map<string, Row[]>();", '''    // [DX-BM1] Why: real grouped writes authenticate the subject owner from native rows.
    // Rejected: timing a grouped control whose short fixture omitted all ownership facts.
    const ownership = new Map(cells(arms[0]!).flatMap(({ tape }) => tape.map((o) =>
      [root(o.account, o.person), accounts[o.account]!.key] as const)));
    for (let i = 0; i < owners.length; i += 200) {
      const batch = owners.slice(i, i + 200);
      const input = command("smoke-owners-" + i,
        batch.map((e) => fact(e, ":subject/account", ownership.get(e)!)), [], false);
      const ack = (await c.transact(init.db, input)) as Ack;
      assert.equal(ack.operationId, input.operationId);
      assert.equal(Number(ack.position.v), ++head);
    }
    const fields = new Map<string, Row[]>();''')
            replace('      roster: pooledDigest,\n      facts: 16_245_050,\n      fields: [...fields],\n      seeds: population.seeds,',
                    '      roster: digest(Buffer.from(JSON.stringify(owners))),\n      facts: owners.length * 3,\n      fields: [...fields],\n      seeds: [],')
            replace('''  assert.equal(baseline.roster, pooledDigest);
  assert.equal(baseline.facts, 16_245_050);
  assert.deepEqual(
    baseline.seeds.map((s) => [s.account, s.subjects, s.facts]),
    accounts.map((a) => [a.index, 10000, 1_624_505]),
  );''', '''  // [DX-BM1] Why: this short gate requires actual predecessor rows and native ACK/append receipts.
  // Rejected: fabricating a deep seed receipt or substituting the mock transport for the native writer.
  const expected = [...new Set(cells(arm).flatMap((cell) => cell.tape.map((e) => root(e.account, e.person))))].sort();
  assert.equal(baseline.roster, digest(Buffer.from(JSON.stringify(expected))));
  assert.equal(baseline.facts, expected.length * 3);
  assert.deepEqual(baseline.fields.map(([key]) => key), expected);
  assert(baseline.fields.every(([, rows]) => rows.length === 2));''')
        derived = repo/path.with_name(".bm1-small-"+filename)
        with derived.open("x") as output:
            output.write(text)
        outputs[str(derived.relative_to(repo))] = hashlib.sha256(derived.read_bytes()).hexdigest()
    return outputs


def check(root):
    # [DX-BM1] Why: require a fresh native producer/collector agreement under both writer settings.
    # Rejected: accepting a mock ledger as proof the server's live and native append clocks bind.
    result = {}
    for label in ("1-0-K","1-1-S"):
        directory = root/label
        header = json.loads((directory/"header.json").read_bytes())
        summary = json.loads((directory/"summary.json").read_bytes())
        complete = json.loads((directory/"complete.json").read_bytes())
        assert not summary["fixture"] and header["seconds"] == 1
        assert summary["source"] == header["commit"] == complete["commit"] == SOURCE
        assert summary["slot"] == header["slot"] == complete["slot"]
        assert summary["nonce"] == header["nonce"] == complete["nonce"]
        assert len(summary["cells"]) == 8 and all(c["offered"] > 0 for c in summary["cells"])
        assert sum(c["durable"] for c in summary["cells"]) > 0
        assert sum(c["nativeT"] for c in summary["cells"]) > 0
        assert sum(c["prepared"] for c in summary["cells"]) > 0 if label.endswith("S") else all(c["prepared"] == 0 for c in summary["cells"])
        assert summary["rawSha256"]["complete.json"] == hashlib.sha256((directory/"complete.json").read_bytes()).hexdigest()
        result[label] = {"source":SOURCE,"slot":header["slot"],"nonce":header["nonce"],
                         "offered":sum(c["offered"] for c in summary["cells"]),
                         "durable":sum(c["durable"] for c in summary["cells"]),
                         "prepared":sum(c["prepared"] for c in summary["cells"])}
    return result


if __name__ == "__main__":
    action, target = sys.argv[1:]
    assert action in ("prepare","check")
    print(json.dumps((generate if action == "prepare" else check)(Path(target).resolve()), indent=2))
