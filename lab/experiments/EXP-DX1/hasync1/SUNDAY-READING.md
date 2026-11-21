# Sunday failover results

**Drivers** ________ · **INT1 commit** ________ · **Run ID** ________ · **Seed SHA-256** ________

**Evidence archives and digests** ____________________ · **Elapsed on both servers** ________ / 240 min

Use server B's `measurements.json`, `link.json` and each arm's `sunday-survivor.json` and `sunday-second-failure.json`. Report seconds or minutes as labelled. Record missing evidence as **unmeasured**, and keep the first failure. A valid run can fail a timing bar.

| Measurement | Bar | Prediction | Observed | Pass/fail |
| --- | --- | --- | --- | --- |
| B50 / B235 first loss among ACKs | 0 / 0 | 0 / 0 | ___ / ___ of ___ / ___ | ___ |
| B50 / B235 first new two-copy save | ≤60 s each | 4–13 min / 4–14 min | ___ / ___ s | ___ |
| B50 / B235 A standby copy to ready | Record time | 3–12 min each | ___ / ___ min | — |
| B50 / B235 saves offered while held, by fate | Count each | 12–39k / 56–197k, mainly refused | ___ / ___ | — |
| A50 / A235 first loss among ACKs | 0 / 0 | 0 / 0 | ___ / ___ of ___ / ___ | ___ |
| A50 / A235 first new one-copy save | ≤60 s each | 18–55 s / 22–65 s | ___ / ___ s | ___ |
| A50 / A235 second loss from the one-copy ACKs | Show exposure | 150–440 / 700–2,050 | ___ / ___ lost of ___ / ___ exposed | — |
| All five required cases, first exact read / longest gap | Exact reads throughout | ≤0.35 s / ≤1 s | ___ / ___ s, worst case ___ | ___ |
| All five required cases, reads past 1 s | 0 | 0 | ___ of ___, by case ___ | ___ |
| Planned protected move at 235/s | ≤30 s, zero ACKs lost | 25–65 s, zero lost | ___ s, ___ of ___ lost | ___ |
| Optional return of old writer | 0 accepted writes | Startup refused by the fence | ___ | ___ |
| SSH tunnel vs loopback | Record cost | +0.15–1.5 ms p50 / 60–220 MiB/s bulk echo | ___ ms extra p50 / ___ ms extra p95 / ___ MiB/s | — |

**Caller view during holds** ________ refused · ________ pending/late or unknown · ________ expired before send or waiting on an earlier command.

**Proven scope** sudden loss of the owned database processes on a live host, ten accounts in one database, staged same-image replacement. Record any departure ________.

**Owner decision** A resumes writes on one copy with an alarm. B holds writes until a second copy exists. C puts a second surviving copy on a third machine and needs a new allocation. Choose **A**, **B** or **C** ________.
