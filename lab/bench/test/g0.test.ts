// [EXP-K01-R7] Why: test the sole granting function against changed, missing, foreign and late content. Rejected: restoring the retired process-evidence matrix.
import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createHash } from "node:crypto";
import { assertSeedInputsCurrent } from "../lib/bulk.ts";
import {
  admitG0,
  readG0,
  fields,
  requireW0Fingerprint,
  type Reader,
  type Expected,
  type Table,
} from "../lib/g0.ts";
const expected: Expected = {
  scope: "seed",
  position: 2,
  world: "N01",
  counts: { tx_assertions: 2, tx_claims: 2, tx_attempts: 2, tx_meta: 1 },
};
function fixture() {
  const tables = Object.fromEntries(
    Object.entries(fields).map(([table, cols]) => [
      table,
      Array.from({ length: expected.counts[table as Table] }, (_, i) =>
        Object.fromEntries(
          cols.map((c) => [
            c,
            c === "position" || c === "recorded_position"
              ? i + 1
              : c === "scope_key"
                ? "seed"
                : c === "entity_id"
                  ? "subject" + i
                  : null,
          ]),
        ),
      ),
    ]),
  );
  const reader: Reader = {
    endpoint: "measured-endpoint",
    async *scan(t) {
      yield* tables[t]!;
    },
    async count(t) {
      return expected.counts[t];
    },
    async scopes() {
      return [{ scope_key: "seed", position: 2 }];
    },
  };
  return { reader, tables };
}
test("same content in another physical order and IDs grants only on fresh read", async () => {
  const f = fixture(),
    pin = await readG0(f.reader, expected);
  f.tables.tx_assertions!.reverse();
  f.tables.tx_assertions![0]!.random_id = "ignored";
  const pass = await admitG0(f.reader, pin, expected);
  assert.equal(pass.status, "PASS");
  assert.equal(pass.endpoint, "measured-endpoint");
});
for (const variant of [
  "changed",
  "dropped",
  "missing-subject",
  "empty",
  "missing-field",
  "historical-position",
  "retracted-position",
  "value",
  "extra",
])
  test(`G0 refuses ${variant}`, async () => {
    const f = fixture(),
      pin = await readG0(f.reader, expected),
      rows = f.tables.tx_assertions!;
    if (variant === "changed") rows[0]!.attribute = "different";
    if (variant === "dropped" || variant === "missing-subject") rows.pop();
    if (variant === "empty") rows.length = 0;
    if (variant === "missing-field") delete rows[0]!.value_type;
    if (variant === "historical-position") rows[0]!.recorded_position = 123;
    if (variant === "retracted-position") rows[0]!.retracted_position = 123;
    if (variant === "value") rows[0]!.value_string = "other";
    if (variant === "extra") rows.push({ ...rows[0] });
    await assert.rejects(admitG0(f.reader, pin, expected));
  });
for (const variant of [
  "foreign",
  "wrong-position",
  "wrong-count",
  "partial-count",
  "wrong-scope",
  "wrong-pin",
  "missing-pin",
  "late",
  "failed",
])
  test(`G0 binding/acquisition refuses ${variant}`, async () => {
    const f = fixture(),
      pin = await readG0(f.reader, expected);
    let want = structuredClone(expected);
    if (variant === "foreign")
      f.reader.scopes = async () => [
        { scope_key: "seed", position: 2 },
        { scope_key: "other", position: 1 },
      ];
    if (variant === "wrong-position")
      f.reader.scopes = async () => [{ scope_key: "seed", position: 3 }];
    if (variant === "wrong-count") f.reader.count = async () => 0;
    if (variant === "partial-count") f.reader.count = async () => 1;
    if (variant === "wrong-scope") want.scope = "other";
    if (variant === "wrong-pin") pin.D = "a".repeat(64);
    if (variant === "missing-pin") pin.D = "";
    if (variant === "late") f.reader.count = async () => new Promise(() => {});
    if (variant === "failed")
      f.reader.count = async () => {
        throw Error("read failed");
      };
    await assert.rejects(admitG0(f.reader, pin, want, undefined, 25));
  });
