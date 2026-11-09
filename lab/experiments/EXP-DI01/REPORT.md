# EXP-DI01 — dependency-index consumer

Builder: CX-DI01. Branch: `exp/DI01-dependency-index`, based on accepted FD01 `731e10e4075715c65c10f2ce720de2d3dcee9b1a`.

North star: P3, ordered resumable delivery telling the runtime which subjects to rerun. Scope and targets are those in `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`, and the copied DI01 brief. This is an offline builder experiment, not an independent promotion or a live-lane qualification.

**Status:** all eight offline builder gates passed, and the additional raw readback audit passed. Independent promotion/review remains outstanding. Implementation commit: `96b9a259`; this final report/evidence commit completes the builder handoff.

## Implementation

1. The starting branch was already `exp/DI01-dependency-index` at FD01. `BRIEF.md` was copied byte-for-byte from `c8fe192d`; SHA256 `a7e5a2acca9a53a8260545b88e0e87cbac39e287f58d60ac38f65583e073e770`.
2. `SqliteConsumerStore.applyDerived` uses FD01's existing transaction. CAS/order checks precede derivation; derived rows are checked against page positions. Derivation sees only new deliveries, so replay cannot compute against post-state and change the affected set. Existing `apply` callers and the FD01 suite remain intact.
3. Reference readers implement the same one-hop seam for storage, memory `sweepPage`, and command-log replay. Storage reads bind `recordedPosition` and reject future/retracted rows. The optional head-only guard checks head before/after the batch for a head-only route. Reads happen before the write transaction; rejection leaves checkpoint/index/effects untouched. No latest fallback exists.
4. The SQLite index stores four reference attributes, the active release, fact/rule boundaries, the obligation watermark, and a durable configuration binding for V and compiled plans. Release plans come from the compiled W0 evaluator's static dependencies instantiated with sentinel references, rather than a copied business-attribute table. All changes at a position use the before-state; positions are processed ascending; activation applies from the next position. Prepared derivations check exact page bytes before using their pinned values.
5. `affectedAt`, `reach`, `instantiated`, `due`, and `recordObligations` expose the durable results. Only a newer obligation basis replaces a subject's rule boundaries, including replacement with an empty set. `due` does not create feed effects or synthetic feed positions.
6. The nine case fixtures union agreeing facts, group by tx, compare reconstructed kernel dependencies to each original world, and then deliver the written pairs through DI01. C67 and C96 are input-validation cases and are **not applicable**, not passes.
7. The trace uses `seedCommands(10000)`, unchanged `mapW0Trace(generateTrace(...))`, and a separately hashed seeded overlay. It includes shared wages, both reference hops, retraction, unlinked documents/decisions, same-position hop changes, R1→R2 activation, and ballast. Duplicate trace command resends create no extra position.
8. Expectations come from command-log `visibleRows` / `reachableRows` / `worldOf` bodies passed to the unchanged independent O-DOMAIN process. Every overlay and every 1,000th position passes all worlds, as do shared writes. Caches avoid re-sorting and re-encoding an unchanged expected world: it is keyed by the visible immutable assertion IDs, never by the candidate index or by an affected result. All positions still invoke O-DOMAIN; full-world calls partition the complete unique-subject list over three unchanged Python oracle processes and union their independently computed sets (SPEC 10 additivity). Duplicate/shape controls use the unsplit route. Raw worker output, request ordinals and input hashes are retained. Cache/ordering tests cover older cuts, changed shared hops, unlinked records, changed V, and byte equality with the reference `worldOf`. Only deeply frozen replay worlds may reuse encoded bytes; mutable caller worlds are re-encoded. No affected output is cached.
9. The 100k paired probe alternates FD01/DI01 order on identical pages, 1,000 samples per arm. All DI01 preparation is charged. Only actual pinned-reader time is excluded for the re-point prediction; full DI01, apply, prepare, and reader times are retained. Fanout is generated from the 100k population's exact reference projection, not hand-authored counts. All 100k dependency sets are cross-checked. Each first diagnostic shared write also executes one kernel rerun per durable affected subject, using full W0 fixture bodies with normalized commit ages; these output hashes are not represented as lane reads.
10. This report and the small evidence index/manifests are committed. Raw databases, oracle output, source/build preimages, and prior attempts remain outside git.

