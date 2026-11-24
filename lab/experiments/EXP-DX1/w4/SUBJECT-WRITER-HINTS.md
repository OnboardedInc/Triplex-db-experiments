# Per-subject writer hints with ordered IDs (DX-W4)

North star P2 (saves) and the cold windows of H11.7: a first touch of a subject costs the per-subject ordered writer
about two segment loads inside its serial apply. One option, **default off**; no existing default changes; Datomic is
not modified. Mac work is correctness at toy size; every time below is diagnostic.
[Scope](../../../SCOPE.md) · [North star](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md) ·
[W3's general-writer hints](../w3/GENERAL-WRITER-HINTS.md)

| Option | Process | What it does |
| --- | --- | --- |
| `TX2_SUBJECT_HINTS=1` | write gateway | Installs a lookup-only stored function at scope open (`subject_hints.clj`) and, for each per-subject save, ordered IDs or not, runs it in `d/with … :return-hints true` on the save's plan and passes the hints to `transact-async`. The transaction data and every check are unchanged. |

`stack/up.sh` passes it to the writer only when set, and refuses it without the per-subject writer or beside
`TX2_SUBJECT_PREFETCH=1`. Pass-through only when set: the production gate (`DX_CHK1_HOLDER=DX-W4
DX_W4_SUBJECT_HINTS=0|1 prep1/manage.py …`), the aged gate (`DX_W4_SUBJECT_HINTS=0|1 real2/aged-gate.sh`) and the
restart runner (`TX2_SUBJECT_HINTS=1 jvm1/startup-server.sh …`). Readbacks: the write gateway's
`/v1/db/<db>/write-options` shows `options.subjectHints: true` (absent when off), `/v2/admin/scan-stats` counts
`subjectHints.attached`, and each receipt carries `subjectHintsAttached`.

## 1. Why the old hints were refused with ordered IDs

**The guard is a scope decision, not an exactness fact.** It was written by DX-PREP1 in the same commit that added
ordered IDs (`cf1ecc790`, 2026-11-20 18:47, `manage.py`: "Ordered IDs require the prepared writer without hints"; the
launcher copy in `df307c29c`, 19:21). Neither the commit, its report, `ORDERED-IDS.md`, nor the agent's log gives a
reason. The context does: an hour earlier PREP1's hint arm (`TX2_SUBJECT_PREFETCH`, `d5e2ab5c0`) had fetched 976
segments against 457 without hints on the Mac (historical AVET 337 → 722), and the orchestrator's brief for that part
said to "drop the hint arm, which has already lost" and to remove the reads at their source with ordered IDs instead.
The guard kept a losing arm out of the new arm's measurements.

Each fear the task names, checked against the code:

| Fear | Finding |
| --- | --- |
| Exactness of the ordinal | Not touched. The plan computes `:ordered-bounds` from the journal token and the sorted new-ID prefixes before any hint exists; hints are never read by the plan, the native function or the receipt check. |
| A retried or reordered save | A resend is answered from the operation ID before planning; a save refused at the serial point (`TRIPLEX_SUBJECT_REPLAN`) is retried through the general writer from a fresh view. A hint is taken per submission against the peer's current view and decides nothing. |
| A hint computed before a concurrent save of the same subject | A stale hint names old segments; the transaction runs every check on its own db-before. Shown on the toy below (stale hints give the identical refusal; eight concurrent saves of one subject give one commit and seven `CasConflict` with or without hints). |
| Cost | Real: the lookup runs on the save's own path and the gateway reads cold segments to name them. This was the measured reason the old arm lost (on hashed IDs, before ordered IDs existed). |
| A technical mismatch | The old `prefetch-code` hard-codes the legacy per-ID history probe, not the ordered interval. For ordered IDs that probe's empty-range shortcut scans the same single interval, so it is not wrong, only incomplete: it names the revision and the history range, not the owner's rows or the AEVT checks that make up a first touch. |

So the guard is left as it is (the old option keeps its meaning), and the new option replaces it for this writer.

## 2. What was built

`subject_hints.clj` makes, on the plan's db value, the reads of `subject-save/body` and of Datomic's own checks for
the ops it returns: the operation, claim and journal point lookups (AVET); the scope's flags; the excision check; the
newest position; the owner's ID and revision (EAVT) and the revision's cardinality-one replacement (AEVT); for each
retired and new row of the owner, its EAVT and AEVT neighbourhood and the retirement marker's; the ordered history
interval (or one probe per ID without ordered IDs); the new rows' current AVET. Every lookup that can throw is
swallowed, so a used ID or a missing owner still yields the segments read before it. It returns no datoms.

**An early variant was built and dropped.** I first assumed a hint names only the segments the peer had to load, so
taking it after the plan (which reads the owner on the peer) would miss the owner's EAVT. The probe refutes that: a
hint names the same segments cold or warm (below), and the hint from the raw request equals the hint from the plan
for 32 of 40 subjects in every hinted mode (the other 8 differ; not examined). The variant (`TX2_SUBJECT_HINTS_EARLY`) moved nothing in the arms
(first touch 0.635 against 0.66 reads inside apply per save) and is removed.

## 3. Toy measurements (`w4/gate.sh`, gate3 and gate4)

20,000 subjects × 16 fields, seeded in 400 commits and indexed; real PostgreSQL storage and transactor (Datomic
prefetch on, read back `{:enabled true}` in every transactor JVM), two cores, 128 MB object caches, the server
writer's switches (per-subject writer, numeric owner, ordered IDs). Each arm runs in a fresh JVM after a transactor
restart. A first touch is a one-fact replacement of a subject not saved since the seed; the second save replaces the
first touch's row. Reads inside apply are each transaction's own io-stats (`reads.sql`); reads by process come from
`pg_stat_statements` with the transactor under its own role.

### Arms through the real route handler (200 subjects each, spread over the seed)

| Phase | Reads inside apply per save, off → on | By index, loads inside apply (EAVT / AEVT / AVET), off → on | Apply p50 ms, off → on (diagnostic) |
| --- | --- | --- | --- |
| First touch, one at a time | **1.19 → 0.58** (194 → 100 saves with a read) | 193 / 189 / 9 → 182 / 106 / 2 | 7.12 → 4.70 |
| Second save of the same subject | 0.055 → 0.005 | 4 / 2 / 5 → 2 / 0 / 0 | 1.39 → 1.17 |
| First touch, eight in flight | **0.87 → 0.435** | 154 / 115 / 6 → 100 / 80 / 2 | 4.65 → 2.83 |

- **Where the reads went:** the transactor's total reads rise slightly (one at a time, 400 saves: 840 → 902, +7%;
  eight in flight, 200 saves: 512 → 502); the gateway's rise by about one per first touch (173 → 437, i.e. +1.32 per
  first touch; 105 → 301, +0.98). The reads move out of apply into the transactor's prefetch and the gateway's lookup.
