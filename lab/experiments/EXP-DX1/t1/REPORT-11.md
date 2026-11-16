The simple external SQL pair is unsafe under Datomic’s existing retries; a safe general wrapper is not established.
INSERT and UPDATE borrow separately; after a paired rollback, Datomic retries only UPDATE and can publish a pointer to a missing chunk.
No wrapper, durability change or crash-safety claim is made; the menu’s 0.5–0.8 ms saving remains unmeasured.
Packing journal texts removes many datoms but almost no bytes: medium paired apply improves only 0.021 ms.
Combined shape C improves medium apply 14.6–16.7%, below the brief’s 30%; its durable median forecast improves about 0.091 ms.
Omitting change rows has the largest forecast, about 0.906 ms for medium commits, but loses their identities and is not exact as priced.
Append-only shape E adds three datoms and establishes no useful gain; packing alone will not close the median gap.
Nothing becomes default. H remains the reference; 100k cold-read pricing is unrun because its 17.50-GiB clone does not fit above the disk floor.

North star: P2 with P1/P3 exactness and durable acknowledgement preserved. [SQL safety/failure states](SQL-PAIR-11.md), [complete prices/method](REPLAY-11.md), [reader changes/ranking](LAYOUT-CHOICES-11.md), [evidence](EVIDENCE-11.md).

All native measurements: **full** tracing, current layout 3, exact local reads, strict server clock, split rule `pending`, timed source `f9a84dcb`; one zero/256/zero session. Mac CPU is summed non-VM percent (can exceed 100). Original offer-to-benchmark-finish clock stays authoritative.

| arm / control | all-primary p50/p99 ms | commits >50 ms / 3530 | swap GiB | Mac CPU p50/p99 % |
| --- | ---: | ---: | ---: | ---: |
| zero-before baseline | 12.298/50.234 | 36 | 3.994 | 17.3/96.3 |
| loaded; zero bookends | 13.293/70.566 | 91 | 3.994 | 15.0/109.1 |
| zero-after baseline | 11.943/48.326 | 29 | 3.994 | 16.0/111.9 |

Bookend mean 12.120/49.280 ms; drift 0.354/1.908 ms. These are calibration diagnostics, not a full pair or an A/B layout win. Loaded small/medium native peer p50/p99: 6.649/47.836 and 7.678/51.681 ms, under that loaded host row and those controls.

Pick 4: pinned-jar probe g reproduces separate connections on one thread and UPDATE-only retry; fake SQL, not a real Postgres crash. Original crash states are old pointer/no chunk, old pointer/durable orphan, or new pointer/durable chunk; atomic pairing may be safe only with retained/replayable INSERTs and ambiguous-COMMIT/CAS reconciliation. Background/index publishers also need ordering. The menu trigger disables synchronous commit and was not run. [Details](SQL-PAIR-11.md).

Pick 5: 300 successful primary payloads/arm, 100/band, five shapes × two rotated/reversed rounds = 9000 measured replays. Each uses its successful peer report’s exact immutable `db-before`; only `d/with` values change. Native basis unchanged. Warm replay CPU p50/p99: before 19.3/137.7%, loaded 14.1/144.1%, after 19.3/53.9%; swap 3.994 GiB throughout, same-session controls above.

| shape | datoms small/medium | canonical Fressian bytes small/medium | warm apply p50 ms small/medium | predicted PG commits small/medium | predicted zero p50 ms small/medium | predicted 256 p50 ms small/medium |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| A today | 41/61 | 10544.5/19582.5 | .474/.686 | 2.942/3.749 | 10.767/13.063 | 11.711/12.991 |
| B journal packed | 27/37 | 10465.5/19443.5 | .470/.650 | 2.935/3.737 | 10.754/13.039 | 11.698/12.963 |
| C B + clock/identity/retract/claim work | 26/36 | 10387.5/19315.5 | .443/.586 | 2.928/3.725 | 10.673/12.963 | 11.659/12.900 |
| D omit generated change rows | 30/40 | 4328.5/7278 | .326/.396 | 2.387/2.650 | 10.356/12.274 | 11.237/12.085 |
| E new owner-linked entities | 44/64 | 10644.5/19683.5 | .473/.702 | 2.951/3.758 | 10.779/13.077 | 11.661/13.008 |

