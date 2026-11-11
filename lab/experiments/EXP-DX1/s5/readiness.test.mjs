import assert from "node:assert/strict";
import test from "node:test";
import { waitForTarget } from "./wait-ready.mjs";
// [DX-S5] Why: reject healthy-but-stale or malformed target heads before any seed maintenance.
// Rejected: testing only that the polling loop eventually returns after HTTP 200.
const prefix = "tx2-dxs5-seed-100000",
  db = "s2-test";
test("target readiness retries startup failure and reads the named target head on both peers", async () => {
  const events = [],
    urls = [];
  let failures = 1;
  await waitForTarget(prefix, db, "3471684", "w,r", {
    fetch: async (url) => {
      urls.push(url);
      if (failures-- > 0) throw Error("broker not ready");
      return new Response(JSON.stringify({ position: { t: "long", v: "3471684" } }));
    },
    sleep: async () => {},
    emit: (e) => events.push(e),
  });
  assert.equal(events.filter((e) => e.event === "target-gateway-ready").length, 2);
  assert.equal(events[0].event, "target-gateway-wait");
  assert(urls.every((u) => u.endsWith("/v1/db/s2-test/basis")));
});
test("stale, untyped and absent heads cannot become readiness", async () => {
  for (const value of [
    { position: { t: "long", v: "3471683" } },
    { position: 3471684 },
    {},
    { position: { t: "double", v: "3471684" } },
  ]) {
    let clock = 0;
    const events = [];
    await assert.rejects(
      waitForTarget(prefix, db, "3471684", "w", {
        fetch: async () => new Response(JSON.stringify(value)),
        now: () => clock,
        sleep: async () => {
          clock = 600001;
        },
        emit: (e) => events.push(e),
      }),
      /readiness timeout/,
    );
    assert(!events.some((e) => e.event === "target-gateway-ready"));
  }
});
