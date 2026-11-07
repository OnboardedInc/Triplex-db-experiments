The contract regenerated as **0.3.1** during this review. Findings below account for those changes, including Q16–Q20.

1. **Severity: critical — Naming a basis does not prove pinning or non-blocking reads.**  
   **Disputed:** P1: “Every read names its basis” and writers “never block.” [TARGETS §1](/Users/sam/projects/triplex-db-2/lab/TARGETS.md:17)  
   **Why:** Readers and writers can use disjoint subjects. A reader that takes locks or silently advances its snapshot could then pass every comparison. Correctness-qualified goodput is correctly required; the workload still needs changes that distinguish correct snapshots from latest-state answers.  
   **Change:** Require a fixed hot set shared by readers and writers, mutations between subgraph-read steps, reads spanning commits and maintenance, independent requested-basis capture, and evidence identifying reader-caused writer waits.

2. **Severity: major — The “fixed writer trace” leaves its most consequential properties unfixed.**  
   **Disputed:** Rate/mix tables and “a recorded seed fixes the whole trace.” [TARGETS §2](/Users/sam/projects/triplex-db-2/lab/TARGETS.md:27)  
   **Why:** No subject-selection distribution, overlap, command-size distribution within bands, burst phase, or rule for combining scenario traffic with background traffic is specified. P2 measures an additional one-command/s probe, which can use quiet subjects while real writers queue.  
   **Change:** Freeze the trace generator and offer schedule before comparisons. Measure scheduled-offer-to-published-ACK latency, account for every offered command, and apply P2 to representative trace commands. Match burst phases across baselines and candidate windows.

3. **Severity: major — P3 measures neither a fully specified feed nor durable consumer progress.**  
   **Disputed:** Lag is “commit ACK to affected subjects known”; GS.19 requires “no duplicate processing.” [load-contract P3](/Users/sam/projects/triplex-db-2/lab/acceptance/load-contract.json)  
   **Why:** Delaying ACK hides part of commit-to-consumer latency. “Known” could mean an ephemeral in-memory list. A crash after applying an effect but before checkpointing normally causes replay; prohibiting duplicate processing without defining atomic checkpoint/effect publication makes the verdict ambiguous.  
   **Change:** Define the commit timestamp, feed cursor/order, expected affected-subject set, durable consumption milestone and replay semantics. Inject crashes before and after effect/checkpoint publication. Judge duplicate externally visible effects separately from replay attempts.

4. **Severity: major — P4 can hide slow large pulls and history-sensitive tails.**  
   **Disputed:** “50 to 2,000 facts”; history flatness compares **p50** in the generated contract. [TARGETS P4](/Users/sam/projects/triplex-db-2/lab/TARGETS.md:20)  
   **Why:** Almost every pull can contain 50 cached facts. Q16 specifies history-flatness **p99**, but the generated threshold and workload still use p50. Comparing different subjects in H1/H3/H10 also confounds history depth with topology and cache state.  
   **Change:** Freeze weighted hop/result-size buckets, report their tails separately, and grow history on matched subject populations. Compile Q16’s p99 rule. Bind actual CPU allocation and report host broker/kernel costs alongside engine-core throughput.

5. **Severity: critical — P5 times fetching instead of release re-evaluation.**  
   **Disputed:** “Sweep 100k subjects (pull each at one pinned basis).” [TARGETS P5](/Users/sam/projects/triplex-db-2/lab/TARGETS.md:21)  
   **Why:** Fetching and discarding 100k worlds can pass without evaluating changed requirements, updating work, or publishing results. Independent per-subject snapshots can also masquerade as one sweep snapshot if intervening writes are irrelevant. A fast sweep need not exercise snapshot retention during compaction.  
   **Change:** Require one shared basis and release hash, exact subject coverage, independent expected reconciliation outputs, and defined result publication. Mutate selected subjects after capture. Add a deliberately prolonged sweep overlapping real compaction.

6. **Severity: critical — The golden scenarios lack an independent domain model.**  
   **Disputed:** Expected answers come from O-REPLAY or hand derivations. [TARGETS §6](/Users/sam/projects/triplex-db-2/lab/TARGETS.md:104)  
   **Why:** O-REPLAY specifies database state, arithmetic and supports—not the rules determining the next I-9 task, proposal visibility, release impact or overdue obligations. Comparing preview with the production sweep is insufficient: both can share the same defect. Concurrent writes also make their answers legitimately differ unless the comparison fixes the same input world.  
   **Change:** Freeze a small world definition, releases and independent expected domain/effect traces for every scenario. Specify preview-versus-activation equivalence at a common input basis. Require positive and negative witnesses, not merely successful reads.

7. **Severity: major — Important failure combinations are absent from the twenty stories.**  
   **Disputed:** GS.03/04/06/19 cover duplicates, restart, fanout and consumer recovery separately.  
   **Why:** Missing discriminators include a delayed older vendor revision arriving after a newer one; dependency changes through shared referenced entities; a read-index partition while the source continues committing; and a crash after outbox delivery but before recording completion. Commit order alone does not prevent stale business state or duplicate actions.  
   **Change:** Extend existing scenarios with those schedules and explicit expected outcomes. Include storage-level unauthorized tenant access and a slow tenant/consumer, rather than testing isolation only through correctly scoped requests.