Apply/size/PG columns use the loaded replay host row; zero forecasts average its full zero-reader bookends. 256 forecasts use the settled 45-s window (33 small, 11 medium), its native host row and controls. A is the measured baseline; every changed-layout durable number is a model, not a measured result. No new-layout p99 is predicted.
Current warm size slopes, before/loaded/after: service .087/.103/.103, peer .035/.036/.054, native apply .013/.013/.016 ms/added datom; bytes grow about 908.5/fact. Datoms and bytes co-vary. Model = baseline band p50 + paired apply delta + observational peer-minus-apply byte slope × byte delta; it omits reader reconstruction, cold reads and tail feedback. C’s estimated gain is inside global bookend drift.
Observed SQL write autocommits/Datomic tx: 3.490/3.419/3.495; WAL writes/tx 3.231/3.161/3.232, mean write .331/.458/.329 ms, under each native host/control row. Explicit WAL syncs zero because `open_datasync` flushes in writes; fsync, synchronous_commit and full_page_writes remain on. Background writes are included. Predicted PG counts = two fixed commits plus byte-proportional measured excess, not per-request observations.

B/C/E preserve sampled full typed row deltas, owner and add/retire intent; historical retirement coordinates and full query equivalence remain untested. C’s medium AVET visits fall 225.5→27. All 900 single-claim identities agree. D drops 7222 row IDs/cohort; an exact identity list alone averages 625.9 UTF-8 bytes/commit before framing/datoms. Feed, replica/bootstrap, pinned/history/current and arbitrary SPI compatibility need the changes in [the reader matrix](LAYOUT-CHOICES-11.md).
Illustrative ms saved per builder-week, medium: D exact variant at most .23 (4 weeks, conditional); C .046 (2); B .014 (2); E no positive gain (4). These are planning assumptions, not measured delivery times. New layouts require versioned storage, migration/fresh seeds and full reader/restart gates; none is built. Read-only 100k sizing found only 0.97–1.06 GiB above the 15-GiB floor; A/C/E cold-read comparison is an explicit gap.

Current-layout loaded oracle **PASS**: 443 commands, 37 reads, 1744 queries, zero mismatches/receipt violations; 8,565,810/8,565,810 model reads correct. Final 1000-subject smoke qualified all 3000 replay rows; gateway 21 tests/53,973 assertions. Normal package tests 320 passed, 51 external-service skips; package TypeScript passed. Whole-lab checkjs fails on two inherited export/root-list omissions; no whole-root/pack, new-layout differential/oracle, wrapper crash test or full verdict pair is claimed.
PASS/receipt audit sites: `sql_pair_probe.clj` + shell QUALIFY; `replay_capture.clj`; `layout_replay.clj` selection/delta/completion; `layout-replay.mjs` prepare/qualify; gateway selftest; `layout-calibration.mjs`; `layout-price.py`; input-audit/seed-size qualifiers; compression/evidence seals. Each content/freshness/source-slot-input check and each limit is listed in [AUDIT-11.md](AUDIT-11.md). Zero changed-path acceptance references; acceptance untouched, no pins changed. All owned containers/volumes removed and measurement lease released.

```sh
node lab/bin/heavy.mjs --label DX-T1-p11-safety -- bash lab/experiments/EXP-DX1/t1/sql-pair-probe.sh tx2-dxt1-my-safety
node lab/bin/heavy.mjs --label DX-T1-p11-replay -- bash lab/experiments/EXP-DX1/t1/replay-session.sh tx2-dxt1-my-replay
node lab/bin/heavy.mjs --label DX-T1-p11-collect -- node lab/trace/layout-calibration.mjs "$HOME/Claude/Projects/triplex-db-2/evidence/DX-T1" tx2-dxt1-my-replay
node lab/bin/heavy.mjs --label DX-T1-p11-price -- python3 -I lab/trace/layout-price.py "$HOME/Claude/Projects/triplex-db-2/evidence/DX-T1/tx2-dxt1-my-replay-session/calibration.json" "$HOME/Claude/Projects/triplex-db-2/evidence/DX-T1/prices-new.json"
```
