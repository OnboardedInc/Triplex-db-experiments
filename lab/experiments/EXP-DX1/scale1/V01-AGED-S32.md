# Aged v0.1 card at the shipping settings: server-32, rolling 6

Server 2 runs this card on the sealed 1B cluster from `exp/DX-INT1` at `0d9693de03ca2cb97c8e650d313895585324741d` (`v01/AGED-SERVER-32.md`): parts 1 and 2 with rolling 6 credits, part 3 the barrier 6 control on the same profile, then `--assemble`. Dry run of part 2 to its first offer first, on a throwaway copy. The bundle is `faab1bc5…`; each part runs on a fresh scratch copy on the root NVMe with WAL on the spare NVMe. The afternoon card at `6770c37ba` is in [V01-AGED.md](V01-AGED.md).

**Dry run of part 2, 21:45–21:53 UTC:** build `0d9693de0` (4 min 34 s), scratch copy 144 s, then `DX-DRY-RUN first offer reached: scorecard arm 2 headline/loaded lab/experiments/EXP-DX1/v01/adopted-server.ts:160`. The aged fresh-peer check passed inside the stack network with no hosts entry. The timed run of parts 1–3 and assembly started at 21:53:23 UTC in `/var/tmp/triplex-v01-1B-s32`.

## Predictions, copied from the builder's document before launch


Sources: this afternoon's 1 billion card (16 GiB, fair turns, 90 s cells; `V01-AGED.md` at `182fb4482`); PREP1's 32 GiB arms on the fresh database (three runs on 2026-11-21: 394.00/s and 620.00/s stored with no expiries on three cores, late SQL reads 0.04 per save, but whole-window p99 10–14 s from a cold first minute in 300 s windows; `bm1/ROLLING-READING.md`); PREP1's forecast for 32 GiB at 1 billion (`prep1/AGED-CACHE.md`: late reads 0.45 per save, 393/s at 394, 540/s at 620, second-half p99 1.5 s at 394). In this card the 394 and 620 cells come after the P1–P4 pair and the 50 and 235 cells on the same stack, so the cache is partly warm, but each 90 s cell is short: a backlog formed early in a cell is not drained inside it.

### Part 2, headline, rolling 6, server-32

| Offered/s | Stored in window/s · expired | All-save p50 / p99 ms | Quiet commit p99 solo → loaded (ratio) | Afternoon (16 GiB, fair turns) |
| ---: | --- | --- | --- | --- |
| 50 | 50.0 (49.5–50) · 0 | 10 (6–15) / 60 (35–150) | 22 → 35 ms (1.6×; 1.1–2.5) | 50.00 · 0 · 12.80 / 60.67 · 21.12 → 50.17 (2.38×) |
| 235 | 235.0 (225–235) · 0 (0–500) | 15 (8–200) / 900 (100–4,000) | 24 → 55 ms (2.3×; 1.4–5) | 235.00 · 0 · 712.70 / 3,817.47 · 24.32 → 162.81 (6.69×) |
| 394 | 375 (300–394) · 1,000 (0–6,000) | 2,000 (30–20,000) / 15,000 (2,000–30,000) | 20 → 70 ms (3.5×; 2–8) | 249.41 · 5,523 · 23,330.81 / 30,054.53 · 19.58 → 87.55 (4.47×) |
| 620 | 480 (380–620) · 12,000 (0–25,000) | 25,000 (3,000–29,900) / 30,000 (expiry bound) | 33 → 85 ms (2.6×; 1.5–6) | 239.32 · 26,565 · 29,884.42 / 30,146.56 · 33.28 → 106.50 (3.20×) |

- **P6 bar (1.25× or a loaded p99 of 50 ms or less):** met at 50/s only through the 50 ms clause (about 60%); not met at 235, 394 or 620.
- **P1 pinned reads:** unchanged from this afternoon, because the reader is unchanged: about 18 reads/s (14–24) at every ladder step, and about two thirds of the quiet account's reads still returning errors. The writer's larger cache does not reach the reader.
- **P4 current pulls, P8 import:** close to this afternoon (P4 p99 30–60 ms; P8 3,100–3,400 facts/s with exact frames).
- **Transactor memory:** peak cgroup 52–58 GiB of 60; no out-of-memory exit.

### Part 3, barrier 6 at server-32 (only the cache differs from this afternoon's part 2)

| Offered/s | Stored in window/s · expired | Quiet loaded p99 |
| ---: | --- | --- |
| 235 | 235 (220–235) · 0 (0–1,500) | 90 ms (50–200) |
| 394 | 340 (270–394) · 3,000 (0–9,000) | 80 ms (45–160) |
| 620 | 400 (300–560) · 20,000 (8,000–30,000) | 95 ms (50–200) |

### What would show these wrong

1. **The 32 GiB cache does not cover the 1 billion working set:** part 2 stores under 300/s at 394 offered, or part 3 stores no more than this afternoon's 249/s at 394. Then reads per save at 1 billion stay near 1 or more with 32 GiB, the cache is not the lever at this size, and `server-32` should not become the default on its 1 billion evidence.
2. **The cache covers it fully:** part 2 stores 620/s at 620 offered with no expiries. Then the working-set model behind PREP1's 74 GiB estimate is too pessimistic.
3. **Rolling credits do not matter at 1 billion:** part 3 (barrier 6) stores within 5% of part 2 (rolling 6) at both 394 and 620.
4. **The reserved quiet credit does not protect the quiet account at 1 billion:** part 2's quiet loaded p99 above 150 ms at 394 or 620.
5. **The reader was not the pinned-read limit:** part 2's P1 goodput above 40 reads/s at 16 seats or more with the reader unchanged. Then this afternoon's 18/s depended on the writer side.
6. **The launch repairs do not hold:** any part refused at the fresh-peer check (AMQ219007 or a name lookup), or at the P7 residency listing.

## Toy-size check on the Mac (timings diagnostic)

| What | Result |
| --- | --- |
| `scorecard.mjs --plan --age 1B --profile server-32 --credit-mode rolling6 --window-seconds 90` | Three stages: headline zero and loaded at rolling 6, barrier 6 control; transactor 60 GiB cap, 32 GiB cache; reader one core, 1,536 MiB cache. Budget 224 minutes |
| Fresh peer in the stack network (`age1/scorecard.mjs` `peerCommand`), with the lab VM's Datomic image on a private network | The container resolved another container's name on the network, ran `java`, read the mounted state file and could not write it (read-only). Network and container removed |
| `age1/scorecard.test.mjs` | Command construction: same java arguments, five read-only mounts at host paths, the stack network, the URI and attempt; host path unchanged when unset |
| `v01/sequential.test.ts` (6 tests) | A part refused before its first offer is set aside and runs again; the campaign then assembles; a completed part cannot be set aside; a dry run may start part 3 alone, a real run may not |
| `jvm1/server32.test.mjs`, launch guard (58 cases, 0 mismatches), combined check on `840be636c` | Pass (part 15 of `int1/V0.1-STATE.md`) |

**Not exercised on the Mac:** the aged admission itself (it needs the one billion records, the SCALE1 seed pins and a bare-metal Linux host); the scorecard runner end to end (`adopted-server.ts` refuses anything but bare-metal Linux); the set-aside call inside `adopted-server.ts`'s cleanup (its function is unit-tested, the call site only type-checked); `server-32`'s MemTotal guard (Linux only); the dry-run tool with the scorecard parts. The fresh-peer container uses the read gateway's image as `root` with read-only mounts; whether that image's `java` runs the AGE1 peer against PostgreSQL on the server has not run anywhere.
