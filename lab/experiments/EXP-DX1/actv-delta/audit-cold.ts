import assert from "node:assert/strict";
import { W0 } from "../../../bench/lib/w0-world.ts";
import type { Offered, RawDecision } from "./audit-clock.ts";

// [DX-ACT2] Why: preserve evidence for untouched changed and unchanged people on both public routes. Rejected: deciding that a separate process was cold from its name alone.
export function checkColdWitnesses(
  offers: readonly Offered[],
  reads: readonly RawDecision[],
  routes: readonly string[],
  people: number,
) {
  if (offers[0]?.order !== 0) return;
  const pairs = [
    [people - 2, people - 1],
    [417, 418],
  ];
  for (const [order, pair] of pairs.entries()) {
    const offer = offers[order]!;
    assert(offer.order === order);
    for (const i of pair) {
      const id = W0.placementId(i);
      for (const route of routes) {
        const forPerson = reads.filter((r) => r.id === id && r.route === route);
        assert(
          forPerson.every((r) => r.invoked >= offer.ingress && r.phase !== "traffic"),
          "cold witness was read before its offer: " + id + " via " + route,
        );
        for (const phase of ["first", "deadline"])
          assert(
            forPerson.some((r) => r.phase === phase && r.offer === order),
            "cold witness is missing an independent " + phase + " read: " + id + " via " + route,
          );
      }
    }
  }
}
