import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
const { slotInfo } = await import(new URL("../../../bin/lib.mjs", import.meta.url).href);
test("a private volume keeps the canonical slot grant, owner path and port", () => {
  const config = JSON.parse(readFileSync("lab/config/slots.json", "utf8")),
    base = slotInfo(config, "datomic", "s3");
  const key = "deadbeef00000001",
    isolated = slotInfo(config, "datomic", "s3", key);
  assert.deepEqual({ ...isolated, volume: base.volume }, base);
  assert.equal(isolated.volume, base.volume + "-" + key);
  assert.throws(() => slotInfo(config, "datomic", "dev", key));
  assert.throws(() => slotInfo(config, "datomic", "s3", "../other"));
});
