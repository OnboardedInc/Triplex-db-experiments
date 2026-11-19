import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

test("the historical publisher admits all three delayed results rejected by the independent oracle", () => {
  const env = {
    ...process.env,
    DX_ACT1_RED: "1",
    DX_ACT1_NATIVE: "0",
    DX_ACT1_SQLITE_DIR: "",
  } as NodeJS.ProcessEnv;
  delete env.NODE_TEST_CONTEXT;
  const child = spawnSync(
    process.execPath,
    [
      "--experimental-strip-types",
      "--test",
      "--test-name-pattern=^historical /",
      "lab/experiments/EXP-DX1/act1/guard.test.ts",
    ],
    {
      encoding: "utf8",
      env,
      maxBuffer: 32 << 20,
    },
  );
  assert.equal(child.status, 1);
  for (const label of [
    "held pay change",
    "first item after empty evaluation",
    "equal transaction with earlier valid time",
  ]) {
    assert(
      child.stdout
        .split("\n")
        .some((line) => line.startsWith("not ok ") && line.endsWith("historical / " + label)),
    );
  }
  assert.match(child.stdout, /# fail 3\b/);
  assert.match(child.stdout, /ERR_ASSERTION/);
});
