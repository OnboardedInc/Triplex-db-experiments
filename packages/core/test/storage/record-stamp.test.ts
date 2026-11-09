import { describe, expect, it } from "vitest";
import {
  instantOf,
  stampOf,
  stampCut,
  nextStamp,
  gateRecordedAt,
  bindCommit,
  STAMP_PLACEHOLDER,
} from "../../src/storage/RecordStamp.js";

describe("record stamps", () => {
  it("round trips, orders and cuts across the supported range", () => {
    let seed = 17;
    for (let i = 0; i < 100000; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const stamp = Math.floor((seed / 2 ** 32) * (2 ** 43 * 1000 - 2));
      const instant = instantOf(stamp);
      expect(stampOf(instant)).toBe(stamp);
      expect(stampCut(instant)).toBe(stamp);
      expect(instantOf(stamp + 1)).toBeGreaterThan(instant);
      const t = instant + 0.0004;
      const cut = stampCut(t);
      expect(instantOf(cut)).toBeLessThanOrEqual(t);
      expect(instantOf(cut + 1)).toBeGreaterThan(t);
    }
  });
  it("bumps ties and backwards clocks and refuses invalid coordinates", () => {
    expect(nextStamp(1000000, 1000)).toBe(1000001);
    expect(nextStamp(1000000, 0)).toBe(1000001);
    for (const n of [-1, NaN, Infinity, 2 ** 43]) expect(() => stampCut(n)).toThrow(RangeError);
    expect(() => stampOf(0.0001)).toThrow(RangeError);
    expect(() => nextStamp(2 ** 43 * 1000 - 1, 0)).toThrow(RangeError);
  });
  it("gates a future cut on publication and refuses an unreached cut", async () => {
    const readCut = async () => ({ position: 1, recordedAt: 1000 });
    expect(
      await gateRecordedAt({
        recordedAt: 1000.001,
        readCut,
        awaitCut: async () => ({ position: 2, recordedAt: 1000.001 }),
        deadlineMs: 1,
        surface: "test",
      }),
    ).toEqual({ position: 2, recordedAt: 1000.001 });
    await expect(
      gateRecordedAt({
        recordedAt: 1000.001,
        readCut,
        awaitCut: readCut,
        deadlineMs: 1,
        surface: "test",
      }),
    ).rejects.toMatchObject({ axis: "recordedAt", required: 1000.001 });
  });
  it("binds callback results without rewriting fact values", () => {
    expect(
      bindCommit(
        {
          result: {
            position: -1,
            instant: STAMP_PLACEHOLDER,
            triples: [{ recordedAt: STAMP_PLACEHOLDER, value: STAMP_PLACEHOLDER }],
          },
        },
        { positions: new Map([[-1, 2]]), instant: 1 },
      ),
    ).toEqual({
      result: { position: 2, instant: 1, triples: [{ recordedAt: 1, value: STAMP_PLACEHOLDER }] },
    });
  });
});

it("refuses far-future record time without invoking the publication waiter", async () => {
  let waited = false;
  await expect(
    gateRecordedAt({
      recordedAt: Date.now() + 60000,
      readCut: async () => ({ position: 1, recordedAt: 1000 }),
      awaitCut: async () => {
        waited = true;
        throw new Error("should not wait");
      },
      deadlineMs: 2000,
      surface: "far-future",
    }),
  ).rejects.toMatchObject({ _tag: "BasisNotAvailable", axis: "recordedAt" });
  expect(waited).toBe(false);
});
