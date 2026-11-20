# Java settings for version 0.1
Keep Java 21 with G1 for now. Give the writer two cores.
The eight failed checks came from the tests. All twelve reruns passed on Java 21 and both Java 25 setups.
With ten accounts in one database, the 128 MiB index setting lifted busy saves from 149 to 189 per second against the 32 MiB setting.
The quiet account's slow saves still took 7 to 22 times as long as when it ran alone with faster neighbours writing.
Take `5a96527807fd646fbc866b33dc72565481c409e0` for the integration merge.
Keep the separate server run pinned at `608420dca`. Allow 78 minutes for three tests or 104 for four, plus preparation.
The server comparison still needs to report before choosing a Java 25 default.

## Correctness and settings

- The one-second SQL test fixture made two assertions miss their deadline. A stub that withheld the reply without signalling dispatch blocked the ordered sender and caused five more failures. The eighth test located its worker relative to the wrong directory. The fixes retain the content assertions and the deliberate 200 ms timeout check. Five of the same failures reproduced on Java 21 before the stub fix. All twelve then passed on Java 21 G1, Java 25 G1 and Java 25 ZGC at `b3a6266aa`. The full opt-in SQL suite remains a separate gate. [Failure matrix and archived reruns](PART3-SQL.md)
- The Part 1 trial missed all four sparse-save median forecasts. The 32 MiB bundle raised solo p99 at 23.5/s from 72 to 139 ms. At 128 MiB, busy goodput improved by 27% at 235 offered/s against 32 MiB, and the quiet p99 fell from 1,203 to 981 ms. Test only 128 to 256 MiB next. Predict 0–10% higher busy goodput and 0–25% worse solo p99 at 23.5/s. [Every prediction and result](PART1-RESULTS.md)
- The physical release candidate uses Java 21 G1, a three-core transactor with the 50 ms target and the 128/512 MiB index policy, a two-core writer with the measured 25 ms G1 flags, and a three-core reader with the 50 ms target. The smaller INT1 pooled profile keeps its 384 MiB gateway heaps and private index limits. It shares the two-core writer policy and reads all three real JVMs at startup. [Launch settings](launch.mjs)
- The JDK selection, pinned images and PostgreSQL restore hook remain available. TAIL1 and INT1 share the launch policy, summary recorder and writer CPU placement. The merged branch incorporates `b32f34d1b` and TAIL1 `da4c34f48`. The release merge into INT1 still belongs to the orchestrator.
- The reconciled source built the SDK and passed 438 SDK tests with 53 opt-in tests skipped, 17 INT1 tests, three retention tests and the W1 type check. The final recorder revision passed nine trace tests and its Java 25 G1 SQL launch passed 27 native tests with 54,079 assertions and all 12 focused SQL tests. The archived recorder verified three role recordings, 15,232 anchored SQL duration records, 16 wall-only records and 25 anchored WAL samples. [Merged gate archive hash](SHA256SUMS)
- Part 2 already ran both Java 25 collectors on the native suite, with 27 tests and 54,079 assertions each. It also ran 861 Core, 434 SDK and eight INT1 tests on its earlier source. [Java compatibility and diagnostic boot data](JAVA25.md) · [Prior evidence hashes](SHA256SUMS)
- Mac work used ordinary tokens. A failed Java 21 boot exposed the preflight's missing codec mount. The subsequent runs reused tracked gateway source and retired the superseded private images. Mac timing was diagnostic. The acceptance contract and storage durability were left alone.
- The first Part 2 push initially used Git's local identity. The branch was corrected to the generic identity. The earlier remote object may still be retained.

## Physical Java comparison

- The Java 21 and Java 25 G1 arms each reserve 24 GiB for the three JVMs and PostgreSQL. The Java 25 ZGC arm and optional memory-matched G1 reserve 37 GiB. Add a 3 GiB Node old-space limit for the sender. The box budgets are 27, 27 and 40 GiB before Node's young generation, other native memory and the OS. Actual peaks, stalls, CPU, tail latency and resident bytes per untouched person are open. [Before-run forecasts](PREDICTIONS-PART2.md) · [Server command](SERVER.md)
- The latest bare-metal handoff queues the three arms after the per-person comparison. No matched arm results were available in the transferred evidence. The 13 GiB extra reservation needs a measured gain in save or pinned-read tails to justify switching to ZGC. [Bare-metal handoff](https://github.com/OnboardedInc/Triplex-db-experiments/blob/da7eca837/lab/experiments/EXP-DX1/bm1/HANDOFF.md#friday-evening-queue)

## Evidence audit

- SQL test evidence binds a fresh attempt, test-file bytes and the exact image to owned endpoints and unchanged JVM process identities. The assertions and clock receipts check content. Verified archive member hashes retain the failed attempts and corrected reruns. [SQL archive hash](SHA256SUMS)
- The merged recording check uses the same attempt's role IDs, source, actual flags, JFR and SQL byte hashes, common boot and stable WAL sample epoch. Runtime logs kept appending during shutdown, so the receipt now binds exact observed byte ranges. Collection and the live gate recheck those ranges and all closed files after teardown. The inherited event joins verify exact transaction and readback content. [TAIL1 recorder audit](../tail1/RECORDING.md#audit)
- Image receipts compare the signed distribution, staged bytes, Java parent, source digests and resulting image identity. Retirement checks the image, private labels, no dependent containers and fresh absence. The physical collector checks the sealed stream, restored cut, offered saves, observed values, process snapshots, GC logs and owned cleanup. [Server design](SERVER.md)
- The pinned-image input changes from Part 2 are listed in the report at `96c7fc010`. The contract itself was untouched.
