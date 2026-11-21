import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { budget, ceiling, defaultJvm, defaultWriter, isWriter, jvmProfiles, pairSeconds, type JvmProfile } from "./profile.ts";
import { cleanSource, verifyBuild } from "./source.ts";
import { pgdataArgs } from "./pgdata.ts";

const { values } = parseArgs({
  options: {
    age: { type: "string" }, seed: { type: "string" }, "image-sha256": { type: "string" },
    "transfer-sha256": { type: "string" }, writer: { type: "string", default: defaultWriter },
    jvm: { type: "string", default: defaultJvm },
    "aged-bundle": { type: "string" }, "aged-bundle-sha256": { type: "string" }, "aged-dump": { type: "string" },
    "aged-dump-sha256": { type: "string" }, out: { type: "string" }, commit: { type: "string" },
    pgdata: { type: "string", multiple: true }, "pgdata-source": { type: "string" },
    "hourly-usd": { type: "string", default: "1.09" }, help: { type: "boolean" }, plan: { type: "boolean" },
  },
});
if (values.help) {
  console.log("scorecard.mjs --age fresh|1B --seed SCALE1_DIRECTORY --image-sha256 SHA --transfer-sha256 SHA --commit COMMIT --out NEW_DIRECTORY [--writer per-person-ordered|grouped] [--jvm j21-g1|j25-g1|j25-zgc]\nFor prepared PostgreSQL use --pgdata-source SEALED_PGDATA with --pgdata COPY once per arm (ordered zero, ordered loaded, grouped loaded).\nFor 1B also provide --aged-bundle FILE --aged-bundle-sha256 SHA. Without prepared directories, also provide --aged-dump FILE --aged-dump-sha256 SHA for 1B.\nscorecard.mjs --plan");
  process.exit(0);
}
const price = Number(values["hourly-usd"]);
assert(/^\d+(?:\.\d+)?$/.test(values["hourly-usd"]!) && Number.isFinite(price) && price > 0);
assert(isWriter(values.writer), "Choose per-person-ordered or grouped");
assert(jvmProfiles.includes(values.jvm as JvmProfile), "Unknown scorecard JVM profile");
const jvm = values.jvm as JvmProfile;
const pgdata = pgdataArgs(values.pgdata ?? [], values["pgdata-source"], values.writer === "grouped").map((dir) => path.resolve(dir));
const minutes = values.writer === "grouped" ? budget.comparison + budget.cleanup : ceiling;
const plan = values.writer === "grouped"
  ? `Grouped repeats P2 and P6 only, with ${pairSeconds / 120} minutes of P2 offers.`
  : `Per-person-ordered runs the full adopted workload and includes a grouped P2 and P6 comparison. The main P1–P4 pair uses ${pairSeconds / 60} minutes of matched offers.`;
const storage = pgdata.length ? "Starts from prepared PGDATA copies. File-level preparation, build and AGE1 provisioning are separate."
  : "Without prepared PGDATA, this command uses logical dumps. Build and AGE1 provisioning are separate.";
const forecast = `Budget ${minutes} minutes including cleanup, up to USD ${(minutes / 60 * price).toFixed(2)} per age. ${plan} JVM ${jvm}. ${storage}`;
if (values.plan) { console.log(forecast); process.exit(0); }
assert(values.age === "fresh" || values.age === "1B");
assert(values.commit && values.out && values.seed && values["image-sha256"] && values["transfer-sha256"]);
const aged = [values["aged-bundle"], values["aged-bundle-sha256"], values["aged-dump"], values["aged-dump-sha256"]];
assert(values.age === "1B" ? (pgdata.length ? aged.slice(0, 2).every(Boolean) && !aged[2] && !aged[3] : aged.every(Boolean))
  : aged.every((v) => !v), "Provide the required AGE1 identity and choose one PostgreSQL startup path");
assert(process.platform === "linux" && process.getuid?.() === 0);
// [DX-V01] Why: systemd reports "none" with exit 1 on bare metal.
// Rejected: treating its successful bare-metal detection as an execution error.
const host = spawnSync("systemd-detect-virt", [], { encoding: "utf8", timeout: 5000 });
assert(!host.error && host.status === 1 && host.stdout.trim() === "none", "Scorecard requires a bare-metal Linux host");
const source = cleanSource(values.commit);
verifyBuild(source, process.env.DX_V01_BUILD_RECEIPT);
const out = path.resolve(values.out), campaign = path.join(out, "campaign");
fs.mkdirSync(out, { mode: 0o700 });
console.log(forecast);
const fd = fs.openSync(path.join(out, "campaign.log"), "wx", 0o600);
const child = spawn("timeout", ["--kill-after=" + budget.cleanup + "m", String(minutes - budget.cleanup) + "m", "bash",
  "lab/experiments/EXP-DX1/v01/adopted-server.sh", source, campaign, String(Date.now() + (minutes - budget.cleanup) * 60_000),
  path.resolve(values.seed), values["image-sha256"], values["transfer-sha256"], values.age, values.writer, jvm,
  ...aged.map((v) => v ?? ""), ...pgdata], {
  stdio: ["ignore", fd, fd],
  env: Object.fromEntries(["PATH", "LANG", "LC_ALL", "HOME", "DX_V01_BUILD_RECEIPT", "AGE_JAVA", "AGE_DATOMIC_HOME"]
    .flatMap((name) => process.env[name] ? [[name, process.env[name]]] : [])),
});
fs.closeSync(fd);
const stop = () => child.kill("SIGTERM");
process.once("SIGINT", stop); process.once("SIGTERM", stop);
const exit = await new Promise<string>((done) => {
  child.once("error", (e) => done(e.message));
  child.once("close", (code, signal) => done(code === 0 ? "" : String(code ?? signal)));
});
process.removeListener("SIGINT", stop); process.removeListener("SIGTERM", stop);
const { writeAdoptedCard } = await import("./adopted-card.ts");
writeAdoptedCard({ source, age: values.age, writer: values.writer, jvm, toy: false, out, campaign, forecast, prepared: pgdata.length > 0,
  failure: exit ? "The adopted campaign stopped. See [campaign.log](campaign.log)." : undefined });
console.log(path.join(out, "SCORECARD-v0.1.md"));
if (exit) process.exitCode = 1;
