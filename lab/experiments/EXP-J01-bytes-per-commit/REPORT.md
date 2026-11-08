# EXP-J01: bytes and triples per commit

North star: P2, small atomic idempotent commits with low latency; authority: [SCOPE](../../SCOPE.md),
[NORTH-STAR](../../NORTH-STAR.md), [TARGETS](../../TARGETS.md). Builder: CX-J01, 2026-11-08.

Result: the attribution closes exactly and the existing default-off candidate reduces physical work, but **the experiment's
3x reduction and passing G1 conditions are not met**. XTDB saves 12.2% of source-log bytes (1.14x); QLever saves 32.6% of
inserted triples (1.48x). Do not promote this as completion of P2 or as an independently verified correctness result.
The paused work was preserved at `f04b81935a8000df4023419e0b634c67de09fed0`; implementation is
`05319e6e287ca67aa9bbabe36dbe74b6a960002d`, equivalence evidence `41517f9`, service evidence `f4a674e`.
The final report commit is the commit containing this file (`git log -1 --format=%H -- lab/experiments/EXP-J01-bytes-per-commit/REPORT.md`).

## Measurements and accounting

One command asserts N string facts about one subject, with entity type and commandId, no actor. It writes N data assertion
rows, N `:_tx/change` rows and four journal envelope rows (position, instant, command-id, changed-entity). Bookkeeping adds
one command claim, one operation receipt and the scope position counter. No separate outbox/work-item/ledger workload is
exercised here; the logical journal is the transaction ledger. These totals do not estimate an application outbox's extra cost.

The 82-character scope used here matters: the older XTDB 27,581-byte A0 used a 43-character scope. Compare matched shapes,
not those two totals as a regression. Numbers below are historical live measurements from the paused run, checked offline
in this continuation, not newly measured engine performance.

### XTDB source-log bytes, 10 facts

Method: difference between a transaction's source-log byte offset and the next message's offset, with a fence transaction;
then replay the captured statements, adding one source at a time. These are marginal increments in that stated order,
including Arrow/schema/alignment overhead, not a unique allocation of shared overhead or total storage-volume growth.

| Source added | A0 bytes | Compact bytes |
| --- | ---: | ---: |
| Record envelope and tx_meta position | 1,851 | 1,851 |
| tx_attempts operation receipt | 1,176 | 1,176 |
| tx_claims command claim | 1,296 | 1,296 |
| Serialization guards: scope CAS and command claim | 984 + 704 | 1,352 |
| Operation identity guard | 720 | 720 |
| Ten data assertion rows | 6,824 | 6,816 |
| Data assertion identity guard expansion | 2,112 | 632 |
| Four journal envelope rows and their identity guards | 2,842 | 2,320 |
| Ten journal change rows and their identity guards | 11,552 | 10,234 |
| **Sum / measured / exact replay** | **30,061** | **26,397** |
| Unexplained difference | **0** | **0** |

The small data-increment difference includes shared serialization layout effects. The journal plus its guard expansion is
14,394/30,061 = 47.9% of A0, falsifying the prediction that it exceeds half for this shape. Change JSON is 267 bytes plus
291 bytes of canonical value identity per change; removing those two fields in a diagnostic saves 5,736 bytes, not 3x.
Dropping value identity alone saves 2,904 bytes on the change rows. Neither diagnostic is the shipped candidate.

Evidence: [A0 attribution](receipts/xtdb-attribution-A0-20261108T003105Z-3e2a1d.json),
[compact attribution](receipts/xtdb-attribution-compact-20261108T003136Z-cc319d.json).

### QLever per-source triples and literal bytes, 10 facts

Triples are classified from the guarded update's VALUES rows and reconciled against QLever's per-operation inserted/deleted
counts. Global delta differences can include concurrent agents, so they are not a command attribution. Object bytes below
are UTF-8 RDF object text bytes only; they exclude subjects, predicates and SPARQL syntax and are not on-disk bytes.

| Source | A0 inserted triples | Compact inserted triples | A0 object bytes | Compact object bytes |
| --- | ---: | ---: | ---: | ---: |
| Ten data assertions | 270 | 180 | 8,250 | 7,540 |
| Journal position | 30 | 21 | 915 | 844 |
| Journal instant | 30 | 21 | 965 | 894 |
| Journal command-id | 27 | 18 | 1,035 | 964 |
| Journal changed-entity | 27 | 18 | 901 | 830 |
| Ten journal changes | 270 | 180 | 21,590 | 20,880 |
| Scope position | 2 | 2 | 4 | 4 |
| Command claim | 4 | 4 | 92 | 92 |
| Operation receipt | 3 | 3 | 79 | 79 |
| **Sum / measured inserted** | **663** | **447** | **33,831** | **32,127** |
| Replaced position triples deleted | 2 | 2 | — | — |
| Full guarded update text bytes | — | — | **102,005** | **78,293** |

