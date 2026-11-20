# Publish while saves are flowing

North star P5 at the exact durable cut, with P1 reads and P2 saves running. [Scope](../../../SCOPE.md) · [Priorities](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md)

## What the earlier tape can attribute

The 204-offer attempt executed `f199db819` before the 250 ms reader grace existed. The 34 late offers have 1.425 s median and 3.403 s maximum from scheduled offer to record completion. Candidate first correct reads have 1.373 s median and 2.845 s maximum on those offers. Their read calls themselves took 265 ms at the median and 1.513 s at the maximum. The first returned current answer could precede the issuer's ACK when a helper finished it.

Issuer-side native instrumentation covers six late offers. In those six, delay behind an in-flight save was 34 ms median and 274 ms maximum. Native service was 95 ms median and 378 ms maximum. The remainder from ingress to ACK was 886 ms median and reaches 1.685 s. Across all 111 complete issuer traces the measured save wait was 495 ms p99. The tape cannot separate the remainder into fence work, source repair, an earlier Publish blocking admission, or scheduling pressure. It has no CPU-pressure or head-conflict clock. The 28 other late offers lack a full issuer trace. This is raw diagnostic evidence because the original complete oracle replay stopped. The source tape and result digests are in `part4/old-waits.json` under the durable evidence directory.

## Queueing law to test

Let `lambda` be offered saves per second, `s` their mean service in seconds, and `rho = lambda × s`. The FIFO queue is stable only for `rho < 1`. Under Poisson arrivals and exponentially distributed service, the queue has an atom `1-rho` at zero and tail `rho × exp(-(1/s-lambda) × t)`. Consequently its waiting p99 is `max(0, ln(rho / .01) / (1/s-lambda))` in the stable range. At `rho >= 1`, a finite FIFO observation depends on the duration and initial backlog. With constant service the saturated backlog adds about `(rho-1) × elapsed` seconds of waiting.

With priority at the same-account admission point, ordinary waiting saves drop out of the Publish wait. Under independent offers and constant, nonpreemptible save service, the residual of the active save is uniform from zero to `s` when busy. Its unconditional p99 is `s × max(0, 1-.01/rho)` in the stable range. With variable service the residual is length-biased. Long saves and an already admitted native turn still affect the tail. At 3.5, 23.5 and 39.4 saves/s, FIFO needs mean service below 286, 42.6 and 25.4 ms respectively. These are model assumptions and thresholds. Report the p99 of complete offers and paired component clocks. Adding component p99s does not give the Publish p99.
