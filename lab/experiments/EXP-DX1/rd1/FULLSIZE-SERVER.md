# Full-size pinned read comparison

Run on the held fresh SCALE1 PostgreSQL directory (the prepared copy) with ten accounts in one database. The server does not need `seed.pgdump`. Use the exact DX-RD1 run commit named in the handoff (it adds `rd1/prepared.ts`), its [prepared build](../v01/SERVER.md), and the held image and transfer pins. The existing native queue serializes access. Build preparation is separate.

Each reader ladder runs in its own invocation on its own scratch copy, control first, then tuned, with the same `RD1_OUT`. The server has room for one scratch copy beside the held one, so make the copy, run the ladder, remove the copy, and repeat. Each invocation stops at 28 minutes and allows 90 seconds for termination.

```bash
cd "$BUILD/repository"
# RD1_PGDATA_SOURCE: the held, stopped PG17 directory (125,923,989,950 bytes, logical cut 87,002). Never started.
# RD1_PGDATA_COPY: a path on the same NVMe that does not exist yet. RD1_WAL_DIR: an existing directory on the other NVMe.
read_ladder() {
  sudo cp -a --reflink=never "$RD1_PGDATA_SOURCE" "$RD1_PGDATA_COPY"
  sudo env "PATH=$BUILD/tools/bin:$PATH" "DX_V01_BUILD_RECEIPT=$BUILD/BUILD-v0.1.json" \
    "$BUILD/tools/bin/node" lab/bin/scorecard.mjs --commit "$COMMIT" \
    --age fresh --seed "$SCALE1_IMAGE" --image-sha256 "$SCALE1_IMAGE_SHA256" \
    --transfer-sha256 "$SCALE1_TRANSFER_SHA256" --out "$RD1_OUT" --read-study \
    --tx-jvm j25-zgc --wal-directory "$RD1_WAL_DIR" \
    --ladder "$1" --pgdata-source "$RD1_PGDATA_SOURCE" --pgdata "$RD1_PGDATA_COPY" || return 1
  sudo rm -rf --one-file-system "$RD1_PGDATA_COPY"
}
read_ladder control && read_ladder tuned
```

`scorecard.mjs` prints "The control ladder is complete" (and, after the tuned ladder, "Both ladders complete on PostgreSQL system ...") only after that ladder's evidence and cleanup inventory are sealed in `ladders/`. If a ladder stops, keep `RD1_OUT`, its log (`control.log` or `tuned.log`) and the used copy for diagnosis; a used copy is refused by every later ladder. A failed control needs a new `RD1_OUT`. A failed tuned ladder can be retried in the same `RD1_OUT` only after moving `ladders/tuned-start.json` and `campaign/tuned` aside, with a new copy. After each ladder, the WAL subdirectory `RD1_WAL_DIR/<slot>` (the slot is in `campaign/<ladder>/pgdata.json`) may be removed.

**Admission, the same as the scorecard's own arms.** Before PostgreSQL starts, each copy must be a stopped PG17 directory whose `global/pg_control` SHA-256 equals the held source's, with private regular files only (no links), distinct from the source and the evidence folder, never used before, and with 16 GiB free on its filesystem; it is then marked used. Inside the container the entrypoint checks the bind's device and inode, the control digest and a clean shutdown before it moves `pg_wal` to the separate WAL bind, and the runner checks that the WAL is on a different NVMe from the copy. After startup the runner checks the live data directory, the file identity and the PostgreSQL system identifier (the same in both ladders), then the unchanged seed identity checks: image and transfer pins, logical head 87,002, the loader's terminal command and manifest receipts, and member and field rows. The tuned ladder also requires the control ladder's sealed evidence, the same input record (source, pins, seal, launch policies, WAL devices), a new slot and a later start.

**Time and disk, predicted before the run.** The scorecard driver measured 17m25s for four full-size copies, so each copy takes about 4.4 minutes. Per ladder: about 2 minutes from start to the verified seed (no restore), two rates of 180 seconds of closed-loop levels with their saves, current pulls and checks (8–12 minutes), and cleanup, for 11–16 minutes. The pair with copies and removal takes 32–42 minutes, with a ceiling of 2 × (5 + 29.5) = 69 minutes. Peak data disk is the held directory (126 GB) plus one scratch copy (126 GB) plus the 16 GiB margin, about 268 GB on the data NVMe; the WAL NVMe holds one ladder's WAL subdirectory at a time if each is removed; the evidence folder needs 5 GiB. **This launch path is shown wrong** if startup from the copy to the verified seed takes more than 5 minutes, if the two ladders report different system identifiers, or if any seed identity check or pinned read fails on an admitted copy.

