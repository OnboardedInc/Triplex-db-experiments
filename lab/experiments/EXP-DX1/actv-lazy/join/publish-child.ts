// [DX-ACT8] A Publish in its own process, killed at a chosen step (beside-gate.ts, part `kill`): after the plan's last read
// (`read`), inside its transaction after the snapshot (`inside`), right after the native acknowledgement (`ack`), or at
// a random moment (`killAfterMs`). Input on stdin: { scope, held, id, doc, validTime, step, killAfterMs? }. The runner
// then offers the same Publish again and checks that exactly one record exists for its command ID.
import assert from "node:assert/strict";
import { openStore } from "../store.ts";
import { JoinedAccount, type PublishOptions } from "./account.ts";

const chunks: Buffer[] = [];
for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
const input = JSON.parse(Buffer.concat(chunks).toString());
assert(["read", "inside", "ack", "random"].includes(input.step) && process.env.TX2_PUBLISH_BESIDE === "1");
const kill = () => {
  process.kill(process.pid, "SIGKILL");
};
if (typeof input.killAfterMs === "number") setTimeout(kill, input.killAfterMs);
const store = await openStore(input.scope, "act2-deep", "write", {
  ...input.held,
  // The runner's ledger adopts this process's record by its command ID; nothing is checked here.
  verifyThrough: async () => {},
  committed: () => {},
});
const options: PublishOptions =
  input.step === "read"
    ? { afterRead: async () => kill() }
    : input.step === "inside"
      ? { inside: async () => kill() }
      : input.step === "ack"
        ? { onAck: () => kill() }
        : {};
await new JoinedAccount(store).publish(input.id, input.doc, input.validTime, "owed", undefined, options);
await store.close();
process.exit(0);
