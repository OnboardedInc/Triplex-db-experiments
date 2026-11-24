# General-writer hints and a bound on waiting reads (DX-W3)

North star P2 (saves) and P3 (feed lag), from the 1 billion runs of 2026-11-23 (H11.7, the private misses report).
Two options, both **default off**; no existing default changes. Datomic is not modified. Mac work is correctness at
toy size; every time below is diagnostic. [Scope](../../../SCOPE.md) · [North star](../../../NORTH-STAR.md) ·
[Targets](../../../TARGETS.md)

| Option | Process | What it does |
| --- | --- | --- |
| `TX2_GENERAL_PREFETCH=1` | write gateway | Installs a lookup-only stored function at scope open and, for each general-writer commit, runs it in `d/with … :return-hints true` and passes the hints to `transact-async`. The commit itself is unchanged. |
| `TX2_READ_WAIT_LIMIT=N` (1..4096) | read gateway | A **pinned** read (basis position or held handle) that would wait behind N others for a read permit is answered at once: 503, code `ReadBusy`, `retryAfterMs` 25. Current pulls are never refused. |
| `TX2_THREAD_COUNTERS=1` | either gateway | A 50 ms sampler keeps Jetty busy-thread, queued-request and permit-waiter peaks. |
| `TX2_HTTP_MAX_THREADS=N` | either gateway | Jetty's ceiling (default 512, as before); used to make the toy small. |
| `GET /v2/admin/threads` | either gateway | Always present: Jetty pool now, sampled peaks, permits free, reads waiting (current and peak), refused, admitted. |

`stack/up.sh` passes `TX2_GENERAL_PREFETCH` (writer only), `DX_READ_WAIT_LIMIT` and `DX_THREAD_COUNTERS` (all
gateways) only when set. The SDK retries a `ReadBusy` read after the suggested delay within its own deadline and
counts it in `client.readBusyRetries`; writes and every other 503 are never retried
(`packages/datomic/test/read-busy.test.ts`, 3 tests).

## 1. The hints

**What is named.** `general_prefetch.clj` repeats the reads of the general commit function (`commit/operation-code`,
lean layout) and of Datomic's own identity, uniqueness and redundancy checks: unique values in the commit's maps
(subject, attribute, claim, operation, journal) by AVET; for each retired row the owner's live row and retirement
marker (EAVT) and the row datom by attribute (AEVT); each owner's revision (EAVT) and its cardinality-one replacement
(AEVT); each new assertion ID's history range (AVET over history); the new row's EAVT and AEVT neighbourhood. It
returns no datoms and decides nothing.

**Why a wrong or stale hint is harmless.** A hint names storage segments; Datomic loads them ahead of apply. The
transaction runs the same function on its own db-before and makes every check there. Proven on the toy (below):
stale hints, another subject's hints, and a failing lookup all leave the outcome and the datoms unchanged.

**Not covered.** Grouped commits (the group worker takes no hints; left as it is) and the per-subject writer (its
own `TX2_SUBJECT_PREFETCH`, which the launchers refuse with ordered IDs). See finding 3.

### Toy evidence (`w3/gate.sh`, gate4, 20,000 subjects x 16 fields, two cores, real SQL storage and transactor)

Three databases seeded identically and indexed. Each arm runs in a fresh JVM after a transactor restart (cold), with
the server writer's switches: 200 general commits of 16 facts (12 replaced, 4 first writes) one at a time with a
one-fact save after every tenth; then 200 more on other subjects with 8 in flight; then the first 200 again (warm).
Reads inside apply come from each transaction's own io-stats; every read by process comes from PostgreSQL
(`pg_stat_statements`, the transactor under its own role).

| Phase | Reads inside apply per general commit, off / hints / whole-commit speculation | Transactor reads in all, off / hints | Gateway reads, off / hints |
| --- | --- | --- | --- |
| One at a time, cold | **2.84 / 1.38 / 1.48** | 1,087 / 1,151 | 172 / 795 |
| Eight in flight, cold | **2.14 / 1.27 / 0.99** | 919 / 1,017 | 7 / 609 |
| Same subjects again | **2.15 / 1.03 / 1.12** | 900 / 978 | 185 / 790 |

- **Reads move out of apply, they do not disappear:** inside apply falls by 51%, 41% and 52%; the transactor's
  total rises 6 to 11%; the gateway makes about 3 more reads per general commit when cold.
- **The lookup-only function reaches what hints can reach.** DX-M2's whole-commit speculation (`TX2_COMMIT_HINTS`,
  which runs the entire commit on the gateway) leaves the same residue. By index, hints remove about half the AVET and
  AEVT loads inside apply and almost none of the EAVT loads (198 → 188 one at a time). Apply's wait on in-flight
  lookups rises with hints in flight (397 → 963 ms over 200 commits): the prefetch is often not finished when apply
  starts. Which EAVT segments stay unhinted is not established.
