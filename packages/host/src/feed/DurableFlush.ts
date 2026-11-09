import {
  closeSync,
  fsyncSync,
  openSync,
  readFileSync,
  realpathSync,
  statfsSync,
  unlinkSync,
  writeSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { platform } from "node:os";
import { randomUUID } from "node:crypto";

export class DurableFlushRefused extends Error {
  readonly _tag = "DurableFlushRefused";
  constructor(readonly reason: string) {
    super(`Durable flush refused: ${reason}`);
  }
}
// [EXP-NSR] Why: FULL is ineffective on volatile or unverified Linux storage. Rejected: trusting fullfsync=ON (a Linux no-op).
export function assertDurableFlush(file: string) {
  if (!file || file === ":memory:") throw new DurableFlushRefused("durable file required");
  if (platform() !== "linux") return { platform: platform(), class: "host-fullfsync-unqualified" };
  const parent = realpathSync(dirname(file));
  const type = Number(statfsSync(parent).type);
  if (![0xef53, 0x58465342, 0x9123683e].includes(type))
    throw new DurableFlushRefused(`filesystem 0x${type.toString(16)} (tmpfs/overlay/unverified)`);
  const decode = (s: string) =>
    s.replace(/\\([0-7]{3})/g, (_, oct: string) => String.fromCharCode(parseInt(oct, 8)));
  const mount = readFileSync("/proc/self/mountinfo", "utf8")
    .trim()
    .split("\n")
    .map((line) => line.split(" "))
    .filter((parts) => {
      const at = decode(parts[4]!);
      return parent === at || parent.startsWith(at === "/" ? "/" : at + "/");
    })
    .sort((a, b) => b[4]!.length - a[4]!.length)[0];
  if (!mount || mount.some((x) => /(^|,)(nobarrier|barrier=0)(,|$)/.test(x)))
    throw new DurableFlushRefused("mount barriers unavailable");
  const device = mount[2]!;
  let cache: string;
  try {
    const dev = realpathSync(`/sys/dev/block/${device}`);
    try {
      cache = readFileSync(join(dev, "queue/write_cache"), "utf8").trim();
    } catch {
      cache = readFileSync(join(dirname(dev), "queue/write_cache"), "utf8").trim();
    }
  } catch {
    throw new DurableFlushRefused("device flush path unavailable");
  }
  if (!["write back", "write through"].includes(cache))
    throw new DurableFlushRefused("unknown device cache mode");
  const probe = join(parent, `.nsr-flush-${randomUUID()}`);
  const times: number[] = [];
  const fd = openSync(probe, "wx", 0o600);
  try {
    for (let i = 0; i < 5; i++) {
      writeSync(fd, Buffer.alloc(4096, i));
      const start = process.hrtime.bigint();
      fsyncSync(fd);
      times.push(Number(process.hrtime.bigint() - start) / 1e6);
    }
  } catch {
    throw new DurableFlushRefused("fsync failed");
  } finally {
    closeSync(fd);
    unlinkSync(probe);
  }
  return {
    platform: "linux",
    class: "guest-flush-host-power-loss-unqualified",
    device,
    cache,
    filesystem: type,
    calibrationMedianMs: times.sort((a, b) => a - b)[2],
  };
}
