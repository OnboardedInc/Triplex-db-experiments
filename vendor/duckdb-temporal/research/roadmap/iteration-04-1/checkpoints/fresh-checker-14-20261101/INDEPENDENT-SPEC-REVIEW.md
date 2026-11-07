# S41-CHECKER-14 — independent specification/source review

2026-11-01 UTC · **TEXT/SOURCE/HAND MATHEMATICS ONLY; ALL FOURTEEN CASES UNRUN**

## Disposition and useful precision

**No blocking mathematical or expected-status discrepancy found. No definite product-source defect identified in the inspected bodies.** All proposed graphs, canonical IDs, two legal non-BFS controls and eight invalid certificates reconcile with selected C01–C14. The 14-call/26-argument-value ledger is correct. This is not source implementation, fixture selection, import/parser/runtime/formal verification or action authority.

Before later source/record selection, carry forward the exact-type post-call value relation and its limited observational meaning in §5. Ordinary `==` is not sufficient. Two minor unit-label clarifications leave every proposed number and case unchanged: rejected 27/28 totals include the standalone strict-edge scalar; 105 raw examinations is an **admission-only** bound, not a bound on all graph passes.

## 1. Authority and actual read boundary

The four frozen local inputs independently matched their supplied SHA256s: research `017db424…`, specification `f1c52f29…`, source identities `ee4a8aba…`, handoff `089756e2…`. Read all four.

Through the specified Contributor GitHub connection, literally read eleven saved project files at explicit refs: product README/producer/checker/initializer and oracle README/oracle/source-suite at `035e2ab51924f93bacd5fa730c44a85a1e8b892a`; selected README/DECISION/CONTRACT/PROOF-AND-COST at `2790d1b811a156a89c790b3675b155a8dba1bfb0`. Every returned blob identity matched SOURCE-IDENTITIES. Full bodies were read in bounded slices, not imported, parsed or executed. The separate saved primary-research README and other linked payloads were not needed/read. Exact identities/scopes are in `MANIFEST.json`.

Expectations below were derived from the contract and hand proofs, not producer returns, producer helper answers or oracle execution. Observed earlier smoke/semantic counts remain coordinator-supplied separate context; this review did not reopen their results or broaden them.

## 2. Both complete legal certificates independently verified

For A, lexicographic (tail,head,kind-code) order gives exactly the eight displayed IDs. For R, positive 0→1 precedes negative 0→1, inserting strict ID1 and shifting all subsequent IDs exactly as displayed. No raw-position/producer normalization result is needed.

Both partitions are the sorted single block `[0,1,2,3]`, implicit root0, with sole schedule `[0]`. The out-tree is 0→1→2→3, using A IDs0/4/6 or R IDs0/5/7. Its depths satisfy 1=0+1, 2=1+1, 3=2+1. The in-tree is 1→2→3→0, using A IDs4/6/7 or R IDs5/7/8, with equations 3=2+1, 2=1+1, 1=0+1. Both root parents are null and both root depths exact integer0; nonroot depths lie in1…3. The shortcuts 0→2/3 and 1/2→0 show deliberately non-BFS witnesses in both directions.

The two trees prove mutual reachability through root0. Full coverage and the only schedule establish the single exact SCC; there are no cross edges. Under C07/C12 any such valid trees are accepted, so comparing their whole certificate values to producer-chosen BFS trees would be wrong.

A is positive only, hence canonical verdict STRATIFIABLE with unique least component level `[0]`. R's only strict edge is canonical ID1, 0→1. For target0, every other vertex has a direct edge to0, giving exactly `[0,1,1,1]`. Root-outgoing inequalities hold and every nonroot has a tight direct return: least-tight IDs4,6,8 respectively. From start1, unique shortest return is `[4]`; its greedy ID rule is therefore also canonical. The longer auxiliary in-tree is irrelevant to shortest-return canonicality. A/R have exactly9/11 dictionary keys and all schema/family fields match C06.

## 3. Every proposed ordinary classification

| ID | Exact return | Independent reason |
|---|---|---|
|T01|VALID_STRATIFIABLE|A satisfies common evidence and least level0; BFS is not required.|
|T02|VALID_UNSTRATIFIABLE|R satisfies common evidence and canonical strict/path/distance fields despite long auxiliary trees.|
|T03|INVALID_CERTIFICATE|`in_depth[2]=[]` violates exact-int admission before vertex1 may use that neighbor depth; no escaping arithmetic exception is a pass.|
|T04|INVALID_CERTIFICATE|Out child2 claims1 but parent1 has1, requiring2.|
|T05|INVALID_CERTIFICATE|A ID5 is2→0, not an out-parent edge ending at2.|
|T06|INVALID_CERTIFICATE|Boolean depth is not an exact int.|
|T07|INVALID_CERTIFICATE|Off-path vertex2 has direct2→0: claimed2 violates2≤1+0.|
|T08|INVALID_CERTIFICATE|R IDs5/6 form real1→2→0 and realize claimed2, but direct ID4 forces distance≤1.|
|T09|INVALID_CERTIFICATE|Strict ID0 is positive and differs from required minimum1.|
|T10|INVALID_CERTIFICATE|Accepted-family shape/common trees are valid, but R contains an internal strict edge; never repair to the opposite valid verdict.|
|T11|INVALID_INPUT|Analyze rejects exact Boolean n before graph-semantic work.|
|T12|INVALID_INPUT|Same malformed graph wins before interpreting the empty-list certificate.|
|T13|INVALID_INPUT|The tenth `mystery` kind makes the whole graph malformed despite the earlier valid strict-cycle prefix.|
|T14|INVALID_INPUT|That complete graph-admission failure precedes malformed certificate interpretation.|

