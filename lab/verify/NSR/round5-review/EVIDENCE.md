# CX-VNSR-5 round 5 evidence

Verdict: **ACCEPT-OFFLINE**, limited to round-4 findings R4-F1 and R4-F2 on target
`709a18f17eec40a7b6af17587a86578c2bf0af1c`.
Report: [`../VERIFY-round5.md`](../VERIFY-round5.md).

Durable root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VNSR-5/round5/`.
[`SHA256SUMS`](SHA256SUMS) indexes **90 files / 221,587 bytes**, with every digest read back after child
completion. Paths are relative to that root; the manifest excludes itself. Its SHA256 is
`05472d637a283bdb5d8b7e0d42c849412b8cbb4c6ef129994b6167caa4e2e102`.
Raw keys, configs, artifacts, layouts, child output and receipts remain outside git.

There is one completed fresh attempt, `attempt-1/`, with **7 independent pre-spawn refusals, 2 independent
actual child observations and 8 freshly rerun builder envelope controls**. All assertions completed normally.
The review was admitted through the existing heavy semaphore; waiting created no partial attempt directory.

| Path under `attempt-1/` | Evidence |
| --- | --- |
| `summary.json`, `source-hashes.json` | Scoped verdict, target, Node/esbuild versions and 19 exact target source/lock/document hashes. |
| `PERMISSIONS.md` | Exact reviewed grant/environment/runtime-exception ledger. |
| `reviewer-source.mjs` | Exact executed independent reviewer source, captured before fixtures ran. |
| `wildcard/`, `reviewer-refusals.json` | Original round-4 sibling-write body, star-path refusals and output-reuse refusals, with exact errors and no child spawn. |
| `envelope/` | Fixture source, built artifact, evaluator key, two actual fresh layouts, receipts, output bytes and per-launch config preimages. |
| `output-a-result.json`, `output-b-result.json` | Full actual child stdout/stderr/exits and layout receipts. |
| `reviewer-observations.json` | Actual complete env, argv, execArgv, CWD, denied write/read resources and receipts for both independent runs. |
| `captured-launches.json` | Independent capture of the two unmodified spawn invocations; no injected flags or environment. |
| `builder-controls/results.json`, `builder-summary.json` | All eight current target envelope controls and their positive/negative observations. |

`reviewer-tools/` preserves the final review and retention tools. The 683-file builder evidence manifest
was independently read back at its existing durable root; those historical test results were not rerun
or copied into this review's fresh execution claims.

The independent fixture config preimages were captured before each launch and hash-match each receipt.
The builder's fixture deliberately rewrites its config for later negative cases; its original actual child
observations/receipt remain retained. The independent acceptance rests on the separately captured preimages
and actual-child comparisons, rather than reconstructing that overwritten builder input.

No implementation fixes, acceptance edits, engine/VM/G03/Linux qualification, native-open retrace, full G0
or NSR/P3M semantic suite, merge into main or push. Changed pinned paths: **none**. No open issue remains
for the two scoped findings; the ledger's separately stated G03/base/network obligations remain unverified.
