import { packOracle, verifiedRawManifest } from "./pack-oracle.mjs";
import { buildWriterStats, writerStatsMarkdown } from "./writer-stats.mjs";
import { buildNativeCounters, nativeCountersMarkdown } from "./native-counters.mjs";
import { postgresEvents, wallBridge } from "./postgres-events.mjs";
// Command-line run manifests are validated by the report reader.
import fs from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { createGzip } from "node:zlib";
import { createHash } from "node:crypto";
import { buildReport, filesUnder } from "./report.mjs";
import { registerRun } from "../bin/trace-store.mjs";
// [DX-T1-13] Why: an omitted copy destination must not turn a renderer flag into a directory in the caller's worktree.
// Rejected: reading argv[3] as a path even when it is --render-only.
const arguments_ = process.argv.slice(2),
  knownFlags = new Set(["--render-only", "--no-register"]);
if (arguments_.some((a) => a.startsWith("--") && !knownFlags.has(a)))
  throw Error("Unknown finalize flag");
const positional = arguments_.filter((a) => !knownFlags.has(a));
if (!positional.length || positional.length > 2)
  throw Error("Usage: finalize RUN [COPY] [--render-only] [--no-register]");
const run = path.resolve(positional[0]);
const raw = path.join(run, "trace/raw");
fs.mkdirSync(raw, { recursive: true });
const renderOnly = process.argv.includes("--render-only");
const skipRegister = process.argv.includes("--no-register");
if (skipRegister && !renderOnly) throw Error("Only a derived fixture may skip run registration");
if (!renderOnly) {
  // [DX-T1] Why: finalize after all owned processes have stopped and their files have been copied.
  // Rejected: reading a growing gzip stream or stamping an abandoned partial attempt as complete.
  for (const file of filesUnder(path.join(run, "driver/trace/raw"))) {
    const dest = path.join(raw, path.basename(file));
    if (fs.existsSync(dest)) throw Error("Duplicate raw trace filename");
    fs.renameSync(file, dest);
  }
  for (const role of ["gw-w", "gw-r", "tx", "pg"]) {
    const file = path.join(run, `${role}.log`);
    if (fs.existsSync(file))
      fs.copyFileSync(file, path.join(raw, `${role}.log`), fs.constants.COPYFILE_EXCL);
  }
  const manifestPath = path.join(run, "trace-run.json");
  const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, "utf8")) : null;
  const sealPath = path.join(raw, "tx.jfr-complete.jsonl");
  const sqlLog = path.join(raw, "pg.log");
  const seal = fs.existsSync(sealPath) ? JSON.parse(fs.readFileSync(sealPath, "utf8")) : null;
  const pgBinding = manifest && { run: manifest.tag, slot: manifest.slot, source: manifest.source };
  const boundSeal = seal && pgBinding && ["run", "slot", "source"].every((key) => seal[key] === pgBinding[key]) && seal.role === "tx";
  if (manifest?.level === "summary" && manifest.requirePostgres && fs.existsSync(sqlLog))
    await postgresEvents(sqlLog, path.join(raw, "postgres-events.jsonl"), boundSeal ? seal : null, pgBinding);
  const bridge = wallBridge(boundSeal ? seal : null);
  for (const [input, expected, output] of [
    ["postgres-samples.log", "postgres-sample", "postgres.jsonl"],
    ["postgres-waits.log", "postgres-wait", "postgres-waits.jsonl"],
  ]) {
    if (!manifest || !fs.existsSync(path.join(raw, input))) continue;
    const lines = fs.readFileSync(path.join(raw, input), "utf8").split("\n");
    const samples = [];
    for (const line of lines)
      if (line.trim().startsWith("{")) {
        const row = JSON.parse(line);
        if (row.type !== expected || !Number.isFinite(row.at) || row.at < manifest.startedAt - 1000)
          throw Error("Stale/invalid Postgres sample");
        const clock = bridge(row.at);
        samples.push({
          ...row,
          ...(clock ? { wallAt: row.at, at: clock.at, clock: clock.clock } : {}),
          type: "resource",
          process: "postgres",
          thread: 0,
          run: manifest.tag,
          source: manifest.source,
          slot: manifest.slot,
        });
      }
    fs.writeFileSync(
      path.join(raw, output),
      samples.map((r) => JSON.stringify(r)).join("\n") + "\n",
      { flag: "wx" },
    );
  }
  for (const file of filesUnder(raw))
    if (!file.endsWith(".gz")) {
      await pipeline(
        fs.createReadStream(file),
        createGzip({ level: 1 }),
        fs.createWriteStream(file + ".gz", { flags: "wx" }),
      );
      fs.unlinkSync(file);
    }
  const hashes = [];
  for (const file of filesUnder(raw)) {
    const h = createHash("sha256");
    for await (const chunk of fs.createReadStream(file)) h.update(chunk);
    hashes.push(`${h.digest("hex")}  ${path.relative(raw, file)}`);
  }
  fs.writeFileSync(path.join(run, "trace/SHA256SUMS"), hashes.join("\n") + "\n");
} else {
  // [DX-T1] Why: a recovered derived view keeps original trace bytes and source identity untouched.
  // Rejected: rerunning observations or replacing an old report without retaining its exact original bytes.
  const old = path.join(run, "trace-summary.json");
  if (fs.existsSync(old)) {
    const prior = JSON.parse(fs.readFileSync(old, "utf8"));
    // [DX-T1-7] Why: helper changes can alter appended statistics while the base report renderer stays unchanged.
    // Rejected: keying recovery only by the base renderer and losing an intermediate cited writer table.
    const oldContent = createHash("sha256");
    for (const name of [
      "TRACE-REPORT.md",
      "WRITER-STATS.json",
      "NATIVE-COUNTERS.json",
      "trace-summary.json",
    ])
      if (fs.existsSync(path.join(run, name)))
        oldContent.update(name).update(fs.readFileSync(path.join(run, name)));
    const revision = path.join(
      run,
      "derived-original",
      (prior.reporterSha256 ?? "legacy") + "-" + oldContent.digest("hex"),
    );
    fs.mkdirSync(revision, { recursive: true });
    for (const name of [
      "TRACE-REPORT.md",
      "COMMIT-ANATOMY.md",
      "commit-anatomy.json",
      "trace.html",
      "trace.chrome.json",
      "trace-summary.json",
      "WRITER-STATS.json",
      "NATIVE-COUNTERS.json",
      "SHA256SUMS",
      "INDEX.md",
    ])
      if (fs.existsSync(path.join(run, name)) && !fs.existsSync(path.join(revision, name)))
        fs.copyFileSync(
          path.join(run, name),
          path.join(revision, name),
          fs.constants.COPYFILE_EXCL,
        );
  }
}
const copy = positional[1];
const result = await buildReport(run, { copyTo: copy });
if (!("disabled" in result && result.disabled)) {
  const counters = await buildNativeCounters(run);
  for (const destination of [run, ...(copy ? [copy] : [])]) {
    fs.writeFileSync(
      path.join(destination, "NATIVE-COUNTERS.json"),
      JSON.stringify(counters, null, 2) + "\n",
      { flag: renderOnly ? "w" : "wx" },
    );
    fs.appendFileSync(path.join(destination, "TRACE-REPORT.md"), nativeCountersMarkdown(counters));
  }
}
// [DX-T1-7] Why: every completed traced run must expose writer heap/GC/stall counts without another analysis command.
// Rejected: a standalone diagnostic that leaves routine run reports unable to show the retained-heap cause.
const benchmarkFile = path.join(run, "driver/ns-report.json");
if (
  result.complete &&
  fs.existsSync(benchmarkFile) &&
  JSON.parse(fs.readFileSync(benchmarkFile, "utf8")).status === "DONE"
) {
  const writer = await buildWriterStats(run);
  for (const destination of [run, ...(copy ? [copy] : [])]) {
    fs.writeFileSync(
      path.join(destination, "WRITER-STATS.json"),
      JSON.stringify(writer, null, 2) + "\n",
      { flag: renderOnly ? "w" : "wx" },
    );
    fs.appendFileSync(path.join(destination, "TRACE-REPORT.md"), writerStatsMarkdown(writer));
  }
}
const archive =
  !renderOnly && result.tag.startsWith("tx2-dxt1-") ? await packOracle(run) : { files: 0 };
