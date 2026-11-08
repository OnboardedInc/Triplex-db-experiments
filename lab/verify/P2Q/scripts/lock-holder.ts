// V-P2Q C3 probe: a separate process that holds a broker stream through HostLog (the code under test) and
// appends one empty commit-group frame every 20 ms, printing one JSON line per durable frame (fsync returned,
// watermark written: what the broker ACKs on). Modes:
//   hold      append until killed
//   exit      append for 300 ms, then process.exit(0) without close()
//   graceful  on SIGINT keep appending for 2 s (a server draining), then exit
// Usage: tsx lab/verify/P2Q/scripts/lock-holder.ts <dir> <mode> <tag>
import { HostLog } from "../../../../packages/qlever/src/broker/log.js";

const [dir, mode = "hold", tag = "p"] = process.argv.slice(2);
const opened = await HostLog.open(dir!, { minFreeBytes: 0 }).catch((error) => {
  console.log(
    JSON.stringify({ event: "refused", pid: process.pid, error: String(error).slice(0, 200) }),
  );
  process.exit(4);
});
const log = opened.log;
console.log(
  JSON.stringify({ event: "opened", pid: process.pid, nextLsn: log.nextLsn, epoch: log.epoch }),
);
// [EXP-P2Q] Why: a server may outlive its failed log. Rejected: exiting on failure
// (would release its descriptor and hide whether a live failed holder still excludes a writer).
if (mode === "hold") setInterval(() => {}, 1 << 30);
let stopping = false;
const loop = async () => {
  while (!stopping) {
    const lsn = log.nextLsn;
    try {
      const frame = await log.append(
        1,
        Buffer.from(JSON.stringify({ v: 1, s: tag, l: lsn, e: log.epoch, m: [] })),
      );
      log.publishWatermark({ epoch: log.epoch, lsn: frame.lsn, position: frame.lsn * 1024 });
      console.log(
        JSON.stringify({
          event: "acked",
          tag,
          lsn: frame.lsn,
          offset: frame.offset,
          crc: frame.crc,
        }),
      );
    } catch (error) {
      console.log(JSON.stringify({ event: "append-failed", error: String(error).slice(0, 160) }));
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
};
const running = loop();
if (mode === "exit") setTimeout(() => process.exit(0), 300);
if (mode === "graceful")
  process.on("SIGINT", () => {
    console.log(JSON.stringify({ event: "sigint", pid: process.pid }));
    setTimeout(() => {
      stopping = true;
      void running.then(() => process.exit(0));
    }, 2_000);
  });
