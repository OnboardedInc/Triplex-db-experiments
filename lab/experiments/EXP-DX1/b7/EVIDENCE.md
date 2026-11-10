# DX-B7 evidence index

Durable root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B7/`.

The committed [SHA256SUMS](SHA256SUMS) binds 312 root files or directory manifests, covering 16516 retained files
(1,615,860,269 bytes before the directory manifests). Each immediate subdirectory has a `DX-B7-FINAL-SHA256SUMS` that binds every
file beneath it. This keeps bulky recursive inventories outside git. Check the root list from the durable root, then each
subdirectory's manifest from that directory. Checksums bind bytes; they do not certify answers.

- `tx2-dxb7-baseline-b*`: unchanged gateway profile, raw driver samples and partial harness/input binding described in REPORT.md.
- `tx2-dxb7-step1-pull-a*`, `step2-pull-a*`, `step3-pull-a*`: successive source/build captures, raw measurements and JFRs.
- `tx2-dxb7-step4-pull-c*`: final four-worker frozen matrix, writer/feed samples, exact seed request/ACK transcript and frozen basis;
  before/after helper inventories, owned identities/cgroups, JFR/events/profile summaries, empty-resource cleanup receipt.
- `step1-gate-union.json` through `step3-gate-union.json`: complete earlier gate unions, distinct from failed enclosing attempts. No final step-4 union is claimed.
- `tx2-dxb7-step4-legacy-a*`: completed final legacy and Clojure tests. Final lean-b was cancelled before admission; the final
  300-case verifier differential was not started. `BUDGET-CANCELLATION.json` records the explicit queued-job cancellation.
- `final-profile-callers.json`: retained stack examples, with caller attribution limits. The additional thread-name extraction was
  cancelled in the heavy queue; its zero-byte output is not a profile result.
- Earlier `*-a/b/c*` failures, timeouts, cancelled queued probes and helper-preflight failures remain. No failed attempt was removed.

No root-wide evidence directory was copied into git. No acceptance promotion, independent review, merge, push or deployment is implied.
