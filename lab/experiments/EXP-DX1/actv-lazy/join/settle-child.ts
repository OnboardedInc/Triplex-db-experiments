import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { openStore } from "../store.ts";
import { JoinedAccount } from "./account.ts";
import { BulkQueue } from "./bulk.ts";
import { Settlement } from "./settlement.ts";
import { frameMode } from "./frames.ts";

const input = JSON.parse(readFileSync(0, "utf8"));
const store = await openStore(input.scope, "act2-deep");
// [DX-ACT4] Optional `frames` (the framing) and `after` (durable frames before the kill, default 1).
const worker = await Settlement.open(new JoinedAccount(store), new BulkQueue(1), false, input.frames ?? frameMode());
let left = input.after ?? 1;
assert(Number.isSafeInteger(left) && left >= 1);
const stop = async () => {
  if (--left === 0) process.kill(process.pid, "SIGKILL");
};
if (input.path === "values") await worker.archive.runValues(input.sequence, stop);
else {
  assert.equal(input.path, "notices");
  await worker.recorder.record(input.sequence, stop);
}
throw Error("Worker did not stop between durable frames");
