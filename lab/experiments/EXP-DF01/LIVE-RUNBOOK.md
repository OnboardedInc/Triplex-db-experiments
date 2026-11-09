# Live-peer runbook

Attempt 001 stopped at its first fixture write. Attempt 002 ran the corrected fixture, excision, Peer restart, real-queue
polling diagnostics, package regressions and G1; see `REPORT.md` and `live/attempt-002/`. The commands below are the original
parked-peer plan, not fresh execution receipts. Future runs require a newly authorized window and new evidence names.

Only the orchestrator may unpark the retained `tx2-datomic-dev-data` volume. These commands are for that later authorized window.
Use a fresh evidence name for every attempt; preserve failures and scratch databases if a stage fails.

From this branch's worktree, with host disk free >= 5 GiB, after coordinating the resident holder and available pool:

```sh
export DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock
export TX2_CONFIG_DIR="$PWD"
node lab/bin/heavy.mjs --label DF01-live-build -- node lab/bin/engine.mjs build --lane datomic
node lab/bin/engine.mjs up --lane datomic --slot dev --holder DF01-live --exp EXP-DF01
```

The build updates only this worktree's `slots.json` image/source pins. The orchestrator must coordinate use of that config;
do not edit acceptance pins, reuse an old deployed image, use `--fresh`, or delete the retained volume.
Check `engine.mjs status` and record the container ID, effective config, image hash and gateway source hash before proceeding.

The image contains `triplex.gateway.feed-live`. This command runs a separate Peer JVM within the already admitted resident;
its additional heap is bounded to 256 MiB. Confirm that this fits the resident's existing cap and CPU budget first.
If it does not, stop here and arrange an admitted larger lane-D profile; do not loosen the cap.

```sh
node lab/bin/heavy.mjs --label DF01-live-excision -- docker exec \
  -e DATOMIC_EXT_CLASSPATH=/opt/gateway/src \
  -e 'DATOMIC_JAVA_OPTS=-Xms64m -Xmx256m' \
  tx2-datomic-dev bash -c 'cd /opt/datomic && bin/run -m triplex.gateway.feed-live prepare /data/df01-attempt-001.edn'
node lab/bin/heavy.mjs --label DF01-live-restart -- docker exec \
  -e DATOMIC_EXT_CLASSPATH=/opt/gateway/src \
  -e 'DATOMIC_JAVA_OPTS=-Xms64m -Xmx256m' \
  tx2-datomic-dev bash -c 'cd /opt/datomic && bin/run -m triplex.gateway.feed-live resume /data/df01-attempt-001.edn'
```

Prepare creates one unique scratch database, writes a fixed identity/value fixture with a Triplex annotation, records its log
page, excises only the value attribute, requests indexing, awaits `sync-excise`, and compares identity rows. Resume runs in a
new OS process with no report queue, compares the complete replay page and deletes only that scratch database on success.
A failed prepare leaves the scratch database for diagnosis (its scope/db identity is available in transactor records);
a failed resume retains the EDN. Copy both EDN files and all stdout/stderr into durable evidence with checksums.
These commands are authored but unexecuted; they are not proof that the dev-storage excision gate passes.

Then exercise the deployed HTTP route with `DatomicClient.log` using the database created by a fresh adapter fixture, and run
the existing real-peer regressions:

```sh
DATOMIC_INTEGRATION=1 DATOMIC_GATEWAY_URL=http://127.0.0.1:8470 \
  node lab/bin/heavy.mjs --label DF01-live-regression -- \
  pnpm --config.store-dir=/Users/sam/projects/triplex-db-2/.pnpm-store \
  --filter @triplex-build/triplex-datomic test
node lab/bin/heavy.mjs --label DF01-live-G1 -- \
  node lab/bin/gate.mjs G1 --lane datomic --slot dev --holder DF01-live --exp EXP-DF01
```

Record first-delivery/resume `feedBytes` and raw log pages, including every skipped t. A storage-level excision of identity
attributes is outside this route's preservation contract; it must fail, not silently emit an incomplete feed.
Park only with orchestrator authorization through `engine.mjs down` using the actual holder, preserving the volume.
No live gate here closes P3 latency, domain fanout, 256-reader performance or production/Postgres qualification.
