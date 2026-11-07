# ITEM6 cross-lane research synthesis — draft 001

2026-11-01 UTC · **AUTHOR SYNTHESIS ONLY. NOT A SELECTED CONTRACT, IMPLEMENTATION, EXECUTION PLAN OR OVERALL ACCEPTANCE. ALL ITEM6 EMPIRICAL CHECKS UNRUN.**

## Status and evidence

Three new heavy lanes are frozen: **A** exact-pin unstable DuckDB C APIv2 cancellation/error/ownership; **B** resource/algorithm theory; **D** cancellation/recovery and adversarial-oracle correctness. This synthesis author also authored D: **this is not an independent D review**. C's separate independent reviews close the bounded D/B research scopes. A's additive erratum and B's frozen independent delta close A's two source/citation precision findings; the coordinator reports all three primary source-peer scopes closed. A's other qualifications, including incomplete public-source-content rehash, remain. **Independent synthesis review, selected contract and implementation remain OPEN; no overall acceptance follows.** Older 4/4.1/5 remain incomplete.

Only named frozen research narratives/metadata, C reviews, A's additive erratum/provenance and B's independent erratum delta were used; no raw acquisition payload or new public source was opened. Full paths/hashes are in `SOURCE-IDENTITIES.json`. Public citations carried below come from those frozen texts, not a new primary-source acquisition/audit by this synthesis. A's initial peer is not newly re-audited here; its surviving qualifications are carried through the delta and coordinator handoff.

**No new material cross-lane contradiction was identified.** The lanes expose compatible constraints and unresolved interface choices; agreement among reports does not discharge those choices.

## 1. Joint result: distinguish three layers, not one host setting

| Research layer | Consolidated finding | What remains unselected/unproved |
|---|---|---|
|Admission/ownership|A callback may already receive a materialized chunk/Value; local reservations can govern its next private copy/index/string construction, not earlier SQL LIST/vector/constant construction. B requires all coexisting old/new/scratch owners and retained capacities in the logical ledger.|The upstream producer/admission boundary, borrowed/owned/transfer scope, quota weights and complete coverage. No callback-only solution to upstream LIST admission is established.|
|Work/cancellation|Output size, successful insertions and live bytes do not bound rejected candidates or cumulative work. Synchronous callbacks and bridge loops can run between engine checks; a public callback-local poll is not verified on A's inspected surface.|A bounded primitive/cost model, a supported local observation mechanism or bounded unchecked regions, ownership/delivery, error precedence and deadline semantics. No API-wide polling impossibility is asserted.|
|Publication/recovery|Cancel request, query termination, transaction disposition, public result and connection/store health are distinct. SQL rollback cannot retract ordinary chunks already consumed or automatically undo foreign userdata/private-store mutations.|Commit/publication/consumer boundary, recovery/epoch evidence, and healthy-versus-restart-required conditions. Unknown is not zero work, rollback success or healthy reuse.|

Host memory/deadline settings are contextual controls, not complete private-owner accounting or cancellation/health proof. API metadata at `d54cbbe3df17e8e5ce68312f483b4155836112aa` declares v2.0.0; that is source identity, not an installed version or future ABI-stability guarantee. Legacy unprefixed C API documentation is not a substitute for the v2 surface.

## 2. Source-supported integration boundaries — scoped source peers closed

A reports a same-connection cross-thread interrupt request and distinct stepped-result versus fetch/drain cancellation channels. Generation/exception classification does not uniquely explain every race or acknowledge callback termination. Scalar/table bridges call callbacks synchronously and inspect their borrowed error slot after return; an empty-batch table loop can remain inside the bridge. Borrowed callback context is not an owned connection handle or permission for reentrancy/private-ABI escape. [Frozen A, §§2–3; pinned connection contract](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/api_spec/v2/connection/connection.yaml).

