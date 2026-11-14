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
