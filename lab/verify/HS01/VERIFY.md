# CX-VHS01: EXP-HS01 offline adversarial review

**Verdict: FIX-FIRST.** One new reproducible retention defect blocks offline acceptance of finite retention. The builder correctly reports G9 as failed; this review does not close that storage gate. No product code was changed.

Reviewer CX-VHS01, 2026-11-09. Reviewed product `13ce4978`, branch head `2f7b42d65976279a13436a6f5d5f7043cb0f3da4`, from review branch `verify/HS01`. The package bytes in this worktree are identical to the frozen product. Review began with `git diff 257d4d20..13ce4978 -- packages/` and R45 sections 5 and 6, before reading the builder's report. The independent generator does not import the builder's layout generator, comparator or journal derive function. The v1 reference is obtained directly with `git show`, hash `0b5d3ef3c77303d975ce336e0ac12fdd1620f73b8c0829aee46d9bed2340e736`.

North star: the P1 exact-cut and P2 atomic recovery correctness floor; P3 retention/resume; P4/P5 storage cost. Goals and targets are only [SCOPE](../../SCOPE.md), [NORTH-STAR](../../NORTH-STAR.md) and [TARGETS](../../TARGETS.md).

## Finding 1 — P2 severity: a legal large frame permanently stops finite retention

