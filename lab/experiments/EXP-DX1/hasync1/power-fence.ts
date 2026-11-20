import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { runFile } from "../ha1/common.ts";
import { timeouts, type FenceProof } from "./supervisor.ts";

type Owner = Omit<FenceProof, "method">;
export type PowerFence = (owner: Owner) => Promise<FenceProof>;

export function powerFence(executable: string): PowerFence {
  assert(
    path.isAbsolute(executable),
    "A provisioned fencing executable must have an absolute path",
  );
  return async (owner) => {
    const request = { ...owner, challenge: randomUUID() };
    const started = performance.now();
    const call = async (op: "fence" | "observe", ticket?: string) => {
      const remaining = Math.floor(timeouts.fence - (performance.now() - started));
      assert(remaining > 0, "Independent fencing budget expired");
      const out = await runFile(executable, [op, JSON.stringify({ ...request, ticket })], {
        timeout: remaining,
        maxBuffer: 8192,
      });
      return JSON.parse(out.stdout);
    };
    // [DX-HASYNC1] Why: promotion needs a fresh independent read-back that old storage is isolated across reboot. Rejected: trusting an off request's successful exit or interpreting an unreachable host as fenced.
    const accepted = await call("fence");
    assert.equal(accepted.challenge, request.challenge);
    assert.match(accepted.ticket, /^[a-zA-Z0-9_-]{12,128}$/);
    const observed = await call("observe", accepted.ticket);
    assert.deepEqual(observed, {
      ...request,
      ticket: accepted.ticket,
      state: "isolated",
      restartLatched: true,
    });
    return { ...owner, method: "independent-power-off" };
  };
}
