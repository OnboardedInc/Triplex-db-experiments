// @ts-nocheck -- command-line run manifests are validated by the report reader.
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
const copy = process.argv[3];
const result = await buildReport(run, { copyTo: copy });
if (fs.existsSync(path.join(run, "driver/ns-report.json"))) registerRun(run);
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
if (!result.complete) process.exitCode = 1;
