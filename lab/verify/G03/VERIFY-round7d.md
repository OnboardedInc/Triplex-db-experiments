# G03 round 7d: FIX-FIRST (verification incomplete)

Reviewer **CX-VG03-7D** on `verify/G03-7d`. Reviewed and tested report head `1432f79a63037e2704bfee4c87ff1ea544bc7426`, implementation `78307fcf510dabee2999b5d3739b3950d024e1e5`. Compared against round 7c `67844167643d964dfb010e70bfd37b66fafdc4dd` and its F5/F6/F7 review. Only reviewer tools, results and this report change; coordinator, builder tests and acceptance files remain byte-identical to the reviewed head.

North star: correctness of P1–P5 evidence, particularly failed-attempt retention and P2/P3 recovery observations, under `lab/SCOPE.md`, `lab/NORTH-STAR.md` and `lab/TARGETS.md`.

**F5, F6 and F7 are closed in the tested offline model. No new implementation defect was reproduced.** The overall verdict is FIX-FIRST because the requested fresh 295-test full suite and 108-test evaluator suite cannot run within the explicit “Offline only; no docker lifecycle” restriction: both eagerly create and remove real Docker fixtures. They were not run. This is an incomplete-verification verdict, not a demand to change the reviewed implementation. No production acceptance or QUALIFIED grant follows.

## V1 — Medium verification blocker: two requested gates require prohibited lifecycle actions

Location: `lab/bin/test/contained-fixtures.mjs:10` creates a protected evaluator clone; line 15 constructs the engine command; line 16 creates a real store volume; line 18 removes it during cleanup. `claim.test.mjs` and `claim-round2.test.mjs` invoke this fixture during module initialization. The fixtures also create/run/remove synthetic containers and networks.

Reproduction: read the unchanged fixture implementation and its unconditional setup calls in the two evaluator test modules. The 108-test evaluator suite is those two files; the requested 295-test full suite includes them. Even offline qualification in these tests uses real private-daemon containers. This reviewer did not execute lifecycle operations to reproduce an already explicit source fact. `pin-review.json` independently validates the committed builder TAP hashes and denominators (295/295 and 108/108), but classifies them as historical, not fresh reviewer evidence.

Proposed resolution: the dispatcher must explicitly permit the existing private-daemon fixture lifecycle, then dispatch the unchanged full and evaluator commands through `heavy.mjs` on this reviewed tree. Retain fresh traces and completed-process exits. No test weakening, alternate mock PASS, or coordinator fix is proposed. A clarification was submitted during this run; no answer arrived before the report was completed. The restrictive instruction was therefore enforced. Acceptance remains pending those two gates.

## F5 — closed offline

Locations: `lab/bin/ns-run.mjs:155`–160 establish the forensic set and enter the guard before both terminal construction and stage-10 logging. Lines 182–191 detach the forensic volumes before any gap write, preserve the primary cause and attach secondary write failure information.

The final independent 12-case matrix executes exact reviewed coordinator/Box bytes through the existing trusted lifecycle model, with separate reviewer I/O faults and assertions (`round7d/retention-review.mjs`, `retention-final.json`). It verifies:

- Stage-10 EIO with a rejected control hook, nonzero driver exit and clean driver exit: all nine exact run volume names survive caller `close()` and remain in `box.retained`; none is deleted at close; no export walk or stage 13 occurs. The incomplete stage-10 row is absent from the persisted log.
- Rejected-control and nonzero-exit cases retain the original cause first in the thrown message, with terminal persistence failure as `cause`. The clean case keeps the EIO itself. The gap binds run ID, source commit, synthetic slot and exact saved input-preimage hash; it has `qualification:false` and `export:'NOT-PROVEN-SAFE'`.
- A gap-write failure in each of those three cases leaves all nine volumes intact and attaches `gapWriteError` without substituting it for the primary failure. A stage-14 append failure likewise attaches its error and leaves the already-written gap intact. An adjacent export-walk plus gap-write failure retains the walker error and separately records the gap error.
- Stage-11 and stage-12 append failures also retain all nine volumes.
- A trusted hash dependency failure **during terminal construction itself**, before stage 10, retains the nine volumes and original control cause, with `terminal:null`. This also holds when writing that gap record fails.

This is a trusted dependency/ownership model, not observation of real Docker volumes surviving host I/O failure. The retention claim is consistent with the actual `BoxExecutor.close()` resource loop at `lab/bin/box.mjs:265`: detached volumes are not removed by that loop. Pre-existing probe volumes outside the forensic nine may be removed normally.

## F6 — closed offline

