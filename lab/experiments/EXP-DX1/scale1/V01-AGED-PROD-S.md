# Version 0.1 card on the production-shaped tape at 1 billion: shape S, server-32

Build `090c189a8` (`exp/DX-INT1`; the document `v01/PRODUCTION-CARD.md` is published at `61a794c1d`, which changes only documents). `scorecard.mjs --tape production-S --age 1B --profile server-32 --credit-mode rolling6 --window-seconds 90` with the aged bundle `faab1bc5…`, three parts plus assembly, each part on its own scratch copy. Dry run of part 2 to its first offer first.

**Dry run of part 2, 23:11–23:16 UTC:** build `090c189a8` (2 min 56 s), scratch copy 133 s, then `DX-DRY-RUN first offer reached: scorecard arm 2 headline/loaded lab/experiments/EXP-DX1/v01/adopted-server.ts:170`. The timed card (parts 1–3 and assembly, `/var/tmp/v01-1b-prodS-s32`) started at 23:16:37 UTC.

## Results, part by part

| Part | Result |
| --- | --- |
| 1, headline without readers (reference tape, the same as every card) | 1,260/1,260 saves stored; p50/p90/p99 6.18 / 11.71 / 21.38 ms (max 134.49); feed 1,260 entries; cut 28,309,866 → 28,311,126; completed 23:26 UTC |

## Predictions and falsifiers, copied from the builder's document before launch


Per-subject rolling 6 credits, 90 s cells. The 394 cells use exactly the neighbour tape REAL2 measured, but for 90 s instead of 300 s, after the card's earlier cells on the same stack. Sources:

- REAL2's fresh R run at 394 rows/s: 393.13/s stored, busy p99 157 ms in the second half and 163 ms whole, save completion p99 237 ms, quiet 22 ms, 0.034 late reads per commit, per-subject writer p99 121 ms, general writer 188 ms. At 235: second-half p99 128 ms.
- The 1 billion card at 16 GiB with Saturday's tape: 249/s at 394.
- The 32 GiB cache arm at 1 billion: 384.5/s at 394, 0.95 late reads per save.

### Fresh, `server` (16 GiB)

| Offered rows/s | Shape R: stored rows/s · expired | R commit p99, whole / second half | R save completion p99 | R late reads per commit | Shape S: stored commits/s | S commit p99 (= save completion) | S late reads per commit |
| ---: | --- | --- | --- | --- | --- | --- | --- |
| 50 | 50 · 0 | 15–60 / 15–50 ms | 30–150 ms | 0.01–0.1 | about 3 | 30–150 ms | 0.1–1.0 |
| 235 | 235 · 0 | 80–250 / 60–200 ms | 120–400 ms | 0.01–0.08 | about 14 | 40–200 ms | 0.2–1.5 |
| 394 | 388–394 · 0–200 | 150–500 / 120–350 ms | 200–700 ms | 0.02–0.1 | about 23 | 50–300 ms | 0.2–1.5 |
| 620 | 520–620 · 0–5,000 | 0.4–6 s / 0.3–4 s | 0.6–8 s | 0.02–0.15 | about 36 | 80–600 ms | 0.3–2.0 |

- **Writer split, shape R, at 394:** 45–55% of commits on the per-subject writer (REAL2: 198 of 390/s), with its p99 below the general writer's. Shape S: 25–40% of commits on the per-subject writer (REAL2's gate: 52 of 88).
- **General-identity commits, shape S:** 0.5–3% of commits. Shape R: none.
- **Quiet account (P6):** loaded commit p99 18–45 ms at 235 and 394 in both shapes; the P6 bar (loaded p99 ≤ 50 ms or ≤ 1.25× alone) met at 50, 235 and 394 for shape S and at 50 and 235 for shape R, likely missed at 620 for R.

### 1 billion, `server` (16 GiB)

| Offered rows/s | Shape R: stored rows/s · expired | R commit p99, whole | R save completion p99 | R late reads per commit | Shape S: stored commits/s | S commit p99 | S late reads per commit |
| ---: | --- | --- | --- | --- | --- | --- | --- |
| 50 | 50 · 0 | 20–120 ms | 40–250 ms | 0.05–0.4 | about 3 | 60–400 ms | 0.5–4 |
| 235 | 230–235 · 0–500 | 0.15–1.5 s | 0.3–2 s | 0.05–0.4 | about 14 | 0.1–1 s | 0.5–4 |
| 394 | 330–394 · 0–6,000 | 0.4–8 s | 0.6–10 s | 0.05–0.5 | 20–23 | 0.2–3 s | 0.5–5 |
| 620 | 300–520 · 5,000–30,000 | 5–30 s | 6–30 s | 0.05–0.6 | 25–36 | 0.5–15 s | 0.5–5 |

- **Why better than Saturday's tape at 1 billion but worse than fresh.** The tape keeps returning to the same subjects, so most commits find their subject's rows in the cache. But the production bands are spread over 30,000 subjects per account, and nearly all of them are seed rows that AGE1 never touched: old, cold index segments behind 28 million saves. A subject's first save in the window reads them.
- **`server-32` at 1 billion:** shape R stores 394 at 394 with second-half p99 under 1 s; 620 stores 450–620.

### What would show these wrong

1. **Production locality does not carry over to 1 billion:** shape R at 394 stores under 300 rows/s at `server`, or its late reads per commit are 0.8 or more. Then a production-like tape still misses the cache at this size, and the cache size and the owner head stay the levers.
2. **The fresh card disagrees with REAL2's runner:** fresh shape R at 394 has a second-half commit p99 above 500 ms, or stores under 385 rows/s. Then the card's earlier cells or its 90 s window change the result, and REAL2's 300 s cells are not the card's baseline.
3. **One wide commit costs more than a chain of narrow ones:** the shape S commit p99 at 394 is above the shape R save-completion p99 in the same age and profile.
4. **The writer rule is wrong:** the card refuses a cell because a commit's writer path differs from the rule (a refusal, not a measurement; it would show the gateway's routing differs from what REAL2 described).
5. **The quiet account is not protected on this tape:** quiet loaded p99 above 50 ms and above 1.25× alone at 235 in either shape.

