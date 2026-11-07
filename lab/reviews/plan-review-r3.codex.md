I read [PLAN v1](/Users/sam/projects/triplex-db-2/lab/PLAN.md) in full. These statuses assess the written execution contract; **RESOLVED does not mean experimentally proven**.

**Preimplementation checklist**

| Round-2 requirement | Status | PLAN coverage and remaining gap |
|---|---|---|
| Reviewed acceptance matrix, independent expectations, integrated done predicate | **PARTIAL** | §1, §7.5, §9 establish them. EXP-R01 still has no acceptance/golden-vector dependency; receipt carry-forward has an unsafe exception. |
| Complete durable-decision, fencing, replay and publication protocol | **PARTIAL** | C2/C3/C8 resolve the principal architecture questions. C2.7 permits successful retry receipts without requiring publication. |
| Full R/P/V eligibility and query-wide completeness | **PARTIAL** | C1 establishes query-wide fallback, but introduces an unproven explicit-R shortcut contradicting §3.2.3. |
| Frozen conflict, journal, raw-dataset and scope contracts | **PARTIAL** | C5/C6/C7 resolve conflicts, journal compatibility and scope ownership. C4 exposes raw results that cannot correspond to a coherent basis. |
| Bounded maintenance, atomic admission, cumulative budgets, retained preimages | **PARTIAL** | §7.4/§7.5/§8 resolve budgets, admission and evidence. C4 still needs coherent raw-read behavior and protection against stale maintenance chunks. |

**Round-2 findings 1–14**

| # | Status | Resolving section or precise remaining gap |
|---|---|---|
| 1. Durable decision/group semantics | **PARTIAL** | C2.1–2 establish irrevocable commitment and staged validation. C2.7’s retry success must obey C2.4’s publication requirement. |
| 2. Fence every mutator | **RESOLVED** | C3 covers modifying routes, credentials and epochs; C8 removes read-side mutations. C3 rejects two-query consistency certificates. |
| 3. Replay/checkpoint subsystem | **RESOLVED** | C2.8 specifies versioned replay, N-Quads checkpoints, manifests, retention and generation selection; §8 counts storage overlap. |
| 4. Complete temporal eligibility | **PARTIAL** | C1 covers the axes but permits the unsafe explicit-R threshold described below. |
| 5. Publication versus verification | **RESOLVED** | C2.1/4/5 distinguish durable commitment, snapshot publication and post-publication verification. |
| 6. Large temporal boundaries | **PARTIAL** | C4 bounds operations and admission, but raw queries observe intermediate chunks; interleaved application commits lack an explicit chunk-generation invariant. |
| 7. Dataset/scope ownership | **RESOLVED** | C7 binds ownership, distinguishes domain queries from unrestricted inspection, and retains shared-profile collision tests. |
| 8. Conflict semantics | **RESOLVED** | C5 distinguishes equal supports, assertion-count enforcement, repository errors and the non-equivalent raw convenience shape. |
| 9. Whole-query completeness | **RESOLVED** | C1 requires eligibility before filtering, ordering, aggregation and pagination; mixed-branch optimization needs separate proof. |
| 10. Journal compatibility | **RESOLVED** | C6 preserves logical facts and API behavior; storage remains unchanged until equivalent synthesis passes direct audit tests. |
| 11. Independent expectations first | **PARTIAL** | §9 puts G01 before F03/F04 and includes complete vertical slices. EXP-R01 nevertheless implements the planner/repository/writer with dependency “none.” |
| 12. Budgets/resource enforcement | **RESOLVED** | §7.4 separates predictions from frozen cumulative allowances; §8 requires atomic reservations and proven cleanup. |
| 13. Reconstructable evidence | **RESOLVED** | §7.5 binds executed inputs and retains actual preimages, manifests and raw outcomes. |
| 14. Integrated completion | **PARTIAL** | §1 supplies the required conjunction, but §1.7 permits carry-forward based only on unchanged imported files. |

**Remaining and newly introduced problems**

