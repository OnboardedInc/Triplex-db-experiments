"""Adapt the pinned RD1 curve to a verified native fixture with aged record cuts."""

import hashlib
import json
import math
from pathlib import Path
import subprocess
import sys

SOURCE = "5f51de7d6ab09b884df61f5c260db7f6688726c1"
ENTRY = Path("lab/experiments/EXP-DX1/rd1/miss-probe.ts")


def sha(file):
    with file.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def prepare(repo):
    assert subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=repo, text=True).strip() == SOURCE
    original = repo/ENTRY
    body = original.read_text()
    assert subprocess.check_output(["git", "show", f"{SOURCE}:{ENTRY}"], cwd=repo) == original.read_bytes()

    def change(before, after):
        nonlocal body
        assert body.count(before) == 1, before
        body = body.replace(before, after)

    change('import { ids, ownFacts, sharedFacts, SEED_VALID_FROM }', 'import { accountsFor, ids, ownFacts, sharedFacts, SEED_VALID_FROM }')
    change("const samples = [0, 1, 2, 4, 10] as const;", "const samples = [0, 2, 10] as const;")
    change("const count = 24;", """const count = 24;
const nativeSize = Number(process.env.DX_BM1_RD_AGED_SIZE);
const agingWrites = Number(process.env.DX_BM1_RD_AGED_WRITES);
assert((nativeSize === 24 && agingWrites === 32) || (nativeSize === 10_000 && agingWrites === 10_000));
""")
    change("    const all = [...sharedFacts(0), ...roots.flatMap((_, i) => ownFacts(i, 1))];", """    const accounts = accountsFor(nativeSize);
    const all = [
      ...Array.from({ length: accounts }, (_, i) => sharedFacts(i)).flat(),
      ...Array.from({ length: nativeSize }, (_, i) => ownFacts(i, accounts)).flat(),
    ];""")
    change('    const head = await commit(more(2), "head");', """    // [DX-BM1] Why: price unavailable old record cuts with real intervening writes on the same database.
    // Rejected: calling two immediately preceding setup receipts an aged server database.
    const ageStart = clock();
    const revisions = new Map<number, string[]>();
    const ages = [];
    for (let i = 0; i < agingWrites; i++) {
      const subject = (i * 31) % nativeSize;
      const root = ids.placement(subject);
      const previous = revisions.get(subject) ?? [];
      const additions = Array.from({ length: 5 }, (_, j) => ({
        op: "assert" as const, entityId: root, attribute: ":rd1/age-" + j,
        value: { type: "string" as const, value: i + "/" + j }, validFrom: SEED_VALID_FROM,
      }));
      const operations = [...previous.map((id) => ({ op: "retract" as const, id })), ...additions];
      const start = clock();
      const result = await commit(operations, "age-" + i);
      const end = clock();
      const assertionIds = result.triples.map((r) => r.id);
      assert.equal(assertionIds.length, additions.length);
      revisions.set(subject, assertionIds);
      ages.push({ subject, start, end, p: result.position, t: result.txId, instant: result.instant });
    }
    const head = await commit(more(2), "head");
    fs.writeFileSync(path.join(output!, "age.json"), JSON.stringify({
      source, scope, count: nativeSize, roots: roots.length, planned: agingWrites, ageStart,
      seedFacts: all.length, oldCut: old.position, middleCut: middle.position, head: head.position, ages,
    }) + "\\n", { flag: "wx" });""")
    change('mode === "control" && process.env.TRIPLEX_TRACE_SLOT,', 'mode === "curve" && process.env.TRIPLEX_TRACE_SLOT && process.env.DX_BM1_RD_NATIVE_LOG,')
    change('await run(process.env.TRIPLEX_TRACE_SLOT, async () => "", "control", output!);',
           'await run(process.env.TRIPLEX_TRACE_SLOT, async () => fs.readFileSync(process.env.DX_BM1_RD_NATIVE_LOG!, "utf8"), "curve", output!);')
    # [DX-BM1] Why: the bare-metal stack identifies the reader by role, slot and checkout SHA.
    # Rejected: dropping native binding when the Mac collector's gateway labels differ.
    # The independent collector still verifies the live gateway's separate source-file digest.
    change("  nativeSource: string,\n  requireEvery: boolean,", "  slot: string,\n  requireEvery: boolean,")
    change('      row.source === nativeSource &&\n        row.process === "gateway" &&\n        row.attributes.status === 200 &&\n        row.slot &&\n        row.run === `rd1-${row.slot}` &&',
           '      row.source === source &&\n        row.process === "gw-r" &&\n        row.attributes.status === 200 &&\n        row.slot === slot &&\n        row.run === slot &&')
    change('timing(raw, allMisses[i]!, nativeSource, mode !== "control")',
           'timing(raw, allMisses[i]!, slot, mode !== "control")')
    change('      const direct =\n        treatment === "off" ? await openComposition("reach", "datomic", scope) : undefined;',
           '''      // [DX-BM1] Why: both fallback paths must use the same native read gateway.
      // Rejected: comparing worker installation against a differently placed writer gateway.
      const direct = treatment === "off" ? await (async () => {
        const write = process.env.DATOMIC_URL!;
        process.env.DATOMIC_URL = endpoint;
        try { return await openComposition("reach", "datomic", scope); }
        finally { process.env.DATOMIC_URL = write; }
      })() : undefined;''')
    entry = original.with_name(".bm1-aged-native.ts")
    with entry.open("x") as dest:
        dest.write(body)
    return entry


