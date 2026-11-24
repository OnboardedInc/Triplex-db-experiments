import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

/**
 * [DX-CARD1] Files a later renderer may change and still assemble a campaign run at an earlier source: the card's
 * assembly code, its tests and documents. Anything the parts ran (tapes, runner, gateway, packages) must be unchanged.
 */
export const assemblyFiles = [
  "lab/experiments/EXP-DX1/v01/windows.ts",
  "lab/experiments/EXP-DX1/v01/adopted-card.ts",
  "lab/experiments/EXP-DX1/v01/run.ts",
  "lab/experiments/EXP-DX1/v01/renderer.ts",
];
export const assemblyFile = (file: string) => assemblyFiles.includes(file) || /\.(test\.ts|md)$/.test(file);

export function rendererDiff(source: string, renderer: string, git = (...args: string[]) =>
  execFileSync("git", args, { encoding: "utf8", maxBuffer: 64 * 1024 ** 2 }).trim()) {
  assert.match(source, /^[a-f0-9]{40}$/, "Give the campaign's full source commit");
  assert.match(renderer, /^[a-f0-9]{40}$/);
  assert.notEqual(source, renderer, "The renderer is the campaign's source: assemble without --renderer");
  try { git("merge-base", "--is-ancestor", source, renderer); }
  catch { assert.fail("The renderer does not descend from the campaign's source"); }
  const files = git("diff", "--name-only", source, renderer).split("\n").filter(Boolean).sort();
  const other = files.filter((f) => !assemblyFile(f));
  assert.deepEqual(other, [], "The renderer changes files the campaign ran: " + other.join(", "));
  return { commit: renderer, files };
}
