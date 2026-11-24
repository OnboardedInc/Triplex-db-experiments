# Reading at least a receipt's position (RD4, 2026-11-24)

**A reader that holds a write receipt can now ask any gateway for "at least" the receipt's position on an unpinned
read. The gateway waits on its own peer (the pinned reads' `storage/await-position`, never a transactor round trip)
until the peer has that position, then answers at its head. Nothing changes for a caller that does not pass it.** It
answers H11.4 and the Publish stop of 2026-11-23 ([PUBLISH-STOP.md](../actv-lazy/PUBLISH-STOP.md)): the probe that
answered at a basis before an acknowledged Publish now cannot, when it reads as a receipt holder. Whether every reader
must be given this promise is still the owner's decision; this page builds the opt-in form and prices the other.

## 1. The contract

1. `GET /v1/db/{db}/basis?atLeast=P[&waitMs=W]`, and `atLeastPosition: P` (with the existing `basisWaitMs`) on POST
   `snapshot`, `read`, `q`, `reach` and `reach-many`: the answer is at the peer's head, and that head is at or after P.
2. The wait is the peer's own: a local check, then the peer's transaction-report wakeups, bounded by W (1 to 2,000 ms,
   default 500). No request goes to the transactor.
3. If the peer does not reach P in time: HTTP 409 `AtLeastTimeout`, `maximum` = the peer's head, message "The gateway's
   peer did not reach position P within W ms (its head is H)". Nothing is answered from before P.
4. Only for unpinned reads: refused (400) with `recordedPosition`, `recordedAt` or a held `handle`, and on any other
   route. Pinned reads, the feed and receipts are unchanged.
5. The gateway echoes P (`atLeast` in the body; the `x-tx2-at-least` header on `reach`) and the SDK refuses an answer
   without the echo or before P, so a gateway that predates the parameter can never answer early unnoticed.

**SDK.** `ReadAtLeast` (`fromReceipt(receipt, { waitMs })`, `raise(receipt | position)`, which only rises) is passed as
`readAtLeast` to `makeDatomicRuntime`, `makeDatomicStorageAdapter` or `makeDatomicQueryExecutor`. The caller builds it
once from a receipt and raises it with later receipts; it never repeats the position on a call.
`DatomicAtLeastTimeout` (a `ReadError`, `code` "AtLeastTimeout", `head`) reports the refusal.

**Which calls gain it** (outside a transaction, on a basis without `recordedPosition` or `recordedAt`):
`Triples.currentPosition`; `entity`, `entities`, `match` and the other row reads (`POST read`); `reach` and the direct
subject pulls (`reach`, `reach-many`); pulls and sweeps that pin at the head they resolve (`pullPosition`, one basis
call); `entityPage` and other reads that take `currentCommitPosition`; unpinned Datalog queries (their `snapshot`, and
the point-query `q`). **Which do not:** reads pinned by position or record time (they already name their cut); reads
inside a transaction (they use the transaction's snapshot on the write gateway); the feed (`transactions`, the log
route); journal and receipt lookups (`transaction`, `transactionByCommand`, `/journal`, `/transactions`,
`/entity-transactions`, `/command`, `operation`, `claim`); writes; `history` reads go through `POST read` and so
**do** gain it.

## 2. Gates (Mac, toy size, one ordinary heavy token each; times diagnostic)

| Gate | Result |
| --- | --- |
| Gateway selftest (`selftest.clj`, new `at-least-unpinned-reads`) | 29 tests, 54,160 assertions, 0 failures |
| SDK (`packages/datomic`, new `read-at-least.test.ts`, 7 tests) | 453 passed, 53 skipped (the readiness page had 446 / 53) |
| Two-peer gate (`rd4/gate.sh`), section 1, not held: 300 saves, each read at once by a receipt reader and by a plain reader | Receipt reader early 0 of 300. Plain read sent first after the acknowledgement: early in 9 of 150 (the read peer trailed the write on an idle toy). The gateway waited on 6 of 300 at-least requests: 0.9, 10.0 and 18.2 ms when the receipt read came first; 0.3, 19.6 and 2.3 ms after a plain read; 51.4 ms in all |
| Section 2, read peer held for 300 ms after a save (head, entity, subject pull) | Plain read early every time (301 against 302, 302 against 303, 303 against 304); the receipt read still waiting at 300 ms every time, then answered at the receipt (gateway wait 304.0, 306.3, 304.9 ms) |
| Section 3, deadline: held peer, 200 ms wait | Refused with `AtLeastTimeout`, head 304 against receipt 305, after 208.6 ms |
| Section 4, pinned and feed while held | Record-time pin through Triples, with and without the floor, and a position pin through the client: the value at 306, at once; the feed with and without the floor: the same positions ([306]), not the held save; 98.9 ms for all |
| Section 5, requests: 100 × (head, entity, pull) | Plain and receipt readers: the same routes and counts (100 `basis`, 100 `read`, 100 `reach`). Chunks from the read peer to the transactor: 0 for the 300 receipt reads, 1 for the plain ones (a heartbeat), 0 and 0 in two idle 1.5 s windows, 21 for the positive control (20 no-argument syncs) |
| Held Publish toy (`engine.mjs ha1 --holder DX-RD4 --experiment load-fair --diagnostic`, `DX_ACT3_HELD=1`; separate write and read gateways), probe with `DX_ACT3_AT_LEAST=1` | Pass twice (`f5404a159`; `57e3bae8f` with the per-window counters): 8 windows, 8 of 8 deadline Publishes inside 1 s, 0 at-least defects, 0 visibility failures, 0 read failures; the read gateway's at-least counter: 18 requests per Publish window, 0 waits, 0 refusals |
| Same, `DX_ACT3_INJECT=stale` | Fails at the end as designed: 1 at-least defect (basis 11 against receipt 43, `injected` true), every window measured |
| Same, default (setting unset) | Pass, unchanged: `probeAtLeast` false, 0 visibility failures, lag after each acknowledgement 0 |
| SDK integration tests that pin reads (`rd4/integration-pair.sh`: read-pins, reach, adapter, route-equivalence, record-time-peer, history-grouping), a fresh stack of this gateway and a fresh stack of `origin/exp/DX-INT1`'s | Identical on both: 19 passed, 1 skipped; history-grouping fails on both alike (its seed save is refused on this stack's configuration, before any read) |

