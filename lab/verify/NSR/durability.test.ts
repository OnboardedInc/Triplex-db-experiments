import { expect, it, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
vi.mock("node:os", async (original) => ({
  ...(await original<typeof import("node:os")>()),
  platform: () => "linux",
}));
const state = vi.hoisted(() => ({
  durable: "",
  volatile: "",
  device: "",
  lookedAt: [] as string[],
}));
vi.mock("node:fs", async (original) => {
  const actual = await original<typeof import("node:fs")>();
  return {
    ...actual,
    realpathSync: (file: any) =>
      String(file) === "/sys/dev/block/8:1" ? state.device : actual.realpathSync(file),
    statfsSync: (file: any) => {
      const real = actual.realpathSync(file);
      state.lookedAt.push(real);
      return { type: real.startsWith(state.volatile) ? 0x01021994 : 0xef53 };
    },
    readFileSync: (file: any, ...args: any[]) =>
      String(file) === "/proc/self/mountinfo"
        ? "10 1 8:1 / / rw,relatime - ext4 /dev/test rw\n"
        : (actual.readFileSync as any)(file, ...args),
  };
});
import {
  assertDurableFlush,
  DurableFlushRefused,
} from "../../../packages/host/src/feed/DurableFlush";

// [CX-VNSR] Why: a database filename can cross filesystems even when its parent is durable. Rejected: treating a parent-directory probe as proof about the opened database inode.
it("records direct tmpfs refusal and a database symlink false admission under modeled Linux probes", () => {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "CX-VNSR-flush-")));
  state.durable = path.join(root, "ext4");
  state.volatile = path.join(root, "tmpfs");
  state.device = path.join(root, "device");
  fs.mkdirSync(state.durable);
  fs.mkdirSync(state.volatile);
  fs.mkdirSync(path.join(state.device, "queue"), { recursive: true });
  fs.writeFileSync(path.join(state.device, "queue/write_cache"), "write through");
  const target = path.join(state.volatile, "store.db");
  fs.writeFileSync(target, "");
  const link = path.join(state.durable, "store.db");
  fs.symlinkSync(target, link);
  expect(() => assertDurableFlush(target)).toThrow(DurableFlushRefused);
  state.lookedAt.length = 0;
  const result = assertDurableFlush(link);
  expect(result.class).toBe("guest-flush-host-power-loss-unqualified");
  expect(state.lookedAt).toEqual([state.durable]);
  console.log(
    JSON.stringify({
      observation: "symlink-to-modeled-tmpfs-admitted",
      result,
      inspected: state.lookedAt,
      target: fs.realpathSync(link),
    }),
  );
  fs.rmSync(root, { recursive: true });
});
