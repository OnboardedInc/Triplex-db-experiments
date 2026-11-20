# Prepared writer on one and two gateways

Doubling grouped gateways cut goodput by **43%** at 394 offered, from 181.7 to 102.8 saves/s. Durable saves per append collapsed from 7.99 to 1.02. Doubling prepared gateways raised goodput by 23%, from 111.1 to 136.7 saves/s, with 1.00 saves per append and zero replans. At 620 offered, prepared goodput stayed near 139/s. These are one-database readings.

All completed arms reopened the same ten-account 16,245,050-fact seal at `7ca8525a9`. Each row has 144 seconds of offers. K enables grouping with live priority. S uses direct prepared writes. The newer fair-credit ingress was absent. K puts solo first and normal S puts loaded first. Within each policy the one-to-two gateway comparison uses the same order. The already-running one-gateway S mirror finished in the opposite order. The other repeats and all four-gateway runs were cut.

| Arm | Gross offered/s | Offers | In-window ACK/s forecast / actual | Expired | Worst-account p99 forecast / actual (ms) | Quiet solo → loaded p99 (ms) | Quiet ratio forecast / actual | Durable saves / append |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1-0-K | 50 | 7,200 | 50 / 50.0 | 0 | 30.0 / 312.9 | 90.9 → 221.1 | 4.20× / 2.43× | 1.232 |
| 1-0-K | 235 | 33,840 | 235 / 179.5 | 7,715 | 30.0 / unavailable | 119.0 → 341.2 | 13.76× / 2.87× | 7.975 |
| 1-0-K | 394 | 56,736 | 255 / 181.7 | 30,303 | 77,739.2 / unavailable | 36.7 → 294.5 | 14.53× / 8.03× | 7.988 |
| 1-0-K | 620 | 89,280 | 255 / 171.9 | 64,276 | 204,086.5 / unavailable | 54.4 → 312.3 | 22.00× / 5.74× | 7.996 |
| 1-1-S | 50 | 7,200 | 50 / 50.0 | 0 | 27.3 / 1,568.4 | 107.5 → 1,568.4 | 1.11× / 14.59× | 1.023 |
| 1-1-S | 235 | 33,840 | 235 / 140.6 | 13,351 | 27.5 / unavailable | 63.3 → 1,168.5 | 1.19× / 18.47× | 1.018 |
| 1-1-S | 394 | 56,736 | 383 / 111.1 | 40,485 | 4,122.4 / unavailable | 17.0 → 1,474.1 | 1.22× / 86.53× | 1.002 |
| 1-1-S | 620 | 89,280 | 383 / 140.1 | 68,903 | 88,244.3 / unavailable | 66.0 → 1,571.7 | 1.26× / 23.80× | 1.000 |
| 1-2-S | 50 | 7,200 | 50 / 50.0 | 0 | 27.3 / 443.6 | 97.8 → 349.1 | 1.11× / 3.57× | 1.033 |
| 1-2-S | 235 | 33,840 | 235 / 126.7 | 15,349 | 27.5 / unavailable | 202.6 → 1,235.8 | 1.19× / 6.10× | 1.003 |
| 1-2-S | 394 | 56,736 | 383 / 114.3 | 40,061 | 4,122.4 / unavailable | 59.4 → 1,709.0 | 1.22× / 28.76× | 1.003 |
| 1-2-S | 620 | 89,280 | 383 / 132.4 | 70,004 | 88,244.3 / unavailable | 57.9 → 1,707.6 | 1.26× / 29.51× | 1.000 |
| 2-0-K | 50 | 7,200 | 50 / 50.0 | 0 | 30.0 / 813.1 | 117.5 → 465.6 | 4.20× / 3.96× | 1.004 |
| 2-0-K | 235 | 33,840 | 235 / 124.5 | 15,705 | 30.0 / unavailable | 106.4 → 964.4 | 13.76× / 9.06× | 1.004 |
| 2-0-K | 394 | 56,736 | 255 / 102.8 | 41,717 | 77,739.2 / unavailable | 58.3 → 1,611.3 | 14.53× / 27.64× | 1.015 |
| 2-0-K | 620 | 89,280 | 255 / 118.6 | 72,010 | 204,086.5 / unavailable | 60.2 → 1,045.8 | 22.00× / 17.37× | 1.013 |
| 2-1-S | 50 | 7,200 | 50 / 50.0 | 0 | 27.3 / 1,492.7 | 129.0 → 1,492.7 | 1.11× / 11.57× | 1.033 |
| 2-1-S | 235 | 33,840 | 235 / 161.5 | 10,275 | 27.5 / unavailable | 20.8 → 1,219.9 | 1.19× / 58.58× | 1.026 |
| 2-1-S | 394 | 56,736 | 394 / 136.7 | 36,819 | 28.0 / unavailable | 57.5 → 1,503.7 | 1.22× / 26.14× | 1.005 |
| 2-1-S | 620 | 89,280 | 620 / 138.8 | 68,968 | 28.4 / unavailable | 60.2 → 1,878.0 | 1.26× / 31.21× | 1.002 |

The high-rate complete-cohort p99 is unavailable because offers expired. Quiet p99 uses all 504 expected receipts per window. Native append counts include durable receipts during the drain. At 394 offered, K had 26,433 and 15,019 durable receipts with one and two gateways. S had 16,251 and 19,917. The in-window rate excludes late ACKs.

| Arm | Solo p99 forecast (ms) | Solo p99 actual at 50 / 235 / 394 / 620 dose (ms) | Solo ACK/s forecast / actual |
| --- | ---: | ---: | ---: |
| 1-0-K | 10.0 | 90.9 / 119.0 / 36.7 / 54.4 | 3.5 / 3.5 each |
| 1-1-S | 8.8 | 107.5 / 63.3 / 17.0 / 66.0 | 3.5 / 3.5 each |
| 1-2-S | 8.8 | 97.8 / 202.6 / 59.4 / 57.9 | 3.5 / 3.5 each |
| 2-0-K | 10.0 | 117.5 / 106.4 / 58.3 / 60.2 | 3.5 / 3.5 each |
| 2-1-S | 8.8 | 129.0 / 20.8 / 57.5 / 60.2 | 3.5 / 3.5 each |

All completed arms used G1. The following counts come from each accepted arm's actual container readback. The two writers shared the same four physical cores and the same total heap budget as the single writer. Their rows do not represent eight independent writer cores.

| Arm | Transactor cores | Write gateway cores | Read gateway cores |
| --- | ---: | ---: | ---: |
| 1-0-K | 1 | 4 | 1 |
| 1-1-S | 1 | 4 | 1 |
| 1-2-S | 1 | 4 | 1 |
| 2-0-K | 1 | 4 / 4 | 1 |
| 2-1-S | 1 | 4 / 4 | 1 |

All JVM pause and safepoint clocks, per-offer gateway stages, native apply and durable append clocks, and loaded gateway flags are in the compressed Mac evidence under `evidence/DX-BM1/day-n20/prep1-tenant`. Summary and raw bundles are 58,404,322 and 19,969,614 bytes. The campaign seal and raw evidence remain on the bench. [Evidence hashes](SHA256SUMS)
