# CX-VDF01: EXP-DF01 round 3 review

**Verdict: ACCEPT-OFFLINE, scoped to the deadline finding.** No remaining defect in the assigned scope or new high-severity
finding was reproduced. The unchanged counterexample passes on the fix and fails on the prior source with a valid measured
publication window. Exact-deadline publication and a slow final read also pass.

Reviewed source: `exp/DF01-datomic-feed` at **`4c72ed2724b42c651c45b6b87ddc43a6d5a2d627`**.
Reviewer branch: `verify/DF01`, starting at `bedf7483`. North star: P3 response completeness under `lab/SCOPE.md`,
`lab/NORTH-STAR.md` and `lab/TARGETS.md`. This is independent offline verification, not live Datomic or performance qualification.

## Finding disposition and mechanism

The medium-severity deadline finding is **resolved offline**. Previously an empty cut captured before expiry could return after
expiry and cause an empty response even when t=105 had already published. At
`packages/datomic/gateway/src/triplex/gateway/feed.clj:83`, the positive-wait expired/empty branch now makes one additional
`read-page` call and returns its rows directly. The route captures a new `d/db` value inside that call at `feed.clj:96`, after
the expiry decision. It does not loop or wait after this final call. `waitMs=0` returns its original single read.

The clock-taking loop is private; the five-argument public `poll-log` entry at `feed.clj:85` always supplies real
`System/nanoTime`. This preserves the unchanged reviewer wrapper and permits exact logical-clock unit cases without falsely
claiming nanosecond-accurate physical scheduling. Only the gateway feed implementation and its gateway tests changed between
`0f6c28c0` and the reviewed commit; projection, cursors, TypeScript interfaces, SQLite consumer and queue drainer are unchanged.

No production fix is proposed by this review: the requested correction is present and the scope-specific checks below pass.

## Fresh independent results

Canonical candidate attempt: **`round3/candidate-2` — 22 tests / 247 assertions, zero failures/errors**, child exit 0.

| Suite | Tests / assertions | Result |
| --- | --- | --- |
| Candidate gateway suite | 12 / 83 | Passed |
| Unchanged original reviewer probe | 6 / 119 | Passed |
| Unchanged deadline-cut reviewer counterexample | 1 / 6 | Passed |
| New exact-boundary and slow-read checks | 3 / 39 | Passed |

The first three rows independently reproduce the builder's **19 tests / 208 assertions**. The reviewer probes were copied
byte-for-byte from `bedf7483`; their assertions were not edited.

**Original counterexample, real production clock:** publication occurred **0.986334–1.074125 ms before the internal deadline**.
The captured bases were **[100,100,105]**, and the route returned commit t=105 / nextT=106 after 105.042584 ms. The third capture
is the new final read that was absent in round 2. This tests the actual route, drainer and promise wait with fake database APIs;
the production clock is not replaced. The timing-window assertion and both row/checkpoint assertions all pass.

**Old-source negative control:** `round3/control-2` loads `0f6c28c0`. Publication occurred **0.980250–1.014666 ms before expiry**;
the bases stayed **[100,100]** and the response was empty / nextT=105 after 104.028292 ms. Its timing/visibility/cleanup checks
pass and its exact row/checkpoint checks fail: **1 test / 6 assertions, 4 passes and 2 failures**. This remains an actual failing
result, not a PASS produced from an expected exit code alone.

**Publication exactly at the deadline:** new independent cases call the actual private loop with a controlled monotonic clock.
At exactly **5,000,000 ns**, publication changes the fake visible page while the earlier empty cut is returning; the final
capture is at **5,000,000 ns**, and returns the independently authored t=105 row. Its empty counterpart returns empty after
exactly two reads, one arm, and no wait. A second pair publishes exactly when a wait callback reaches that deadline: data
returns on the next read; the empty variant makes one additional final read and stops. Exact capture times, page content,
read counts, arm counts and wait budgets are asserted. These are exact **synthetic-clock** boundaries, not physical timing claims.

**Slow final read, actual route and real clock:** `waitMs=20`, with the final `d/db` callback deliberately paused for at least
75 ms after capturing its value. Both variants finish without restarting the poll loop:

| Final page | Final-read duration | Total request duration | Captured bases | Checkpoint |
| --- | --- | --- | --- | --- |
| t=105 commit | 75.058750 ms | 96.275791 ms | [100,100,105] | nextT=106 |
| Empty | 76.947083 ms | 104.090542 ms | [100,100,100] | nextT=105 |

Each makes exactly one final read after the ordinary two captures, removes the queue once, and leaves no subscription or
queued report. An attempted fourth read throws in the fixture. These checks demonstrate a bounded **number of reads** and
completion with correct content. `waitMs` is a waiting budget, not a hard wall-clock cap on database work; no latency SLA or
containment of an indefinitely blocked database call is inferred. The artificial slow callback models a paused invocation,
not an observed blocking-I/O behavior of Datomic's real `d/db`.

## Attempts and retained failures

- `round3/candidate-1`: 22 tests / 247 assertions, **246 passes, one failure**. The row and nextT were correct, but the unchanged
  real-clock fixture published only **0.658750–0.689208 ms** before expiry, outside its predeclared 0.7–1.3 ms window. No semantic
  acceptance is adopted from that nonzero attempt.
- `round3/control-1`: **3 passes / 3 failures**. Its interval, **0.600958–0.802125 ms** before expiry, could not establish that the
  entire deadline bracket met the declared window. It failed that fixture check plus the two old-source content checks.
