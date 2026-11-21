import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { budget, ceiling, defaultJvm, defaultWriter, jvmProfiles, pairSeconds, writeDiagnostics, type JvmProfile } from "./profile.ts";
import { cleanSource, verifyBuild } from "./source.ts";
import { defaultCreditMode, launchProfile, type CreditMode } from "../jvm1/launch.mjs";

const { values } = parseArgs({
  options: {
    age: { type: "string" }, seed: { type: "string" }, "image-sha256": { type: "string" },
    "transfer-sha256": { type: "string" }, writer: { type: "string", default: defaultWriter },
    jvm: { type: "string", default: defaultJvm },
    "tx-jvm": { type: "string" }, "write-jvm": { type: "string" },
    "read-study": { type: "boolean" }, "read-study-jvm": { type: "string" },
    "credit-mode": { type: "string", default: process.env.DX_V01_CREDIT_MODE ?? defaultCreditMode },
    "wal-directory": { type: "string" },
    "aged-bundle": { type: "string" }, "aged-bundle-sha256": { type: "string" }, "aged-dump": { type: "string" },
    "aged-dump-sha256": { type: "string" }, out: { type: "string" }, commit: { type: "string" },
    "hourly-usd": { type: "string", default: "1.09" }, help: { type: "boolean" }, plan: { type: "boolean" },
  },
});
if (values.help) {
  console.log("scorecard.mjs --age fresh|1B --seed SCALE1_DIRECTORY --image-sha256 SHA --transfer-sha256 SHA --commit COMMIT --out NEW_DIRECTORY [--writer grouped|subject] [--jvm j21-g1|j25-g1|j25-zgc] [--tx-jvm PROFILE] [--write-jvm PROFILE] [--credit-mode barrier6|rolling6|rolling8|rolling12|rolling16] [--wal-directory DIR]\nFor 1B add --aged-bundle FILE --aged-bundle-sha256 SHA --aged-dump FILE --aged-dump-sha256 SHA.\nFor the fresh reader diagnostic use --read-study [--read-study-jvm PROFILE].\nscorecard.mjs --plan [--read-study]");
  process.exit(0);
}
const price = Number(values["hourly-usd"]);
assert(/^\d+(?:\.\d+)?$/.test(values["hourly-usd"]!) && Number.isFinite(price) && price > 0);
const forecast = `Budget ${ceiling} minutes including cleanup, up to USD ${(ceiling / 60 * price).toFixed(2)} per age. This revision allocates ${budget.adoptionAndP1to4} minutes to restore and partial P1–P4 coverage, including ${pairSeconds / 60} minutes of matched offers. Build and AGE1 provisioning are separate.`;
assert(values.writer === "grouped" || values.writer === "subject");
assert(jvmProfiles.includes(values.jvm as JvmProfile), "Unknown scorecard JVM profile");
const txJvm = (values["tx-jvm"] ?? values.jvm) as JvmProfile;
const writeJvm = (values["write-jvm"] ?? values.jvm) as JvmProfile;
const creditMode = values["credit-mode"] as CreditMode;
const launch = launchProfile("server", { jvm: values.jvm as JvmProfile, txJvm, writeJvm, creditMode });
const study = values["read-study"] === true;
assert(study || !values["read-study-jvm"]);
const readJvm = (values["read-study-jvm"] ?? values.jvm) as JvmProfile;
const treatment = study ? launchProfile("server", { jvm: values.jvm as JvmProfile, txJvm, writeJvm, readJvm, creditMode, readTuned: true }) : undefined;
const diagnostics = writeDiagnostics(values.writer);
if (values.plan) {
  console.log(forecast + ` Writer ${values.writer}, server profile, credits ${creditMode}. JVM ${values.jvm}, transactor JVM ${txJvm}, write gateway JVM ${writeJvm}.`);
  console.log(JSON.stringify({ ...launch, ...diagnostics }, null, 2));
  if (study) console.log(JSON.stringify({ treatment, cutoffMinutes: 56, batch: 8, rates: [50, 235], seats: [1, 4, 16, 64, 256, 1024] }, null, 2));
  process.exit(0);
}
assert(values.age === "fresh" || values.age === "1B");
assert(!study || values.age === "fresh", "The short reader study requires the fresh prepared copy");
assert(values.commit && values.out && values.seed && values["image-sha256"] && values["transfer-sha256"]);
const aged = [values["aged-bundle"], values["aged-bundle-sha256"], values["aged-dump"], values["aged-dump-sha256"]];
assert(values.age === "1B" ? aged.every(Boolean) : aged.every((v) => !v));
assert(process.platform === "linux" && process.getuid?.() === 0);
assert.equal(execFileSync("systemd-detect-virt", { encoding: "utf8" }).trim(), "none");
const source = cleanSource(values.commit);
verifyBuild(source, process.env.DX_V01_BUILD_RECEIPT);
const out = path.resolve(values.out), campaign = path.join(out, "campaign");
fs.mkdirSync(out, { mode: 0o700 });
console.log(study ? "Reader diagnostic, 56-minute wall clock cutoff including restores and cleanup." : forecast);
const fd = fs.openSync(path.join(out, "campaign.log"), "wx", 0o600);
const child = spawn("timeout", ["--kill-after=90s", String(study ? 56 : budget.adoptionAndP1to4 + budget.P6 + budget.P7 + 1) + "m", "bash",
  "lab/experiments/EXP-DX1/v01/adopted-server.sh", source, campaign, String(Date.now() + (study ? 53 : budget.adoptionAndP1to4) * 60_000),
  path.resolve(values.seed), values["image-sha256"], values["transfer-sha256"], values.age, values.writer, values.jvm!,
  ...aged.map((v) => v ?? ""), txJvm, values["wal-directory"] ? path.resolve(values["wal-directory"]) : "", writeJvm, creditMode,
  study ? readJvm : ""], {
  stdio: ["ignore", fd, fd],
  env: Object.fromEntries(["PATH", "LANG", "LC_ALL", "HOME", "DX_V01_BUILD_RECEIPT", "AGE_JAVA", "AGE_DATOMIC_HOME", "DX_W1_SERIAL_APPLY", "PREP1_LOOKUP_EVERY"]
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
if (study) {
  console.log(path.join(out, "campaign.log"));
} else {
  const { writeAdoptedCard } = await import("./adopted-card.ts");
  writeAdoptedCard({ source, age: values.age, writer: values.writer, toy: false, out, campaign, forecast,
    failure: exit ? "The adopted campaign stopped. See [campaign.log](campaign.log)." : undefined });
  console.log(path.join(out, "SCORECARD-v0.1.md"));
}
if (exit) process.exitCode = 1;