**The wait when the peer is not held back.** Expected none; measured on the toy: no wait in 294 of 300 receipt reads,
and 6 waits of 0.3 to 19.6 ms (51.4 ms in all) where the read peer had not yet applied the save the reader had just
been told about. The same toy showed a plain read early in 9 of 150 such moments, which is the bench 4 stop at toy
size: two peers, nothing loaded.

Evidence (private): `evidence/DX-RD4/` on the Mac (`gate-2/`, `selftest-2.log`, `sdk-tests-3.log`, `load1/load-fair-*`,
`held-*.log`, `integration-pair-1/`, `integration-pair-2/`, `route-oracle/`).

## 3. What a sync per unpinned read would cost (not built)

Giving every unpinned read this guarantee without a receipt means `d/sync` with no argument on each one: the peer asks
the transactor for its latest basis, then waits until it has applied it.

- **One transactor message per read.** The toy's positive control: one round trip, about 395 bytes, from the read peer
  per sync (21 chunks, 7,900 bytes for 20). At the tuned reader's measured 8,879 to 12,375 reads/s (256 seats) that is
  about 9,000 to 12,000 messages a second into the single transactor, which also runs the serial writer at 394 saves/s.
  No measurement exists of what that does to commit p99 (P2's bar is 50 ms).
- **Every read waits for the latest commit, not the reader's.** A receipt read waits only when the peer lacks the
  receipt (6 of 300 on the toy); a synced read waits for whatever the transactor committed last, so under load nearly
  every read pays the commit-to-peer delivery time plus a network round trip. P4's p50 (4.35 ms measured, bar 5 ms) has
  little room for it.
- **Reads would depend on the transactor.** Today pinned and unpinned reads continue through a transactor loss (P9:
  0 of 30,172 reads missed, first read 16.5 ms). With a sync on each unpinned read, every one of them would wait out the
  failover (19.5 s with policy A, 603 s with policy B) or fail at its deadline.
- **It changes every account's read path**, receipt or not, so P1, P4 and P6 would all need re-measuring.

A receipt read costs none of these: the same request as before, a local check, and a wait only when the peer is
actually behind the reader's own write.

## 4. Server command (runs the day a machine is rented)

Build `exp/DX-RD4-at-least-read` at `$COMMIT` as for `actv-lazy/PART9.md` (the w0 and Datomic packages rebuilt from
it; the gateway source of the stack is the build's). All twelve held windows (small release, quiet controls in the same
process), each Publish window's probe a reader built from the receipts. About 35 minutes: a fresh prepared copy (about
4.4 minutes), boot and checks (about 4), the twelve windows (about 27, as the large-release run of 2026-11-23).

