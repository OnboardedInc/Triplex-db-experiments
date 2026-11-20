import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { V3_OFFER_SECONDS } from "../../../bench/lib/phases.ts";
import type { Run } from "./render.ts";
import { cleanSource, verifyBuild } from "./source.ts";

const maxMinutes = 235;
const currency = (n: number) => "USD " + n.toFixed(2);
const minutes = Math.ceil(V3_OFFER_SECONDS / 30);

const { values } = parseArgs({
  options: {
    age: { type: "string" }, seed: { type: "string" }, "seal-sha256": { type: "string" },
    out: { type: "string" }, commit: { type: "string" }, "hourly-usd": { type: "string", default: "1.09" },
    help: { type: "boolean" }, plan: { type: "boolean" }, "toy-campaign": { type: "string" },
  },
});
if (values.help) {
  console.log("scorecard.mjs --age fresh|1B --seed DIR --seal-sha256 SHA256 --commit SHA1 --out NEW_DIR [--hourly-usd RATE]\nscorecard.mjs --plan [--hourly-usd RATE]\nscorecard.mjs --age fresh --toy-campaign INT1_OUTPUT --commit SHA1 --out NEW_DIR");
  process.exit(0);
}
const price = Number(values["hourly-usd"]);
assert(/^\d+(?:\.\d+)?$/.test(values["hourly-usd"]!) && Number.isFinite(price) && price > 0);
const forecast = `Forecast ${minutes} minutes of fixed offers, up to ${maxMinutes} minutes including restore, readback, evidence and cleanup. Cost ${currency(minutes / 60 * price)}–${currency(maxMinutes / 60 * price)} per run at ${currency(price)}/hour. Two ages up to ${currency(2 * maxMinutes / 60 * price)}. Build and seed preparation are outside this allocation.`;
if (values.plan) {
  console.log(forecast);
  process.exit(0);
}
const { render } = await import("./render.ts");
assert(values.age === "fresh" || values.age === "1B", "--age must be fresh or 1B");
assert(values.commit && values.out, "--commit and --out are required");
const source = cleanSource(values.commit);
const toy = Boolean(values["toy-campaign"]);
const dest = path.resolve(values.out), tag = "v01-" + randomUUID().slice(0, 12);
assert(!fs.existsSync(dest), "Use a new output directory");
const campaign = toy ? fs.realpathSync(values["toy-campaign"]!) : "/var/tmp/triplex-int1-all/" + tag;
const seal = values["seal-sha256"];
let seed: string | undefined;
let startedAt = new Date().toISOString();
if (toy) {
  assert(process.platform === "darwin" && values.age === "fresh" && !values.seed && !seal);
  startedAt = new Date(JSON.parse(fs.readFileSync(path.join(campaign, "campaign.json"), "utf8")).createdAt).toISOString();
} else {
  assert(process.platform === "linux" && process.getuid?.() === 0);
  assert.equal(execFileSync("systemd-detect-virt", { encoding: "utf8" }).trim(), "none");
  assert(seal && /^[a-f0-9]{64}$/.test(seal) && values.seed);
  assert(!fs.existsSync(campaign));
  verifyBuild(source, process.env.DX_V01_BUILD_RECEIPT);
  seed = fs.realpathSync(values.seed);
  assert.equal(createHash("sha256").update(fs.readFileSync(path.join(seed, "seed-image.json"))).digest("hex"), seal);
}
const run: Run = {
  source, age: values.age, toy, startedAt, campaign, seal,
  partial: toy && !fs.existsSync(path.join(campaign, "comparison.json")),
  forecast: toy ? "Owned Mac toy fixture. The physical time and cost forecast does not apply." : forecast,
};
console.log(run.forecast);
fs.mkdirSync(dest, { mode: 0o700 });
const log = path.join(dest, "campaign.log");
if (!toy) {
  // [DX-V01] Why: use BM1 exclusion and give the existing INT1 controller time to release private resources.
  // Rejected: launching two arms on a busy daemon or letting a restore consume the entire allocation.
  const deadline = new Date(Date.now() + (maxMinutes - 6) * 60_000).toISOString().split(".")[0] + "Z";
  const fd = fs.openSync(log, "wx", 0o600);
  const child = spawn("timeout", ["--kill-after=90s", "233m", "bash",
    "lab/experiments/EXP-DX1/int1/everything.sh", tag, deadline, "--scorecard", seed!, seal!], {
    stdio: ["ignore", fd, fd], env: serverEnvironment(),
  });
  fs.closeSync(fd);
  const stop = () => child.kill("SIGTERM");
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  const exit = await new Promise<string>((resolve) => {
    child.on("error", (e) => resolve(e.message));
    child.on("close", (code, signal) => resolve(code === 0 ? "" : String(code ?? signal)));
  });
  process.removeListener("SIGINT", stop);
  process.removeListener("SIGTERM", stop);
  if (exit) run.error = `Campaign stopped (${exit}). See [campaign.log](campaign.log) and ${campaign}.`;
}
let card;
try {
  card = render(run, dest);
} catch (e) {
  fs.writeFileSync(path.join(dest, "render-error.log"), String(e) + "\n", { flag: "wx", mode: 0o600 });
  run.error = "Verified publication is unavailable. See [render-error.log](render-error.log).";
  card = render(run, dest);
}
fs.writeFileSync(path.join(dest, "SCORECARD-v0.1.md"), card, { flag: "wx", mode: 0o600 });
console.log(path.join(dest, "SCORECARD-v0.1.md"));
if (run.error || run.partial) process.exitCode = 1;

function serverEnvironment() {
  // [DX-V01] Why: both arms use the committed treatment and launcher defaults.
  // Rejected: inherited JVM, Datomic, Docker and reader settings silently changing either arm.
  return Object.fromEntries(["PATH", "LANG", "LC_ALL", "HOME", "DX_V01_BUILD_RECEIPT"].flatMap((name) =>
    process.env[name] ? [[name, process.env[name]]] : [],
  ));
}
