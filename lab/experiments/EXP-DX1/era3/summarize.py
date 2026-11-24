#!/usr/bin/env python3
"""[DX-ERA3] Summarise fuzzer runs of era3/attack.clj: violations by message, outcome tallies, and the exact coverage
of each schedule dimension (the schedules are regenerated from the run's seed with Java's java.util.Random, and the
regeneration is checked against the schedules named in the run's violation lines).
Usage: summarize.py RUN_DIR... (each RUN_DIR holds run.log; the mode and seed are read from it and its name)."""
import collections, json, re, sys

MASK = (1 << 48) - 1

class JavaRandom:
    def __init__(self, seed): self.seed = (seed ^ 0x5DEECE66D) & MASK
    def next(self, bits):
        self.seed = (self.seed * 0x5DEECE66D + 0xB) & MASK
        r = self.seed >> (48 - bits)
        return r - (1 << 32) if r & (1 << 31) else r
    def next_int(self, bound):
        if bound & (bound - 1) == 0: return (bound * self.next(31)) >> 31
        while True:
            bits = self.next(31); val = bits % bound
            if bits - val + (bound - 1) < (1 << 31): return val

def dims(subject):
    return [("kind", ["fact", "retire", "creation", "import", "import-s", "other-subject", "other-account"]),
            ("release", ["before", "after-intent", "in-commit", "after-hold", "after-native", "after-reply", "after-resume"]),
            ("stop", ["none", "none", "before-native", "after-native", "at-publish"] + (["after-guard"] if subject else [])),
            ("during", ["none", "derived-any", "derived-acct", "replay", "save-s", "save-child", "other-removal", "read"]),
            ("resume", ["same", "restart"] + (["mixed"] if subject else [])),
            ("resend", ["none", "removal", "save"])]

def schedules(seed, n, subject):
    r = JavaRandom(seed); out = []
    for _ in range(n):
        s = {k: v[r.next_int(len(v))] for k, v in dims(subject)}
        s["narrow"] = 1 if r.next_int(3) == 0 else 2
        out.append(s)
    return out

def label_of(s):
    return "{:kind :%s, :release :%s, :stop :%s, :during :%s, :resume :%s, :resend :%s}" % tuple(
        s[k] for k in ["kind", "release", "stop", "during", "resume", "resend"])

total = collections.Counter(); messages = collections.Counter(); coverage = collections.defaultdict(collections.Counter)
tallies = collections.Counter(); runs = []
for d in sys.argv[1:]:
    log = open(d + "/run.log").read()
    summary = re.search(r"^ERA3_SUMMARY (\S+) (\{.*\})$", log, re.M)
    mode = summary.group(1) if summary else "?"
    n = int(re.findall(r":schedules (\d+)", log)[-1]) if re.findall(r":schedules (\d+)", log) else 0
    vio = re.findall(r'^ERA3_VIOLATION \S+ \{:case "([^"]*)", :message "([^"]*)"', log, re.M)
    for case, msg in vio:
        if case.startswith("F "): messages[(mode, msg)] += 1
    tally = re.search(r"^ERA3_TALLY \S+ (\{.*\})$", log, re.M)
    if tally:
        for k, v in re.findall(r'"(\[(?:[^"\\]|\\.)*\])" (\d+)', tally.group(1)):
            tallies[(mode, k.replace('\\"', '"'))] += int(v)
    runs.append((d.rstrip("/").split("/")[-1], mode, n, sum(1 for c, _ in vio if c.startswith("F "))))
    total[mode] += n
    # coverage: the seed is in the run's name map below (era3 chain), checked against the violation labels
    seeds = {"f1": 11, "f2": 12, "f3": 13, "f4": 21, "f5": 22, "f6": 31, "c1": 41, "c2": 42, "p1": 11, "p2": 21, "cal": 1, "cal2": 1, "cal3": 1}
    name = d.rstrip("/").split("/")[-1].split("-")[0]
    if name in seeds and n:
        gen = schedules(seeds[name], n, mode == "subject-check")
        labels = {label_of(s) for s in gen}
        named = {c[2:] for c, _ in vio if c.startswith("F ")}
        ok = named <= labels
        runs[-1] = runs[-1] + ("regenerated" if ok else "REGENERATION MISMATCH",)
        if ok:
            for s in gen:
                for k, _ in dims(True): coverage[(mode, k)][s[k]] += 1
                coverage[(mode, "narrow")][s["narrow"]] += 1
                # the guard is taken when the racing save of the subject or named entity lands inside the first try
                # and one narrow try is allowed; the stop after the guard fires only then
                guard = s["release"] == "in-commit" and s["narrow"] == 1 and s["kind"] in ("fact", "retire", "creation", "import", "import-s")
                coverage[(mode, "guard-taken")][guard] += 1
                coverage[(mode, "stopped-after-guard")][guard and s["stop"] == "after-guard"] += 1

print("runs:"); [print("  ", r) for r in runs]
print("schedules per mode:", dict(total))
print("violations by message:"); [print("  %6d %s | %s" % (v, m, msg)) for (m, msg), v in messages.most_common()]
print("coverage:")
for (m, k), c in sorted(coverage.items()): print("  ", m, k, dict(c))
print("tallies:")
for (m, k), v in sorted(tallies.items()):
    if any(x in k for x in (":derived ", "mixed", "first-reply", "counters", "imp2", "resend-save-landed", ":during ", "after-hold")):
        print("  %6d %s %s" % (v, m, k))
