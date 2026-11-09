# EXP-W01b — XTDB golden scenarios

North star: P1–P5 correctness and measured bars; authority: lab/SCOPE.md, lab/NORTH-STAR.md, lab/TARGETS.md §6.

**Result: incomplete, no promotion.** Built on WIP 3ccbc98. All 20 specs have 10k expectations; 17 runnable scenarios have historical XTDB receipts. Every historical overall verdict is FAIL. These are reduced shared-dev diagnostics, not year-one acceptance.

| GS | Historical database | Bars | Domain |
|---|---|---|---|
|01|PASS|FAIL|none|
|02|PASS|FAIL|unavailable|
|03|PASS|FAIL|unavailable|
|04|FAIL|FAIL|none|
|05|PASS|FAIL|none|
|06|PASS|FAIL|none|
|07|PASS|FAIL|none|
|08|PASS|FAIL|unavailable|
|09|FAIL|FAIL|none|
|10|PASS|FAIL|unavailable|
|11|FAIL|FAIL|unavailable|
|12|FAIL|FAIL|unavailable|
|13|FAIL|FAIL|none|
|14–16|NOT_RUN|—|—|
|17|PASS|FAIL|none|
|18|PASS|FAIL|none|
|19|PASS|FAIL|unavailable|
|20|PASS|FAIL|unavailable|

Fixed queued writers entering a disposed runtime, empty-feed catch-up, and failed-build execution of stale dist. Added cause-preserving diagnostics: explicit engine timeouts, unresolved I/O, restart faults, blocked predecessors, and comparison failures remain separate; verdicts are unchanged. Final-read retries preserve failures.

GS.12's proposed core patch applies and typechecks on scratch sources. Eight instrumented transact cases pass: six invalid integers fail typed before command claims; two legal values reach the adapter boundary. No packages/* source was edited. This is not XTDB round-trip validation.

Evidence: [index](EVIDENCE-W01b.json), [patch proof](evidence/gs12-patch/receipt.json), original receipts under lab/runs/GS, byte-identical historical copies under evidence/historical. The failed-build diagnostic `GS-xtdb-20261108T211523Z-ea6353` was explicitly aborted; raw state remains RUNNING and is unqualified.

Fresh checks: 23/23 lab/harness tests PASS; all 20 goldens regenerate byte-identically ([proof](evidence/offline/receipt.json)). Corrected-build rerun `GS-xtdb-20261108T212031Z-015daa` stopped after 310 seconds live: five live commands settled, 57 pending, no feed records. It completed zero scenarios: FAIL/incomplete, not a semantic result. [Abort/cleanup evidence](evidence/abort-receipt.json). Fresh GS.04/09/12/13 qualification remains open.

Open: GS.14/15 need multi-tenant/storage-isolation runners; GS.16 needs erasure. O-DOMAIN adapter, engine-kill and GS.04b remain unverified. No QLever rerun, merge, push, release, or independent verification was performed.