The engine's **256** deadline throttle uses a persistent function-local `thread_local` counter, incremented only when the deadline-valid short-circuit path reaches it after the interrupt-state check. That path invokes a blocking check when the incremented counter is divisible by 256; it is not a reset-per-query 256-unit work or time allowance. Direct blocking checks are distinct. C's D review further preserves that ordinary-interrupt suppression on an explicit successful commit path is **not blanket deadline immunity or proof about every commit path**. No callback-local or wall-time guarantee follows. [Frozen A §3.2 with E2; pinned check implementation](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/main/client_context.cpp#L1100-L1120).

Ownership is part of both admission and cancellation correctness:

- Fetched materialized or streamed chunks are caller-owned; their vector views remain borrowed. Destroying the result does not retract a previously fetched/observed prefix.
- Collection append can copy/flatten. Clear-retains-capacity, reset-row-memory, and borrowed scan lifetime are different; data may expire at the same worker's next scan or worker/collection destruction even if a chunk handle remains.
- Vector views/references can alias storage; flattening a child may invalidate earlier aliases. Extending lifetime by copying creates a new charged construction, not free ownership.
- Authoritative error codes, borrowed callback slots and optional/stale/unavailable detail are different. A's null-setter spec/implementation mismatch and potentially allocating text setter remain caveats, not a selected error policy or observed failure.

**Additive citation precision, independently delta-reviewed:** vector.yaml lines 512–527 support vector-reference semantics, not arena lifetime. E1 separately cites first-use arena allocation, borrowed ownership and expiry on flattening/reallocation/destruction at vector.yaml 698–708; common.yaml 130–135 binds allocated bytes to arena lifetime. These are retained source contracts, not observed project allocations. A originals and the initial peer remain frozen historical texts; the additive delta closes P2-01/P2-02 only within source/citation scope. [Vector reference](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/api_spec/v2/vector/vector.yaml#L512-L527), [arena](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/api_spec/v2/vector/vector.yaml#L698-L708), [arena bytes](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/api_spec/v2/common/common.yaml#L130-L135).

## 3. Conditional mathematics — not selected algorithms or quotas

B's peer-checked bounds retain their premises:

- **Output ≠ intermediate ≠ candidate work.** A set-join fractional-cover ceiling does not bound an arbitrary binary intermediate or rejected-pair loop. Index/preparation and variable-byte comparison costs cannot disappear behind a final-cardinality theorem. No join algorithm is selected.
- **Finite truth ≠ finite small execution.** `G=sum D^arity` bounds novel facts only under fixed finite typed domain, safe/function-free monotone rules, no fresh values and complete fact identity. `G(E−1)` additionally assumes a bounded window and fixed endpoint-preserving cells. Neither caps failed candidates, provenance, frontier copies or fresh arithmetic/path/endpoint growth; these are not selected store restrictions.
- **Held reservation ≠ committed payload ≠ physical memory.** Live/high-water includes admitted pending construction and simultaneous old+new+scratch owners. B's resize counterexample reaches 1,100 logical units despite a 700-unit final state; those numbers illustrate the model, not proposed quotas. Releases cannot refund cumulative work, and zero ledger charge does not prove health or total host coverage.
- **Formatting remains conditional.** Supplementary Unicode scalars may use **two** `\uXXXX` escapes (12 ASCII bytes). B's loose valid-UTF8 `6B+2` string ceiling remains sound; names/framing/copies and formatter behavior remain separate. This qualification corrects one-escape wording without changing frozen B or choosing JSON. [C/B note; RFC8259 §7](https://www.rfc-editor.org/rfc/rfc8259.txt).
- **Poll distance ≠ latency.** `k+u` is conditional work-distance for an already-visible request, where u is the total opaque/unpolled work across the interval. Time additionally requires bounded unit/opaque/check/cleanup duration and delivery/scheduling premises; none are measured here.

C's finite-grounding citation correction is retained: in the exact semiring-paper v5, use **§2.3 for finite-domain ground atoms and §4.3 for program grounding**, not §2.4. No arbitrary weighted/arithmetic convergence is inferred. [Frozen C/B note; exact v5 paper](https://arxiv.org/pdf/2105.14435v5).

## 4. Recovery/history and no-partial-success

D and C distinguish not-submitted, in-flight/unknown, cancelled, complete ordinary failure and complete success, with separate transaction/publication/health evidence. A's API observations add channel/ownership detail; they do not replace that evidence model. Unique sentinels and tiny hand expectations can expose wrong commit/rollback/publication histories, not certify every schedule or exactly-once application.

A final poll observes only requests already seen at that poll. **A request arriving after it but before later commit/publication remains a race requiring a future contract.** A late request cannot erase accepted output or justify relabeling irreversible commit as rollback. Missing terminal/commit/rollback acknowledgment remains unknown; a flag, enum, destructor, process exit or generic health ping is not a combined oracle. Restart-required is a possible explicit quarantine marker, not permission to restart/retry/delete.

Materialized private staging can move project-computation failures before publication, but does not by itself guarantee later host conversion or stream delivery. A whole owned result versus streamed tentative/terminal semantics remains a choice; no consumer/cancel protocol or error precedence is selected. Prior graph/semantic/frame source reviews and native/graph nonpasses do not establish ITEM6 runtime, transaction, health or performance guarantees.

## 5. Unmeasured performance opportunities — hypotheses only

- Fewer deep copies or bounded zero-copy views may reduce construction, if owner/alias/scan/arena lifetimes and simultaneous retained charges are proved.
- Canonical payload sharing and paid/reusable indexes may reduce repeated byte/key work, without weakening typed identity or omitting capacity/build costs.
- More selective/index-aware joins or restricted semi-naive/delta evaluation may reduce candidates, if the chosen semantics, preparation costs and proof model support them; no algorithm is chosen.
- Incremental reservation and bounded output/work batches may avoid eager worst-case allocation, while larger batches can reduce dispatch but increase unchecked work and retention.
- Polling frequency and bounded helper granularity may trade overhead for responsiveness; no quantum, numerical quota, tuning value, latency claim or benchmark is proposed.

## 6. Gaps and next review boundary

A's bounded surface search is not complete generated-header/API/planner/cleanup coverage, and its peer's incomplete public-source-content-rehash qualification survives the erratum closure. B's explicit DataFusion version and pinned include-tree failures remain stopped; its successful latest-page observation is limited, and C's supplementary memory-article open also failed. D's thirteen unavailable pinned reads and ARIES full-text timeout remain its historical gaps. A's later separately authorized source acquisitions can add attributed evidence without retroactively making those failed reads successful or closing every D obligation. No failed source was reacquired for this synthesis.

Future choices remain open: exact upstream admission boundary, ownership/quota scope, logical units/weights, rule/domain/temporal restrictions, algorithm/index preparation, bounded opaque regions, supported callback participation, error precedence, publication/cancellation linearization, rollback/private-store health and evidence fields. These are research questions, **not a selected source contract or execution plan**; no universally complete machine/capacity/security/restart proof is demanded.

**Freeze disposition:** honest author draft for independent synthesis peer. Primary A/B/D source-peer scopes are closed at their stated limits; synthesis review, design selection and overall acceptance remain open. All ITEM6 empirical stages are UNRUN. No implementation, publication, action, machine observation or old/stopped/paused access is authorized or performed here.
