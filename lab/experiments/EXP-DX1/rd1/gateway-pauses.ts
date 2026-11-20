import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { setTimeout as sleep } from "node:timers/promises";
import { alignClockRecord, records } from "../../../trace/report.mjs";

type Identity = { run: string; source: string; slot: string };
type Reference = { bootId: string; offsetMs: number };
type Phase = { at: number; until: number };

// [DX-RD1] Why: a pause counts only from the write peer on the same boot and within the measured block.
// Rejected: reading read-peer GC or treating elapsed wall time as allocation volume.
export async function collectGatewayPauses(
  dir: string,
  id: Identity,
  clock: Reference,
  phases: readonly Phase[],
  deadline: number,
) {
  const file = path.join(dir, "gw-w.jfr"),
    complete = `${file}-complete.jsonl`;
  const matches = (row: any) =>
    row.run === id.run &&
    row.slot === id.slot &&
    row.source === id.source &&
    row.process === "gw-w";
  let marker: any;
  while (performance.now() < deadline) {
    assert(!fs.existsSync(path.join(dir, "gw-w-jfr-error.txt")), "Write gateway JFR export failed");
    const text = fs.existsSync(complete) ? fs.readFileSync(complete, "utf8") : "";
    if (text.endsWith("\n")) {
      marker = JSON.parse(text);
      break;
    }
    await sleep(250);
  }
  assert(
    marker?.type === "jfr-complete" &&
      marker.role === "gw-w" &&
      matches(marker) &&
      marker.clock?.bootId === clock.bootId &&
      marker.clockSamples >= 2,
    "Fresh write-gateway pause log did not complete",
  );
  const hash = createHash("sha256");
  for await (const chunk of fs.createReadStream(file)) hash.update(chunk);
  const sha256 = hash.digest("hex");
  assert.equal(sha256, marker.fileSha256, "Write-gateway recording checksum differs");
  const blocks = phases.map(() => ({
    count: 0,
    totalMs: 0,
    maxMs: 0,
    pauses: [] as { start: number; end: number; jfrDurationMs: number }[],
  }));
  let exportedRows = 0;
  for await (const raw of records(`${file}.jsonl`)) {
    assert(matches(raw), "Foreign write gateway pause export");
    if (++exportedRows % 1024 === 0 && performance.now() >= deadline)
      throw Error("Write-gateway pause export exceeded the probe deadline");
    if (raw.name !== "jdk.GCPhasePause") continue;
    assert(
      raw.type === "event" &&
        raw.clock?.domain === "linux-monotonic" &&
        raw.clock.bootId === clock.bootId &&
        raw.clock.crossProcessQualified === true,
    );
    const event = alignClockRecord(raw, clock);
    assert(
      [event.start, event.end, event.jfrDurationMs].every(Number.isFinite) &&
        event.end >= event.start &&
        event.jfrDurationMs >= 0,
    );
    for (const [i, phase] of phases.entries()) {
      const overlap = Math.min(phase.until, event.end) - Math.max(phase.at, event.start);
      if (overlap <= 0) continue;
      const b = blocks[i]!;
      b.count++;
      b.totalMs += overlap;
      b.maxMs = Math.max(b.maxMs, overlap);
      b.pauses.push({ start: event.start, end: event.end, jfrDurationMs: event.jfrDurationMs });
    }
  }
  assert(
    Number.isSafeInteger(marker.events) &&
      marker.events === exportedRows &&
      performance.now() < deadline,
  );
  return { sha256, exportedRows, blocks };
}
