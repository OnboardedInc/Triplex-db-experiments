# EXP-F02b wire exactness fixes: report (saved by the orchestrator, 2026-11-08)

**Status:** code complete; XTDB proven (falsifier: 0 silent changes); QLever falsifier rerun owed (the shared QLever resident was
OOM-killed three times during the runs); both G1 receipts FAIL for infrastructure reasons only. Branch `exp/F02b-wire-exactness-fixes`:
2b59021 (code, tests, falsifier changes), 08368fa (XTDB after-fix results, both G1 receipts, falsifier checkpoints).

## Changes (code comments cite Q30a-e, Q34c and the F02 record ids)
1. Q30a user JSON guard: `packages/core/src/content/ExactJson.ts`, `packages/core/src/store/exactValues.ts`; user JSON with -0 or a
   non-finite number is refused with InvalidTripleError invalid-value detail inexact-json-number in TriplesLive and KvTriplesLive before the
   transaction opens; CanonicalJson unchanged; `ExactJson.firstInexactNumberText` ready for bulk import, replay and restore (no such routes on
   main yet); `approximateNumbers: "reject"` covers number nested in List, Struct, Constrained; json rules `[Finite, NoNegativeZero]` look
   inside the value.
2. Q34c/AMB-04 journal encoding: the guard runs on user operations only (system writes and the journal are exempt); both lanes' `packValue`
   use `ExactJson.stringify` (identical bytes to JSON.stringify except -0 is written as `-0`, which JSON.parse reads back as -0); journal
   shape unchanged; canonical identity unchanged. Paired live test passed on both engines (packages/xtdb/test/negative-zero-journal.test.ts,
   packages/qlever/test/negative-zero-journal.test.ts): user JSON -0 refused with nothing written; number -0 commits, journals, a repeated
   commandId returns CommandAlreadyCommitted with the original transaction, replays into a fresh scope, reads back with the sign bit set.
3. Q30b instant -0 rejected (detail negative-zero-instant), `NoNegativeZero` in the spec on both engines.
4. Q30c pinned XTDB encodings: ProjectionSpec records `xtdb.wire` (bind, param, shape scalar or `ARRAY[CAST(? AS T) ...]`, proven reads;
   date and instant text reads only); `checkXtdbWire` refuses other encodings (ProjectionSpecError unpinned-encoding); XtdbClient refuses a
   JSON parameter containing -0 or a bigint before sending.
5. Q30d QLever shadow predicate: refuses -0 and any value whose `%.13g` rendering does not parse back; integers only within ±2^59;
   NativeContext uses the same predicate and encoder (stricter than F02's evidence: integral doubles above 2^59 are flagged inexact).
6. Q30e integer range rule = safe-integer range on both engines.
7. Falsifier: `--tag`, spec-refused encodings get `n/a-encoding-refused-by-spec`, a `wire-coverage` check (every kind and cardinality has
   at least 4 measured records on its pinned encoding), per-section checkpoints, `summarize.mjs`.

## Falsifier, before (EXP-F02) and after
| Engine, kind | Before | After |
| --- | --- | --- |
| xtdb json | 12 silent | 0 |
| xtdb number | 6 silent | 0 |
| xtdb instant | 7 silent, 11 typed | 0 silent, 10 typed |
| xtdb int64 | 30 rejections (JSON parameter) | 2 (deadline timeouts) |
| xtdb date | 6 typed | 6 typed |
| xtdb ref | 0 | 2 (deadline timeouts) |
| spec gaps | 3 | 0 |
| qlever instant / json / number | 3 / 6 / 4 silent | rerun owed (each of the 13 has a unit test failing before and passing after) |

## Gates
- G1 xtdb `G1-xtdb-20261107T211902Z-b13d53`: FAIL, load only (38 of 88 ran before the 2,700 s gate timeout; 22 passed, 16 timeouts, no
  assertion failures; 482 s per suite against 11 s in the passing baseline).
- G1 qlever `G1-qlever-20261107T205528Z-cdee40`: FAIL, engine down (all 88 "Cannot access QLever RDF server").
- Unit tests: core 850/850, xtdb 22 run, qlever 35 run; tsc clean for core, xtdb, qlever, testkit, qualification, http.

## Open
- InvalidTripleError added to the transact error union and four dependent unions (ConfigStore CommitError and setRef, RevalidateError,
  MaterializationError, ConsumerCheckpointError): accepted.
- The HTTP layer parses JSON bodies before the guard (precision lost there is undetectable): follow-up for EXP-R02 (parse with ExactJson).
- sqlite, postgres, duckdb adapters still lose -0 in JSON: not qualified lanes, out of scope.
- The KV runtime's own journal encoding is unchecked: follow-up.
