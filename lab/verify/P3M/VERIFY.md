# CX-VP3M: EXP-P3M adversarial offline review

**Verdict: ACCEPT-OFFLINE.** Target: `exp/P3M-bench-feed` at `d523f632` (the exact initial HEAD of this review worktree). No blocking defect found within the documented offline/provider contract. This accepts measurement plumbing with an honest source provider; it does **not** establish actual native publication timing, native prefix completeness, P1 workload fidelity, or NS.P3 acceptance.

North star: P3 lag, ordered feed and complete source-prefix accounting under `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md` 1.1 P3, Q55d and Q67d. Scope/protocol were read first. Review changed only `lab/verify/P3M/`; implementation, package sources, lockfile and `lab/acceptance/` remain unchanged.

## Fresh execution

- Frozen offline installation: Node 24.18.0, pnpm 10.11.0, explicit project store and worktree-owned npm/node-gyp caches; no lockfile change. `install.log` retained.
- Initial independent attempt `85adc068-239a-4c04-8828-a2f4c91a0986`: fresh core/host/testkit public builds, host declarations, all six builder tests and initial reviewer probes succeeded with source unchanged.
- Expanded independent attempt `1ed160f2-ca9f-42f3-8150-8f354d1fbd7f`: repeated fresh builds/declarations and all six builder tests; expanded reviewer probes succeeded, source unchanged. This adds actual publication-sidecar lock delay and a permanently stalled reader. It binds reviewer scripts as well as target sources. Earlier results remain retained.
- Independent G0 `G0-xtdb-20261109T070913Z-711e06`: **PASS, full scope, 1,246 passed / 0 failed / 137 expected skips**. The six P3 tests ran here too. Diagnostic, slot null. No engine slot, live endpoint or Docker operation was used.

`commandsSucceeded` in the review execution record means the listed commands and assertions succeeded; the reviewer assertions include deliberately surviving invalid-provider cases. It is not a native lane qualification result. A sandbox-denied read-only `kern.bootsessionuuid` inspection was observed before execution; actual clock tests used authorized host access without a fallback, fake clock or skipped test.

The first evidence-archive helper attempt failed when the receipt referenced a read-only copied object twice. Its manual transcript index is retained as `archive-first-failure.md`. The helper was corrected to verify and reuse an existing matching object; no gate result changed. Reviewer-script lint and `git diff --check` passed.

## Requested cases and results

These numbers are from the expanded attempt's `review-fixtures/outcomes.json`, not builder evidence. All real runs use the actual P3 driver, separate consumer/reader workers, public FD01 broker adapter and durable SQLite store.

| Case | Result |
| --- | --- |
| Exact 100 / 249 / 251 / 400 ms | Exact through real producer records plus explicitly synthetic durable-known instants and `auditP3`: pooled p99 400, steady p99 249, burst p99 400, `lagWithin250ms:false`. This is arithmetic validation, not a claim of exact timer scheduling. |
| Actual delivery delay 100 / 249 / 251 / 400 ms | Observed 107.784792 / 251.993166 / 256.542458 / 403.540291 ms. Real observations include polling, scheduling and durable-write overhead. No histogram quantization. |
| Delay **inside record persistence**, timely capture | A separate worker holds `BEGIN IMMEDIATE` on the publication DB for 400 ms as the hook runs. All four samples include it: 512.859 / 488.482667 / 503.639750 / 489.871917 ms. Bar false. FD01 captures before obtaining the sidecar lock; this delay cannot disappear. |
| Delay **before first capture** | A source becomes readable, then waits 400 ms before invoking `published`. Receipt reports 18.838208 / 10.075583 / 14.557000 / 14.294291 ms and bar true; independent source-to-known observations are 420.675000 / 412.900875 / 416.175083 / 419.084000 ms. See integration finding I1. |
| Reader-side delay only | All 256 clients complete an initial read, stall their next pull for 500 ms, then resume. Measured writer window 119.090541 ms; all clients have three total completions and pending reads spanning that window. Label remains 256 closed-loop clients; feed p99 20.151542 ms does not acquire the reader's 500 ms. This is correct client concurrency, **not** a reader-goodput certification. |
| Reader error / clean early process exit / permanently stalled reader | All refused. Specific errors: planted reader failure; exit without clean result (including exit code 0); timeout-induced worker termination. No positive receipt. Removing one observed reader from a valid 256-client result is also refused. |
| Delivery omits a source-published position | Refused by byte-exact source-prefix audit (`Feed gap/extra resolution`). Lost-ACK `cmd-2` remains in the faithful baseline's four-position denominator. |
| Duplicate source position | Source recorder refuses conflicting publication identity. Independently supplied duplicate positions and repeated source resolutions are also rejected by audit mutations even when expected and delivered entries share the duplicate. |
| ACK for never-published position | Refused (`ACK not in final published prefix`). |
| Missing instant | Running consumer refuses before committing that position. Builder's independently rerun test also reads the store and verifies no effect for that missing position. |
| Delivery and final-prefix enumerator both omit lost-ACK position 2 | Survives: coverage 3 and completeness flags true despite four source/sidecar publications. See integration finding I2. An offset gap alone cannot be rejected because positions are explicitly non-dense. |

