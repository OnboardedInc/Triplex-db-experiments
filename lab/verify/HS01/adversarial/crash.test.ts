// [CX-VHS01] Why: independently bind atomic reopen to a known input group and a reached SQL barrier. Rejected: relying on the builder's kill count or checking only row ids.
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { it, expect } from "vitest";
import {
  HostLog,
  hostLogRecovery,
  FeedRetentionExpired,
} from "../../../../packages/qlever/src/broker/log.ts";
import { FrameKind, encodeFrame } from "../../../../packages/qlever/src/broker/frame.ts";
import { encodeCommitGroup } from "../../../../packages/qlever/src/broker/frames.ts";
import { LogFeed } from "../../../../packages/qlever/src/broker/feed.ts";
import { columns } from "../../../../packages/qlever/src/rdf.ts";
const root = process.env.VHS01_OUT!;
const row = (id: string, pos: number) => ({
  ...Object.fromEntries(columns.map((c) => [c, null])),
  id,
  entity_id: "subject-" + id,
  attribute: ":a-" + id,
  value_type: "string",
  value_string: "value/" + id,
  recorded_at: 1700000000000 + pos,
  recorded_position: pos,
  valid_from: 0,
  tx_id: "tx-" + pos,
  schema_version: 1,
});
const member = (op: string, pos: number, rs: any[]) => ({
  operationId: op,
  attemptId: op,
  positions: [pos],
  rows: rs,
  priors: [],
  subjects: rs.map((r) => r.entity_id),
  claims: [{ commandId: op, txId: "tx-" + pos, timestamp: 1700000000000 + pos }],
});
for (const mode of ["dictionary", "group", "purge", "committed"])
  it("whole-process stop at " + mode + " has atomic bound recovery", async () => {
    if (!root) throw Error("bound runner required");
    const dir = path.join(root, mode);
    let { log } = await HostLog.open(dir, { minFreeBytes: 0, frameRetention: { tailFrames: 2 } });
    const stale = new LogFeed(dir).start();
    const committedRows: any[] = [];
    for (let i = 0; i < 12; i++) {
      const lsn = log.nextLsn,
        pos = lsn * 1024,
        r = row("base-" + i, pos),
        m = member("base-op-" + i, pos, [r]);
      const f = await log.append(
        FrameKind.COMMIT_GROUP,
        encodeCommitGroup({ v: 1, stream: "crash", lsn, epoch: log.epoch, members: [m] }),
      );
      log.publishWatermark({ lsn: f.lsn, epoch: log.epoch, position: pos });
      committedRows.push(r);
    }
    const before = hostLogRecovery(log).marker,
      lsn = log.nextLsn,
      epoch = log.epoch;
    const rows = [row("new-A", lsn * 1024), row("new-B", lsn * 1024 + 1)];
    const members = rows.map((r, i) => member("new-operation-" + i, r.recorded_position, [r]));
    const payload = encodeCommitGroup({ v: 1, stream: "crash", lsn, epoch, members });
    const f = encodeFrame({ lsn, epoch, kind: 1, payload, prevCrc: before.crc });
    const input = path.join(dir, "input.json");
    fs.writeFileSync(
      input,
      JSON.stringify({
        lsn,
        epoch,
        kind: 1,
        payload,
        prev: before.crc,
        crc: f.crc,
        length: f.bytes.length,
        members,
      }),
    );
    await log.close();
    const child = spawn(
      process.execPath,
      ["lab/verify/HS01/adversarial/crash-child.mjs", dir, mode, input],
      { cwd: path.resolve(import.meta.dirname, "../../../.."), stdio: ["ignore", "pipe", "pipe"] },
    );
    let stderr = "";
    child.stderr.on("data", (b) => (stderr += b));
    let reached = false;
    const stopped = new Promise<any>((resolve) =>
      child.once("close", (code, signal) => resolve({ code, signal })),
    );
    const deadline = Date.now() + 15000;
    while (Date.now() < deadline && child.exitCode === null && child.signalCode === null) {
      if (fs.existsSync(path.join(dir, "reached"))) {
        expect(fs.readFileSync(path.join(dir, "reached"), "utf8")).toBe(mode);
        reached = true;
        break;
      }
      await new Promise((r) => setTimeout(r, 5));
    }
    child.kill("SIGKILL");
    const stop = await stopped;
    fs.writeFileSync(path.join(dir, "stop.json"), JSON.stringify({ reached, stop, stderr }));
    expect(reached, stderr).toBe(true);
    expect(stop.signal).toBe("SIGKILL");
    ({ log } = await HostLog.open(dir, { minFreeBytes: 0, frameRetention: { tailFrames: 2 } }));
    try {
      const after = hostLogRecovery(log).marker;
      expect(after.base_lsn).toBe(before.base_lsn);
      const actual = await log.recentAsync(0, {}),
        wanted = mode === "committed" ? [...committedRows, ...rows] : committedRows;
      expect(actual.toSorted((a, b) => a.id.localeCompare(b.id))).toEqual(
        wanted.toSorted((a, b) => a.id.localeCompare(b.id)),
      );
      for (const [i, r] of committedRows.entries()) {
        expect(log.claim("base-op-" + i)).toEqual({ txId: r.tx_id, position: r.recorded_position });
        expect(log.head(r.entity_id)).toBe(r.recorded_position);
        expect(log.operation("base-op-" + i)?.positions).toEqual([r.recorded_position]);
      }
      for (const [i, r] of rows.entries()) {
        expect(log.operation("new-operation-" + i)?.positions).toEqual(
          mode === "committed" ? [r.recorded_position] : undefined,
        );
        expect(log.head(r.entity_id)).toBe(mode === "committed" ? r.recorded_position : 0);
      }
      expect(() => new LogFeed(dir).poll(stale)).toThrow(FeedRetentionExpired);
      expect(after.position).toBe(
        mode === "committed" ? rows[1].recorded_position : before.position,
      );
      fs.writeFileSync(
        path.join(dir, "recovery.json"),
        JSON.stringify(
          {
            mode,
            before,
            after,
            exactRows: wanted.length,
            stop,
            instrumentation: JSON.parse(
              fs.readFileSync(path.join(dir, "instrumentation.json"), "utf8"),
            ),
          },
          null,
          2,
        ),
      );
    } finally {
      await log.close();
    }
  });