The first 100k probe exposed reverse-lookup cost. A covering `(consumer, attribute, value, entity)` index removes per-worker table reads; the jurisdiction query starts from matching locations using a fixed join order. `query-plan.json` records both covering searches; `query-plan-old.json` records the old broad consumer scan. Toolchain: Node 22.23.2, pnpm 10.11.0, host SQLite 3.51.3. This is the only consumer performance change made in response to the probe.

## Builder gates

| Gate | Result and scope |
| --- | --- |
| 1 — G0 + unchanged FD01 | PASS: `G0-datomic-20261109T071437Z-c6e724`, 1,275 passed, 0 failed, 66 reviewed expected skips. Offline; slot null. XTDB was built first for the qualification loader. Existing clock tests used the actual permitted macOS boot ID. |
| 2 — named cases | MATCH: C34, C35, C36, C57, C58, C59, C60, C87, C121, zero misses/extras. C67/C96 N/A. |
| 3 — 10k seed + mapper + overlay | MATCH: 434,768 seed positions and 3,372 mapper/overlay positions (438,140 total), zero misses/extras; 662 full-world positions. 379,108 positions differ from directly written subjects, so this gate is non-void. |
| 4 — GS.06b | W02 v2 `affectedClaim` ran with DI01 replacing the kernel affected call; positive/negative witnesses and durable rerun/checkpoint passed. At 100k, local wage and jurisdiction re-point each reached 1,100 workers; state wage reached 1,901; all equaled O-DOMAIN and were rerun once. |
| 5 — dependency cross-check | All 100,000 reference-projection subjects matched the kernel exactly, with no permitted extra pairs. At 100 sampled post-seed positions plus the final position, every dependency set for all 10,000 subjects matched exactly. |
| 6 — crash/resume | MATCH: 500 keyed atomic stops over five points; 300 unkeyed split controls; 100 keyed split controls, all rejected before replay. Actual reopened state was audited before recovery; all recovered tables matched the no-crash baseline. 100 duplicate unkeyed effects (the fixture has one affected subject). |
| 7 — boundaries | C19/C20 obligations matched O-DOMAIN and were returned by `due`; a newer empty result resisted an older replay. No rule boundary entered effects/affected. The complete 10k seed produced exactly the 180 expected future-pay-raise subjects, with identical subject-set SHA256. |
| 8 — added lag | All four 1,000-sample predictions met, including full prepare cost; see below. Diagnostic: 0 readers, offline, shared host. |

Nearest-rank p99, milliseconds. “Added” is the p99 of paired sample differences, not subtraction of the two arm p99s.

| Write | Fanout | Full DI01 p99 | FD01 p99 | Added p99 | Pinned reader p99 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Local wage | 1,100 | 24.164 | 22.947 | 13.599 | 0 |
| State wage | 1,901 | 32.206 | 31.867 | 14.045 | 0 |
| Location jurisdiction re-point | 1,100 | 23.252 | 20.305 | 11.364 excluding actual read | 7.777 |
| One subject | 1 | 20.389 | 18.048 | 6.895 | 0 |

The re-point probe alternates J2/J1 on every sample and verifies the new jurisdiction dependency after each apply. The 100k fixture contains 279,489 reference rows and 100,000 worlds. It is a reference projection, not a complete 100k persisted fact/history benchmark. Per-subject reruns use full generated fixture bodies with normalized commit ages. No production latency or live-lane performance claim follows from these measurements.

## Evidence and attempts