## Findings and native integration prerequisites

### I1 — informational: origin binding does not establish event placement

Locations: `lab/bench/lib/p3.mjs:188` (the hook calls `writer.publish`), `lab/bench/lib/p3.mjs:81` (broker watermark comparison), and `packages/host/src/feed/PublicationClock.ts:98` (capture immediately before the sidecar transaction).

Reproduction: `late-source-record` in `probes.mjs` makes the source readable before delaying the first hook invocation. All observed bytes have the correct attempt, host/boot origin, position, publication identity and digest. However, they describe the later hook, not the earlier source publication. For Q, the returned `watermarkAt` and the record both come from that same capture, so comparing them does not independently prove the broker event. The API rejects later substitution **after an original record exists**; it cannot infer a missed earlier event when the first record itself is late.

This violates the documented instruction to invoke the trusted hook synchronously at publication. Both the README and builder report explicitly retain that trust boundary. It is not a blocking defect for the stated offline harness qualification. The record-lock counterexample above establishes that ordinary slow record persistence with a timely hook is handled correctly.

**R44 plug-in / proposed integration requirement:** put the trusted instant into the producer-owned record at each source's actual publication transition, preserving the host/boot origin and exact position/publication identity. `openSourceRecorder.published` is the integration seam. If R44 chooses an existing native timestamp rather than hook-time capture, FD01's producer API must preserve and validate that observation; accepting a caller's arbitrary `atNs` would not solve provenance. `auditP3` must cross-check the chosen source evidence, not merely two fields derived from the same later capture. X currently accepts a nonempty `systemTime` string without proving its relation to the hook; D's adapter remains unavailable. R44 was not present in this review checkout, so its final policy is not assumed here.

### I2 — informational: completeness is conditional on an honest independent enumerator

Locations: `lab/bench/p3-driver.mjs:129`, `lab/bench/lib/p3.mjs:54`, and `lab/bench/lib/p3.mjs:158`.

Reproduction: `common-prefix-omission` publishes source positions 1–4, preserves their four producer records, and intentionally removes lost-ACK position 2 from both delivery and `finalPrefix`. The raw source file still contains resolutions 1–5, including the abort at 5. The harness sees matching three-position lists and emits `allPositionsAccounted:true` and `sourcePrefixEnumerated:true`. ACK reconciliation cannot catch this because position 2 has no ACK. A faithful complete prefix catches the same delivery omission as expected.

This is an intentionally invalid provider: `finalPrefix` no longer implements its documented source-enumeration contract. A generic harness cannot prove a backend enumeration is exhaustive simply by validating its supplied list. It is a native-provider prerequisite, not a reason to add an invalid dense-coordinate assumption or claim a new FD01 regression.

**Proposed integration requirement:** independently qualify each native enumerator against its durable source ledger and final resolved frontier, including this common-omission witness. Bind the raw enumeration bytes and frontier. As useful additional hardening, enumerate this fresh attempt's producer records and reject an unexplained source-publication record absent from the claimed complete prefix; the current reader only supports keyed lookups, so that needs an explicit inventory facility. Such a cross-check catches the particular contradiction demonstrated here but cannot replace native source enumeration if both records were never produced.

