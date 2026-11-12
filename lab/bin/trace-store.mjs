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
            `| ${r.date} | ${r.tag} | ${r.source} | ${r.subjects} | ${r.result.replaceAll("|", "/")} | [trace.html](${r.html}) | ${r.raw} | ${bytes(r.raw)} |`,
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
  const b = JSON.parse(fs.readFileSync(path.join(dir, "driver/ns-report.json"), "utf8"));
  const row = {
    date: new Date().toISOString(),
    tag: path.basename(dir),
    source: s.source,
    subjects: b.seed?.seededSubjects ?? null,
    result: s.finding,
    html: path.join(dir, "trace.html"),
    raw: path.join(dir, "trace/raw"),
  };
  const all = rows();
  const old = all.find((r) => r.tag === row.tag);
  if (old && old.html !== row.html) throw Error("Duplicate trace tag at another path");
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
  } else throw Error("trace-store.mjs list | archive TAG --to DIR | register RUN_DIR");
}
