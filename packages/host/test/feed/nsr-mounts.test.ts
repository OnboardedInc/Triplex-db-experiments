import { expect, it, vi } from "vitest";
import fs from "node:fs";
import * as probedFs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
vi.mock("node:os", async (original) => ({
  ...(await original<typeof import("node:os")>()),
  platform: () => "linux",
}));
const state = vi.hoisted(() => ({
  root: "",
  devices: "",
  mounts: [] as Array<{ at: string; type: number; device: string; options: string }>,
  fds: new Map<number, string>(),
  synced: [] as string[],
  deny: new Set<string>(),
}));
vi.mock("node:fs", async (original) => {
  const actual = await original<typeof import("node:fs")>();
  return {
    ...actual,
    realpathSync: (file: any) =>
      String(file).startsWith("/sys/dev/block/")
        ? path.join(state.devices, String(file).split("/").at(-1)!)
        : actual.realpathSync(file),
    statfsSync: (file: any) => ({
      type: state.mounts.find((m) => m.at === actual.realpathSync(file))?.type ?? 0xef53,
    }),
    readFileSync: (file: any, ...args: any[]) =>
      String(file) === "/proc/self/mountinfo"
        ? "10 1 8:1 / / rw,relatime - ext4 /dev/a rw\n" +
          state.mounts
            .map(
              (m, i) =>
                `${20 + i} 10 ${m.device} / ${m.at} rw,relatime - ${m.type === 0x01021994 ? "tmpfs" : "ext4"} /dev/b ${m.options}\n`,
            )
            .join("")
        : (actual.readFileSync as any)(file, ...args),
    openSync: (...args: any[]) => {
      const fd = (actual.openSync as any)(...args);
      state.fds.set(fd, actual.realpathSync(args[0]));
      return fd;
    },
    closeSync: (fd: number) => {
      state.fds.delete(fd);
      return actual.closeSync(fd);
    },
    fsyncSync: (fd: number) => {
      const file = state.fds.get(fd)!;
      state.synced.push(file);
      if (state.deny.has(file))
        throw Object.assign(Error("modeled target device fsync EIO"), { code: "EIO" });
      actual.fsyncSync(fd);
    },
  };
});
import { assertDurableFlush, DurableFlushRefused } from "../../src/feed/DurableFlush.js";

function setup() {
  state.root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "CX-VNSR-R2-")));
  state.devices = path.join(state.root, "devices");
  state.mounts = [];
  state.fds.clear();
  state.synced = [];
  state.deny.clear();
  for (const device of ["8:1", "8:2"]) {
    fs.mkdirSync(path.join(state.devices, device, "queue"), { recursive: true });
    fs.writeFileSync(path.join(state.devices, device, "queue/write_cache"), "write through");
  }
  const file = path.join(state.root, "store.db");
  fs.writeFileSync(file, "unchanged database bytes");
  return file;
}
function record(kind: string, data: any) {
  const root = process.env.NSR_R3_EVIDENCE ?? path.join(os.tmpdir(), "NSR-R3-modeled");
  fs.mkdirSync(root, { recursive: true });
  const file = path.join(root, kind + "-" + randomUUID() + ".json");
  fs.writeFileSync(file, JSON.stringify({ kind, ...data }, null, 2));
}
// [CX-VNSR-R2] Why: a file mount is not a symlink, but statfs on the actual filename must still see tmpfs. Rejected: proving only the original symlink case.
it("refuses a modeled tmpfs database-file bind mount while its parent remains ext4", () => {
  const file = setup();
  state.mounts = [{ at: file, type: 0x01021994, device: "0:77", options: "rw" }];
  expect(() => assertDurableFlush(file)).toThrow(DurableFlushRefused);
  record("tmpfs-file-mount-refused", { file, fsyncPaths: state.synced });
  fs.rmSync(state.root, { recursive: true });
});
// [CX-VNSR-R2] Why: hard links retain the same inode/filesystem; a second durable name should not be mistaken for a tmpfs relocation. Rejected: constructing an impossible cross-filesystem hard-link model.
it("checks an actual hard link to a durable inode under the modeled Linux classifier", () => {
  const file = setup(),
    alias = path.join(state.root, "hard.db");
  fs.linkSync(file, alias);
  expect(fs.statSync(file).ino).toBe(fs.statSync(alias).ino);
  expect(fs.statSync(alias).nlink).toBe(2);
  const result = assertDurableFlush(alias);
  expect(result.targetPath).toBe(alias);
  record("durable-hard-link", { file, alias, inode: fs.statSync(alias).ino, result });
  fs.rmSync(state.root, { recursive: true });
});
// [CX-VNSR-R2] Why: the database can be an ext4 file mount on another device even when both filesystem types agree. Rejected: calibrating an unrelated file on the parent device.
it("refuses cross-device database calibration with the review EIO control", () => {
  const file = setup();
  state.mounts = [{ at: file, type: 0xef53, device: "8:2", options: "rw" }];
  state.deny.add(file);
  const fd = probedFs.openSync(file, "r+");
  try {
    expect(() => probedFs.fsyncSync(fd)).toThrow("modeled target device fsync EIO");
  } finally {
    probedFs.closeSync(fd);
  }
  state.synced = [];
  expect(() => assertDurableFlush(file)).toThrow("device or file-mount mismatch");
  expect(state.synced).toHaveLength(0);
  expect(fs.readFileSync(file, "utf8")).toBe("unchanged database bytes");
  record("F3-target-calibration-refused", {
    file,
    calibratedPaths: state.synced,
    explicitTargetFsync: "EIO",
  });
  fs.rmSync(state.root, { recursive: true });
});
// [CX-VNSR-R2] Why: same-type sidecar mounts can have a different device and disabled barriers. Rejected: comparing statfs.type alone as a sidecar durability proof.
it("refuses a same-type WAL file mount with nobarrier", () => {
  const file = setup(),
    wal = file + "-wal";
  fs.writeFileSync(wal, "WAL bytes");
  state.mounts = [{ at: wal, type: 0xef53, device: "8:2", options: "rw,nobarrier" }];
  expect(() => assertDurableFlush(file)).toThrow("mount barriers unavailable");
  expect(() => assertDurableFlush(wal)).toThrow("mount barriers unavailable");
  expect(state.synced).toHaveLength(0);
  record("F3-sidecar-barriers-refused", {
    file,
    wal,
    walMount: state.mounts[0],
    calibratedPaths: state.synced,
  });
  fs.rmSync(state.root, { recursive: true });
});

// [EXP-NSR-R3] Why: SHM and the directory are part of the same checked storage layout, not just WAL. Rejected: exempting untested sidecar/device variants.
it("refuses SHM device changes, same-device file mounts, and volatile directories before calibration", () => {
  for (const variant of ["shm-device", "same-device-file-mount", "volatile-directory"]) {
    const file = setup(),
      shm = file + "-shm";
    fs.writeFileSync(shm, "SHM bytes");
    state.mounts =
      variant === "volatile-directory"
        ? [{ at: state.root, type: 0x01021994, device: "0:77", options: "rw" }]
        : [
            {
              at: shm,
              type: 0xef53,
              device: variant === "shm-device" ? "8:2" : "8:1",
              options: "rw",
            },
          ];
    expect(() => assertDurableFlush(file)).toThrow(DurableFlushRefused);
    expect(state.synced).toHaveLength(0);
    record("F3-layout-refused", { variant, mounts: state.mounts });
    fs.rmSync(state.root, { recursive: true });
  }
});
