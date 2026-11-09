// [CX-VHS01] Why: a legal large group must not permanently pin every later frame. Rejected: testing only small hint frames as evidence of bounded retention.
import fs from "node:fs";
import path from "node:path";
import { it, expect } from "vitest";
import { HostLog, hostLogRecovery } from "../../../../packages/qlever/src/broker/log.ts";
import { FrameKind } from "../../../../packages/qlever/src/broker/frame.ts";
import { encodeCommitGroup } from "../../../../packages/qlever/src/broker/frames.ts";
import { columns } from "../../../../packages/qlever/src/rdf.ts";
it("retention advances beyond a legal group larger than the purge byte budget", async () => {
  const out = process.env.VHS01_OUT!;
  if (!out) throw Error("bound runner required");
  const dir = path.join(out, "large-frame");
  const { log } = await HostLog.open(dir, {
    minFreeBytes: 5 * 1024 ** 3,
    frameRetention: { tailFrames: 1 },
  });
  try {
    const lsn = log.nextLsn,
      pos = lsn * 1024;
    const rows: any[] = Array.from({ length: 20 }, (_, j) => ({
      ...Object.fromEntries(columns.map((c) => [c, null])),
      id: "large/" + j,
      entity_id: "large-subject",
      attribute: ":a" + j,
      value_type: "string",
      value_string: "x".repeat(900000),
      recorded_at: 1700000000000,
      recorded_position: pos,
      valid_from: 1700000000000,
      tx_id: "large-tx",
      schema_version: 1,
    }));
    const payload = encodeCommitGroup({
      v: 1,
      stream: "large",
      lsn,
      epoch: log.epoch,
      members: [
        {
          operationId: "large-operation",
          attemptId: "large-attempt",
          positions: [pos],
          rows,
          priors: [],
          claims: [],
          subjects: ["large-subject"],
        },
      ],
    });
    const big = await log.append(FrameKind.COMMIT_GROUP, payload);
    log.publishWatermark({ lsn: big.lsn, epoch: log.epoch, position: pos });
    for (let i = 0; i < 10; i++) {
      const f = await log.append(FrameKind.APPLIED_HINT, Buffer.from("small"));
      log.publishWatermark({ lsn: f.lsn, epoch: log.epoch, position: pos });
    }
    const purges = Array.from({ length: 5 }, () => log.purgeFrames()),
      marker = hostLogRecovery(log).marker;
    fs.writeFileSync(
      path.join(out, "large-frame.json"),
      JSON.stringify(
        {
          payloadBytes: payload.length,
          frameBytes: big.end - big.offset,
          bigLsn: big.lsn,
          purges,
          marker,
        },
        null,
        2,
      ),
    );
    expect(
      marker.base_lsn,
      "eligible large frame and every later frame remain forever",
    ).toBeGreaterThanOrEqual(big.lsn);
  } finally {
    await log.close();
  }
});
