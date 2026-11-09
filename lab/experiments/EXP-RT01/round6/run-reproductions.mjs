import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
const root = path.resolve(import.meta.dirname, "../../../..");
const attempt = process.argv[2] ?? "attempt1";
assert.match(attempt, /^attempt[0-9]+$/);
const output = `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-RT01/round6/reproductions/${attempt}`;
assert.ok(!fs.existsSync(path.join(output, "execution.json")), "retain completed attempts");
for (const dir of ["matrix", "pending", "pending-proof"])
  fs.mkdirSync(path.join(output, dir), { recursive: true });
const hash = (p) => createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const snapshot = () => {
  const names = execFileSync(
    "git",
    [
      "ls-files",
      "-co",
      "--exclude-standard",
      "packages",
      ".changeset",
      "pnpm-lock.yaml",
      "lab/experiments/EXP-RT01/round6",
    ],
    { cwd: root, encoding: "utf8" },
  )
    .trim()
    .split("\n")
    .filter((p) => p && !p.endsWith("/SHA256SUMS"));
  for (const pkg of ["core", "testkit", "xtdb", "qlever"])
    for (const file of fs.readdirSync(path.join(root, `packages/${pkg}/dist`), { recursive: true }))
      if (String(file).endsWith(".js")) names.push(`packages/${pkg}/dist/${file}`);
  return Object.fromEntries([...new Set(names)].sort().map((p) => [p, hash(path.join(root, p))]));
};
const before = snapshot(),
  phases = [];
let failure;
try {
  for (const name of ["journal-clock", "read-matrix", "pending-reads", "pending-proof"]) {
    const file = path.join(import.meta.dirname, `reproductions/${name}.ts`),
      started = new Date().toISOString();
    const result = spawnSync(
      path.join(root, "node_modules/.bin/tsx"),
      [file, ...(name === "journal-clock" ? [output + "/"] : [])],
      {
        cwd: root,
        env: { ...process.env, RT01_R3_OUT: output },
        encoding: "utf8",
        timeout: 240000,
        maxBuffer: 16 * 1024 ** 2,
      },
    );
    fs.writeFileSync(path.join(output, name + ".stdout"), result.stdout ?? "");
    fs.writeFileSync(path.join(output, name + ".stderr"), result.stderr ?? "");
    phases.push({
      name,
      started,
      ended: new Date().toISOString(),
      exit: result.status,
      signal: result.signal,
      runnerSha256: hash(file),
      stdoutSha256: hash(path.join(output, name + ".stdout")),
      stderrSha256: hash(path.join(output, name + ".stderr")),
    });
    assert.equal(result.status, 0, name);
  }
  const json = (p) => JSON.parse(fs.readFileSync(path.join(output, p), "utf8"));
  for (const encoding of ["a0", "compact"]) {
    const r = json(encoding + "-observed.json");
    assert.equal(r.before.transactions.length, 1);
    assert.equal(r.before.transactions[0].txId, r.receipt.txId);
    assert.equal(r.before.transactions[0].position, r.receipt.position);
    assert.ok(r.before.transactions[0].changes.length > 0);
    for (const name of ["after", "restored", "original"]) assert.deepEqual(r[name], r.before);
    assert.deepEqual(r.aheadBehind, r.ahead);
    assert.equal(r.ahead.transactions[0].txId, r.future.txId);
    assert.deepEqual(r.continuation.transactions, r.before.transactions);
    assert.deepEqual(r.behind.transaction, r.before.transactions[0]);
    assert.deepEqual(r.behind.command, r.before.transactions[0]);
    assert.deepEqual(r.behind.feed.transactions, r.before.transactions);
    const calls = json(encoding + "-sql.json");
    assert.ok(calls.some((c) => c.sql?.includes("recorded_position")));
    assert.ok(!calls.some((c) => /valid_from\s*<=/.test(c.sql ?? "")));
  }
  // [EXP-RT01] Why: the reviewer matrices record mismatches without exiting nonzero. Rejected: adopting execution completion instead of inspecting all observed outcomes.
  for (const [dir, count] of [
    ["matrix", 510],
    ["pending", 80],
  ]) {
    const rows = json(dir + "/observations.json");
    assert.equal(rows.length, count);
    assert.ok(
      rows.every((r) => r.matches),
      JSON.stringify(rows.filter((r) => !r.matches).slice(0, 8)),
    );
  }
  const proofs = json("pending-proof/summary.json");
  assert.equal(proofs.length, 4);
  for (const proof of proofs) {
    assert.deepEqual(proof.before, { error: { tag: "BasisNotAvailable", axis: "recordedAt" } });
    assert.ok(proof.elapsed >= 1900);
    assert.equal(proof.afterRows, 1);
    assert.equal(proof.receiptInstant, 1000.001);
  }
} catch (error) {
  failure = String(error);
}
const after = snapshot(),
  sourceUnchanged = JSON.stringify(before) === JSON.stringify(after);
if (!sourceUnchanged) failure = (failure ?? "") + " source drift";
fs.writeFileSync(
  path.join(output, "execution.json"),
  JSON.stringify(
    {
      attempt: randomUUID(),
      name: attempt,
      head: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
      context: "offline-no-engine",
      output,
      node: process.version,
      execPath: process.execPath,
      before,
      after,
      sourceUnchanged,
      phases,
      error: failure ?? null,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  JSON.stringify({
    output,
    sourceUnchanged,
    phases: phases.map((p) => ({ name: p.name, exit: p.exit })),
    error: failure ?? null,
  }),
);
process.exitCode = failure ? 1 : 0;
