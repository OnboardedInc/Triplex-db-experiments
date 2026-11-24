import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { openStore } from "../store.ts";
import { JoinedAccount } from "./account.ts";
import { BulkQueue } from "./bulk.ts";
import { Settlement } from "./settlement.ts";
import { frameMode, preconditionMode } from "./frames.ts";

const input = JSON.parse(readFileSync(0, "utf8"));
// [DX-ACT5] Optional `held` (the held account's descriptor: the child then writes into the held database, and its
// frames are adopted by the parent's ledger from the journal), `precondition`, path `both` (values and notices
// together) and `killAfterMs` (a kill at a moment, inside or between frames, instead of after N durable frames).
const store = input.held
  ? await openStore(input.scope, "act2-deep", "write", {
      ...input.held,
      verifyThrough: async () => {},
      committed: () => {},
    })
  : await openStore(input.scope, "act2-deep");
// [DX-ACT4] Optional `frames` (the framing) and `after` (durable frames before the kill, default 1).
const worker = await Settlement.open(
  new JoinedAccount(store),
  new BulkQueue(1),
  false,
  input.frames ?? frameMode(),
  input.precondition ?? preconditionMode(),
);
if (input.killAfterMs !== undefined) {
  assert(Number.isSafeInteger(input.killAfterMs) && input.killAfterMs > 0);
  // [DX-ACT5] `startAt` (epoch ms): start settling at that moment (a rival started together with the parent).
  if (input.startAt !== undefined)
    while (Date.now() < input.startAt) await new Promise((r) => setTimeout(r, Math.max(1, input.startAt - Date.now())));
  setTimeout(() => process.kill(process.pid, "SIGKILL"), input.killAfterMs);
  if (input.path === "both") await worker.settle(input.sequence);
  else if (input.path === "values") await worker.archive.runValues(input.sequence);
  else await worker.recorder.record(input.sequence);
  process.exit(0);
}
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
