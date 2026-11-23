# Java 21 and 25 SQL failure investigation

The matched run used source `10d6f833b`, identical Datomic distribution and gateway bytes, G1 on all three processes, one core per JVM and fresh owned SQL volumes. Only the JDK and its Java 25 compatibility flags differed. The original Java 25 run used ZGC, a five-second Vitest deadline and an overall four-minute timeout. Its output ended before the failure details. All Mac elapsed times are diagnostic.

| Original failed assertion | Java 21 G1 | Java 25 G1 | Diagnosis |
| --- | --- | --- | --- |
| Speculative inserts and retractions | Passed | Outcome deadline | The adapter fixture waited one second for an acknowledged or resolved commit. The original run also hit the outer five-second test limit here. |
| Nested rollback preserves the parent | Passed | Outcome deadline | Same one-second fixture budget. |
| Duplicate command returns its original transaction ID | Outcome deadline | Outcome deadline | Same deadline on both versions. |
| Signed zero, int64 and canonical integers | Outcome deadline | Outcome deadline | Same deadline before all assertions finished. |
| Replay-safe callback after a scope conflict | Outcome deadline | Outcome deadline | Same deadline before the retry assertions finished. |
| Speculative Datalog delta | Outcome deadline | Outcome deadline | Same deadline before the final result. |
| Logical cuts and mixed timestamps in one native commit | Outcome deadline | Outcome deadline | Same deadline before cut verification. |
| Four workers order 2,000 public commands | Passed after path fix | Passed after path fix | The original package runner resolved the worker relative to its current directory. The exact invocation reproduced `MODULE_NOT_FOUND` before starting any JVM operation. Both patched runs verified all cuts, with zero clock replays and no declines. |

Every adapter failure above in the matched run raised `WriteError` with `Datomic outcome resolution deadline exceeded`. Java 21 G1 and Java 25 ZGC reruns with ten seconds cleared the first two failures. The next five still failed on both versions after the injected-deadline case. Its stub never called the client's `onSent` callback and never completed its promise. The process-wide ordered sender therefore kept a ticket marked `sending` until process exit. The later tests were waiting for that ticket, across scopes and clients. Real HTTP dispatch calls `onSent` at the send boundary and settles its promise.

The fixture now allows ten seconds for real SQL commits and keeps its explicit 200 ms unknown-outcome test. The stub signals dispatch, withholds the result through the deadline and settles during cleanup. This changes no SDK or gateway deadline and relaxes no content assertion. The diagnostic runs use a 30-second Vitest cap for the short tests and retain the clock test's original explicit assertion budget. Each attempt captures the same role identities before and after the tests and checks for owned resources at teardown. A failed first boot also exposed the preflight's missing codec mount with direct tracked source.

On `b3a6266aa`, all 12 tests passed on Java 21 G1, Java 25 G1 and Java 25 ZGC. Each clock run checked 2,000 ordered receipts and both read paths at every receipt, with zero replays and no declines. The three attempts verified the serving process identities and removed all their resources. Evidence is compressed in `evidence/DX-JVM1/part3/matched-sql.tar.zst` with an internal manifest and an [outer hash](SHA256SUMS). This covers the eight original failures and four adjacent cases. The complete opt-in SQL suite remains a separate gate.
