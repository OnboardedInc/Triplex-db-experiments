// @ts-nocheck -- [EXP-CHECKJS-R2] unannotated dynamic parameters; recursive helper inference; recursive callback inference. Binding errors remain checked by lab/bin/checkjs.mjs.
// [EXP-RQ01] Why: receipts bind this process to its actual shared heavy admission and source bytes.
// Rejected: descriptive holder labels alone (can survive a copied/stale receipt).
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
export const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
export const hashFiles = (files) =>
  Object.fromEntries([...new Set(files)].sort().map((file) => [file, sha(fs.readFileSync(file))]));
export const sourceFiles = () =>
  execFileSync(
    "git",
    [
      "ls-files",
      "--cached",
      "--others",
      "--exclude-standard",
      "--",
      "packages/core/src",
      "packages/testkit/src",
      "packages/testkit/test",
      "packages/xtdb/src",
      "packages/qlever/src",
    ],
    { encoding: "utf8" },
  )
    .trim()
    .split("\n")
    .filter(Boolean);
export const heavyAdmission = () => {
  const locks = "/Users/sam/projects/triplex-db-2/lab/locks/heavy";
  for (const slot of fs.readdirSync(locks)) {
    const file = path.join(locks, slot, "owner.json");
    try {
      const owner = JSON.parse(fs.readFileSync(file, "utf8"));
      if (owner.pid === process.ppid) return { kind: "offline-heavy/no-engine", slot, file, owner };
    } catch {
      /* A different holder may release its slot while this directory is inspected. */
    }
  }
  throw new Error("Receipt controller requires its actual heavy.mjs parent admission");
};
export const sameAdmission = (admission) =>
  JSON.stringify(JSON.parse(fs.readFileSync(admission.file, "utf8"))) ===
  JSON.stringify(admission.owner);
export const distFiles = (dir = "packages/testkit/dist") =>
  fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) =>
      entry.isDirectory() ? distFiles(path.join(dir, entry.name)) : [path.join(dir, entry.name)],
    );
export const readFreshJson = (file, started) => {
  if (fs.statSync(file).mtimeMs < started) throw new Error(`Stale output: ${file}`);
  return JSON.parse(fs.readFileSync(file, "utf8"));
};
