// [CX-VP2Q-4-R9] Why: accept only fresh assertion content bound to this source, inputs and the actual heavy owner.
// Rejected: exit-zero receipts or a prior green JSON file (neither proves the requested cases executed now).
import fs from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { execFileSync, spawn } from "node:child_process";
const [name, expectedPassedText, expectedFailedText, expectedTotalText, ...originalCommand] = process.argv.slice(2);
const root = process.cwd(), base = path.join(root, "lab/verify/P2Q/evidence-round9");
const out = path.join(base, name), attempt = randomUUID(), started = Date.now();
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
const free = fs.statfsSync(root);
if (free.bavail * free.bsize < 5 * 1024 ** 3) throw new Error("below 5 GiB admission floor");
fs.mkdirSync(out, { recursive: false });
const label = `CX-VP2Q-4-R9-${name}`;
const locks = process.env.TX2_LOCKS_DIR ?? "/Users/sam/projects/triplex-db-2/lab/locks";
const slot = () => {
  const rows = fs.readdirSync(path.join(locks, "heavy")).flatMap(index => {
    const file = path.join(locks, "heavy", index, "owner.json");
    if (!fs.existsSync(file)) return [];
    const bytes = fs.readFileSync(file), owner = JSON.parse(bytes);
    return owner.pid === process.ppid && owner.label === label ? [{ file, owner, sha256: sha(bytes) }] : [];
  });
  if (rows.length !== 1) throw new Error("no unique matching actual heavy-slot owner");
  return rows[0];
};
const owner = slot();
const files = git("ls-files", "--cached", "--others", "--exclude-standard", "packages/core/src", "packages/core/test", "packages/qlever/src", "packages/qlever/test", "lab/verify/P2Q/tests", "lab/verify/P2Q/scripts", "lab/verify/P2Q/vitest.config.ts", "lab/bin/heavy.mjs", "lab/bin/heavy-lock.mjs", "lab/bin/lib.mjs", "vitest.workspace-aliases.ts", "pnpm-lock.yaml", "package.json", "tsconfig.base.json", "tsconfig.node.json").split("\n");
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
  const file = path.join(dir, entry.name);
  return entry.isDirectory() ? walk(file) : entry.isFile() ? [file] : [];
});
if (process.env.R9_SCRATCH) files.push(...walk(process.env.R9_SCRATCH));
for (const version of fs.readdirSync("node_modules/.pnpm").filter(name => /^undici@\d/.test(name)))
  files.push(`node_modules/.pnpm/${version}/node_modules/undici/lib/core/errors.js`);
const preimages = [...new Set(files)].map(file => ({ file, sha256: sha(fs.readFileSync(file)) }));
const compiler = expectedPassedText === "compiler";
const expected = { passed: Number(expectedPassedText), failed: Number(expectedFailedText), total: Number(expectedTotalText) };
const resultFile = path.join(out, "vitest.json"), logFile = path.join(out, "command.log");
const command = compiler ? originalCommand : [...originalCommand, "--reporter=default", "--reporter=json", `--outputFile.json=${resultFile}`];
const env = { ...process.env, V_P2Q_OUT: path.join(out, "cases"), V_P2Q_RUNS: path.join(root, "lab/verify/P2Q/state-round9", attempt), R9_ATTEMPT_ID: attempt };
delete env.QLEVER_COMMIT_PATH;
delete env.QLEVER_INTEGRATION;
if (env.V_P2Q_LIVE === "1") env.QLEVER_INTEGRATION = "1";
if (env.V_P2Q_LIVE === "1" && env.QLEVER_URL !== "http://127.0.0.1:7070") throw new Error("wrong live endpoint");
const receipt = { name, attempt, target: git("rev-parse", "36dacc2e"), head: git("rev-parse", "HEAD"), started, cwd: root,
  command, expected: compiler ? "empty successful noEmit diagnostics" : expected, purpose: process.env.R9_PURPOSE ?? "correctness gate",
  inputs: { scratch: process.env.R9_SCRATCH ?? null, live: env.V_P2Q_LIVE ?? null, engine: env.QLEVER_URL ?? null, seeds: env.V_P2Q_SEEDS ?? null, cases: env.V_P2Q_OUT, state: env.V_P2Q_RUNS },
  freeBytesBefore: free.bavail * free.bsize, node: process.version, heavySlot: owner, preimages };
const fd = fs.openSync(logFile, "wx");
const exit = await new Promise(resolve => {
  const child = spawn(command[0], command.slice(1), { env, stdio: ["ignore", fd, fd] });
  child.on("close", (code, signal) => resolve({ code, signal }));
  child.on("error", error => resolve({ code: 127, error: String(error) }));
});
fs.closeSync(fd);
const finished = Date.now();
let content = false, fresh = false, counts, failedCases = [];
if (compiler) { content = fs.readFileSync(logFile).length === 0; fresh = fs.statSync(logFile).mtimeMs >= started; }
else if (fs.existsSync(resultFile)) {
  const data = JSON.parse(fs.readFileSync(resultFile, "utf8"));
  const cases = data.testResults.flatMap(suite => suite.assertionResults);
  counts = { passed: cases.filter(test => test.status === "passed").length, failed: cases.filter(test => test.status === "failed").length, total: cases.length };
  failedCases = cases.filter(test => test.status === "failed").map(test => ({ name: test.fullName, messages: test.failureMessages }));
  content = JSON.stringify(counts) === JSON.stringify(expected) && data.numPassedTests === counts.passed && data.numFailedTests === counts.failed && data.success === (counts.failed === 0)
    && cases.every(test => ["passed", "failed", "pending", "skipped"].includes(test.status));
  if (expected.failed > 0) content = content && Boolean(process.env.R9_FAILURE_PATTERN)
    && failedCases.every(test => new RegExp(process.env.R9_FAILURE_PATTERN, "s").test(test.messages.join("\n")));
  fresh = data.startTime >= started && data.startTime <= finished && fs.statSync(resultFile).mtimeMs >= started && fs.statSync(resultFile).mtimeMs <= finished;
  receipt.resultSha256 = sha(fs.readFileSync(resultFile));
}
const sourceStillMatches = preimages.every(row => fs.existsSync(row.file) && sha(fs.readFileSync(row.file)) === row.sha256);
const heavySlotStillMatches = JSON.stringify(slot()) === JSON.stringify(owner);
const exitMatches = exit.code === (compiler || expected.failed === 0 ? 0 : 1);
const accepted = content && fresh && sourceStillMatches && heavySlotStillMatches && exitMatches;
Object.assign(receipt, exit, { finished, counts, failedCases, contentMatches: content, fresh, sourceStillMatches, heavySlotStillMatches,
  logSha256: sha(fs.readFileSync(logFile)), accepted });
fs.writeFileSync(path.join(out, "receipt.json"), JSON.stringify(receipt, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify({ name, code: exit.code, counts, accepted, sourceStillMatches, heavySlotStillMatches }));
process.exitCode = accepted ? 0 : 1;
