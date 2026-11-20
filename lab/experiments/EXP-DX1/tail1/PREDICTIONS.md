# DX-TAIL1 bare-metal forecasts

North star P2 scheduled offer to durable ACK and P6 quiet-account p99 relative to the same account alone. Published before any DX-TAIL1 server run. [Scope](../../../SCOPE.md) · [North star](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md)

Engineering ranges in milliseconds for 10,000 people in each account, with zero load readers. Thin and deep use the original offered patterns and exclude the P4 history overlay. The quiet account uses the W1 quiet stream and the pooled, aligned-burst condition with nine deep neighbors. It keeps the same offers when alone. These are aged-run estimates. The first 900 seconds of the archived deep control had 31 ms p99. That prefix has less history work and fewer long pauses.

| Write gateway arm | Thin p99 | Deep p99 | Quiet alone p99 | Quiet with nine busy p99 | Quiet ratio |
| --- | ---: | ---: | ---: | ---: | ---: |
| Serial control | 30–39 | 55–67 | 26–42 | 350–1,250 | 12–30× |
| Tuned G1 | 26–36 | 52–58 | 24–40 | 320–1,200 | 10–30× |
| Generational ZGC | 26–40 | 50–62 | 24–43 | 330–1,350 | 10–33× |
| Less allocation, Serial | 28–39 | 53–65 | 25–42 | 340–1,250 | 11–30× |

The archived ex-overlay p99s were 32.38 ms thin and 59.65 ms deep. The deep fixed-clock sensitivity leaves 54–55 ms after clipping direct HTTP pause exposure to 20–35 ms per cycle. The full trace with history work leaves 74 ms under the same sensitivity. The G1 range allows for some subject-queue recovery and new collector overhead. ZGC competes for one writer-core CPU budget, and its allocation stalls count even with short stop-the-world phases. The allocation arm targets young garbage volume and may leave some Serial full pauses. The quiet-account estimates use the shared-database queue model under sustained bursts. The forecasted collector changes are smaller than that queue exposure. [Original scale run](../scale1/REPORT.md) · [W1 queue measurements](../w1/REPORT.md)

If the G1 variant avoids 50–75% of baseline `/begin` calls without added conflict or worker stalls, predict **48–56 ms** deep p99 outside the history overlay. This is conditional on the exact-case gate and observed request counts. Record expired offers, stale-claim fallbacks, queue drain, allocation stalls and the p99 denominator before comparing any range.

## Server replay

Run on the physical bench host with the pinned Datomic build receipt and already-built workspace packages. Set `DX_TAIL1_ARCHIVE` to the sealed archive, `DX_TAIL1_IMAGE_RECEIPT` to the local engine build receipt, and `DX_TAIL1_OUTPUT` to a new evidence directory.

```sh
env DX_BARE_METAL=1 DOCKER_HOST=unix:///var/run/docker.sock node lab/bin/engine.mjs tail1 --holder DX-TAIL1 --arm g1 --seconds 240 --archive "$DX_TAIL1_ARCHIVE" --image-receipt "$DX_TAIL1_IMAGE_RECEIPT" --out "$DX_TAIL1_OUTPUT"
```

The command offers 5,254 events, including 5,110 primary saves, at the original spacing. The 29-minute budget includes seeding, replay, collection and cleanup. The full 5,910-second schedule cannot fit in that budget at its original pace. Change `--arm` to `serial`, `zgc` or `allocation` for a fresh paired replay, or add `--receipt-predecessors` for the G1 request-count comparison. The server runtime remains unmeasured.
