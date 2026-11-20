# DX-RD1 Datomic readers
The driver now checks the long fixed read windows as they run instead of keeping every result on disk until the end.
It keeps each result until the writer has accounted for all earlier commits. The checks still use the exact data the caller requested.
Each reader sends two batches at most before it waits for the recorder. The recorder returns the memory for reuse.
The old physical run spent 2.35 microseconds of CPU per read checking the model and 7.37 across final analysis.
The new report shows whether every active reader, the sender and the collector stayed within 70% during stress.
The 12-core result is open. A second machine would move local replica queries, decode and recording off the writer host, while repairs would still reach the same gateway.
**North star.** P1 exact concurrent reads and writer isolation, P4 weighted pulls. [Scope](../../../SCOPE.md) · [North star](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md)

1. Fixed v3 and ordinary deep windows use bounded rolling verification in replica/worker-journal mode. Split steps fold against ordered copy applications. Receipt, sweep and post-prefix records retain the exact original spill path. `--read-retention raw` is the collection control.
2. Server driver check `DX_BARE_METAL=1 DX_NS_PROFILE=v3 DX_STUDY_LEVEL=summary bash lab/experiments/EXP-DX1/t1/study.sh tx2-dxt1-rd1 --reader-threads 6 --reader-trace-every 64 --receipt-capture replica-worker --expected-state-retention worker-journal`. Forecast 0.60–0.90 peak sustained reader mean across stress windows. The 0.70 eligibility limit needs a physical reading.
3. Same-site remote-six then remote-twelve would distinguish placement from capacity. Relay one ordered replica feed and receipt/basis control stream, keep the writer and its publication clock together, and spill remote. Forecast at twelve on a second machine 68k/s at 256 and 33k/s at 1,024 before product repairs. The local thread-count flag leaves readers on the same host.
4. Local preflight checked 3,072 exact tuple transfers, buffer reuse and four split joins. The cost fixture and full TypeScript gates await a shared build slot.
5. Audit. Rolling comparisons bind each record clock to its requested receipt position, check all model fields used by the existing comparator, and reject a late model frame inside a closed cut. Transport checks batch sequence and terminal counts. The journal read-back binds run, source, slot and frame content before the existing independent replay and eligibility checks. No acceptance pin changed.
