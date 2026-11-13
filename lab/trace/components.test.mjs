import test from "node:test";
import assert from "node:assert/strict";
import { configuration } from "./components.mjs";
test("ablation enables exactly one recorder with common host sampling", () => {
  const c = configuration({
    TRIPLEX_TRACE_LEVEL: "full",
    TRIPLEX_TRACE_COMPONENTS: "tx-jfr",
    TRIPLEX_TRACE_SESSION: "session",
  });
  assert.deepEqual(c.components, ["tx-jfr"]);
  assert.deepEqual(c.requiredJfr, ["tx"]);
  assert.equal(c.flags.TRIPLEX_TRACE_NODE, "0");
  assert.equal(c.flags.TRIPLEX_TRACE_GATEWAY, "0");
  assert.equal(c.requirePostgres, false);
  assert.equal(c.requireSystem, true);
  assert.equal(
    configuration({ TRIPLEX_TRACE_LEVEL: "off", TRIPLEX_TRACE_SESSION: "session" }).requireSystem,
    true,
  );
  for (const value of ["unknown", "node,node"])
    assert.throws(() =>
      configuration({ TRIPLEX_TRACE_LEVEL: "full", TRIPLEX_TRACE_COMPONENTS: value }),
    );
  assert.throws(() =>
    configuration({ TRIPLEX_TRACE_LEVEL: "off", TRIPLEX_TRACE_COMPONENTS: "node" }),
  );
});