- **What the gateway pays:** the lookup on the save's path takes p50 3.3 ms, p90 10.2 ms on a first touch (cold),
  p50 0.62 ms, p90 1.33 ms on a second save, p50 2.8 ms, p90 17 ms with eight in flight on two cores (diagnostic).
- Apply's wait on prefetches still in flight: 688 → 572 ms over 200 first touches one at a time; 694 → 871 ms with
  eight in flight.

### Why EAVT stays inside apply on an idle writer, and leaves when the writer is busy (queue probe)

The same cold first touch, sent as the native transaction, with the writer idle or behind an 80 ms hold of the writer
(a stored function that sleeps), hints off, on, or "full" (hints from `d/with` of the whole native commit: every
segment the commit itself reads on the peer, the most any hint can name). 40 different subjects per mode per run.

| Mode | Reads inside apply per first touch, gate3 / gate4 | EAVT / AEVT loads, gate4 |
| --- | --- | --- |
| Idle, no hints | 1.35 / 1.43 | 38 / 34 |
| Idle, hints | 0.83 / 0.53 | 33 / 17 |
| Queued 80 ms, no hints | 1.35 / 0.85 | 29 / 29 |
| Queued 80 ms, hints | **0.68 / 0.30** | **6 / 6** |
| Queued 80 ms, whole-commit hints | — / 0.30 | 8 / 6 |

- **The residue is timing, not coverage.** The native function's first reads (after the point checks) are the
  owner's EAVT: the owner witness and the revision. On an idle writer apply reaches them while their prefetch is
  still in flight, so apply loads them or waits for them. Datomic's own AEVT checks run after the function returns,
  so their prefetch has landed (AEVT halves even idle). Given 80 ms in the queue, EAVT loads fall 79% (29 → 6).
