# EXP-J01 adversarial verification — CX-VJ01

North star: **P2**, small atomic idempotent commits. Scope and fitness: `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`.

**Verdict: FIX-FIRST.** Reviewed `exp/J01-bytes-per-commit` at `5cc42fb`, against main's `ab31bebc54bf11a8fba82bb5a9a2c0a7198d6127` (merge base `83b384334610043bd29ccc7f2b5f0ba0384361bc`). This is independent review, not implementation. Only `lab/verify/J01/` is changed. No implementation fix, merge, push, engine lifecycle operation or exclusive-slot reservation was performed.

## Findings

### F1 — Medium: the supposedly default-off option changes the public XTDB client's parameter contract

**Location:** `packages/xtdb/src/XtdbClient.ts:145-154`.

The new array branch runs in the common `parameters()` mapper used by both `query` and `submit`. It does not inspect commit encoding. In main, every array is bound through JSON OID 114; in this candidate a nonempty all-string array is bound as PostgreSQL `text[]` OID 1009. The change also rejects an ill-formed UTF-16 member that main passes to the JSON encoder. Empty and numeric arrays still take the old path. An explicit `commitEncoding: "a0"` on the adapter cannot restore this client behavior; the public `makeXtdbClient` has no encoding selector at all. Native `context.bind` also forwards arrays through this client (`packages/xtdb/src/native/Sources.ts:33-35`). The comment “No A0 statement passes an array” only accounts for adapter-generated statements, not the public client/native surface.

**Reproduction:** `node lab/verify/J01/prepare-baseline.mjs`, then `node lab/verify/J01/wire-audit.mjs`. The independently instrumented baseline and candidate sources receive the same `query('SELECT $1 AS value', [['a','b']], undefined, { parameterSyntax: 'postgresql' })`. With `TRIPLEX_COMMIT_ENCODING` unset, recorded driver parameters are `{ value: ['a','b'], oid: 114 }` versus `{ value: ['a','b'], oid: 1009 }`. `['ok', String.fromCharCode(0xd800)]` reaches the baseline driver and throws before reaching the candidate driver. See `wire-audit.json` and `wire-audit.log`. These establish client binding/input behavior; native engine answer evidence is reported below separately.

**Live confirmation:** `parameter-regression.json` runs both immutable clients against shared XTDB `:5470`, with the encoding environment unset. For `[["ok", String.fromCharCode(0xd800)]]`, main returns `["ok", "?"]` and the candidate rejects with the new Unicode `TypeError`. The four sampled well-formed inputs (ordinary string array, empty array, numeric array, and Unicode/quote/backslash/newline array) have equal echo and ANY results. This demonstrates changed rejected-input behavior and transport types, not a proven wrong answer for a valid Unicode array. Main's substitution is itself undesirable, but changing it globally is outside the promised default-off isolation; a separate explicitly reviewed hardening change would be a different contract.

**Proposed fix:** make text-array binding an explicit parameter descriptor used only by compact guards, preserving the existing JSON handling of untagged arrays. Add a differential public-client/native regression with compact disabled, including empty/string/mixed arrays and both query and submit. Do not infer the required encoding from the array's contents.

### F2 — High: the compact-on correctness gates required for merge are missing or failing

**Location:** `lab/experiments/EXP-J01-bytes-per-commit/REPORT.md:169-191` and the three linked G1 receipts.

There is **no XTDB compact-on full G1 receipt**. QLever's requested compact-on full G1 is **FAIL**, 84 pass / 4 fail / 0 unrun, with no saved persisted-mode proof or explicitly bound encoding environment. Default-off G1 also fails on both lanes. Same-implementation equivalence and one constraint rerun cannot replace these gates. The report is candid about these gaps; they nevertheless block the commander's merge condition.

**Reproduction:** `python3 lab/verify/J01/audit.py` hashes the retained raw G1 reports and counts their executions independently; see `attribution-audit.json`, `g1[].rawReports`. Failed original attempts are retained. No new full G1 was launched by this verifier: those multi-hour suites exceed the requested light shared-resident check.

