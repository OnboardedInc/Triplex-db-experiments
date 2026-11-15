# Part 8 experimental slim rows

Source 5e9e1ad3. Fresh 1,000-subject zero-reader full-level current/slim/current session `tx2-dxt1-slim-size-a`; each arm is the same frozen 200-second diagnostic. Actual images, caps, JVM/Node settings, source hashes, workload digest, sequential clocks and physical versions 3/4/3 match; only the observed slim flag differs. This is a cost test, not a full verdict. All three DONE with zero errors/violations; zero-arm oracle is NOT-RUN. Exactness is separately gated below.

| current / slim / current | opening current | slim candidate | closing current |
| --- | --- | --- | --- |
| primary p50 / p99 ms | 11.490 / 44.626 | 12.679 / 47.315 | 11.687 / 46.824 |
| native peer p50 / p99 ms | 5.855 / 30.678 | 6.901 / 29.807 | 5.868 / 28.999 |
| native apply p50 / p99 ms | 1.330 / 13.300 | 1.860 / 13.000 | 1.330 / 12.400 |
| authored function p50 / p99 ms | 0.790 / 9.190 | 1.270 / 10.390 | 0.780 / 8.940 |
| swap GiB / Mac CPU median,p99 % | 4.124 / 9.8,72.5 | 4.124 / 9.9,93.6 | 4.124 / 10.5,107.9 |

The candidate adds 1.090 ms (9.41%) at p50 beyond 0.197-ms bookend drift. Its p99 adds 1.590 ms versus 2.198-ms drift; no tail gain. It remains opt-in and is not advanced to 10,000 subjects because the 1,000-subject result is worse. No 10,000/100,000-subject slim result is claimed.

| fact band / count per arm | current commit / peer / apply p50,p99 ms | slim commit / peer / apply p50,p99 ms | closing current commit / peer / apply p50,p99 ms |
| --- | --- | --- | --- |
| 5-10 / 2065 | 10.245 / 41.072; 5.355 / 29.067; 1.120 / 10.400 | 11.297 / 41.380; 6.138 / 27.886; 1.400 / 10.300 | 10.251 / 48.024; 5.355 / 28.203; 1.100 / 10.900 |
| 11-25 / 986 | 12.169 / 45.965; 6.209 / 30.678; 1.430 / 15.800 | 13.448 / 52.552; 7.291 / 33.740; 2.100 / 14.500 | 12.608 / 44.630; 6.375 / 30.158; 1.450 / 15.400 |
| 26-50 / 369 | 16.296 / 54.678; 7.843 / 35.375; 2.010 / 19.700 | 18.303 / 53.515; 10.157 / 30.546; 3.480 / 19.100 | 15.810 / 49.336; 7.687 / 30.590; 1.910 / 16.900 |

The 64 post-run exact operation/position-bound log transactions average 56.453 datoms in every arm. Value UTF-8 bytes/transaction average 17070.23 / 16782.75 / 17068.09. Candidate canonical value bytes average 17068.08: only 1.67% saved; 964 of 2519 row datoms compressed. These are value bytes, not physical Fressian or WAL log bytes. Native datom counts do not fall.

| attribute | datoms/tx | current stored value bytes/tx | slim stored value bytes/tx | slim canonical bytes/tx |
| --- | --- | --- | --- | --- |
| :triplex.entity/row | 39.359 | 16789.20 | 16501.84 | 16787.17 |
| :triplex.entity/id | 2.000 | 53.00 | 53.00 | 53.00 |
| :db/txInstant | 1.000 | 37.00 | 37.00 | 37.00 |
| :triplex.tx/operation-id | 1.000 | 36.00 | 36.00 | 36.00 |
| :triplex.claim/tx-id | 1.000 | 30.00 | 30.00 | 30.00 |
| :triplex.tx/id | 1.000 | 30.00 | 30.00 | 30.00 |
| :triplex.claim/command-id | 1.000 | 17.84 | 17.84 | 17.84 |
| :triplex.tx/max-recorded-at | 1.000 | 16.97 | 16.91 | 16.91 |
| :triplex.tx/recorded-at | 1.000 | 16.97 | 16.91 | 16.91 |
| :triplex.claim/tx | 1.000 | 14.00 | 14.00 | 14.00 |
| :triplex.tx/journals | 1.000 | 14.00 | 14.00 | 14.00 |
| :triplex.entity/rev | 4.094 | 10.16 | 10.16 | 10.16 |
| :triplex.journal/position | 1.000 | 2.55 | 2.55 | 2.55 |
| :triplex.tx/position | 1.000 | 2.55 | 2.55 | 2.55 |

