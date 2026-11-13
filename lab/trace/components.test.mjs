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

test("default summary keeps Node/gateway spans and excludes diagnostic collectors", () => {
  const c = configuration({ TRIPLEX_TRACE_LEVEL: "summary" });
  assert.deepEqual(c.components, ["gateway", "node"]);
  assert.equal(c.flags.TRIPLEX_TRACE_NATIVE_LOGS, "0");
  assert.deepEqual(c.requiredJfr, []);
  assert.equal(c.requirePostgres, false);
});

test("native binary capture is explicit and cannot silently replace native file logging", () => {
  assert.equal(
    configuration({ TRIPLEX_TRACE_LEVEL: "summary", DX_TX_NATIVE_JFR: "1" }).requireTransactorStats,
    false,
  );
  assert.equal(
    configuration({
      TRIPLEX_TRACE_LEVEL: "full",
      TRIPLEX_TRACE_COMPONENTS: "node,gateway,tx-jfr",
      DX_TX_NATIVE_JFR: "1",
    }).requireTransactorStats,
    true,
  );
  assert.throws(
    () => configuration({ TRIPLEX_TRACE_LEVEL: "full", DX_TX_NATIVE_JFR: "1" }),
    /file logging off/,
  );
});
