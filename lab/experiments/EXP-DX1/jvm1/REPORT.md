# DX-JVM1 · Java 25 and ZGC
Datomic already supports ZGC on Java 25. Our old image runs Java 21.
This branch lets all three processes run on either Java version.
Start with Java 21 and a two-core writer, Java 25 with G1, then Java 25 with ZGC.
Use `9db1746cd13c76e5facdf4bac13255d01329351b` for the server. Budget 78 minutes for those three arms.
A fourth arm brings the total to 104 minutes and gives G1 the same memory as ZGC.
ZGC gets 13 GiB more reserved memory in this trial. The server still has to price the gain and check for stalls.
On the shared Mac, 99% of writer pauses were at most 0.062 ms with ZGC and 31 ms with two-core G1. The server still needs to measure the effect on saves.

## Settings and evidence

- [Part 2 compatibility](JAVA25.md) · [Exact flags and rationale](COLLECTORS-PART2.md) · [Before-run forecasts and heap inputs](PREDICTIONS-PART2.md) · [Server command](SERVER.md)
- [Part 1 inventory](INVENTORY.md) · [Sources](SOURCES.md) · [Configuration](CONFIGURATION.md) · [Mac measurements](MAC.md) · [Forecasts](PREDICTIONS.md)
- Official Temurin 25.0.5+8 and the Java 21 base are digest-pinned. The signed Datomic 1.0.7745 distribution includes Clojure 1.12.5 and SLF4J 2.0.17. Java 25 enables both compatibility flags for all three classpath launches.
- The private Linux Java 25 image built under an ordinary token and its gateway suite ran 27 tests with 54,079 successful assertions. The only warning in this run was Clojure's existing `identity` name shadowing. The next SQL startup attempt refused admission during another holder's lease, before starting containers. [Evidence hashes](SHA256SUMS)
- The Java 25 image, 861 Core tests, 434 SDK tests, eight focused INT1 integration tests, and W1 type check reached their expected results at `d1987c09b`. The three retention tests passed earlier. The broad CheckJS run reported diagnostics outside the JVM launch files. [Gate hashes](SHA256SUMS)
- The exact `d1987c09b` host-native Java 25 gate passed with G1 and ZGC, each with 27 tests and 54,079 assertions. The later INT1 oracle identity merge touched historical SCALE1 sample validation and evidence files. [Gate hashes](SHA256SUMS)
- Mac checks use one ordinary heavy token each. The old replay entry point now directs collector comparisons to the server and startup diagnostics to the small Mac inventory. The optional three-role ZGC boot checks each observed collector under the same small exclusive reservation. No bench server was contacted.
- The first Java 25 native run confirmed Clojure and SLF4J versions. Three tests needed container-only fixture paths. The host gate now maps just those three paths to unchanged files from its exact Git archive. The first attempt is retained.
- Ordinary-token boots verified both Java versions and all three SQL-stack roles and cleaned up. The Java 25 transactor needed the native-access flag after Netty logged a restricted-library warning. Shared-Mac boot and idle memory numbers are recorded as diagnostics. [Boot table](JAVA25.md#diagnostic-startup-and-idle-memory-on-the-shared-mac) · [Hashes](SHA256SUMS)
- The live Java 25 ZGC boot verified all three collectors and cleared the transactor warning. I interrupted the first SQL SDK run after finding that its harness omitted `DATOMIC_GATEWAY_URL`. The harness now directs both writer endpoint variables to the owned slot. The stopped stack cleaned up. All exclusive slots were held at the final retries, leaving the 52 live SQL cases unverified.
- The GC parser was exercised with archived G1 and generational ZGC logs on the shared Mac. The check verified all three G1 roles, the ZGC writer's phase labels and rejection of a log from a different boot. Evidence and hashes are under `evidence/DX-JVM1/part2`.
- The Java 21 fixed-activity census adds a shared-Mac reference of about 12,651 resident bytes per added untouched person between 10,000 and 30,000 people, mostly in the transactor. The matching ZGC slope is still open. [Census](../int1/P5-EVIDENCE.md)
- A restore fixture consumed the exact expected bytes and rejected a changed stream. It exercised the stream verifier with a stand-in for PostgreSQL.
- JVM settings live in `launch.mjs`. The integrated runner and TAIL1 arm definition both import the measured writer G1 flags. A selected experiment can still supply its own settings. The acceptance contract and SQL durability are unchanged.
- The first two server arms keep the same G1 flags and placement to price the Java version change. The current experiment branch includes INT1 but still needs the inbound integration merge for version 0.1.
- One initial push used Git's local author identity. The experiment branch tip was replaced with a commit that uses the generic Codex identity. The earlier remote object may still be retained.

## Evidence audit

- Variant build receipt compares ZIP, signature and staging bytes, binds current source and the exact Java parent, and verifies the resulting image identity and labels. Launchers verify runtime flags from fresh process startup, bind container ID and start ticks, and capture collector and memory constraints.
- `native-java25.sh` archives the exact source, verifies vendor bytes and Java version, maps the three test fixture reads into that archive, and requires all 27 native tests and 54,079 assertions with zero failures or errors. The SQL inventory collects a fresh startup and checks stable JVM identities around the SDK command.
- The Mac replay checks archive hash, schedules, source, reserved slot, distinct boots, receipts, oracle samples and owned cleanup. Its historical timings are shared-Mac diagnostics.
- `server.ts` verifies the sealed seed and the digest of the bytes sent to `pg_restore`, the restored cut, W1 offers and durable results, and sampled reader contents before `field-summary.json`. The final result also checks fresh flags and GC log bytes, process identities, timings and owned cleanup. Counts and latency are measurements.
- Image source changes from the integration base, old → new SHA-256:
  - `lab/config/datomic/Dockerfile` `de1947c60e1cd169a285a877ce113a5585633df7c8bccf1669f7e7dd6f79664a` → `aa80d3a2ae0984db6f39fadf3ccb3015f2deaac704dfb9ad2bb74683836a2167`
  - `lab/config/datomic/entrypoint.sh` `93ade9ed9cf4c741230b217b8c8a42b148a8d7152a1ee887ea7fca515cfe9c2d` → `8b762dbb668e91ae76b2121791671a04488eabf7666f59deb47d789824d265e3`
  - `lab/config/datomic/transactor.properties` `762126e7626dae616553c9675fc5453ef7da01c10362e735982920aefef609cc` → `404281c4d749f2bd785297d592d1a052f6215ec79a4ccf2fe859a65753b29628`
  - `packages/datomic/gateway/src/triplex/gateway/jfr.clj` `a703ed7772ab7fcdd62effde8135bc62f6b4325046a0f893a1165c8c08474d94` → `0c435b193a369f6dee40059452a41b9719046bac15bceaf06ac36e514e40994b`
  - `packages/datomic/gateway/src/triplex/gateway/native_settings.clj` `0c3a527e0487f05cf93a033da059ed3175ab704f8fb510475ac120fe03c2b755` → `f77e08c1f8ad493c8faad2dfc79149562db19e1135de78f7340c46e77d8ea90b`
