import assert from "node:assert/strict";
import { test } from "node:test";
import { sideThreadEnvironment } from "../lib/side-thread.ts";
import { requestIndex } from "../lib/maintenance.ts";
test("side worker preserves the original main-thread write-peer route", () => {
  const env = {
    DATOMIC_URL: "http://write:8080",
    DATOMIC_READ_URLS: "http://read:8080",
    OTHER: "kept",
  };
  assert.deepEqual(sideThreadEnvironment(env), { ...env, DATOMIC_READ_URLS: "http://write:8080" });
  assert.equal(env.DATOMIC_READ_URLS, "http://read:8080");
});
test("an unresponsive indexing route cannot outlive its wait budget", async () => {
  const event = await requestIndex(
    { request: () => new Promise(() => {}) },
    "db",
    "p4h10",
    () => performance.now(),
    20,
  );
  assert.equal(event.completed, false);
  assert.match(event.error!, /exceeded 20 ms/);
});
