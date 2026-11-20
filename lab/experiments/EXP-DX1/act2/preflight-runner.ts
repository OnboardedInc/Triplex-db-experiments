import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Binding, checkWindows } from "./preflight.ts";

export function validatePreflight(
  proof: Awaited<ReturnType<typeof checkWindows>> & { sourceInputs: string; elapsedMs: number },
  binding: Binding,
) {
  assert.deepEqual(proof.binding, binding);
  assert.equal(proof.scope, "act2-preflight-" + binding.nonce);
  assert.equal(proof.subjects, 1000);
  assert.match(proof.sourceInputs, /^[a-f0-9]{64}$/);
  assert.match(proof.oracleSha256, /^[a-f0-9]{64}$/);
  assert(Number.isFinite(proof.elapsedMs) && proof.elapsedMs > 0 && proof.elapsedMs < 600000);
  assert.deepEqual(
    proof.windows.map((w) => w.phase),
    ["baseline", "sweep"],
  );
  const [a, b] = proof.windows;
  assert(
    [a, b].every(
      (w) =>
        w &&
        w.txId &&
        Number.isSafeInteger(w.position) &&
        Number.isSafeInteger(w.save) &&
        w.position > 0 &&
        w.save > w.position,
    ),
  );
  assert(b!.position > a!.save && a!.txId !== b!.txId && b!.save === proof.cut);
}

// [DX-ACT2] Why: the parent must enforce the deadline even if the child stops scheduling JS, and refuse stale output before it launches a seed. Rejected: a timer inside the workload as the only watchdog.
export function guardSeed(dir: string, binding: Binding, env: NodeJS.ProcessEnv) {
  fs.mkdirSync(dir);
  fs.writeFileSync(path.join(dir, "request.json"), JSON.stringify(binding) + "\n", { flag: "wx" });
  const status = path.join(dir, "STATUS.json");
  try {
    execFileSync(
      process.execPath,
      [
        "--experimental-strip-types",
        fileURLToPath(new URL("./preflight.ts", import.meta.url)),
        dir,
        binding.source,
        binding.slot,
        binding.nonce,
      ],
      { env, stdio: "inherit", timeout: 600000, killSignal: "SIGKILL" },
    );
    const proof = JSON.parse(fs.readFileSync(path.join(dir, "preflight.json"), "utf8"));
    validatePreflight(proof, binding);
    assert.deepEqual(JSON.parse(fs.readFileSync(status, "utf8")).binding, binding);
    assert.equal(JSON.parse(fs.readFileSync(status, "utf8")).stage, "verified");
    return proof;
  } catch (e) {
    fs.mkdirSync(dir, { recursive: true });
    const stage = fs.existsSync(status)
      ? JSON.parse(fs.readFileSync(status, "utf8"))
      : { stage: "starting preflight" };
    const cause =
      (e as NodeJS.ErrnoException).code === "ETIMEDOUT"
        ? "600 second deadline"
        : String(e).split("\n")[0];
    const reason = stage.reason ?? stage.stage + ": " + cause;
    fs.writeFileSync(status + ".tmp", JSON.stringify({ binding, stage: "stopped", reason }) + "\n");
    fs.renameSync(status + ".tmp", status);
    throw Error("Large seed stopped before it started: " + reason);
  }
}
if (process.argv[1] === import.meta.filename) {
  const [dir, source, slot, nonce] = process.argv.slice(2);
  guardSeed(dir!, { source: source!, slot: slot!, nonce: nonce! }, process.env);
}
