#!/usr/bin/env node
// @ts-nocheck -- Evidence catalog records are validated at the filesystem boundary.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createHash, randomUUID } from "node:crypto";
import { gunzipSync } from "node:zlib";
import { pathToFileURL } from "node:url";
import { filesUnder } from "../trace/report.mjs";
import { atomicJson, withDirLock } from "./lib.mjs";
const base =
  process.env.TRIPLEX_TRACE_EVIDENCE ??
  path.join(os.homedir(), "Claude/Projects/triplex-db-2/evidence");
const registry = path.join(base, ".trace-index.json");
const index = path.join(base, "TRACE-INDEX.md");
const catalogLock = path.join(base, ".trace-index.lock");
function rows() {
  return fs.existsSync(registry) ? JSON.parse(fs.readFileSync(registry, "utf8")) : [];
}
const bytes = (location) => fs.statSync(location, { throwIfNoEntry: false })?.isFile()
  ? fs.statSync(location).size
  : filesUnder(location).reduce((sum, f) => sum + fs.statSync(f).size, 0);
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
  atomicJson(registry, all);
  const temporary = `${index}.${randomUUID()}.tmp`;
  fs.writeFileSync(
    temporary,
    "# Trace index\n\n| date | tag | code | subjects | result | timeline | raw traces | bytes |\n| --- | --- | --- | ---: | --- | --- | --- | ---: |\n" +
      all
        .map(
          (r) =>
            `| ${r.date} | ${r.tag} | ${r.source} | ${r.subjects} | ${r.result.replaceAll("|", "/")} | [${path.basename(r.html)}](${r.html}) | ${r.raw} | ${bytes(r.raw)} |`,
        )
        .join("\n") +
      "\n",
  );
  fs.renameSync(temporary, index);
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
  if (manifest.hostPlatform === "linux-bare-metal" && fs.existsSync(path.join(original, "BM1-RENDER-INTERRUPTION.json"))) {
    // [DX-BM1] Why: the native controller retained the renderer stop while its recovered viewer describes the same completed driver.
    // Rejected: replacing the original failure row or accepting a viewer from a different set of recorded bytes.
    const stopped = JSON.parse(fs.readFileSync(path.join(original, "BM1-RENDER-INTERRUPTION.json"), "utf8"));
    const seal = new Map(fs.readFileSync(path.join(dir, "SHA256SUMS"), "utf8").trim().split("\n")
      .map((line) => [line.slice(66), line.slice(0, 64)]));
    if (manifest.tag !== tag || manifest.slot !== tag || !/^[a-f0-9]{40}$/.test(manifest.source) ||
        stopped.source !== manifest.source || stopped.slot !== tag || stopped.driverStatus !== "DONE" ||
        stopped.reportSha256 !== hash(path.join(original, "driver/ns-report.json")) ||
        stopped.rawManifestSha256 !== hash(path.join(original, "trace/SHA256SUMS")) ||
        report.status !== "DONE" || summary.source !== manifest.source || summary.tag !== tag)
      throw Error("Foreign interrupted native renderer");
    for (const file of ["trace-run.json", "head.txt", "source-build-hashes.json", "driver/ns-report.json",
      "driver/ns-writes.jsonl", "input/ns-report.json", "input/ns-writes.jsonl", "trace/SHA256SUMS"]) {
      if (hash(path.join(dir, file)) !== seal.get(file) || hash(path.join(original, file)) !== seal.get(file))
        throw Error("Recovered native input differs: " + file);
    }
    for (const file of ["trace-summary.json", "trace.html", "TRACE-REPORT.md", "COMMIT-ANATOMY.md", "commit-anatomy.json"])
      if (hash(path.join(dir, file)) !== seal.get(file)) throw Error("Recovered native export differs: " + file);
    return registerRow({date: new Date().toISOString(), tag: tag + "-viewer", source: manifest.source,
      subjects: report.seed.seededSubjects, result: summary.complete ? "Offline trace viewer reconstructed from the sealed native arm." :
        "Offline trace viewer reconstructed. Trace coverage is incomplete.", html, raw: path.join(original, "trace/raw")});
  }
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
  // [DX-BM1] Why: collectors may verify archives in parallel but publish from the same durable catalog.
  // Rejected: unique temp files alone (a concurrent stale read could still lose an entry).
  return withDirLock(catalogLock, () => {
    const all = rows();
    const old = all.find((r) => r.tag === row.tag);
    if (old && old.html !== row.html && (old.raw !== row.raw || fs.existsSync(old.html)))
      throw Error("Duplicate trace tag at another path");
    save([...all.filter((r) => r.tag !== row.tag), row]);
    return row;
  }, { quiet: true });
}

