# CX-VDF01: independent EXP-DF01 review

**Verdict: FIX-FIRST.** One medium-severity defect in the offline long-poll implementation prevents ACCEPT-OFFLINE.
Reviewed branch `exp/DF01-datomic-feed` at `bc8a5edb1701ee92b42b8249fbe14ce5f17f652d`, in the separate `verify/DF01`
worktree. The production source under review was not modified. North star: P3 correctness and resumable delivery under
`lab/SCOPE.md`, `lab/NORTH-STAR.md`, and `lab/TARGETS.md`; this is an offline review, not a P3 latency qualification.

## Finding F1: a delayed pre-checkpoint report ends an empty long-poll early

**Severity: medium (P2).** `packages/datomic/gateway/src/triplex/gateway/feed.clj:75`, with the once-captured signal at
`feed.clj:80` and `feed.clj:86`. `poll-log` reads once, waits for any report once, reads once more, then returns even when
that second read is empty and almost the entire wait budget remains.

This is possible with the real API's documented ordering. Datomic publishes the database update before it enqueues the
report; report delivery may lag publication. A request can already be checkpointed past that delayed report. The API offers
no guarantee that the next report consumed belongs to the requested range. See the
[official queue contract](https://docs.datomic.com/clojure/index.html#datomic.api/tx-report-queue) and [SOURCES.md](SOURCES.md).
This conclusion is an API-based inference plus an offline execution of that allowed schedule, not a claim of live observation.

Reproduction in [offline_verify.clj](offline_verify.clj), test `delayed-old-report-must-not-finish-empty-before-deadline`:

1. Start `log-page` with `fromT=105`, `waitMs=2000`, and a database value whose basis is t=100. Its initial requested range is empty.
2. Deliver a delayed report for t=100, whose database update is already visible. The production queue drainer wakes the request.
3. Its second `d/db` captures t=100. Before that captured value is returned to the route, publish t=105 and queue its report.
   This models an immutable snapshot captured just before concurrent publication; no report precedes its database update.
4. The route immediately returns `{"fromT":"105","nextT":"105","rows":[]}` although t=105 is now visible and the deadline remains.

First fresh run: **0.463666 ms**; refined-fixture rerun: **0.227166 ms**, against a requested **2,000 ms**. The output records both captured cuts,
the old report enqueue, new publication, visible t, and returned page. See [offline.log](offline.log) and
[attempt-1/offline.log](attempt-1/offline.log). The desired-behavior assertion
fails and the process exits 1; the failure has not been converted into a successful test result.

Impact: long-poll requests can return empty before the wait budget, leaving available work for a later HTTP poll and adding
avoidable polls/latency. This reproduction does **not** show a lost checkpoint, permanent gap, or infinite wait. Ordinary retry
can recover the rows. That bounds the severity, but the requested empty-before-deadline case is not met.

**Proposed fix:** retain the subscription for the whole request and loop until a nonempty physical page or a monotonic deadline.
Re-arm/capture the current broadcast promise before each read, and wait only for the remaining budget. Merely looping around
the current `wait!` is insufficient: it closes over the already-delivered promise and would spin. Add a regression with delayed
pre-checkpoint reports and publication overlapping an empty captured cut. The reviewer did not implement this change.

The existing fake queue uses an appropriate `LinkedBlockingQueue` and shares the queue correctly among subscribers. Its wakeup
test at `packages/datomic/gateway/src/triplex/gateway/feed_test.clj:85` makes the requested rows available before injecting the
only report, so it covers the favorable ordering and misses the delayed-old-report schedule. This is a coverage gap supporting
F1, not a separate defect.

## Results against the requested cases

| Case | Independent observation | Limit |
| --- | --- | --- |
| Annotation differs from `:db/txInstant` | Injected `Date(999999999)` alongside annotation `7000.0`; emitted stamp is exactly `"7000"`, decided. Removing the annotation still refuses, even with txInstant present. | Fake entities; actual production projector. |
| Page boundary at t; `fromT` inside skipped range | 21 combinations: starts 100 through 106, limits 1/2/3. Exact expected physical t sequence, no duplicates, exclusive end 106. Start 102 returns skipped t=103 and nextT=104; later pages retain t=104 and commit t=105. | Synthetic physical log; no engine. |
| Resume across value excision | Exact serialized JSON before/after removing the value is equal: 687 bytes, SHA256 `888e93c19dd44fcc02d060a0f08120c2eba6099fd03f9123769ba42890c452e5`. Identity-only projection is stable. | Synthetic removal of the value from fake entity state, not real Datomic excision/index completion. |
| Peer restart loses queue | Two distinct connection labels each get a newly empty report queue. Already-present log pages replay identically with `waitMs=30000`, within the test's 2-second bound; both queues removed. | Simulated restart; no separate actual peer JVM connection or HTTP server restart. |
| Lost/delayed notification | No-report timer case reads a later published cut after the finite wait; queue is not a data source. | Offline fake snapshots; storage/API calls themselves are not given a hard execution deadline by this test. |
| Empty result before waitMs with new transaction visible | **FAIL**, F1 above. | No permanent data loss demonstrated. |
| Fake vs real report queue | Primary docs support one queue/connection, delayed enqueue after db update, and explicit removal. Existing fake tests omit a legal delayed-old-report ordering. | Real queue timing and load remain unqualified. |
| CLI packaging failure | Setup diagnosis supported: after the ordinary CLI build, fresh pack includes index.js, index.d.ts and cli.js; built CLI `describe` succeeds. | No full root packed consumer qualification is implied. |

The source maps physical t to the annotated sparse logical positions and per-fact overrides; it does not substitute t for
Triplex positions. The fresh gateway-produced projection has the same SHA256 as the builder's recorded page:
`94a90f55bdde3c5f7576ccde79c0e397983291bf805ac0af2274d2b24f80b8aa`. Skipped transactions advance physical nextT without
being mislabeled aborted Triplex commits. The host adapter filters skipped rows from effects while preserving nextT.

## Execution and evidence

- Frozen offline install: pinned pnpm 10.11.0, explicit project store; [install.log](install.log). No lockfile/dependency version change.
- Selected package builds: eight tasks successful, one cache hit, seven executed; [build.log](build.log). CLI, host, testkit,
  Datomic and their dependencies were built using the repository's build scripts, without hand-editing dist.
- Fresh original gateway suite: **7 tests, 32 assertions, zero failures/errors**.
- Fresh added adversarial suite: **6 tests, 119 assertions, 118 passed, one failure, zero errors**. The failure is F1.
  [offline.log](offline.log), [offline-inputs.json](offline-inputs.json), [offline-result.json](offline-result.json).
- First attempt is retained in [attempt-1/](attempt-1/). The next attempt refines the no-notification fixture so its empty read
  uses an older captured basis rather than withholding rows from a log whose basis already includes them. It does not change
  production code or suppress the F1 assertion.
- Fresh unchanged TypeScript feed tests: **4/4 passed, zero failures/skips**. This includes the Datomic adapter running FD01's
  unchanged content/order/gap/resume and M-FEED-GAP mutation audits, actual SQLite close/reopen/readback and idempotent replay,
  malformed-page rejection, and the client's loopback HTTP binding checks. See [focused-tests.json](focused-tests.json) and
  [secondary-result.json](secondary-result.json).
- Initial secondary attempt did not produce a terminal test report and returned code 143. Its wrapper had a 120-second subprocess limit.
  Its raw stdout/stderr and exact runner are retained in [secondary-attempt-1/](secondary-attempt-1/); no result is adopted from it.
  Retry reason: rerun the same four tests with one worker and file parallelism disabled, retaining step timestamps/errors.
  That retry completed its tests in 716 ms and all secondary checks in 1,975 ms. The initial stop's underlying cause is unverified;
  no production source, test assertion, Vitest test timeout, or acceptance policy changed.
- Historical G0 audit: every referenced retained object passed SHA256 and byte-length checks; canonical and durable receipt
  copies match. Recounting retained Vitest assertions, TAP results, Python tests and 71 oracle cases reproduces **1,279 passed,
  zero failures, 66 skips**; all observed skip names are on the reviewed list. Test start times fall within the named attempt.
  [historical-audit.json](historical-audit.json) records the per-suite denominators. This checks historical evidence, not a fresh
  full G0 execution or independent oracle re-execution.
- CLI setup check: the original failed tarball contains no compiled entry points. Fresh build/pack produced a **27,322-byte**
  tarball with SHA256 `2279a68abcf8bb67ac49dbcf045e603b27df796545676fe121ecc25924208890` and all three required entry points.
  `node packages/cli/dist/cli.js describe` returned `ok:true`, `command:"describe"`.
  [cli-tar-entries.txt](cli-tar-entries.txt), [cli-pack.stdout.log](cli-pack.stdout.log),
  [cli-describe.stdout.log](cli-describe.stdout.log). This supports the builder's unbuilt-CLI explanation; no DF01-specific
  packaging defect was found. Datomic is absent from the root pack check's package list. The complete root pack/consumer
  was not rerun, and a clean external consumer result is not claimed.

Commands, run from the reviewer worktree:

```sh
node lab/bin/heavy.mjs --label CX-VDF01-offline-r2 -- node lab/verify/DF01/run-offline.mjs
node lab/bin/heavy.mjs --label CX-VDF01-secondary-r2 -- node lab/verify/DF01/run-secondary.mjs
```

The first command is expected to exit 1 on the reviewed source because it asserts the desired long-poll behavior. All heavy
commands, including installation/builds and fingerprints, used the lab semaphore. Host free space was over 23 GiB before
admissions. No Docker command, slot reservation, resident lifecycle change, default daemon, global cache, or subagent was used.
The secondary runner refuses an existing CLI tarball: a later reproduction must retain that artifact and use a new output
directory/attempt, rather than overwrite the retained pack. These commands describe the recorded attempts, not permission to
replace their evidence.

## PASS / verdict / receipt audit (rule 9a)

| Place interpreting observations | Content check | Freshness check | Binding and limitation |
| --- | --- | --- | --- |
| `offline_verify.clj` assertions and `-main` | Hand-authored expected stamp, t sequence, skips, exact serialized bytes, queue cleanup and bounded replay; F1 explicitly fails | New queues, atoms, futures, and projection each process; original suite rerun | Actual checked-out gateway and vendor API namespaces; only fake connections, no engine/slot PASS |
| `run-offline.mjs` result and output hashes | Preserves child exit and exact output SHA256; no success label on exit 1 | Removes previous output before child; before/after source/runtime hashes must match | `bc8a5edb`, source/test/codec/JAR/JVM bytes; `slot:null`; first attempt retained separately |
| Unchanged TypeScript tests through `run-secondary.mjs` | Exactly four executed passing tests; independent FD01 content/resume/gap mutation and SQLite readback assertions | Fresh test process, JSON output deleted before run, test start inside this attempt | Exact reviewed tests/source/fixture and alias config hashes; actual public aliases; no native peer |
| `audit-historical.mjs` | Receipt bytes match durable copy; object lengths/hashes and raw outputs match; recomputed tests, skips, oracle counts match receipt | Explicitly audits a named historical attempt; checks test timestamps within that attempt; never calls it a fresh full G0 | Canonical run ID, retained content-addressed preimages, unchanged package source from recorded implementation to reviewed head |
| CLI section of `run-secondary.mjs` | Actual tar members include index.js/index.d.ts/cli.js; built CLI describe JSON is checked | Refuses existing target tarball; build precedes new pack; source hashes checked before/after | Exact CLI manifest/config, retained tarball SHA256/size; limited to CLI setup diagnosis, not whole root consumer |
| `index-evidence.mjs` | Rechecks every final gateway and secondary input binding and external tar hash/size; bounds file/directory size; writes hashes of actual bytes | Runs after final observations/report; excludes its own changing log and the manifest | Final reviewed head must match exactly; per-file SHA256 index and external tar path |
| This `VERIFY.md` verdict and checksum index | Finding cites the actual failed assertion and raw page/events; positive statements scoped to observed probes | Reviewer attempts identified separately from builder history | Fixed reviewed head, source-bound evidence; no contract promotion |

## Pins, retained data, and remaining qualification

No `lab/acceptance/` file was edited, and no pinned source hash was moved by this review: only new `lab/verify/DF01/` artifacts
are committed. The builder's modified pre-existing source paths have no direct path mentions in the reviewed acceptance tree;
its before/after hashes remain in `lab/experiments/EXP-DF01/CHANGED-SHA256.tsv`. The contract and slot pins remain unchanged.
The source under review is unchanged from implementation commit `1a7e09bd485d494b1b36095e567707e71140d3ba` to reviewed head.

The builder's historical first failures, interrupted run and final receipt remain untouched. A historical G0 PASS cannot close
the newly reproduced F1. No fresh full 1,279-check G0 run is claimed here. No P3 lag/256-reader result, live HTTP-to-peer journey,
actual peer process restart, actual excision, real storage durability, ER01-D erasure writer or RT01 qualification was performed.
Those live gates remain open even after F1 is fixed. No merge, push or production implementation edit was made.

All committed review files are below 1 MB and the raw review directory below 5 MB; the fresh CLI tarball is retained outside
git under `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VDF01/pack/`. The review SHA256 index is `SHA256SUMS`.
