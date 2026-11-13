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
// [DX-T1-2] Why: completed oracle inputs can be hundreds of MB; keep each byte in a verified durable gzip archive.
// Rejected: delete cited trace/raw data, trust compression exit alone, or replace an existing archive/receipt.
export async function packOracle(directory, { minBytes = 5_000_000 } = {}) {
  const dir = path.resolve(directory),
    tag = path.basename(dir),
    report = path.join(dir, "driver/ns-report.json");
  if (!/^tx2-dxt1-/.test(tag)) throw Error("Not an owned T1 attempt");
  if (!fs.existsSync(report) || JSON.parse(fs.readFileSync(report, "utf8")).status !== "DONE")
    return { files: 0, reason: "benchmark not complete" };
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