- `candidate-2` and `control-2` are unchanged retries justified by those measured fixture misses. Both have valid timing
  windows, and their actual results are the canonical positive/negative pair above. No assertion, timing window, timeout,
  source or acceptance policy was weakened. All first failures and their preimages remain retained.

Reproduction commands from this worktree (use new attempt names rather than overwrite retained evidence):

```sh
node lab/bin/heavy.mjs --poll-ms 100 --label CX-VDF01-r3-candidate-2 -- node lab/verify/DF01/run-round3.mjs candidate-2
node lab/bin/heavy.mjs --poll-ms 100 --label CX-VDF01-r3-control-2 -- node lab/verify/DF01/run-round3.mjs control-2 0f6c28c0
```

`run-round3.mjs` loads every gateway source and the codec specification from the immutable named Git revision into the attempt
directory. Its project classpath uses only that snapshot and the copied probes. Input records bind Git blob IDs, source/test/
runner/JAR/JVM SHA256 values, reviewer head, start/end times, actual parent heavy grant and available disk. Hashes must match
before and after the child; outputs are fresh because an existing attempt directory is refused. The runner itself and each
loaded probe are copied into the attempt. `slot:null` is explicit; no live slot identity is invented.

All test/fingerprint jobs used `lab/bin/heavy.mjs`; host free disk exceeded 5 GiB before admission and the runner rechecked it
after acquiring its grant. Existing retained Datomic 1.0.7745 jars and Temurin 21 JRE were used; no dependency installation,
Docker command, engine reservation, engine start, global cache or subagent was used.

## PASS / verdict / receipt audit (rule 9a)

| Place interpreting observations | Content check | Freshness check | Binding and limits |
| --- | --- | --- | --- |
| Candidate `feed_test.clj`, copied `offline_verify.clj` and `deadline_cut_verify.clj` | Exact identity/row/checkpoint, timing interval and cleanup assertions; old-source control actually fails the expected content checks | Fresh JVM, queues, atoms, cuts and projected outputs per attempt | Immutable source snapshot and byte-identical reviewer probes; real-clock counterexample distinguished from fake database APIs |
| `round3_verify.clj` assertions / `-main` | Independently authored expected row, exact logical deadline/capture/read/arm/wait counts; actual slow-read duration, response content and queue cleanup | New state per case; reports actual suite totals; all failures contribute to nonzero exit | Actual private loop or real-clock route; explicitly synthetic clock only in exact-boundary cases |
| `run-round3.mjs` result and exit | Preserves actual child code/error/output hashes; every input hash checked before/after | Exclusive attempt directory and fresh output; failed attempts kept separately | Candidate commit/blob IDs, actual classpath/probe/runtime bytes, reviewer head, parent heavy grant, slot null |
| `index-round3.mjs` verdict/summary/checksums | Requires candidate exit 0 plus exact 22/247 passing counts, passing original counterexample, exact-deadline content/counts and slow-read content/count/duration; requires valid old-source timing with an empty wrong response and actual content failures | Named complete attempts only; checks timestamps and before/after-bound bytes; preserves both earlier failures | Rechecks source copies against immutable Git and all candidate/control inputs; exact revision and artifact index; never promotes historical G0 to a fresh execution |
| This report's ACCEPT-OFFLINE verdict | Supported by the source change and independently rerun positive/negative cases, with first failures disclosed | New reviewer attempts, distinct from builder history | Scoped to F1; no live qualification or contract promotion |

## Pins, historical claims, and open work

No `lab/acceptance/`, production source, dependency, lockfile, export, slot/image configuration or prior review artifact was
changed. Only new `lab/verify/DF01/` files are committed. No existing pinned path's hash was moved by this review. For the
contract builder, the candidate's modified source identities are:

| Path | Prior (`0f6c28c0`) SHA256 | Reviewed (`4c72ed27`) SHA256 |
| --- | --- | --- |
| `packages/datomic/gateway/src/triplex/gateway/feed.clj` | `fb1fa09735f90f30781ae9845e9bcec2b5974cba89e0411c5bc1adcd69504f3a` | `e3a6b9effe6524aeb679399f368d5f3da16a74135e96b11b4fa4c0cf91d974df` |
| `packages/datomic/gateway/src/triplex/gateway/feed_test.clj` | `186860a3375b10cff2eef2e73c184f604ce726830e406b5a9391597798a4c560` | `d2bcbbf2a991169bfc38da43643b6606bfd46daf1a4bc0a1fb73e19f13298b4b` |

Neither modified path is directly named in the reviewed acceptance pins; no contract was edited or re-pinned. The builder's
G0 receipt `G0-datomic-20261109T090324Z-69ac4b` reports **1,279 passes / 66 expected skips**, linked to its prior timeout failure.
Its modified-source hashes match this reviewed commit. The builder also reports unchanged TypeScript conformance **4/4**.
Neither full G0 nor TypeScript conformance was independently rerun in this narrowly scoped round; no fresh result for those
suites is claimed. The new independent 19/208 Clojure result above was rerun.

No open finding remains in the assigned offline scope. Real Datomic notifications, actual peer restart/excision, live
HTTP-to-peer replay, P3 load/lag and production acceptance remain unverified. No implementation fix, merge, push, deployment,
package publication or acceptance promotion was performed. All new files are below 1 MB and the new raw evidence is below
5 MB; no bulky evidence is committed. See `round3/SHA256SUMS` and `round3/summary.json`; older evidence remains unchanged.
