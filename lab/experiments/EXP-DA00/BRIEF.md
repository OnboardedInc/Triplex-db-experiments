# EXP-DA00 brief: Datomic image, resident and gateway skeleton under engine.mjs (lane D bring-up)

## North star
Correctness floor for every lane D receipt, no priority yet: every later lane D number (P1 to P5) and gate (G1, G2, NS, GS) binds the
image, Datomic build, config and slot this experiment creates, so nothing about lane D can be measured or trusted before it lands.
The one priority-relevant choice made here is the process split (transactor and gateway peer on separate CPUs), which is lane D's P1
hypothesis. Read lab/NORTH-STAR.md first.

## Scope
lab/SCOPE.md (lane D added 2026-11-08), lab/NORTH-STAR.md, lab/TARGETS.md, lab/PROTOCOL.md. Design source:
/Users/sam/Claude/Projects/triplex-db-2/R29/R29-final-report.md sections 1, 2 and 3 (read all three before writing code). Inherited
homebase files are for code facts only.

## Commander's intent
At the end, `node lab/bin/engine.mjs up --lane datomic --slot dev` starts `tx2-datomic-dev` from a locally built, digest-pinned image
whose Datomic Pro 1.0.7745 bytes were verified against an independent channel, the container runs a transactor and a Triplex gateway
peer on separate CPUs, `status` shows it READY inside the pool ledger, and `/health` proves the gateway can reach the transactor. A
`@triplex-build/triplex-datomic` package exists with a typed HTTP client and passes G0. EXP-DA01 can then start writing the storage
adapter without touching infrastructure.

## Point of view
1. **Download and verify (R29 1.3).** Fetch `https://datomic-pro-downloads.s3.amazonaws.com/1.0.7745/datomic-pro-1.0.7745.zip` into a
   new empty directory `/Users/sam/Claude/Projects/triplex-db-2/downloads/datomic-pro-1.0.7745/`. Treat it as untrusted data: no scripts
   run from inside it. Record its sha256 in `lab/config/datomic/SHA256SUMS`. Check the bundled `peer-1.0.7745.jar` against Maven
   Central's `peer-1.0.7745.jar.sha1` and verify `peer-1.0.7745.jar.asc` with gpg (record the key fingerprint and where the key came
   from). Stop and report if either check fails. No sign-up or email is involved; never send personal details anywhere.
2. **Image (R29 2.2).** `lab/config/datomic/Dockerfile` FROM
   `eclipse-temurin:21.0.13_9-jre-noble@sha256:0eda5830ed7b669abc246a8dc520ea8a23cab06f9a8d4b6964109e2f2394e46f` (re-check the digest
   and its arm64 manifest with `docker buildx imagetools inspect` first). Unzip on the host into the build context, COPY to
   `/opt/datomic`, COPY the gateway source. No apt installs. Build with `DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock`
   through a new `engine.mjs build --lane datomic` subcommand that prints the image id and the build-input hash; commit both into
   `lab/config/slots.json` (`lanes.datomic.imageId`, `buildInputsSha256`). `up` refuses when the local image id differs.
3. **One container, two JVMs (R29 2.1).** `lab/config/datomic/entrypoint.sh`: start the transactor with
   `lab/config/datomic/transactor.properties` (protocol dev, data dir on `/data`, host and alt-host 127.0.0.1; memory settings from R29
   2.3), wait for its port, create the `tx2-health` database if absent, start the gateway with `bin/run -m triplex.gateway.main`, pin
   each with `taskset -c` from `TX_CPUS` and `GW_CPUS`, `wait -n`, exit nonzero when either exits. JVM options exactly as R29 2.3,
   including `-XX:+ExitOnOutOfMemoryError`.
4. **engine.mjs datomic lane (R29 2.4).** slots.json `lanes.datomic` and `slots.datomic` (dev 8470 resident with `parkable: true`, cap
   2.75 GiB, 2 CPUs; s1-s3 8471-8473 exclusive, 3.5 GiB). `effectiveConfig`, `runArgs`, `probe` and the Docker health command
   (bash `/dev/tcp`, no curl) for the new lane; the volume holds the dev storage. Keep the existing lanes' effective-config hashes
   byte-identical (test this: the lab unit tests must show no hash change for xtdb and qlever slots). Add an `engine.mjs selftest --lane
   datomic` that runs the gateway's own tests on `datomic:mem://` in a `--rm --network none` container with a 1.5 GiB cap admitted
   through the pool.
