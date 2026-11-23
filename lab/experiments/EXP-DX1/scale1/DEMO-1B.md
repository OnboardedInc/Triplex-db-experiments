# Demo proving slot on the 1 billion database

Run on Server 2 on 2026-11-23 between the aged scorecard and failover, from `exp/DX-DEMO1-billion-demo` at `5f9c3050f` (`demo/PROVING-SLOT.md`). The examples file the proof rewrote is pushed as `3c3b5ab86` on that branch.

**Result: PROOF PASSED, 17 calls, 18 checks, 12 tools, against the sealed cut (head 28,309,866, 1,000,251,169 records, t 62,888,918).** No check failed. The change feed across the loader's history did not throw a journal-position or row-header error, and the gateway refused the protection declaration of example 14, as on the toy.

## Bring-up

`server-up.sh` on Linux for the first time: bootstrap 0 s, handoff check 0 s, copy of the 176 GB cluster 122 s, stack start 33 s, identity 14 s (including the in-container scorecard check), **169 s in total** against a predicted 8–14 min. Node came from the server's bootstrap build `tools/bin`. `connect.sh` took 3 s (tunnel round trip 80.5 ms); `server-down.sh --delete-work` took 18 s and deleted the working copy. The held original was never started.

## Gateway time per call

| # | Tool | Gateway ms | Round trip ms | Predicted gateway ms |
| ---: | --- | ---: | ---: | --- |
| 1 | `database_summary` | 0.91 | 145.51 | 1–5 |
| 2 | `list_accounts` | **220.64** | 349.76 | 5–60 |
| 3 | `find_people` | 25.61 | 229.95 | 5–80 |
| 4 | `read_person`, cold | 30.09 | 179.03 | 30–400 |
| 5 | `field_history` | **4,404.67** | 5,020.47 | 5–100 |
| 6 | `read_person_at` | 24.13 | 262.10 | 30–500 |
| 7 | `save_facts` | 448.24 | 1,316.19 | 50–400; first save up to 2,000 |
| 8 | `field_history` | **225.21** | 603.26 | 5–100 |
| 9 | `change_feed` | 19.48 | 386.69 | 5–100 |
| 10 | `change_feed` | 1.95 | 178.79 | 5–100 |
| 11 | `correct_past_value` | 46.28 | 616.50 | 50–400 |
| 12 | `read_person_at` | 25.11 | 198.50 | 30–500 |
| 13 | `retire_fact` | 31.67 | 679.02 | 50–400 |
| 14 | `remove_on_request` (refused, as predicted) | 0.17 | 187.79 | refused |
| 15 | `read_many_people` | 100.90 | 373.20 | 100–1,500 |
| 16 | `read_person`, warm | 1.84 | 191.23 | 2–20 |
| 17 | `database_summary` | 0.18 | 62.06 | 1–5 |

**Outside the predictions:** `field_history` took 4.4 s the first time and 225 ms the second, and `list_accounts` took 221 ms; all three were predicted under 100 ms. The warm read (1.84 ms) and the first save (448 ms, within the first-save allowance) were inside the ranges. `field_history` reads a field's history across the loader's 28 million positions, which fits the pinned-read diagnosis in `rd1/PINNED-1B.md`; that is an inference, not measured here.

Evidence: `evidence/DX-DEMO1/demo-1b-server-2026-11-23.tar.gz` in the private evidence folder (SHA-256 `3424b06bf574f81c91555208d25e552aaebed7942a44b6e38dd1877a6e98e788`), with `proof-1b.json` and `proof-1b.log` beside it.
