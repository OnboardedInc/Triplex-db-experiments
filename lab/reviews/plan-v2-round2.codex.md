Generator validation passed with writes intercepted in memory; all five generated outputs match. **CLOSED means the contract definition resolves the finding, not that execution has passed.**

1. **Critical — CLOSED: pinned reads.** Shared hot sets, forced intervening mutations, maintenance and driver-recorded bases are required named cases in [NS.P1](/Users/sam/projects/triplex-db-2/lab/acceptance/ACCEPTANCE.md:2149).

2. **Major — PARTIAL: writer trace.** The schedule and per-band measurements are compiled, but [NS.P2](/Users/sam/projects/triplex-db-2/lab/acceptance/ACCEPTANCE.md:2159) accepts accounting through typed rejection without requiring sustained successful progress. Reject most commands and measure latency on survivors. **Require oracle-valid scheduled commands to publish, with independently justified conflicts and bounded outstanding work.**

3. **Major — CLOSED: feed semantics.** Publication-to-durable-checkpoint lag, affected sets, three crash points and visible-effect deduplication are explicit in [NS.P3](/Users/sam/projects/triplex-db-2/lab/acceptance/ACCEPTANCE.md:2167).

4. **Major — CLOSED: current-pull measurements.** Weighted buckets, largest-bucket tails, matched-history p99 and CPU accounting are compiled into [NS.P4](/Users/sam/projects/triplex-db-2/lab/acceptance/ACCEPTANCE.md:2176).

5. **Critical — CLOSED: sweep versus fetching.** [NS.P5](/Users/sam/projects/triplex-db-2/lab/acceptance/ACCEPTANCE.md:2185) now requires evaluation, exact coverage, outbox publication, post-capture mutations and the prolonged maintenance variant.

6. **Critical — PARTIAL: domain oracle.** O-DOMAIN is mandatory, but [WORLD_W0](/Users/sam/projects/triplex-db-2/lab/acceptance/ACCEPTANCE.md:971) remains a topic list with “about 12” rules. The concrete decision tables and expected outputs are deferred. **Block domain-dependent comparisons until D01’s normative specification and vectors are independently reviewed and pinned.**

7. **Major — PARTIAL: combined failures.** The added schedules are selected by the generated obligations. However, [GS.19](/Users/sam/projects/triplex-db-2/lab/acceptance/ACCEPTANCE.md:2386) still demands “no duplicate processing,” contradicting permitted replay. **Replace that with zero duplicate externally visible effects throughout.**

8. **Critical — PARTIAL: erasure.** New obligations cover historical markers, copies and restore. They do not reconcile [C6’s whole-journal byte comparison](/Users/sam/projects/triplex-db-2/lab/acceptance/ACCEPTANCE.md:1592) with erased journal values. See item 17.

9. **Major — PARTIAL: decimal semantics.** Operation and conversion tables are compiled. But [DS-WIDEN](/Users/sam/projects/triplex-db-2/lab/acceptance/ACCEPTANCE.md:262) incorrectly treats increasing scale as universally metadata-only. `decimal(5,2)` permits `999.99`; `decimal(5,3)` does not. Scale-dependent order keys also cannot automatically remain valid. **Preserve integer capacity and prove key compatibility, otherwise migrate atomically.**

10. **Major — CLOSED: qualified rejection paths.** Writer, bulk, replay and restore are required; bare-wire wrapping is diagnostic in [G1.types.out-of-range-rejected](/Users/sam/projects/triplex-db-2/lab/acceptance/ACCEPTANCE.md:1171).

11. **Critical — PARTIAL: composition selection.** Four assignments and replication edges are bound, and layer swaps are specified. [Watermark eligibility](/Users/sam/projects/triplex-db-2/lab/acceptance/ACCEPTANCE.md:1015) remains incomplete; see item 16.

12. **Major — CLOSED: sequencing.** [PLAN §§6.1 and 8](/Users/sam/projects/triplex-db-2/lab/PLAN.md:172) correct priority selection and put commit/feed controls and small-rung layer swaps before broad scaling.

13. **Major — CLOSED: non-priority performance gates.** The three disputed thresholds now feed CR-METRICS rather than blocking performance rules. [SECONDARY_RULE and CR-METRICS](/Users/sam/projects/triplex-db-2/lab/acceptance/ACCEPTANCE.md:540) explicitly remove their failure authority.

