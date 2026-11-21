import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { defaultCreditMode } from "../jvm1/launch.mjs";
import { parseCredits } from "./server-workload.ts";
import { barrierRoot, isWriter } from "./profile.ts";
import { cleanSource, packageBytes } from "./source.ts";

const [action, commit, argument, writerArg, creditArg, ageArg] = process.argv.slice(2);
assert(process.platform === "darwin" && commit && argument && path.isAbsolute(argument));
assert(["--packages", "--image", "--fixture", "--read-study-fixture", "--publish-fixture", "--held-publish-fixture"].includes(action ?? ""));
const writer = writerArg ?? (action === "--publish-fixture" ? "grouped" : "per-person-ordered");
assert(isWriter(writer));
assert(ageArg === undefined || ageArg === "realistic");
const age = ageArg === "realistic" ? ageArg : "fresh";
const creditMode = parseCredits(creditArg ?? process.env.DX_V01_CREDIT_MODE);
const head = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
cleanSource(head);
assert.match(commit, /^[a-f0-9]{40}$/);
execFileSync("git", ["merge-base", "--is-ancestor", commit, head]);
// [DX-THIN1] Why: the integration builder runs the card's toy under its own engine holder, as before the card merge.
// Rejected: borrowing the scorecard builder's reservations and image tags.
const holder = process.env.DX_V01_MAC_HOLDER ?? "DX-V01";
assert(holder === "DX-V01" || holder === "DX-THIN1");
const disk = fs.statfsSync(".");
assert(disk.bavail * disk.bsize >= 10 * 1024 ** 3);
const staging = path.resolve("runs/DX-V01");
fs.mkdirSync(staging, { recursive: true });
const checkout = action === "--packages" ? fs.mkdtempSync(path.join(staging, "mac-")) : fs.realpathSync(argument);
assert(path.dirname(checkout) === staging && /^mac-[a-zA-Z0-9]+$/.test(path.basename(checkout)));
const repository = path.join(checkout, "repository");
const runtime = path.dirname(execFileSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], { encoding: "utf8" }).trim());
const env = {
  ...Object.fromEntries(["PATH", "LANG", "LC_ALL", "HOME"].flatMap((name) =>
    process.env[name] ? [[name, process.env[name]]] : [],
  )),
  DX_V01_MAC_FIXTURE: "1",
  DX_V01_MAC_HOLDER: holder,
  ...(action === "--read-study-fixture" ? { DX_V01_MAC_READ_STUDY: "1" } : {}),
  TURBO_TELEMETRY_DISABLED: "1",
  ...(action === "--publish-fixture" ? { DX_V01_MAC_PUBLISH: "1" } : {}),
  ...(action === "--held-publish-fixture" ? { DX_V01_MAC_HELD_PUBLISH: "1" } : {}),
  DX_V01_LAB_RUNTIME: runtime,
  DX_INT1_GATEWAYS: "demand",
  DX_TOUCHED_READ_MODE: "following",
};
const command = (bin: string, args: string[]) => execFileSync(bin, args, { env, stdio: "inherit" });
if (action === "--packages") {
  console.log("Mac checkout " + checkout);
  // [DX-V01] Why: exercise the package build with a fresh index and empty generated directories.
  // Rejected: inheriting a different builder's package outputs or copying the large shared Git object store.
  command("git", ["clone", "--shared", "--no-checkout", "--single-branch", ".", repository]);
  process.chdir(repository);
  command("git", ["checkout", "--detach", commit]);
  cleanSource(commit, true);
  command("pnpm", ["--store-dir", argument, "install", "--frozen-lockfile", "--offline"]);
  command("node_modules/.bin/turbo", ["run", "build",
    "--filter=@triplex-build/triplex-datomic", "--filter=@triplex-build/triplex-host",
    "--filter=@triplex-build/triplex-qualification", "--filter=@triplex-build/w0"]);
  cleanSource(commit);
  const root = path.resolve("runs/DX-V01");
  fs.mkdirSync(root, { recursive: true });
  fs.writeFileSync(path.join(root, "package-build.json"),
    JSON.stringify({ source: commit, files: packageBytes() }, null, 2) + "\n", { flag: "wx" });
} else {
  process.chdir(repository);
  cleanSource(commit);
  const root = path.resolve("runs/DX-V01");
  const receipt = JSON.parse(fs.readFileSync(path.join(root, "package-build.json"), "utf8"));
  assert.equal(receipt.source, commit);
  assert.deepEqual(packageBytes(), receipt.files);
  const build = path.join(root, "image");
  const managed = (args: string[]) => command(process.execPath, [
    "--no-warnings", "--experimental-transform-types",
    "lab/experiments/EXP-DX1/thin1/managed.ts", ...args,
  ]);
  if (action === "--image") managed(["--build", build]);
  else {
    // [DX-V01] Why: leave each native attempt and its independently staged oracle available after failure.
    // Rejected: recycling a previous output directory or taking a Mac measurement lease.
    const fixture = fs.mkdtempSync(path.join(root, "fixture-"));
    console.log("Mac evidence staging " + fixture);
    const campaign = path.join(fixture, "campaign");
    fs.mkdirSync(campaign);
    const fixtures = [{ mode: creditMode, output: fixture, comparison: false }];
    if (action === "--fixture" && writer === "per-person-ordered")
      fixtures.push({ mode: defaultCreditMode, output: path.dirname(path.join(campaign, barrierRoot)), comparison: true });
    for (const { mode, output, comparison } of fixtures) {
      if (output !== fixture) fs.mkdirSync(path.join(output, "campaign"), { recursive: true });
      try {
        execFileSync(process.execPath, ["--no-warnings", "--experimental-transform-types",
          "lab/experiments/EXP-DX1/thin1/managed.ts", "--arm-compact", build, "int1-adopted-proof", "80", output],
        { env: { ...env, DX_V01_MAC_WRITER: writer, DX_V01_CREDIT_MODE: mode, DX_V01_MAC_AGE: age, DX_V01_MAC_COMPARISON: comparison ? "1" : "0" }, stdio: "inherit" });
      } catch (error) {
        console.error(error);
        process.exitCode = 1;
      }
    }
    if (action === "--fixture") {
      const { writeAdoptedCard } = await import("./adopted-card.ts");
      writeAdoptedCard({ source: commit, age, writer, creditMode, toy: true, campaign,
        out: fixture, forecast: "Mac diagnostics from the SCALE1 loader fixture." });
    }
  }
}
