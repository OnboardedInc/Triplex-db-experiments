// [EXP-NSR-R4] Why: check actual readable layout bytes against an external inventory anchor before driver execution. Rejected: trusting a file list without enumerating its runtime filesystem.
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
const root = process.env.NSR_LAYOUT_ROOT;
const sha = (b) => createHash("sha256").update(b).digest("hex");
if (!process.permission || !root || process.permission.has("fs.read", path.dirname(root)))
  throw Error("NSR layout filesystem restriction missing");
// [EXP-NSR-R4] Why: an unprobed extra grant must not make unrelated files readable. Rejected: checking a few denied paths as proof of the whole permission envelope.
const readGrants = process.execArgv.filter((arg) => arg.startsWith("--allow-fs-read"));
if (readGrants.length !== 1 || readGrants[0] !== "--allow-fs-read=" + root)
  throw Error("NSR excess filesystem read grant");
// [EXP-NSR-R5] Why: validate the actual write and environment envelopes too. Rejected: checking only read flags while an output pattern widens writes.
const output = process.env.NSR_FRESH_OUTPUT;
const writeGrants = process.execArgv.filter((arg) => arg.startsWith("--allow-fs-write"));
if (
  [root, output].some((p) => !p || p.includes("*")) ||
  writeGrants.length !== 1 ||
  writeGrants[0] !== "--allow-fs-write=" + output ||
  process.permission.has("fs.write", path.dirname(output))
)
  throw Error("NSR excess filesystem write grant");
const envKeys = [
  "PATH",
  "NSR_BUNDLE_MANIFEST",
  "NSR_LAYOUT_SHA256",
  "NSR_LAYOUT_ROOT",
  "NSR_FRESH_OUTPUT",
  ...(process.platform === "darwin"
    ? ["NSR_DARWIN_BOOT_ID", "__CF_USER_TEXT_ENCODING"]
    : ["NSR_LINUX_CLOCK"]),
].sort();
if (
  process.env.PATH !== "" ||
  (process.platform === "darwin" &&
    process.env.__CF_USER_TEXT_ENCODING !==
      `0x${process.getuid().toString(16).toUpperCase()}:0x0:0x0`) ||
  Object.keys(process.env).sort().join() !== envKeys.join()
)
  throw Error("NSR excess runtime environment");
const bytes = fs.readFileSync(path.join(root, "inventory.json"));
if (sha(bytes) !== process.env.NSR_LAYOUT_SHA256) throw Error("NSR inventory anchor mismatch");
const inventory = JSON.parse(bytes);
if (inventory.schema !== "ns-driver-layout/1") throw Error("NSR inventory schema mismatch");
const expected = { ...inventory.files, "inventory.json": sha(bytes) };
const actual = [];
function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const file = path.join(dir, name),
      rel = path.relative(root, file);
    const stat = fs.lstatSync(file);
    if (
      rel.split(path.sep).some((p) => p === "packages" || p === "node_modules") ||
      stat.isSymbolicLink()
    )
      throw Error("NSR candidate/symlink path in layout: " + rel);
    if (stat.isDirectory()) throw Error("NSR undeclared directory: " + rel);
    if (
      !stat.isFile() ||
      !Object.hasOwn(expected, rel) ||
      sha(fs.readFileSync(file)) !== expected[rel]
    )
      throw Error("NSR unrecorded or changed readable file: " + rel);
    actual.push(rel);
  }
}
walk(root);
if (actual.sort().join() !== Object.keys(expected).sort().join())
  throw Error("NSR layout file list mismatch");
// [EXP-NSR-R4] Why: write-only output cannot become a channel for candidate text. Rejected: a read grant on the dynamically populated output directory.
if (
  process.permission.has("fs.read", process.env.NSR_FRESH_OUTPUT) ||
  process.permission.has("child") ||
  process.permission.has("worker")
)
  throw Error("NSR excess runtime permission");
for (const file of inventory.forbiddenPaths) {
  try {
    fs.readFileSync(file);
    throw Error("NSR outside-layout file readable: " + file);
  } catch (error) {
    if (error.code !== "ERR_ACCESS_DENIED") throw error;
  }
}
process.stderr.write(
  JSON.stringify({
    schema: "ns-driver-layout-audit/1",
    inventorySha256: sha(bytes),
    files: actual,
    deniedPaths: inventory.forbiddenPaths,
    bundleSha256: inventory.bundleSha256,
  }) + "\n",
);
