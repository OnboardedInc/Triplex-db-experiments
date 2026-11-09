// [EXP-HS01-R3] Why: a 10k store is 0.5 to 1.4 GB and the host has little headroom above the 5 GiB floor. After its manifest and digest exist,
// the store is compressed (zstd -3) next to the receipt with the SHA-256 of the original file recorded first, then the raw file is removed.
// Rejected: deleting stores (reviewers restore and hash-check them) and keeping them raw (would cross the disk floor with four seeds).
// usage: node archive-store.mjs <seed-dir>
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
const dir = path.join(process.argv[2], "store"),
  db = path.join(dir, "broker.db");
const sum = (cmd) => execFileSync("/bin/sh", ["-c", cmd], { encoding: "utf8" }).split(" ")[0];
const hash = sum(`shasum -a 256 "${db}"`);
fs.writeFileSync(path.join(dir, "ORIGINAL-SHA256SUMS.txt"), hash + "  broker.db\n", { flag: "wx" });
execFileSync("zstd", ["-T4", "-3", "-q", db, "-o", db + ".zst"]);
if (sum(`zstd -dc "${db}.zst" | shasum -a 256`) !== hash)
  throw Error("archive does not restore to the original hash");
for (const f of ["broker.db", "broker.db-wal", "broker.db-shm"])
  fs.rmSync(path.join(dir, f), { force: true });
console.log(JSON.stringify({ dir, originalSha256: hash }));
