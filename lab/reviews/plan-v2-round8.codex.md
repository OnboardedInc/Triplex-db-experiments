Verification passed byte-identically. All `claim.mjs` references below are at **e2a082e**; broker source references are at **f711193**. No files edited.

1. **Major — R7-1: PARTIAL. Receipt forgery is blocked; executable qualification remains incomplete.**  
   **Disputed:** “a QUALIFIED verdict comes only from a run the evaluator executes itself.”

   I found no receipt-shaped input reaching the CLI’s top-level QUALIFIED verdict: `admit` always returns DIAGNOSTIC, and `qualify` unconditionally adds GATE-NOT-RUN (`claim.mjs:590–595,1092`). Claims cannot replace oracle runners, manifests, build specifications, image pins or verifier entries.

   However, the generated contract still has null build commands, null A0 entries and **63/63 unpinned case manifests**. Only O-REPLAY has a runner; mandatory G10 identity cases lack their O-CONTRACT runner. Fault injection and paired measurement return null (`claim.mjs:992–1006`). See [obligations.json:2394](/Users/sam/projects/triplex-db-2/lab/acceptance/obligations.json:2394), [obligations.json:2452](/Users/sam/projects/triplex-db-2/lab/acceptance/obligations.json:2452).

   **Change:** finish and independently verify executing qualification, then pin the required manifests, runners, build, trace and A0 controls. Preserve the current blockers until then.

2. **Major — R7-2: PARTIAL. Rebuilding defeats relabelling, but binary identity omits runtime behavior.**  
   **Disputed:** rebuilding A0 establishes the executed control’s identity.

   The registered hash comparison and `measuredBy` check close the original manifest-label attack (`claim.mjs:393–395`). But “binary” hashes only declared build outputs; execution can also use source runners, dependencies and configuration outside those outputs (`:916–924,844–847`).

   Worse, `byBinary.set(binary, rec)` aliases builds with identical output hashes. Building A0 overwrites the candidate entry; subsequent candidate executions select A0’s checkout (`:923,962`). Identical dist files with different runner or dependency bytes therefore need not execute the claimed candidate.

   **Change:** bind the complete executable runtime and identify executions by source/build instance plus configuration, rather than output hash alone.

3. **Major — R7-5: CLOSED as a contract correction.**  
   **Disputed:** replica publication previously prohibited a correct log-source ACK.

   QT4s now establishes durable, readable source publication; QT4r separately establishes replica application. ACK while the replica lags is explicitly permitted. [ACCEPTANCE.md:1150](/Users/sam/projects/triplex-db-2/lab/acceptance/ACCEPTANCE.md:1150), [ACCEPTANCE.md:1162](/Users/sam/projects/triplex-db-2/lab/acceptance/ACCEPTANCE.md:1162). `compositionOk` enforces the source variant and log fields (`claim.mjs:239–252`).

   **Change:** none to this distinction. Executing its fault cases remains item 1.

4. **Critical — R7-6: PARTIAL. The fix still permits stale answers labelled at B.**  
   **Disputed:** checking the real marker before and after the answer establishes eligibility.

   Counterexample: observe marker B; reset the replica; execute the query against incomplete replay; replay through B; observe marker B again. Both checks pass while the answer omits facts required at B.

   Native queries use separate marker and answer requests (`NativeQueries.ts:149,197,207–216`). Datalog likewise brackets execution with separate probes (`QleverQueryExecutor.ts:230–237,387`). The author acknowledges this limitation in [REPORT.md:61](/Users/sam/projects/triplex-db-2/lab/experiments/EXP-P2Q-qlever-log-broker/REPORT.md:61).

   The contract’s honesty rule correctly forbids that answer, but naming a regression case does not establish that its eventual manifest tests this interleaving. [obligations.json:1705](/Users/sam/projects/triplex-db-2/lab/acceptance/obligations.json:1705).

   **Change:** obtain eligibility evidence with the answer in one snapshot, or enforce an incarnation/fencing mechanism that detects resets throughout execution. Add this exact interleaving to the independently authored cases.

5. **Major — R7-7: PARTIAL. P3 remains asymmetric and ACK-dependent.**  
   **Disputed:** the fix now measures source-publication-to-consumer lag completely.

   The generated requirement is correct. [obligations.json:19779](/Users/sam/projects/triplex-db-2/lab/acceptance/obligations.json:19779). The fix harness still substitutes **ACK time for A0 publication** (`bench/run.mjs:256–263,297`). Candidate timing uses fsync return, preceding its watermark publication (`broker.ts:425–435`).

   Its expected positions come from successfully ACKed command records (`bench/run.mjs:254,260`). It also permanently records “missing ACK” when consumption happens before the ACK callback, then fails the run even if that callback subsequently arrives (`:152,168,269`). That can reject correct asynchronous delivery.

   **Change:** independently enumerate the final published source prefix and timestamp actual publication on both arms. Reconcile ACK records afterward; delayed or lost ACK delivery must neither erase a committed position nor itself constitute a feed defect.

