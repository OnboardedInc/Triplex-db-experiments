# Full-size pinned read comparison

Run on the prepared fresh SCALE1 copy with ten accounts in one database. Use the exact DX-RD1 run commit, its [prepared build](../v01/SERVER.md), and the held image and transfer pins. The existing native queue serializes access. Allow 240 GiB of free scratch. The command stops at 56 minutes and allows 90 seconds for termination. A restore exceeding its 11-minute stream budget leaves an incomplete comparison. Build preparation is separate.

```bash
cd "$BUILD/repository"
sudo env "PATH=$BUILD/tools/bin:$PATH" "DX_V01_BUILD_RECEIPT=$BUILD/BUILD-v0.1.json" \
  "$BUILD/tools/bin/node" lab/bin/scorecard.mjs --commit "$COMMIT" \
  --age fresh --seed "$SCALE1_IMAGE" --image-sha256 "$SCALE1_IMAGE_SHA256" \
  --transfer-sha256 "$SCALE1_TRANSFER_SHA256" --out "$RD1_OUT" --read-study \
  --tx-jvm j25-zgc --wal-directory "$RD1_WAL_DIR"
```

Use a new absolute `RD1_OUT` and the prepared separate WAL directory. Both arms match the archived Java 25 ZGC transactor and Java 21 G1 writer unless overridden. Use `--writer grouped` for the alternative writer and a fresh output folder. `--read-study-jvm j25-zgc` changes only the tuned read gateway JVM in this comparison. G1 is the initial treatment because ZGC competes for cores during concurrent collection. Use `--plan --read-study --tx-jvm j25-zgc` to see both policies without starting containers.

The command restores the same immutable dump for each arm. In the archived run, the loaded ladder started 132 seconds after the zero-reader arm finished. The saved rate is an open-loop **offer** rate. Each arm runs the six 30-second closed-loop levels at 50, then repeats at 235, followed after each ladder by 1,000 current pulls at its terminal cut. The driver uses cores 9–10 in both arms. The treatment moves one write-gateway core and the unused driver core to the reader. Record completed and expired saves beside the reader numbers. No reader prewarming or first-read fixture runs before the ladder. The 235 window naturally follows 50 in both arms. The same sampled recorder runs in both arms and replaces generic summary recording on these routes. Treat the recorder and startup order as differences from the archive.

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

See `campaign/{control,tuned}/{50,235}/arm.json` for phase and save denominators. Join the same slot's `engines/<slot>/trace/raw/gw-r.jsonl` to each rate's `read-wire.json` with `read-attribution.ts joined RATE_FOLDER NATIVE_JSONL` (Node with `--experimental-transform-types`). Its output keeps missing joins explicit and includes native I/O categories, request CPU and raw nested span totals. Never add a parent and its children. Use `rd1-gc.log` for wall-aligned pauses and cgroup pressure for CPU versus I/O. `beforeGateway` combines kernel, network and Jetty dispatch. Cross-process timing uses the same Linux boot clock only.
