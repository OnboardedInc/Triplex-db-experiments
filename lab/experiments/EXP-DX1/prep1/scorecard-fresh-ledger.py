"""Recount the checked fresh v0.1 receipt and native clocks. Results are diagnostic."""

import bisect
import collections
import datetime
import gzip
import hashlib
import json
import math
from pathlib import Path
import re
import statistics
import sys
import tarfile

SOURCE = "92f8e6c30db1084b3c00a93d57fed0e8f612e67e"
ARCHIVE = "5c31f5a9512634d92144baff84edd2c3aad8300a06bd281ca9cba8231c00b4ad"
IMAGE = "77d66794d41d321e2fb3daed96c5e9b9f32e6dd760c4ed67923c564861a8a76b"
MS = 1_000_000
CLOCK_ALLOWANCE_MS = 1.0


def sha(path):
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def dist(samples):
    ordered = sorted(samples)
    return {"n": len(ordered), "mean": statistics.mean(ordered), "max": ordered[-1],
            **{p: ordered[math.ceil(f * len(ordered))-1] for p, f in (("p50", .50), ("p95", .95), ("p99", .99))}}


def length(lo, hi):
    return max(0.0, hi-lo)


class Intervals:
    """Ordered non-overlapping spans, or ordered events whose union is requested."""

    def __init__(self, rows):
        self.rows = sorted(rows)
        self.starts = [row[0] for row in self.rows]
        self.ends = []
        for _, hi, *_ in self.rows:
            self.ends.append(max(hi, self.ends[-1] if self.ends else hi))

    def crossing(self, lo, hi):
        first, last = bisect.bisect_right(self.ends, lo), bisect.bisect_left(self.starts, hi)
        for start, end, tag in self.rows[first:last]:
            if (a := max(lo, start)) < (b := min(hi, end)):
                yield a, b, tag

    def total(self, lo, hi):
        n, prior = 0.0, lo
        for start, end, _ in self.crossing(lo, hi):
            n += length(max(start, prior), end)
            prior = max(prior, end)
        return n


def checked_reader(root):
    custody = json.loads((root / "custody.json").read_bytes())
    assert (custody["source"], custody["result"], custody["mode"], custody["exit"], custody["imageSha"]) == (
        SOURCE, "success", "full", 0, IMAGE)
    seen = set()

    def checked(path):
        rel = str(path.relative_to(root))
        expected = custody["files"][rel]
        if rel not in seen:
            assert (path.stat().st_size, sha(path)) == (expected["bytes"], expected["sha256"]), rel
            seen.add(rel)
        return path

    return checked


def native_blocks(path, attempt):
    native, ended = {}, False
    with path.open() as data:
        for line in data:
            block = json.loads(line)
            assert not ended and block["attempt"] == attempt
            if block.get("end") is True:
                assert block == {"attempt": attempt, "end": True, "dropped": 0}
                ended = True
                continue
            assert len(block["members"]) == len(block["bytes"]) and all(b > 0 for b in block["bytes"])
            for m in block["members"]:
                assert m["read-at"] <= m["started-at"] <= m["applied-at"] <= block["start"] <= block["end"]
                key = (block["db"], str(m["t"]))
                assert key not in native
                native[key] = tuple(v/MS for v in (m["read-at"], m["started-at"], m["applied-at"], block["start"], block["end"]))
    assert ended
    return native


def pauses(path):
    rows, cpu, allocation = [], [], []
    with path.open() as data:
        for line in data:
            safe = re.search(r'Safepoint "([^"]+)".* Total: (\d+) ns', line)
            gc = re.search(r'User=([0-9.]+)s Sys=([0-9.]+)s Real=', line)
            stall = re.search(r'Allocation Stall .* ([0-9.]+)ms', line)
            if not (safe or gc or stall):
                continue
            end = datetime.datetime.fromisoformat(line.split("]", 1)[0][1:]).timestamp() * 1000
            if safe:
                rows.append((end-int(safe[2])/MS, end, safe[1]))
            if gc:
                cpu.append((end, float(gc[1])+float(gc[2])))
            if stall:
                allocation.append((end-float(stall[1]), end, "allocation stall"))
    return Intervals(rows), cpu, Intervals(allocation)


