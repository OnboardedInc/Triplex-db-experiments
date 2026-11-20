# Java 25 runtime and compatibility

Datomic added Java 25 and Java 25 ZGC support in release 1.0.7705. The sealed 1.0.7745 distribution includes that change. Its library files include Clojure 1.12.5, SLF4J API and bridges 2.0.17, Logback core/classic 1.5.34, Jetty 9.4.53 and PostgreSQL JDBC 42.7.11. The same vendor archive and gateway source build both images. [Datomic 1.0.7705 changelog](https://docs.datomic.com/changes/pro.html#1-0-7705)

The Java 21 baseline remains the original digest-pinned Temurin 21.0.13+9 Noble JRE. Java 25 selects Temurin 25.0.5+8 Noble JRE, with a pinned OCI index and Linux amd64/arm64 children. The distribution checksum, input manifest, actual image ID, Java major and parent digest are validated before a private build is selected. [Official image](https://hub.docker.com/_/eclipse-temurin) · [Temurin 25.0.5+8 release](https://github.com/adoptium/temurin25-binaries/releases/tag/jdk-25.0.5%2B8)

On Java 25 the transactor and peers use `--sun-misc-unsafe-memory-access=allow` for the vendor's Unsafe warning. The peers also use `--enable-native-access=ALL-UNNAMED` for the restricted System method warning. These settings follow the vendor guidance for the classpath launch. They apply to the pinned runtime only. Java 25's `-XX:+UseZGC` selects generational ZGC. Java 24 removed non-generational ZGC and the separate `ZGenerational` switch. [Datomic release notes](https://docs.datomic.com/changes/pro.html#1-0-7705) · [Java migration guide](https://docs.oracle.com/en/java/javase/25/migrate/significant-changes-jdk-24.html)

## Local correctness and idle inventory

```sh
DX_JAVA=25 node lab/bin/heavy.mjs --label DX-JVM1 -- node lab/bin/engine.mjs build \
  --lane datomic --holder DX-JVM1 --variant-receipt "$IMAGE_RECEIPT"
DX_JAVA=25 DX_DATOMIC_IMAGE_RECEIPT="$IMAGE_RECEIPT" node lab/bin/heavy.mjs --label DX-JVM1 -- \
  node lab/bin/engine.mjs selftest --lane datomic --holder DX-JVM1
DX_JAVA=25 DX_DATOMIC_IMAGE_RECEIPT="$IMAGE_RECEIPT" node lab/bin/heavy.mjs --label DX-JVM1 -- \
  node lab/bin/engine.mjs jvm-inventory --holder DX-JVM1 --out "$OUT"
```

Build a second private receipt with `DX_JAVA=21` to compare the same source and distribution. The inventory measures each role from its container start to all roles ready, then reads its live RSS and cgroup usage after five idle seconds. These are shared-Mac diagnostics. The installed source's SDK and integration tests also run in Node, so their scope is distinguished from the native Java and SQL checks.
