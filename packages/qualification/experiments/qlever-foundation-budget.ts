/** Unchanged foundation44 under the separately named F configuration. The native parameter chooses DP versus greedy;
 * it is not a memory limit. See planner-budget-wave1.json and its pinned6c
 * source references. Only this owned Q foundation is changed, and100 is restored.
 */
import assert from "node:assert/strict";
import { readFileSync, realpathSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = path.resolve(import.meta.dirname, "../../..");
const args = process.argv.slice(2),
  separator = args.indexOf("--");
assert(separator >= 0, "Forward the frozen packet arguments after --");
const own = args.slice(0, separator);
const option = (key: string) => own[own.indexOf(key) + 1];
assert.equal(option("--budget"), "1");
const output = path.resolve(option("--settings-output")!);
assert(output.startsWith(realpathSync(root) + path.sep));
assert.equal(process.env["QLEVER_SCALAR_ORDER_PLAN"], undefined, "F must not bundle E");
const tokenPath = realpathSync(process.env["QLEVER_ACCESS_TOKEN_FILE"]!);
assert(tokenPath.startsWith(realpathSync(root) + path.sep));
const token = readFileSync(tokenPath, "utf8").trim(),
  url = process.env["QLEVER_URL"]!;
assert.equal(new URL(url).origin, "http://127.0.0.1:17019");
const receipt: Record<string, unknown> = {
  format: "triplex-owned-qlever-planner-threshold-arm/1",
  status: "RUNNING",
  targetBudget: "1",
  fixedEngineMemoryBytes: 2 * 1024 ** 3,
  limits: [
    "The threshold selects planner algorithms; it is not a memory ceiling.",
    "The retained100 control already used greedy planning in many components.",
    "Other engines may co-run. No other Q job is allowed during this global setting experiment.",
    "No timing, throughput or all-goal promotion is implied by these diagnostics.",
  ],
};
const save = () => writeFileSync(output, JSON.stringify(receipt, null, 2) + "\n");
const otherQ = () => {
  const state = JSON.parse(readFileSync(path.join(root, ".devloop/state.json"), "utf8"));
  return Object.values(state.jobs as Record<string, any>)
    .filter(
      (job) =>
        job.manifest.backend === "qlever" &&
        job.manifest.id !== process.env["TRIPLEX_DEVLOOP_JOB_ID"] &&
        ["running", "granted", "cleanup_unknown"].includes(job.status),
    )
    .map((job) => job.manifest.id);
};
const admin = async (parameters: Readonly<Record<string, string>>): Promise<string> => {
  const target = new URL(url);
  for (const [key, value] of Object.entries(parameters)) target.searchParams.set(key, value);
  const response = await fetch(target, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(5000),
  });
  assert(response.ok, `Owned Q planner setting HTTP${response.status}`);
  const reader = response.body?.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  if (reader)
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > 65536) {
        await reader.cancel();
        throw new Error("Planner setting response exceeds64KiB");
      }
      chunks.push(chunk.value);
    }
  return Buffer.concat(chunks).toString("utf8");
};
const settings = async () =>
  JSON.parse(await admin({ cmd: "get-settings" })) as Record<string, string>;
const setBudget = async (value: "1" | "100") => {
  await admin({ "query-planning-budget": value });
};
let changeAttempted = false,
  restored = false;
save();
try {
  receipt.otherQAtStart = otherQ();
  assert.deepEqual(receipt.otherQAtStart, []);
  const before = (await settings())["query-planning-budget"];
  receipt.before = before;
  save();
  assert.equal(before, "100", "The retained control profile must be active before F");
  // Even a lost setting acknowledgement requires an explicit restore attempt.
  changeAttempted = true;
  await setBudget("1");
  const selected = (await settings())["query-planning-budget"];
  receipt.selected = selected;
  save();
  assert.equal(selected, "1");
  const runner = path.join(root, "packages/qualification/workloads/foundation-entry.ts");
  process.argv = [process.execPath, runner, ...args.slice(separator + 1)];
  await import(pathToFileURL(runner).href);
  receipt.packetProcessExitCode = process.exitCode ?? 0;
} catch (error) {
  receipt.error = String(error);
  process.exitCode = 1;
} finally {
  if (changeAttempted) {
    try {
      await setBudget("100");
      const after = (await settings())["query-planning-budget"];
      receipt.after = after;
      assert.equal(after, "100");
      restored = true;
    } catch (error) {
      receipt.restoreError = String(error);
      process.exitCode = 1;
    }
  }
  receipt.otherQAtEnd = otherQ();
  if ((receipt.otherQAtEnd as string[]).length) process.exitCode = 1;
  receipt.status = restored
    ? "RESTORED100_PACKET_STATUS_SEPARATE"
    : "SETUP_OR_RESTORE_UNRESOLVED_RETAIN_RESERVATION";
  save();
  writeFileSync(
    path.join(path.dirname(output), "settings-status.json"),
    JSON.stringify(
      {
        before: receipt.before ?? null,
        selected: receipt.selected ?? null,
        restored100: restored,
        noOtherQAtBoundaries:
          (receipt.otherQAtStart as string[] | undefined)?.length === 0 &&
          (receipt.otherQAtEnd as string[]).length === 0,
      },
      null,
      2,
    ) + "\n",
    { flag: "wx" },
  );
}