def observations(arm, ops, native):
    by_tape = {(x["account"], x["ordinal"]): x for x in ops["tape"]}
    journal = {r["id"]: r for r in ops["journal"]}
    assert len(journal) == arm["terminal"]-arm["firstCut"] == arm["p2"]["receipts"]
    assert sorted(r["position"] for r in journal.values()) == list(range(arm["firstCut"]+1, arm["terminal"]+1))
    assert len(by_tape) == len(ops["writes"]) == arm["p2"]["offered"] and ops["fairCredits"] == 6
    rows, seen = [], set()
    for w in ops["writes"]:
        key = w["account"], w["ordinal"]
        inp = by_tape[key]
        assert key not in seen and (w["subject"], w["width"]) == (inp["subject"], inp["width"])
        assert w["due"] == arm["start"] + inp["ms"] and w["db"] == arm["seed"]["database"]
        assert w["id"] == arm["attempt"] + "-" + inp["version"].replace("/", "-")
        seen.add(key)
        if w["status"] == "expired-before-dispatch":
            assert "receipt" not in w and "dispatched" not in w and w["id"] not in journal
            continue
        assert w["status"] == "acked" and w["due"] <= w["enqueued"] <= w["dispatched"] <= w["sent"] <= w["end"]
        r, j = w["receipt"], journal.pop(w["id"])
        assert (r["p"], r["tx"], r["clock"], r["digest"], w["db"]) == (
            j["position"], j["tx"], j["clock"], j["digest"], j["db"])
        assert r["tx"] == "_tx/" + w["orderedToken"] + "00"
        assert w["stage"]["subjectSave"] == arm["settings"]["observed"]["subjectFunction"]
        assert w["stage"]["subjectOrderedIds"] is True
        rows.append(w)
    assert not journal
    assert len({w["receipt"]["t"] for w in rows}) == len(rows)
    # [DX-PREP1] Why: join native work to the exact observed, checked receipt after tape and journal binding.
    # Rejected: joining by order or by approximate timestamp (the append can hold several members).
    return rows, [native[(w["db"], w["receipt"]["t"])] for w in rows]


def edges(w, n):
    g = w["stage"]["timeline"]
    assert g["requestParsed"] == 0
    prep, ready, submit, done, built = [g[k]/1000 for k in (
        "payloadPrepared", "predecessorReady", "submitted", "completed", "responsePrepared")]
    assert 0 <= prep <= ready <= submit <= done <= built
    return prep, ready, submit, done, built, w["sent"]+ready-n[0], w["end"]-built+done-n[-1]


def partition(w, n, edge, bracket):
    prep, ready, _, done, built, lo, hi = edge
    # [DX-PREP1] Why: preserve exact on-side intervals and bound cross-clock placements by send and ACK.
    # Rejected: mapping logical recordedAt to wall time or treating the post-transact call as an enqueue witness.
    lower, upper = max(bracket[0], lo), min(bracket[1], hi)
    d, sent, ack = (w[k] for k in ("dispatched", "sent", "end"))
    if lower > upper:
        return [(d, sent, "socket"), (sent, ack, "unaligned_http")]
    offset = (lower+upper)/2
    read, started, applied, append, durable = (t+offset for t in n)
    earliest, latest = max(sent, durable-done), min(ack-built, read-ready)
    if earliest > latest:
        return [(d, sent, "socket"), (sent, ack, "unaligned_http")]
    parsed = (earliest+latest)/2
    names = ("socket", "before_handler", "prepare", "predecessor", "native_submit", "tx_queue", "apply",
             "ready_to_append", "append", "native_reply", "gateway_reply", "client_reply")
    stamps = (d, sent, parsed, parsed+prep, parsed+ready, read, started, applied, append, durable,
              parsed+done, parsed+built, ack)
    assert all(a <= b+.001 for a, b in zip(stamps, stamps[1:]))
    return [(lo, hi, name) for lo, hi, name in zip(stamps, stamps[1:], names) if lo < hi]


def elapsed_by_stage(spans, lo, hi):
    out = collections.Counter()
    for start, end, tag in spans:
        out[tag] += length(max(start, lo), min(end, hi))
    return out


def stage_gc(spans, gc, lo, hi):
    out = collections.Counter()
    for a, b, tag in spans:
        role = ("tx" if tag in ("tx_queue", "apply", "ready_to_append", "append") else
                "gw-w" if tag in ("before_handler", "prepare", "predecessor", "gateway_reply") else None)
        if role:
            out[role] += gc[role][0].total(max(lo, a), min(hi, b))
    return out


