import { packOracle } from "./pack-oracle.mjs";
// Command-line run manifests are validated by the report reader.
import fs from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { createGzip } from "node:zlib";
import { createHash } from "node:crypto";
import { buildReport, filesUnder } from "./report.mjs";
import { registerRun } from "../bin/trace-store.mjs";
const run = path.resolve(process.argv[2]);
const raw = path.join(run, "trace/raw");
fs.mkdirSync(raw, { recursive: true });
const renderOnly = process.argv.includes("--render-only");
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
  if (fs.existsSync(manifestPath) && fs.existsSync(path.join(raw, "postgres-samples.log"))) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    const lines = fs.readFileSync(path.join(raw, "postgres-samples.log"), "utf8").split("\n");
    const samples = [];
    for (const line of lines)
      if (line.trim().startsWith("{")) {
        const row = JSON.parse(line);
        if (
          row.type !== "postgres-sample" ||
          !Number.isFinite(row.at) ||
          row.at < manifest.startedAt - 1000
        )
          throw Error("Stale/invalid Postgres sample");
        samples.push({
          ...row,
          type: "resource",
          process: "postgres",
          thread: 0,
          run: manifest.tag,
          source: manifest.source,
          slot: manifest.slot,
        });
      }
    fs.writeFileSync(
      path.join(raw, "postgres.jsonl"),
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
    const revision = path.join(run, "derived-original", prior.reporterSha256 ?? "legacy");
    fs.mkdirSync(revision, { recursive: true });
    for (const name of [
      "TRACE-REPORT.md",
      "trace.html",
      "trace.chrome.json",
      "trace-summary.json",
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
const copy = process.argv[3];
const result = await buildReport(run, { copyTo: copy });
const reportFiles = [
  "TRACE-REPORT.md",
  "trace.html",
  "trace.chrome.json",
  "trace-summary.json",
  ...(fs.existsSync(path.join(run, "COMMIT-ANATOMY.md"))
    ? ["COMMIT-ANATOMY.md", "commit-anatomy.json"]
    : []),
];
const reportHashes =
  reportFiles
    .map(
      (name) =>
        `${createHash("sha256")
          .update(fs.readFileSync(path.join(run, name)))
          .digest("hex")}  ${name}`,
    )
    .join("\n") + "\n";
const indexText = `# ${result.tag}\n\nSource: ${result.source}. Trace collection complete: ${result.complete}. Derived render recovery: ${renderOnly}.\n\n${result.finding}\n\nCanonical files: ~/Claude/Projects/triplex-db-2/evidence/DX-T1/${result.tag}/.\nCompressed raw traces: ${result.rawBytes} bytes, under trace/raw; hashes in trace/SHA256SUMS.\nLarge viewers remain in the durable store and the local worktree copy; only this index, report and SHA256SUMS are committed.\n`;
for (const destination of [run, ...(copy ? [copy] : [])]) {
  fs.writeFileSync(path.join(destination, "SHA256SUMS"), reportHashes);
  fs.writeFileSync(path.join(destination, "INDEX.md"), indexText);
}
registerRun(run);
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
  const archive = await packOracle(run);
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
        "Auxiliary oracle inputs are losslessly compressed; ORACLE-ARCHIVE.jsonl records original/decoded SHA256 and archive paths. Use gzip -dk to restore an original path.\n",
      );
  }
}