6. **Critical — Candidate builds can modify the judge or control.**  
   **Disputed:** expected answers “never come from the candidate” (`claim.mjs:1009–1011`).

   Builds execute candidate-controlled scripts directly on the host (`:904`). Cleaning environment variables does not isolate filesystem access. A build can leave a background process that edits the sibling oracle checkout or A0 dependencies. Oracle files are checked against Git before materialisation, but their materialised bytes are not protected or rechecked before each invocation (`:943,1019–1026`).

   Offline execution explicitly lacks isolation (`:969`). Rehashing declared dist modules does not protect oracle files, runtime dependencies or source runners.

   **Change:** isolate builds and both execution arms from evaluator, oracle, evidence and control storage. Run immutable oracle bytes in an evaluator-owned environment. Keep offline verdicts strictly diagnostic. The unconditional GATE-NOT-RUN currently prevents this becoming a top-level qualification escape.

7. **Critical — PAIR-0 admission accepts missing or explicitly failing measurement evidence.**  
   **Disputed:** CR-NS requires GREEN windows, complete histograms and passing statistical margins. [obligations.json:11958](/Users/sam/projects/triplex-db-2/lab/acceptance/obligations.json:11958).

   Using the generator’s populated fixture authorities, the reference returned **QUALIFIED** for a measurement declaring:

   `windowGrade:"RED", histogram:"committed-only", ratioCI:[0.1,0.2], verdict:"SLOWER", rounds:9`.

   It also qualified a measurement containing **no numerical evidence whatsoever**. JavaScript `pairedOk` accepted the same malformed measurement. Both implementations check only mode, design, round-count range, workload and regime labels (`build_contract.py:1432–1443`; `claim.mjs:320–327`). Nine rounds even bypasses the registered looks.

   **Change:** mechanically recompute statistical decisions, noise grades, offered-command accounting and required bars from retained events. Execute the RED-window and committed-only counterexamples against admission; listing them in the contract does not enforce them.

8. **Major — PAIR-0 confuses matched resources with identical placement.**  
   **Disputed:** both arms must have equal workload and slot-regime objects.

   `pairedOk` requires literal cpuset equality. It rejects equally sized, disjoint `0-1` and `2-3` sets—the partition R22 recommends—and accepts both arms sharing one set. [R22:161](/Users/sam/projects/triplex-db-2/lab/research/R22-noise-robust-benchmarking.md:161).

   Admission also requires one workload’s `slot` to equal both compositions’ source slots (`claim.mjs:400–401`), preventing a normal duet across different registered slots.

   Additionally, P4 still divides throughput by CPU quota, although PAIR-0 removes that quota. [load-contract.json:322](/Users/sam/projects/triplex-db-2/lab/acceptance/load-contract.json:322).

   **Change:** separate shared workload identity from each arm’s placement. Validate observed equal capacity and disjoint duet placement; define the per-core denominator under cpusets.

9. **Major — Correct typed availability failures fail the declared comparator.**  
   **Disputed:** E-BASIS-NOT-AVAILABLE and E-REPLICA-UNAVAILABLE match the fix’s errors.

   The contract requires tags `BasisNotAvailable` / `ReplicaUnavailable`, with reasons `basis-not-reached` / `replica-unreachable`. [obligations.json:4913](/Users/sam/projects/triplex-db-2/lab/acceptance/obligations.json:4913).

   The fix returns `_tag:"ReadError"` with `basis-not-available` / `replica-unavailable` (`broker/errors.ts:16–17,43–44`). My CMP-ERROR probe rejected it. Furthermore, the comparator requires non-null `cause` (`claim.mjs:150`), although a normal deadline expiration need not have an underlying exception.

   **Change:** freeze one compatible error representation and compile it consistently. Validate availability fields without requiring an invented cause or admitting arbitrary ReadError failures.

10. **Major — Comparator-correct answers are subsequently rejected by hash equality.**  
    **Disputed:** “apply the comparator the case declares.”

    `CMP-BAG-ROWS` correctly accepts `[1,2]` versus `[2,1]`. The executor then converts that PASS to FAIL because their hashes differ (`claim.mjs:979–983`). The same problem affects set and diagnostic comparators.

    **Change:** retain both raw objects and recompute case-result/2 using its declared comparator. Byte equality must remain the exact comparator’s requirement, rather than override every comparator.

11. **Major — Broker promotion hardening is declared but never enforced by admission.**  
    **Disputed:** GATE-BROKER-HARDENING applies to log-source promotion claims. [obligations.json:3997](/Users/sam/projects/triplex-db-2/lab/acceptance/obligations.json:3997).

    With populated fixture authorities, a log-source `kind:"promotion"` claim returned **QUALIFIED**, executing zero hardening cases. The reference ignores claim kind; `claim.mjs` drops it before calling `admitCore` (`:1096`). Its prerequisite list contains only position, identity and optional W0 (`:387`).

    **Change:** preserve claim kind and mechanically enforce applicable promotion gates. Until supported, reject promotion qualification explicitly.

**NOT READY for generation-2 comparisons.** Minimum changes:

- Finish executing qualification and pin its required inputs and verified A0 controls.
- Isolate builds, oracles and arms; bind complete execution identities.
- Implement PAIR-0’s actual decisions and correct placement/accounting rules.
- Re-verify the broker against the reset interleaving, reconcile errors, and repair P3 timing/accounting.
- Enforce declared comparators and promotion prerequisites.