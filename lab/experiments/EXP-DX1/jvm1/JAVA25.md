# Java 25 runtime and compatibility

Datomic added Java 25 and Java 25 ZGC support in release 1.0.7705. The sealed 1.0.7745 distribution includes that change. Its library files include Clojure 1.12.5, SLF4J API and bridges 2.0.17, Logback core/classic 1.5.34, Jetty 9.4.53 and PostgreSQL JDBC 42.7.11. The same vendor archive and gateway source build both images. [Datomic 1.0.7705 changelog](https://docs.datomic.com/changes/pro.html#1-0-7705)

The Java 21 baseline remains the original digest-pinned Temurin 21.0.13+9 Noble JRE. Java 25 selects Temurin 25.0.5+8 Noble JRE, with a pinned OCI index and Linux amd64/arm64 children. The distribution checksum, input manifest, actual image ID, Java major and parent digest are validated before a private build is selected. [Official image](https://hub.docker.com/_/eclipse-temurin) · [Temurin 25.0.5+8 release](https://github.com/adoptium/temurin25-binaries/releases/tag/jdk-25.0.5%2B8)

On Java 25 the transactor and peers use `--sun-misc-unsafe-memory-access=allow` for the vendor's Unsafe warning and `--enable-native-access=ALL-UNNAMED` for the restricted System method warning. The release notes describe the latter warning on a peer. The Java 25 SQL boot also observed it on the transactor, from `netty-common-4.1.131.Final` loading its native library. Both flags apply to the pinned Java 25 classpath runtime. Java 25's `-XX:+UseZGC` selects generational ZGC. Java 24 removed non-generational ZGC and the separate `ZGenerational` switch. [Datomic release notes](https://docs.datomic.com/changes/pro.html#1-0-7705) · [Java migration guide](https://docs.oracle.com/en/java/javase/25/migrate/significant-changes-jdk-24.html)

## Local correctness and idle inventory

```sh
DX_JAVA=25 node lab/bin/heavy.mjs --label DX-JVM1 -- node lab/bin/engine.mjs build \
  --lane datomic --holder DX-JVM1 --variant-receipt "$IMAGE_RECEIPT"
DX_JAVA=25 DX_DATOMIC_IMAGE_RECEIPT="$IMAGE_RECEIPT" node lab/bin/heavy.mjs --label DX-JVM1 -- \
  node lab/bin/engine.mjs selftest --lane datomic --holder DX-JVM1
DX_JAVA=25 DX_DATOMIC_IMAGE_RECEIPT="$IMAGE_RECEIPT" node lab/bin/heavy.mjs --label DX-JVM1 -- \
  node lab/bin/engine.mjs jvm-inventory --holder DX-JVM1 --out "$OUT"
```

Build a second private receipt with `DX_JAVA=21` to compare the same source and distribution. The inventory measures each role from its container start to all roles ready, then reads its live RSS and cgroup usage after five idle seconds. These are shared-Mac diagnostics. After building the SDK, add `--sdk-gate` to the inventory command to run native gateway selftests and the SDK's opt-in SQL tests on that same owned stack. Add `--zgc` to exercise all three Java 25 SQL processes with ZGC under the small Mac reservation. The standalone SDK and integration unit tests run in Node.

### Diagnostic startup and idle memory on the shared Mac

The two ordinary-token boots used a G1 transactor, Serial writer and G1 reader on one CPU each. Each time measures from that container's start until all roles were ready. The roles start in order and the host load differed between the two attempts. The memory samples are single idle observations. [Boot and flag hashes](SHA256SUMS)

| Role | Java 21 seconds / process RSS MiB / cgroup MiB | Java 25 seconds / process RSS MiB / cgroup MiB |
| --- | --- | --- |
| Transactor | 56.1 / 258.3 / 241.8 | 87.8 / 276.2 / 256.7 |
| Write gateway | 38.4 / 286.3 / 268.8 | 68.3 / 289.3 / 270.2 |
| Read gateway | 17.5 / 376.8 / 359.4 | 35.7 / 309.5 / 290.2 |

Both peers logged the same Clojure `identity` warning under both versions. The Java 21 transactor emitted no JVM warning. The first Java 25 boot exposed the Netty warning and prompted the explicit transactor flag. Both attempts released their owned containers, volumes and reservations.
