# Fractional scheduled offers and bounded queue deadlines

Tags: `problem:load-offer-timing`, `goal:6`, `mechanism:monotonic-pacing`, `status:observed`, `status:rejected`.

The first512/1024 open-loop stress attempts completed registered result checks but independent raw-event review found422/1358 reads finishing before their nominal offered timestamp. They are timing-disqualified, not stress acceptance. The [failure receipt](../../qualification/evidence/load-fractional-pacer-failure-v1.json) preserves both raw hashes and first invalid events; observations are neither clamped nor rewritten.

The pinned [Node24.13 timer documentation](https://nodejs.org/download/release/v24.13.0/docs/api/timers.html#settimeoutcallback-delay-args) describes approximate scheduling and fractional-delay truncation. The repaired harness waits against a monotonic target with ceiling sleeps and rechecks, includes queue time in the offered deadline, and prevents expired queued work from acquiring a connection. Six focused pacer/deadline checks pass; fresh real stress attempts are still required.

The [256-native open-loop diagnostic](../../qualification/evidence/xtdb-load-256-open-v1-strong-bytes.json) is different:640 actual result bodies are correct at returned cuts, but no writer became visible within the fixed5s window. Its~14.5s P99 offered latency and late drain indicate a queue/liveness problem requiring measured alternatives, not a passing read-throughput result. A post-window visible write is retained and reconciled but cannot count inside-window writer progress.

The [independent writer-path attribution](load-liveness.md) records ACK9,384.398ms and visibility10,716.978ms. The writer probe uses a separate pool and bypasses the native host read-dispatch queue. Phase timings, shared-server costs and the selected short window constrain interpretation; this is not a general engine latency claim.

The later repaired real [512](../../qualification/evidence/xtdb-load-512-open-stress-v2-strong-bytes.json)/[1024](../../qualification/evidence/xtdb-load-1024-open-stress-v2-strong-bytes.json) observations pass timing and actual-body/cut validation:299/334 correct reads,981/2226 declared bounded rejections. Zero writer commits became visible within either5s window. These establish narrow pacing/overload/correctness observations, not sustained liveness or stress acceptance.
