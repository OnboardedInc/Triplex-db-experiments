# Menu reproduction on saved C, A and F

The three exact Appendix A scripts were extracted from the menu Git blob and run with `python3 -I`, after verifying the original raw and decoded oracle archives. These are historical observations, not fresh benchmark or oracle PASS. The six original source/run/slot identities and frozen digest `aa8a7636ff027ab3` are checked; each primary denominator is 7408. Private scripts, original outputs, menu source and SHA256SUMS: `evidence/DX-T1/p10-reproduce/`.

| run | timer lateness median ms | after-ACK median ms | slow burst / growth / sparse | small idle premium ms | medium idle premium ms |
| --- | ---: | ---: | --- | ---: | ---: |
| C zero | .664 | .399 | 69 / 18 / 4 | 3.43 | 3.56 |
| C loaded | .693 | .407 | 68 / 16 / 12 | 2.56 | 3.03 |
| A zero | .643 | .375 | 47 / 15 / 7 | 3.42 | 3.78 |
| A loaded | .658 | .408 | 101 / 15 / 28 | 2.94 | 3.48 |
| F zero | .606 | .376 | 49 / 15 / 6 | 3.77 | 3.17 |
| F loaded | .603 | .412 | 77 / 17 / 37 | 3.02 | 3.12 |

Idle premium compares the menu’s service medians at gaps 250–1000 ms against 0–50 ms, within the same arm. Every key finding reproduces: lateness .60–.69 ms, loaded post-ACK cost .41 ms, growth counts 15–18 and the idle premium about 2.6–3.8 ms. Across zero and loaded arms post-ACK medians span .375–.412 ms, rather than uniformly .41. Sparse counts match exactly. These associations do not establish what causes the idle or disk penalty.

| loaded arm | small L256 today / corrected ms | medium L256 today / corrected ms | small burst today / corrected ms | medium burst today / corrected ms | all-primary p99 today / corrected ms |
| --- | --- | --- | --- | --- | --- |
| C | 11.21 / 9.46 | 13.83 / 12.20 | 9.79 / 8.51 | 12.08 / 10.43 | 55.6 / 50.6 |
| A | 11.37 / 9.83 | 14.92 / 13.20 | 9.61 / 8.34 | 11.72 / 10.22 | 71.0 / 67.0 |
| F | 12.19 / 11.03 | 13.78 / 12.22 | 9.61 / 8.52 | 11.80 / 10.42 | 67.2 / 62.0 |

These are the menu’s untrimmed windows, Python median and script-3 p99 index; they intentionally differ from the settled, histogram-based authoritative verdict. “Corrected” is ACK minus scheduled time minus scheduler-late intervals. It removes real late event-loop/GC time too: it is a counterfactual, not a reclassification of any old miss. The new benchmark preserves today’s verdict and prints actual ACK-only alongside that diagnostic.
