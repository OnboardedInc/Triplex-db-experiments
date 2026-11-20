# DX-RD1 part 2 forecasts before execution

North star P1, P4 and P7. Keep exact pinned reads local, isolate native misses and charge history to activity. [Scope](../../../SCOPE.md) · [North star](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md)

| Bare-metal treatment | Goodput 1,024 / 256 | Weighted pulls/s | Recovery reads/s in 60 s | Writer p99 at 256 / zero |
| --- | ---: | ---: | ---: | ---: |
| Rolling comparator, unchanged global history | 0.38–0.52 | 3,200–3,850 | 16k–23k | 1.32–1.60 |
| Closure, 64 MiB | 0.46–0.64 | 4,000–5,400 | 22k–32k | 1.30–1.58 |
| Closure, 192 / 512 MiB | 0.55–0.75 / 0.60–0.83 | 4,500–6,500 / 4,900–7,500 | 26k–39k / 29k–45k | 1.28–1.55 |
| Separate fallback worker and four active exchanges, over closure 192 | 0.62–0.82 | 4,300–6,500 | 29k–44k | 1.28–1.55 |
| Same-basis batching, over the separate worker | 0.64–0.85 | 4,200–6,500 | 31k–46k | 1.28–1.55 |
| Revision-directed reuse, over batching | 0.66–0.89 | 4,500–7,000 | 34k–50k | 1.27–1.55 |
| Demand-installed exact history, over the other changes | 0.73–0.97 | 5,000–8,000 | 37k–58k | 1.26–1.55 |

Rates are conditional forecasts, not measurements. They assume the 5,910-second offer tape, existing two read-gateway cores, independent oracle, the same scope age and one fresh zero arm per physical pair. A weighted run has one reader, so it has nearly no same-basis batching opportunities. The writer gateway has a separate JVM. Fewer read repairs can relieve shared host or storage pressure, but these forecasts assign no direct read-allocation savings to its heap. The bars are 0.90, 4,400/s, 41,392/s and 1.25.

On the Mac predict a flat region near 0–0.5% and a gateway-bound region near 2–5%, with 5% at roughly 0.05–0.35 of the local rate. A single bottleneck predicts `min(Xlocal, permits/(missFraction × admittedSecondsPerMiss))`; per-call repair adds admitted time. Closed-loop readers also obey `X = readers / mean full cycle`; in-flight fallback seats occupy `X × missFraction × mean fallback residence`. Large post-gateway delays or a rate far below both limits would leave the explanation incomplete.

If any active driver role exceeds 0.70, keep the physical arm unjudged and compare local six, same-site remote six, then remote twelve on identical offers. Place the fallback decoder off the local reader event loops first if their post-return delay rises with repairs. A collector-bound arm instead needs a separately measured verifier shard or another CPU. Never pace away the offered readers or sample correctness to pass headroom.