def cell(arm, ops, native, gc, rate, mode, record):
    rows, times = observations(arm, ops, native)
    start, stop = arm["start"], arm["start"]+90_000
    assert len(rows) == arm["p6"]["totalReceipts"] and (rate, mode == "loaded") == tuple(
        arm["p6"]["quietCell"][k] for k in ("rate", "loaded"))
    in_window = sum(w["end"] < stop for w in rows)
    assert in_window == arm["p6"]["acknowledgedInWindow"]
    relative = [edges(w, n) for w, n in zip(rows, times, strict=True)]
    strict = max(e[-2] for e in relative), min(e[-1] for e in relative)
    bracket = strict[0]-CLOCK_ALLOWANCE_MS, strict[1]+CLOCK_ALLOWANCE_MS
    assert bracket[0] <= bracket[1]
    parts = [partition(w, n, e, bracket) for w, n, e in zip(rows, times, relative, strict=True)]
    seats = collections.defaultdict(list)
    for i, w in enumerate(rows):
        seats[w["fairTurn"]].append(i)
    turns, critical = [], []
    by_turn = {}
    for turn, indices in sorted(seats.items()):
        first = min(rows[i]["dispatched"] for i in indices)
        last = max(indices, key=lambda i: rows[i]["end"])
        end = rows[last]["end"]
        assert 0 < len(indices) <= 6 and (not turns or first >= turns[-1][1])
        by_turn[turn] = (first, end, len(indices))
        turns.append(by_turn[turn])
        critical.extend([(first, rows[last]["dispatched"], "turn_issue"), *parts[last]])
    active = Intervals((a, b, turn) for turn, (a, b, _) in by_turn.items())
    tails = Intervals(critical)
    apply = Intervals((a, b, None) for _, a, b, _, _ in times)
    blocks = sorted({(a, b) for *_, a, b in times})
    append = Intervals((a, b, None) for a, b in blocks)
    native_busy = Intervals([*apply.rows, *append.rows])
    # For wall occupancy the clock envelope is narrow enough to clip by one common midpoint.
    offset = sum(bracket)/2
    measured_start, measured_stop = start-offset, stop-offset
    sample = collections.defaultdict(list)
    excess, slow_time, quiet_excess = collections.Counter(), collections.Counter(), collections.Counter()
    prior_stages, quiet_prior, overlaps, quiet_overlaps = (collections.Counter() for _ in range(4))
    slow_n, quiet_n, unaligned = 0, 0, 0
    slow_ms, quiet_ms, possible_io_ms = 0.0, 0.0, 0.0
    quiet, latency, halves = [], [], []
    offer_bands = collections.Counter()
    eligible_after = {}
    for w, n, e, spans in zip(rows, times, relative, parts, strict=True):
        due, entered, dispatched, ack = (w[k] for k in ("due", "enqueued", "dispatched", "end"))
        total, extra_at = ack-due, due+50
        latency.append(total)
        reads = w["stage"]["nativeIoStats"]["reads"]
        prep, ready, submitted, completed, *_ = e
        read, began, applied, flush, durable = n
        values = {"sender_wakeup": entered-due, "credit_and_admission": dispatched-entered,
                  "http": ack-w["sent"], "prepare": prep, "predecessor": ready-prep,
                  "async_call": submitted-ready, "native_queue": began-read, "apply": applied-began,
                  "ready_to_append": flush-applied, "append": durable-flush, "sql": reads.get("sql", 0),
                  "sql_ms": reads.get("sql-ms", 0), "decode_ms": reads.get("deserialize-ms", 0),
                  **{key: reads.get(key, 0) for key in ("eavt-load", "aevt-load", "avet-load")}}
        for key, value in values.items():
            sample[key].append(value)
        if not w["account"]:
            quiet.append((total, w["id"], values, spans,
                          w["due"], w["enqueued"], w["dispatched"], w["end"], w["fairTurn"],
                          eligible_after.get(w["subject"], entered)))
            eligible_after[w["subject"]] = ack
        if rate in (50, 235):
            offer_bands[int((due-start)/15_000)] += length(extra_at, ack)
        if total <= 50 or (rate not in (50, 235) and w["account"]):
            continue
        factual = spans.copy()
        factual.extend([(due, entered, "sender_wakeup"), (entered, dispatched, "sender_admission")])
        issue_at = by_turn[w["fairTurn"]][0]
        old = tails.crossing(max(extra_at, entered), min(dispatched, issue_at))
        old = list(old)
        historical = elapsed_by_stage(old, extra_at, ack)
        added = elapsed_by_stage(factual, extra_at, ack)
        complete = elapsed_by_stage(factual, due, ack)
        previous_ms = sum(historical.values())
        added["sender_admission"] -= previous_ms
        added["older_fair_turn"] += previous_ms
        complete["older_fair_turn"] += active.total(entered, min(dispatched, issue_at))
        complete["sender_admission"] -= complete["older_fair_turn"]
        assert abs(sum(added.values())-(total-50)) < .002 and abs(sum(complete.values())-total) < .002
        own_gc = stage_gc(spans, gc, extra_at, ack)
        prior_gc = stage_gc(old, gc, extra_at, ack)
        possible_io_ms += min(added["apply"], values["sql_ms"]+values["decode_ms"])
        slow_n += 1
        slow_ms += total-50
        unaligned += bool(added["unaligned_http"])
        excess.update(added); slow_time.update(complete); prior_stages.update(historical); overlaps.update(own_gc+prior_gc)
        if w["account"] == 0:
            quiet_n += 1
            quiet_ms += total-50
            quiet_excess.update(added); quiet_prior.update(historical); quiet_overlaps.update(own_gc+prior_gc)
        if record:
            print(json.dumps({"slot": arm["slot"], "attempt": arm["attempt"], "source": SOURCE,
                              "workload": [rate, mode], "id": w["id"], "account": w["account"],
                              "nativeT": w["receipt"]["t"], "latencyMs": total, "stageMs": complete,
                              "excessMs": added, "olderTurnCriticalMs": historical, "gcOverlapMs": own_gc+prior_gc,
                              "io": reads}, separators=(",", ":")), file=record)
    typical = max(0, math.ceil(.99*len(quiet))-1)
    q99 = sorted(quiet)[typical]
    qtail = []
    for t, key, values, spans, due, entered, dispatched, end, turn, prior_subject_ack in sorted(quiet)[typical:]:
        old_turns = list(active.crossing(entered, min(dispatched, by_turn[turn][0])))
        stages = elapsed_by_stage(spans, due, end)
        old_ms = sum(b-a for a,b,_ in old_turns)
        stages.update({"sender_wakeup": entered-due,
                       "older_fair_turn": old_ms,
                       "sender_admission": dispatched-entered-old_ms})
        qtail.append({"id": key, "latencyMs": t, "stages": stages, "reads": values["sql"],
                      "olderTurns": len(old_turns),
                      "quietSubjectAckPendingMs": length(entered, min(prior_subject_ack, dispatched)),
                      "inheritedStages": elapsed_by_stage(
                          tails.crossing(entered, min(dispatched, by_turn[turn][0])), entered, dispatched),
                      "pauseOverlap": stage_gc(spans, gc, due, end),
                      "inheritedPauseOverlap": stage_gc(
                          tails.crossing(entered, min(dispatched, by_turn[turn][0])), gc, due, end)})
    saves_per_turn = [n for _, _, n in turns]
    turn_start = [a for a, _, _ in turns]
    mid = start+45_000
    for half_start, half_end in ((start, mid), (mid, stop)):
        halves.append({"ack_rate": sum(half_start <= w["end"] < half_end for w in rows)/45,
                       "sender_wait_p99": dist([w["dispatched"]-w["enqueued"] for w in rows
                                              if half_start <= w["due"] < half_end])["p99"]})
    return {"rate": rate, "mode": mode, "all": dist(latency), "inWindow": in_window,
            "stableP99Quiet": q99[0], "quietRankedTails": qtail, "clockEnvelopeMs": bracket[1]-bracket[0],
            "strictClockGapMs": length(strict[1], strict[0]), "unalignedRows": sum(
                any(tag == "unaligned_http" for _, _, tag in p) for p in parts),
            "slow": {"count": slow_n, "excessMs": slow_ms, "stages": excess, "completeStages": slow_time,
                     "olderTurnStages": prior_stages, "gcOverlap": overlaps, "unalignedExcessRows": unaligned,
                     "possibleOwnSqlDecodeMs": possible_io_ms},
            "quietSlow": {"count": quiet_n, "excessMs": quiet_ms, "stages": quiet_excess,
                          "olderTurnStages": quiet_prior, "gcOverlap": quiet_overlaps},
            "service": {key: dist(v) for key, v in sample.items()},
            "appendBlocks": len(blocks), "appendBlocksInWindow": sum(measured_start <= b < measured_stop for _, b in blocks),
            "appendCallsMs": dist([b-a for a,b in blocks]),
            "applyMsInWindow": apply.total(measured_start, measured_stop),
            "appendMsInWindow": append.total(measured_start, measured_stop),
            "applyOrAppendMsInWindow": native_busy.total(measured_start, measured_stop),
            "turn": {"size": dist(saves_per_turn), "full": saves_per_turn.count(6),
                     "duration": dist([b-a for a, b, _ in turns]),
                     "spacing": dist([b-a for a, b in zip(turn_start, turn_start[1:])])}, "half": halves,
            "excessBy15SecondOfferBandMs": offer_bands,
            "safepoints": {role: {"wallMs": data[0].total(start, stop),
                                  "maxMs": max((b-a for a,b,_ in data[0].crossing(start,stop)), default=0),
                                  "loggedGcCpuSeconds": sum(cpu for t,cpu in data[1] if start <= t < stop),
                                  "allocationStallMs": data[2].total(start, stop)} for role,data in gc.items()}}


