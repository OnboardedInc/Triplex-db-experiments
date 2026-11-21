# Why the first busy window was slow
At 235 saves a second, the slowest saves waited behind earlier groups of six. The loaded window followed five minutes of light traffic.
The first half's p99 was 5.58 seconds. The second half's p99 was 46 milliseconds at essentially the same rate.
The previous scorecard places 97% of the extra delay in that queue. It cannot tell us how much came from compiling code, cache misses, indexing or checkpoints.
Use `c53146fbea10e0680ab7c406f04ae287eea9122f` for the three-arm cold-start test. Allow up to 59 minutes plus 15 seconds of shutdown grace.
The test compares today's setup, startup settings, and those settings with a slower admission ramp. It counts every refused save.
Java 25 ZGC stays on the transactor. Today's launch settings stay the default. No traffic or data reads were added to warm the system.
The test is ready for the physical queue. The latter half of the benchmark was faster, but we still need the raw capture to say when and why it settled.

## Evidence and delivery

- Base `origin/exp/DX-INT1` was `6554dbca19554f83979827c691cda8c5c409abf9`, merged on the DX-JVM1 branch. The launch profiles, image pins, and Datomic and PostgreSQL durability are carried through. [Source, options and forecasts](COLD-START.md) · [Physical command](SERVER.md#cold-first-full-load-window-at-235s)
- The full-size checkpoint contains hashes of the raw clocks and counters. The named archive omits their bytes. The compressed per-second CSV reconstructs the separate 90-second scorecard, including honest gaps through second 149. It records per-second stage shares and native SQL counters. [Evidence hashes](SHA256SUMS)
- Local checks used ordinary heavy tokens. The rebuilt SDK, all 42 sender/credit/ordered-ID and SCALE1 checks, strict TypeScript, shell syntax, Python analyzer and Clojure observer load passed. Temurin 25 accepted six reduced JVM setups with the expected role collectors and tuned CDS readback. The host check omits Linux-only transparent-huge-page flags. Earlier failed gate attempts are retained in the manifest. No Mac latency result, new Mac image build, production admission change, physical clone, full-size timing, or server launch is claimed.
- The optional ingress ramp is in the matched driver. It tests explicit early refusal with an unchanged offer clock and leaves production clients alone. The pinned Java artifacts supply bundled CDS. App AOT cache training is outside this runtime profile. The findings document what Java 25 supports and the separate advance-read options for an owner ruling. [Cold-start reading](COLD-START.md)

## Evidence audit

- The analyzer binds each scorecard file to the arm's operation SHA-256 and checks the earlier ledger's source, slot, attempt, unique operation IDs and exact partition of time above 50 ms. The two archives and ledger have distinct SHA-256s.
- The physical driver checks clean source, built SDK bytes and live image IDs, fresh per-arm identifiers and an owned path, the required control-file bytes before and after cloning, exact starting cut, verified writer options and post-window seed witnesses. The physical source pin certifies control bytes, plus live sample and journal checks of the prepared data. It is not a hash of every relation file.
- Every published arm summary binds the same tape digest, exact offer count and owned counter process to the source and attempt. Acknowledged and recovered saves match the independently decoded journal IDs, ordered assertion IDs, positions, clocks and digests. Pre-dispatch refusals have no write dispatch or acknowledgment. Observed JVMs have fresh process/container and flag readback, a collector and image verification, and the index trace confirms installation in the same attempt. Cleanup verifies container, volume, network and WAL removal for the owned slot.
- No acceptance contract pins were changed. The older Java comparison and SQL compatibility findings are retained in the Part 3 report at `b35baa3ee`.