Location: `lab/bin/box.mjs:140` validates parsed values before accessing `schema` and routes malformed envelopes through `fail()`. It no longer throws an uncaught null-property TypeError.

The builder's three new coordinator regressions pass and assert failed coordinator terminals, eight captured role/control files, preserved partial bytes and digests, and safe cleanup ordering. Independent direct-pipe cases cover `null`, empty/nonempty arrays, number, boolean true/false and string: all reject specifically with `FAULT-CONTROL-ENVELOPE`, carry exact partial stdout/stderr, and dispatch no control callback. Empty objects and objects with foreign, null or numeric schema are ignored without callback, as documented. These are malformed-producer tests, not evidence that candidate code can access the private pipe.

## F7 — closed offline

Locations: `lab/bin/box.mjs:136`–142 retain raw Buffer chunks, frame on byte 0x0a, require UTF-8 round-trip identity before JSON parsing and return concatenated raw stdout/stderr. `ns-run.mjs:41`–43 hash the resulting bytes for the failed terminal; lines 169–178 export and capture them.

`round7d/control-review.mjs` executes the exact Box handler with a separate trusted PassThrough producer. Its **101 cases** compare stdout and stderr byte-for-byte to supplied Buffers. They include every possible two-chunk split of a valid control message containing `é`, `€` and `😀`, one-byte chunks, a legitimate U+FFFD character, malformed UTF-8 forms, a raw unfinished multibyte tail, the F6 envelope cases and ignored schemas. Valid messages dispatch the exact object once; malformed UTF-8 lines refuse with `FAULT-CONTROL-JSON`; unfinished lines refuse with `FAULT-CONTROL-TRUNCATED`. Terminal hashes and byte counts are independently recomputed. Non-UTF-8 stderr remains exact opaque diagnostic bytes; only framed stdout is parsed as control JSON.

The four new coordinator byte-fidelity regressions also pass, comparing on-disk exports to independently supplied hex and checking both terminal and capture digests. This covers actual export, not digest self-consistency alone. The existing output cap remains unchanged: a chunk crossing the cap is refused and omitted from partial capture, as the inherited cap regression explicitly expects. These findings concern exact preservation within that existing bounded-capture policy; no unbounded-capture claim is made.

## Fresh checks and regression sensitivity

| Check | Fresh result | Evidence |
| --- | --- | --- |
| NS components, initial sandboxed attempt | 186/187; exit 1 | `round7d/ns.tap`, `ns.stderr` |
| NS components, local sysctl permitted | **187/187; exit 0**; zero fail/cancel/skip/todo | `round7d/ns-attempt2.tap`, `ns-attempt2.stderr` |
| Standalone contract `--verify` | **exit 0; second regeneration byte-identical** | `round7d/contract-verify.txt`, `contract-verify.stderr` |
| New/old coordinator regression matrix | **27/27 current; 17/27 old-both** | `round7d/liveness-review.json`, four TAP files and source manifests |
| Independent retention matrix | **12/12 asserted; exit 0** | `round7d/retention-final.json` |
| Independent wire matrix | **101/101 asserted; exit 0** | `round7d/control-review.json` |
| Protected closure and pin check | **exit 0** | `round7d/pin-review.json` |
| Full suite, requested 295 | **NOT RUN — lifecycle restriction** | V1 above |
| Evaluator suite, requested 108 | **NOT RUN — lifecycle restriction** | V1 above |

Every suite/probe above that uses the heavy semaphore ran via `node lab/bin/heavy.mjs --label CX-VG03-7D-… -- <command>`. Contract verification ran as its own heavy step. Host free disk was approximately 86 GiB at initial admission, above the 5 GiB floor. Node was v22.23.1. No dependency installation was needed.

The initial NS failure is specifically the sandbox refusing `/usr/sbin/sysctl -n kern.bootsessionuuid` from `lab/bench/ns-driver/launch-artifact.mjs:104`; all 27 round7c/7d regressions passed in that attempt. The approved local-check rerun used the same source and assertions and passed all 187. The first attempt remains retained as a failure, not overwritten or combined with the rerun.

`liveness-review.mjs` materializes reviewed Git blobs with **unchanged current tests and harness** in four fresh owned snapshots. Current code: 27 pass, 0 fail. Both `box.mjs` and `ns-run.mjs` at `67844167`: 17 pass, **exactly the ten new tests fail**. Old Box only: 20 pass, 7 fail (F6/F7). Old coordinator only: 24 pass, 3 fail (F5). All have zero skip/cancel/todo. Each source manifest records path, Git commit and SHA256; subprocess exits and TAP hashes are checked. Completed snapshots were removed after all results and source manifests were saved; originals were never edited.