Checker scalar-before-cross-slot, exact-type, graph-before-evidence, all-raw-rank and all-selected-distance/tight-edge bodies agree with these requirements. This is a static reconciliation, not fourteen observed returns.

## 4. Ledger, independence and bounds

T01–T10 plus T12/T14 give12 checker calls; T11/T13 give2 analyze calls. Conditional completion is14 attempts/ordinary returns/classification checks:2 valid,8 invalid-certificate,4 invalid-input. Separate argument-value comparisons are12×2+2×1=26; combined classification/value checks would be40 checks, **not40 API calls**. Fresh argument values, independent snapshots, pre-invocation IDs and explicit exceptional/unassessed/incomplete/mismatch/source-error treatment remain necessary. No partial or zero-call green result is justified.

The two controls and all bad certificates are fully hand-specified. No reference/oracle/producer call or product-private helper is needed to construct expected answers. The saved broad certificate factory creates57 cases, including reference construction, before its public loop; the malformed factory creates31 graphs and its entrypoint calls both APIs62 times. Reading/hand-counting those sources confirmed there is no selector for this fourteen-case subset. Calling/filtering those factories or broad entrypoints would violate the proposal. A genuinely new bounded source/ledger/output entry must be separately authorized and reviewed.

For five A/five R checker calls, admission visits at most5×8+5×9=85 records. The suffix graph is passed twice, adding≤20; Boolean n rejects before records. Thus admission-only bounds105/210/105 for records/endpoints/kinds are correct. The ten admitted graphs alone normalize:≤85 sorted triples,75 adjacent duplicate comparisons and85 canonical emissions. Sorting comparisons are extra. Rank, accepted recurrence and rejected-distance raw passes are separate; **105 is not a whole-invocation record-visit ceiling**.

Per-certificate bounds4 members/16 parent-depth slots/6 nonnull reference-equations and aggregate40/160/60 are safe; invalid prefixes can stop earlier. k=1 permits at most one initial checker heap entry, initialized by heapify, with no later cross-edge admission; do not call this one literal heappush. Conservative whole-boundary logical work retains **O(n+m log(m+1)+k log(k+1))**, and storage O(n+m+d), under the stated validated indexed/comparison model. Isolated n, raw duplicates, sorting/heap and all-raw scans are not free. No Python object-byte, stack, allocator, runtime or capacity prediction follows.

## 5. Precise carry-forward conditions, not extra cases

**C1 — mandatory exact-type/value preservation relation.** Read specification §§1/4 as requiring exact corresponding types *and* complete bounded values, not Python container equality alone. Explicitly preserve this in the later source contract. A post-call zero changed to False, or one changed to True, must fail even though ordinary equality can hide it. Check exact container type, fixed lengths/keys and exact scalar type before comparing/indexing; None uses null identity, not arbitrary equality. Strings remain exact finite literals. Reject an unexpected replacement type/shape without formatting, generic deep-copying or traversing arbitrary replacement content.

Use each case's literal pre-call shape, **including intended malformed values**: n=True, T03's empty-list depth, and empty-list certificates. A valid-graph/certificate grammar alone is not the snapshot relation for malformed cases. Independent nested snapshots must not alias caller storage. This changes no14/26 count and does not authorize a mutation campaign. An implementation using only ordinary `==` would be a real source-selection blocker; no implementation is supplied/accepted here.

**C2 — observational scope.** Label these26 checks *post-call exact-type/value preservation*. Such equality does not by itself detect transient mutate-then-restore behavior, same-value container replacement or changes of alias/identity topology. Do not call it a universal no-mutation proof or proof against user-defined hooks. Product nonmutation remains a source/contract obligation; this slice adds bounded evidence only.

**C3 — unit wording.** Specification §5's A22/R27/long-R28 follows selected `5n+2k` and `5n+k+s+p+1`: the rejected +1 is the standalone strict_edge scalar, not an array entry. Array-only totals are26/27 for the two rejected forms. Keep the stated totals if explicitly including that scalar. Likewise prefix the105-record quantity with *graph admission only*. No mathematical case/count correction or grid expansion is needed.

## 6. Primary cross-check and open gates

Independently read the already-cited McConnell author preprint §2.4/§6.2: shortest-distance evidence combines all-edge inequalities with realizing justification, and certificates must be bound to preserved original input. These support the project distinctions, not this Python implementation's correctness. [Certifying Algorithms](https://people.mpi-inf.mpg.de/~mehlhorn/ftp/master-final.pdf).

Alkassar §2 and selected shortest-path passages distinguish checker correctness from the abstract witness implication and require acceptance of valid witnesses under stated preconditions. Their verified artifacts do not certify this project's exact malformed-object grammar. Other three research references were not freshly independently re-audited by this peer. [A Framework for the Verification of Certifying Computations](https://arxiv.org/pdf/1301.7462v1).

No blocker requires changing any proposed expected answer or product source. Coordinator specification selection remains separate; C1/C2/C3 should be explicit in its carry-forward record. Subsequent fixture/source/ledger/output grammar, actual-source review, exact immutable dependency selection and action/receiver/control/tool authority remain unopened here. No suite, oracle, API, parser/import, test, host or native/performance action ran. No external write, deletion, old/stopped payload, snapshot or dependency on a stopped save was introduced. All14 proposed cases remain **UNRUN**; neither this nor the prior4-smoke/12-semantic observations completes4.1 or item4.
