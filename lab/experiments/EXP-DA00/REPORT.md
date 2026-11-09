# EXP-DA00: lane D bring-up

Result: **PROGRESSED**. The builder implementation and all four brief gates passed. This is bring-up evidence, not an independent promotion or P1-P5 acceptance.
Branch: `exp/DA00-datomic-bringup`. Implementation head: `e1a933f2e8385624570c6964b4ad2165fb0aa954`. A subsequent report-only commit contains this report and the receipts; its hash is provided in the final agent message.

Scope and targets: `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`; procedure: `lab/PROTOCOL.md`. Design: R29 sections 1-3, schema mapping 4.2, rulings Q78a-e. No inherited homebase goals or queue were used. No other agents were spawned.

## Implementation and evidence

| Brief point | Built | Evidence |
| --- | --- | --- |
| 1: verified download | Official S3 ZIP retained in the authorized downloads directory. Bundled peer JAR matches Maven Central's SHA-1; detached PGP signature validates against the downloaded public key. `lab/config/datomic/SHA256SUMS:1`, `verification.json:1`. | `receipts/peer-sha1-check.txt`, `gpg-verification.txt`, `summary.json`. |
| 2: local image | Pinned Temurin index and arm64 manifest rechecked. Host extraction copied into an owned context; every extracted file rechecked against the pinned ZIP before build. No distribution script ran before verification. `lab/config/datomic/Dockerfile:1`; `lab/bin/engine.mjs:89`. | `base-manifests.txt`, `build-5.log`, `build-5.json`; complete input manifests retained under `runs/engines/datomic-build/c15195a2c2bffd4de222f55ea79c76266b321bc8b02f6451e9a157d386199256/`. |
| 3: two JVMs | `lab/config/datomic/entrypoint.sh:1` supervises transactor and gateway, waits for port 4334, exits nonzero if either dies, and applies R29 heap/direct/metaspace/OOM settings. Gateway creates/syncs `tx2-health` before opening HTTP; this avoids a third temporary JVM. | Final measurement command lines and `/proc` masks prove transactor CPU `0`, gateway CPU `1`; final container cpuset `0,1`. |
| 4: engine lifecycle | Datomic dev on 8470, parkable 2.75 GiB/2 CPUs; exclusive s1-s3 on 8471-8473, 3.5 GiB/3 CPUs. Image-id and source/build label checks fail closed before startup. Config snapshots mount read-only. Pool-admitted 1.5 GiB, network-disabled mem selftest. `lab/bin/engine.mjs:76`, `:148`, `:177`, `:247`, `:277`. | `selftest-4.log`; `final/lifecycle-1.log`; `engine-status-final.txt`; `engine-events.jsonl`; `final/measurements-1.json` includes actual mount RW flags. |
| 5: gateway | Distribution-provided Ring/Jetty and data.json; sync deadline 2 seconds; test-only create/delete, full scope collision check, stable schema hash and tagged basis. Codec covers long limits, refs above 2^53, signed zero, subnormals, shortest round-trip doubles, decimal scale, bigint, instant, UUID, keyword, strings and booleans; nonfinite doubles fail. `packages/datomic/gateway/src/triplex/gateway/main.clj:10`, `:12`, `:22`, `:30`, `:37`, `:51`; `codec.clj:8`, `schema.clj:9`. | Same vector file used by Clojure and TS. Clojure selftest: 2 tests, 34 assertions, zero failures/errors. Live schema hash and basis survive parking. |
| 6: TypeScript | Private `@triplex-build/triplex-datomic`, public dist exports, Node HTTP keepalive with maxSockets/maxTotalSockets 512, total request deadline, typed HTTP/transport/codec errors, exact JSON preserving -0. `packages/datomic/src/DatomicClient.ts:37`, `codec.ts:22`, `:61`; `lab/bin/gate.mjs:35`. | G0 includes build, typecheck and 24 package unit tests. `live-client-smoke.json` proves built client health/basis access and rejects production create/delete. No new live skipped tests were added, so expected-skips.json is unchanged. |
| 7: measurement | Actual image/ZIP sizes, startup, per-JVM RSS, 100 sequential scope creations, and park/restart persistence. | `summary.json`, `final/measurements-1.json`, raw gateway bytes in `final/gateway-1.jsonl`. |
| 8: rejected paths | No peer-server/legacy REST access, Datomic Local, two-container split, alternative Datomic version or added Maven runtime dependencies. | Dockerfile and gateway source; existing distribution jars and hashes in verification.json. |

