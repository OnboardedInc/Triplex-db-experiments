1. **Severity: critical — The rulings and binding obligations disagree.**  
   **Disputed:** `G4.neg.conflict-not-false-absence` requires a conflict outcome for “every case,” including equal duplicates; `G10.pkg.clean-consumer-slice` requires CLI support. [ACCEPTANCE]( /Users/sam/projects/triplex-db-2/lab/acceptance/ACCEPTANCE.md:732)  
   **Why:** Q8e/Q12 explicitly preserve equal duplicates as multiple supports; Q7 excludes the CLI from done. Both obsolete requirements remain in `obligations.json` and its generator. An evaluator cannot determine which authority wins.  
   **Change:** Apply every ruling to the generator, regenerate the artifacts, remove obsolete open-question language, and specify precedence. Add a consistency check covering all twelve rulings.

2. **Severity: major — Q1 exempts entire raw rows without identifying the replacement guarantees.**  
   **Disputed:** “Capability rows 4, 9, 13, 19, 23, 29 change from REQUIRED to KNOWN-LIMIT for the raw surface.” [RULINGS Q1](/Users/sam/projects/triplex-db-2/lab/acceptance/RULINGS.md:8)  
   **Why:** These rows span multiple engines, languages and numeric bands. QLever’s bounded numeric representation does not justify exempting XTDB scalar arithmetic. The handoff permits declared mappings, while preserving exact native functionality and original counterexamples. “Every supported fragment” also needs a fixed minimum coverage set. Otherwise unsupported operations can disappear from the advertised surface.  
   **Change:** Make exceptions per **engine/language/surface/operator/domain cell**. For each required operation, identify its exact mapped recipe and qualification obligation. Preserve original raw failures as diagnostics with unchanged expected answers; distinguish those from required passing recipes.

3. **Severity: critical — The executable load definition still permits the rate16 outcome Q2 rejects.**  
   **Disputed:** `readOfferRatePerSecond.hardFloor = 16`, writer floor `0.2`, and calibration choosing the highest passing step. [load-contract](/Users/sam/projects/triplex-db-2/lab/acceptance/load-contract.json:52)  
   **Why:** Q2 requires 230.4 reads/s and 25.6 commands/s at 256 clients, with explicit latency, visibility and recovery limits. The JSON still allows self-calibrated rates and deadlines up to 30 seconds. Recovery measures when the recovery window **starts**, rather than when service demonstrably recovers. Q4’s sparse 256-client smoke run remains explicitly “not required.”  
   **Change:** Encode Q2’s fixed bounds, define offered rates at every stress level, measure recovery achievement within 60 seconds, and add the sparse smoke obligation. Calibration may tighten these requirements or report failure.

4. **Severity: major — Q11 halves each language’s native workload while preserving separate qualification claims.**  
   **Disputed:** One XTDB run, “XTQL and SQL classes equally weighted.” [RULINGS Q11](/Users/sam/projects/triplex-db-2/lab/acceptance/RULINGS.md:23)  
   **Why:** Splitting the native classes halves each language’s offered demand compared with its standalone profile. Passing each tagged population does not establish that either language sustains the required workload independently. Planner, pool and cache behavior need not scale linearly. This lowers the per-language bar while claiming otherwise.  
   **Change:** Retain separate XTQL and SQL load acceptance runs. A mixed-language run can be an additional shared-foundation profile.

5. **Severity: critical — Recovery permits losing an irrevocably committed, unACKed command.**  
   **Disputed:** Recovery requires “every ACKed command” present and “every unACKed command” resolved; unknown outcomes may resolve “committed or absent.” [G7 recovery](/Users/sam/projects/triplex-db-2/lab/acceptance/ACCEPTANCE.md:899)  
   **Why:** PLAN C2 makes COMMIT fsync irrevocable. A crash immediately afterward, before apply or ACK, must eventually publish that command. Resolving it absent satisfies the current postconditions. The blanket requirement to inject every durable step does not fix this missing expected outcome.  
   **Change:** Bind expected outcomes to witnessed protocol transitions. Explicitly require fsynced groups to survive, retries before publication to return `CommitPending`/`Repairing`, and original success receipts only after publication.

6. **Severity: critical — Several C1–C7 invariants lack discriminating cases.**  
   **Disputed:** General publication, recovery, journal and scope obligations substitute for the concrete [PLAN contracts](/Users/sam/projects/triplex-db-2/lab/PLAN.md:140).  
   **Why:** The declared cases do not require:
   - C1: a partial entity excluded by an early filter but relevant to ordering, negation or aggregation; mapping-generation mismatch.
   - C3: an old broker resuming after replacement, unauthorized update routes, and administrative/rebuild operations attempted while fenced.
   - C4: writes to pending maintenance chunks, crash/resume with durable progress, and qualified-hatch behavior throughout `MAINTAINING`.
   - C6: direct `match`/Datalog audit of `:_tx/change` and `:_tx/changed-entity`, beyond unchanged44.
   - C7: production ownership mismatch refusal, distinct from shared-scope leakage.
   
   **Change:** Add a C1–C8 traceability table with named cases, observations and closure obligations. Preserve these cases even when broad end-state checks pass.

