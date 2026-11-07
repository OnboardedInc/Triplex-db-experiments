# Item6 D-lane cancellation/correctness research — independent peer

2026-11-01 UTC · **SCOPED SOURCE/THEORY CLOSURE; no P0/P1/P2 finding identified. ALL EMPIRICAL CHECKS UNRUN.**

## Disposition and exact scope

No concrete source-fact contradiction, wrong hand expectation, hidden acceptance claim or overbroad implementation requirement was identified in this frozen research lane. The12 obligations and12 HAND-ONLY specifications are coherent **as proposed project contracts**, not DuckDB guarantees already discharged. No additive erratum is required for this bounded correctness scope. Other heavy lanes/inter-lane consistency, implementation selection and any action/publication remain separately open. Item6 is preliminary;4.1/5 remain incomplete.

The reviewer did not author these item6 reports. All eight actual files were literally read; manifest/checksum metadata, six recorded file digests/sizes, manifest and checksum identities match, total51,748B. No implementation, tuple/fixture/generator, SQL script, protocol trace, execution plan or runtime was produced or evaluated.

## 1. Independent public-source checks at the selected pin

Only the already-readable D1–D4 files were independently retrieved at `d54cbbe3df17e8e5ce68312f483b4155836112aa`; no failed-file URL, mirror/version/transport replacement or tree read was used. These are focused text checks, not whole-file hashes, a complete implementation audit or evidence of installed/executed code.

