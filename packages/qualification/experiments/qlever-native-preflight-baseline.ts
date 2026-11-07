/** Run the untouched-instance metadata preflight only under its declared baseline100 configuration.
 * Reads settings before/after; never changes any Q runtime parameter.
 */
import assert from "node:assert/strict";
import { readFileSync, realpathSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
const root = path.resolve(import.meta.dirname, "../../.."),
  args = process.argv.slice(2),
  split = args.indexOf("--");
assert(split >= 0);
const own = args.slice(0, split),
  output = path.resolve(own[own.indexOf("--settings-output") + 1]!);
assert(output.startsWith(realpathSync(root) + path.sep));
assert.equal(process.env["TRIPLEX_QUERY_PATH"], "qlever-native");
const tokenFile = realpathSync(process.env["QLEVER_ACCESS_TOKEN_FILE"]!);
assert(tokenFile.startsWith(realpathSync(root) + path.sep));
const token = readFileSync(tokenFile, "utf8").trim(),
  target = new URL(process.env["QLEVER_URL"]!);
assert.equal(target.href, "http://127.0.0.1:17019/");
target.searchParams.set("cmd", "get-settings");
const report: Record<string, unknown> = {
  format: "triplex-qlever-native-baseline-settings/1",
  status: "RUNNING",
  mutation: "NONE",
  before: null,
  after: null,
};
const save = () => writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
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
const readBudget = async () => {
  const response = await fetch(target, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(5000),
  });
  assert(response.ok);
  const reader = response.body?.getReader(),
    chunks: Uint8Array[] = [];
  let bytes = 0;
  if (reader)
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > 65536) {
        await reader.cancel();
        throw new Error("Settings response exceeds64KiB");
      }
      chunks.push(chunk.value);
    }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"))["query-planning-budget"];
};
save();
try {
  report.otherQAtStart = otherQ();
  assert.deepEqual(report.otherQAtStart, []);
  report.before = await readBudget();
  save();
  assert.equal(report.before, "100");
  const runner = path.join(root, "packages/qualification/experiments/qlever-native-instance-preflight.ts");
  process.argv = [process.execPath, runner, ...args.slice(split + 1)];
  await import(pathToFileURL(runner).href);
} catch (error) {
  report.error = String(error);
  process.exitCode = 1;
} finally {
  try {
    report.after = await readBudget();
    assert.equal(report.after, "100");
  } catch (error) {
    report.readbackError = String(error);
    process.exitCode = 1;
  }
  report.otherQAtEnd = otherQ();
  if ((report.otherQAtEnd as string[]).length) process.exitCode = 1;
  report.status =
    report.before === "100" && report.after === "100"
      ? "BASELINE100_CONFIRMED_PACKET_STATUS_SEPARATE"
      : "BASELINE_NOT_CONFIRMED";
  save();
  writeFileSync(
    path.join(path.dirname(output), "settings-status.json"),
    JSON.stringify(
      {
        before: report.before,
        after: report.after,
        settingsUnchanged: report.before === "100" && report.after === "100",
        noOtherQAtBoundaries:
          (report.otherQAtStart as string[] | undefined)?.length === 0 &&
          (report.otherQAtEnd as string[]).length === 0,
      },
      null,
      2,
    ) + "\n",
    { flag: "wx" },
  );
}