7. **Severity: critical — O-REPLAY assumes a false clock model and leaves outcome authority ambiguous.**  
   **Disputed:** “Instants non-decreasing in position order”; SUT receipts supply “outcome.” [O-REPLAY specification](/Users/sam/projects/triplex-db-2/lab/acceptance/ACCEPTANCE.md:167)  
   **Why:** PLAN C1 expressly says recorded timestamps are non-monotonic because runtimes supply their own clocks. The entity suite covers equal timestamps but omits decreasing timestamps. Receipt-provided outcomes also need a strict boundary: they may bind generated identities, but cannot determine which submitted commands the oracle considers valid or committed.  
   **Change:** Add decreasing-clock histories and implement R independently of P. Define position accounting for nested/internal transactions. Derive expected outcomes from captured command intent, ordering, preconditions and durable-decision evidence; compare receipt outcomes afterward.

8. **Severity: major — Some normative expected answers are wrong or unspecified.**  
   **Disputed:** “-0.0 preserved through + 0.0 and * -1”; Q8b/Q8d say “follow core.” [Numeric cases](/Users/sam/projects/triplex-db-2/lab/acceptance/ACCEPTANCE.md:366)  
   **Why:** Both stated negative-zero operations produce positive zero under the intended binary64 arithmetic. Core currently rejects integer AVG without explicit conversion ([compiler](/Users/sam/projects/triplex-db-2/packages/core/src/datalog/compiler.ts:1397)). `G1.schema.required` rejects any remaining violation, whereas existing enforcement rejects only new or worsened violations ([Constraint](/Users/sam/projects/triplex-db-2/packages/core/src/Constraint.ts:376)).  
   **Change:** Freeze explicit operation/type/error tables, including conversions, rounding, mixed-family comparisons, card-many ordering and preexisting violations. Source references can justify these tables; changing production behavior must not change expected answers automatically.

9. **Severity: major — The other oracle specifications do not cover their assigned claims.**  
   **Disputed:** O-SPEC is a type-witness oracle but qualifies runtime engine plans; O-OBS specifies cancellation observations but qualifies scale counts, resource envelopes and calibration. [Oracle definitions](/Users/sam/projects/triplex-db-2/lab/acceptance/ACCEPTANCE.md:147)  
   **Why:** Neither specification defines the necessary runtime verdicts. O-SHAPE references SQL/SPARQL semantics without resolving task-specific bag/set, grouping and unbound-value behavior. O-ERR still delegates unspecified outcomes. Type witnesses also need to reject accidental `any` and unrelated negative-test diagnostics.  
   **Change:** Define separate semantic, plan and observation protocols with explicit expected outputs, evidence fields and comparison rules. Require exact type assertions and diagnostic locations/codes. Implementations may follow later; their normative specifications cannot remain undefined at freeze.

10. **Severity: critical — The machine contract is mostly prose, with contradictory executable parameters.**  
    **Disputed:** Closure rules and `statusAlgorithm` are strings; generator validation primarily checks references. [build_contract.py](/Users/sam/projects/triplex-db-2/lab/acceptance/build_contract.py:758)  
    **Why:** Concrete contradictions already escape validation: `G10.cursor.stable` requires 10m performance under `P-TINY-CONC`; `G7.write.atomic` names CS-FAULT in its statement but selects only CS-WRITE; several CALIBRATE bounds lack CR-PERF; scale sample counts have no specified calibration procedure or minimum. A `status: PASS` cannot resolve these discrepancies mechanically.  
    **Change:** Define typed receipt/evidence schemas, selector semantics, threshold dependencies and rule evaluation. Validate statement/profile/case consistency, unresolved parameters and transitive contract hashes. Closure must recompute claims from retained evidence.

11. **Severity: major — Auxiliary evidence has no coherent validity path.**  
    **Disputed:** “Every receipt, every rule,” including V12 `runKind=acceptance`, while mutation and verifier receipts have different kinds; `L.calibration.frozen` closes through CR-LOAD. [Validity rules](/Users/sam/projects/triplex-db-2/lab/acceptance/ACCEPTANCE.md:232)  
    **Why:** Applying the rules literally excludes required auxiliary evidence and leaves calibration certification circular or undefined. CR-MUTANT-KILL also accepts any FAIL, including an unrelated startup failure.  
    **Change:** Define distinct validation rules for primary acceptance and referenced calibration, mutation and verifier evidence, with non-recursive dependencies. Require mutant execution to reach the targeted behavior and fail an identified semantic assertion.

