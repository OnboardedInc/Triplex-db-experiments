import assert from "node:assert/strict";
import test from "node:test";
import { W0 } from "../../../bench/lib/w0-world.ts";
import { checkColdWitnesses } from "./audit-cold.ts";
import type { Offered, RawDecision } from "./audit-clock.ts";

test("a previous public read disqualifies a cold witness even with exact later bytes", () => {
  const offers: Offered[] = [0, 1].map((order) => ({
    order,
    id: String(order),
    mode: "record",
    doc: [W0.R2.doc, W0.R3.doc][order]!,
    scheduled: order * 1000,
    ingress: order * 1000 + 1,
  }));
  const routes = ["public", "fresh-process"];
  const reads: RawDecision[] = [
    [998, 999],
    [417, 418],
  ].flatMap((pair, offer) =>
    pair.flatMap((num) =>
      routes.flatMap((route) =>
        (["first", "deadline"] as const).map((phase) => ({
          offer,
          id: W0.placementId(num),
          phase,
          route,
          invoked: offers[offer]!.ingress + 3,
          returned: offers[offer]!.ingress + 4,
          raw: "{}",
          position: 6 + offer,
          seq: offer + 1,
        })),
      ),
    ),
  );
  checkColdWitnesses(offers, reads, routes, 1000);
  assert.throws(
    () => checkColdWitnesses(offers, [...reads, { ...reads.at(-1)!, invoked: 1 }], routes, 1000),
    /cold witness was read before its offer/,
  );
});