**Proposed fix:** retain the existing failures; obtain fresh source/build-bound passing off/on qualification on each lane, with actual persisted encoding and environment bound in the receipt. Diagnose the overloaded recursive paths rather than waive them as timeouts. Supply erasure-marker and crash/recovery coverage described below before claiming all read/recovery paths are qualified.

### F3 — Low: the rejected JSON-array alternative was tested as a JSON string

**Location:** `lab/experiments/EXP-J01-bytes-per-commit/probes/p5-array-param.mjs:40`, and its interpretation in `REPORT.md:133` / `packages/xtdb/src/XtdbClient.ts:142-144`.

The JSON probe calls `sql.typed(JSON.stringify(ids), 114)`. The installed pinned postgres driver's JSON serializer then calls `JSON.stringify` again (`postgres/src/types.js:16-20`), so XTDB receives a JSON **string**, not a JSON array. That result cannot establish that correctly bound JSON arrays fail the guard. The independent live check already shows main's correctly bound `["a", "b"]` makes `SELECT 'a' = ANY($1)` return true. This does not itself qualify an existing-row guard, but it contradicts the broad rationale that JSON arrays cannot match ANY. See `json-probe-audit.json` and `parameter-regression.json`.

**Reproduction:** inspect the retained probe and driver serializer, or compare `JSON.parse(JSON.stringify(ids))` with `JSON.parse(JSON.stringify(JSON.stringify(ids)))`; the latter is a string. **Proposed fix:** retain the old result as a double-encoding control, test `sql.typed(ids, 114)` against fresh/existing/scoped IDs, and correct the comments/report before rejecting that alternative. Do not infer that the new global `text[]` mapper is necessary from the current probe.

## Attribution independently recomputed from retained receipts

`audit.py` parses the retained QLever SPARQL VALUES blocks without using the builder's parser, classifies subjects by their raw attribute triples, and measures UTF-8 literal/update bytes. It also recomputes XTDB increments from cumulative receipt values, decodes the raw captured assertion insert columns, verifies every available raw-file digest, recomputes service percentiles, and independently counts raw G1 executions. It never reads the experiment report for expected numbers.

| Ten-fact source | XTDB A0 bytes | XTDB compact bytes |
| --- | ---: | ---: |
| Record + position | 1,851 | 1,851 |
| Operation receipt | 1,176 | 1,176 |
| Command claim | 1,296 | 1,296 |
| CAS + claim serialization guards | 984 + 704 | 1,352 |
| Operation identity guard | 720 | 720 |
| Data assertions | 6,824 | 6,816 |
| Data identity guard expansion | 2,112 | 632 |
| Journal envelope + identity expansion | 2,842 | 2,320 |
| Journal changes + identity expansion | 11,552 | 10,234 |
| **Sum / recorded measurement** | **30,061** | **26,397** |

Both retained A0 XTDB attribution receipts agree. Savings are **3,664 bytes, 12.19%, 1.1388x**, not 3x. Journal + guard expansion is **14,394 / 30,061 = 47.88%**, falsifying the “more than half” prediction for this command shape. Raw assertion parameters confirm 10 data, 4 envelope and 10 change rows, with 267 JSON bytes and 291 identity bytes per change.

**Evidence limit:** XTDB's retained raw files contain only the captured ten-fact SQL/parameters. They do not contain each replay's actual log offsets or Arrow record bytes. Therefore the table's arithmetic closes exactly, but the per-step engine byte observations cannot be independently reconstructed offline. The increments are order-dependent marginal allocation of shared layout overhead, not intrinsic per-source sizes or total disk growth. The P2X retained reconstruction increments also sum to **95,364**, including **60,192** for the last stamped assertion step; that receipt has no raw measurement attachment.

