import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { snapshot, bytes } from "./source.ts";
import { openNative } from "./native.ts";
import { ImportRun, pace } from "./lane.ts";
import { verifySnapshot } from "./verify.ts";
const [dir, profile] = process.argv.slice(2);
assert(dir && (profile === "deep" || profile === "thin"));
mkdirSync(dir);
const id = randomUUID(),
  scope = "import-live-cal-" + id,
  source = snapshot(profile, profile === "deep" ? 6250 : 125000, "sample/", id);
const target = await openNative(scope, "snapshot");
try {
  const r = await ImportRun.open(target, source, pace(2000, 1), join(dir, "cursor"));
  try {
    const start = performance.now();
    while (await r.step()) {}
    const ingestMs = performance.now() - start;
    const check = await verifySnapshot(r, true, "sample/");
    writeFileSync(
      join(dir, "calibration.json"),
      bytes({
        id,
        scope,
        source: source.header,
        ...check,
        ingestMs,
        readbackMs: performance.now() - start - ingestMs,
      }),
      { flag: "wx" },
    );
  } finally {
    r.close();
  }
} finally {
  await target.close();
}
