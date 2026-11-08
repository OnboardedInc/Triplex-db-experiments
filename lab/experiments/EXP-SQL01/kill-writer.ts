// [EXP-SQL01] Why: kill the whole owning process, including its reader/checkpointer threads.
// Rejected: terminating only a connection (does not model the broker's crash boundary).
import { columns } from "../../../packages/qlever/src/rdf.js";
import { HostLog } from "../../../packages/qlever/src/broker/log.js";
const dir = process.argv[2]!;
const { log, frames } = await HostLog.open(dir, { minFreeBytes: 0 });
const rowLsns = new Map<number, number>();
for (const r of log.recent(0, {})) {
  const n = Math.floor(r.recorded_position / 1024);
  rowLsns.set(n, (rowLsns.get(n) ?? 0) + 1);
}
const verified = frames
  .filter(
    (f) => f.kind === 1 && log.operation(`op-${f.lsn}`)?.lsn === f.lsn && rowLsns.get(f.lsn) === 10,
  )
  .map((f) => f.lsn);
console.log(JSON.stringify({ event: "recovered", lsns: verified }));
if (process.argv[3] === "verify") {
  await log.close();
  process.exit(0);
}
let n = 0;
setInterval(() => {}, 1 << 30);
while (true) {
  const lsn = log.nextLsn;
  const payload = Buffer.from(
    JSON.stringify({
      v: 1,
      s: "sql01-kill",
      l: lsn,
      e: log.epoch,
      m: [
        {
          o: `op-${lsn}`,
          a: `at-${lsn}`,
          p: [lsn * 1024],
          c: [["claim-" + lsn, "tx-" + lsn, Date.now()]],
          r: Array.from({ length: 10 }, (_, i) =>
            columns.map(
              (c) =>
                (
                  ({
                    id: `r-${lsn}-${i}`,
                    entity_id: `s-${lsn}`,
                    attribute: ":name" + i,
                    value_type: "string",
                    value_string: "x".repeat(120),
                    recorded_position: lsn * 1024,
                    recorded_at: Date.now(),
                    valid_from: 0,
                    entity_type: "Subject",
                  }) as Record<string, unknown>
                )[c] ?? null,
            ),
          ),
          b: [],
          s: [`s-${lsn}`],
        },
      ],
    }),
  );
  const f = await log.append(1, payload);
  log.publishWatermark({ lsn: f.lsn, epoch: f.epoch, position: f.lsn * 1024 });
  console.log(JSON.stringify({ event: "acked", lsn: f.lsn }));
  if (process.argv[3] === "flip" && n === 99) await new Promise(() => {});
  if (++n % 10 === 0) await new Promise((r) => setTimeout(r, 1));
}
