// Helper: V_P2Q_INSPECT_DIR=<stream dir> opens a copy of a broker stream offline and prints what survived.
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { scanSegment } from "../../../../packages/qlever/src/broker/frame.js";
import { HostBroker } from "../../../../packages/qlever/src/broker/broker.js";
import { freshDir, logMembers, readSegment, writeJson } from "./harness.js";

const target = process.env["V_P2Q_INSPECT_DIR"];
describe.skipIf(!target)("inspect a broker stream", () => {
  it("scans, then opens a copy", async () => {
    const seg = path.join(target!, "segment-000001.log");
    const bytes = fs.readFileSync(seg);
    const scan = scanSegment(bytes);
    const raw = readSegment(seg).map((f) => ({ lsn: f.lsn, epoch: f.epoch, kind: f.kind, offset: f.offset }));
    const members = logMembers(seg).map((m) => ({ lsn: m.lsn, commandIds: m.commandIds }));
    const copy = freshDir("inspect");
    fs.mkdirSync(copy, { recursive: true });
    fs.copyFileSync(seg, path.join(copy, "segment-000001.log"));
    let opened: any;
    try {
      const broker = await HostBroker.open({ dir: copy, scopeKey: "inspect", minFreeBytes: 256 * 1024 ** 2 });
      opened = { recovery: broker.stats().recovery, aborted: broker.stats().abortedLsns, claims: members.flatMap((m) => m.commandIds).map((id) => [id, broker.claim(id) !== undefined]) };
      await broker.close();
    } catch (error) {
      opened = { refused: String(error).slice(0, 300) };
    }
    const record = { target, bytes: bytes.length, scan: { status: scan.status, detail: scan.detail, validEnd: scan.validEnd, frames: scan.frames.length }, framesByRawReader: raw, members, opened };
    writeJson(`inspect-${path.basename(target!)}.json`, record);
    expect(record).toBeDefined();
  });
});