- **Cost when nothing is cold:** a second lookup of the same commit takes p50 0.40 ms, p90 1.6 ms on the Mac
  (diagnostic); cold, p50 4.9 ms, p90 14 ms. It runs on the save's own request path, before the submit.
- Gate run 3 (same code before the whole-commit arm) gave 2.88 / 1.52, 2.17 / 1.50, 2.06 / 1.02.

### Exactness gates (all hints off and on)

| Gate | Off | On |
| --- | --- | --- |
| W3 paired log, fresh toy: every datom through the one-at-a-time phase, txInstant left out | 395,917 datoms, SHA-256 `e3d6f555…cfabfd9` | identical (0 differing); whole-commit arm identical too |
| W3 paired receipts (position, recorded time, t, datoms, writer) | 220 | identical |
| W3 eight-in-flight phase, final live rows | 4,000 | identical |
| W3 hint tests (real hints attached; wrong hints; stale hints keep the serial decision; failing lookup still commits; retired and active ID reuse refused) | — | 5 tests, 22 assertions, 0 failures |
| PREP1 mixed-identity and conflict suite (`subject_conflicts`) with WFIX1's regression suite | 6 tests, 235 assertions, 0 failures | same |
| REAL2 production exactness gate (`DX_CHK1_HOLDER=DX-W3 DX_W3_GENERAL_PREFETCH=0/1 prep1/manage.py OUT production 10 1 1 0 1`), fresh toy | Pass: 840 R and 88 S commits and the 2 wide general-identity commits all acknowledged; 2,836 fields read back exact | Pass, the same counts; 506 general commits carried hints; write-options `generalPrefetch: true` |
| REAL2 production tape on a loader-aged toy (`DX_W3_GENERAL_PREFETCH=0/1 real2/aged-gate.sh OUT`) | Pass: 120 aged rows admitted, a tampered aged row refused, 101 writes over aged rows, 1,927 fields read back, final cut 1,289 | Pass, identical figures; every general commit carried hints (R 456 of 840, S 36 of 88; the rest took the per-subject writer, 384 and 52, as off) |
| SDK (`packages/datomic`, 84 files) | 448 passed, 53 skipped, 1 failed: `writer-heap.test.ts` resolves `../../lab` from the working directory and fails from the repository root (its inputs are untouched by this branch) | — |
| Launch guard (`ha1/guard-check.sh`, `stack/up.sh` changed) | 93 cases, 0 mismatches | — |

## 2. The waiting-read bound (`w3/gate.sh` with `W3_MODE=read-queue`, run 3)

Toy: 16 web threads, one read permit, 64 clients each sending a read of 400 subjects' rows pinned at the head
(about 0.2 to 0.5 s under the permit) for 8 s, while three probes each send one request every 100 ms.

| | Bound off | `TX2_READ_WAIT_LIMIT=4` |
| --- | --- | --- |
| Web threads busy / requests queued for a thread (during the flood) | 16 of 16 / 54 | 15 of 16 / 12; queued in 16 of 144 samples |
| Reads waiting for the permit, peak | 13 | 6 (4 pinned plus current pulls) |
| Feed poll (`/v2/db/…/transactions`) | 10.5 s (2 polls in 8 s) | p50 13.7 ms, p99 119 ms (60 polls) |
| Health check | 10.5 s | p50 11 ms, p99 120 ms |
| Current pull (unpinned, never refused) | 12.3 s | p50 0.91 s, p99 1.45 s, 0 busy answers |
| The counters route itself | 12.1 s | 43 ms |
| Pinned reads answered / refused busy | 251 / 0 | 45 / 8,723 |

So on the toy the cause inferred on 2026-11-23 is real: parked reads hold every web thread and the feed poll waits
for a thread, not for the store. With the bound the poll and health check reach the gateway. A current pull still
waits behind up to N pinned reads in the fair permit queue (here 4 × 0.2 to 0.5 s). The first version of the bound
refused current pulls too; they then lost every race to the flood's retries (5.5 s, 143 busy answers), so the bound
now applies to pinned reads only.

**What clients do with `ReadBusy`.** The SDK waits `retryAfterMs` and asks again until its own deadline (the ladder's
clients use 35 s), so the ladder sees slower pinned reads, not errors; its error count stays the client's timeouts.
`readBusyRetries` on each client counts the retries; the ladder does not print it yet.

## 3. Findings for the orchestrator

