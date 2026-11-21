import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { preservePreReadyRecordings } from "./native-recording.mjs";

test("retains pre-ready trace failures without passing them to the live recorder", (t) => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), "triplex-recording-"));
  t.after(() => fs.rmSync(out, { recursive: true, force: true }));
  const raw = path.join(out, "raw");
  fs.mkdirSync(raw);
  const name = "gw-w-jfr-error.txt";
  const file = path.join(raw, name);
  fs.writeFileSync(file, "first boot failure");
  // [DX-INT1] Why: the old artifact can be set aside only after a witnessed restart.
  // Rejected: ignoring an error from the JVM that will record the actual attempt.
  assert.throws(() => preservePreReadyRecordings(out, raw, { "gw-w": { restarts: 0 } }));
  preservePreReadyRecordings(out, raw, { "gw-w": { restarts: 1 } });
  assert.equal(fs.readFileSync(path.join(out, "pre-ready-recordings", name), "utf8"), "first boot failure");
  assert(!fs.existsSync(file));
  fs.writeFileSync(path.join(raw, ".finish"), "");
  assert.throws(() => preservePreReadyRecordings(out, raw, { "gw-w": { restarts: 1 } }));
});
