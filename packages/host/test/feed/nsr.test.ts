import { expect, it, vi } from "vitest";
vi.mock("node:os", async (original) => {
  const actual = await original<typeof import("node:os")>();
  return { ...actual, platform: vi.fn(actual.platform), hostname: vi.fn(actual.hostname) };
});
vi.mock("node:fs", async (original) => {
  const actual = await original<typeof import("node:fs")>();
  return {
    ...actual,
    readFileSync: vi.fn(actual.readFileSync),
    statSync: vi.fn(actual.statSync),
    statfsSync: vi.fn(actual.statfsSync),
    realpathSync: vi.fn(actual.realpathSync),
  };
});
import * as os from "node:os";
import * as fs from "node:fs";
import { sameFeedClock } from "@triplex-build/triplex/feed";
import {
  openHostFeedClock,
  SqliteConsumerStore,
  assertDurableFlush,
  DurableFlushRefused,
} from "../../src/feed/index.js";

it("NSR: Linux clock ignores two hostnames but refuses another boot or time namespace", () => {
  const originalRead = fs.readFileSync;
  vi.mocked(os.platform).mockReturnValue("linux");
  vi.mocked(fs.readFileSync).mockImplementation(((file: any, ...args: any[]) =>
    String(file) === "/proc/sys/kernel/random/boot_id"
      ? "12345678-1234-1234-1234-123456789abc"
      : (originalRead as any)(file, ...args)) as any);
  vi.mocked(fs.statSync).mockReturnValue({ ino: 4026531834n } as any);
  const name = vi.mocked(os.hostname).mockReturnValue("tx2-box");
  try {
    const a = openHostFeedClock().domain;
    name.mockReturnValue("tx2-driver");
    const b = openHostFeedClock().domain;
    expect(a).toEqual({
      primitive: "CLOCK_MONOTONIC",
      bootId: "12345678-1234-1234-1234-123456789abc",
      timeNs: "4026531834",
    });
    expect(sameFeedClock(a, b)).toBe(true);
    expect(sameFeedClock(a, { ...b, timeNs: "4026531835" } as any)).toBe(false);
    expect(sameFeedClock(a, { ...b, bootId: "99999999-1234-1234-1234-123456789abc" } as any)).toBe(
      false,
    );
    expect(name).not.toHaveBeenCalled();
  } finally {
    vi.resetAllMocks();
  }
});
it("NSR: Linux tmpfs/overlay refuse with typed error before any SQLite file is created", () => {
  vi.mocked(os.platform).mockReturnValue("linux");
  vi.mocked(fs.realpathSync).mockReturnValue("/durable");
  const stat = vi.mocked(fs.statfsSync);
  try {
    for (const type of [0x01021994, 0x794c7630]) {
      stat.mockReturnValue({ type } as any);
      expect(() => assertDurableFlush("/durable/broker.db")).toThrow(DurableFlushRefused);
      expect(() => new SqliteConsumerStore("/durable/consumer.db")).toThrow(DurableFlushRefused);
    }
  } finally {
    vi.resetAllMocks();
  }
});
