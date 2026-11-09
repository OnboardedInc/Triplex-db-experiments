// A separate process that holds one broker stream through HostLog (src, run through tsx: Q72e) and appends one
// commit-group frame every 20 ms, printing one JSON line per durable frame (fsync returned, WATERMARK written,
// which is what the broker ACKs on). Modes:
//   hold      append until killed (stays alive after a failed append, as a server would)
//   graceful  on SIGINT keep appending for 1.5 s (a server draining), then close and exit
// Usage: tsx test/fixtures/lock-holder.ts <dir> <mode> <tag>
import { HostLog } from "../../src/broker/log.js";

const [dir, mode = "hold", tag = "p"] = process.argv.slice(2);
const say = (event: Record<string, unknown>) =>
  console.log(JSON.stringify({ pid: process.pid, ...event }));
// The test reads stdout; if it has gone, keep running rather than crash on EPIPE.
process.stdout.on("error", () => {});
// A server keeps running after its log fail-stops; so does this holder, so the lock stays with a live process.
const alive = setInterval(() => {}, 1 << 30);
const opened = await HostLog.open(dir!, { minFreeBytes: 0 }).catch((error) => {
  say({ event: "refused", error: String(error).slice(0, 200) });
  process.exit(4);
});
const log = opened.log;
say({ event: "opened", nextLsn: log.nextLsn, epoch: log.epoch });
let stopping = false;
const loop = async () => {
  while (!stopping) {
    try {
      const frame = await log.append(
        1,
        Buffer.from(
          JSON.stringify({
            v: 1,
            s: tag,
            l: log.nextLsn,
            e: log.epoch,
            m: [
              {
                o: `${tag}-${log.nextLsn}`,
                a: tag,
                p: [log.nextLsn * 1024],
                c: [],
                r: [],
                b: [],
                s: [],
              },
            ],
          }),
        ),
      );
      log.publishWatermark({ epoch: log.epoch, lsn: frame.lsn, position: frame.lsn * 1024 });
      say({ event: "acked", tag, lsn: frame.lsn });
    } catch (error) {
      say({ event: "append-failed", error: String(error).slice(0, 200) });
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
};
const running = loop();
if (mode === "graceful")
  process.on("SIGINT", () => {
    say({ event: "sigint" });
    setTimeout(() => {
      stopping = true;
      void running
        .then(() => log.close())
        .then(() => {
          say({ event: "closed" });
          clearInterval(alive);
          process.exit(0);
        });
    }, 1_500);
  });