1. **Severity: critical — C1 reintroduces an incorrect recorded-time optimization.**

   **Disputed:** “R absent, or R at or after the recorded time of the newest published position.” ([C1](/Users/sam/projects/triplex-db-2/lab/PLAN.md:146))

   Commit order does not establish monotonic recorded timestamps. Separate runtimes can supply different deterministic clocks, and transaction timestamps come directly from their runtime clock. ([Runtime](/Users/sam/projects/triplex-db-2/packages/core/src/runtime/Runtime.ts:65), [transaction timestamp](/Users/sam/projects/triplex-db-2/packages/core/src/store/TriplesLive.ts:308))

   Example: P1 creates entity A at R=2000; P2 creates B at R=1000. A read at R=1500 passes C1’s threshold against P2 but must exclude A. The head projection includes A.

   **Change:** Initially require **R absent**, consistently with §3.2.3. Any explicit-R optimization needs its own equivalence proof and falsifier; the newest position’s timestamp is insufficient.

2. **Severity: critical — C4’s raw maintenance state is not a valid snapshot.**

   **Disputed:** During bounded maintenance, “raw queries see the in-progress state and can read the marker.” ([C4](/Users/sam/projects/triplex-db-2/lab/PLAN.md:205))

   Suppose two facts share the same expiry boundary. Between deletion chunks, one remains and the other disappears. That result may match **no** logical P/V basis. Optional marker inspection does not satisfy §1’s same-basis promise or C7’s current-state claim.

   Application commits interleaved between chunks also require an explicit invariant preventing a previously prepared chunk from deleting a newly supported value.

   **Change:** The qualified raw-query path must refuse normal results during MAINTAINING or use an exact coherent dataset. Bare inspection may remain explicitly unqualified. Bind chunks to their target boundary, source/generation and mapping; revalidate or recompute them after intervening writes. Add concurrent-write and crash/resume falsifiers.

3. **Severity: critical — Receipt carry-forward can manufacture integrated completion.**

   **Disputed:** A receipt carries forward when “none of the files it imported changed.” ([§1.7](/Users/sam/projects/triplex-db-2/lab/PLAN.md:42))

   Engine image/configuration, resource caps, fixture contents, capabilities and acceptance rules can change without changing imported application files. An 8-GiB load receipt could consequently be carried into a 2-GiB profile despite never executing there.

   **Change:** Require every relevant bound identity to remain unchanged, supported by an explicit dependency/applicability check. Require fresh final acceptance for the selected integrated runtime profile. Unchanged imported files alone cannot authorize transfer.

4. **Severity: critical — C2’s retry rule bypasses its ACK rule.**

   **Disputed:** A retry finds the durable claim and “returns the original receipt.” ([C2.7](/Users/sam/projects/triplex-db-2/lab/PLAN.md:175))

   Crash after COMMIT fsync but before application: the durable claim exists, yet publication has not occurred. Returning an ordinary successful receipt now contradicts C2.4, which permits ACK only after publication.

   **Change:** Distinguish durably committed from published. A successful retry must establish publication; otherwise return the declared pending/repairing/unknown outcome. Include this exact crash-and-retry case in F05.

5. **Severity: major — EXP-R01 bypasses the promised contract-first dependency.**

   **Disputed:** “projection spec, planner, repository and writer on KV” depends on “none.” ([§9](/Users/sam/projects/triplex-db-2/lab/PLAN.md:421))

   This exceeds the early type skeleton accepted in round2.

   **Change:** Make full EXP-R01 depend on reviewed A01 and the applicable reviewed G01 vectors. An earlier task may define an interface skeleton only.

**Final verdict: NOT READY.**

The minimal changes are:

- Remove C1’s unproven explicit-R shortcut.
- Make maintenance reads coherent and maintenance chunks safe across intervening commits.
- Gate successful retry receipts on publication.
- Tighten receipt applicability beyond imported-file hashes.
- Add the contract/vector dependencies to full EXP-R01.

Once those land, **READY TO EXECUTE as a gated experimental program where failed falsifiers block dependents**.