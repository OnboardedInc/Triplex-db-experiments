North star: runnable P1–P4 verdicts with adequate commit denominators and quiet transactor counters. No daytime 10k performance verdict.

Canonical evidence is `~/Claude/Projects/triplex-db-2/evidence/DX-T1/`. Verify the committed `EVIDENCE-13.SHA256SUMS` from that directory. Raw data remains private; no old run was deleted or changed.

| Path relative to that evidence root | What it proves |
| --- | --- |
| `tx2-dxt1-p13-smoke-a/` | Original source `900dd57b`: fresh 1k summary/early-JIT smoke, exact local reads and `pending` split rule. 9,850,789 correct model reads; independent oracle PASS, 50 reads/3,538 entity queries/336 commands, zero mismatches. Original report and raw seals verify. |
| `p13/native-proof.json` | Validates the report, receipt/oracle counts, source/slot, cache 393,531 requests/390,417 hits, nine completed basis advances, zero drops, all three JVMs' WARN levels and effective compile threshold 0.1. The three product tracing files still match the smoke's source preimages. |
| `p13/plan-final.json`, `night-plan-final.json` | Fresh `ns-v3/2` preflight; unchanged 7200-s trace; 5910-s offered plan, 18 cycles, exact planned counts and the declared sparse large band. No engine started. |
| `p13/host-daytime-a.json`, `.log` | Passive gate refusal: swap 13.166 GiB, interval non-VM CPU median 133.2%, named apps open. Unit fixtures prove the four quiet conditions pass despite unavailable/abnormal optional diagnostics. |
| `p13/datomic-unit-final2.log`, `.exit` | Current source `8f060202`: 361 package tests passed, 52 external skips, exit 0. Native gateway selftests 24/53,994 assertions and trace tests 8/47 are in the original smoke folder. |
| `p13/datomic-types-final.*`, `checkjs-focused-d.*`, `lint-c.log` | Package types, eight focused JS roots including unsuppressed binding checks, and changed night/counter-file lint passed. Broader touched-file lint has one inherited `report.mjs` style warning. No root-check or pack PASS is claimed. |
| `p13/NIGHT-PREVIEW.md` | Actual summary renderer with the sealed historical H reference and empty current columns; explicitly a preview, not a run. |
| `p13/replay/tx2-dxt1-p13-smoke-a/`, `replay-proof.json` | Derived render from copied sealed original bytes, no fresh native/oracle claim. Complete trace, unchanged coverage 3520/3522≥95%, nine clock-bound adoption intervals; Chrome includes their overlaps. No registration or canonical overwrite. |
| `p13/replay-argument-output/`, `replay-render-a.log` | First render exposed positional flag parsing; its unintended copy destination was moved losslessly here. Corrected flags-only replay and its regression pass; original source seals still verify. |
| `p13/day-night-refusal.*`, `final-owned-inventory.*`, `disk-final.txt` | Day launch refuses before 19:30 with exit 75; no DX-T1 containers/volumes/networks or measurement lease remain. Final free space 63.327 GiB. |

Earlier unit fixture/Node-type configuration failures remain in `p13/datomic-unit-a.log` and `checkjs-focused-a.log`. They were corrected before the passing checks; no native oracle failure was hidden. [Content/freshness/binding audit](AUDIT-13.md), [unchanged acceptance and pin delta](PINS-13.md).