All receipt names above are under `lab/experiments/EXP-DA00-datomic-bringup/receipts/` unless a full path is given.

## Fresh gates

Final-source G0 receipts all bind implementation head `e1a933f2e8385624570c6964b4ad2165fb0aa954`:

| Lane | Executed/pass | Reviewed skips | Copied receipt |
| --- | ---: | ---: | --- |
| datomic | 1017 | 46 | `G0-datomic-20261108T215822Z-205199.json` |
| xtdb | 1013 | 130 | `G0-xtdb-20261108T215858Z-977834.json` |
| qlever | 1018 | 67 | `G0-qlever-20261108T215940Z-c6686e.json` |

Every G0 has zero failures and zero unexpected skips. X/Q skip counts remain 130/67 and their eight effective-config hashes remain byte-identical to the pre-edit capture (`lab/bin/test/lab.test.mjs:275`). No skip-policy file changed. G0 accepts Datomic only for G0; G1/G2/NS/GS remain unavailable until their lane implementations exist.

`node --test lab/bin/test/lab.test.mjs`: **22/22**, zero skips (`receipts/lab-tests-final.tap`). The new checks cover existing hashes, Datomic parkability/caps, distinct JVM masks, enclosing CPU set, read-only config mode, and refusal of an exclusive slot with all three residents reserved.

`engine.mjs selftest --lane datomic --holder EXP-DA00`: **PASS**, 34 assertions, image `sha256:d0e2465fd9548980373a61f84b8f50e339a82cd627c56ead0ac284b87cb34c6d`, `--network none`, 1.5 GiB cap admitted/released through the common pool (`receipts/selftest-4.log`). The final deployment correction did not change that image or gateway source.

The real resident reached READY, created 100 scopes twice across the two measurement stages, retained the volume across required down/up tests, and returned identical tagged basis/schema bytes afterwards. Duplicate create returned `created:false`.

## Measurements and identities

- ZIP: **272,751,248 bytes**, SHA-256 `60ac6bc5f04fefb85a5aeef6a5e6c5369c5a880ca6b9f205e00a12719e7bd2dc`.
- Peer SHA-1: `a976733ab47a8ed3f19c687995e09f406191f9b7`. Signing fingerprint `749F6F7C583CA630FF76AECDF255D6EA3FD20B93` from the Ubuntu keyserver URL recorded in verification.json. Signature validity is established; the keyserver key's owner identity is not independently certified by a trusted chain. The transactor has no separate public checksum; its trust is the pinned official ZIP plus the independent peer check, as specified by R29.
- Image: **371,251,125 bytes**, `sha256:d0e2465fd9548980373a61f84b8f50e339a82cd627c56ead0ac284b87cb34c6d`.
- Build inputs: `c15195a2c2bffd4de222f55ea79c76266b321bc8b02f6451e9a157d386199256`.
- Final effective config: `41160708b65bbc45ec2b56b835c0bd55adc641acd04887854f26afcef33055bd`. Schema: `f404f7ca897e549d80a2ec13890cc7fc6836f9cdb6f1735f28a804583b437d5d`. Gateway source and all jar/base/input hashes are in summary.json and build-5.json.
- Initial empty-volume cold start: **19.757 s**, diagnostic on the first deployment before the final explicit enclosing CPU set/read-only mounts. Final deployment process start with retained storage: **18.149 s**; final park/restart to READY: **20.250 s**. No fresh empty-volume run was made after the mount correction because the persistence proof was retained.
- Final 100-create HTTP path (includes schema installation, scope initialization and sync, not just the bare create API): median **336.95 ms**, p95 **664.53 ms**, p99 **849.02 ms**, max **1407.51 ms**. Sequential, on the shared lab host; these are observations, not P2 acceptance.

| Final deployment observation | Transactor RSS | Gateway RSS | Docker working set |
| --- | ---: | ---: | ---: |
| Idle after READY | 366,028 KiB (357.45 MiB) | 311,512 KiB (304.21 MiB) | 625.8 MiB |
| After creating 100 new scope databases | 570,192 KiB (556.83 MiB) | 518,996 KiB (506.83 MiB) | 1.035 GiB |

