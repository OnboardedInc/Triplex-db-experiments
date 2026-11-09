# EXP-P2X2 independent receipt review — CX-VP2X2

**Verdict: ACCEPT for D1 under the preregistered R39 4.5 rule.** The evidence supports the lab's decision to close this XTDB-native P2 candidate on this host/profile and proceed with P2B. It does not prove an irreducible latency floor for every possible native implementation, nor complete P2 acceptance. One low-severity build-identity wording finding is below; it does not invalidate either decisive measurement.

Reviewed builder: `exp/P2X2-commit-floor`, `b9a76c0b` (full identity in [recomputed.json](recomputed.json)). Reviewer branch: `verify/P2X2`. This is an offline review of retained evidence. No engine, benchmark, package build, or live correctness gate was rerun. No code under review was changed.

Authority: `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`, R39 4.5 and [BRIEF.md](../../experiments/EXP-P2X2/BRIEF.md). The review checkout contains Q96c; the named main-checkout `lab/acceptance/RULINGS-PENDING.md` also contains Q96d. Its exact text and file digest at review time are saved in `recomputed.json`; the contract was not edited.

## Independent recomputation

I read raw `samples.json`, without importing the builder's percentile or decision implementation. Quantiles use nearest rank: sorted element `ceil(p*n)-1`. F3 pools exactly the two 500-command ABAB segments. F5 drops exactly samples 0–14 from each 150-command attempt, leaving 135. Bare arms do not drop samples, matching the brief.

| Measurement | Samples | p50 ms | p99 ms |
| --- | ---: | ---: | ---: |
| F3 first segment `04-01-57-427Z-e2a7a1` | 500 | 9.099084 | 23.321416 |
| F3 second segment `04-02-17-445Z-8a4c01` | 500 | 5.776167 | 14.275209 |
| **F3 pooled** | **1,000** | **7.681542** | **21.813042** |
| **F5 P2X fresh `04-03-38-727Z-257ad2`** | **135** | **32.998458** | **63.258917** |
| F5 P2X history-10k `04-26-59-722Z-6c69e7` | 135 | 60.132292 | 115.712500 |

All reported F1/F2/F3/F5/F6 p50/p99 values reproduce to floating-point tolerance. F5 fresh's minimum retained sample is 25.668250 ms: none of its 135 retained samples is at or below 20 ms. The decision therefore does not depend on pooling away the faster second F3 segment.

Fresh F5 metric differences reproduce:

| Metric | Delta count | Mean per public commit |
| --- | ---: | ---: |
| `node_tx_execute_seconds` | 150 | 9.505083 ms |
| `node_tx_await_seconds` | 150 | 6.259687 ms |
| `tx_op_timer_seconds` | 1,200 operations | 5.521431 ms |

The execute-minus-await estimate is 3.245396 ms; await is 65.856% of execute. These differences cover all 150 commits, including warm-up, rather than the 135-sample service percentile population. There are exactly 150 engine executions, with no additional writes hidden in this measurement window.

R39's OR expression evaluates **true / true / false**: `F3 p50 > 6`, `F5 fresh p50 > 20`, `resolve/commit > 7`. D1 follows. The second F3 segment is below 6 ms and fresh resolve is below 7 ms; neither can be advertised as an irreducible threshold miss. The 33 ms observation includes the historical adapter's sequential statement transport and normal source-cut, claim, and receipt reads. Aggregate await metrics do not by themselves prove which internal serial-indexer substage is causal. Preserve REPORT.md:11's mechanism qualification when applying Q96d; use “observed native Triplex service” for the floor.

## Arm and execution audit

| Arm | What the evidence actually ran | Assessment |
| --- | --- | --- |
| F1 | One connection, 1,000 closed-loop single-row transactions; BEGIN/INSERT/COMMIT SYNC, three writes each | Matches; full stored-row supplement rechecked |
| F2/F3 | Six R16 body statements plus BEGIN/COMMIT: claim guard, CAS guard, current update, claim insert, ten ledger rows, feed insert | Matches 10-fact command shape; F3 changes transport |
| F2/F3 pairing | F2 500, F3 500, F2 500, F3 500, on the same uninterrupted slot | ABAB confirmed; eight client writes per F2 command and one per F3 command |
| F5 | Public P2X `transact`, `subject-stamp`, source `fb6681a4`, one writer; 150 ten-fact commands per fresh/aged point | Correct composition; 15 warm-ups removed per point; zero concurrent readers |
| F6 | Main `9a7996e2` / RT01 `1283f9fb` / main / RT01, separate fresh scopes, 150 each | Fresh ABAB confirmed; 10k-history comparison absent |
| F7 | Candidate FIFO/grouping helper and five-second smoke; four retained unqualified full attempts | Does not establish frozen-trace performance or correctness |
| F8/F9 | No completed reader windows or A0 trace control | NOT RUN; no reader-load inference |
| F4 | Optional InMemory arm absent | NOT RUN; no durability-mode comparison |

