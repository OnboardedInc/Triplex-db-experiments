# Part 11 observation audit

No scorecard or acceptance PASS is claimed. `lab/acceptance/` is unchanged. North star: P2 with atomicity, exact reads and durable acknowledgements preserved.

| Observation-to-result location | Content | Freshness | Binding |
| --- | --- | --- | --- |
| `sql_pair_probe.clj`, connection/retry assertions and `-main` | Executes the pinned jar's actual borrow/close and per-statement retry methods; checks original chunk present versus rolled-back-pair chunk absent, both return revision 1. Fake SQL is explicit. | New isolated process and fresh atoms for each case; timestamps bracket invocation. | Run/source environment, exact current source-file hashes in request; original jar is separately sealed. No engine correctness claim. |
| `t1/sql-pair-probe.sh`, `QUALIFY` | Requires one schema-bound record, exact SQL shapes, six borrow/prepare/close events, one INSERT plus two UPDATEs and both expected chunk states. | Rejects output outside this request's start/end/current time; new tag; verifies source files unchanged. | Checks exact run/source, request/output SHA256, source-file hashes and DX-T1 lease. Container removed before lease release. |

The probe's synthetic fault is not a real SQL/crash/restart test. An exit zero qualifies only this counterexample, never a safe wrapper or an oracle. Original and pairing failure states and the unmeasured saving are in [SQL-PAIR-11.md](SQL-PAIR-11.md).