1. **The worst-case tape barely uses the general writer.** At 1 billion, Saturday's first touches load EAVT 1.2 to
   1.9 and AEVT 1.3 to 2.8 segments per save and **AVET 0.00** (the report's q7 table). Its saves are one or two facts
   that each replace a seeded value, which is exactly what the per-subject ordered writer takes; the general writer
   would show AVET history loads for its scattered new IDs. So general-writer hints cannot change pair (a) as written.
   The per-subject writer's own hints (`TX2_SUBJECT_PREFETCH`) are refused with ordered IDs by `stack/up.sh` and
   `prep1/manage.py` (a deliberate guard, left alone). Hinting the per-subject writer under ordered IDs is a separate,
   small build: its plan already holds the owner, the row prefixes and the ordered bounds.
2. **Hints buy writer capacity, not single-save latency.** The gateway reads the same cold segments to name them, on
   the save's own path. Unqueued, a save gains little or loses a few milliseconds; queued, the writer is freed.
3. **About half the reads stay inside apply on the toy**, with either kind of hint. The report's forecast of at most
   0.3 reads inside apply per first touch is not supported by the toy; the forecasts below use the toy's ratios.

## 4. Server commands (none run; no machine is rented)

Build the commit that publishes this file as in `v01/PRODUCTION-CARD.md` ("Build once"), then define `part` there
with one change: an extra environment word after `sudo env`, here `$EXTRA` (empty for a control arm). Each arm on its
own new scratch copy, as the card does.

```bash
part() {   # as v01/PRODUCTION-CARD.md, plus $EXTRA in the environment
  local source aged=()
  if [[ $4 == 1B ]]; then source=$AGED_PGDATA_SOURCE; aged=(--aged-bundle "$AGE_HANDOFF_JSON" --aged-bundle-sha256 "$AGE_HANDOFF_SHA256")
  else source=$FRESH_PGDATA_SOURCE; fi
  sudo env "PATH=$BUILD/tools/bin:$PATH" "DX_V01_BUILD_RECEIPT=$BUILD/BUILD-v0.1.json" $EXTRA \
    "AGE_JAVA=${AGE_JAVA:-}" "AGE_DATOMIC_HOME=${AGE_DATOMIC_HOME:-}" DX_W1_SERIAL_APPLY=0 PREP1_LOOKUP_EVERY=0 \
    "$BUILD/tools/bin/node" lab/bin/scorecard.mjs --commit "$COMMIT" --out "$3" --arm "$1" \
    --age "$4" --tape "$5" --profile "$6" --credit-mode rolling6 --window-seconds 90 \
    --jvm j21-g1 --write-jvm j21-g1 --tx-jvm j25-zgc --wal-directory "$SCORECARD_WAL_DIRECTORY" \
    --seed "$SCALE1_IMAGE" --image-sha256 "$SCALE1_IMAGE_SHA256" --transfer-sha256 "$SCALE1_TRANSFER_SHA256" \
    "${aged[@]}" --pgdata-source "$source" --pgdata "$2"
}
```

Preconditions for every hints arm, checked from the arm's records before reading any number: the transactor's
native-settings readback shows `prefetchEnabled: true`; the write gateway's `/v1/db/<db>/write-options` shows
`options.generalPrefetch: true`; its `/v2/admin/scan-stats` shows `generalHints.attached` above zero.

### (a) Worst-case (Saturday's) tape at 1 billion, hints off and on: about 2 × 45 min

```bash
make_copy "$COPY"; EXTRA=                        part 2 "$COPY" /var/tmp/v01-1b-sat-hints-off 1B saturday server-32; remove_copy "$COPY"
make_copy "$COPY"; EXTRA=TX2_GENERAL_PREFETCH=1  part 2 "$COPY" /var/tmp/v01-1b-sat-hints-on  1B saturday server-32; remove_copy "$COPY"
```

- **Predict (mine, from finding 1):** no material change. 394 cell first-touch phase (first 40 s): reads inside apply
  per save within 10% of off (about 1.75 to 2.55), apply 2.6 to 3.7 ms, p99 5 to 12 s in both arms; 620/s stores under
  450/s in both. `generalHints.attached` under 5% of acknowledged saves.
- **The report's forecast**, for the record: reads inside apply at or under 0.3 per save, apply 0.5 to 1.2 ms, p99
  under 1 s at 394/s, at least 500/s stored at 620/s. It assumed these saves take the general writer.
- **Wrong if** more than 20% of the cell's saves carry general hints (then finding 1 is wrong and the toy ratio
  applies: reads inside apply would fall 40 to 55%), or reads inside apply fall by more than 20% with under 5% hinted.