Location: [sqlite-worker.ts:222](../../../packages/qlever/src/broker/sqlite-worker.ts#L222). Related admitted frame limit: `frame.ts:42` / `encodeFrame`, 256 MiB payload maximum.

The purge loop breaks before selecting a frame when its size would cross 16 MiB, including when that is the **first** eligible frame. A single such frame becomes an immovable prefix barrier. Subsequent small frames can never be reclaimed either. With finite retention enabled, ordinary large values or grouped imports can therefore grow the log without bound until disk admission fails. Default infinite retention does not exercise this defect.

Independent reproduction: [retention.test.ts](adversarial/retention.test.ts). Open with `tailFrames:1`; append a real COMMIT_GROUP containing twenty 900,000-byte string values (each below the default 1 MiB string limit), then publish ten small frames. The large payload is 18,002,994 bytes; its frame is **18,003,030 bytes at LSN 2**. At head LSN 12, five additional purge calls each return `{removed:0,anchor:1}` despite no holder and an eligible prefix. The assertion requiring progress past LSN 2 fails. This is an actual product failure, not an expected-success test with weakened assertions.

Reproduce from the worktree:

```sh
node lab/bin/heavy.mjs --label CX-VHS01-large-frame -- \
  node lab/verify/HS01/adversarial/run.mjs large-frame \
  node_modules/.bin/vitest run --config lab/verify/HS01/adversarial/retention.config.ts
```

Evidence: `large-frame-3663771f-8815-489a-a8b9-5470719ead3e/{large-frame.json,command.log,receipt.json}` beneath the durable root below. The store is retained. Source was unchanged during execution.

Proposed fix: ensure progress on an oversized eligible first frame while preserving prefix ordering and atomic anchor publication. If allowing one oversized frame per purge is selected, explicitly resolve and requalify R45's stated 16 MiB work bound; otherwise use a bounded reclamation design that can finish that frame. Merely stopping at the byte boundary is insufficient. Add regression cases at and above the boundary, including frame-header/trailer bytes, and verify writer progress and recovery. Do not split an individual atomic transaction or silently reject previously admissible values to disguise this case.

## Independent results

The final independent run passed **51,000 generated reads**, covering 1,284 retained row identities over 33 frames with three ordinal positions each. Both v1/v2 equality and a separate latest-version replay expectation are checked. Coverage includes `pull` at ordinal cuts; `recent(after)` and history via `recent(0)`; entity, id, combined, absent, missing and empty selections; claims, operations and heads; ordered frame pages and their next cursors. Journal position/instant headers, canonical change JSON and non-derived change JSON are included. Only unordered row collections are sorted. For frame-page comparisons, the independently sampled `committed_at` observation clock is excluded; payloads, CRCs, offsets, order and cursors are compared exactly.

The final codec sample persisted **4,240 rows through the actual v2 SQLite worker**, then compared own-field presence and every scalar using deep strict equality. It includes 4,096 random IEEE-754 bit patterns plus explicit negative zero, positive/negative 2^53, positive/negative subnormals, maximum finite doubles, infinities and NaN; int64-edge decimal strings; canonical and noncanonical ids; Unicode, NUL and lone surrogates in values and dictionary names; JSON, references, null, absent and own-undefined fields. All rows matched; **116 full-row fallback envelopes** were lossless. The earlier smaller read run had 117 fallback rows because the deterministic RNG stream also supplies read selections; both samples passed. These are raw host-row codec observations, not a ruling on public numeric admission or pending Q105b. The builder's exact 15,508-row fallback set was not independently regenerated; this review establishes no loss in its own independently generated fallback sample, rather than treating the builder's percentage as proof.

The P1 witness pins position **2048**, performs 23 subsequent replacements and horizon purges, and purges frames to anchor **LSN 23**. A pull at the old basis remains eligible and returns exactly the original assertion after normal snapshot retirement masking. The pin holds H at 2048 while frame retention advances independently. Reopen verifies from the anchor: first retained LSN 24 has precisely the persisted predecessor CRC and offset. A below-anchor cursor throws `FeedRetentionExpired`, rather than returning a shortened feed.

Four separate whole-process stop schedules passed: after a dictionary INSERT inside the append transaction; after the first operation INSERT of a two-member group; after frame DELETE but before anchor UPDATE inside purge; and after a complete group commit before publication/ACK. Each stop waits for an actual instrumented source barrier, then the parent stops and awaits the entire child process. Fresh reopen checks exact row contents, old operation receipts/claims/heads, both new operation receipts and heads, marker position and anchor. Precommit attempts recover neither new member; the committed attempt recovers both. Each recovery also checks typed rejection of its stale feed cursor. Original/instrumented worker hashes, pending group bytes, reached barriers, process outcomes and recovery observations are retained. This is four independently implemented schedules, **not** a fresh reproduction of the builder's 80-stop count.

Eight tests passed across the final parity/codec/pin run, four crash schedules and the complete seed. The separate large-frame regression failed as documented. Format and lint checks on the new verifier tools pass with zero warnings; `git diff --check` passes.

## Fresh 1k seed and the 509 B/fact explanation

I seeded a new store with the shared W0 command plan at 1k through real source-aliased `Triples.transact`, nested groups of up to 64, full journal metadata, detached replica, and `tailFrames:1024`. This is a new store with a fixed generic deterministic scope, not the builder's database. Every asserted value and its identity/position and every retirement position/tx are read back; each command's claim is checked against its returned bound receipt. Independently counted commands, assertions, journal rows and SQL totals agree:

- 42,775 commands; **442,410 user assertions**; 214 retractions.
- 442,196 live facts + 214 history rows; **800,613 journal rows**.
- 42,775 claims and transaction records; 669 operations; 670 frames.
- Zero full-row codec fallbacks; all live fact ids are SQLite TEXT.
- 139,019 pages × 4,096 = **569,421,824 logical bytes**, with no free pages. `sum(dbstat.pgsize)` equals that whole logical allocation; WAL bytes after closure are zero.

| Component                         |  Fresh 1k bytes | Fresh 1k B/assertion | Builder's reported 10k B/assertion |
| --------------------------------- | --------------: | -------------------: | ---------------------------------: |
| Facts + id index                  |      47,243,264 |               106.79 |                             107.37 |
| History + id index                |          36,864 |                 0.08 |                               0.05 |
| Journal + id index                |      94,048,256 |               212.58 |                             213.77 |
| Entity dictionary + unique index  |      12,312,576 |                27.83 |                              28.09 |
| Attribute/actor/type dictionaries |          16,384 |                 0.04 |                       0.00 rounded |
| Transaction dictionary            |         827,392 |                 1.87 |                               1.94 |
| Heads, claims and operations      |       7,647,232 |                17.29 |                              17.55 |
| Frames + index                    |     407,269,376 |               920.57 |                             140.10 |
| Remaining schema/control pages    |          20,480 |                 0.05 |                       0.00 rounded |
| **Total logical**                 | **569,421,824** |         **1,287.09** |                         **509.08** |

The independently observed **non-frame cost is 366.52 B/assertion**, close to the reported 368.99 at 10k. The 1k store's entire 670-frame history fits inside the 1,024-frame tail; its frame allocation is therefore much larger per fact. Extrapolating that unpurged 1k total as a 10k cost would be incorrect. The component costs support the report's explanation of its 509 B/fact measurement and independently show that the non-frame row/index representation already exceeds the 300 B/fact G9 bar.

My 1k store is 20,971,520 bytes larger than the builder's reported 548,450,304-byte 1k store. A comparison of its retained manifest shows a frame difference of only -32,768 bytes, with nearly all positive difference in row/id-index allocation. The builder's first assertion id, `0118TDQD000000000000000001`, is packable; my fixed-scope ids have a noncanonical prefix and all remain text. Per-object payload deltas are exact multiples of the 10-byte text-versus-binary id saving, consistent with this id-packing explanation. This is an inference from retained input and dbstat evidence, not a fresh full inventory of the builder's binary ids. `seed-comparison.json` records the observed deltas and source hashes.

**Known unmet gate, not a new discovery:** G9 requires the complete 10k seed to be at most 1.4 GB and 300 B/assertion. The builder reports 2,274,734,080 bytes / 4,468,284 assertions = 509.08 B/assertion, and explicitly marks it FAIL. The fresh 1k result supports the explanation but does **not** freshly verify that 10k total. A later experiment needs the row/id representation and tail cost reconciled without changing the correctness rules. No 10k or 100k run was performed here.

## Evidence, reproduction and audit

Durable root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VHS01/`. [evidence-index.json](evidence-index.json) lists every execution attempt, command, time, exit and source-stability result. [SHA256SUMS](SHA256SUMS) seals the durable SHA256SUMS, which in turn seals raw stores, logs and observations. Sealing read and hashed 90 files / 614,605,472 bytes; the manifest's own checksum was subsequently verified. An optional second full-file checksum readback remained queued for a heavy slot and was cancelled before admission (exit 143); no second full readback is claimed. Bulky evidence remains outside Git. The retained environment record binds Node, better-sqlite3, SQLite and the actual native binding bytes. No engine slot was taken; all execution was offline under the shared heavy-job limiter with disk above 5 GiB.

Successful final attempt labels are `independent-final`, `crash` and `seed-1k-r2`; the deliberate product failure is `large-frame`. The first `seed-1k` failed because my initial verifier captured placeholder receipts as callback side effects rather than using the outer transaction's bound return value. The harness was corrected, the original failed attempt/store was retained, and the new attempt used a fresh store. The earlier shorter independent run is retained separately. All execution receipts report unchanged source during their respective execution windows. Their verifier-source versions differ where documented; the product bytes do not.

For replay, use `adversarial/run.mjs <label> node_modules/.bin/vitest run --config <config>` under `lab/bin/heavy.mjs`. The four configs are `vitest.config.ts` (parity, codec and pin), `crash.config.ts`, `seed.config.ts` and `retention.config.ts`. The last should remain red until the product defect is fixed. Dependencies were installed offline with pinned pnpm 10.11.0 and the explicit project store directory; no lockfile change or global-cache configuration was made.

PASS/verdict/receipt-producing locations were audited before commit:

| Location                                                          | Content                                                                                             | Freshness                                                            | Binding                                                                                           |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `review.test.ts` comparisons / equivalence and codec observations | v1/v2 plus independent replay, own fields and exact scalars, ordered frame bytes/cursors            | fresh worker files in a unique attempt; no adopted historical answer | source inventory, original v1 Git bytes/hash, generated input and test source                     |
| `review.test.ts` pin/reopen witness                               | old assertion, eligibility, retained predecessor CRC/offset, typed stale-cursor error               | fresh pinned store and actual reopen                                 | exact basis, marker, anchor and product source                                                    |
| `crash.test.ts` recovery assertions                               | whole expected rows, receipts, claims, heads, atomic pending-member outcome and anchor              | parent observes the actual barrier, awaits killed child, opens again | exact pending input, hook text, original/instrumented hashes, stop outcome and source inventory   |
| `seed.test.ts` readback and accounting assertions                 | values, identities/positions, claims, complete counters, journal denominator, all dbstat pages      | new store and complete command enumeration                           | shared W0 plan, deterministic recipe, bound receipts, source inventory and witness digest         |
| `retention.test.ts` regression verdict                            | actual large encoded group and observed eligible prefix that fails to advance                       | new store; repeated real purge calls                                 | payload/frame bytes, LSN, marker, no holder, source inventory; failure retained                   |
| `run.mjs` execution receipts                                      | records exit/log hash and before/after source equality; **does not label an exit as semantic PASS** | unique attempt directory and captured start/end                      | command, head, source hashes, offline/no-slot identity; native dependency bytes sealed separately |
| `seal.mjs`, SHA256SUMS and this report                            | integrity/indexing only; review verdict uses the above assertions and the reproduced defect         | seal after child termination and log closure                         | raw evidence hashes, environment, pin audit and frozen product comparison                         |

No `lab/acceptance/` file or product file was edited. The durable pin audit compares pinned paths with `257d4d20`; no pinned hash moved, so there are no old/new changed-pin pairs. No commit, receipt or assertion turns the failed retention regression or G9 into PASS.

Not performed: product fixes, a full root/package/G0 rerun, the builder's exact fallback corpus, its 80-stop durability series or WAL-flip suite, a fresh 10k/100k seed, live engines/replicas, target-concurrency latency/throughput, erasure qualification, migration tooling, deployment, publication, merge or push. Open decisions: fix and independently recheck oversized-frame retention; reconcile G9's size budget; retain the pending public int64 ruling Q105b rather than inferring it from raw string round trips.
