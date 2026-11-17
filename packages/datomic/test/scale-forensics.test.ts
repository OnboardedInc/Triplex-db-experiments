import { describe, expect, it } from "vitest";
import { observedAcknowledgements } from "../../../lab/trace/scale-forensics.mjs";
const manifest = { tag: "tx2-dxt1-fixture", slot: "tx2-dxt1-fixture", source: "a".repeat(40) };
const context = { minimumStart: 100, bootId: "00000000-0000-0000-0000-000000000001" };
const root = {
  run: manifest.tag,
  source: manifest.source,
  slot: manifest.slot,
  type: "request",
  name: "driver.commit",
  traceId: "b".repeat(32),
  start: 100,
  end: 120,
  clock: { domain: "linux-monotonic", bootId: context.bootId },
  spans: [],
  attributes: {
    stream: "background",
    outcome: "committed",
    expired: false,
    ackPublishedAt: 110,
    position: 42,
  },
};
describe("censored population observations", () => {
  it("retains an observed ACK marker without inventing an offer denominator or verdict", () => {
    const observations = observedAcknowledgements([root], manifest, context);
    expect(observations).toEqual([root]);
    expect(observations).not.toHaveProperty("offered");
    expect(observations).not.toHaveProperty("verdict");
  });
  it("refuses foreign source, slot or run labels", () => {
    for (const change of [
      { source: "c".repeat(40) },
      { slot: "tx2-dxt1-foreign" },
      { run: "tx2-dxt1-foreign" },
    ])
      expect(() => observedAcknowledgements([{ ...root, ...change }], manifest, context)).toThrow(
        "Foreign",
      );
  });
  it("refuses duplicates, stale attempts and a different guest boot", () => {
    expect(() => observedAcknowledgements([root, root], manifest, context)).toThrow("Invalid");
    expect(() => observedAcknowledgements([{ ...root, start: 99 }], manifest, context)).toThrow(
      "Invalid",
    );
    expect(() =>
      observedAcknowledgements(
        [{ ...root, clock: { ...root.clock, bootId: "00000000-0000-0000-0000-000000000002" } }],
        manifest,
        context,
      ),
    ).toThrow("Invalid");
  });
  it("requires actual ACK, expiry and position content", () => {
    for (const attributes of [
      { ...root.attributes, ackPublishedAt: 121 },
      { ...root.attributes, ackPublishedAt: undefined },
      { ...root.attributes, expired: true },
      { ...root.attributes, position: 0 },
    ])
      expect(() => observedAcknowledgements([{ ...root, attributes }], manifest, context)).toThrow(
        "Invalid",
      );
  });
  it("excludes unresolved outcomes and probes without calling them lost or committed", () => {
    for (const attributes of [
      { ...root.attributes, outcome: "unknown" },
      { ...root.attributes, stream: "probe10" },
    ])
      expect(observedAcknowledgements([{ ...root, attributes }], manifest, context)).toEqual([]);
  });
  it("refuses a missing attempt clock", () => {
    expect(() =>
      observedAcknowledgements([root], manifest, { ...context, minimumStart: NaN }),
    ).toThrow("Invalid");
  });
});