- **Recommendation:** skip (a) until the per-subject writer can take hints with ordered IDs; run (c) instead.

### (b) The 1,024-reader step with the waiting-read bound: about 2 × 35 min

Part 2 of the production-S card at 1 billion (its P1 ladder ends with the 1,024 step; P3 feed lag is measured beside
it). Counters on in both arms; the sampler records the read gateway once a second.

```bash
for arm in off on; do
  make_copy "$COPY"
  limit=; [[ $arm == on ]] && limit=DX_READ_WAIT_LIMIT=128
  sudo bash lab/experiments/EXP-DX1/w3/threads-sampler.sh "/var/tmp/v01-1b-rq-$arm-threads.jsonl" & sampler=$!
  EXTRA="DX_THREAD_COUNTERS=1 $limit" part 2 "$COPY" "/var/tmp/v01-1b-rq-$arm" 1B production-S server-32
  wait "$sampler"; remove_copy "$COPY"
done
```

- **Predict, bound off:** during the 1,024 step the read gateway's `busyPeak` reaches 512 and `queuedPeak` is above
  0, the sampler gets no answer within 2 s in at least one second, `readsWaitingPeak` is at least 400; feed lag p99
  at that step 0.3 to 2 s; poll gap median 15 to 40 ms. Steps 1 to 256 as on 2026-11-23 (lag p99 30 to 50 ms).
- **Predict, bound 128:** at the 1,024 step `busyPeak` under 200, `readsWaitingPeak` at most 128 plus current pulls,
  many `readsRefusedBusy`; feed lag p99 under 250 ms (expected 40 to 120); poll gap median under 5 ms; pinned-read
  goodput within 10% of off (the permits, not the threads, set it); pinned p99 higher than off. P4 current pulls are
  never refused.
- **Wrong if:** off shows `busyPeak` under 512 with `queuedPeak` 0 while the poll gap is over 100 ms (then threads are
  not the cause); or on still shows lag p99 over 250 ms with `busyPeak` under 200 (then the delay is elsewhere, for
  example the journal permit or collector pauses); or on loses more than 20% of pinned goodput.

### (c) The production-shaped card's first cell after a start, hints off and on: about 2 × 45 min

```bash
make_copy "$COPY"; EXTRA=                        part 2 "$COPY" /var/tmp/v01-1b-prodS-hints-off 1B production-S server-32; remove_copy "$COPY"
make_copy "$COPY"; EXTRA=TX2_GENERAL_PREFETCH=1  part 2 "$COPY" /var/tmp/v01-1b-prodS-hints-on  1B production-S server-32; remove_copy "$COPY"
```

- **Predict:** in the first loaded cell (50/s, about 2.2 reads per commit with hints off), general-writer reads inside
  apply per commit fall 40 to 55% (to about 1.0 to 1.4); the cell's reads per commit 1.2 to 1.6. Median save
  latency within ±2 ms of off at 50/s (the gateway now pays the cold reads on the same path); at 394 and 620/s the
  writer's apply share falls and commit p99 falls 10 to 30%. Per-subject commits unchanged. Write gateway CPU up by
  under 0.2 cores at 620/s.
- **Wrong if:** general reads inside apply fall by less than 25% (hints do less on the server than on the toy), or
  more than 70% (the toy's residue is a Mac artifact), or the 50/s median rises by more than 4 ms, or any commit
  differs in the card's exactness checks.

## 5. Not verified

- Nothing ran on a server; every time is diagnostic. The toy is two cores and 20,000 subjects, not 1 billion records.
- Which EAVT segments hints leave inside apply, and whether a larger transactor (prefetch concurrency, more cores)
  finishes the prefetch before apply.
- Grouped commits and the per-subject writer take no general hints.
- The ladder does not yet print the SDK's `readBusyRetries`.
- The bound's value for the server (128) is reasoned from 512 threads and 3 to 12 permits, not measured.

## Files

`packages/datomic/gateway/src/triplex/gateway/general_prefetch.clj`, `admission.clj`, `main.clj`, `storage.clj`,
`reach.clj`; `packages/datomic/src/DatomicClient.ts`; `w3/gate.sh`, `w3/container.sh`, `w3/gate.clj`,
`w3/read-queue.mjs`, `w3/tx-prefetch.clj`, `w3/threads-sampler.sh`; pass-through in `stack/up.sh`,
`prep1/manage.py`, `prep1/stack.sh`, `prep1/production-gate.ts`, `real2/aged-gate.sh`, `real2/aged-gate.ts`,
`prep1/aged-live/container.sh`. Evidence: `DX-W3/` in the lab evidence store (gate1 to gate4, rq1 to rq3, real2).