One reviewer-tool mistake is retained: the first retention assertion wrongly forbade cleanup of **any** volume, including pre-existing nonforensic probe volumes. It failed after the observed nine forensic volumes had survived. The assertion was narrowed to the exact nine names; fresh attempts passed. Its stderr and raw attempt remain. The final matrix is a fresh execution of the final reviewer tool and includes its own tool hash. The intermediate 10-case matrix and two terminal-construction cases are also retained, rather than relabeled as the final run.

## Pins and boundaries

`pin-review.mjs` compares exact Git preimages and working bytes. No direct `obligations.json.inputs` pin changed. Of the 15 protected evaluator closure files, **only box.mjs changed**; the other 14 are unchanged from round 7c. `lab/acceptance/`, driver sources, observer.py, smoke.mjs and exclusive.mjs are unchanged. The report explicitly requires the protected evaluator re-pin in contract **0.4.1**, together with the pending round-7a bundle. This reviewer changes no pin or acceptance contract.

| Path | SHA256 at 67844167 | SHA256 at 1432f79a |
| --- | --- | --- |
| `lab/bin/box.mjs` — protected evaluator closure | `589028dca91ca8c90865994dd483df4694999360f9485520c9c963296b1dc906` | `a90715c708b6329bc8c07d12531aac4d88b0ce275fa1352bb46a3483e34fe481` |
| `lab/bin/ns-run.mjs` | `aa99c4fae29d72f2558e47fb14e6abcf12748caf7f21fd45a9fbe4e87fcffd82` | `bb9105e18a321438d7b8c2594f9de975862d082acf225f1ea22fae7f3ca5720d` |

## Rule 9a: observation-to-verdict audit

These are all reviewer code sites emitting a positive check, receipt or verdict:

- **control-review.mjs:** every observation is appended only after exact supplied/received stdout and stderr equality, expected refusal/success, exact callback list and (for failures) raw tail and independent terminal hashes/counts. Each case uses a fresh VM and producer. Source SHA256 binds the exact Box bytes; terminal run names are synthetic case IDs. No engine slot or live producer claim is made.
- **retention-review.mjs:** observations follow expected fault-count, refusal, exact nine run-derived names in retained ownership and post-close inventory, no deletion of those names, primary/secondary error assertions, persisted gap/run/source/synthetic-slot/input-preimage hash equality, or the expected absence of a failed gap write. Every attempt directory is new and the coordinator generates a fresh run ID. Source and harness hashes bind actual bytes; final output also binds the reviewer tool hash. Trusted dependencies and lack of real slot proof are explicit.
- **liveness-review.mjs:** materialized sources come from exact Git commits; current tests/harness remain unchanged. Assertions require completed subprocess status, exact 27-test pass/fail counts, no skips/cancellations/todo and the exact class of ten old-code failures. Fresh snapshots and manifests prevent reuse of earlier TAP. Passing current results establish regression behavior only.
- **pin-review.mjs:** positive flags require exact Git/working byte comparisons, actual protected closure membership, independent old/new hashes, unchanged contract and explicit re-pin wording. Historical builder TAPs require manifest-hash equality and declared successful exit/denominator; their records explicitly deny freshness. They never satisfy the missing reviewer gates.
- **Raw-evidence relocation:** the retained `raw-evidence.json` receipt was written only after every source/destination file hash matched. Only then were quiescent reviewer-generated local copies removed. Every retained byte is indexed by path, size and SHA256. This certifies copy identity, not semantic correctness.
- **summarize.mjs / SHA256SUMS:** final assertions require exact reviewed-source equality outside this review directory; actual fresh NS and standalone verification outcomes; all independent expected counts/hashes; actual durable-file hashes; and explicit NOT-RUN statuses for both Docker gates. Checksums bind the delivered artifacts, not production acceptance. The report's FIX-FIRST follows that explicit missing-gate status rather than historical positive logs.

Evidence: reviewer tools, compact results, first failures and `SHA256SUMS` are under `lab/verify/G03/round7d/`. Raw model output exceeds 5 MB and is retained at `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VG03-7D/`; `round7d/raw-SHA256SUMS` and `raw-evidence.json` index it. All raw attempts, including the initial reviewer assertion failure, are retained. No raw evidence directory over 5 MB or single evidence file over 1 MB is committed.

Not done: Docker lifecycle of any kind, full/evaluator fixture execution, live boxed P-TINY, pause/kill/restart, host-I/O retention proof, CR-NS ingestion, recovery normalizer or P1–P5 qualification. No engine slot was taken, resident changed, main checkout edited, implementation fixed, contract re-pinned, push or merge performed. Open question: whether the dispatcher permits the existing fixture lifecycle needed to finish the two required gates.