A native row is an indexed prefix (ID, valid-time endpoints, reference target) plus the 17-column logical JSON row: position, ID, entity, attribute, typed value slots, record/valid time, author, type, schema version and transaction ID. ID/valid time/reference duplicate the prefix; entity duplicates its container; position/record-time/transaction ID repeat per-transaction metadata; unchanged metadata and audit/change values repeat across facts/revisions. The scalar value itself is not independently stored in other scalar datoms in this lean layout.

Readers are the lean subject/history index, reach and pinned bootstrap, journal feed and receipt routes. They all restore the original canonical row before parsing or emitting it; the TypeScript replica and independent oracle consume the same logical values. Layout 4 compresses only the rewritten JSON suffix at the serial point, leaving the index prefix intact. The zlib level-1 Base64 frame encodes raw UTF-16 code units, including unpaired surrogates; bounded length/CRC/termination checks reject corrupt frames. Incompressible or oversized rows stay plain. This preserves exact strings but spends compression CPU per row.

Exactness source 6d4d2852: real Peer selftests 20 / 53,955 assertions, 300 differential scenarios / 95,028 comparisons, concurrent/clock gates, 200,000 replica comparisons, and loaded 1,000-subject oracle PASS (130 commands / 31 reads / 1,946 queries; 6,621,886 correct timed reads, zero errors/violations). First failed routes/forms remain retained. Its missing Mac telemetry disqualifies latency, not the independent equality checks. Current source’s gateway selftests pass again in all three timed arms. No claim is made that these zero arms ran the independent oracle.

Adoption would require rebuilt seed databases or an explicit transaction/history migration preserving positions, clocks, command claims, receipts and pinned reads, then full-scale differential/oracle/performance qualification. No migration or sealed-seed rewrite is built. At 100,000 subjects the datom count and two sequential durable storage writes remain; saved bytes and cache/WAL behavior cannot be extrapolated from this rejected 1,000-subject prototype. A body-independent compact layout that removes repeated metadata is a separate candidate, not proven by this codec.


Storage observations from each primary window (full tracing, host/control as above). All samplers retain source/run/slot and unchanged reset identities.

| storage proxy | current | slim | current closing |
| --- | --- | --- | --- |
| primary ACKs inside sampled window | 3417 | 3418 | 3417 |
| INSERT/UPDATE autocommits per primary ACK | 3.605 | 3.749 | 3.604 |
| WAL syncs per primary ACK | 3.400 | 3.464 | 3.401 |
| WAL bytes per primary ACK | 13077.525 | 33063.894 | 12972.266 |
| all PG committed transactions per primary ACK | 6.266 | 6.411 | 6.257 |
| clean isolated peer windows / ambiguous | 1711 / 1726 | 1611 / 1829 | 1709 / 1727 |
| isolated storage statements p50 / p99 | 2 / 7 | 2 / 7 | 2 / 7 |

These aggregate ratios include probe transactions, maintenance, reads and sampler work and are not exact counts for one Datomic transaction. Two storage autocommits remain the median in clean time-correlated windows; tail resets can add writes, but their identities are not separately recorded. The physical serialized log-byte counter remains unavailable: value/EDN bytes and PostgreSQL WAL are distinct measurements. In this trial aggregate WAL/ACK rises about 2.54 times; reducing the text byte count did not reduce storage traffic. Preserving repeated-string structure versus opaque compressed frames is an untested explanation, not a demonstrated cause. Fsync, synchronous commit and engine-applied acknowledgements remain unchanged.