Journal triples are 384/663 = 57.9% of A0, confirming that prediction. A0 string/ref/JSON assertions each fan out to 27
triples, numeric/datetime assertions to 30. Compact uses 18/21. The two numeric/datetime envelope fields explain the extra
six triples over a uniform 27-per-row model. The old estimate of roughly 750 is not reproduced: the exact per-operation
result is 663 inserted + 2 deleted = 665 touched triples. Shared delta contamination is a plausible explanation of the old
estimate, not a proven reconstruction of it. R17's 94-triple estimate omitted this representation's fan-out.

Evidence: [A0 attribution](receipts/qlever-attribution-A0-20261108T001038Z-5ab295.json),
[compact attribution](receipts/qlever-attribution-compact-20261108T003457Z-d4d93b.json).

### Size bands, prediction versus observation

| Lane / arm | 1 fact | 10 facts | 50 facts |
| --- | ---: | ---: | ---: |
| XTDB A0 premeasurement prediction, bytes | 10,400 | 25,900 | 93,800 |
| XTDB A0 measured bytes | 14,443 | 30,061 | 100,013 |
| XTDB compact measured bytes | 13,123 | 26,397 | 85,869 |
| QLever A0 predicted and measured inserted triples | 177 | 663 | 2,823 |
| QLever compact classified and measured inserted triples | 123 | 447 | 1,887 |
| QLever A0 update text bytes | 26,333 | 102,005 | 438,885 |
| QLever compact update text bytes | 20,405 | 78,293 | 336,133 |

Three repeated 10-fact commands agree in each attribution arm. The original XTDB prediction misses by more than 5%; the
measured incremental accounting subsequently closes to zero, including the engine envelope and guards. Do not describe
that retrospective exact closure as an accurate prior byte prediction. See [frozen predictions](receipts/predictions-phase1-A0.json).

### Other candidates and rejected hypotheses

The [P2X reconstruction](receipts/p2x-reconstruction-20261108T002151Z-0c437a.json) reproduces exactly 95,364 bytes:

| Reconstruction step | Added bytes | Cumulative bytes |
| --- | ---: | ---: |
| Plain candidate rows/bookkeeping, no guards or heads/feed | 21,069 | 21,069 |
| Two merged point-lookup guards | 6,824 | 27,893 |
| Heads/feed rows | 2,984 | 30,877 |
| BEGIN metadata | 1,863 | 32,740 |
| Stamped bookkeeping INSERT SELECT | 2,432 | 35,172 |
| Stamped assertion INSERT SELECT | 60,192 | 95,364 |

The dominant increase is the stamped assertion INSERT SELECT representation, which stays a SQL operation with an Arrow
argument column per parameter instead of becoming compact put-docs. NULL companion columns are part of that layout;
they alone are not an adequate explanation of the entire increase. This is a reconstruction at the recorded P2X source,
not a new qualification of that branch or the claimed approximately 250 KB total slot growth.

P2Q batches up to 64 commands per guarded update; amortizing update guards does not remove the per-assertion channels or
logical journal facts. This continuation did not measure a live P2Q broker batch; the A0/compact results above are direct
adapter commands, not broker byte attribution.

[XTDB design probes](receipts/xtdb-designs-probe-20261108T002252Z-b6e9da.json) found 15,355/12,459/10,795-byte hypothetical
layouts (1.96x/2.41x/2.78x). [QLever design probes](receipts/qlever-designs-probe-20261108T004717Z-c0d4a5.json) count 207
triples for compact data plus one journal-record subject, or 202 with co-located bookkeeping (3.20x/3.28x). Those require
read-path work and logical journal reconstruction; they are not implemented or correctness-qualified candidates.
Even removing the entire A0 QLever journal leaves 279 triples, so journal removal alone cannot yield 3x.

## Implemented option and logical journal

Both public runtime factories accept `commitEncoding: "compact"`; unset/default is `a0`. The gate route can select
`TRIPLEX_COMMIT_ENCODING=compact`; explicit options win and unknown values throw. Core journal generation is unchanged.

XTDB combines four guards into two, keeps retryable CAS/claim conflicts distinct from definite identity conflicts, reuses
the scope parameter, and binds assertion/command ID lists as PostgreSQL text arrays with ANY. A JSON list was rejected:
the probe found it silently failed to match existing IDs. Rows and journal payloads are unchanged.

QLever removes nine currently populated unread channels per asserted row: lexical/exact/native recorded-at shadows,
lexical/exact recorded-position shadows, and all four schema-version channels. Five analogous retraction channels are
also omitted when present. The full `_row`, order channels, native position channels, valid-time channels and scalar
channels remain. The option relies on the repository's existing readers; new native consumers must respect this contract.

The deterministic A0/compact/A0/compact script covers five transactions, 23 changes and 46 journal facts per arm, all value
kinds (including -0 and a large exact integer), provenance, corrections, staged retract-pattern and historical reads.
Twenty-one read surfaces and decoded physical journal rows compare identically within each lane:
[XTDB equivalence](receipts/journal-equivalence-xtdb-20261108T011253Z-73717d.json),
[QLever equivalence](receipts/journal-equivalence-qlever-20261108T011518Z-015a94.json).
XTDB has `identicalAsReturned:false`: unordered Datalog result rows are normalized as bags where there is no cursor;
raw return ordering is not proven identical. QLever evidence also compares decoded journal rows, not every omitted RDF
channel. This is same-implementation differential evidence, not an independent oracle proof. Erasure is absent from this
script: Q49a identity-only erasure and post-erasure rendering still need independent qualification.