def run(root, output, archive):
    assert __debug__ and sha(archive) == ARCHIVE
    with tarfile.open(archive, "r|gz") as held:
        first = next(iter(held))
        assert first.name == "custody.json" and held.extractfile(first).read() == (root/first.name).read_bytes()
    checked = checked_reader(root)
    read = lambda p: json.loads(checked(p).read_bytes())
    inputs = read(root/"campaign/input.json")
    assert (inputs["source"], inputs["age"], inputs["imagePin"]) == (SOURCE, "fresh", IMAGE)
    summary, matching = {}, {}
    for name, path in (("headline", "campaign"), ("default", "campaign/server-default/campaign")):
        base = root/path
        prelude = read(base/"loaded/arm.json")
        launch = read(base/"loaded/launch-profile.json")
        check = read(base/"loaded/launch-check.json")
        scope = read(base/"loaded/attempt.json")
        assert (prelude["source"], prelude["slot"], prelude["attempt"]) == (SOURCE, scope["slot"], scope["nonce"])
        assert (launch["source"],launch["prefix"]) == (SOURCE,scope["slot"])
        assert (check["source"],check["slot"],check["attempt"],check["separateWal"]) == (
            SOURCE, scope["slot"], scope["nonce"], name=="headline")
        raw = base/"loaded/engines"/scope["slot"]/"trace/raw"
        evidence = [checked(raw/f"prep1-gc-{role}.log") for role in ("tx","gw-w","gw-r")]
        gc = {role: pauses(f) for role,f in zip(("tx","gw-w","gw-r"),evidence,strict=True)}
        native = native_blocks(checked(raw/"prep1-native.ndjson"), scope["nonce"])
        hardware = {role: read(raw/f"{role}-native-settings.json")["jvm"] for role in gc}
        out = {"slot": scope["slot"], "attempt": scope["nonce"], "cells": [], "policy": launch["policy"],
               "hardware": hardware, "preludeP2": prelude["p2"], "preludeHistory": prelude["p3"]}
        last = prelude["terminal"]
        with gzip.open(output/f"{name}-excess-ledger.ndjson.gz", "xt") as stream:
            for rate in (50,235,394,620):
                for mode in ("alone","loaded"):
                    d = base/f"p6-{rate}-{mode}"
                    hdr = read(d/"arm.json")
                    ops_file = checked(d/"operations.json")
                    assert sha(ops_file) == hdr["observationsSha256"]
                    ops = read(ops_file)
                    assert (hdr["source"], hdr["slot"], hdr["attempt"], hdr["fixture"], hdr["firstCut"]) == (
                        SOURCE, scope["slot"], scope["nonce"], False, last)
                    assert hdr["seed"]["imageSha256"] == IMAGE
                    key = (rate,mode)
                    if key in matching:
                        assert matching[key] == hdr["tapeSha256"]
                    else:
                        matching[key] = hdr["tapeSha256"]
                    out["cells"].append(cell(hdr, ops, native, gc, rate, mode, stream if rate in (50,235) else None))
                    last = hdr["terminal"]
                    del ops
        summary[name] = out
    with (output/"recount.json").open("x") as f:
        json.dump({"source": SOURCE, "archive": ARCHIVE, "arms": summary}, f, indent=2)
        f.write("\n")


if __name__ == "__main__":
    assert len(sys.argv) == 4, "usage: scorecard-fresh-ledger.py UNPACKED OUTPUT ARCHIVE"
    run(*(Path(p) for p in sys.argv[1:]))
