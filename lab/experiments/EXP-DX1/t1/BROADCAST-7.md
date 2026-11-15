# Part 7 receipt broadcast: first comparison incomplete

`tx2-dxt1-p7-basis-a`, source c08071c2, summary, exact local reads, strict server clocks, pending split rule, 450-second focused ladder with 45-second levels through 1024. All primary command bytes are retained. The opening control reports ERROR: one ReadError among 10,321,891 reads, no wrong worlds. Candidate and closing control report DONE/oracle PASS. This is an incomplete valid comparison, not a qualified gain. Original error, numeric observations and traces remain recoverable.

| snapshot / delta / snapshot | all-primary p50 / p99 ms | >50-ms commits | broadcast p50 / p99 ms | items sent | swap GiB; Mac non-VM CPU median % |
| --- | --- | ---: | --- | ---: | --- |
| opening snapshot, ERROR | 12.337 / 52.797 | 49 | 1.831 / 5.215 | 19373775 | 4.671; 11.0 |
| delta, DONE | 12.102 / 55.557 | 55 | 0.309 / 1.351 | 12471 | 4.671; 11.15 |
| closing snapshot, DONE | 12.476 / 47.730 | 30 | 1.903 / 5.343 | 19369392 | 4.671; 10.9 |

Controls are the two snapshot rows from this same lease; their read error prevents an A/B/A latency-gain claim. Candidate-mode zero reference was not separately measured in this first attempt, so its reported ratios share the heap/snapshot zero reference and do not qualify the candidate's P1 bars.

Error trace `b334d35c018635f900000000002cd8fb`, worker 2, phase L1024, subject 6262, position 3990: reader wall 2446.697 ms, socket queue/write 2398.750 ms, no response span/status. The detailed transport error was not recorded. Neighbouring fallback requests waited on the socket and then completed. No wrong world is inferred or hidden. The reference pair remains independently complete.

Next attempts use new tags, repeat controls, and a separate same-mode zero reference for the candidate. They retain the same frozen trace and phase durations. Compression of this incomplete comparison's raw numeric files is lossless, with original and compressed hashes plus restore commands in the private p7-retry-compression journal.

## Fresh retry, qualified source/byte checks

`tx2-dxt1-p7-basis-b`, source 4cf2b1a7, summary; 3,707 primary commands per 450-second arm, all loaded arms DONE/oracle PASS and zero read errors/violations. Both modes have their own same-lease zero reference. Original incorrectly labelled 300-second automatic captions are retained as MEASUREMENTS.initial.*; the corrected derivation records the actual reporter SHA256.

| arm | primary p50 / p99 ms | >50-ms commits | GC count / total ms / max ms | heap used median / peak MiB | scheduler-late >50 count / sum ms | L256 / L1024 writer-tail ratios | swap GiB; Mac CPU % |
| --- | --- | ---: | --- | --- | --- | --- | --- |
| baseline | 12.569 / 44.483 | 23 | 822 / 2230.381 / 60.597 | 499.3 / 557.3 | 0 / 0.000 | 1.152 / 0.523 | 4.624; 11.2 |
| candidate | 12.459 / 57.201 | 68 | 756 / 2186.364 / 73.029 | 497.9 / 546.4 | 1 / 52.235 | 2.323 / 0.760 | 4.608; 11.1 |
| baseline | 12.500 / 53.584 | 54 | 822 / 2289.207 / 57.314 | 498.8 / 548.4 | 0 / 0.000 | 4.256 / 0.628 | 4.608; 11.1 |

Controls are the two snapshot bookends above. Broadcast p99 is 5.151 / 1.303 / 5.151 ms and items 19,373,181 / 12,471 / 19,373,529. Primary median saving 0.075 ms narrowly exceeds 0.069-ms drift; no p99 or GC-stall improvement is established (p99 change +8.167 ms versus 9.101-ms drift). Keep delta for the direct broadcast saving; final full-pair bars still decide performance. GC kinds in all loaded arms: 7 major, 7 incremental; minor 808 / 742 / 808. Lateness intervals are per primary command, not exclusive CPU time. The journal is still opt-in pending its separate study.

Fresh recorded-byte derivation v3 additionally counts GC events over 50 ms: opening/delta/closing 2/2/1, summed observed duration 113.205/128.711/57.314 ms. All-primary >50-ms request wall totals are 1467.757/4667.151/3476.076 ms. These are not exclusive machine time and do not establish a delta tail improvement. Original v2 derivations remain retained.
