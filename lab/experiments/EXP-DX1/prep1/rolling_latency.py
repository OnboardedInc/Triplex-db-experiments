"""Partition bound rolling results on the offer clock, retaining unknown HTTP time."""

from bisect import bisect_left, bisect_right
from collections import Counter
import datetime
import math
import re


def spans(result, row, block, member):
    start = int(result["phaseStartNs"])
    due, grant, sent, end = (row[k] for k in ("due", "creditGranted", "sent", "end"))
    received, begun, applied, ready, durable = [
        (n - start) / 1e6 for n in (
            member["read-at"], member["started-at"], member["applied-at"], block["start"], block["end"])]
    g = row["ack"]["timeline"]
    prep, pre_submit, future, response = [g[k] / 1000 for k in (
        "payloadPrepared", "predecessorReady", "completed", "responsePrepared")]
    out = [("creditQueue", due, grant), ("senderEncode", grant, sent)]
    # [DX-PREP1] Why: infer only the bounded shift between the two exact on-side clocks.
    # Rejected: assuming transaction arrival equals socket send or peer response equals append end.
    lo, hi = max(sent, durable - future), min(received - pre_submit, end - response)
    if lo > hi or not 0 <= prep <= pre_submit <= future <= response:
        return [*out, ("unalignedHttp", sent, end)]
    parsed = (lo + hi) / 2
    return [*out, ("transportIn", sent, parsed), ("prepare", parsed, parsed + prep),
            ("predecessor", parsed + prep, parsed + pre_submit), ("submit", parsed + pre_submit, received),
            ("nativeQueue", received, begun), ("apply", begun, applied), ("readyToAppend", applied, ready),
            ("append", ready, durable), ("nativeReply", durable, parsed + future),
            ("response", parsed + future, parsed + response), ("transportOut", parsed + response, end)]


def excess(parts, due, end):
    clip = due + 50
    if clip >= end:
        return {}
    return {stage: max(0.0, hi - max(lo, clip)) for stage, lo, hi in parts}


def safepoints(log):
    dates = []
    for line in log:
        m = re.search(r'Safepoint "([^"]+)".* Total: (\d+) ns', line)
        if not m:
            continue
        when = datetime.datetime.fromisoformat(line.split("]", 1)[0][1:])
        assert when.tzinfo
        end = when.timestamp() * 1000
        dates.append((end - int(m[2]) / 1e6, end, m[1]))
    return sorted(dates)


def overlaps(items, start, stop):
    return sum(max(0, min(b, stop) - max(a, start)) for a, b, *_ in items if a < stop and b > start)


def backlog(rows, seconds):
    offers = sorted(r["due"] for r in rows)
    grants = sorted(r["creditGranted"] for r in rows if "creditGranted" in r)
    acks = sorted(r["end"] for r in rows if r.get("ack"))
    return [[i, bisect_left(offers, i*1000)-bisect_left(grants, i*1000),
             bisect_left(offers, i*1000)-bisect_left(acks, i*1000)] for i in range(seconds+1)]


class PhaseLatency:
    def __init__(self, result, pause_logs=None):
        self.result = result
        self.mid = result["seconds"] * 500
        self.counts = Counter()
        self.amounts = {}
        self.quiet = []
        self.applies = []
        self.pauses = pause_logs or {}

    def add(self, row, block, member):
        start = int(self.result["phaseStartNs"])
        self.applies.append(((member["started-at"]-start)/1e6, (member["applied-at"]-start)/1e6, row["account"]))
        parts = spans(self.result, row, block, member)
        due, end = row["due"], row["end"]
        half = "firstHalf" if due < self.mid else "secondHalf"
        if end - due > 50:
            cut = excess(parts, due, end)
            assert abs(sum(cut.values()) - (end - due - 50)) < 0.002
            for group in (half, half + "Quiet") if row["account"] == 0 else (half,):
                self.counts[group] += 1
                self.amounts.setdefault(group, Counter()).update(cut)
        if row["account"] == 0:
            self.quiet.append((end - due, row, parts))

    def finished(self):
        quiet_order = sorted((item[1] for item in self.quiet), key=lambda row: row["due"])
        prior = {r["id"]: quiet_order[i-1] for i, r in enumerate(quiet_order) if i}
        apply = sorted(self.applies)
        apply_end = []
        for _, end, _ in apply:
            apply_end.append(max(end, apply_end[-1] if apply_end else end))
        quiet_stats = {}
        for cohort in ("whole", "firstHalf", "secondHalf"):
            quiet = sorted(
                (x for x in self.quiet if cohort == "whole" or (x[1]["due"] < self.mid) == (cohort == "firstHalf")),
                key=lambda item: item[0],
            )
            if not quiet:
                continue
            rank = math.ceil(len(quiet) * .99) - 1
            samples = []
            for latency, row, parts in quiet[rank:]:
                previous = prior.get(row["id"])
                own_queue = next(((lo, hi) for name, lo, hi in parts if name == "nativeQueue"), None)
                related = []
                if own_queue:
                    qstart, qend = own_queue
                    i = bisect_right(apply_end, qstart)
                    while i < len(apply) and apply[i][0] < qend:
                        related.append(apply[i])
                        i += 1
                other = None
                if own_queue:
                    left, right = own_queue
                    other = 0
                    for a, b, account in related:
                        if account != 0:
                            other += max(0, min(right, b) - max(left, a))
                            left = max(left, b)
                clock = self.result["phaseWallMs"]
                pauses = {
                    role: overlaps(log, clock+row["due"], clock+row["end"]) for role, log in self.pauses.items()
                }
                samples.append(dict(latencyMs=latency, dueMs=row["due"],
                                    stagesMs={s: b-a for s, a, b in parts}, neighboursAhead=row.get("neighboursAhead"),
                                    precedingQuietPendingMs=max(0, previous["end"]-row["due"]) if previous else 0,
                                    overlappingNeighbourApplyInNativeQueueMs=other, pauseOverlapMs=pauses))
            quiet_stats[cohort] = samples
        return dict(slowCounts=dict(self.counts), excessMs=self.amounts,
                    pendingBySecond=backlog(self.result["rows"], self.result["seconds"]), quietP99RankAndAbove=quiet_stats)
