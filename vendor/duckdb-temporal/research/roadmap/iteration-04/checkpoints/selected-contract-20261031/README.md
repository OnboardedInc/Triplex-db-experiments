# Item 4 selected pre-code contract

31 October 2026. **Contract selected and independently reviewed before code. No implementation or runtime acceptance.** The exact previously reviewed [contract candidate](CONTRACT.md) is adopted unchanged by [SELECTION.json](SELECTION.json); its candidate label preserves review provenance, not an unresolved design choice.

## Read the selected contract

- [Native API, grammar, SCC/wave/accounting and scoped boundary](execution/NATIVE-CONTRACT.md). Seven required arguments, ten result fields, additive `td_query_stratified_v1`; old APIs/IR1/counters stay unchanged.
- [Owned inspect-only IR2](execution/IR2-CONTRACT.md), [exact fixed budget model](execution/BUDGET-MODEL.json), [minimal diagnostic/phase mapping](execution/DIAGNOSTICS.md). Source-only compiler output, not caller-IR execution.
- [Signed semantics](semantics/SEMANTIC-CONTRACT.md) and [40 proposed obligations](semantics/ACCEPTANCE-OBLIGATIONS.md), all UNRUN.
- [Independent semantic companion closure](reviews/semantics/COMPANION-REVIEW.md), [initial QA/hand accounting fixtures](reviews/qa-initial/REVIEW/PROPOSED-ACCEPTANCE.md), [final exact QA closure](reviews/qa-final/FINAL-COMPANION-REVIEW.md). Earlier draft findings are retained and explicitly superseded, not relabeled as current blockers or actual code fixes.

The exact `!atom` syntax reserves no relation name. Every negative variable is positively bound; all scalar filters on a complete binding run before grounded absence tests. Both signs enter SCC validation, all predecessor components complete (including empty), and every IDB SCC executes. Global work/facts/component-round limits never reset by stratum. Native exact full-key sets and one shared typed dictionary serve negation without another index or unnecessary per-wave tuple sorting.

## Conditional size derivation

[Independent review](reviews/qa-final/SIZE-BOUND-REVIEW.md) supports the [coordinator derivation](analysis/IR2-SIZE-BOUND-DRAFT.md): conforming compact compiler-produced IR2 is bounded by2,510,848 bytes under the exact stated shapes/caps, below4MiB by1,683,456. This is specification arithmetic, not a serializer run, measured maximum or RSS/allocator bound. Independent byte-cap enforcement remains mandatory; future schema changes require a new proof. Other analysis notes retain their historical draft labels.

## Current status and next gate

All proposed compiler/oracle/native/DB/test/benchmark cases are **UNRUN**. No0.5.0 binary exists in this checkpoint. After verified durable readback, the coordinator may allocate isolated disjoint NEW source ownership; compilation/loading/runtime/performance remain separately gated on the frozen candidate and current capacity. Native-only progress cannot count as complete store-integrated acceptance.

[Earlier item4 primary research]([PRIVATE_REFERENCE_REMOVED]) is preserved separately. Published source remains [PR7 in private Contributor/research-reference]([PRIVATE_REFERENCE_REMOVED]), source52b1e81f. Item3 remains incomplete/blocked. This new item4 checkpoint contains no later stopped item3 backup/probe/controller material and does not retry or replace that save. It changes no store/schema/SQL route/browser/deployment or protected native artifact.

[Checkpoint index](CHECKPOINT-INDEX.json) records every file's exact size/SHA256/Git blob identity, with itself excluded. Retained author manifests remain byte-identical; a manifest's local provenance paths describe its original source, while relative packet files are preserved under the folders above.
