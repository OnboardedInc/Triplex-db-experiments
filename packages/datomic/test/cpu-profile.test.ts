import { describe, it, expect } from "vitest";
import { indexCpuProfile } from "../../../lab/trace/cpu-profile.mjs";
const ref = { bootId: "boot", offsetMs: 1700000000000 };
const markers = [
  {
    stage: "start",
    process: "node-14",
    thread: 0,
    clock: { domain: "linux-monotonic", bootId: "boot" },
    beforeMonoMs: 1001,
    afterMonoMs: 1005,
  },
  {
    stage: "end",
    process: "node-14",
    thread: 0,
    clock: { domain: "linux-monotonic", bootId: "boot" },
    beforeMonoMs: 1100,
    afterMonoMs: 1105,
  },
];
const profile = {
  startTime: 1000000,
  endTime: 1103000,
  nodes: [
    { id: 1, callFrame: { functionName: "(root)" }, children: [2, 3] },
    { id: 2, callFrame: { functionName: "triplexCpuProfileClockMarker" } },
    { id: 3, callFrame: { functionName: "retainRead" } },
  ],
  samples: [2, 2, 3, 2, 2],
  timeDeltas: [2000, 1000, 7000, 91000, 1000],
};
describe("sampled writer stacks", () => {
  it("verifies both native boot-clock markers and retains sample points without inventing CPU spans", () => {
    const index = indexCpuProfile(profile, markers, ref);
    const r = index.window(ref.offsetMs + 1009, ref.offsetMs + 1011);
    expect(r.top).toEqual([["retainRead", 1]]);
    expect(r.points[0].at).toBe(ref.offsetMs + 1010);
    expect(r.longGaps).toBe(1);
    expect(r.maxGapMs).toBe(7);
  });
  it("rejects another boot, missing calibration and invalid sample identity", () => {
    expect(() => indexCpuProfile(profile, markers, { ...ref, bootId: "another" })).toThrow(
      "foreign",
    );
    expect(() => indexCpuProfile({ ...profile, samples: [3, 3, 3, 3, 3] }, markers, ref)).toThrow(
      "both",
    );
    expect(() => indexCpuProfile({ ...profile, samples: [2, 2, 99, 2, 2] }, markers, ref)).toThrow(
      "node",
    );
    expect(() =>
      indexCpuProfile({ ...profile, timeDeltas: [-1, 1, 1, 1, 1] }, markers, ref),
    ).toThrow("delta");
  });
});
