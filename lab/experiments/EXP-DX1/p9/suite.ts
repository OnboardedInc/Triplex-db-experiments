import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

export const totalBudgetMs = 89 * 60000;
export const optionalFloorMs = 20 * 60000;
const collectReserveMs = 4 * 60000;
const controller = fileURLToPath(new URL("../ha1/control.ts", import.meta.url));

function dispatch(mode: string, tag: string, extraEnv: Record<string, string> = {}) {
  const child = spawn(process.execPath, ["--import", "tsx", controller, mode, tag, "two-host"], {
    stdio: "inherit",
    env: { ...process.env, ...extraEnv },
  });
  return new Promise<number>((resolve, reject) => {
    child.once("error", reject);
    child.once("close", (code) => resolve(code ?? 1));
  });
}

export async function runSuite(tag: string) {
  assert(/^[a-z][a-z0-9-]{2,34}$/.test(tag), "Use a fresh suite tag of at most 35 characters");
  const end = performance.now() + totalBudgetMs;
  // [DX-HASYNC1] Why: collect and verify the four mandatory values before spending time on scale. Rejected: losing the scorecard to a late exploratory cell or its archive.
  const primary = await dispatch("hasync-p9", tag);
  if (primary !== 0) return primary;
  const remaining = Math.floor(end - performance.now() - collectReserveMs);
  if (process.env["P9_OPTIONAL"] === "0" || remaining < optionalFloorMs) return 0;
  return dispatch("hasync-scale", tag + "-scale", { HA1_SCALE_BUDGET_MS: String(remaining) });
}
