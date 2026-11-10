# DX-H6 progress at second source revision

North star: P5 activation, preserving exactness and P1/P2 live latency.

- `record2`: immutable actual 16-page capture, 1,000 golden subjects, 97.65 MB responses; cleanup complete.
- `sweep1000b`: all prior complete gates G0/G1/G2/G3/G5/G7/G9 PASS; 807 independently verified deliveries, 1,000 exact coverage, completed-cursor resume. ACK wall 3.358359 s (297.76 subjects/s), verification wall 8.399100 s, peak 1,580,769,280 bytes. Existing incomplete G4/G6/G8 remain incomplete. O2 rate missed. Cold first-prefix live ratios are explicitly diagnostic.
- Common-layout package refinement: warm median 0.483181 decode / 0.321557 world / 0.121263 kernel / 0.039037 handover CPU s/1k; first decode pass 0.505389. Every recorded world/output/record byte matches. 15 package tests passed/1 skipped; 4 pipeline/publication/live tests passed; targeted TypeScript passed.
- `seed-probe1`: stopped at reference command 3 ACKed at position 18, window16. No window qualified. New public-onSent submission barrier keeps earlier ACKs in flight and is unit-tested; real engine rerun remains required.
- Warm live-window revision starts sweep workers before baseline and uses equal explicit 15-second generator warmups for both arms. New engine profiling remains pending.
- No 10k seed/sweep or final storage projection qualification yet. No acceptance claimed.

Final disposition belongs in REPORT.md. All failures and original receipts remain durable.

## Final disposition

This file's earlier entries are snapshots. See [REPORT.md](REPORT.md) and [EVIDENCE.md](EVIDENCE.md) for the final results: latest1k223.31 subjects/s, seven complete gates PASS/overall PARTIAL;10k434,768 ACK positions ordered but no completed G0; no10k sweep; no retained H6 resources. The latest offline decode/world budgets miss. No acceptance claimed.