Use a new absolute `RD1_OUT` for each control ladder and the prepared separate WAL directory. Both arms match the archived Java 25 ZGC transactor and Java 21 G1 writer unless overridden. Use `--writer grouped` for the alternative writer and a fresh output folder (both ladders). `--read-study-jvm j25-zgc` changes only the tuned read gateway JVM in this comparison. G1 is the initial treatment because ZGC competes for cores during concurrent collection. Use `--plan --read-study --tx-jvm j25-zgc` to see both policies without starting containers.

Both ladders start from fresh copies of the same held directory, so neither ladder inherits writes or warm caches from the other. In the archived run, the loaded ladder started 132 seconds after the zero-reader arm finished; here it starts after a new copy, about 4.4 minutes later. The saved rate is an open-loop **offer** rate. Each arm runs the six 30-second closed-loop levels at 50, then repeats at 235, followed after each ladder by 1,000 current pulls at its terminal cut. The driver uses cores 9–10 in both arms. The treatment moves one write-gateway core and the unused driver core to the reader. Record completed and expired saves beside the reader numbers. No reader prewarming or first-read fixture runs before the ladder. The 235 window naturally follows 50 in both arms. The same sampled recorder runs in both arms and replaces generic summary recording on these routes. Treat the recorder and startup order as differences from the archive.

**Forecast before bare metal**. Each cell is p99 in ms / exact completed reads per second. Ranges include the possible cost of holding 235 offers/s. The archive came from only 3.5 offers/s.

| Readers | Control +50 | Tuned +50 | Control +235 | Tuned +235 |
|---:|---:|---:|---:|---:|
| 1 | 6–15 / 520–700 | 4–12 / 600–950 | 8–25 / 420–650 | 6–18 / 550–900 |
| 4 | 45–80 / 530–760 | 8–30 / 950–1,800 | 55–120 / 430–700 | 12–40 / 800–1,600 |
| 16 | 75–140 / 520–880 | 20–55 / 1,500–3,000 | 90–180 / 430–730 | 25–75 / 1,200–2,600 |
| 64 | 135–230 / 1,100–1,700 | 35–85 / 2,600–4,800 | 150–300 / 800–1,500 | 45–115 / 2,200–4,200 |
| 256 | 740–1,050 / 750–1,050 | 80–155 / 2,800–4,500 | 850–1,350 / 620–950 | 95–205 / 2,400–3,900 |
| 1,024 | 1,900–3,000 / 425–650 | 260–650 / 2,200–4,100 | 2,200–3,800 / 350–580 | 320–820 / 1,800–3,600 |

Current pull p50/p99 forecast is 4–7 / 40–70 ms in control and 3.5–5.5 / 20–40 ms tuned at 50. At 235 expect 5–8 / 45–85 ms and 4–6.5 / 25–55 ms. These pulls run after saves settle. The serial client cannot use three reader cores simultaneously, and the selective field decoder only affects `/read`.

Falsifiers at 256 include a mostly idle reader cgroup with most time in peer I/O, an overloaded Node loop or socket queue while the gateway stays idle, or a 64-reader peak without higher locality or less service work. A useful treatment should reduce gateway wait and the number of exchanges per checked read. If the realized batch size stays near one, the measured gain cannot be assigned to batching. Check P2 for a regression because the treatment moves one writer core. Under 100 ms is possible near the favorable end of the forecast. This short ladder does not qualify P1 or P4.

See `campaign/{control,tuned}/{50,235}/arm.json`, `campaign/{control,tuned}/pgdata.json` and `ladders/*.json` for phase and save denominators. Join the same slot's `engines/<slot>/trace/raw/gw-r.jsonl` to each rate's `read-wire.json` with `read-attribution.ts joined RATE_FOLDER NATIVE_JSONL` (Node with `--experimental-transform-types`). Its output keeps missing joins explicit and includes native I/O categories, request CPU and raw nested span totals. Never add a parent and its children. Use `rd1-gc.log` for wall-aligned pauses and cgroup pressure for CPU versus I/O. `beforeGateway` combines kernel, network and Jetty dispatch. Cross-process timing uses the same Linux boot clock only.
