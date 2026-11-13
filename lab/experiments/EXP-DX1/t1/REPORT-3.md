# DX-T1 part 3

P2 remains unqualified. I stopped at V0 after all three off controls missed the required median.
The smaller VM had ample memory in the bounded capacity probe, with no observed OOM.
The controls still failed after both required waits and quiet admission.
The available breakdown locates time inside the enclosing client transact call; its inner layer is unknown.
Off recording cannot split that interval into TypeScript, socket, gateway, transactor and storage time.
The earlier writer timer stall therefore remains unexplained.
Product code, CPU placement, heaps and caches are unchanged; the frozen trace and bars are unchanged.
I added an offline checker that binds results to their bytes, source, slot and inputs, including actual reader activity.
V1, V2 and V3 were not run because the host gate stayed closed.
All owned containers, networks and volumes were removed before lease release; raw evidence is retained.

North star: P2 with exact local reads and strict clocks. Measured source `3f59403d`; checker `b6eedf1b`. [Assessment](HOST-GATE-3.json), [checks/evidence](CHECKS-3.md), [content/freshness/binding audit](AUDIT-3.md). Acceptance and pins are unchanged.

V0 latency controls: tags `tx2-dxt1-p3-v0-off-{a,b,c}`. Each is its own **off** context, with 10,000 subjects, the same frozen 200-second segment and 3,420 primary commits. Request collectors are off; common one-second resource sampling remains. No candidate speedup is inferred between sessions. Units ms; swap is median GiB. Quantiles are marginal and do not add.

| Control | Level | Host swap | Commit p50 | Commit p99 | Client transact p50 | Outside transact p50 | Gate <=12  |
| ------- | ----- | --------: | ---------: | ---------: | ------------------: | -------------------: | ---------- |
| A       | off   |    10.939 |     13.176 |     87.832 |              11.472 |                1.227 | miss       |
| B       | off   |     9.336 |     13.071 |     55.200 |              11.438 |                1.214 | miss       |
| C       | off   |     8.724 |     12.973 |    124.903 |              11.398 |                1.206 | miss; stop |

V0 capacity: `tx2-dxt1-p3-v0-memory-a`, off, host swap 11.064 GiB, resource diagnostic only. Guest memory 15.583 GiB; L256 minimum available 8.221 GiB across its 20-second phase, with 1,041,301 correct reads. All five cgroups had zero OOM counters and the guest used no swap. Oracle PASS: 37 reads / 1,927 entities, zero mismatches. Limits stayed PG/TX/GW-write/GW-read/driver = 2/4/3/3/8 GiB. **Long-pair memory is unverified.**

| V0 control | Guest minimum available GiB | Guest CPU busy % | Mac non-VM CPU median / maximum % | Samples above quiet limits |
| ---------- | --------------------------: | ---------------: | --------------------------------: | -------------------------: |
| A          |                       8.896 |           11.630 |                      50.5 / 203.0 |                    7 / 319 |
| B          |                       8.864 |           11.636 |                      40.9 / 318.2 |                    9 / 322 |
| C          |                       8.682 |           11.532 |                      43.6 / 223.8 |                   10 / 322 |

Host samples cover setup and execution. All controls passed quiet entry; B waited an additional nine minutes for call/recording activity to subside. Later CPU spikes remain in the evidence. Available observations cannot determine whether host scheduling, client work or downstream work caused the excess latency.

V1: no full default-level pair or table of commits over 50 ms. V2: no peer/transactor floor, reader addition, CPU-placement comparison or TypeScript wait split. V3: no verdict pair; P2 bars and P1/P3 retention have no fresh full-pair qualification. Next work is the gated full pair, then targeted full tracing of its largest cause.

Fresh checks: six focused Node tests pass; gateway preflight five tests / 21 assertions pass. The 1k summary smoke passed its oracle (50 reads / 3,449 entities, zero mismatches), with 83/83 commit coverage. All 453 registered JS roots have zero type/binding diagnostics; 124 inherited coverage gaps still block the full root check. Package suites/builds were not repeated because product code is unchanged.

Evidence: `$HOME/Claude/Projects/triplex-db-2/evidence/DX-T1/tx2-dxt1-p3-*`; 380 files have verified hashes, including 2,075,267 compressed trace bytes across these five bounded runs. The 1k viewer is `tx2-dxt1-p3-smoke-a/trace.html`; off controls have no layer timelines. Global locator: `evidence/TRACE-INDEX.md`. The independent readback verifies 64 assessment input digests and both oracle SHA chains; its initial count-check mistake and corrected check are retained. No engine tuning, seed changes, push or further benchmark run after V0's stop.

Commands to recheck these records and, once a new V0 control passes, run a full pair:

```sh
trace_base="$HOME/Claude/Projects/triplex-db-2/evidence/DX-T1"
node lab/trace/host-gate.mjs "$trace_base" 3f59403d87c87549399afea0b842c639a2dec389 tx2-dxt1-p3-v0-memory-a tx2-dxt1-p3-v0-off-a tx2-dxt1-p3-v0-off-b tx2-dxt1-p3-v0-off-c
node lab/bin/heavy.mjs --label DX-T1-checks -- node --test lab/trace/host-gate.test.mjs lab/trace/components.test.mjs
# After V0 passes: default full 900-second zero/ladder arms, with same-session off bookends.
bash lab/experiments/EXP-DX1/t1/study.sh tx2-dxt1-next-pair
```