### I3 — informational: reader level is client occupancy, not window goodput

Locations: `lab/bench/p3-worker.mjs:23` and `lab/bench/lib/p3.mjs:108`.

The 500 ms stall case legitimately returns level 256 because those 256 closed-loop requests remain outstanding. First/last completions bracket the window; this does not require completions within it. Early exits and permanent stalls cannot obtain a positive result. Keep this label as client concurrency and use the separate P1 correctness/goodput gates for load fidelity. No change is required for the offline contract; a claim of 256 healthy/progressing native readers would need additional native read outcomes and per-window progress evidence.

## PASS / verdict / receipt audit (rule 9a)

| Reviewer site | Content | Freshness | Binding |
| --- | --- | --- | --- |
| `probes.mjs` positive/negative assertions and `outcomes.json` | Uses actual returned receipts, exact arithmetic, raw samples, independent source truth, specific rejection regexes and coverage/count checks; survival cases are explicitly labelled | Fresh `runP3` UUID/source/SQLite files/workers per named case; no reused observations | Exact receipt config and raw paths; declared lock-worker input; final runner hashes reviewer scripts and target sources/build commands |
| `provider.mjs` independent source truth and publication hooks | Saves actual readable source state before optional delay; uses the actual FD01 recorder, not an invented publication digest; controlled faults are explicit options | New state and recorder for every attempt | Exact source/stream/position/transaction; raw source and publication DB retained with receipt |
| `run.mjs` `commandsSucceeded` execution record | All required command exit codes zero and source hashes unchanged; actual logs hashed; failed steps stop execution | UUID execution directory; fresh package builds and tests | Hashes target package/bench sources, lockfile and reviewer `.mjs` scripts; records commands, cwd, Node and null slot |
| Existing P3 driver / six builder tests, independently exercised | Implementation sites are identified in the target's rule-9a table; this review reruns their actual public-build paths and adds faults above | New fixture attempts, not adopted historical PASS receipts | Driver input/build/producer/store bindings and reviewer source manifest; provider trust remains explicit |
| Existing G0 parser/receipt, independently exercised | Actual TAP/vitest/oracle results and expected skips, not an emitted `passed:true` alone | New G0 ID and builds | Existing source/build/runner/raw-input receipt; diagnostic, slot null; no native acceptance claim |
| `evidence.mjs` archive and SHA256SUMS | Byte hashes read back for copied receipt and every content-addressed object; manifest covers durable raw files | Selects this review's run from its new log and requires `experiment:CX-VP3M` | Exact G0 run ID, immutable receipt bytes and SHA256 object identities; no rewritten gate result |
| This report's ACCEPT-OFFLINE verdict | Based on actual assertions and documented source-provider contract; discloses both surviving invalid-provider cases | Expanded independent execution and G0 cited here | Exact target `d523f632`; restricted to offline plumbing, no native performance promotion |

## Reproduction and retained evidence

From this worktree, use Node 24 on PATH and the explicit project pnpm store when installing. Run through `heavy.mjs`:

```sh
env PATH=/opt/homebrew/opt/node@24/bin:$PATH node lab/bin/heavy.mjs --label CX-VP3M-review -- node lab/verify/P3M/run.mjs
```

On macOS FD01 requires the authorized read-only boot-session lookup. The runner never replaces it with a fake clock. For G0, prepend this directory's `bin/` wrapper to PATH so gate subcommands all use the project store, and set `P3M_EVIDENCE` to an owned durable evidence directory.

Durable root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VP3M/`. `EVIDENCE.md` indexes it; `SHA256SUMS` paths are relative to that root. Raw evidence stays outside git. The small copied G0 receipt keeps original bytes and original raw-path fields; the index maps those paths to the durable archive.

No existing pinned path changed, so there are no old/new pin hashes to report. No implementation fix, native Q/X/D provider, live engine run, P1 mix/answer qualification, O-DOMAIN affected-set verification, R44 implementation, production timing certification, merge, push or package publication was performed.
