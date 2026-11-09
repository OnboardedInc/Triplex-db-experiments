import {
  closeSync,
  fsyncSync,
  openSync,
  readFileSync,
  realpathSync,
  statfsSync,
  lstatSync,
  statSync,
  fstatSync,
  unlinkSync,
  writeSync,
} from "node:fs";
import { dirname, join, basename } from "node:path";
import { platform } from "node:os";
import { randomUUID } from "node:crypto";
export class DurableFlushRefused extends Error {
  readonly _tag = "DurableFlushRefused";
  constructor(readonly reason: string) {
    super(`Durable flush refused: ${reason}`);
  }
}
// [EXP-NSR-R3] Why: equal filesystem types do not imply equal devices or WAL barriers. Rejected: calibrating a parent device while admitting a DB/sidecar file mount from another device (F3).
export function assertDurableFlush(file: string) {
  if (!file || file === ":memory:") throw new DurableFlushRefused("durable file required");
  if (platform() !== "linux") return { platform: platform(), class: "host-fullfsync-unqualified" };
  const parent = realpathSync(dirname(file)),
    requested = join(parent, basename(file));
  const resolveExisting = (name: string): string | undefined => {
    try {
      lstatSync(name);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
      throw error;
    }
    try {
      return realpathSync(name);
    } catch {
      throw new DurableFlushRefused("dangling database or sidecar link");
    }
  };
  const target = resolveExisting(requested);
  const paths = [{ role: "directory", path: parent, requested: parent }];
  if (target) paths.push({ role: "database", path: target, requested });
  for (const suffix of ["-wal", "-shm", "-journal", ".lock"]) {
    const name = requested + suffix,
      resolved = resolveExisting(name);
    if (resolved) paths.push({ role: suffix, path: resolved, requested: name });
  }
  for (const item of paths) {
    const type = Number(statfsSync(item.path).type);
    if (![0xef53, 0x58465342, 0x9123683e].includes(type))
      throw new DurableFlushRefused(`filesystem 0x${type.toString(16)} (tmpfs/overlay/unverified)`);
  }
  const decode = (s: string) =>
    s.replace(/\\([0-7]{3})/g, (_, oct: string) => String.fromCharCode(parseInt(oct, 8)));
  const mounts = readFileSync("/proc/self/mountinfo", "utf8")
    .trim()
    .split("\n")
    .map((line) => line.split(" "));
  const mountFor = (name: string) =>
    mounts
      .filter((parts) => {
        const at = decode(parts[4]!);
        return name === at || name.startsWith(at === "/" ? "/" : at + "/");
      })
      .sort((a, b) => b[4]!.length - a[4]!.length)[0];
  const checked = paths.map((item) => {
    const filesystem = Number(statfsSync(item.path).type);
    if (![0xef53, 0x58465342, 0x9123683e].includes(filesystem))
      throw new DurableFlushRefused(
        `filesystem 0x${filesystem.toString(16)} (tmpfs/overlay/unverified)`,
      );
    if (item.path !== item.requested)
      throw new DurableFlushRefused("database/sidecar symlink refused");
    const mount = mountFor(item.path);
    if (!mount || mount.some((x) => /(^|,)(nobarrier|barrier=0)(,|$)/.test(x)))
      throw new DurableFlushRefused("mount barriers unavailable");
    return {
      role: item.role,
      path: item.path,
      filesystem,
      device: mount[2]!,
      mountId: mount[0]!,
      stDev: String(statSync(item.path, { bigint: true }).dev),
    };
  });
  const directory = checked[0]!;
  if (
    checked.some(
      (p) =>
        p.device !== directory.device ||
        p.stDev !== directory.stDev ||
        p.mountId !== directory.mountId,
    )
  )
    throw new DurableFlushRefused("database/sidecar device or file-mount mismatch");
  // No file mounts are admitted, so a probe on the checked directory measures the same device as every existing SQLite file.
  const device = directory.device;
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
  const probe = join(parent, `.nsr-flush-${randomUUID()}`),
    times: number[] = [];
  const fd = openSync(probe, "wx", 0o600);
  try {
    if (
      String(fstatSync(fd, { bigint: true }).dev) !== directory.stDev ||
      mountFor(realpathSync(probe))?.[0] !== directory.mountId
    )
      throw new DurableFlushRefused("calibration device mismatch");
    for (let i = 0; i < 5; i++) {
      writeSync(fd, Buffer.alloc(4096, i));
      const start = process.hrtime.bigint();
      fsyncSync(fd);
      times.push(Number(process.hrtime.bigint() - start) / 1e6);
    }
  } catch (error) {
    if (error instanceof DurableFlushRefused) throw error;
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
    filesystem: directory.filesystem,
    targetPath: target ?? requested,
    storagePaths: checked,
    calibrationDevice: device,
    calibrationMedianMs: times.sort((a, b) => a - b)[2],
  };
}
