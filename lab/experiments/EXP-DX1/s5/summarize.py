"""[DX-S5] Totals over the fuzzer's logs (s5/clj-run.sh fuzz): saves, modes, writers, outcomes, races, refusals,
deep comparisons and differences, per setting and overall.
usage: python3 -I summarize.py <run directory>..."""
import collections
import glob
import json
import sys

total = collections.Counter()
by_setting = collections.defaultdict(collections.Counter)
modes, writers, outcomes, races, declined, cwriters, coutcomes = (collections.Counter() for _ in range(7))
differences = []
for d in sys.argv[1:]:
    for path in glob.glob(f"{d}/fuzz-*.log"):
        setting = path.rsplit("fuzz-", 1)[1][:-4]
        for line in open(path, errors="replace"):
            if line.startswith("DX-S5_FUZZ "):
                r = json.loads(line.split(" ", 1)[1])
                s = by_setting[setting]
                s["runs"] += 1
                s["serial"] += r["serial"]
                s["concurrent"] += r.get("concurrentSaves", 0)
                s["deep"] += r["deep"]
                s["deepDifferences"] += len(r["deep-differences"])
                s["differences"] += len(r["differences"])
                s["rounds"] += len(r["concurrent"])
                for c in r["concurrent"]:
                    s["roundCommitted"] += c["committed"]
                    s["roundRefused"] += c["refused"]
                    s["replayDifferences"] += len(c["replay-differences"])
                    s["unjustifiedRefusals"] += c["unjustified-count"]
                    s[f"threads{c['threads']}"] += c["saves"]
                    cwriters.update(c["writers"])
                    coutcomes.update(c["outcomes"])
                modes.update(r["modes"])
                writers.update(r["writers"])
                outcomes.update(r["outcomes"])
                races.update(r["races"])
                declined.update(r["declined"])
                differences += r["differences"]
for s in by_setting.values():
    total.update(s)
print(json.dumps({"total": total, "bySetting": by_setting, "serialModes": modes, "serialWriters": writers,
                  "serialOutcomes": outcomes, "serialRaces": races, "declinedReasons": declined,
                  "concurrentWriters": cwriters, "concurrentOutcomes": coutcomes,
                  "firstDifferences": differences[:3]}, indent=1, sort_keys=True))