// [DX-BM1] Why: the catalog follows the original named attempt and the actual transferred bytes.
// Rejected: indexing a service log as a measurement or accepting a summary from a different attempt.
export function registerNightBundle(dir) {
  dir = path.resolve(dir);
  const read = (f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
  const transfer = read("TRANSFER.json"), request = read("control/request.json"), terminal = read("control/terminal.json");
  const collected = read("collected.json"), index = read("summary-members.json");
  const tag = `dx-bm1-n19-${transfer.slot}`;
  if (transfer.schema !== "bm1-night-transfer/1" || !/^dx-bm1-n19-[a-z0-9-]+$/.test(tag) ||
      !/^[a-f0-9]{40}$/.test(transfer.source) || path.basename(dir) !== `i${transfer.item}-${transfer.attempt}` ||
      transfer.source !== request.source || transfer.source !== terminal.source ||
      transfer.slot !== request.tag || transfer.slot !== terminal.tag || transfer.item !== request.item ||
      transfer.attempt !== request.attempt || !terminal.clean || terminal.ended !== transfer.ended ||
      !(request.start <= Date.parse(terminal.ended) / 1000 + 1 &&
        Date.parse(terminal.ended) / 1000 <= transfer.sealedAt + 1 && transfer.sealedAt <= collected.at + 1) ||
      collected.transfer !== hash(path.join(dir, "TRANSFER.json")) ||
      !["recorded", "deep-recorded-thin-cut", "observed", "partial", "incomplete", "preflight-refused", "uncollected"].includes(terminal.state) ||
      ("measurementState" in transfer && transfer.measurementState !== terminal.state) ||
      transfer.requestSha256 !== hash(path.join(dir, "control/request.json")) ||
      transfer.terminalSha256 !== hash(path.join(dir, "control/terminal.json")) ||
      transfer.summaryMembersSha256 !== hash(path.join(dir, "summary-members.json")))
    throw Error("Unbound overnight transfer");
  for (const [name, file] of Object.entries(index)) {
    const actual = path.resolve(dir, name);
    if (!actual.startsWith(dir + path.sep) || !fs.lstatSync(actual).isFile() ||
        !fs.realpathSync(actual).startsWith(fs.realpathSync(dir) + path.sep) ||
        fs.statSync(actual).size !== file.bytes || hash(actual) !== file.sha256)
      throw Error("Changed overnight summary member: " + name);
  }
  for (const [kind, file] of Object.entries({summary:transfer.summary, raw:transfer.raw})) {
    if (!file && kind === "raw") continue;
    const actual = path.join(dir, kind + ".tar.zst");
    if (file.name !== path.basename(actual) || fs.statSync(actual).size !== file.bytes || hash(actual) !== file.sha256)
      throw Error("Changed overnight archive: " + kind);
  }
  const raw = path.join(dir, "raw.tar.zst");
  return registerRow({date:terminal.ended, tag, source:transfer.source,
    subjects:null, result:`Overnight attempt ${transfer.attempt}. ${terminal.state}. ${transfer.rawDisposition}.`,
    html:path.join(dir, "summary.tar.zst"), raw, bundle:true});
}

// [DX-BM1] Why: the first DELTA 1k reading precedes the later transfer schema but its raw observations still have a verifiable identity.
// Rejected: replacing the refused 100k admission with the subsequent attempt's outcome.
export function registerNightPreflight(dir) {
  dir = path.resolve(dir);
  const read = (f) => fs.readFileSync(path.join(dir, f));
  const sums = new Map(read("TRANSFER.sha256").toString().trim().split("\n").map((line) => [line.slice(66),line.slice(0,64)]));
  const [slot, source, nonce] = read("ownership").toString().trim().split(/\s+/);
  const request = JSON.parse(read("preflight/request.json")), result = JSON.parse(read("preflight/result.json"));
  const verified = JSON.parse(read("preflight/proof.json")), state = JSON.parse(read("preflight/STATUS.json"));
  const [outcome, ended] = read("terminal").toString().trim().split(/\s+/);
  const [exit, launchSource, launchEnd] = read("launch.exit").toString().trim().split(/\s+/);
  const binds = (r) => r.source === source && r.nonce === nonce && r.slot === slot;
  const packed = read("preflight/samples.ndjson.gz");
  const values = packed.length <= 256 * 1024 ? gunzipSync(packed, { maxOutputLength: 8 * 1024 ** 2 }) : null;
  if (slot !== "tx2-dxscale1-bm1n19delta" || !/^[a-f0-9]{40}$/.test(source) || !/^[a-f0-9-]{36}$/.test(nonce) ||
      ![request, result.binding, verified.binding, verified.windows.binding, state.binding].every(binds) ||
      result.subjects !== 1000 || verified.people !== 1000 || verified.windows.subjects !== 1000 || state.stage !== "verified" ||
      result.offers.length !== 2 || !values || createHash("sha256").update(values).digest("hex") !== result.samplesSha256 ||
      values.toString().trim().split("\n").length !== result.sampleCount || read("remaining.txt").length ||
      outcome !== "large-scope-preflight-refused" || exit !== "1" || launchSource !== source || launchEnd !== ended ||
      !(Date.parse(ended) >= Date.parse(read("cleanup.txt").toString().trim().split(/\s+/)[1])) ||
      !["summary.tar.zst", "raw.tar.zst"].every((name) => hash(path.join(dir, name)) === sums.get(name)))
    throw Error("Unbound DELTA preflight evidence");
  return registerRow({date:ended, tag:slot, source, subjects:1000, bundle:true,
    result:"The 1,000-subject DELTA preflight verified. The original launcher declined the requested 100,000-subject workload.",
    html:path.join(dir, "summary.tar.zst"), raw:path.join(dir, "raw.tar.zst")});
}

// [DX-BM1] Why: bind the indexed sealed seed to the verified source and cut from copied artifacts.
// Rejected: indexing a bare dump or treating the verified seed as a performance verdict.
export function registerScaleSeed(dir) {
  dir = path.resolve(dir);
  const read = (name) => JSON.parse(fs.readFileSync(path.join(dir, name), "utf8"));
  const transfer = read("transfer.json"), checkpoint = read("checkpoint.json");
  const request = read("summaries/request.json"), seed = read("summaries/seed.json");
  const image = read("summaries/image.json"), terminal = read("summaries/terminal.json");
  const tag = transfer.tag;
  const arc = path.join(dir, "summaries.tar.zst");
  if (!/^[a-f0-9]{40}$/.test(request.source) || !/^[a-f0-9-]{36}$/.test(request.nonce) ||
      tag !== "arm-d7-bm1-single-n20" || tag !== request.tag || tag !== terminal.tag ||
      ![transfer, checkpoint, seed, terminal].every((r) => r.source === request.source && r.nonce === request.nonce) ||
      terminal.service !== "success" || transfer.result !== "success" || !terminal.cleanup ||
      seed.people !== 100_000 || seed.facts !== 16_245_647 || checkpoint.seed.facts !== seed.facts ||
      checkpoint.seed.population !== seed.population || seed.slot !== checkpoint.slot || seed.slot !== terminal.slot ||
      checkpoint.lastPosition !== seed.scopes[0].seedCut || checkpoint.dumpSha256 !== image.sha256 ||
      checkpoint.sourceImageSha256 !== hash(path.join(dir, "summaries/image.json")) ||
      !(seed.started <= seed.completed && seed.completed <= Date.parse(terminal.endedAt)) ||
      transfer.summary.name !== "summaries.tar.zst" || transfer.summary.bytes !== fs.statSync(arc).size ||
      transfer.summary.sha256 !== hash(arc)) throw Error("Unbound SCALE1 seed archive");
  for (const [name, expected] of Object.entries(transfer.summaryFiles)) {
    if (!/^[a-zA-Z0-9_-]+\.json$/.test(name) || hash(path.join(dir, "summaries", name)) !== expected)
      throw Error("Changed SCALE1 summary member: " + name);
  }
  const raw = path.join(dir, "raw.tar.zst");
  if (fs.existsSync(raw) && (transfer.raw?.name !== "raw.tar.zst" || hash(raw) !== transfer.raw.sha256))
    throw Error("Changed SCALE1 raw archive");
  return registerRow({date:terminal.endedAt, tag, source:request.source, subjects:seed.people,
    result:`Sealed single-account SCALE1 seed with ${seed.facts.toLocaleString("en-US")} verified facts.`,
    html:arc, raw, bundle:true});
}

// [DX-BM1] Why: record the exact thin fixture collection and its cleanup even when the seed fails.
// Rejected: indexing the snapshot as a P7 measurement or substituting a successful 1k gate for 1M.
export function registerThinFixture(dir) {
  dir = path.resolve(dir);
  const read = (name) => JSON.parse(fs.readFileSync(path.join(dir, name), "utf8"));
  const transfer = read("transfer.json"), request = read("request.json"), cleanup = read("cleanup.json");
  const tag = request.slot;
  if (transfer.schema !== "bm1-thin-fixture/1" || !/^[a-f0-9]{40}$/.test(request.source) ||
      !/^[a-f0-9]{12}$/.test(request.nonce) || tag !== "tx2-dxbm1-thin-" + request.nonce ||
      transfer.source !== request.source || cleanup.source !== request.source ||
      cleanup.slot !== tag || cleanup.nonce !== request.nonce ||
      !Array.isArray(cleanup.remaining) || cleanup.remaining.length !== 0 ||
      !["request.json", "cleanup.json", "worker.log"].every((name) => Object.hasOwn(transfer.files, name)))
    throw Error("Unbound thin fixture");
  for (const [name, info] of Object.entries(transfer.files)) {
    const file = path.resolve(dir, name);
    if (!file.startsWith(dir + path.sep) || !fs.lstatSync(file).isFile() ||
        !fs.realpathSync(file).startsWith(fs.realpathSync(dir) + path.sep) ||
        fs.statSync(file).size !== info.bytes || hash(file) !== info.sha256 ||
        (name !== "prepare.log" && info.modified + 1 < request.start))
      throw Error("Changed thin fixture file: " + name);
  }
  const sealed = Object.hasOwn(transfer.files, "seal.json");
  if (sealed) {
    const seal = read("seal.json"), full = read("full/verified.json");
    if (seal.source !== request.source || seal.slot !== tag || seal.nonce !== request.nonce ||
        full.source !== request.source || full.slot !== tag || full.nonce !== request.nonce ||
        full.people !== 1_000_000 || full.facts !== 8_000_000 || full.feed.facts !== full.facts ||
        seal.requestSha256 !== transfer.files["request.json"].sha256 ||
        seal.fullSha256 !== transfer.files["full/verified.json"].sha256 ||
        seal.smallSha256 !== transfer.files["small/verified.json"].sha256 ||
        full.resultSha256 !== transfer.files["full/seed.json"].sha256 ||
        seal.snapshot.sha256 !== transfer.snapshot?.sha256 || seal.snapshot.bytes !== transfer.snapshot?.bytes)
      throw Error("Unbound thin fixture seal");
    if (seal.recoverySha256) {
      const restore = read("recovery/result.json"), released = read("recovery/cleanup.json");
      if (seal.recoverySha256 !== transfer.files["recovery/result.json"].sha256 ||
          !Object.hasOwn(transfer.files, "recovery/cleanup.json") ||
          restore.originalRequestSha256 !== seal.requestSha256 || restore.sha256 !== seal.snapshot.sha256 ||
          restore.source !== request.source || restore.slot !== tag + "-restore" ||
          restore.restoredTable !== "public.datomic_kvs" || restore.physicalRows <= 0 ||
          released.source !== restore.source || released.slot !== restore.slot ||
          released.originalRequestSha256 !== restore.originalRequestSha256 || released.remaining.length !== 0)
        throw Error("Unbound thin fixture restoration");
    }
  }
  const clean = transfer.files["recovery/cleanup.json"] || transfer.files["cleanup.json"];
  return registerRow({date:new Date(clean.modified * 1000).toISOString(),
    tag, source:request.source, subjects:sealed ? 1_000_000 : null,
    result:sealed ? "Sealed quiet INT1 seed with 8,000,000 verified facts." : "INT1 fixture incomplete. Native evidence retained.",
    html:path.join(dir, sealed ? "seal.json" : "worker.log"),
    raw:path.join(dir, "seed.pgdump"), bundle:true});
}

export async function archive(tag, to) {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]+$/.test(tag)) throw Error("Invalid tag");
  const row = rows().find((r) => r.tag === tag);
  if (!row) throw Error("Unknown trace tag");
  if (row.bundle) throw Error("This trace is already a sealed benchmark bundle");
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
  await withDirLock(catalogLock, () => {
    const all = rows();
    const current = all.find((r) => r.tag === tag);
    if (!current || current.raw !== source || current.source !== row.source)
      throw Error("Trace source changed during archive copy");
    current.raw = target;
    current.archivedFrom = source;
    save(all);
  }, { quiet: true });
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
  if (command === "register") console.log(JSON.stringify(await registerRun(arg)));
  else if (command === "register-sender-comparison") console.log(JSON.stringify(await registerSenderComparison(arg)));
  else if (command === "register-recovered" && rest.length === 1)
    console.log(JSON.stringify(await registerRecoveredTrace(arg, rest[0])));
  else if (command === "register-activation") console.log(JSON.stringify(await registerActivation(arg)));
  else if (command === "register-incomplete-benchmark")
    console.log(JSON.stringify(await registerIncompleteBenchmark(arg)));
  else if (command === "register-night-bundle")
    console.log(JSON.stringify(await registerNightBundle(arg)));
  else if (command === "register-scale-seed")
    console.log(JSON.stringify(await registerScaleSeed(arg)));
  else if (command === "register-thin-fixture")
    console.log(JSON.stringify(await registerThinFixture(arg)));
  else if (command === "register-night-preflight")
    console.log(JSON.stringify(await registerNightPreflight(arg)));
  else if (command === "list")
    console.log(
      rows()
        .map((r) => `${r.tag}\t${bytes(r.raw)} bytes\t${r.raw}\t${r.html}`)
        .join("\n"),
    );
  else if (command === "archive") {
    const i = rest.indexOf("--to");
    if (i < 0 || !rest[i + 1]) throw Error("archive TAG --to DIR");
    console.log(JSON.stringify(await archive(arg, rest[i + 1])));
  } else throw Error("trace-store.mjs list | archive TAG --to DIR | register RUN_DIR | register-recovered RENDER_DIR ORIGINAL_RUN_DIR | register-activation RUN_DIR | register-incomplete-benchmark RUN_DIR | register-night-bundle BUNDLE_DIR");
}
