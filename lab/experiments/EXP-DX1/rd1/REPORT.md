# DX-RD1 part 3
The biggest delay came after the gateway finished sending its response and before the reader handled it.
That stage averaged 624 of the 729 milliseconds outside the gateway. It dominated 133 of 144 sampled misses.
Recorded reader work or garbage collection overlapped about half of that time. The remaining delay has no direct measurement of its cause.
The weighted test had one reader. Its four sampled misses spent their extra time mostly processing the answer.
The separate worker moves decoding and observation away from local readers. Batching and retained history cut the number of replies.
The revised forecast for the 192 MiB closure alone is 3,900–5,400 weighted pulls per second and a stress ratio of 0.45–0.65.
The new Mac comparisons are queued. The archived measurements and forecasts are available now.

North star P1 and P4. Exact concurrent reads and the weighted pull path. The activity-based history accounting is the P7 diagnostic. [Scope](../../../SCOPE.md) · [North star](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md)

### Archived p3r

1. Cohort. There were 144 fixed-ID non-oracle, non-straddle misses in the fourteen slow 1,024-seat blocks, with 274 matched HTTP exchanges and 130 repair exchanges. All 274 have request write, headers and body-end marks. 217 headers arrived at the Node callback at least 50 ms after the gateway finished. The mean full miss was 831 ms. Of 729 ms outside the gateway, 624.1 ms was gateway-finish to headers, 38.7 ms between exchanges, 38.2 ms from the Node write callback to native entry, 13.3 ms before first and after last HTTP, 8.0 ms in socket queue and write, and 6.9 ms reading the body. Native admission was 99.5 ms and admitted work was 1.33–2.02 ms per miss.
2. Attribution. Same-isolate synchronous work or GC overlapped 258 exchanges and 301 ms per miss in that 624 ms interval. GC overlapped 257 exchanges and 131 ms per miss. The timestamp is Node's callback, so the uncovered part can include delivery or scheduling. Exact socket reuse, connect time, head-of-line delay, per-response bytes and the pre-read seat queue were absent from the trace. The archived code has a persistent HTTP agent with 512 sockets per reader client and no separate fallback seat gate. The logged encode, parse and primary decode spans are censored below 0.5 ms. Observation spans covered 108/144 misses and averaged at least 5.08 ms. Repair ingestion sits partly in the inter-exchange gap. Independent model verification ran later and has no per-miss span.
3. Weighted and forecast. The four sampled weighted misses used seven exchanges including three repairs. Native wall averaged 3.00 ms, external time 4.45 ms, and the interval from final HTTP to read finish 3.79 ms. Callback delay after gateway finish was near zero. This small sample supports coverage and reuse for weighted reads. A single seat still waits for the isolated worker's decode and IPC. For a scope aged like p3r, forecast closure 192 at 3.9–5.4k weighted and 0.45–0.65 stress, or closure plus isolated install at 4.1–5.9k and 0.52–0.80. The combined range assumes fewer obsolete-cut exchanges. Early-scope smoke rates and an overloaded driver need their own interpretation.

### Diagnostics and handoff

4. Mac plan. `miss-probe.ts OUTPUT auto 2 128 part3` in the owned trace image runs mirrored off/install curves at 0/0.5/1/2/5%, then the 64/192/512 MiB packed replay, then the low/old/install recovery comparison. The off arm uses the public reach composition. History budget results measure the packed index with synthetic 24 KiB replacements and the frozen offer trace. Each native answer is checked at its exact requested cut. [Part 2 report at `0eb2e0f0f`](https://github.com/OnboardedInc/Triplex-db-experiments/blob/0eb2e0f0f/lab/experiments/EXP-DX1/rd1/REPORT.md)
5. Handoff. [Server 1 diagnostics](SERVER1.md) will publish the bounded pair and writer commands. Full-profile gates and write-gateway allocation attribution remain open.
6. Audit. Archived analysis checks source, run, slot and boot on both clocks, then joins each HTTP parent and response ID and verifies the time sums. It hashes the analyzer, report and clock reference. Archived events are explicitly historical. Native comparisons use a fresh scope, owned slot, exact receipt model and exchange census. The packed replay checks the exact selected version and content at every locally covered cut. Unit regression checks the exact result and fixture bytes before using its throughput ratio.

Evidence is under `evidence/DX-RD1/part3`. [SHA256SUMS](SHA256SUMS)
