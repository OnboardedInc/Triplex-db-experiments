import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { preservePreReadyRecordings, verifyNativeRecordingFiles } from "./native-recording.mjs";

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

test("verifies captured native log bytes after shutdown has appended live samples", async (t) => {
  const raw = fs.mkdtempSync(path.join(os.tmpdir(), "triplex-recording-"));
  t.after(() => fs.rmSync(raw, { recursive: true, force: true }));
  const pin = (name, text) => {
    fs.writeFileSync(path.join(raw, name), text);
    return createHash("sha256").update(text).digest("hex");
  };
  const recording = { traceBytes: {}, nativeLogPrefixes: {} };
  for (const role of ["tx", "gw-w", "gw-r"]) {
    for (const suffix of [".jfr", ".jfr.jsonl", ".jfr-complete.jsonl"]) {
      recording.traceBytes[role + suffix] = pin(role + suffix, role);
    }
    const prefix = `${role}\n`;
    recording.nativeLogPrefixes[role + ".jsonl"] = {
      bytes: Buffer.byteLength(prefix),
      sha256: pin(role + ".jsonl", prefix),
    };
  }
  for (const name of ["postgres.log", "postgres-events.jsonl", "postgres-wal.jsonl"]) {
    recording.traceBytes[name] = pin(name, name);
  }
  const live = path.join(raw, "gw-w.jsonl");
  fs.appendFileSync(live, "shutdown sample\n");
  await verifyNativeRecordingFiles(raw, recording);
  fs.writeFileSync(live, "changed prefix\n");
  await assert.rejects(verifyNativeRecordingFiles(raw, recording), /gw-w\.jsonl/);
});
