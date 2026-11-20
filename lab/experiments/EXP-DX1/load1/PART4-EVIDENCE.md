# Part 4 evidence

Paths in the checksum manifest are relative to the durable DX-HA1/load1 evidence directory. The native recordings, offer tapes, SQLite checkpoints and tool output live there. [SHA256SUMS](PART4-SHA256SUMS)

| Attempt | Recorded outcome |
|---|---|
| load-live-5e5324c8-5a8c-4393-b029-7c91ffa1fd9e | Archived 128-fact result and original tail. The earlier manifest covers the source tape. [Earlier checksums](SHA256SUMS) |
| load-tail-6471f4d7-8567-438d-902c-ce5674651313 | Three complete 108-second tapes and native Datomic recording under 7369010a3. Trace export hit the stdout limit after the original native binary was saved. Tail-native-summary.json joins command positions and clocks to the saved binary. NativeTail.java and native-summary.py reproduce it. |
| load-frontier-low-e7310cc2-3f3f-4fd2-9dff-f71b614f0e2b | Five verified arms under bd2ce3bf9, including 1/4/8 ms and the first-control 11.06 ms allowance. An invalid fractional process timeout prevented the second control. |
| load-split-pg-88241270-557b-41bd-9411-55fd74b56905 | Three verified arms at 50 offered saves/s under da74dd585. Distinct PostgreSQL processes on one Mac VM. |
| load-split-sql-a60ad979-f5f2-470a-8b8a-e15fd3890017 | Three verified arms at 50 offered saves/s under 46a788316. One PostgreSQL process with distinct Datomic storage databases. |
| load-frontier-high-6185086e-37a0-4aca-8167-26e0e0ab1e07 | Four verified 100-save/s arms at 16 and 32 ms under 22f80099c. The 32 ms arm and final control missed offers. |
| load-frontier-high-441caa36-497d-4796-9560-cdabd2e70b0f | Four verified 50-save/s arms at 16 and 32 ms under 085166853. Final control missed nine offers. |
| load-frontier-low-c6d2a348-d7ca-461d-8826-16f18a73d8d7 | Five verified 100-save/s arms at 1, 4 and 8 ms under c5cb9553b. First control missed 192 offers. |
| load-frontier-allowance-a01d6d37-cd97-4357-a1e6-a57714192502 | Quiet-alone read/save p99 16.33/45.05 ms and the resulting 8.16 ms budget at 50 saves/s under c79c6387d. All offers completed. |

Replay a completed comparison with `node --import tsx lab/experiments/EXP-DX1/load1/compare.ts "$ATTEMPT_DIR"`. The reader requires original observation, cleanup and offer bytes. It recomputes scheduled dose, p99, ratios, misses and windowed throughput against both retained controls. The per-arm files from the partial pacing attempt survive independently of the failed overall receipt.

The retry of the extended trace remained behind another campaign’s active measurement lease for 47 minutes. It ended before acquiring a slot or starting an engine. Gateway and per-save index attribution remain open. All Mac timings are diagnostic. [Placement and forecasts](ISOLATION-BENCH.md) · [Findings](REPORT.md)
