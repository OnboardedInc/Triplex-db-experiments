// @ts-nocheck -- Source-bound auxiliary oracle archives; decoded bytes are verified before removal.
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { createGzip, createGunzip } from "node:zlib";
import { pipeline } from "node:stream/promises";
const digest = async (stream) => {
  const h = createHash("sha256");
  let bytes = 0;
  for await (const c of stream) {
    h.update(c);
    bytes += c.length;
  }
  return { sha256: h.digest("hex"), bytes };
};
const sync = (file) => {
  const fd = fs.openSync(file, "r");
  try {
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
};
// [DX-T1-8] Why: the small committed manifest must seal the retained raw bytes as well as rendered reports.
// Rejected: a report-only checksum list that makes reviewers locate an unanchored private raw manifest.
export async function verifiedRawManifest(directory) {
  const raw = path.join(directory, "trace/raw"),
    manifest = path.join(directory, "trace/SHA256SUMS");
  const text = fs.readFileSync(manifest, "utf8"),
    seen = new Set(),
    rows = [];
  for (const line of text.split("\n").filter(Boolean)) {
    const match = /^([a-f0-9]{64})  (.+)$/.exec(line);
    if (!match) throw Error("Invalid raw checksum record");
    const [, expected, name] = match;
    if (
      path.isAbsolute(name) ||
      name.includes("\\") ||
      name.split("/").some((p) => !p || p === "." || p === "..") ||
      seen.has(name)
    )
      throw Error("Invalid raw checksum path");
    const file = path.join(raw, name);
    if (
      !fs.lstatSync(file).isFile() ||
      fs.lstatSync(file).isSymbolicLink() ||
      !fs.realpathSync(file).startsWith(fs.realpathSync(raw) + path.sep) ||
      (await digest(fs.createReadStream(file))).sha256 !== expected
    )
      throw Error("Raw checksum bytes mismatch");
    seen.add(name);
    rows.push(`${expected}  trace/raw/${name}`);
  }
  const walk = (dir, prefix = "") =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      if (e.isSymbolicLink() || (!e.isDirectory() && !e.isFile()))
        throw Error("Invalid raw checksum entry");
      const name = prefix + e.name;
      return e.isDirectory() ? walk(path.join(dir, e.name), name + "/") : [name];
    });
  const actualFiles = walk(raw);
  if (actualFiles.length !== seen.size || actualFiles.some((name) => !seen.has(name)))
    throw Error("Incomplete raw checksum manifest");
  const journal = path.join(directory, "ORACLE-ARCHIVE.jsonl");
  if (fs.existsSync(journal)) {
    const manifest = JSON.parse(fs.readFileSync(path.join(directory, "trace-run.json"), "utf8"));
    const records = fs.readFileSync(journal, "utf8").trim().split("\n").map(JSON.parse);
    const files = records.filter((r) => r.type === "file"),
      end = records.at(-1);
    if (
      manifest.slot !== manifest.tag ||
      !/^[a-f0-9]{40}$/.test(manifest.source ?? "") ||
      fs.readFileSync(path.join(directory, "head.txt"), "utf8").trim() !== manifest.source ||
      records[0]?.type !== "oracle-archive" ||
      end?.type !== "complete" ||
      end.files !== files.length ||
      records.some((r) => r.tag !== manifest.tag || r.source !== manifest.source)
    )
      throw Error("Oracle checksum binding mismatch");
    if (
      ![manifest.startedAt, records[0].startedAt, end.at].every(Number.isFinite) ||
      records[0].startedAt < manifest.startedAt ||
      end.at < records[0].startedAt ||
      end.at > Date.now() + 1000
    )
      throw Error("Oracle checksum clock mismatch");
    const archives = new Set();
    for (const r of files) {
      if (
        r.archive !== r.original + ".gz" ||
        path.isAbsolute(r.archive) ||
        r.archive.includes("\\") ||
        r.archive.split("/").some((p) => !p || p === "." || p === "..") ||
        r.originalSha256 !== r.decodedSha256 ||
        !Number.isFinite(r.at) ||
        r.at < records[0].startedAt ||
        r.at > end.at ||
        archives.has(r.archive)
      )
        throw Error("Oracle checksum record mismatch");
      archives.add(r.archive);
      const file = path.join(directory, r.archive);
      if (
        !fs.lstatSync(file).isFile() ||
        !fs.realpathSync(file).startsWith(fs.realpathSync(directory) + path.sep)
      )
        throw Error("Oracle checksum path mismatch");
      const packed = await digest(fs.createReadStream(file)),
        decoded = await digest(fs.createReadStream(file).pipe(createGunzip()));
      if (
        packed.sha256 !== r.archiveSha256 ||
        packed.bytes !== r.archiveBytes ||
        decoded.sha256 !== r.originalSha256 ||
        decoded.bytes !== r.originalBytes
      )
        throw Error("Oracle checksum bytes mismatch");
      rows.push(`${packed.sha256}  ${r.archive}`);
    }
  }
  for (const name of [
    "trace/SHA256SUMS",
    "trace-run.json",
    "head.txt",
    "source-build-hashes.json",
    "driver/ns-report.json",
    "driver/ns-writes.jsonl",
    "input/ns-writes.jsonl",
    "input/ns-report.json",
    "containers.json",
    "driver-container.json",
    "config/sql.properties",
    "ORACLE-ARCHIVE.jsonl",
    "night-host-gate.json",
  ]) {
    const file = path.join(directory, name);
    if (fs.existsSync(file)) {
      if (!fs.lstatSync(file).isFile() || fs.lstatSync(file).isSymbolicLink())
        throw Error("Invalid evidence metadata path");
      rows.push(`${(await digest(fs.createReadStream(file))).sha256}  ${name}`);
    }
  }
  return rows.join("\n") + "\n";
}
// [DX-T1-2] Why: completed oracle inputs can be hundreds of MB; keep each byte in a verified durable gzip archive.
// Rejected: delete cited trace/raw data, trust compression exit alone, or replace an existing archive/receipt.
export async function packOracle(directory, { minBytes = 5_000_000 } = {}) {
  const dir = path.resolve(directory),
    tag = path.basename(dir),
    report = path.join(dir, "driver/ns-report.json");
  if (!tag.startsWith("tx2-dxt1-")) throw Error("Not an owned T1 attempt");
  const benchmark = fs.existsSync(report) ? JSON.parse(fs.readFileSync(report, "utf8")) : null;
  if (benchmark?.status !== "DONE") return { files: 0, reason: "benchmark not complete" };
  const source = fs.readFileSync(path.join(dir, "head.txt"), "utf8").trim(),
    manifest = JSON.parse(fs.readFileSync(path.join(dir, "trace-run.json"), "utf8"));
  if (
    !/^[0-9a-f]{40}$/.test(source) ||
    manifest.tag !== tag ||
    manifest.source !== source ||
    manifest.slot !== tag
  )
    throw Error("Oracle archive source/run binding mismatch");
  const bridge = path.join(dir, "oracle-bridge"),
    candidates = [
      "driver/oracle-case.json",
      "driver/oracle-expected.json",
      // [DX-T1-7] Why: exact split observations are verified before finalization and otherwise accumulate ~80 MB per loaded arm.
      // Rejected: sampling/dropping splits or selecting unrelated files with a broad directory glob.
      ...(/^[a-zA-Z0-9-]+$/.test(benchmark.runTag ?? "")
        ? [
            `driver/observations-${benchmark.runTag}-split-steps.jsonl`,
            `driver/observations-${benchmark.runTag}-split-complete.jsonl`,
          ]
        : []),
      ...(fs.existsSync(bridge)
        ? fs
            .readdirSync(bridge)
            .filter((f) => /\.(case|output)$/.test(f))
            .map((f) => "oracle-bridge/" + f)
        : []),
    ];
  const files = candidates.filter(
    (f) =>
      fs.existsSync(path.join(dir, f)) &&
      fs.lstatSync(path.join(dir, f)).isFile() &&
      !fs.lstatSync(path.join(dir, f)).isSymbolicLink() &&
      fs.statSync(path.join(dir, f)).size >= minBytes,
  );
  if (!files.length) return { files: 0 };
  const journal = path.join(dir, "ORACLE-ARCHIVE.jsonl"),
    fd = fs.openSync(journal, "wx");
  let count = 0;
  const append = (row) => {
    fs.writeSync(fd, JSON.stringify(row) + "\n");
    fs.fsyncSync(fd);
  };
  try {
    append({
      type: "oracle-archive",
      tag,
      source,
      startedAt: Date.now(),
      policy: "decoded-byte equality; trace/raw unchanged",
    });
    sync(dir);
    for (const relative of files) {
      const original = path.join(dir, relative),
        archive = original + ".gz",
        before = await digest(fs.createReadStream(original));
      await pipeline(
        fs.createReadStream(original),
        createGzip({ level: 1 }),
        fs.createWriteStream(archive, { flags: "wx" }),
      );
      const decoded = await digest(fs.createReadStream(archive).pipe(createGunzip()));
      if (decoded.bytes !== before.bytes || decoded.sha256 !== before.sha256)
        throw Error("Oracle archive content mismatch");
      sync(archive);
      sync(path.dirname(archive));
      const packed = await digest(fs.createReadStream(archive));
      append({
        type: "file",
        tag,
        source,
        at: Date.now(),
        original: relative,
        archive: relative + ".gz",
        originalBytes: before.bytes,
        originalSha256: before.sha256,
        archiveBytes: packed.bytes,
        archiveSha256: packed.sha256,
        decodedSha256: decoded.sha256,
      });
      fs.unlinkSync(original);
      sync(path.dirname(original));
      count++;
    }
    append({ type: "complete", tag, source, at: Date.now(), files: count });
  } finally {
    fs.closeSync(fd);
  }
  return { files: count, journal: "ORACLE-ARCHIVE.jsonl" };
}
