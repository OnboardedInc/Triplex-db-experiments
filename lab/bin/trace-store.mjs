#!/usr/bin/env node
// @ts-nocheck -- Evidence catalog records are validated at the filesystem boundary.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { filesUnder } from "../trace/report.mjs";
const base =
  process.env.TRIPLEX_TRACE_EVIDENCE ??
  path.join(os.homedir(), "Claude/Projects/triplex-db-2/evidence");
const registry = path.join(base, ".trace-index.json");
const index = path.join(base, "TRACE-INDEX.md");
function rows() {
  return fs.existsSync(registry) ? JSON.parse(fs.readFileSync(registry, "utf8")) : [];
}
const bytes = (dir) => filesUnder(dir).reduce((sum, f) => sum + fs.statSync(f).size, 0);
function hash(file) {
  const fd = fs.openSync(file, "r");
  const digest = createHash("sha256"), block = Buffer.allocUnsafe(1024 * 1024);
  try {
    for (let n; (n = fs.readSync(fd, block, 0, block.length, null)) > 0;)
      digest.update(block.subarray(0, n));
    return digest.digest("hex");
  } finally {
    fs.closeSync(fd);
  }
}
function save(all) {
  fs.mkdirSync(base, { recursive: true });
  fs.writeFileSync(registry + ".tmp", JSON.stringify(all, null, 2) + "\n");
  fs.renameSync(registry + ".tmp", registry);
  fs.writeFileSync(
    index + ".tmp",
    "# Trace index\n\n| date | tag | code | subjects | result | timeline | raw traces | bytes |\n| --- | --- | --- | ---: | --- | --- | --- | ---: |\n" +
      all
        .map(
          (r) =>
            `| ${r.date} | ${r.tag} | ${r.source} | ${r.subjects} | ${r.result.replaceAll("|", "/")} | [${path.basename(r.html)}](${r.html}) | ${r.raw} | ${bytes(r.raw)} |`,
        )
        .join("\n") +
      "\n",
  );
  fs.renameSync(index + ".tmp", index);
}
// [DX-T1] Why: index only an observed run and checksum the raw files before moving anything.
// Rejected: deletion on age or an archive claim before destination bytes have been verified.
export function registerRun(dir) {
  dir = path.resolve(dir);
  const s = JSON.parse(fs.readFileSync(path.join(dir, "trace-summary.json"), "utf8"));
  const reportPath = path.join(dir, "driver/ns-report.json");
  const b = fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, "utf8")) : {};
  return registerRow({
    date: new Date().toISOString(),
    tag: path.basename(dir),
    source: s.source,
    subjects: b.seed?.seededSubjects ?? null,
    result: s.finding,
    html: path.join(dir, "trace.html"),
    raw: path.join(dir, "trace/raw"),
  });
}

// [DX-BM1] Why: an independently rerendered timeline still belongs to its original slot and raw traces.
// Rejected: treating the output directory as a new run identity or replacing the original benchmark data.
function registerRecoveredTrace(dir, original) {
  dir = path.resolve(dir);
  original = path.resolve(original);
  const tag = path.basename(original);
  const manifest = JSON.parse(fs.readFileSync(path.join(original, "trace-run.json"), "utf8"));
  const summary = JSON.parse(fs.readFileSync(path.join(dir, "trace-summary.json"), "utf8"));
  const report = JSON.parse(fs.readFileSync(path.join(original, "driver/ns-report.json"), "utf8"));
  const html = path.join(dir, "trace.html");
  if (manifest.tag !== tag || manifest.slot !== tag || !/^[a-f0-9]{40}$/.test(manifest.source) ||
      manifest.source !== summary.source || summary.tag !== tag || summary.complete !== false ||
      report.status !== "RUNNING" || !fs.statSync(html).size)
    throw Error("Unbound recovered timeline");
  return registerRow({
    date: new Date().toISOString(),
    tag,
    source: manifest.source,
    subjects: report.seed?.seededSubjects ?? null,
    result: "Partial reader timeline recovered. Original benchmark remains incomplete.",
    html,
    raw: path.join(original, "trace/raw"),
  });
}

