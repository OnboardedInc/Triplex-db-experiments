# First single-account timing evidence

The first restored runtime with working observers was `arm-d7-single-zero-b`, source `07057d6c2`. It checked the first two windows and sealed the writer ledger for the five-minute plateau. The observer deadline stopped the feed check before it could return the plateau result. The peak minute did not run.

| Offered saves/s | In-window ACKs | Save p50 ms [90%] | Save p99 ms [90%] | Feed p99 ms [90%] |
| ---: | ---: | --- | --- | --- |
| 3.5 for 150 s | 525/525 | 10.37 [9.92, 11.07] | 85.50 [54.27, 156.67] | 25.22 [24.96, 26.50] |
| 4.9 for 120 s | 588/588 | 4.70 [4.61, 4.86] | 40.70 [26.11, 45.82] | 24.58 [24.45, 24.70] |
| 23.5 for 300 s | 7,050/7,050 | 3.65 [3.62, 3.68] | 34.56 [26.24, 39.68] | Unmeasured |

All three writer ledgers show zero expiry, missing offers or drain. The plateau row replays the frozen offer IDs and clocks against the archived writer bytes. Its counts are original ACKs. The prior two rows also have the checked feed. The windows ran in sequence and each rate ran once. [Checked summaries](evidence/arm-d7-single-zero-b.sha256) · [Writer recount](evidence/single-first-attempts.sha256)

`arm-d7-single-read-b` stopped during restore because it shared the four-minute recorder deadline. It recorded zero timed cells. The exact-prefix cleanup was recovered against the original source and systemd stop state. The replacement pair restores the original sealed 100,000-person image. [Stop and cleanup evidence](evidence/single-first-attempts.sha256)
