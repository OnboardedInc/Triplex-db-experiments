# Guarded reads and saves before the changes

`p3-attribution-b` ran unguarded then guarded on the Mac under one ordinary heavy token. Both arms used the same 15,032-fact fixture shape, 500 verified saves, four pinned readers, and zero erasures. The guarded arm declared a protected string field. This diagnostic profiles the logical guard before encryption. It retained 9,379 and 4,498 measured Reach calls and all 500 save calls from each arm. [Evidence hashes](P3-ATTRIBUTION-SHA256SUMS)

| Stage (p50 / p99 in ms) | Unguarded | Guarded |
| --- | ---: | ---: |
| Pinned read, end to end | 6.25 / 124.59 | 43.28 / 369.11 |
| Read, SDK wait for first byte | 5.42 / 121.90 | 34.98 / 336.63 |
| Read, gateway route | 0.81 / 29.39 | 1.74 / 54.27 |
| Read, current frontier | 0.10 / 4.46 | 0.24 / 9.46 |
| Read, protected inline rendering | — | 0.30 / 10.74 |
| Read, SDK decode and cache | 0.12 / 0.70 | 5.34 / 61.58 |
| Save, end to end | 34.37 / 537.77 | 99.10 / 936.54 |
| Save, SDK wait for first byte | 32.57 / 524.57 | 96.35 / 934.97 |
| Save, gateway route | 24.22 / 493.82 | 36.90 / 688.22 |
| Save, native peer wait including ordering, transport and storage | 20.89 / 469.09 | 30.11 / 684.53 |
| Save, first frontier and native verification (separate medians) | 0.11 and 0.01 | 0.21 and 0.04 |
| Save, second frontier and native verification (separate medians) | — | 0.13 and 0.03 |
| Save, writer-lock acquisition | — | 0.08 / 4.51 |
| Save, prepare and validate | 1.13 / 33.32 | 1.27 / 36.66 |

Guarded/control ratios were 6.93× / 2.96× for reads and 2.88× / 1.74× for saves. Median Reach bodies were 1,428 B and 39,592 B. Save bodies were 7,442 B in and 370 B out in both arms. The direct read decode increase was 5.21 ms at the median. The largest save shifts were in first-byte wait and inside native peer wait. The lock, duplicate authority read and row validation were comparatively small. The traced Mac run had much longer tails than the earlier untraced run. These timings overlap and the one AB pair cannot separate native CAS cost from shared load or host drift.

## Predictions recorded before the patch

| Change | Predicted saving and test |
| --- | --- |
| Reuse protected closure references when data position, native cut and erasure sequence all match | Remove about 38 KB from a warm reply in this fixture, saving 4.5–5.3 ms median in traced SDK decode and 0.2–0.5 ms in gateway rendering. Warm Reach body bytes should match the unguarded arm. In the prior untraced four-reader workload, expect to recover 10–15 ms of the 14.86 ms read median gap. |
| Reuse encoded native rows for cold inline replies when the cut cannot change them | Save about 0.1–0.3 ms median in rendering for the fixture. Check byte parity for unaffected entities after an erasure as well. This applies to inline misses, so it does not add to the warm-reference estimate. |
| Read and verify the write frontier once under the existing lock | Save 0.10–0.25 ms median and roughly 1–6 ms p99 within the authority stages. Keep the native fence and the same lock for derived deliveries until the one-database writer can fence their inputs itself. |
| Reduce Reach load while saves run | In the earlier untraced four-reader workload, predict a 10–20 ms rescue of the 21.42 ms save median gap and 15–30 ms at p99. Run the guarded/control save comparison with and without readers to separate contention from any remaining direct write cost. |

The 5% median and 1.10× p99 bars apply on bare metal, with surrounding controls, both before erasure and for bystanders after an erasure. Check the same pinned bodies and rerun the thirteen native route checks. The Mac traces indicate where to change the code.

## Evidence checks

The local runner checks actual save receipts against the exact submitted facts and positions, checks pinned reader answers against the seed, and reads back the terminal write and command. It binds the fresh native attempt, driver exit and cleanup to source and compiled inputs, slot, container IDs and nonce. This analysis joined each SDK response trace ID and parent to its gateway response, checked status, bound both arms' traffic to that same nonce and input digest, and checked the retained traces for truncation and terminal recorder failure. It emits descriptive stage counts and quantiles. The six local HTTP regressions compare exact markers, reference eligibility and retry ordering using a new listener and scripted sequence per test. None of these observations is a timing verdict.