// [DX-BM1] Why: W0 activation retains an independent check and raw phase traces under its own schema.
// Rejected: manufacturing a North Star trace summary or dropping the activation from the shared index.
export function registerActivation(dir) {
  dir = path.resolve(dir);
  const tag = path.basename(dir);
  const transfer = path.join(dir, "transfer", "collection-tag.txt");
  if (!/^tx2-dxt1-bm1-[a-z0-9]+-(?:seed|smoke|activation(?:-[ab])?)$/.test(tag) ||
      fs.readFileSync(transfer, "utf8").trim() !== tag)
    throw Error("Unbound activation collection");
  const attemptFile = path.join(dir, "activation-attempt.json");
  const checkFile = path.join(dir, "ACTIVATION-CHECK.json");
  const headFile = path.join(dir, "head.txt");
  const attempt = fs.existsSync(attemptFile) ? JSON.parse(fs.readFileSync(attemptFile, "utf8")) : null;
  const source = fs.existsSync(headFile) ? fs.readFileSync(headFile, "utf8").trim() : null;
  if (attempt &&
      (attempt.run !== tag || attempt.slot !== tag || attempt.source !== source ||
       !/^[a-f0-9]{40}$/.test(source ?? "") || !/^[a-f0-9-]{36}$/.test(attempt.nonce ?? "")))
    throw Error("Foreign activation attempt");
  if (tag.endsWith("-seed")) {
    // [DX-BM1] Why: a pristine seed is a separate preparation item whose complete transfer must be indexed even if the next release fails.
    // Rejected: requiring an activation receipt for a stage that deliberately stopped before R1.
    if (!attempt || attempt.scope !== "dxt1-w0-100000-" + tag || attempt.subjects !== 100000)
      throw Error("Unbound pristine seed attempt");
    const file = path.join(dir, "pristine-seed.json");
    if (fs.existsSync(file)) {
      const seed = JSON.parse(fs.readFileSync(file, "utf8"));
      const last = (name) => JSON.parse(fs.readFileSync(path.join(dir, name), "utf8").trimEnd().split("\n").at(-1));
      const written = last("driver.log"), observed = last("seed-readback.log");
      if (seed.source !== source || seed.slot !== tag || seed.nonce !== attempt.nonce || seed.scope !== attempt.scope ||
          seed.subjects !== 100000 || seed.position !== 4338757 ||
          seed.worlds !== "sha256:fec1d7cedee2b2f18c77e78210e4e9ed14fffb72e9629545155c7307e969c760" ||
          written.event !== "chunk-seeded" || written.throughPosition !== seed.position || written.endSubjects !== seed.subjects ||
          observed.event !== "chunk-readback" || observed.scope !== seed.scope ||
          observed.N !== seed.subjects || observed.endSubjects !== seed.subjects || observed.counts?.position !== seed.position ||
          observed.fingerprint?.basisTx !== seed.position || observed.fingerprint?.worlds !== seed.worlds || observed.expected !== seed.worlds ||
          !/^[a-f0-9]{64}$/.test(seed.pgFilesSha256) ||
          ["activation-attempt.json", "source.SHA256SUMS", "driver.log", "seed-readback.log"]
            .some((name) => seed.inputs?.[name] !== hash(path.join(dir, name))))
        throw Error("Pristine seed evidence differs from its seal");
    }
    return registerRow({date: new Date().toISOString(), tag, source, subjects: attempt.subjects,
      result: fs.existsSync(file) ? "W0 seed preparation and readback archived." : "Partial W0 seed preparation archived.",
      html: fs.existsSync(file) ? file : path.join(dir, "transfer/reports.tar.zst"),
      raw: path.join(dir, "state/trace/raw")});
  }
  const result = fs.existsSync(checkFile) ? JSON.parse(fs.readFileSync(checkFile, "utf8")) : null;
  const logFile = path.join(dir, attempt?.sealedCut === undefined ? "activation.log" : "driver.log");
  if (result &&
      (!attempt || result.run !== tag || result.slot !== tag || result.source !== source ||
       result.nonce !== attempt.nonce || result.attemptSha256 !== hash(attemptFile) ||
       result.logSha256 !== hash(logFile)))
    throw Error("Foreign activation check or changed source evidence");
  // [DX-BM1] Why: ACT1 seals its complete guarded readback before the optional whole-history audit.
  // Rejected: indexing an unverified measurement or substituting the legacy guard-blind check.
  const guardedFile = path.join(dir, "act1-verified.json");
  const guarded = fs.existsSync(guardedFile) ? JSON.parse(fs.readFileSync(guardedFile, "utf8")) : null;
  if (guarded) {
    const sweepFile = path.join(dir, "act1-sweep.json"), sweep = JSON.parse(fs.readFileSync(sweepFile, "utf8"));
    const schedule = JSON.parse(fs.readFileSync(path.join(dir, "act1-schedules.json"), "utf8"));
    if (!attempt || guarded.slot !== tag || guarded.source !== source || guarded.scope !== attempt.scope ||
        sweep.source !== source || sweep.slot !== tag || sweep.nonce !== attempt.nonce ||
        schedule.slot !== tag || schedule.source !== source || schedule.nonce !== attempt.nonce ||
        schedule.tap !== hash(path.join(dir, "act1-schedules.tap")) ||
        guarded.build !== attempt.sourceManifestSha256 || guarded.build !== hash(path.join(dir, "source.SHA256SUMS")) ||
        sweep.build !== guarded.build || guarded.rawSha256 !== hash(sweepFile) ||
        sweep.checked !== 100000 || sweep.statesCompared !== 100000 || sweep.changed !== 100000 ||
        sweep.liveReaders !== 256 || sweep.act1?.arm !== guarded.arm ||
        !Array.isArray(guarded.trafficSha256) || guarded.trafficSha256.length !== 2 ||
        ["baseline", "sweep"].some((phase, i) => guarded.trafficSha256[i] !== hash(path.join(dir, "traffic", phase + "-traffic.ndjson"))))
      throw Error("Guarded activation readback or traffic bytes differ");
  }
  return registerRow({
    date: new Date().toISOString(),
    tag,
    source,
    subjects: attempt?.subjects ?? null,
    result: guarded ? ("Guarded 100k " + guarded.arm + " readback and live traffic verified. Diagnostic.") : result
      ? "Independent activation comparisons recorded. Performance unjudged."
      : "Activation controller output retained. Terminal independent check unavailable.",
    html: guarded ? guardedFile : result ? checkFile : path.join(dir, "transfer", "reports.tar.zst"),
    raw: path.join(dir, "state", "trace", "raw"),
  });
}

