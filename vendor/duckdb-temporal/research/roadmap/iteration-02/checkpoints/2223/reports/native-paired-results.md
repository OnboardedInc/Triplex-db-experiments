# Matched native SQL full-fetch results

Candidate/accepted ratios; >1 is slower. All42 pairs retained. Primary includes complete fetch/strict decoding, not persisted-store or pure evaluator time.

| Workload | Old ms | New ms | Median paired ratio | Bootstrap95 interval | Round ratios | Signal |
|---|---:|---:|---:|---|---|---|
| typed_ingestion_tiny | 2.4699 | 2.5287 | 1.0029 | [0.9764,1.0446] | 1.0089/0.9966 | False |
| typed_ingestion_selective_8000 | 6.7750 | 6.8009 | 0.9774 | [0.9477,1.0302] | 0.9764/0.9811 | False |
| typed_output_wide_2000 | 38.2503 | 36.1530 | 1.0227 | [0.9443,1.0537] | 1.0076/1.0251 | False |
| typed_long_strings_256 | 6.8101 | 6.5553 | 0.9686 | [0.9167,1.0476] | 0.9483/0.9740 | False |
| typed_heterogeneous_numeric_2048 | 12.6193 | 12.7454 | 0.9888 | [0.9244,1.0443] | 0.9895/0.9882 | False |
| typed_selective_join_2000 | 3.2181 | 3.2585 | 0.9967 | [0.9461,1.0519] | 1.0360/0.9735 | False |
| typed_chain_64 | 12.6738 | 13.2825 | 1.0491 | [0.9716,1.1034] | 1.0535/0.9869 | False |
| typed_branch_tree_126 | 5.5314 | 5.6682 | 1.0288 | [0.9965,1.1111] | 1.0314/1.0009 | False |
| typed_cycle_48 | 13.6832 | 13.9097 | 0.9965 | [0.9615,1.0979] | 1.0003/0.9655 | False |
| typed_duplicate_join_8000 | 3.9376 | 4.2165 | 0.9929 | [0.9550,1.0920] | 0.9875/1.0077 | False |
| legacy_string_output_4000 | 8.8735 | 8.7144 | 0.9848 | [0.9379,1.0583] | 0.9768/0.9863 | False |
| legacy_chain_64 | 5.1390 | 4.9428 | 0.9923 | [0.9575,1.0724] | 1.0582/0.9868 | False |