## Service time: shared resident, fresh scopes

One writer, closed loop, interleaved blocks, 10 facts per command. Both lanes used shared residents, not fresh engines.

| Lane | Samples per arm | A0 p50 / p99 ms | Compact p50 / p99 ms | A0/compact p50 |
| --- | ---: | ---: | ---: | ---: |
| XTDB | 96 | 2,887.7 / 4,900.7 | 2,982.2 / 6,126.7 | 0.97x |
| QLever | 60 | 7,430.3 / 14,412.6 | 6,972.7 / 12,788.9 | 1.07x |

Host one-minute load ranged 13.05–23.01 for XTDB and 14.71–20.80 for QLever on 12 logical CPUs. The measurements do not
show a reliable latency improvement. They are diagnostics, not the open-loop writer trace with 256 readers required by
TARGETS. No fresh-engine or after-10k-commits comparison exists; the predicted 1.5x XTDB gain at that depth is untested.
Evidence: [XTDB service](receipts/service-xtdb-fresh-scope-20261108T013134Z-49520f.json),
[QLever service](receipts/service-qlever-fresh-scope-20261108T013148Z-6ca7a2.json).

## G1 outcomes and continuation

Each full G1 attempts 44 unchanged cases in current and reopen phases, plus the unchanged complete suite.

| Lane / requested option | Receipt | Pass / fail / unrun of 88 | Outcome |
| --- | --- | ---: | --- |
| XTDB off | [7e7e23](../../runs/G1/G1-xtdb-20261108T013218Z-7e7e23.json) | 25 / 25 / 38 | FAIL; 2,700-second harness timeout |
| XTDB on | No receipt in WIP or EXP-J01 run inventory | — | Not run / not verified |
| QLever off, f1 | [c834f9](../../runs/G1/G1-qlever-20261108T021919Z-c834f9.json) | 69 / 9 / 10 | FAIL; 2,700-second harness timeout |
| QLever on, f1 | [e1de94](../../runs/G1/G1-qlever-20261108T030804Z-e1de94.json) | 84 / 4 / 0 | FAIL; recursive reads time out, complete suite fails |

QLever runs used planner budget 1. The four on failures are recursive pagination and transitive closure, each in both
phases; these also time out off. All nine off failures are deadlines. XTDB has 24 deadline failures and one
`ConformanceError: a missing required fact should produce ConstraintViolationError` in the graph-constraint case.
The firstFailures array is capped and omits that semantic-looking error; full raw executions were inspected.

Timeouts coexist with multiple resident jobs and high recorded CPU demand. Engine overload/query cost is the working
classification, not a causal proof; no semantic acceptance follows from it. Per the dispatch instruction, those failures
were retained without retries. No missing XTDB-on run was invented or launched as a rerun. The one non-deadline failure
is rerun separately by [p11](probes/p11-constraint-rerun.mjs), with explicit `a0`, a fresh scope and the unchanged public
conformance case. It returned **PASS_SUBSET** in 76,487 ms: [fresh rerun receipt](receipts/constraint-rerun-20261108T211451Z-66b053.json).
The loaded dist digest matches the prior attribution/service digest (`5315e5ff…620b9`), and source-before/after identities
and the resident owner bytes are retained. This result is diagnostic only and cannot replace full G1.

The gate receipt does not explicitly bind the encoding environment. [The saved XTDB mode probe](probes/p9-g1-xtdb-off.out)
found 57 A0 guards and zero compact guards in the sampled off-run records. QLever off/on are requested modes according to
the notes/launch handoff; no saved QLever p9 output proves their actual persisted encoding. This remains an evidence gap.

[CX-J01 offline audit](receipts/CX-J01-offline-audit.json) checks all nine available non-superseded raw receipt references
against their hashes, exact attribution closure for five receipts, and all three raw G1 report hashes against their
receipts. Original failures and superseded attempts are retained. No engines were stopped/recreated and no shared checkout
source was edited. This continuation changes the report and adds diagnostic/audit evidence, preserving the existing candidate.

## Open work for the reviewer/orchestrator

- Neither lane meets 3x; a one-record journal is a proposed next experiment requiring reconstruction for match, Datalog,
  temporal history and erasure, not a safe substitution in this report-finishing round.
- Full G1 remains failing; XTDB compact-on full G1 and QLever persisted-mode proof remain absent. Isolate engine/query
  overload before renewed complete qualification. The selected constraint rerun cannot close this obligation.
- Fresh-engine and after-10k measurements, independent oracle comparison, erasure coverage, broker-batch attribution,
  total storage growth and the full TARGETS P2 workload remain unverified.
- A separate adversarial reviewer must qualify the branch. This builder does not self-certify promotion.
