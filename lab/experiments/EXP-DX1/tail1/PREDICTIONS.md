# DX-TAIL1 bare-metal forecasts

North star P2 scheduled offer to durable ACK and P6 quiet-account p99 relative to the same account alone. Published before any DX-TAIL1 server run. [Scope](../../../SCOPE.md) · [North star](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md)

Engineering ranges in milliseconds for 10,000 people in each account, with zero load readers. Thin and deep use the original offered patterns and exclude the P4 history overlay. The quiet account uses the W1 quiet stream and the pooled, aligned-burst condition with nine deep neighbors. It keeps the same offers when alone. These are aged-run estimates. The first 900 seconds of the archived deep control had 31 ms p99. That prefix has less history work and fewer long pauses.

| Write gateway arm | Thin p99 | Deep p99 | Quiet alone p99 | Quiet with nine busy p99 | Quiet ratio |
| --- | ---: | ---: | ---: | ---: | ---: |
| Serial control | 30–39 | 55–67 | 26–42 | 350–1,250 | 12–30× |
| Tuned G1 | 26–36 | 52–58 | 24–40 | 320–1,200 | 10–30× |
| Tuned G1, two writer cores | 24–34 | 49–58 | 24–39 | 310–1,200 | 10–30× |
| Generational ZGC | 26–40 | 50–62 | 24–43 | 330–1,350 | 10–33× |
| Less allocation, Serial | 28–39 | 53–65 | 25–42 | 340–1,250 | 11–30× |

The archived ex-overlay p99s were 32.38 ms thin and 59.65 ms deep. The deep fixed-clock sensitivity leaves 54–55 ms after clipping direct HTTP pause exposure to 20–35 ms per cycle. The full trace with history work leaves 74 ms under the same sensitivity. The G1 range allows for some subject-queue recovery and new collector overhead. ZGC competes for one writer-core CPU budget, and its allocation stalls count even with short stop-the-world phases. The allocation arm targets young garbage volume and may leave some Serial full pauses. The quiet-account estimates use the shared-database queue model under sustained bursts. The forecasted collector changes are smaller than that queue exposure. [Original scale run](../scale1/REPORT.md) · [W1 queue measurements](../w1/REPORT.md)

If the G1 variant avoids 50–75% of baseline `/begin` calls without added conflict or worker stalls, predict **48–56 ms** deep p99 outside the history overlay. This is conditional on the exact-case gate and observed request counts. Record expired offers, stale-claim fallbacks, queue drain, allocation stalls and the p99 denominator before comparing any range.

The two-core forecast was recorded at 06:24 UTC before the matched Mac comparisons. It assumes the extra writer core overlaps request work with collection. HotSpot and Datomic may both choose more parallel work with the larger CPU set. The separate BM1 matched workload ran at 39.4 saves per second. Its 170–179 ms deep p99 was dominated by native reply wait outside each save's own evaluation, and that backlog can recur under any writer collector. [Overnight evidence](OVERNIGHT.md)

## Server replay

Run on the physical bench host with the pinned Datomic build receipt and already-built workspace packages. Set `DX_TAIL1_ARCHIVE` to the sealed archive, `DX_TAIL1_IMAGE_RECEIPT` to the local engine build receipt, and `DX_TAIL1_OUTPUT` to a new evidence directory. Set `DX_TAIL1_ARM` to `serial`, `g1`, `zgc`, `allocation` or `g1-2core`.

```sh
env DX_BARE_METAL=1 DOCKER_HOST=unix:///var/run/docker.sock node lab/bin/heavy.mjs --label DX-TAIL1 -- node lab/bin/engine.mjs tail1 --holder DX-TAIL1 --arm "${DX_TAIL1_ARM:-g1}" --seconds 240 --archive "$DX_TAIL1_ARCHIVE" --image-receipt "$DX_TAIL1_IMAGE_RECEIPT" --out "$DX_TAIL1_OUTPUT"
```

The command offers 5,254 events, including 5,110 primary saves, at the original spacing. The runner budgets 29 minutes after admission for seeding, replay, collection and cleanup. Each arm keeps the sender and helper placement fixed. The spare writer CPU comes from a separate physical core and stays idle in one-core arms. The full 5,910-second schedule cannot fit in that budget at its original pace. Add `--receipt-predecessors` for the G1 request-count comparison. The server runtime remains unmeasured.

## Mac comparison

Use the existing lab Docker endpoint and the same archive and image-receipt variables. The Mac feed clock requires permission to read the host boot identity. `--preflight` checks the image and clock before any reservation or seed. Give every attempt a new output directory.

```sh
dx_tail1_nonce=$(node -p 'require("node:crypto").randomUUID()')
node lab/bin/heavy.mjs --measure-holder DX-TAIL1 --label "DX-TAIL1:$dx_tail1_nonce" -- node lab/bin/engine.mjs tail1 --holder DX-TAIL1 --arm serial --seconds 240 --lease-before-seed --attempt-nonce "$dx_tail1_nonce" --archive "$DX_TAIL1_ARCHIVE" --image-receipt "$DX_TAIL1_IMAGE_RECEIPT" --out "$DX_TAIL1_OUTPUT"
```

Alternate Serial controls with tuned G1, generational ZGC, the smaller allocation path and two-core G1. Each uses 5,110 primary offers and 144 resends in the same four-minute prefix. Run the G1 receipt option between two G1 controls. Keep expiry and outcome counts beside the commit quantiles. The formal lease can cover seeding in a crowded queue. The shared physical timing lock starts after the seed and covers the timed offers. `--full` retains the 98.5-minute schedule, and the physical lock covers its first four minutes. `--gate` runs the native exactness checks in an independent stack. [Mac observations](MAC.md)
