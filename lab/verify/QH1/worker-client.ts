// [EXP-QH1] Why: owner-key write cost is measured against the actual compact v2 worker, interleaved.
// Rejected: comparing against JSON v1 or mutating the application's durability pragmas.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { MessageChannel, Worker } from "node:worker_threads";

import { encodeCommitGroup } from "../../../packages/qlever/src/broker/frames.js";
import { encodeFrame, FrameKind } from "../../../packages/qlever/src/broker/frame.js";
import { fresh } from "./helpers.js";
export const openWorker = async (source: string) => {
  const dir = fresh();
  fs.mkdirSync(dir, { recursive: true });
  const worker = new Worker(source, {
    eval: true,
    workerData: {
      driver: createRequire(
        new URL("../../../packages/qlever/package.json", import.meta.url),
      ).resolve("better-sqlite3"),
      file: path.join(dir, "broker.db"),
      role: "writer",
      seed: 123,
      gateBuffer: new SharedArrayBuffer(12),
    },
  });
  const call = (op: string, args?: unknown): Promise<any> =>
    new Promise((resolve, reject) => {
      const { port1, port2 } = new MessageChannel();
      port1.once("message", (x) => {
        port1.close();
        if (x.error) reject(Error(x.error));
        else resolve(x.result);
      });
      worker.postMessage({ op, args, response: port2 }, [port2]);
    });
  await call("init");
  let crc = 123,
    lsn = 0;
  return {
    dir,
    call,
    append: async (rows: any[]) => {
      lsn++;
      const members = [
        {
          operationId: "op" + lsn,
          attemptId: "try" + lsn,
          positions: [lsn * 1024],
          claims: [],
          subjects: [rows[0].entity_id],
          rows,
          priors: [],
        },
      ];
      const payload = encodeCommitGroup({ v: 1, stream: "QH1-writer", lsn, epoch: 1, members });
      const frame = encodeFrame({
        lsn,
        epoch: 1,
        kind: FrameKind.COMMIT_GROUP,
        payload,
        prevCrc: crc,
      });
      const result = await call("append", {
        lsn,
        epoch: 1,
        kind: 1,
        prev: crc,
        crc: frame.crc,
        length: frame.bytes.length,
        payload,
        members,
      });
      crc = frame.crc;
      return result;
    },
    close: async () => {
      await call("close");
      await worker.terminate();
    },
  };
};