test("G0 never grants from diagnostics or a cached external PASS", async () => {
  const f = fixture(),
    pin = await readG0(f.reader, expected);
  (pin as any).diagnostics = { status: "PASS", readiness: true };
  f.tables.tx_claims![0]!.command_id = "changed";
  await assert.rejects(admitG0(f.reader, pin, expected));
});
test("W0 requires the independent oracle and checks every digest", async () => {
  const fp = { basisTx: 2, facts: 2, worlds: "worlds", R2: "R2" },
    oracle = {
      rung: { N: 2 },
      seed: "W0-pop-1",
      sources: { oracle: "hash" },
      invalidWorlds: [],
      fingerprint: fp,
    };
  assert.doesNotThrow(() => requireW0Fingerprint(fp, oracle, 2));
  for (const k of ["basisTx", "facts", "worlds", "R2"])
    assert.throws(() => requireW0Fingerprint({ ...fp, [k]: "changed" }, oracle, 2));
  const f = fixture();
  await assert.rejects(readG0(f.reader, { ...expected, world: "W0" }), /O-DOMAIN/);
});
test("wiring: driver reads G0 on its writer endpoint before worker/warm-up creation", () => {
  const driver = fs.readFileSync(new URL("../driver.ts", import.meta.url), "utf8"),
    engine = fs.readFileSync(new URL("../../bin/engine.mjs", import.meta.url), "utf8");
  assert.ok(
    driver.indexOf("await checkXtdb(writer.backend.url") < driver.indexOf("const workerCfg"),
  );
  assert.ok(!driver.includes("TRIPLEX_LAB_SLOT_OWNER"));
  assert.ok(!engine.includes("volumeContent.readiness"));
  assert.equal((engine.match(/await checkXtdb\(info.endpoint,\s*m,\s*m.g0\)/g) || []).length, 2);
  assert.ok(engine.indexOf("const layout=await quietXtdb") < engine.lastIndexOf("qualifiedAt:"));
});

// [EXP-K01] Why: exercise changed bytes and added files, not just manifest self-consistency. Rejected: accepting any self-hashing old key (does not bind the current build).
test("seed identity: refuse changed generators and stale or expanded adapter builds", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "tx2-k01-identity-"));
  const sha = (s: string) => createHash("sha256").update(s).digest("hex");
  try {
    fs.writeFileSync(path.join(root, "generator.ts"), "generator");
    const dist: any = {};
    for (const pkg of ["core", "xtdb", "qualification"]) {
      const rel = `packages/${pkg}/dist/index.js`;
      fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
      fs.writeFileSync(path.join(root, rel), "build");
      dist[pkg] = { files: 1, sha256: sha(`${sha("build")}  ${rel}\n`) };
    }
    const m = {
      seedInputs: { generator: { "generator.ts": sha("generator") }, adapter: { dist } },
    };
    assert.doesNotThrow(() => assertSeedInputsCurrent(m, root));
    fs.writeFileSync(path.join(root, "generator.ts"), "changed");
    assert.throws(() => assertSeedInputsCurrent(m, root), /stale seed generator/);
    fs.writeFileSync(path.join(root, "generator.ts"), "generator");
    fs.writeFileSync(path.join(root, "packages/core/dist/index.js"), "changed");
    assert.throws(() => assertSeedInputsCurrent(m, root), /stale seed adapter build core/);
    fs.writeFileSync(path.join(root, "packages/core/dist/index.js"), "build");
    fs.writeFileSync(path.join(root, "packages/core/dist/extra.js"), "extra");
    assert.throws(() => assertSeedInputsCurrent(m, root), /stale seed adapter build core/);
    assert.throws(() => assertSeedInputsCurrent({}, root), /inputs are missing/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("W0 admission reads the measured fingerprint anew and refuses oracle drift", async () => {
  const f = fixture(),
    want = { ...expected, world: "W0" as const };
  const fp = { basisTx: 2, facts: 2, worlds: "worlds", R2: "R2" },
    oracle = {
      rung: { N: 2 },
      seed: "W0-pop-1",
      sources: { oracle: "hash" },
      invalidWorlds: [],
      fingerprint: { ...fp },
    };
  let reads = 0;
  const hook = {
    N: 2,
    oracle,
    read: async () => {
      reads++;
      return { ...fp };
    },
  };
  const pin = await readG0(f.reader, want, hook);
  await admitG0(f.reader, pin, want, hook);
  assert.equal(reads, 2);
  fp.worlds = "changed";
  await assert.rejects(admitG0(f.reader, pin, want, hook), /O-DOMAIN/);
});
test("wiring: the source pins D before any freeze and unprepared XTDB runs refuse", () => {
  const seed = fs.readFileSync(new URL("../xtdb-seed.ts", import.meta.url), "utf8");
  const driver = fs.readFileSync(new URL("../driver.ts", import.meta.url), "utf8");
  assert.ok(/await pinXtdb\(comp.backend.url,\s*manifest\)/.test(seed));
  assert.ok(!seed.includes("finish-block"));
  assert.ok(driver.includes("XTDB requires a pre-freeze seed manifest"));
});
