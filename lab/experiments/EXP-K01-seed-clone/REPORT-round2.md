# EXP-K01 round 2: R30 freeze protocol

North star: measurement speed for P1-P5 with faithful seed reuse. Scope and targets are `lab/SCOPE.md`, `lab/NORTH-STAR.md`, and `lab/TARGETS.md`. Builder CX-K01-R2; independent adversarial review remains required.

## Implementation

Q83a's Log4j option is added only to s1-s3. The resident and follower options are unchanged. The effective system config and golden key include the option. Stop proof now requires exit 143, both XTDB stop lines, no forced halt/OOM, and measured stop time below ten seconds; the three component stop lines are retained.

Settling uses two block cuts, source/completed transaction gauges, advancing upload time, published block rows, per-table L0 adoption, idle compaction, and stable block/trie readings three times five seconds apart. It does not use a live-table settle predicate. Block enumeration re-lists just before each block query and never probes an absent/dense index.

The golden sequence closes its query process before stopping, checks both log tails offline and refuses nonempty temporary uploads, copies stopped bytes, starts the source as a reference, checks startup watermark/health/empty live rows/catalog/stable jobs, fingerprints C3-C8, and stops again. Intermediate settle evidence and failed golden attempts are retained. The golden volume is never started. Clone readiness includes the same reference-start checks. `engine.mjs offline` makes G8 usable by E1's fresh arm. The E1 plan now requires symmetric settle/stop/offline/start steps, equal window offsets after startup, and a 2.2.1 retest of the checkpoint/reference-start requirements.

`round2-live.mjs` records actual command arguments, exit status, wall time, stdout/stderr, and cleanup. Its sacrificial one-cut copy checks T3/T6 without contaminating the eventual golden seed. Toolcheck exercises the actual offline shell parser with a valid tail, a corrupt tail, and a nonempty `.tmp` refusal.

## Gates and live qualification

Focused unit gates: 40/40 pass (zero skipped), `evidence/round2/unit.tap`. Final TypeScript check passed (exit 0), `evidence/round2/typecheck-final.log`; live results pending. The first engine admission was refused: residents reserved 9.25 GiB; adding s1's 3.5 GiB exceeds the 11 GiB pool (`evidence/round2/admission-first.log`). The lightweight launcher waits without parking any resident or holding a heavy-job token. An initial idle heavy-wrapper attempt was stopped explicitly before any admission; its log is retained as `live-initial-wait.log`. Host free space was above 28 GiB at preflight; the 5 GiB floor remains enforced before copies.

| Prediction | Result |
| --- | --- |
| T1 flagged shutdown | pending admission |
| T2 shutdown without flag | pending admission |
| T3 fresh trie vs stale live snapshot | pending admission |
| T4 empty checkpoint block | pending admission |
| T5 reference catalog equals settled catalog | pending admission |
| T6 one-cut copied volume plans before/after one write | pending admission |
| T7 startup source watermark | pending admission |

Golden creation, clone creation, C1-C8 and their timings are pending admission. E1 has not run; no clone-seeded screening receipt is authorized by this builder result (Q74c). No large-rung/performance acceptance, monorepo check, package change, push, merge, publication or shared-resident lifecycle change is claimed.