F5's helper gives each command a fresh subject rather than cycling over 50 subjects as the older bench did. This is a documented workload adaptation, not an exact rerun of the original bench script. It still submits ten application facts about one subject through the specified public build. The adaptation avoids accumulating multiple values in immediate readback; it does not add extra business facts or additional commits. The aged scope was preloaded with 10,000 public commits in groups of eight, not 10,000 separate engine transactions; keep that history denominator explicit. No aged F6 comparison is available.

I independently checked every stored fact's entity, attribute set, value type/value, transaction id and recorded position, plus command-to-receipt binding, across all six service attempts. Every completed command has a distinct tx id/position and the expected ten returned-cut facts. The original bare receipts' failed decoding/accounting was not relabeled: I independently rechecked the later audit's complete stored row sets, identifiers, claims, ledger values, feed changes and final current values for all five bare segments. That supplement supports bare command completion. No bare-arm RYOW or idempotency certification is inferred.

G1 ON/OFF raw reports each contain 88 executed passing cases (44 current, 44 reopen), zero skips/failures, before the measured arms on the same container. All executable core/XTDB export hashes match F5. OFF's complete core/XTDB build manifest matches F5; ON has the single declaration-file difference described below. These are historical contract 0.3.1 gates, not current-contract promotion.

## Slot, quietness, timing, and avoidable overhead

The before/after receipts consistently bind exclusive `xtdb-s1`, holder `CX-P2X2`, container `837cf4565f35f589677a339c83ee703ae7bb04767f04368143f0c64228da54e7`, start `2026-11-09T03:53:07.254409619Z`, XTDB 2.2.0 image `sha256:a6a426505b95a36e4e0e1d0de88efcf4220cb6bde8f1f5e594b0a1f92a948a77`, two-CPU quota, cpuset `4,5`, 3.5 GiB cap, 2 GiB heap/1 GiB direct cap. YAML bytes match the retained config: Local durable log/storage, 512 MiB cache, 300 server threads, no separate read follower. The startup log names the single node's internal follower becoming leader; this is not an extra reader node. Resident set is the expected XTDB/QLever pair, with Datomic parked.

**Exclusive slot does not mean idle host or isolated CPU cores.** The resident containers remained running and cpuset pinning alone does not reserve those cores against their work. All measured pre-arm `compactor_jobs_available` gauges are zero; the completed-compaction counter does not increase in the eleven audited measurement windows. These satisfy the documented G-QUIET check. The resource records do not certify continuous host silence:

| Decisive attempt | Host load1 before/after | Resident XTDB CPU % before/after | Resident QLever CPU % before/after |
| --- | --- | --- | --- |
| F3 first | 12.21 / 12.04 | 1.13 / 2.75 | 0 / 33.86 |
| F3 second | 10.74 / 11.64 | 0.67 / 1.13 | 0 / 2.34 |
| F5 fresh | 7.24 / 6.95 | 0.65 / 0.70 | 21.11 / 7.51 |

These are boundary snapshots, not continuous interference traces. The brief explicitly says the rule still applies with residents running if their load is recorded (BRIEF.md:99–101). Consequently this is not a disqualifying deviation from the preregistered rule, but it limits any stronger “quiet best possible native latency” statement. No claim that interference had zero effect is supportable offline. All audited windows record at least 12,559,138,816 host-free bytes, above the 5 GiB requirement.

Timing boundaries are correct for these diagnostic arms:

- Bare timing begins immediately before sending the command's BEGIN/body/COMMIT messages and stops after their responses settle; F3 performs one socket write and uses TCP_NODELAY. The wire reader resolves at ReadyForQuery after COMMIT SYNC, so it includes durable/readable engine ACK and protocol overhead.
- F5 timing begins immediately before public `transact` and stops at its returned receipt. It includes normal staging, sequential submit, `SHOW AWAIT_TOKEN`, and receipt resolution. This measures the actual historical adapter, not just engine COMMIT. `triples.transaction` and exact-cut `getByEntity` verification occur afterwards, outside service timing. They affect wall commits/s and the between-command workload; wall throughput is not pure service capacity.
- Engine observations, build fingerprints and evidence writes occur outside the per-command timed sections. The measured helper wraps queries with monotonic-clock reads and array appends; it does not print or write a file per timed command. No debug logging option or manual-index omission was found in the retained config/adapter. Source-cut/guard lookups on P2X use `_id` point predicates; no experiment-added scope scan was substituted for them. Sequential statement round trips and point reads are existing candidate costs explicitly contemplated by R39, not an accidental alternate driver configuration.
- `engine-final.log` contains pgwire EOF stack traces around bare connection shutdowns. `Wire.close()` ends TCP without a PostgreSQL Terminate message. These are per-arm disconnect errors, consistent with shutdown timing, not per-command debug output. The fresh F5 interval has no engine log entries. There is no observed sustained debug/error log stream explaining its 33 ms median.

I found no demonstrated avoidable misconfiguration that invalidates the decisive F5 measurement. This is a source/config/log audit, not an engine tuning sweep or a guarantee that a different implementation could not be faster.