Durable root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-DI01/`.

- Final runtime/case/crash binding and preimages: `final-r4/binding.json`, `final-r4/preimages/`, `final-r4/cases/`, `final-r4/crash/`.
- Complete apply-path timing and rerun hashes: `final-r8/lag/result.json`, `samples.jsonl`, `oracle.jsonl`, `reruns.jsonl`; binding and preimages in `final-r8/`.
- Final expected-world cache and trace: `final-r12/trace/result.json`: attempt `9f6c9377-4e4b-487d-ada3-1c17942174c7`, completed 2026-11-09T13:25:23.176Z. Source/build preimages and all raw output retained; binding SHA256 `e0a28db24e55bb2855259740e9e346611758c7d48e33fbfcb7fcc8afbf6fa14b`.
- The stage bindings differ in the explicitly retained harness revisions: complete prepare/read timing, actual alternating jurisdiction targets, expected-world canonicalization, and oracle transport throughput. The final trace also checks the transport against all eleven affected cases and preserves raw bytes per oracle process. Consumer, kernel, and oracle runtime bytes remain identical across the qualified stage bindings.
- Trace V is fixed at `2026-12-01T00:00:00Z`; the separate seed-edge run and 100k probe use `2026-11-04T12:00:00.000000Z`. Named cases use their own recorded basis V.

Earlier attempts are retained. They include the unsupported pnpm `--store-dir` spelling for `exec` (corrected to its config form), initial unbatched/stopped traces, a timing serializer rejecting fractional milliseconds (replaced by JSON serialization for measurements), a real configuration-byte mismatch after JSON key reordering (fixed with a normalized representation), and a source-binding rejection when an overlapping G0 rebuild changed declaration-file byte order. The early noncovering-index timings and transaction-only timing definition are not the final latency gate. G0's first complete run failed on the sandbox boot-ID read and an unbuilt XTDB dependency; neither was hidden or skipped. Subsequent G0 ran with the dependency built and the real local read permitted. Attempt r11 completed 438,140 position comparisons and all sampled checks but exhausted Node's default 4 GiB heap during the separate boundary replay; it emitted no final receipt and is not qualified. Its log and FAILURE.json remain retained. Successor r12 uses unchanged source with an explicit 8 GiB Node heap. Long expected-side trace canonicalization was addressed by the assertion-ID cache; partial prefixes were not adopted as completed trace gates.

Evidence retention: stopped-attempt WALs and r11 raw JSONL are retained losslessly as `.zst`. `compression-r12-readmission.jsonl` and `compression-r12-stopped.jsonl` record exact original paths, sizes and SHA256, verified decompressed SHA256, and no-open-owner checks before/after. Restore with `zstd -d`; SQLite family siblings remain. A broad compression request was initially rejected by automatic approval review over an active-r11 concern. Read-only checks proved r11 had exited 134, the active grant was r12, and the exact proposed files had no owners; the narrowed request was approved. No active r12 file was changed.

`pack:check` first failed because the CLI tarball's unrelated dist entry was not built. After building the seven missing package outputs without rebuilding the trace runtime, all 13 tarball/layout checks completed; the offline clean-consumer install failed with ERESOLVE / `effect@undefined`. Binding checks before and after those builds passed. `pack:check` is not passed. No network fallback, publish, merge, engine, Docker lifecycle, or live integration run occurred.

## PASS audit

These are builder checks, not an independent promotion verdict. Only bound, completed attempts listed in the final evidence index qualify. An unbound diagnostic `MATCH`, a partial prefix, or exit zero alone is not acceptance.

| Observation-to-verdict location | Content check | Freshness and exact binding |
| --- | --- | --- |
| Consumer receipt writes (`applyDerived`, the DI deriver, `recordObligations`) | Derived subjects are constrained to page positions; references come from the pinned response and compiled read paths; exact prepared entry bytes, delivery digests, V and plan binding are checked. Obligation timestamps/bases are validated and a newer watermark is required | Checkpoint CAS precedes derivation under BEGIN IMMEDIATE. Reads fail before apply, no latest fallback; source identity and immutable deliveries bind retries. Semantic content is separately checked against the oracle in the gates below; low-level trusted callbacks are not independently authoritative validators |
| Oracle bridge (`DomainOracle` / `ParallelDomainOracle`) | Raw oracle bytes are retained. Partitioned results are unique, sorted and restricted to each input subject slice; their sorted union is compared with fresh unsplit calls for all eleven affected cases, including validation controls | New processes/files per attempt; source/release preimages, worker ordinals, exact encoded sub-input hashes and logical request IDs; no oracle-output reuse |
| `di01.ts` named cases | Fresh O-DOMAIN bytes equal frozen expected sets; queried durable affected rows equal those bytes; original/union kernel dependency pairs equal | New DBs; case file hashes and bases; source/build/oracle preimages in the attempt's non-null binding; start/end checks |
| `di01-harness.ts` `checkPosition` and trace completion | Every queried affected array deep-equals O-DOMAIN; separate direct-subject comparison must be non-void; full-world audit positions exercise the candidate filter | Actual p−1 world, p writes, fixed V, per-input hashes, raw oracle bytes and result rows; mapper, trace, overlay and command-log hashes; fresh attempt and end-of-run binding check |
| `crosscheck` | Every instantiated dependency pair exactly equals the kernel's pairs; no whitelist extras | Exact sampled/final source position and release; all subjects; same bound runtime and command log |
| `di01-crash.ts` / extended testkit `auditConsumerAtomicity` | Actual reopened pre-replay snapshot equals the required old/new snapshot; resumed index/affected/effects/checkpoint equal baseline bytes; split controls demonstrably differ and are rejected | Actual child exit 77 at hook/COMMIT intercept; unique file per arm/point/attempt; input hash, method hash and actual COMMIT traces; bound child/store/mutator source; raw observations retained |
| Snapshot coverage | `di_ref`, `di_release`, `di_boundary`, `di_basis`, `di_config`, effects, affected, checkpoint are compared. The feed fixture writes ref/release/boundary/config rows; `di_basis` stays empty there. A separate mutation test changes each dependency table while effects/checkpoint agree and requires rejection | Read from the reopened file before replay, not inferred from recovery. Existing FD01 callers without DI state retain their old snapshot contract |
| Boundaries in `di01.ts` | C19/C20 `due` values match actual fresh oracle obligations; newer empty clears and older is ignored; complete seed edge subject set equals generator raises; no synthetic affected/effect rows | Oracle case hashes, basis and fixed V; rule watermarks and fact assertion identities; separate boundary receipt section |
| `di01-lag.ts` | Every durable fanout equals independent O-DOMAIN; every one of 100k dependency sets equals kernel pairs; actual per-subject kernel reruns and output hashes; p99 recomputed from actual alternating samples | 1,000 samples each; exact pages/positions; preparation and actual reader timers; explicit fixture/rung/V; unchanged source/build binding through run |
| W02 `affectedClaim` seam and GS test | DI01's persisted set replaces the kernel set and equals the independent oracle; existing claim compares stored checkpoint/reruns; positive and negative MINWAGE witnesses | Fresh Probe attempt, command log, reads, oracle input/output identity and source hash; tested compiled DI01 under the corresponding bound source snapshot |
| Focused Node tests | Invalid derived rows roll back all index state; failed reads leave state untouched; stale CAS precedes derivation; prepared-page changes reject; replay/multiposition/retraction, reader and cache cut controls check concrete values | Fresh owned test files and exact source/build preimages; raw TAP output; no substituted oracle or timing booleans |
| Lossless stopped-evidence retention | Decompressed bytes hash exactly equals the original SHA256; original size/mtime remains unchanged during verification | Exact stopped paths only, r11 exit134 and no r11 active grant, no open owners before/after; unique retained receipts; no semantic PASS follows from compression |
| Existing G0 and package checker | Existing source-bound test/result/skip checks remain unchanged; package checker examines actual tarball entries and fails on missing build output | Fresh G0 build/test receipts and raw files, toolchain/lock hashes; package failure retained; no new acceptance-contract ruling or pin manufactured |

The additional builder readback audit (`audit.py`) requires non-null completed bindings, verifies preimages and unchanged runtime bytes, independently reads all 900 final SQLite files, streams actual trace rows against raw per-worker oracle output, recomputes the complete generator denominator/command hash, checks full-world coverage and the direct-subject counter, and recomputes lag p99 from raw alternating samples. It passed at `audit-28504077-510a-4168-9a53-9f87ed9fb00a/result.json` (2026-11-09T13:30:17.833835Z); its source SHA256 is `e6ef4c63e71de9796ba4b5c4913490a7cfb70d945c6b1b93f337b26647a701c5`. `BUILDER-CHECKS.json` records the raw readback counts and fresh audit path. The first audit attempt stopped on an archived comparison prefix; the successor verified its complete decompressed original SHA256 and compared the first 10,000 records byte-for-byte. It does not change the acceptance contract or replace independent review.

## Open questions answered by the code

1. **Valid-time-varying references:** unsupported here. A reference/activation with later `validFrom` or finite `validTo` is rejected. There is no union-over-all-V index and no claim for GS.08/GS.09 reference variation.
2. **Erase:** DI01 treats erase as a write of the erased pair. A narrow test verifies `(S, ssn)` affects S; erase also retires that assertion's fact-edge rows. This is a documented policy choice, not an O-DOMAIN erase qualification; no W0 affected erase case exists.
3. **Direct subjects versus O-DOMAIN:** the consumer gates on O-DOMAIN alone, as the brief decides. Ballast and unlinked owned writes may affect nobody. The completed trace receipt counts 379,108 disagreements with direct subjects; no acceptance text was edited.
4. **Bootstrap:** the experiment replays from source position 0. Snapshot bootstrap is not implemented or qualified.
5. **NS bench:** the existing account/stamp A0 bench remains separate. DI01 is not wired into the P3M/live NS path, and this experiment does not close that integration obligation.

## Reproduction and inventory

Run every gate/fingerprint through `node lab/bin/heavy.mjs --label <unique-reviewer-id> -- <command>` after confirming at least 5 GiB host free. These are offline commands; no engine slot or Docker is needed. Use Node 22.23.2 and the checked-in dependencies with the owned pnpm store.

1. Create a fresh evidence directory with `node --import tsx lab/bench/lib/di01-evidence.ts --create-binding <new-dir>`, then export `DI01_BINDING=<new-dir>/binding.json` for that stage. This copies actual source/build/oracle preimages and rejects moved bytes.
2. Run `node --import tsx --test lab/bench/di01*.test.ts`, then the CLI stages: `lab/bench/di01.ts cases <new-dir>/cases`, `lab/bench/di01-crash.ts <new-dir>/crash`, `lab/bench/di01-lag.ts <new-dir>/lag`, and `lab/bench/di01.ts trace <new-dir>/trace`, all with `node --import tsx`. For the complete trace **set `NODE_OPTIONS=--max-old-space-size=8192`**: it includes a second full seed replay for boundaries. Never reuse attempt directories. G0 uses the existing lab gate and reviewed skip contract, as in its retained receipt.
3. `audit.py` is the builder readback recipe for the exact retained stages named in the script; adapt only its attempt paths when reviewing fresh stages. It does not adopt a failed attempt or qualify a live lane.

`inventory.py` generated `inventory-23e104cc-0491-44cb-bb31-70259ca739be/SHA256SUMS`: 16,708 files, 1,508,629,120 retained bytes; manifest SHA256 `1307b7b7b70e97614567c7b0fa6672eabda4ad3e367b9bd31a812de8fb5f4789`. Its result and generated-receipt retention receipt are alongside it. The inventory excludes its own current directory to avoid recursion; the committed small [SHA256SUMS](SHA256SUMS) binds those metadata files separately. Completed source-worktree G0 receipt copies were removed only after matching the durable copy hashes. No raw evidence is committed.

| Inventory observation | Content | Freshness / binding |
| --- | --- | --- |
| `inventory.py` | SHA256 for every retained file; stable size/mtime around each read; generated receipt bytes equal durable copies before redundant source copies are removed | Runs after trace/readback writers exit; unique inventory path; source-controller hash and count/byte denominator retained. This is a byte inventory, not semantic acceptance |

## Contract and limits

`lab/acceptance/` is unchanged. `changed-path-hashes.json` records the old/new SHA256 of every modified tracked path for the contract builder; no pinned oracle, mapper, world definition or acceptance file was changed. A testkit Changeset accompanies its public optional snapshot field; host remains private. No dependency or lockfile change was required.

Hash changes retained for contract-builder review (no acceptance file was edited):

| Path | Old SHA256 | New SHA256 |
| --- | --- | --- |
| `lab/scenarios/v2/claims.ts` | `a27a192be53b46873c9e1da970010ae3c6d8eee88c016efe782373b2860bcbca` | `050474e7d1316468831216bb1efcbc73a72e979fdbfeb870741d0f9c4ce067a1` |
| `packages/host/src/feed/ConsumerStore.ts` | `5622f27010ec76b32276567bd0078b8a9476f67731042de30dd1d5dbfdc26b12` | `e1f5e23c23e6970e63c697905acdeb3dd1ad1d4b8d790da43320a794fdd30f46` |
| `packages/host/src/feed/index.ts` | `8eee255a2349a63f026c470aea66c385a69a196eb0031d434756d8085176a224` | `ccd26e7c3841cb630a646d7db4a9829b40dd0de89ae6a9620dc004f55ea14c60` |
| `packages/testkit/src/feed/index.ts` | `fb05fe8cdead6a161d1540e826dc64efbe8a8c380012f2be317dc0831bab69e9` | `5ba6d668e9db21cee853a090f187dd5bcf3c5cd9609356b16bcae9ffe1639368` |

Not verified: live X/Q/D reference reads or feed delivery; production durability/resource/reader-load performance; valid-time-varying references; snapshot bootstrap; full persisted 100k history; native erasure lifecycle; NS/P3M integration; package clean-consumer installation; independent adversarial review. No promotion is self-certified.