8. **Severity: critical — Erasure contradicts unconditional historical reproduction.**  
   **Disputed:** GS.16 requires values “unrecoverable from every layer”; cursor/history contracts require retained cuts to reproduce their original answers. [Acceptance §§7.6, GS.16](/Users/sam/projects/triplex-db-2/lab/acceptance/ACCEPTANCE.md)  
   **Why:** An old pinned reader cannot both return erased plaintext and preserve erasure. Destroying a document key also proves nothing about plaintext lexical/order channels, caches, logs, checkpoints or restored backups.  
   **Change:** Define erasure’s visibility boundary and permitted historical redaction/tombstone outcome. Inventory protected copies and keys. Test an already-pinned reader, rebuild and restore after erasure, with independently specified post-erasure answers.

9. **Severity: major — Decimal storage is specified more precisely than decimal computation.**  
   **Disputed:** Q18: declared precision/scale and “exact decimal arithmetic.” [RULINGS Q18](/Users/sam/projects/triplex-db-2/lab/acceptance/RULINGS.md:64)  
   **Why:** Result precision/scale, non-terminating division, explicit conversions and scale evolution remain undefined. `CMP-DECIMAL-CROSS` says equality is false while also requiring an error for “any comparison.” Round-trip tests do not catch rounding before canonical intent capture or inside the kernel.  
   **Change:** Freeze operation/conversion/error tables and capture original typed input before production normalization. Test adjacent large decimals, negatives, zero, scale boundaries, arithmetic intermediates, migrations and every query/serialization path. Independently verify order keys against exact numeric ordering.

10. **Severity: major — The rejection requirement accidentally demands native engine behavior.**  
    **Disputed:** `G1.types.out-of-range-rejected` includes `EP-RAW-WIRE` and requires preflight rejection without mutation.  
    **Why:** The documented QLever defect is that direct native UPDATE can wrap. Broker-side validation is an authorized workaround; it does not change direct engine semantics. Bulk and replay paths also need the same validation boundary.  
    **Change:** Distinguish qualified writes from bare diagnostic wire access. Require every qualified write/import/replay route to reject atomically; retain native wrapping as a diagnostic. Do not make the workaround’s acceptance depend on eliminating the underlying native limitation.

11. **Severity: critical — The evidence model cannot yet select engines independently per layer.**  
    **Disputed:** Compare all-XTDB, all-QLever and two compositions moving all read layers together. [PLAN §3](/Users/sam/projects/triplex-db-2/lab/PLAN.md:87)  
    **Why:** Those comparisons cannot distinguish XTDB-current/QLever-history from the reverse. Receipts retain a singular engine image/configuration and scope keys derived from `engineOfLane`; they do not explicitly bind both hybrid stores, source positions, index watermarks or translation generations. C1’s same-language fallback also needs a concrete route across engines.  
    **Change:** Identify source/current/history/analytics assignments separately. Bind every component and replication edge. Define basis translation, freshness, fallback and ACK ownership. Measure layer swaps under matched workloads, then validate selected compositions end to end.

12. **Severity: major — Generation 2 spends effort before resolving the composition decision.**  
    **Disputed:** Build all twenty scenarios first; current indexes precede the commit/feed experiments; selection chooses the “lowest-ranked” unmet priority. [PLAN §§6.1, 8](/Users/sam/projects/triplex-db-2/lab/PLAN.md:170)  
    **Why:** “Lowest-ranked” reverses Sam’s ranking. Implementing full scenario machinery before proving durable commits, feed replay and cross-store basis translation risks building two elaborate monoliths.  
    **Change:** First freeze measurement semantics; build instrumentation and tiny commit/feed/fault controls; measure both sources; prototype current/history layer swaps at small rungs. Then build the broader scenario suite and scale promising compositions. Keep both engines eligible and select the **highest-priority unmet** objective.

13. **Severity: major — Unrelated performance gates still leak into done.**  
    **Disputed:** Mandatory one-second general recursion, 1.1× latency growth from 1m to 10m, and 2× deep-page cost. [Acceptance threshold registry](/Users/sam/projects/triplex-db-2/lab/acceptance/ACCEPTANCE.md)  
    **Why:** TARGETS §5 says everything remains correct while performance tuning follows P1–P5 and secondary measurements. History flatness does not justify a population-growth bound for arbitrary selective queries. These additional bars can block completion despite meeting Sam’s actual priorities.  
    **Change:** Preserve correctness, bounded execution and measurement. Map each additional performance bar to a concrete priority workload or remove its authority to block done.

14. **Severity: critical — Mechanical closure still contains vacuous and inconsistent rules.**  
    **Disputed:** `CR-CALIBRATION` requires records for every `L-*` threshold; none exist. NS/GS obligations have `modes: []`, while executions equal selections × modes. GS.01 additionally selects all CS-GS cases.  
    **Why:** Calibration can satisfy an empty requirement; literal execution counting yields zero; GS.01 inherits unrelated scenarios without defined threshold attribution. These defects survive the generator checks.  
    **Change:** Require complete NS threshold coverage, define an explicit single-execution mode for NS/GS, remove GS.01’s all-case selection, and validate scenario-specific evidence/bar bindings. Add evaluator counterexamples proving incomplete receipts cannot close obligations.

Before generation 2 continues making comparative or promotion claims:

- Freeze discriminating workload schedules and P1–P5 measurement boundaries.
- Define independent domain expectations and combined failure schedules for the twenty scenarios.
- Complete numeric and erasure semantics across all paths.
- Make composition identity, replication and per-layer comparisons explicit.
- Repair closure rules, remove superseded performance requirements and correct experiment ordering.

**Verdict: NOT READY for generation 2 acceptance or promotion claims.**