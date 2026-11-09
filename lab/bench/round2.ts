import fs from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline";
import { randomUUID, createHash } from "node:crypto";
import { memoryComposition } from "./lib/memory.ts";
import { fingerprintSweep } from "./lib/w0-fingerprint.ts";
import { recoverSweep } from "./lib/sweep-recovery.ts";
import { runMemoryRounds } from "./lib/w0-rounds.ts";
import { V_W0, sha256 } from "./lib/w0-world.ts";
import { subjectList } from "./lib/sweep.ts";
const argv = process.argv.slice(2),
  opt = (k: string, d: string) => {
    const i = argv.indexOf("--" + k);
    return i < 0 ? d : argv[i + 1]!;
  };
const seedReceipt = path.resolve(opt("seed-receipt", "runs/P5/a0-1k-final/receipt.json")),
  output = path.resolve(opt("output", `runs/P5/r2-${randomUUID()}/receipt.json`));
if (!output.startsWith(path.resolve("runs") + path.sep) || fs.existsSync(output))
  throw new Error("fresh owned output required");
fs.mkdirSync(path.dirname(output), { recursive: true });
const prior = JSON.parse(fs.readFileSync(seedReceipt, "utf8")),
  scope = "p5-r2-" + randomUUID(),
  comp = memoryComposition("xtdb", scope);
const report: any = {
  format: "triplex-db-2/p5-round2/1",
  classification: "DIAGNOSTIC",
  acceptance: false,
  scope,
  seedReceipt,
  seedReceiptSha256: sha256(fs.readFileSync(seedReceipt)),
  N: prior.N,
  status: "RUNNING",
  sources: {},
};
for (const f of fs.readdirSync("lab/bench/lib").filter((f) => f.endsWith(".ts")))
  report.sources[f] = sha256(fs.readFileSync("lab/bench/lib/" + f));
const save = () => fs.writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
save();
try {
  const log = path.join(path.dirname(seedReceipt), "seed.ndjson"),
    hash = createHash("sha256");
  const stream = fs.createReadStream(log);
  stream.on("data", (d) => hash.update(d));
  console.error("[P5 R2] restore recorded commands, then admit only by fresh G0");
  for await (const line of createInterface({ input: stream, crlfDelay: Infinity })) {
    const c = JSON.parse(line),
      r = await comp.transact(c.operations, { commandId: c.commandId, actor: "p5-restore" });
    if (
      !r.ok ||
      r.value.position !== c.receipt.position ||
      r.value.triples.some((t, i) => t.id !== c.receipt.triples[i].id)
    )
      throw new Error("restore receipt mismatch");
  }
  if (hash.digest("hex") !== prior.seed.logSha256) throw new Error("source command log changed");
  const basis = { position: prior.seed.basis.tx, validAt: V_W0 },
    expected = { ...prior.seed.fingerprint, N: prior.N };
  const admission = {
    endpoint: `memory://${scope}`,
    scope,
    basis,
    expected,
    counts: prior.seed.counts,
  };
  report.g0 = await fingerprintSweep(admission);
  save();
  console.error("[P5 R2] ten actual controller process stops");
  report.g4 = await recoverSweep({
    comp,
    scope,
    subjects: subjectList(prior.N),
    basis,
    sweepId: scope + ":g4",
    cursor: path.join(path.dirname(output), "recovery-cursor.json"),
    seed: "p5-r2-stop-1",
    stops: 10,
  });
  save();
  if (!argv.includes("--g4-only")) {
    // Traffic arms must start from the seed, not from the recovery reference's published outbox.
    const trafficScope = scope + ":traffic",
      traffic = memoryComposition("xtdb", trafficScope);
    const lines = createInterface({ input: fs.createReadStream(log), crlfDelay: Infinity });
    for await (const line of lines) {
      const c = JSON.parse(line),
        r = await traffic.transact(c.operations, { commandId: c.commandId, actor: "p5-restore" });
      if (!r.ok || r.value.position !== c.receipt.position)
        throw new Error("traffic restore mismatch");
    }
    console.error("[P5 R2] live traffic and matched baseline rounds");
    report.traffic = await runMemoryRounds({
      scope: trafficScope,
      N: prior.N,
      dir: path.join(path.dirname(output), "traffic"),
      expected,
      counts: prior.seed.counts,
      basis,
      seed: "p5-r2-traffic-1",
      rounds: Number(opt("rounds", "12")),
      ...(argv.includes("--duration-s") ? { durationS: Number(opt("duration-s", "100")) } : {}),
      workers: 2,
      burst: argv.includes("--all-burst"),
    });
  }
  for (const [file, digest] of Object.entries(report.sources))
    if (sha256(fs.readFileSync("lab/bench/lib/" + file)) !== digest)
      throw new Error("source changed during attempt: " + file);
  report.status = "OFFLINE-CHECKS-COMPLETE";
} catch (e: any) {
  report.status = "FAIL";
  report.error = String(e.stack ?? e);
  process.exitCode = 1;
  console.error(report.error);
} finally {
  report.finishedAt = new Date().toISOString();
  save();
  await comp.close();
}