| Ten-fact source | QLever A0 triples | Compact triples | A0 object bytes | Compact object bytes |
| --- | ---: | ---: | ---: | ---: |
| Data | 270 | 180 | 8,250 | 7,540 |
| Journal position | 30 | 21 | 915 | 844 |
| Journal instant | 30 | 21 | 965 | 894 |
| Journal command-id | 27 | 18 | 1,035 | 964 |
| Journal changed-entity | 27 | 18 | 901 | 830 |
| Journal changes | 270 | 180 | 21,590 | 20,880 |
| Position metadata | 2 | 2 | 4 | 4 |
| Claim | 4 | 4 | 92 | 92 |
| Operation | 3 | 3 | 79 | 79 |
| **Sum / recorded inserted** | **663** | **447** | **33,831** | **32,127** |
| **Update text bytes** | — | — | **102,005** | **78,293** |

All five raw updates in each arm reconcile, including three repeated ten-fact commands. The receipts report two deleted metadata triples each. Inserted-triple savings are **216, 32.58%, 1.4832x**; object text shrinks only 5.04% and full update text 23.25%. Journal triples are **384 / 663 = 57.92%**, supporting that prediction for QLever. Object bytes are UTF-8 RDF object source text, not wire text or storage volume. Raw VALUES text independently verifies the logical insert counts; actual engine delta observations remain observations in the receipts.

| Size | XTDB A0 / compact bytes | QLever A0 / compact inserted | QLever A0 / compact update bytes |
| --- | ---: | ---: | ---: |
| 1 | 14,443 / 13,123 | 177 / 123 | 26,333 / 20,405 |
| 10 | 30,061 / 26,397 | 663 / 447 | 102,005 / 78,293 |
| 50 | 100,013 / 85,869 | 2,823 / 1,887 | 438,885 / 336,133 |

Service raw samples reproduce report percentiles (XTDB 96/arm: A0 2,887.7/4,900.7 ms p50/p99, compact 2,982.2/6,126.7; QLever 60/arm: A0 7,430.3/14,412.6, compact 6,972.7/12,788.9). These are saturated shared-resident closed-loop diagnostics. They establish no P2 latency improvement, no 256-reader writer floor, no fresh-engine/after-10k result, and no full application/outbox/broker attribution.

## G1 evidence inventory

| Lane / requested mode | Receipt suffix | Pass / fail / unrun | Actual compact-on qualification |
| --- | --- | ---: | --- |
| XTDB off | `7e7e23` | 25 / 25 / 38 | None; fails and times out |
| XTDB on | absent | — | **Absent** |
| QLever off | `c834f9` | 69 / 9 / 10 | None; fails and times out |
| QLever on | `e1de94` | 84 / 4 / 0 | **Failing requested-on run; persisted encoding unproven** |

The three raw-report hashes match their original G1 objects. QLever on failures are recursive pagination and transitive closure in both current/reopen phases. XTDB includes one non-deadline graph-constraint failure; the later A0 subset pass does not erase it or establish compact-on acceptance. No inference of causal overload or semantic correctness follows from matching error names.

## Independent execution and remaining limits

The following checks were actually executed on freshly built candidate code:

| Check | Observed result | Evidence |
| --- | --- | --- |
| Build core, testkit, XTDB, QLever and backend declarations | PASS | `build.log` |
| Main/default-off/explicit-A0 adapter statement equality, 24 adversarial values per lane | PASS; normalized only random operation/attempt identities | `offline.json`, `offline.mjs` |
| A0/compact staged rows; 48 QLever asserted/retracted persisted row shapes versus main | PASS; exact values, including -0 | `offline.json` |
| Candidate's focused unit tests | XTDB 6 pass / 3 live-only skip; QLever 4 pass | `xtdb-unit.log`, `qlever-unit.log` |
| Public XTDB client with encoding off versus main | Binding/input contract differs; four well-formed samples agree | `wire-audit.json`, `parameter-regression.json` |
| Existing assertion ID in each lane/encoding | All four PASS; no position advance, no overwritten value, no leaked claim | `identities.json`, `identities.log` |
| XTDB full read frontier | Six stages PASS per arm; 18 saved read/result surfaces agree; later harness assertion fails as explained below | `live-xtdb.json`, `live-xtdb.log`, `partial-comparison.json` |
| XTDB previously skipped recovery/race frontier | Four stages PASS per arm, equivalent | `live-xtdb-recovery.json`, `live-xtdb-recovery.log` |
| QLever full focused script | Ten stages PASS per arm; all 22 read/result surfaces equivalent in memory | `live-qlever.json`, `live-qlever.log` |