- **D1:** Interrupt performs a conditional flag update, distinct from later throwing checks. Deadline polling's256 qualifying-call interval is not a work/row/time bound; blocking checks separately evaluate deadlines. Error invalidation depends on policy. The transaction wrapper rolls back its newly owned transaction on error, while an existing transaction may be invalidated. The explicit transaction-command path converts invalidated COMMIT to rollback and suppresses ordinary request interrupts after successful COMMIT. Destroy catches rollback exceptions. These findings support—not eliminate—the request/terminal/transaction/recovery distinction. [Pinned client implementation](https://raw.githubusercontent.com/duckdb/duckdb/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/main/client_context.cpp)
- **D2:** Header declarations/comments separate blocking retained completion, nonblocking submission, result ownership and abandonment. The report correctly does not treat these declarations as the unread implementations' terminal/cleanup proof. [Pinned header](https://raw.githubusercontent.com/duckdb/duckdb/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/include/duckdb/main/client_context.hpp)
- **D3:** Rollback catches/accumulates errors, can assign a rollback enum despite an exception, and throws accumulated failure; invalidated databases may be skipped. Persistent multi-database writes are restricted with system/temporary exceptions. A state enum therefore is not an undo acknowledgment or external-system atomicity proof. [Pinned meta-transaction source](https://raw.githubusercontent.com/duckdb/duckdb/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/transaction/meta_transaction.cpp)
- **D4:** Build/probe/scan tasks delegate work; the shown GetData loop may continue until output or completion and can delegate blocking. This justifies leaving unchecked-region coverage/bounds unclosed, not declaring engine cancellation absent. [Pinned hash join](https://raw.githubusercontent.com/duckdb/duckdb/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/execution/operator/join/physical_hash_join.cpp)

**Integration precision, not a new finding:** D1's word “ordinary” matters. The explicit interrupt-state suppression is not blanket deadline immunity; BlockingInterruptCheck still evaluates deadline expiry. Nor was every possible commit path proved to invoke suppression. Keep these source-path limits when integrating the lanes. No source bug or new cancellation mechanism is asserted.

## 2. Primary-theory checks and inference limits

Focused portions of all five cited readable papers were independently opened successfully. Their stated concepts support the report's conditional inferences:

- Pending invocations may already have taken effect without a response; linearizability is not an implementation progress/recovery guarantee. [Herlihy–Wing](https://www.cs.cmu.edu/~wing/publications/HerlihyWing90.pdf)
- Indeterminate transactions admit multiple compatible histories; attribution/traceability assumptions matter. This does not make a generic final snapshot a complete recovery oracle. [Elle](https://www.vldb.org/pvldb/vol14/p268-alvaro.pdf)
- Pivot containment only partially validates a result; cardinality/order and general transaction/concurrency correctness are outside that oracle's guarantees. [PQS](https://www.usenix.org/system/files/osdi20-rigger.pdf)
- The query marker is checked after a morsel finishes, permitting cooperative cleanup; this does not bound arbitrary inner work or establish a project wall-time theorem. [Morsel-driven parallelism, §3.2](https://ir.cwi.nl/pub/22547/22547B.pdf)
- Source/frontier morsels are distinct granularities; the displayed paper identifies arXiv v1. Its graph-system model is not the unread pinned DuckDB recursive implementation. [Recursive-query paper](https://arxiv.org/pdf/2508.19379)

The project conclusions are labeled inferences/requirements rather than transferring paper guarantees, artifacts, workloads, benchmark hardware/performance or a checker run into this project. No literature example was executed. ARIES full text was not opened/retried and no ARIES recovery theorem or DuckDB-uses-ARIES claim is needed. D5's declared public2.0 documentation context was not independently refetched here and remains explicitly nonnormative for the pin/default/installed version.

## 3. All12 hand specifications reconciled

This is mathematical/manual review of the supplied specifications, **not generated input, an observed schedule or a test campaign**.

| Spec | Independent check / required conditional reading |
|---|---|
|H01|Two a-key R witnesses times two a-key S witnesses give four distinct joined pairs; the full2×3 Cartesian domain is six. Cap5 rejects that declared domain, cap6 admits only its logical size. Five16-byte logical input rows plus four output rows give80+64=144, before other declared charges. These are not hash-probe or physical-engine counters.|
|H02|Known NOT_SUBMITTED plus cancellation-before-submission supports no submitted query/effects; unknown submission cannot inherit that zero-work conclusion.|
|H03|A private two-row correct prefix can be discarded after acknowledged cancellation/cleanup; an already accepted ordinary prefix would violate the selected atomic-publication contract despite rollback. Consumed work is not erased.|
|H04|Visited-set frontiers are{a},{b,c},{d},empty. Complete zero-length-inclusive reachability is exactly(a,a),(a,b),(a,c),(a,d); duplicate d derivation and d→b add no row. The prospective first frontier has two nodes, exceeding cap1.|
|H05|Under the explicitly declared independent autocommit history, acknowledged cancellation/rollback of the second operation preserves base and u101, excluding v202. No selected default policy is assumed.|
|H06|Under whole-transaction rollback both tentative writes disappear, leaving B. The alternative statement-only policy can leave u101 private/ACTIVE, not generically recovered/reusable. Policy is intentionally unresolved before judging.|
|H07|An atomic two-write operation leaves B after winning acknowledged cancellation/rollback or B plus both values after winning acknowledged commit; singleton committed state is excluded by that premise. Missing acknowledgment preserves indeterminacy, not permission to replay.|
|H08|Terminal query cancellation plus failed/missing recovery does not establish health. UNKNOWN or the selected quarantine label is coherent; RESTART_REQUIRED is not a restart action.|
|H09|Invocation+cancel request without a terminal response remains in-flight/unknown, not cancelled, complete failure/success or zero work.|
|H10|A context-wide flag/reset alone cannot establish that an outstanding q1 canceller cannot later affect q2. The proposed ownership/epoch obligation closes that reasoning gap without prescribing threads or a new action.|
|H11|A proven pre-submission ordinary admission failure is not an engine cancellation acknowledgment. Carrier/runtime failure after possible submission needs separate terminal/recovery evidence.|
|H12|The complete four-pair set, acknowledged permitted transaction outcome and one public acceptance are distinct conditions; no prefix, omitted/extra row, duplicate publication or unknown outcome satisfies them. This is not general query/schedule correctness.|

Unique sentinel values improve these finite distinctions but are not a universal exactly-once-application proof: idempotent repeats can still require history/outcome evidence. The packet does not claim otherwise or turn these tiny cases into complete engine verification.

## 4. Obligation scope and remaining gaps

All A1–A12 were reviewed. A1/A4 fix the chosen API, owned store scope and transaction policy before interpreting effects. A2/A3/A10/A11 separate cancel epochs, terminal ownership, irreversible commit, publication and reuse. A5/A12 keep public result/failure evidence distinct and bounded. A6–A9 define conservative logical admission/accounting and actual checkpoint coverage rather than treating estimates, vectors/frontiers, flag polling or elapsed configuration as proven physical bounds.

These are legitimate **proposed acceptance conditions**, not evidence the selected engine presently satisfies them. They do not require every unavailable ancillary source or a universal OS/security/capacity/restart proof. A design excluding a phase need not claim its bound; a design admitting opaque/large joins, recursion, spilling or materialization must not silently borrow a bound from these tiny examples. No engine allocation/RSS/CPU/latency or healthy connection was observed.

The13 explicitly unavailable pinned files and the one ARIES paper remain unchecked. None was requested again. Default invalidation/auto-rollback policy, exact chosen C API/binding, full result-owner/terminal cleanup and delegated executor/recursive checkpoint coverage remain relevant selected-design gaps, **not absence proofs**. This review closes no such implementation obligation and offers no execution plan to fill them.

The comparison with earlier graph/transport/semantic/native evidence does not broaden any pass or relabel a nonpass/unknown. A correct semantic projection, EOF/process exit or failure envelope cannot supply missing transaction history/recovery evidence. No old/paused source or result packet was reopened to make that comparison.

## 5. Exact input identity / terminal handoff

All below are in `.agent-logs/goal6-cancellation-correctness-primary/research-001/`:

| File | Bytes | SHA-256 |
|---|---:|---|
|00-PROGRESS-BEFORE.md|1008|`f139ac3a6706fe54bbe2c746e6a4fc28764cc2d30728af141af9516ca89ff546`|
|10-RESEARCH.md|11236|`6c5c455d6e9450426c04b0230c0c60a4eca1c65a3db2e34edb7d7467ec7cadd8`|
|20-ACCEPTANCE-OBLIGATIONS.md|10711|`28f534bb92ef3a15bd133aa97fe31480a13e0a1d4eb60a021f44609d897d70bd`|
|30-HAND-FIXTURE-SPECS.md|8655|`ba44e1d2b12e6322f47a56335dca0b71d0b267aad060e9fcad7477dc8e782d8c`|
|40-SOURCE-LEDGER.md|9092|`4619882b9b87de39d67744a8f07ef382034438d8a82040debd62f561d24e4a25`|
|70-PROGRESS-AFTER.md|1407|`5e764fd5471757657aa404291be2b6e3d131d88f9ccb1854c4f572b56bbfa088`|
|MANIFEST.json|9031|`783e05b3296ae5f0617571afa8daeafe101e64918aad2ec2e46b468057f365f8`|
|SHA256SUMS|608|`7f51c764c8392a306d1ed06ec6c13a0b1d54d1205c198ff038d8ed93ee58edfa`|

Only new local peer review/progress/manifest/hash text was written. No original change, implementation, import/parser/AST/protocol/feed/fixture generation/oracle/test/compiler/native/host/database/runtime, diagnostic, system/environment/SDK/process/path/clock/capacity observation, old/paused payload, Git/Page write, deletion, Codex or retry occurred. Public reads used the permitted successful primary URLs; no new retrieval failed and no unchecked failed source was reopened.

**Final:** scoped correctness-research closure only; no P0/P1/P2 finding or required erratum identified. Source/implementation selection, other two heavy lanes and their eventual combined review remain open. All empirical checks remain UNRUN, all STOP/HOLD/no-deletion restrictions unchanged, and no implementation/action/publication authority follows.
