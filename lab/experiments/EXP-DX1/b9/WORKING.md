Latest checkpoint 2026-11-10T21:11Z: default-frozen-1 exit0/536s, summarized. All4/64/256 ranges overlap oldA; busy host, absolute target missed. Three selected jobs remain waiting for mutex: default-mixed-1 pid50112, default short pid49122, default full pid53841. H4 zero then ladder acquired intervening holds. Do not touch their lock. Own heavy parents48140/48168/48340. About4h budget reaches21:30Z; no further B/C/D implementation is being admitted. Required selected-source gates must complete before stepA code commit. Source remains exactly stage-default1; only b9 docs/tools edited since capture. Report draft labels pending fields; regenerate after successful checks.

# Latest checkpoint

Selected production candidate is now **default off** for report-fed revisions:
`TX2_RECENT_REVISIONS=1` (or `-Dtriplex.recentRevisions=true`) enables it.
`read-entity-legacy` avoids disabled feature's per-entity volatile/closure work; safe generation keys and ReadConfig remain.
Selected immutable source is `evidence/DX-B9/stage-default1/B`.
Pending/final selected jobs: `default-frozen-1`, `default-mixed-1`, `tx2-dxb9-a-default1-short`, `tx2-dxb9-a-default1-full`.
Their helpers are captured under stage-default1/source or gate-runner-default1. Do not edit live SDK/load files.
The older final-frozen-1 prototype still lost at64 (A6072–6535/B5031–6062), so it is NOT selected.
Older prototype final1 short/full gates are informative only. Required default gates are still pending.
Warm graph bytes match across completed clone arms; native startup t may advance by metadata, logical head stays52039.
Source seed remains explicitly retained until all selected clone holds finish; remove it once quiescent.
No A commit yet. **B draft is not applied. C/D not attempted.** Budget target is about21:30UTC (four hours from start).

--- Earlier checkpoint follows; the latest text above supersedes pending-job names ---

# DX-B9 working checkpoint (not a verdict)

Current source: ReadConfig fixed fields and primitive ParsedKey; added native key test 8 assertions.
Also repaired stale W0 page-test fixture (backend URL, observing built client while counting fallback),
and restored multi-root BFS order in sweepRows.ts, preserving all old assertions; added unreachable-row rejection test.
The five sweep decoder unit tests, build and typecheck passed. No step commit yet; full gates must pass first.

A original verdict: frozen-2 and mixed-2 finished under single A1 B1 A2 B2 holds, 773 /1028 seconds.
Nonoverlap at frozen 4/64 goodput and dense commit p50 establishes a smaller regression per requested rule.
Host was busy by end, so not a quiet absolute bar. Baseline table/host lines are in STEP-A-BASELINE.md.
Fresh profiles show 152 PersistentArrayMap.indexOfObject->read-entity and94 Util.equals->cache lookup among1440 samples.
Raw evidence /Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B9.

Final source frozen in stage-a-final1 (including built SDK) and gateway B therein. Final jobs:
- final-frozen-1: immutable stage-a-final1/source/lab/experiments/EXP-DX1/b9/clone2-window.sh frozen
- final-mixed-1: same runner mixed
- tx2-dxb9-a-final1-short: gate-runner-final1 short-diff-gates.sh
- tx2-dxb9-a-final1-full: gate-runner-final1 parallel-gates.sh full
All run through heavy.mjs and own lock holds; may still be waiting for quiet/lock. Do not mutate live SDK builds,
load-clone2.mjs or mixed-instrumented.mjs until these finish. Do not edit immutable executing shell runners.
Expected current short counts:24 files,184 legacy /182 lean+2skips; native53877;300 scenarios95028 comparisons5664 closures;
long9 tests/layout. verify-gates.py SHORT_PREFIX FULL_PREFIX STAGE_GATEWAY checks content/freshness/binding.
Original first combined full gate overloaded and failed record-time waits, plus missing W0 build.
Shortdiff2 subsequently passed all300 but short slice failed stale W0 fixture and index-timing bound by0.23ms.
Full2 passed9 long tests/layout (673s etc), but final-full reruns after latest decoder repair.
All failed attempts retained and all their containers/volumes removed.

Prepared seed: tx2-dxb9-seed-clone-1-seed-pg-data (202440KiB), clean stop exit0,106s lease.
Metadata seed-clone-1/seed/tx2-dxb9-seed-clone-1-seed/driver/seed-state.json. Source volume deliberately retained
only for final-frozen and final-mixed; remove after both measured, with verified no attachments. Each arm's clone deleted.
Clone-frozen-1 rejected du equality (directory block totals differed8KiB); clone-frozen-2 rejected startup native t+2.
Current clone2-window verifies complete file-name+SHA256 equality BEFORE startup, equal logical head and >= original native t,
then hashes all2000 root answers per worker and requires exact answer digest/byte/count equality across A1B1A2B2.
A different gateway may install metadata transactions; report startup native-t deltas, do not claim they were business commits.
seed.files in restored reports refers to original metadata-parent seed files, not the empty per-arm seed logs.

Step B drafts only, not applied to package: draft/CommitOrder.ts, draft/triplex/gateway/commit_order.clj,
strict-order.test.ts.draft, apply-step-b.py. Do not apply until A commit and source pin window ends.
Draft client has per-URL counters and explicit resume after suffix settled. Gateway draft buffers TreeMap sequences,
deadline fails suffix, no overtaking. Needs native gap/buffer tests,10k real delayed-arrival test, W0 window16/32/64
1000-subject fingerprints and full gates. apply-step-b.py is unexecuted and needs inspection before running.
C/D not implemented/measured. No keep-awake helper used. No downloads, no acceptance edits, no core/labbench edits.