These snapshots fit the 2.75 GiB cap and do not establish the G1/G2/concurrent-read memory envelope or a continuous peak. The second measurement began with the prior retained proof database already on disk. After 100 creations the raw `/proc` samples show 879 transactor threads and 375 gateway threads (1,256 container PIDs): database-count thread cost merits observation in DA01. No heap tuning was performed.

## R29 corrections, first failures and tooling

The actual ZIP has Clojure **1.12.5**, data.json **2.5.2**, Ring **1.10.0**, Jetty **9.4.53.v20231009**. Their jar hashes are pinned. `taskset`, bash and `jdk.httpserver` are present in the pinned base, though Jetty is used. The distributed dev template actively recommends 32m index threshold, **256m** index max and **128m** object cache for a 1 GiB heap; 512m is the commented 4 GiB production recommendation. The original template is retained unchanged in `lab/config/datomic/dev-transactor-template.properties`.

First failures remain in `receipts/first-failures.json` and selftest/build logs. The fixes were: own Buildx/Docker config paths after a denied global activity write; check `d/entid` before querying uninstalled scope schema; list database names with a wildcard URI; assert Datomic's returned valueType keyword directly; delete a mem database before releasing its peer. Idempotent create additionally preserves a tested nonzero scope position. Builds 2-5 and failed tests 1-3 remain retained; selftest 4 passed.

Docker's fresh owned config did not discover the Homebrew Buildx plugin, so the successful builds used Docker's legacy builder (the deprecation message is retained). No global config/cache was written and no registry push occurred. Base inspection used Buildx before the build as required.

Offline frozen pnpm installation used the owned store. With the new dependency-free package, pnpm also sorted existing lockfile blocks and added an empty importer even under frozen install; that generated rewrite was restored to HEAD, retaining every original pin and keeping this task out of the lockfile. pnpm 10 rejects bare `--store-dir` on run commands, so the committed local tools/pnpm wrapper uses its equivalent `--config.store-dir` for gate subprocesses; it never runs `pnpm config set`. There are no new npm runtime dependencies.

## Handoff, retention and limits

`tx2-datomic-dev` is left running READY under holder `EXP-DA00`, on the private triplex2 Docker endpoint. The final pool reserves 9.25 GiB of 11 GiB for the three residents; no 3.5 GiB exclusive slot fits until the orchestrator parks Datomic. Only the required builder persistence tests parked/restarted this owned resident. No XTDB/QLever resident or unrelated container was stopped, resized or recreated; no default Docker daemon, homebase checkout, reserved port, merge or push was used.

Two small owned test scopes remain as persistence proofs: the initial and final measurement's first database (exact scopes/names in summary.json). The other 198 measured scopes were deleted through the test-only API, with raw responses retained. The health database, dev volume, original ZIP, extracted distribution, signing evidence, failed build contexts/images, input manifests and all first-failure receipts are retained. No unknown backend state was deleted. The inherited status display may list the same volume as retained after it is mounted again; the active reservation and actual container state are separately recorded.

Before merge, engine commands must set `TX2_CONFIG_DIR` to this worktree, because the harness normally reads shared main configuration. The orchestrator can park this resident with this branch's engine.mjs and `down --lane datomic --slot dev --holder EXP-DA00`; default down preserves the volume. No automatic parking policy was added.

This experiment did not implement the Triplex storage adapter, transact/read/log/native query/pull routes, or query-function allowlist; unimplemented routes return 404 and execute no supplied query. `recordedAt` is null at skeleton basis because there are no Triplex commit annotations yet. No G1, G2, NS, GS, exclusive Datomic profile, long-running memory stress, root pnpm check, pack check, deployment, publication or independent adversarial review was performed. DA01 owns adapter/metadata semantics and full public-value coverage; Q78e's final dev-storage tenancy/erasure decisions remain open for Sam. A separate reviewer must rerun the relevant gates before promotion.


INT-D retention: bulky evidence is indexed in [SHA256SUMS](../INT-D/SHA256SUMS); original paths and byte lengths are in [relocation.json](../INT-D/relocation.json). Historical hashes describe the retained bytes at the durable root.
