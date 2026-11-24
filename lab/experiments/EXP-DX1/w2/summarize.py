"""Summarize DX-W2_COMMIT lines from the paired wide-save measurement (Mac diagnostic)."""
import json
import statistics
import sys
from collections import defaultdict

ARMS = ["general", "general-bounds", "subject-wide"]


def load(paths):
    out = []
    for path in paths:
        for line in open(path, errors="replace"):
            if line.startswith("DX-W2_COMMIT "):
                out.append(json.loads(line.split(" ", 1)[1]))
    return out


def med(xs):
    return statistics.median(xs) if xs else float("nan")


def mean(xs):
    return sum(xs) / len(xs) if xs else float("nan")


def main(paths):
    rows = load(paths)
    groups = defaultdict(list)
    for r in rows:
        groups[(r["phase"], r["kind"], r["size"], r["arm"])].append(r)
    print("| Phase | Kind | Facts | Arm | Commits | Apply ms p50 | Apply ms per fact | SQL reads at the serial point | SQL reads in the gateway | Datoms | Added text bytes |")
    print("| --- | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |")
    summary = {}
    for phase in ("cold", "warm"):
        for kind in ("replace", "first", "mixed"):
            for size in (6, 20, 75, 120):
                for arm in ARMS:
                    g = groups.get((phase, kind, size, arm), [])
                    if not g:
                        continue
                    apply = [r["applyMs"] if r["applyMs"] is not None else r["wallMs"] for r in g]
                    stat = {
                        "n": len(g), "apply": med(apply), "perFact": med([a / r["size"] for a, r in zip(apply, g)]),
                        "txSql": mean([r["tx"].get("sql", 0) for r in g]), "peerSql": mean([r["peer"].get("sql", 0) for r in g]),
                        "datoms": mean([r["datoms"] for r in g]), "bytes": mean([r["addedTextBytes"] for r in g]),
                        "writers": sorted({r["writer"] for r in g}),
                    }
                    summary[f"{phase}/{kind}/{size}/{arm}"] = stat
                    print(f"| {phase} | {kind} | {size} | {arm} | {stat['n']} | {stat['apply']:.2f} | {stat['perFact']:.3f} | "
                          f"{stat['txSql']:.2f} | {stat['peerSql']:.2f} | {stat['datoms']:.0f} | {stat['bytes']:.0f} |")
    # Ratios against the widened per-subject writer, by phase and size (all kinds pooled).
    print()
    print("| Phase | Facts | general / subject-wide apply | general-bounds / subject-wide apply | general SQL at serial point | subject-wide SQL, serial + gateway |")
    print("| --- | ---: | ---: | ---: | ---: | ---: |")
    for phase in ("cold", "warm"):
        for size in (6, 20, 75, 120):
            pick = lambda arm: [r for r in rows if r["phase"] == phase and r["size"] == size and r["arm"] == arm]
            g, b, s = pick("general"), pick("general-bounds"), pick("subject-wide")
            if not (g and s):
                continue
            ms = lambda rs: med([r["applyMs"] if r["applyMs"] is not None else r["wallMs"] for r in rs]) if rs else float("nan")
            ga, ba, sa = ms(g), ms(b), ms(s)
            print(f"| {phase} | {size} | {ga / sa:.2f} | {ba / sa:.2f} | {mean([r['tx'].get('sql', 0) for r in g]):.2f} | "
                  f"{mean([r['tx'].get('sql', 0) for r in s]):.2f} + {mean([r['peer'].get('sql', 0) for r in s]):.2f} |")
    json.dump(summary, sys.stderr, indent=1)


if __name__ == "__main__":
    main(sys.argv[1:])
