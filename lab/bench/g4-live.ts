/** [EXP-P5-R2] Why: publication recovery must use an actual activation receipt and reconcile records. Rejected: publishing preview records as a live G4 qualification. */
import fs from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline";
import { createGunzip } from "node:zlib";
import { randomUUID, createHash } from "node:crypto";
import { memoryComposition } from "./lib/memory.ts";
import { fingerprintSweep } from "./lib/w0-fingerprint.ts";
import { recoverSweep } from "./lib/sweep-recovery.ts";
import { subjectList } from "./lib/sweep.ts";
import { W0, V_W0, sha256 } from "./lib/w0-world.ts";
const [input, output] = process.argv.slice(2);
if (
  !input ||
  !output ||
  !path.resolve(output).startsWith(path.resolve("runs") + path.sep) ||
  fs.existsSync(output)
)
  throw new Error("fresh owned output required");
fs.mkdirSync(path.dirname(output), { recursive: true });
const prior = JSON.parse(fs.readFileSync(input, "utf8")),
  scope = "p5-live-g4-" + randomUUID(),
  comp = memoryComposition("xtdb", scope);
const sources = Object.fromEntries(
  fs
    .readdirSync("lab/bench/lib")
    .filter((f) => f.endsWith(".ts"))
    .map((f) => [f, sha256(fs.readFileSync("lab/bench/lib/" + f))]),
);
const report: any = {
  classification: "DIAGNOSTIC",
  acceptance: false,
  status: "RUNNING",
  N: prior.N,
  scope,
  sources,
  entrySha256: sha256(fs.readFileSync(new URL(import.meta.url))),
  seedReceiptSha256: sha256(fs.readFileSync(input)),
};
report.kernelBuild = Object.fromEntries(
  fs
    .readdirSync("packages/w0/dist")
    .filter((f) => f.endsWith(".js"))
    .map((f) => [f, sha256(fs.readFileSync("packages/w0/dist/" + f))]),
);
const save = () => fs.writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
save();
try {
  const log = path.join(path.dirname(input), "seed.ndjson"),
    stream = fs.existsSync(log)
      ? fs.createReadStream(log)
      : fs.createReadStream(log + ".gz").pipe(createGunzip()),
    hash = createHash("sha256");
  stream.on("data", (d) => hash.update(d));
  for await (const line of createInterface({ input: stream, crlfDelay: Infinity })) {
    const c = JSON.parse(line),
      r = await comp.transact(c.operations, { commandId: c.commandId, actor: "p5-restore" });
    if (!r.ok || r.value.position !== c.receipt.position) throw new Error("restore mismatch");
  }
  if (hash.digest("hex") !== prior.seed.logSha256) throw new Error("seed bytes differ");
  const basis0 = { position: prior.seed.basis.tx, validAt: V_W0 };
  report.g0 = await fingerprintSweep({
    endpoint: `memory://${scope}`,
    scope,
    basis: basis0,
    expected: { ...prior.seed.fingerprint, N: prior.N },
    counts: prior.seed.counts,
  });
  const activation = await comp.transact(
    [
      {
        op: "assert",
        entityId: "p5:tenant",
        attribute: "p5/activation",
        value: { type: "string", value: W0.R2.hash },
        validFrom: V_W0,
      },
    ],
    { commandId: scope + ":activation" },
  );
  if (!activation.ok || activation.value.position !== basis0.position + 1)
    throw new Error("activation receipt mismatch");
  report.activation = activation.value;
  const basis = { position: activation.value.position, validAt: V_W0 };
  report.g4 = await recoverSweep({
    comp,
    scope,
    subjects: subjectList(prior.N),
    basis,
    activations: [{ tx: basis.position, from: W0.POPULATION_VALID_TIME, release: W0.R2.hash }],
    sweepId: scope,
    cursor: path.join(path.dirname(output), "cursor.json"),
    seed: "p5-live-recovery-1",
  });
  for (const [file, h] of Object.entries(sources))
    if (sha256(fs.readFileSync("lab/bench/lib/" + file)) !== h) throw new Error("source changed");
  if (report.entrySha256 !== sha256(fs.readFileSync(new URL(import.meta.url))))
    throw new Error("entry changed");
  for (const [f, h] of Object.entries(report.kernelBuild))
    if (sha256(fs.readFileSync("packages/w0/dist/" + f)) !== h)
      throw new Error("kernel build changed");
  report.status = "G4-LIVE-RECONCILE-PASS";
} catch (e: any) {
  report.status = "FAIL";
  report.error = String(e.stack ?? e);
  process.exitCode = 1;
} finally {
  save();
  await comp.close();
}