- **The lookup-only function reaches what hints can reach:** whole-commit hints (19 segments per save, against the
  function's 28 to 30) leave the same 0.30 per first touch.
  About 0.3 reads per first touch stay inside apply even then; which segments they are is not established.
- **W3's question answered the same way.** The general writer's EAVT loads stayed because its function reads the
  owners' rows by EAVT first (predecessor lookup) and W3's arms never let a commit wait in the queue long; W3's
  whole-commit arm left the same residue. The same applies here: on an idle writer hints buy little EAVT; on a busy
  writer, which is exactly the first-touch wave, they buy most of it.
- **A hint does not depend on what the peer holds:** the probe's 40 subjects (spread, cold peer) give 29 segments,
  and 29 again on an immediate repeat after the peer loaded them all; 28 after the peer first read the owner's EAVT.
  The peer read 111 segments for them, so the segments were really cold on the first lookup.

### Exactness gates (hints off and on)

| Gate | Off | On |
| --- | --- | --- |
| W4 paired log, fresh toy: every datom through the one-at-a-time phase, txInstant left out | 394,317 datoms, SHA-256 `714ec0cb…f6e22202e` | identical (0 differing) |
| W4 paired receipts (position, recorded time, t, datoms, writer, ordered IDs) | 400 | identical |
| W4 eight-in-flight phase and all touched subjects, final live rows | 6,400 | identical |
| W4 hint tests: hints real and attached on ordered saves (and `d/with` with and without `:return-hints` gives the same datoms); wrong (another subject's) hints give identical datoms; stale hints taken before a racing save of the same subject give the identical native refusal; a failing lookup still commits; a used ordered ID refused `IdentityConflict` with and without hints; eight concurrent saves of one subject: exactly one commits, seven `CasConflict`, with and without hints | — | 6 tests, 41 assertions, 0 failures |
| PREP1 mixed-identity, ordered-ID collision and conflict suite (`subject_conflicts`) with WFIX1's regression suite | 6 tests, 235 assertions, 0 failures | same |
| REAL2 production exactness gate, fresh toy (`DX_CHK1_HOLDER=DX-W4 DX_W4_SUBJECT_HINTS=1 prep1/manage.py OUT production 10 1 1 0 1`) | W3's off arm on the same code path (this option is inert when off): pass, 840 R and 88 S commits, 2,836 fields | Pass: 840 R and 88 S commits and the 2 wide general-identity commits all acknowledged, 0 expired; 2,836 fields read back exact; `subjectHints.attached` 431 (no lookup declined); write-options `subjectHints: true` |
| REAL2 production tape on a loader-aged toy (`DX_W4_SUBJECT_HINTS=1 real2/aged-gate.sh OUT`) | W3's off arm: pass, 120 aged rows, 101 writes over aged rows, 1,927 fields, final cut 1,289 | Pass, identical figures: 120 aged rows admitted, a tampered aged row refused, 101 writes over aged rows, 1,927 fields read back, final cut 1,289; every per-subject save carried hints (R 384 of 384, S 52 of 52, all ordered) |

Gate runs 1 and 2 (the same code with the early variant, and a queue probe whose subjects shared index leaves) gave
the same exactness results; their arm figures are in the evidence.

## 4. Server commands (none run; no machine is rented)

Build the commit that publishes this file as in `v01/PRODUCTION-CARD.md` ("Build once") and define `part` exactly as
in [W3's section 4](../w3/GENERAL-WRITER-HINTS.md#4-server-commands-none-run-no-machine-is-rented) (the card's
`part` with an extra environment word `$EXTRA` after `sudo env`). Each arm on its own new scratch copy.

**Preconditions for every hints arm, checked from the arm's records before reading any number:** the transactor's
native-settings readback shows `prefetchEnabled: true`; the write gateway's `/v1/db/<db>/write-options` shows
`options.subjectHints: true`; `/v2/admin/scan-stats` shows `subjectHints.attached` at 95% or more of the per-subject
saves (receipts with `subjectSave`). Off arms show no `subjectHints` key at all.

**The model behind the predictions** (from the toy, not from the misses report's forecast): hints take 40 to 65% of
a first touch's reads out of apply, the most when the save waits in the writer's queue (toy: 50 to 79% of EAVT and
AEVT loads with an 80 ms wait), the least when the writer is idle (EAVT stays). Saturday's 394 cell at 1 billion
(misses report, q7): 1.75 to 2.55 reads per save and apply 2.64 to 3.73 ms in its first 40 s, apply about 0.35 ms
plus 0.9 to 1.25 ms per read, writer 101 to 142% busy, p99 11 s.

### (a) Worst-case (Saturday's) tape at 1 billion, `server-32`, hints off and on: about 2 × 45 min

```bash
make_copy "$COPY"; EXTRA=                      part 2 "$COPY" /var/tmp/v01-1b-sat-w4-off 1B saturday server-32; remove_copy "$COPY"
make_copy "$COPY"; EXTRA=TX2_SUBJECT_HINTS=1   part 2 "$COPY" /var/tmp/v01-1b-sat-w4-on  1B saturday server-32; remove_copy "$COPY"
```

- **Off reproduces 2026-11-23:** 394 stored at 394 offered with p99 5 to 12 s; 1.75 to 2.55 reads inside apply per
  save in the 394 cell's first 40 s.
- **On, 394 cell, first-touch phase (first 40 s):** reads inside apply per save 0.7 to 1.4 (40 to 65% below off);
  apply mean 1.3 to 2.2 ms; writer busy 55 to 95% of wall time; **save p99 0.3 to 3 s** (expected near 1 s); 394
  stored; second saves unchanged (about 0 reads). The transactor's total reads within +15% of off; the write gateway
  makes about one more storage read per first touch and its save path gains p50 1 to 4 ms.
- **On, 620 cell:** still over the writer in its 25 s first-touch phase (apply 1.3 to 2.2 ms × 620/s is 80 to 136%):
  stored 470 to 600/s against off's figure; expiries at least halved, not zero.
- **Wrong if:** reads inside apply fall less than 25% with hints attached on 95% or more of per-subject saves (the
  toy's mechanism does not carry to the server); or fall more than 80% (the toy's residue is a two-core artifact;
  good news, and the p99 forecast is then too pessimistic); or reads fall 40% or more but p99 at 394 stays above 5 s
  (the queue is not the writer; look at the client's per-save credits); or any receipt, read-back or journal check
  differs from off.

### (b) Restart at 1 billion, first 60 s after the restart, hints on, with and without the one-time start-up read: about 2 × 25 min

The start-up read's runner (`jvm1/STARTUP-READ.md`, "One billion records, aged"), same inputs, with the option in its
environment (the runner passes `TX2_SUBJECT_HINTS` only when set):

```bash
sudo env "PATH=$BUILD/tools/bin:$PATH" "DX_V01_BUILD_RECEIPT=$BUILD/BUILD-v0.1.json" TX2_SUBJECT_HINTS=1 \
  bash lab/experiments/EXP-DX1/jvm1/startup-server.sh \
  "$COMMIT" "$OUT_1B_W4" "$SEED_DIR" "$IMAGE_SHA256" "$TRANSFER_SHA256" \
  "$AGED_PGDATA_SOURCE" "$(sudo sha256sum "$AGED_PGDATA_SOURCE/global/pg_control" | cut -d ' ' -f 1)" "$WAL_MOUNT" \
  --credit-mode rolling6 --arms today-cache32,startup-read-cache32 \
  --aged-bundle "$AGE_HANDOFF_JSON" --aged-sha256 "$AGE_HANDOFF_SHA256"
```

Read the first 60 s of each arm's timed window (the runner records 300 s). The comparison without hints is the
readiness page's run of 2026-11-23 at 1 billion: first-30-s save p99 7.26 s without the read and 0.385 s with it;
stop to admission 22.2 and 41.8 s.

- **Hints on, no start-up read (`today-cache32`):** first-60-s save p99 0.5 to 3 s (from 7.26 s in the first 30 s
  without hints); reads inside apply per save in the first 60 s 40 to 65% below the no-hints figure; stop to
  admission 18 to 27 s (hints do nothing before admission).
- **Hints on, with the start-up read (`startup-read-cache32`):** first-60-s save p99 0.2 to 0.5 s (no worse than
  without hints: the read already warms the 89% of saves that continue; hints act on the rest); stop to admission 37
  to 47 s, as without hints.
- **Wrong if:** the no-read arm's first-60-s p99 stays above 4 s with hints attached on 95% or more of per-subject
  saves (hints do not shorten the restart's queue); or the read arm's p99 rises above 0.6 s (the hint lookup's cost
  on the save path outweighs what it moves); or stop to admission moves by more than 5 s in either arm.


## 5. Not verified

- Nothing ran on a server; every time is diagnostic. The toy is two cores and 20,000 subjects, not 1 billion records.
- Which segments make the 0.3 reads per first touch that stay inside apply even with whole-commit hints and a queued
  writer.
- How deep the server's queue is in the first-touch wave once hints shorten apply (the help is largest when the
  writer is busy; as the queue shrinks it tends to the idle figure).
- The covering writer (owner head) and grouped commits take no per-subject hints.
- `stack/up.sh`'s new checks were exercised by `bash -n` only, not by `ha1/guard-check.sh` (its cases are pinned to
  older commits).

## Files

`packages/datomic/gateway/src/triplex/gateway/subject_hints.clj`, `storage.clj` (submit), `main.clj` (install and
readback); `w4/gate.sh`, `w4/container.sh`, `w4/gate.clj`, `w4/tx-prefetch.clj`; pass-through in `stack/up.sh`,
`prep1/manage.py`, `prep1/stack.sh`, `prep1/production-gate.ts`, `real2/aged-gate.sh`, `real2/aged-gate.ts`,
`jvm1/startup-server.sh`. Evidence: `DX-W4/` in the lab evidence store (gate1 to gate4, production and aged gates).
