import assert from "node:assert/strict";
import test from "node:test";
import { W0 } from "../../../bench/lib/w0-world.ts";
import { assertOnTime, scoreClock, type Offered, type RawDecision } from "./audit-clock.ts";

const offer = (order: number): Offered => ({
  order,
  id: "offer-" + order,
  mode: "record",
  doc: W0.R2.doc,
  scheduled: order * 2000,
  ingress: order * 2000 + 50,
  ack: { at: order * 2000 + 100, position: order + 8, seq: order + 1, txId: "tx-" + order },
  owed: { at: order * 2000 + 100, position: order + 8 },
});
const read = (o: Offered, phase: "first" | "deadline", route: string): RawDecision => ({
  offer: o.order,
  phase,
  route,
  id: "pl:s00000000",
  invoked: o.scheduled + (phase === "first" ? 120 : 1000),
  returned: o.scheduled + (phase === "first" ? 140 : 1010),
  position: o.ack!.position,
  seq: o.ack!.seq,
  raw: "{}",
});

test("the last offer requires a post-deadline observation on every route", () => {
  const offers = [offer(0), offer(1)],
    routes = ["point", "fresh"];
  const reads = offers.flatMap((o) => [
    read(o, "first", "point"),
    ...routes.map((r) => read(o, "deadline", r)),
  ]);
  assertOnTime(scoreClock(offers, reads, routes, "record"));
  assert.throws(
    () => scoreClock(offers, reads.slice(0, -1), routes, "record"),
    /missing deadline read for offer 1 via fresh/,
  );
});

test("a stale pre-ACK read and late ingress are visible even when native work is quick", () => {
  const o = offer(0),
    first = read(o, "first", "point"),
    stale = read(o, "deadline", "point");
  o.ingress = 1005;
  o.ack = { ...o.ack!, at: 1010 };
  o.owed!.at = 1010;
  first.invoked = 1011;
  first.returned = 1012;
  stale.seq = 0;
  stale.position = 7;
  const result = scoreClock([o], [first, stale], ["point"], "record");
  assert.equal(result.misses, 1);
  assert.equal(result.stale, 1);
  assert.throws(() => assertOnTime(result), /deadline misses/);
});