5. **Gateway skeleton (R29 3).** `packages/datomic/gateway/src/triplex/gateway/*.clj`: HTTP server (prefer an HTTP server and JSON
   library already in Datomic's `lib/`; else `com.sun.net.httpserver` on virtual threads; list what you used and its jar hash),
   `GET /health` (200 only when `d/sync` on `tx2-health` completes within 2 s), `POST /v1/db/create` and `POST /v1/db/delete` (test
   scopes only), `GET /v1/db/{db}/basis`, and the tagged value codec of R29 section 3 with round-trip tests for long min and max,
   `-0.0`, subnormals, shortest-repr doubles, bigdec scale, entity ids above 2^53, NaN and infinity rejection. The lane D schema of R29
   4.2 is installed by `create` and identified by a schema hash.
6. **TS package skeleton.** `packages/datomic` (`@triplex-build/triplex-datomic`): `DatomicClient` on `node:http` with a keep-alive
   agent (maxSockets at least 512, so 256 readers plus writers never queue on sockets; R16 found XTDB's 42-connection default the P1
   blocker), the tagged codec mirrored in TS with the same test vectors, typed errors. Add it to `lab/bin/gate.mjs` PACKAGES and the
   lane list for G0; regenerate `lab/config/g0-expected-skips.json` only for new live tests gated by `DATOMIC_INTEGRATION` (a change to
   that file is a gate change: say so in the commit and the report for verifier review).
7. **Measure, do not tune.** Record: image size, zip size, cold start to READY, RSS of each JVM idle and after creating 100 databases,
   `create-database` latency (G1 creates 89 per run), and the dev transactor template's defaults from
   `config/samples/dev-transactor-template.properties` in the zip.
8. **Rejected:** peer-server and the REST server as the access path (R29 3); two containers (R29 2.1); Datomic Local (R29 1.2); any
   Datomic version other than 1.0.7745 (R29 1.1).

## Boundaries
- Worktree: `git -C /Users/sam/projects/triplex-db-2 worktree add /Users/sam/projects/triplex-db-2/.claude/worktrees/da00 -b
  exp/DA00-datomic-bringup main`. pnpm only with `--store-dir /Users/sam/projects/triplex-db-2/.pnpm-store`.
- Files: `lab/config/datomic/**`, `lab/config/slots.json` (datomic entries only), `lab/bin/engine.mjs`, `lab/bin/lib.mjs` (only if
  needed), `lab/bin/gate.mjs` (G0 package and lane list only), `lab/bin/test/**`, `lab/config/g0-expected-skips.json` (datomic entries
  only), `packages/datomic/**`, `lab/experiments/EXP-DA00-datomic-bringup/**`. Do not edit `lab/acceptance/**`.
- Engine: `tx2-datomic-dev` only, holder `EXP-DA00`. The pool may refuse it while an exclusive slot is held; then ask the orchestrator
  (report it and stop) instead of retrying in a loop. Never stop or recreate `tx2-xtdb-dev` or `tx2-qlever-dev`. Docker only via
  `DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock`; container lifecycle only through engine.mjs. Never touch
  /Users/sam/projects/triplex-db or ports 15442 and 17019.
- Heavy commands (image build, selftest, G0) through `node lab/bin/heavy.mjs --label DA00 -- <command>`. No heavy run below 5 GiB host
  disk free.

## Gates
1. `node lab/bin/gate.mjs G0 --lane datomic --exp EXP-DA00` PASS (and G0 for xtdb and qlever still PASS, unchanged skip counts).
2. `node lab/bin/engine.mjs up --lane datomic --slot dev --holder EXP-DA00`, then `status` shows READY and the reservation; `down`
   then `up` again shows the database created before the park still present (the parkable-resident property).
3. `node lab/bin/engine.mjs selftest --lane datomic` PASS.
4. `node --test lab/bin/test/lab.test.mjs` PASS, including the unchanged-hash test for existing slots.
Receipts: the G0 receipt, the engine event log lines, the selftest output, a `lab/experiments/EXP-DA00-datomic-bringup/receipts/`
JSON with the measurements of point 7 and every hash (zip, peer jar sha1 match, gpg verdict and key fingerprint, base digest, image id,
build inputs, effective config).

## Report
Write `lab/experiments/EXP-DA00-datomic-bringup/REPORT.md` and commit it. Result class (PROGRESSED, PARTIAL, BLOCKED); branch head;
per point what was built (file:line) and its evidence; the measurements; any R29 assumption that was wrong (dev defaults, available
jars, `jdk.httpserver`, heap sizes, RSS against the 2.75 GiB cap); open questions. Commits end with
`Co-Authored-By: Codex gpt-6.1-sol <noreply@openai.com>`. Code comments carry `// [EXP-DA00] Why: ... Rejected: ...` (Clojure: `;;`).
