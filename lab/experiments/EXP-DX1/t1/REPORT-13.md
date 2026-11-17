Tonight’s runner is ready; no 10,000-subject timing arm was launched during daytime.
Two additional stress/recovery cycles give recovery counts 557/557/552/553/540/551/543, all above the 520-offer safety margin.
Other planned P1–P4 commit pools: primary 38,826; burst small/medium 19,838/9,881; L256 total 2,149, small 1,261, medium 682; stress 854. The observed verdict minimum stays 500.
The offered span is 5,910 s: +390 s per arm, +13 min per pair, +26 min for two pairs. Their minimum offer time including off bookends is 6 h 47 m 20 s; setup/history/verification can add time.

Both native counters work with quiet per-commit logging: cache 390,417/393,531 hits (99.209% process-wide); nine processor-adoption entry/return intervals with basis advances, zero drops.
The fresh 1k smoke passed 9,850,789 model reads, zero wrong/error, and independent oracle PASS 50 reads/3,538 entity queries/336 commands with exact receipts. All three JVMs read back the five requested logger categories at WARN and compiler threshold 0.1.
Current package validation: 361 tests passed, 52 external skips; package types, eight focused JS roots and shell checks pass. Native gateway tests pass: 24 tests/53,994 assertions, plus 8 trace tests/47 assertions.

The gate now uses 60 one-second interval CPU samples and exactly the requested four conditions: swap <6 GiB, median non-VM CPU <25% of one core, disk ≥20 GiB, Chrome/Slack/Paste closed. Other gauges are diagnostic.
Today’s gate correctly refused: swap 13.166 GiB, CPU 133.2%, named apps open. No latency floor, Codex prohibition, pressure gauge or missing guest clock log blocks an otherwise admitted host.
The script checks every physical arm after its lease wait, starts none at or after 06:15, and cancels incomplete work at 06:45. Longer supervisors preserve final verification.

After 19:30 local, with the apps closed and swap drained:
```sh
bash lab/experiments/EXP-DX1/t1/night.sh --plan
bash lab/experiments/EXP-DX1/t1/night.sh
```
Order: passive gate; two full v3 off/zero/loaded/off studies with early compilation and loaded oracles; then, only if 140 min remain, an eight/six/eight loaded diagnostic. Eight CPUs stays default.
Each `NIGHT-YYYY-MM-DD.md` is written in this directory and the private night folder, showing every bar/count/interval beside sealed H’s ACK rescore. Raw traces/viewers remain under `~/Claude/Projects/triplex-db-2/evidence/DX-T1/<tag>/`.
The CPU diagnostic reports L256 separately from all-primary medians, P1/P4 and bookend drift; sparse results cannot adopt a new default. Split rule remains `pending`; history growth remains four subjects per commit.
Large L256 band 206 and the pre-existing short P5 sweep stay unjudged. No rate, latency threshold, frozen trace, ACK boundary or judged phase was made easier.

Disk was 62.9 GiB and is 63.3 GiB; no old evidence was removed. The separate lossless-spill reservation still needs 47 GiB before a v3 study (28 GiB cap + 4 GiB auxiliary + 15 GiB floor).
Potential blockers tonight are those printed host conditions, spill headroom, a busy lease, or insufficient remaining night time. Tonight’s two pairs and optional CPU contrast remain unrun.
The recorded 1k replay renders adoption overlaps with unchanged coverage 3520/3522 ≥95%; its original seals verify. A flags-only finalizer copy-path bug was fixed; the first output remains preserved privately.
[Checks and retained failures](CHECKS-13.md), [evidence/seals](EVIDENCE-13.md), [content/freshness/binding audit](AUDIT-13.md). Full root-check/pack PASS is not claimed. All owned containers/volumes/networks and the lease are gone.

Only authority-pinned path changed: `lab/TARGETS.md`, old `0200ad2b15f19e8b4bce72e6d78c0de2a33f94ba27b056a21dad6b873cdcf513`, new `301c04b87a06688db93d6a329398011b24f1d577d509bec229f739bc5278d6d6`; acceptance unchanged, [pin details](PINS-13.md).
Code is 8f060202; native smoke is 900dd57b with unchanged product tracing bytes. No dependency/image, warmer, 100k run, foreign cleanup or push was added.
