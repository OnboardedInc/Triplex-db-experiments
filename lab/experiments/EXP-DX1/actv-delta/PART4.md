# Publish while saves are flowing

North star P5 at the exact durable cut, with P1 reads and P2 saves running. [Scope](../../../SCOPE.md) · [Priorities](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md)

## What the earlier tape can attribute

The 204-offer attempt executed `f199db819` before the 250 ms reader grace existed. The 34 late offers have 1.425 s median and 3.403 s maximum from scheduled offer to record completion. Candidate first correct reads have 1.373 s median and 2.845 s maximum on those offers. Their read calls themselves took 265 ms at the median and 1.513 s at the maximum. The first returned current answer could precede the issuer's ACK when a helper finished it.

Issuer-side native instrumentation covers six late offers. In those six, delay behind an in-flight save was 34 ms median and 274 ms maximum. Native service was 95 ms median and 378 ms maximum. The remainder from ingress to ACK was 886 ms median and reaches 1.685 s. Across all 111 complete issuer traces the measured save wait was 495 ms p99. The tape cannot separate the remainder into fence work, source repair, an earlier Publish blocking admission, or scheduling pressure. It has no CPU-pressure or head-conflict clock. The 28 other late offers lack a full issuer trace. This is raw diagnostic evidence because the original complete oracle replay stopped. The source tape and result digests are in `part4/old-waits.json` under the durable evidence directory.

## Queueing law to test

Let `lambda` be offered saves per second, `s` their mean service in seconds, and `rho = lambda × s`. The FIFO queue is stable only for `rho < 1`. Under Poisson arrivals and exponentially distributed service, the queue has an atom `1-rho` at zero and tail `rho × exp(-(1/s-lambda) × t)`. Consequently its waiting p99 is `max(0, ln(rho / .01) / (1/s-lambda))` in the stable range. At `rho >= 1`, a finite FIFO observation depends on the duration and initial backlog. With constant service the saturated backlog adds about `(rho-1) × elapsed` seconds of waiting.

With priority at the same-account admission point, ordinary waiting saves drop out of the Publish wait. Under independent offers and constant, nonpreemptible save service, the residual of the active save is uniform from zero to `s` when busy. Its unconditional p99 is `s × max(0, 1-.01/rho)` in the stable range. With variable service the residual is length-biased. Long saves and an already admitted native turn still affect the tail. At 3.5, 23.5 and 39.4 saves/s, FIFO needs mean service below 286, 42.6 and 25.4 ms respectively. These are model assumptions and thresholds. Report the p99 of complete offers and paired component clocks. Adding component p99s does not give the Publish p99.

## One joined writer

| File | Comparison and chosen path |
| --- | --- |
| `actv-delta/account.ts` and `actv-lazy/join/account.ts` | DELTA durably admits an intent then commits a terminal release. Its reader can finish an abandoned intent after a 250 ms grace. Joined keeps the source cut, output marker, ordered notice intent and tail in one native commit. There is no visible preterminal intent to help. A lost reply reopens the original transaction by command ID. An aborted precommit offer has no receipt and remains a miss. |
| `actv-delta/deep.ts` and `actv-lazy/join/deep.ts` | DELTA repairs a durable source debt in another write. Joined places the native save, index leaf changes and owed work in one strict transaction. Deferred joined edits bind authored values on ingress and resolve retraction IDs in the admitted turn. |
| `actv-delta/service.ts` and `actv-lazy/join/deadline.ts` | DELTA has recovery on a current read and a clock worker. The current joined head already has a durable calendar and restartable nearest-boundary worker. Keep that worker and joined's expired-debt handling. |
| `actv-delta/rules.ts`, `index-patch.ts` and `actv-lazy/join/index.ts` | Joined imports the declarations and patch codec. Keep those sources shared. Joined adds the physical output projection and falls back to the census where ranges cannot justify selection. |
| `actv-delta/dispatch.ts`, `actv-lazy/join/archive.ts` and `recorded.ts` | DELTA reopens exact recipe bytes and can materialize immutable parts. Joined already has separate budgeted value and notice writers, an ordered NOTIFY1 ledger and a transactional receiver. Keep these for the distinct stored endpoint. |
| `actv-delta/audit-clock.ts` and `actv-lazy/join/observations.ts` | Both have separate durable clocks. DELTA keeps open-loop per-offer deadline probes and scores the earliest independently matched current reply. Joined retains native receipt and stored proof. The comparison runs the shared DELTA clock on the joined public tape. |
| WFIX1 `group.clj` and joined `admission.ts` | The reviewed gateway rotates ready accounts and grants bulk a turn after eight live turns. A native source-barrier waits for work already submitted to its database. Choose Publish before unsent same-account saves at the TypeScript admission point, then use the same native strict predecessor. |

The application writer owns one `AccountAdmission` per serviced scope and routes its semantic operations through the same `JoinedAccount`. The FIFO control and priority arm use one plan, reader and receipt decoder. Priority may pass only queued saves. An already admitted save is in the native cut. Waiting saves receive a turn by the ninth ready turn, and a separate writer that defeats the strict guard gets at most three attempts. Scope-owner routing is a deployment precondition. Other processes can still trigger a bounded conflict and must resolve the returned outcome by command identity. No durable intent or fixed grace is charged on this path.