The independent values include signed-64 endpoints, integers above 2^53 and at the QLever native-shadow boundary, safe-integer endpoints, binary64 subnormal/decimal/adjacent values, negative zero, extreme datetime values, long Unicode/escaped strings, high-precision decimal strings, booleans, refs, JSON and blobs. The live command stores 20 values; the offline case stores 24, including `Number.MAX_VALUE` and 64-KiB text. Exact sign assertions run before JSON serialization.

The live script checks read-your-own-write, an exact commit-position cut after replacement even when timestamps are equal, half-open valid intervals, a prior recorded-time cut, history, stale preconditions, original duplicate receipts, journal changes, a resumed feed, dependency state and Datalog at the old position. Recovery tests inject transport loss after actual publication, hide the resolution channel, reopen a client and recover by command ID; inject failure before send and then explicitly retry; and race duplicate commands and empty-entity CAS preconditions. Exactly one command publishes in each race. These are transport/client recovery tests, not engine-process crash tests. No slots were acquired and no resident was stopped, restarted or recreated. Synthetic scopes and the original failures are retained.

**Verifier failures retained, not promoted:**

- `build-attempt1.log`: the first queued build command never built; pnpm 10 rejects `--store-dir` on run/exec. The successful build uses the installed pinned binaries directly, with no new installation. The only install used the project store, `--offline --frozen-lockfile --ignore-scripts`; see `install.log`.
- `offline-attempt1.log`: the first offline comparator did not normalize the random operation UUID's base64 IRI form. The corrected comparator normalizes only operation/attempt identities; its completed result is `offline.json`.
- `live-xtdb.json` and `live-xtdb.log`: both arms stopped after six passing stages because the first verifier expected `_tag === "TransactionOutcomeUnknown"`. Core deliberately retains `_tag === "WriteError"` on that subclass (`packages/core/src/errors/index.ts:34`), with `reason === "outcome-unknown"`. `live-attempt1.mjs` preserves that exact failed harness. The corrected recovery-only attempt checks the actual class/reason and runs only the four skipped stages in fresh scopes; it does not rerun the six passing read stages. The original aggregate check process therefore exits 1; that exit is a retained verifier failure, not a claimed whole-suite PASS.
- The QLever run used the corrected class/reason harness, preserved as `live-qlever-attempt1.mjs` (`harness: live.mjs:v2`). Its equivalence comparator preserves negative zero in memory, but its saved JSON snapshots render -0 as 0. The XTDB initial snapshots have the same serialization limit. `partial-comparison.json` explicitly limits its saved-snapshot comparison accordingly; it is not raw-bit proof. Direct exact assertions checked negative zero at commit/read/cut, and the independent offline row roundtrips also checked its sign. Current `live.mjs:v3` preserves the signed-zero marker in saved output and was used for the XTDB recovery frontier.

`identity-before.json`, `identity-after.json` and `identity-final.json` bind candidate source, built JavaScript/declarations, lockfile and resident-owner observations. Source/build/lock/config file hashes present before execution are unchanged at final readback; the two owner-file hashes are unchanged. Final identity also hashes the verifier tools and the retained harness versions. These owner-file observations are not a new container-image attestation or a full G1 receipt. Baseline code was copied from the pinned Git revision, not read from mutable main-checkout dist; generated baseline copies are ignored and reproducible with `prepare-baseline.mjs`.

The reviewed core exposes only assert, retract and retract-pattern (`packages/core/src/Triple.ts:124-129`) and no decimal/ErasedValue kind (`packages/core/src/Value.ts:3-12`). The verifier tests high-precision decimal text and scaled/exact integers, not a nonexistent decimal API. Q49a identity-only erase commits, post-erasure journal markers, protected copies and physical erasure remain unverified. Retraction is never counted as erasure.

No full G1, process/engine-kill crash test, independent O-REPLAY oracle run, P2 performance run, production concurrency test, storage-growth measurement or 10k-depth benchmark was performed. Such work is not implied by passing the focused checks.