def collect(out, request):
    # [DX-BM1] Why: check root selection, aging receipts and fixed historical dose before comparing writers or routes.
    # Rejected: borrowing the young ladder result or treating installed cache hits as historical HTTP requests.
    def read(name):
        file = out/name
        assert file.stat().st_mtime >= request["start"]
        return json.loads(file.read_bytes())

    result = read("result.json")
    age = read("age.json")
    assert result["source"] == age["source"] == request["source"] == SOURCE
    assert result["slot"] == request["slot"] and result["scope"] == age["scope"] == "rd1-miss-" + result["nonce"]
    assert result["mode"] == "curve" and result["entrypointSha256"] == request["entrypointSha256"]
    assert result["nativeSha256"] == sha(out/"native.jsonl")
    assert (out.parent/"cleaned-slot").read_text().strip() == request["slot"]
    engine = out.parent/"engines"/request["slot"]
    stack = json.loads((engine/"stack.json").read_bytes())
    assert stack["prefix"] == request["slot"] and stack["gatewaySourceSha256"] == result["nativeSource"]
    roles = {}
    for role, cores in (("tx","0"), ("gw-w","2"), ("gw-r","4,8")):
        container, = [c for c in stack["containers"] if c["name"] == request["slot"]+"-"+role]
        assert container["cpuset"] == cores
        logs = sorted((engine/"trace/raw").glob(role+".log*"))
        bodies = [log.read_bytes() for log in logs]
        assert any(b"Using G1" in body for body in bodies)
        assert any(body.startswith(b"[20") and b"T" in body[:24] for body in bodies)
        roles[role] = dict(collector="G1", coreCount=len(cores.split(",")), id=container["id"],
                           gcLogs={log.name: sha(log) for log in logs})
    assert age["count"] == request["people"] and age["roots"] == 24 and age["seedFacts"] > age["count"]*20
    assert age["planned"] == request["age"] == len(age["ages"])
    assert age["head"] == age["middleCut"] + request["age"] + 1
    assert [c["position"] for c in result["cuts"]] == [age["oldCut"], age["middleCut"], age["head"]]
    assert len({c["modelDigest"] for c in result["cuts"]}) == 3
    assert age["ageStart"] >= request["start"] * 1000
    receipts = set()
    for idx, row in enumerate(age["ages"]):
        assert row["subject"] == (31*idx) % age["count"] and row["p"] == age["middleCut"] + idx + 1
        assert row["t"] not in receipts and row["end"] >= row["start"] >= age["ageStart"]
        receipts.add(row["t"])
    arms = result["arms"]
    expected = [(share, mode) for share in (0, 2, 10) for mode in ("off", "install")]
    assert [(a["oldPer200"], a["treatment"]) for a in arms] == expected + expected[::-1]
    for row in arms:
        assert row["slot"] == request["slot"] and row["nonce"] == result["nonce"]
        assert row["seconds"] == request["seconds"] and row["seats"] == request["seats"] and row["correct"] > 0
        assert row["issued"] == sum(row[k] for k in ("correct", "drain", "cross", "recovery"))
        assert row["goodput"] == row["correct"] / row["seconds"]
        assert row["oldCompleted"] <= row["oldIssued"] and row["fallbacks"] <= row["oldCompleted"]
        assert row["oldIssued"] > 0 if row["oldPer200"] else row["oldIssued"] == 0
        assert math.isclose(row["completedFallbackShare"], row["fallbacks"] / row["correct"])
    return {"source": SOURCE, "slot": request["slot"], "people": age["count"], "ageWrites": request["age"],
            "cutAge": (age["ages"][-1]["end"] - age["ageStart"])/1000, "roles": roles,
            "sourceResultSha256": sha(out/"result.json"), "ageSha256": sha(out/"age.json"),
            "arms": arms}


if __name__ == "__main__":
    args = sys.argv[1:]
    if args[0] == "prepare":
        assert len(args) == 2
        print(prepare(Path(args[1]).resolve()))
    else:
        assert args[0] == "collect" and len(args) == 3
        print(json.dumps(collect(Path(args[1]), json.loads(Path(args[2]).read_bytes())), indent=2))