12. **Severity: critical — Carry-forward reintroduces the final-acceptance loophole v1.1 closed.**  
    **Disputed:** §5.5 avoids repeating scale/load runs; §5.6 requires fresh execution only for G0, unchanged44 and native142. [Carry-forward](/Users/sam/projects/triplex-db-2/lab/acceptance/ACCEPTANCE.md:316)  
    **Why:** PLAN §1.7 requires every bound identity unchanged—including resource caps and enabled capabilities—and **nothing carried into final acceptance**. The acceptance contract omits identities and weakens that final requirement. Q10’s metric recomputation plus one arbitrary spot rerun also does not define independent semantic verification of every claimed obligation.  
    **Change:** Restore PLAN’s complete identity and fresh-final-run rules. Specify verifier coverage per obligation, including independent evaluation of retained answer bytes, fault outcomes and coverage; one shard cannot certify unrelated load profiles.

13. **Severity: critical — Target population counts can pass with trivial history and unqualified query inputs.**  
    **Disputed:** Retain whatever history dataset construction produces; packet co-residence means its plans are “qualified at target scale.” [Scale obligations](/Users/sam/projects/triplex-db-2/lab/acceptance/ACCEPTANCE.md:1290)  
    **Why:** Counts permit an almost entirely initial-state population. PLAN requires benchmark history depths and graph topologies; the benchmark specifies depths 1/3/10. A tiny packet scope beside 100m facts proves co-resident pressure, not target-scale query input or support cardinality. The ladder also references a correctness obligation defined only at 10m before admitting subsequent rungs.  
    **Change:** Freeze history-depth, topology/skew, correction and result-cardinality coverage. Parameterize correctness by rung. Keep co-residence as a separate diagnostic and qualify required query shapes against actual target-scale populations.

14. **Severity: major — Goal 8 can be green without useful reuse, and cost reporting lacks required budgets.**  
    **Disputed:** “Every reused derived result…”; maintenance/write amplification need only be recorded. [Goal 8](/Users/sam/projects/triplex-db-2/lab/acceptance/ACCEPTANCE.md:987)  
    **Why:** Recompute everything and the reuse condition becomes vacuous. Correct answers do not prove maintained supports were maintained. PLAN §7.4 requires frozen budgets and cumulative comparisons, but the acceptance directory contains no reference to `budgets.json`. Current metrics also omit explicit log/broker/verification accounting required by PLAN §1.5.  
    **Change:** Require positive reuse and incremental-maintenance witnesses with observable avoided work and invalidation. Bind frozen cost budgets and cumulative controls, including the complete application path.

15. **Severity: major — Typed errors can substitute for required historical functionality.**  
    **Disputed:** Requested bases may return “a typed error”; cursors after restart, release or rebuild may always fail with a typed reason. [Cursor compatibility](/Users/sam/projects/triplex-db-2/lab/acceptance/ACCEPTANCE.md:1169)  
    **Why:** This permits rejecting every old cursor after a routine rebuild, despite the planned exact-ledger continuation. B2’s generic refusal ban conflicts with these explicit alternatives.  
    **Change:** Enumerate transitions requiring successful continuation and the narrow circumstances permitting errors. Pin expected outcomes per case; an available retained cut cannot become unavailable merely because its projection changed.

16. **Severity: major — C8’s approved recursion strategy violates the language rule.**  
    **Disputed:** Host filtering/joining makes a task hybrid. [Language accounting](/Users/sam/projects/triplex-db-2/lab/acceptance/ACCEPTANCE.md:55)  
    **Why:** C8 explicitly uses TypeScript frontier expansion between native queries. Frontier deduplication and termination require processing returned data. The present wording can disqualify the approved implementation.  
    **Change:** Define permitted frontier control precisely, require native relational evaluation at a fixed cut, enforce round/row bounds, and include all host work in measured cost.

Before freezing 1.0.0, the minimum changes are:

- Compile all rulings into one consistent contract, with precise raw exceptions and fixed load requirements.
- Add C1–C8 falsifiers and transition-specific commit, maintenance and cursor outcomes.
- Freeze independent oracle semantics and mechanically evaluable evidence/closure schemas.
- Define complete scale/history/topology coverage, positive maintenance witnesses and cost budgets.
- Restore fresh final acceptance and explicit independent verifier coverage.

**Verdict: NOT READY TO FREEZE AS 1.0.0.**