```sh
sudo env "PATH=$BUILD/tools/bin:$PATH" "DX_V01_BUILD_RECEIPT=$BUILD/BUILD-v0.1.json" \
  "DX_ACT3_SETTLE=0" "DX_ACT3_AT_LEAST=1" \
  bash lab/experiments/EXP-DX1/actv-lazy/join/held-server.sh \
  "$COMMIT" "$SCALE1_IMAGE" "$SCALE1_IMAGE_SHA256" "$SCALE1_TRANSFER_SHA256" \
  "$SCALE1_PGDATA" "$PREPARED_PGDATA" "$PREPARED_WAL" "$DX_LAZY_OUT"
```

**Predictions** (written before any server run). Last night's small release, run 1 (`bm1/PUBLISH100K-READING.md`), is
the comparison: first correct p50 / p99 31.6 / 93.8 (barrier 6, 3.5), 33.1 / 50.9 (rolling 6, 3.5), 35.9 / 159.1
(barrier 6, 23.5), 39.6 / 421.4 (rolling 6, 23.5), 45.3 / 132.8 (barrier 6, 39.4), 43.9 / 127.0 ms (rolling 6, 39.4).

| Measure | Prediction |
| --- | --- |
| Early answers (`atLeastDefects`, `visibilityFailures`) | 0 of 120 Publishes |
| At-least refusals (`readGatewayAtLeast.timeouts`, `probe-at-least-timeout`) | 0 |
| Within one second | 20/20 in each of the six Publish windows |
| First correct p50 per window | within 0 to +3 ms of last night's |
| First correct p99 per window | within last night's per-window value ± 30%, and under 450 ms everywhere |
| Gateway waits (`readGatewayAtLeast.waited`) | in 0 to 10% of a window's at-least requests; mean wait under 5 ms |
| `readHeadLagAfterAck` (taken without the parameter, still recorded) | above 0 in 0 to 3 of 120 Publishes |
| Live save and read p99 against the matched control | as last night (the probe is one reader; the parameter adds no request) |

**What would show it wrong.** Any at-least defect: a store fault in the wait (the peer answered before P while saying
it had P), to be read from its recorded values. Any refusal: the read peer was more than 2 s behind an acknowledged
Publish, beyond the owner's one-second bar. A first-correct p50 more than 10 ms above last night's in any window, or
waits on more than a quarter of the requests: the read peer trails acknowledgements far more often than the one-in-241
estimate, so the plain reader's early answers are common under load. Live p99 outside last night's ratios: the
receipt hand-over (a worker message after each paused turn) or the wait disturbs the window.

## 5. Not verified

- Nothing ran on a server: no number above is a result, and the wait under load (the one-core read gateway also
  serving 64 pinned seats while the writer runs at 39.4 saves/s) is only predicted.
- The toy's waits and early answers come from a Mac VM with two idle peers; how often a peer trails an acknowledgement
  on bare metal under load is known only from last night (once in at least 241 Publishes).
- The hold proxy holds the transactor's bytes to the read peer; a peer behind for another reason (a long GC pause, an
  index adoption) is not reproduced, though the wait does not depend on the reason.
- Datalog queries with the floor (`snapshot`, point `q`) are covered by the gateway selftest and the client's unit
  tests, not by the two-peer gate.
- Several read gateways behind one URL list (`DATOMIC_READ_URLS` with more than one address) are not tested; each
  request carries the floor, so each gateway waits on its own peer.
