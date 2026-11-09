// Check 6 round 2: the A0 M2 guard (QleverStorageAdapter.ts observedPosition) with the option off.
// A counting client stands in for QLever: the source-position query answers `published`, everything else [].
import { randomUUID } from "node:crypto";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { EntityId } from "@triplex-build/triplex";
import type { QleverClient } from "../../../../packages/qlever/src/QleverClient.js";
import { makeQleverStorageAdapter } from "../../../../packages/qlever/src/QleverStorageAdapter.js";
import { writeJson } from "./harness.js";

const counting = (published: () => number) => {
  const calls: string[] = [];
  const client: QleverClient = {
    query: async (sparql) => {
      const isPosition = /^SELECT \?position WHERE \{ GRAPH <[^>]+> \{ <urn:triplex:meta> <urn:triplex:field:position> \?position \} \}$/.test(sparql.trim());
      calls.push(isPosition ? "position" : "rows");
      return isPosition ? [{ position: { type: "literal", value: String(published()) } }] : [];
    },
    update: async () => ({}),
    command: async () => ({}),
    cancel: async () => {},
    close: async () => {},
  };
  return { client, calls };
};
const run = <A, E>(e: Effect.Effect<A, E>) =>
  Effect.runPromise(Effect.match(e, { onFailure: (error: any) => ({ ok: false as const, error }), onSuccess: (value: A) => ({ ok: true as const, value }) }));
const basis = (p: number) => ({ validAt: Date.now(), recordedPosition: p });

describe("A0 guard with the option off", () => {
  it("no extra request at or below the observed position; one above it; a basis above the published one fails typed at once", async () => {
    let published = 10;
    const { client, calls } = counting(() => published);
    const a0 = makeQleverStorageAdapter(client, `v-p2q-a0:${randomUUID()}`);
    const step = async (label: string, p: number | undefined) => {
      const before = calls.length;
      const t0 = performance.now();
      const res = await run(a0.getByEntity(EntityId.make("s:1"), p === undefined ? undefined : basis(p)));
      return { label, basis: p, requests: calls.slice(before), ok: res.ok, error: res.ok ? undefined : `${res.error?._tag}:${res.error?.reason}`, ms: Math.round(performance.now() - t0) };
    };
    const steps = [
      await step("fresh adapter, no basis (current read)", undefined),
      await step("fresh adapter, basis 7 <= published 10, observed 0", 7),
      await step("again basis 7, observed now 10", 7),
      await step("basis 10 == observed", 10),
      ...(published = 20, []),
      await step("basis 15 above observed, published 20", 15),
      await step("basis 25 above published 20", 25),
      await step("basis 25 again", 25),
    ];
    writeJson("check6-a0-guard.json", steps);
    // Main's A0 sends exactly one "rows" request per pull and never refuses a basis.
    expect(steps[0]!.requests).toEqual(["rows"]);
    expect(steps[1]!.requests).toEqual(["position", "rows"]); // behaviour change: an extra request
    expect(steps[2]!.requests).toEqual(["rows"]);
    expect(steps[3]!.requests).toEqual(["rows"]);
    expect(steps[4]!.requests).toEqual(["position", "rows"]); // behaviour change: an extra request
    expect(steps[5]!.ok).toBe(false); // behaviour change: main answers from what it holds
    expect(steps[5]!.error).toBe("ReadError:basis-not-reached");
  });
});