const reportFiles = [
  "TRACE-REPORT.md",
  "trace.html",
  "trace.chrome.json",
  "trace-summary.json",
  ...(fs.existsSync(path.join(run, "NATIVE-COUNTERS.json")) ? ["NATIVE-COUNTERS.json"] : []),
  ...(fs.existsSync(path.join(run, "WRITER-STATS.json")) ? ["WRITER-STATS.json"] : []),
  ...(fs.existsSync(path.join(run, "COMMIT-ANATOMY.md"))
    ? ["COMMIT-ANATOMY.md", "commit-anatomy.json"]
    : []),
];
// [DX-BM1] Why: the Chrome export may exceed both the V8 string limit and the maximum contiguous Buffer size.
// Rejected: allocating an entire exported timeline merely to seal its bytes.
const hashes = [];
for (const name of reportFiles) {
  const digest = createHash("sha256");
  for await (const chunk of fs.createReadStream(path.join(run, name))) digest.update(chunk);
  hashes.push(digest.digest("hex") + "  " + name);
}
const reportHashes = hashes.join("\n") + "\n" + (await verifiedRawManifest(run));
const indexText = `# ${result.tag}\n\nSource: ${result.source}. Trace collection complete: ${result.complete}. Derived render recovery: ${renderOnly}.\n\n${result.finding}\n\nCanonical files: ~/Claude/Projects/triplex-db-2/evidence/DX-T1/${result.tag}/.\nCompressed raw traces: ${result.rawBytes} bytes, under trace/raw; hashes in trace/SHA256SUMS.\nLarge viewers remain in the durable store and the local worktree copy; only this index, report and SHA256SUMS are committed.\n`;
for (const destination of [run, ...(copy ? [copy] : [])]) {
  fs.writeFileSync(path.join(destination, "SHA256SUMS"), reportHashes);
  fs.writeFileSync(path.join(destination, "INDEX.md"), indexText);
}
if (!skipRegister) registerRun(run);
console.log(
  JSON.stringify({
    tag: result.tag,
    commits: result.commits,
    coverage: result.coverage,
    rawBytes: result.rawBytes,
    complete: result.complete,
    errors: result.errors,
  }),
);
if (!result.complete && !("disabled" in result && result.disabled)) process.exitCode = 1;

if (!renderOnly && result.tag.startsWith("tx2-dxt1-")) {
  if (archive.files && copy) {
    // [DX-T1-2] Why: a completed archive copy must name its fresh verified journal. Rejected: treating a missing receipt as success.
    const journal = archive.journal;
    if (!journal) throw Error("Completed oracle archive has no journal");
    fs.copyFileSync(
      path.join(run, journal),
      path.join(copy, journal),
      fs.constants.COPYFILE_FICLONE,
    );
    for (const destination of [run, copy])
      fs.appendFileSync(
        path.join(destination, "INDEX.md"),
        "Auxiliary oracle and split-observation inputs are losslessly compressed; ORACLE-ARCHIVE.jsonl records original/decoded SHA256 and archive paths. Use gzip -dk to restore an original path.\n",
      );
  }
}
