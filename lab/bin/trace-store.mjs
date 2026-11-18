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
const hash = (f) => createHash("sha256").update(fs.readFileSync(f)).digest("hex");
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

// [DX-BM1] Why: W0 activation retains an independent check and raw phase traces under its own schema.
// Rejected: manufacturing a North Star trace summary or dropping the activation from the shared index.
export function registerActivation(dir) {
  dir = path.resolve(dir);
  const tag = path.basename(dir);
  const transfer = path.join(dir, "transfer", "collection-tag.txt");
  if (!/^tx2-dxt1-bm1-[a-z0-9]+-activation$/.test(tag) || fs.readFileSync(transfer, "utf8").trim() !== tag)
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
  const result = fs.existsSync(checkFile) ? JSON.parse(fs.readFileSync(checkFile, "utf8")) : null;
  if (result &&
      (!attempt || result.run !== tag || result.slot !== tag || result.source !== source ||
       result.nonce !== attempt.nonce || result.attemptSha256 !== hash(attemptFile) ||
       result.logSha256 !== hash(path.join(dir, "activation.log"))))
    throw Error("Foreign activation check or changed source evidence");
  return registerRow({
    date: new Date().toISOString(),
    tag,
    source,
    subjects: attempt?.subjects ?? null,
    result: result
      ? "Independent activation comparisons recorded. Performance unjudged."
      : "Activation controller output retained. Terminal independent check unavailable.",
    html: result ? checkFile : path.join(dir, "transfer", "reports.tar.zst"),
    raw: path.join(dir, "state", "trace", "raw"),
  });
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
    result: "Terminal raw evidence and logs retained. Trace summary unavailable.",
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
  } else throw Error("trace-store.mjs list | archive TAG --to DIR | register RUN_DIR | register-activation RUN_DIR | register-incomplete-benchmark RUN_DIR");
}