// [DX-BM1] Why: the group comparison has its own reproducible table and three distinct terminal slots.
// Rejected: cataloguing a controller exit or one arm's p99 as the whole comparison.
function registerSenderComparison(dir) {
  dir = path.resolve(dir);
  const batch = path.basename(dir), prefix = "tx2-dxt1-drv1-" + batch;
  const logs = path.join(dir, "controller", "logs");
  const source = fs.readFileSync(path.join(logs, "runner-source.txt"), "utf8").trim();
  const html = path.join(dir, "COMPARISON.md");
  if (!/^[a-z0-9]{1,12}$/.test(batch) || !/^[a-f0-9]{40}$/.test(source) ||
      hash(html) !== hash(path.join(dir, "pinned-replay", "COMPARISON.md")) ||
      !fs.readFileSync(path.join(dir, "controller", "QUEUE.SHA256SUMS"), "utf8").split("\n").includes(hash(html) + "  COMPARISON.md"))
    throw Error("Unbound sender comparison");
  for (const arm of ["a", "b", "c"]) {
    const tag = prefix + "-" + arm, run = path.join(path.dirname(dir), tag);
    if (fs.readFileSync(path.join(run, "head.txt"), "utf8").trim() !== source ||
        fs.readFileSync(path.join(run, "transfer", "collection-tag.txt"), "utf8").trim() !== tag ||
        fs.readFileSync(path.join(logs, tag + ".exit"), "utf8").trim() !== "0" ||
        hash(path.join(logs, tag + ".lateness.tsv")) !== hash(path.join(dir, "pinned-replay", "logs", tag + ".lateness.tsv")))
      throw Error("Missing or foreign sender comparison arm");
  }
  return registerRow({date: new Date().toISOString(), tag: prefix + "-comparison", source, subjects: 10000,
    result: "Three full zero-reader arms. The source-pinned replay reproduced the comparison and all three timing series.", html, raw: logs});
}

