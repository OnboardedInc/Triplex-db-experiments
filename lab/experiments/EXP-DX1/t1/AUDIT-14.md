North star: P2 and P5 scale diagnosis, with exact population and durable acknowledgements preserved.

This is an observation audit, not a benchmark PASS or an independent review.

| Site producing a qualification or receipt | Content | Freshness | Binding |
| --- | --- | --- | --- |
| `first-100k.sh` completed-population guard | DONE, complete seed, closed-form assertion count and exact subject count | Fresh run tags refused by `run.sh`/`attempt.sh`; reads only after this child exits | Session head, explicit population and this arm's output path |
| `scale-observe.sh` collector admission | Existing trace manifest, administrative statistics only | Live measurement lease PID checked before each sample | DX-T1 lease prefix, run/source/slot and collector SHA256 retained |
| `scale-reading.mjs` diagnostic ingestion | Original compressed/decoded evidence seals verified; complete seed required; invalid or duplicate native totals refused | Fresh database/t referenced by this attempt's acknowledged trace; historical observations never promoted to a new verdict | Exact database hash/t, trace ID, source, slot, tag and raw/terminal SHA256 seals |
| Replica initialization deadline | Only the scope-open request gets 35s; its body, stored clock policy and all later read deadlines are unchanged | Actual first 100k reopen completed in 5.399/5.478s after that attempt's complete seed; regression uses a fresh HTTP listener | Both observer and follower call one helper; transport test checks exact request bytes and subsequent unchanged deadline |
| `memory-reading.mjs` / `scale-memory.sh` | Reads kernel current/peak/limit/events; absent counters remain null | Live exact lease before sampling; current existing driver ID unchanged afterward | Five exact cgroup paths from that driver's environment, run/source/slot, Linux boot clock, collector SHA256 and driver container ID |

The next 100k-only 16-GiB preset reduces the per-isolate old-space allowance from 6 GiB to 3 GiB inside the unchanged 7.5-GiB process cap. This is a fit hypothesis, not a memory or performance PASS; 10k/night defaults are unchanged. Before removing a driver, `run-in-vm.sh` now retains its actual State (including OOMKilled/ExitCode), any requested stop, and post-stop state; the original failed bootstrap has no terminal state and cannot be labelled a proven OOM.

Missing native observations remain unknown. Native durations can be counted by identity without claiming their location on an unqualified cross-process clock. Postgres deltas include samplers, indexing and heartbeat; they are not exact isolated application-transaction counts.

No acceptance contract, pinned target, frozen trace, night controller, v3 profile, durability setting or latency boundary is changed.
