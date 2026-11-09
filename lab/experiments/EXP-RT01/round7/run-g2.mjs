import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { spawnSync, execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
const root = path.resolve(import.meta.dirname, "../../../.."),
  out =
    "/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-RT01/live4/" +
    (process.env.RT01_DIAGNOSTIC === "1" ? "diagnostic1" : "g2-attempt1");
assert.ok(!fs.existsSync(out));
fs.mkdirSync(out, { recursive: true });
const hash = (p) => createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const names = [
  ...new Set(
    execFileSync(
      "git",
      [
        "ls-files",
        "-co",
        "--exclude-standard",
        "packages/core",
        "packages/testkit",
        "packages/xtdb",
        "pnpm-lock.yaml",
      ],
      { cwd: root, encoding: "utf8" },
    )
      .trim()
      .split("\n"),
  ),
];
names.push(path.relative(root, import.meta.filename), "lab/experiments/EXP-RT01/round7/g2.ts");
const snapshot = () => Object.fromEntries(names.sort().map((p) => [p, hash(path.join(root, p))]));
const before = snapshot(),
  phases = [];
for (const pkg of ["core", "testkit", "xtdb"]) {
  for (const [command, args] of [
    ["tsdown", []],
    ["tsc", ["--declaration", "--emitDeclarationOnly", "--rootDir", "src", "--outDir", "dist"]],
  ]) {
    const start = new Date().toISOString();
    const r = spawnSync(path.join(root, "node_modules/.bin", command), args, {
      cwd: path.join(root, "packages", pkg),
      encoding: "utf8",
      timeout: 300000,
      maxBuffer: 16 * 1024 ** 2,
    });
    const file = `${pkg}-${command}.txt`;
    fs.writeFileSync(path.join(out, file), (r.stdout ?? "") + (r.stderr ?? ""));
    phases.push({
      pkg,
      command,
      args,
      start,
      end: new Date().toISOString(),
      exit: r.status,
      file,
      sha256: hash(path.join(out, file)),
    });
    console.log(JSON.stringify(phases.at(-1)));
    if (r.status !== 0) break;
  }
  if (phases.at(-1).exit !== 0) break;
}
const build = {};
for (const pkg of ["core", "testkit", "xtdb"])
  for (const p of fs.readdirSync(path.join(root, "packages", pkg, "dist"), { recursive: true }))
    if (fs.statSync(path.join(root, "packages", pkg, "dist", p)).isFile())
      build[`packages/${pkg}/dist/${p}`] = hash(path.join(root, "packages", pkg, "dist", p));
let live = null;
if (phases.every((p) => p.exit === 0)) {
  const stdout = fs.openSync(path.join(out, "live.stdout"), "w"),
    stderr = fs.openSync(path.join(out, "live.stderr"), "w");
  const started = new Date().toISOString();
  const r = spawnSync(
    path.join(root, "node_modules/.bin/tsx"),
    [path.join(import.meta.dirname, "g2.ts")],
    {
      cwd: root,
      env: {
        ...process.env,
        XTDB_URL: "postgres://xtdb:xtdb@127.0.0.1:5471/xtdb",
        TRIPLEX_LAB_SLOT_OWNER: "/Users/sam/projects/triplex-db-2/lab/locks/xtdb-s1/owner.json",
        RT01_LIVE_OUT: out,
      },
      stdio: ["ignore", stdout, stderr],
      timeout: 5400000,
    },
  );
  fs.closeSync(stdout);
  fs.closeSync(stderr);
  live = {
    started,
    ended: new Date().toISOString(),
    exit: r.status,
    signal: r.signal,
    error: r.error?.message ?? null,
    stdoutSha256: hash(path.join(out, "live.stdout")),
    stderrSha256: hash(path.join(out, "live.stderr")),
  };
  console.log(JSON.stringify(live));
}
const after = snapshot();
fs.writeFileSync(
  path.join(out, "execution.json"),
  JSON.stringify(
    {
      head: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
      context: "xtdb-s1/CX-RT01",
      before,
      after,
      sourceUnchanged: JSON.stringify(before) === JSON.stringify(after),
      build,
      phases,
      live,
    },
    null,
    2,
  ) + "\n",
);
process.exitCode =
  phases.every((p) => p.exit === 0) &&
  live?.exit === 0 &&
  JSON.stringify(before) === JSON.stringify(after)
    ? 0
    : 1;
