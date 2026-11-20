import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { cleanSource, packageBytes } from "./source.ts";

const [commit, store] = process.argv.slice(2);
assert(process.platform === "darwin" && commit && store && path.isAbsolute(store));
const source = cleanSource(commit);
const disk = fs.statfsSync(".");
assert(disk.bavail * disk.bsize >= 5 * 1024 ** 3);
const staging = path.resolve("runs/DX-V01");
fs.mkdirSync(staging, { recursive: true });
const checkout = fs.mkdtempSync(path.join(staging, "mac-"));
const repository = path.join(checkout, "repository");
const runtime = path.dirname(execFileSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], { encoding: "utf8" }).trim());
const env = {
  ...Object.fromEntries(["PATH", "LANG", "LC_ALL", "HOME"].flatMap((name) =>
    process.env[name] ? [[name, process.env[name]]] : [],
  )),
  DX_V01_MAC_FIXTURE: "1",
  DX_V01_LAB_RUNTIME: runtime,
  DX_INT1_GATEWAYS: "demand",
  DX_TOUCHED_READ_MODE: "validated",
};
const command = (bin: string, args: string[]) => execFileSync(bin, args, { env, stdio: "inherit" });
// [DX-V01] Why: exercise the package build with a fresh index and empty generated directories.
// Rejected: inheriting a different builder's package outputs or copying the large shared Git object store.
command("git", ["clone", "--shared", "--no-checkout", "--single-branch", ".", repository]);
process.chdir(repository);
command("git", ["checkout", "--detach", source]);
cleanSource(source, true);
const root = path.resolve("runs/DX-V01");
fs.mkdirSync(root, { recursive: true });
const build = path.join(root, "image");
const managed = (args: string[]) => command(process.execPath, [
  "--no-warnings", "--experimental-transform-types",
  "lab/experiments/EXP-DX1/thin1/managed.ts", ...args,
]);
command("pnpm", ["--store-dir", store, "install", "--frozen-lockfile", "--offline"]);
command("node_modules/.bin/turbo", ["run", "build",
  "--filter=@triplex-build/triplex-datomic", "--filter=@triplex-build/triplex-host",
  "--filter=@triplex-build/triplex-qualification", "--filter=@triplex-build/w0"]);
cleanSource(source);
fs.writeFileSync(path.join(root, "package-build.json"),
  JSON.stringify({ source, files: packageBytes() }, null, 2) + "\n", { flag: "wx" });
const { stageReplay } = await import("../scale1/source.ts");
const oracleInput = path.join(root, "oracle-input");
fs.mkdirSync(oracleInput);
fs.writeFileSync(path.join(oracleInput, "manifest.json"),
  JSON.stringify(stageReplay(process.cwd(), path.join(oracleInput, "oracle")), null, 2) + "\n", { flag: "wx" });
console.log("Mac evidence staging " + root);
managed(["--build", build]);
const fixture = path.join(root, "fixture");
fs.mkdirSync(fixture);
fs.renameSync(oracleInput, path.join(fixture, "oracle-input"));
managed(["--arm-compact", build, "int1-campaign-proof", "40", fixture]);
command(process.execPath, ["lab/bin/scorecard.mjs", "--age", "fresh", "--toy-campaign",
  path.join(fixture, "campaign"), "--commit", source, "--out", path.join(root, "scorecard")]);