// [DX-BM1] Why: an OOM in the renderer can still leave an attributed, terminal evidence bundle.
// Rejected: using a missing viewer as a reason to omit the original failure from the index.
function registerIncompleteBenchmark(dir) {
  dir = path.resolve(dir);
  const tag = path.basename(dir);
  const source = fs.readFileSync(path.join(dir, "head.txt"), "utf8").trim();
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, "trace-run.json"), "utf8"));
  const transfer = fs.readFileSync(path.join(dir, "transfer", "collection-tag.txt"), "utf8").trim();
  if (!/^tx2-dxt1-bm1-[a-z0-9-]+$/.test(tag) || transfer !== tag || manifest.tag !== tag ||
      manifest.slot !== tag || manifest.source !== source || manifest.hostPlatform !== "linux-bare-metal")
    throw Error("Unbound terminal benchmark bundle");
  return registerRow({
    date: new Date().toISOString(),
    tag,
    source,
    subjects: null,
    result: "Timeline export incomplete. Terminal raw evidence and logs retained.",
    html: path.join(dir, "transfer", "reports.tar.zst"),
    raw: path.join(dir, "trace", "raw"),
  });
}

function registerRow(row) {
  const all = rows();
  const old = all.find((r) => r.tag === row.tag);
  if (old && old.html !== row.html && (old.raw !== row.raw || fs.existsSync(old.html)))
    throw Error("Duplicate trace tag at another path");
  save([...all.filter((r) => r.tag !== row.tag), row]);
  return row;
}
export function archive(tag, to) {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]+$/.test(tag)) throw Error("Invalid tag");
  const all = rows(),
    row = all.find((r) => r.tag === tag);
  if (!row) throw Error("Unknown trace tag");
  const lock = path.join(base, "../locks/measure");
  if (fs.existsSync(lock)) throw Error("Refusing archive during a measurement hold");
  const target = path.resolve(to, tag, "trace/raw");
  if (fs.existsSync(target)) throw Error("Archive target exists");
  if (target === row.raw || target.startsWith(row.raw + path.sep))
    throw Error("Archive cannot be inside its source");
  const files = filesUnder(row.raw);
  if (!files.length) throw Error("No raw files");
  const manifest = files.map((f) => ({
    name: path.relative(row.raw, f),
    bytes: fs.statSync(f).size,
    sha256: hash(f),
  }));
  fs.mkdirSync(target, { recursive: true });
  for (const f of manifest) {
    const dest = path.join(target, f.name);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(path.join(row.raw, f.name), dest, fs.constants.COPYFILE_EXCL);
    if (hash(dest) !== f.sha256) throw Error("Archive checksum mismatch");
  }
  fs.writeFileSync(
    path.join(target, "ARCHIVE-SHA256SUMS"),
    manifest.map((f) => `${f.sha256}  ${f.name}`).join("\n") + "\n",
  );
  const source = row.raw;
  row.raw = target;
  row.archivedFrom = source;
  save(all);
  // Only files just copied and verified can be removed; reports stay where they were.
  for (const f of manifest) fs.unlinkSync(path.join(source, f.name));
  fs.writeFileSync(
    path.join(source, "ARCHIVED.md"),
    `Raw traces moved to ${target}\nAll ${manifest.length} files verified by SHA256 before removal.\n`,
  );
  return { tag, files: manifest.length, bytes: manifest.reduce((s, f) => s + f.bytes, 0), target };
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [command, arg, ...rest] = process.argv.slice(2);
  if (command === "register") console.log(JSON.stringify(registerRun(arg)));
  else if (command === "register-sender-comparison") console.log(JSON.stringify(registerSenderComparison(arg)));
  else if (command === "register-recovered" && rest.length === 1)
    console.log(JSON.stringify(registerRecoveredTrace(arg, rest[0])));
  else if (command === "register-activation") console.log(JSON.stringify(registerActivation(arg)));
  else if (command === "register-incomplete-benchmark")
    console.log(JSON.stringify(registerIncompleteBenchmark(arg)));
  else if (command === "list")
    console.log(
      rows()
        .map((r) => `${r.tag}\t${bytes(r.raw)} bytes\t${r.raw}\t${r.html}`)
        .join("\n"),
    );
  else if (command === "archive") {
    const i = rest.indexOf("--to");
    if (i < 0 || !rest[i + 1]) throw Error("archive TAG --to DIR");
    console.log(JSON.stringify(archive(arg, rest[i + 1])));
  } else throw Error("trace-store.mjs list | archive TAG --to DIR | register RUN_DIR | register-recovered RENDER_DIR ORIGINAL_RUN_DIR | register-activation RUN_DIR | register-incomplete-benchmark RUN_DIR");
}