14. **Critical — CLOSED: original mechanical defects.** Calibration coverage, explicit modes, scenario-specific selection and negative evaluator fixtures are compiled. [CR-CALIBRATION](/Users/sam/projects/triplex-db-2/lab/acceptance/ACCEPTANCE.md:544) fails closed on missing coverage. Add valid positive evaluator fixtures too: an evaluator returning OPEN unconditionally passes the current negative-only catalog.

15. **Critical — NEW: non-dense positions lack a compatible cut contract.**  
    [P2X’s brief](/Users/sam/projects/triplex-db-2/lab/experiments/EXP-P2X-xtdb-commit-feed/BRIEF.md:22) proposes engine log offsets, while [O-REPLAY](/Users/sam/projects/triplex-db-2/lab/acceptance/ACCEPTANCE.md:667) requires consecutive nested logical positions. One engine transaction can contain several Triplex transacts; one engine offset cannot identify their interior cuts.

    **Change:** Specify engine-position/intra-transaction coordinates, atomic assignment to assertion metadata and subject CAS, aborted-offset accounting, and a high-water mark proving a **fully resolved prefix**, not merely the greatest observed ID. Add nested-cut, abort-gap, crash and resume falsifiers before comparative claims; unchanged44 alone is insufficient.

16. **Critical — NEW: watermark routing conflates reachability, exactness and availability.**  
    `w ≥ B.position` ignores epochs and does not prove that a current-only index can reconstruct B after advancing beyond it. Compose watermark eligibility explicitly with C1’s mapping, valid-time and exact-cut conditions.

    Waiting on a read does **not itself** violate non-blocking writers. But 250 ms exceeds P1’s 100 ms and P4’s 25 ms bars. More seriously, [ACK-after-current](/Users/sam/projects/triplex-db-2/lab/acceptance/ACCEPTANCE.md:1688) makes ACKs unavailable during GS.04b’s 60-second current-index outage.

    **Change:** Define full stream/epoch coordinates, prefix completeness, deadline-aware fallback, cross-language fallback accounting, and whether source commits continue without ACKs during that fault. Test bounded queues and recovery explicitly.

17. **Critical — NEW: erasure needs a second, current visibility frontier.**  
    An old-basis read can pass the watermark check against an index that has not received a newer erasure. Historical caches have the same problem. “Modulo erasure” currently names cursor/explain contracts but leaves C6 reproduction unqualified.

    **Change:** Require current erasure knowledge independently of the requested historical basis; invalidate old-basis caches; apply the exception to journal, raw/native and SDK contracts. Key-destruction evidence must prove every surviving protected copy is encrypted exclusively under the destroyed key—not merely that some key was deleted.

18. **Major — NEW: W0 authorship is permissible; self-selected workload coverage is the risk.**  
    The orchestrator may author W0 and provisional bars. Separate Python and TypeScript implementations are appropriate. However, [D01’s gates](/Users/sam/projects/triplex-db-2/lab/experiments/EXP-D01-world-definition/BRIEF.md:44) require self-review, not independent review of workload representativeness.

    **Change:** Independently freeze rule-trigger frequencies, release-change impact, dependency fanout and output cardinalities before comparisons. Otherwise 100k mostly no-op evaluations can satisfy the sweep bar.

19. **Major — NEW: forced mutations can destroy the fixed workload.**  
    [Ten percent of reads require intervening commits](/Users/sam/projects/triplex-db-2/lab/TARGETS.md:29). If each adds a write, faster readers generate more write load; candidates no longer receive the same trace.

    **Change:** Define a fixed mutation/cohort schedule, account for those commits explicitly, and prevent mutation demand from scaling with candidate throughput.

20. **Major — Old-scope audit: one unresolved numeric leak.**  
    No active 256-requests/s, 25.6-commands/s or 512-level acceptance bar remains; 10m/100m is correctly the measurement population. However, the pinned [G1-I64-01 vector](/Users/sam/projects/triplex-db-2/lab/acceptance/golden/g1-int64.json:21) still requires all lanes to commit signed-64 extremes. The O02 brief describes lane overrides, but GOLDEN_RULE compiles only ambiguity resolutions.

    **Change:** Compile explicit lane-specific command/query outcomes for these legacy vectors, retaining originals as audit evidence.

**NOT READY for generation-2 comparisons.** Minimum changes:

- Reconcile position coordinates, watermarks, fallback and outage/ACK semantics.
- Close writer-rejection and throughput-dependent mutation loopholes.
- Correct decimal widening and compile legacy-vector overrides.
- Extend erasure across C6 and current visibility frontiers.
- Gate domain comparisons on independently reviewed W0; correct GS.19 wording.