## Finding (nonblocking)

**P3 — “exact build” should distinguish executable equality from complete artifact equality.** Location: `lab/experiments/EXP-P2X2/REPORT.md:93` and the ON receipt's `build` manifest. Reproduction: compare ON G1's `build-manifest.json` core/XTDB file hashes to fresh F5 `build.json`; exactly one file differs, `packages/core/dist/kv/layers/KvTriplesLive.d.ts`. The OFF build has zero differences. All executable JavaScript and source hashes agree. The old declaration's bytes are not retained separately for a semantic diff, so I do not assume why it changed.

| Path | G1 ON SHA256 | F5 / G1 OFF SHA256 |
| --- | --- | --- |
| `packages/core/dist/kv/layers/KvTriplesLive.d.ts` | `3325b53ab034666447eab034f059facd1dfad5515cd2b40d338994b539ba43af` | `1e61ae71a24c53db9e7e6456ae83a69fb5b7a9ffe3d121a82a2847c2e0ddc902` |

Proposed fix: qualify the report as “same committed source and executable exports; one ON declaration hash differs,” and retain each build's declarations on future runs. Do not rewrite the old receipt or generated package files. This declaration is not executed by F5/G1 and does not affect either timing threshold, so it does not require a new slot run for this decision.

## Evidence and reproducibility

Run from this worktree root:

```sh
node lab/bin/heavy.mjs --label CX-VP2X2-offline-audit -- python3 lab/verify/P2X2/audit.py
```

[audit.py](audit.py) performs the independent content/hash/quantile/binding checks. [recomputed.json](recomputed.json) holds the exact values and identities; [audit.stdout.log](audit.stdout.log) records the successful run (48,044 assertions, exit 0). `audit.stderr.log` contains only the heavy-slot waiting notice, with no audit error. Its assertion count is mechanical check coverage, not a correctness-test or performance-acceptance denominator.

All **338 files / 282,539,738 bytes** in the builder's [SHA256SUMS](../../experiments/EXP-P2X2/SHA256SUMS) match, including raw samples, full bare row audit, engine metrics/logs, source archives and built-export archives. Manifest SHA256: `9733e569ecb43e2e936c96de79953179be84ff924901d516fce9fbce688a5adf`. Source archive entries in each measured core/XTDB build manifest were checked against the named Git revisions; corresponding built exports match their archives. Main/P2X/RT01 source+root-metadata file counts checked: 138/135/140; dist file counts: 504/492/512. No rebuild was needed to inspect those bytes.

The actual executed F3/F5 transitive helper preimages are retained and hash-checked. Early binding inventories also name two unrelated helper revisions (`candidate.mjs`, `preload.mjs`) whose preimages are absent; these are not imported by those measured arms. The absence is recorded in `recomputed.json`, not silently treated as complete reproduction of every file in the old directory. Final source helpers contain post-measurement validation changes; this review uses the captured executed versions rather than assuming the final code ran.

Bulky original evidence remains at `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-P2X2/`; no raw payload was copied into Git. This branch changes only `lab/verify/P2X2/`. No acceptance pins moved; no contract, package, experiment receipt or main-checkout file was edited. No merge/push was performed, and no agents were spawned.

## PASS / verdict audit

| Place producing a check/verdict | Content | Freshness | Binding |
| --- | --- | --- | --- |
| `audit.py` evidence/attempt checks | Rehashes bytes against the published full manifest and per-attempt manifests; rejects missing/mismatched required inputs | New offline read of historical files; explicitly not a new engine attempt | Exact published evidence-manifest hash, receipt payload hashes, stable before/after container/image/config/owner/caps and helper preimages |
| `audit.py` content checks | Exact bare row sets and values; all service facts, commands and receipt positions; G1 raw execution counts and built-file comparisons | Raw observations remain attributed to their named historical attempts and ordered snapshot windows | Unique command namespaces, transaction IDs/positions, stored build manifests and named Git source revisions; declaration exception explicit |
| `audit.py` quantiles/`mechanicalDecision` | Finite nonnegative raw samples; exact count, warm-up and order; independent nearest rank and metric deltas; threshold OR | Recomputed during this review, from the specified F3/F5 attempts | Attempt IDs, manifest hashes, review script digest and reanalysis time in output; no builder summary implementation reused |
| This `VERIFY.md` ACCEPT | Numerical D1 plus inspected workload/timer/config; expressly limited to preregistered disposition | This independent review, with no claim of fresh live execution | Reviewed `b9a76c0b`, recorded Q96d text/digest, linked recomputation and immutable original evidence |

Open / not verified: aged main-vs-RT01 F6; qualified full F7; F8 at 64/256 readers and F9; engine-level `waitedMs = 0`; full P1/shared-world reader semantics; current-contract promotion; p9/RT01 round B; any claim that serial resolve alone makes all native implementations impossible. The retained late heap-pressure/failed-trace numbers are excluded from D1. TARGETS/scorecard disposition belongs to the orchestrator. None of these gaps is represented as a PASS here.
