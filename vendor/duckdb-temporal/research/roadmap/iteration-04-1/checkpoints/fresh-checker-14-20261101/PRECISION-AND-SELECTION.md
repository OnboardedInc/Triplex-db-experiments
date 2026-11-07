# Checker fourteen-case specification selected for new source authoring

2026-11-01 UTC. The fresh S41-CHECKER-14 specification (f1c52f29df0439d498574afd91c4f1db4d554bdfe5d1aa6c03a543ab8f6e3a4e) and independent review (e479067294ad2d1f5b15ba9642d83b7e5904115a4b60756d41875949ee04a1c6) are selected for a genuinely new isolated SOURCE-ONLY unit. No expected graph/certificate/status changes are required. All fourteen cases remain UNRUN; no product repair, runtime/action permission or old held dependency is introduced.

## Mandatory precision carried into source

1. The 26 argument checks compare exact corresponding built-in types AND complete bounded predeclared values, including intentionally malformed baselines (Boolean n, empty-list depth, empty-list certificate). Ordinary Python equality alone is insufficient: replacing1 withTrue or0 withFalse must fail. Pristine baseline values must not alias supplied mutable arguments. Check exact types/shapes/keys/lengths before indexed or scalar comparisons; reject foreign replacement types/shapes without repr, serialization, generic deepcopy, custom hooks or arbitrary replacement traversal. No extra mutation campaign is selected.
2. Label them post-call exact-type/value preservation checks. They do not prove the absence of temporary mutate-then-restore behavior, same-value container replacement, identity/alias rewiring or all user-defined hook behavior. These remain source/contract questions, not claims established by this tiny unit.
3. Rejected certificate totals27/28 include standalone strict_edge; array-only totals26/27. The105 raw-record bound covers GRAPH ADMISSION ONLY, not all rank/triangle/distance/canonical-edge passes. Retain n, raw m, sorting and heap terms; no physical/time/capacity claim.

## New-source boundary

Author only the fourteen hand-defined cases with the exact selected statuses and independent pristine argument values. Exactly12 checker plus2 analyze public calls if complete;14 return-classification checks and26 separate argument-value checks, not40 calls. Append fixed-ID attempts before invocation and retain actual returned/exception/unassessed outcomes before assessment. No hidden producer/reference/oracle call, old factory/controller/launcher, broad57/62-call entrypoint, automatic discovery, retry or partial/zero-call green.

A new callable may accept the two public callbacks; binding/launcher/output controls and actual-source review remain separate. No product import, source parse/compile, fixture construction/test/generator execution, environment/SDK/system probe, deletion or external mutation is admitted by this selection. New source must use only the verified saved graph public APIs/contract and this new research/spec/review/precision text, not stopped backups or their contents. No external save is made a prerequisite or substitute for a held action. Subsequent exact action decisions remain unopened.
