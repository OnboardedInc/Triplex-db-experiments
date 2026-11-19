import assert from "node:assert/strict";
import fs from "node:fs";
import { randomUUID } from "node:crypto";
import { DeepActivation } from "../../../bench/lib/deep-activation.ts";
import { pageNamespace } from "../../../bench/lib/w0-page-outbox.ts";
import { inputs } from "./preflight.ts";
import path from "node:path";
import { openComposition } from "../../../bench/lib/composition.ts";
import { canonical, sha256, V_W0 } from "../../../bench/lib/w0-world.ts";
import { ids, SEED_VALID_FROM, subjectOf } from "../../../bench/lib/world.ts";
import { accountOfSubject, tenantRows } from "../scale1/tenants.ts";

const [matrixDir, seedDir, output] = process.argv.slice(2);
const bytes = (dir, file) => fs.readFileSync(path.join(dir, file));
const proof = JSON.parse(bytes(matrixDir, "complete.json"));
const { binding } = proof;
const seedBytes = bytes(seedDir, "seed.json"),
  seed = JSON.parse(seedBytes);
const ownerFile = process.env.TRIPLEX_LAB_SLOT_OWNER,
  owner = fs.readFileSync(ownerFile);
const native = JSON.parse(owner),
  verifier = sha256(fs.readFileSync(import.meta.filename));
assert.equal(sha256(seedBytes), binding.seed);
assert.equal(native.container, binding.slot);
assert.equal(native.holder, "DX-ACT2");
assert.equal(native.endpoint, process.env.DATOMIC_URL);
assert.equal(seed.scope, binding.scope);
assert.equal(proof.profiles.length, 30);
const positions = new Map(),
  inputHashes = {};
function from(file) {
  const b = bytes(matrixDir, file);
  inputHashes[file] = sha256(b);
  const record = JSON.parse(b);
  assert.deepEqual(record.binding, binding);
  return record;
}
function add(save) {
  const old = positions.get(save.save);
  if (old) assert.deepEqual(old, save);
  positions.set(save.save, save);
}
for (const release of ["R1", "R2"]) {
  const reference = from(release + "-oracle.json");
  add(reference.before);
  add(reference.firstMutation);
  for (const [r, variant, count] of proof.profiles.filter((row) => row[0] === release)) {
    const result = from(r + "-" + variant + "-w" + count + ".json");
    for (const witness of [result.evaluatorSave, result.pre, result.mid, result.post]) add(witness);
  }
}
assert.equal(positions.size, 104);
const comp = await openComposition("reach", "datomic", binding.scope);
const stamps = new Map();
try {
  // [DX-ACT2] Why: two gateway reads could omit the same field. Regenerate every expected field and replay the 104 acknowledged stamp replacements independently of either read. Rejected: trusting the preceding read as the complete expected world.
  for (const [position, witness] of [...positions].sort(([a], [b]) => a - b)) {
    const i = witness.person,
      a = accountOfSubject(seed.accounts, i);
    const stamp = (stamps.get(i) ?? 0) + 1;
    stamps.set(i, stamp);
    const expected = tenantRows(a, i - a.first)
      .filter((f) => subjectOf(f.e) === i)
      .map((f) => {
        if (f.e === ids.placement(i) && f.a === ":placement/stamp")
          return canonical([f.e, f.a, { type: "integer", value: String(stamp) }, 0, null]);
        return canonical([f.e, f.a, f.v, SEED_VALID_FROM, null]);
      })
      .sort();
    const basis = { position, validAt: V_W0 },
      read = await comp.sweepPage([ids.placement(i)], basis);
    assert.deepEqual(read.reportedBasis, basis);
    const values = read.rows
      .map((x) => canonical([x.entityId, x.attribute, x.value, x.validFrom, x.validTo ?? null]))
      .sort();
    assert.deepEqual(values, expected);
    const identities = read.rows
      .map((x) =>
        canonical([
          x.id,
          x.entityId,
          x.attribute,
          x.value,
          x.position,
          x.validFrom,
          x.validTo ?? null,
        ]),
      )
      .sort();
    assert.equal(sha256(canonical(identities)), witness.readHash);
  }
  assert.equal(inputs(), binding.sourceInputs);
  const raw = output + ".release",
    run = "act2-direct-" + randomUUID(),
    target = seed.accounts[1];
  fs.mkdirSync(raw);
  process.env.TX2_W0_OUTBOX_NAMESPACE = pageNamespace(run);
  const store = await openComposition("reach", "datomic", binding.scope);
  const activation = new DeepActivation(raw, target.people, run, target.first, 2, target.key);
  const observed = [];
  const note = (r, ops) => {
    assert(r.txId && ops.length);
    observed.push(r.position);
  };
  let r1, r2;
  try {
    r1 = await activation.execute(store, "R1", note);
    r2 = await activation.execute(store, "R2", note, async (cut) => {
      const root = ids.placement(target.first),
        at = { position: cut.position, validAt: cut.validAt };
      const old = await comp.sweepPage([root], at);
      assert.deepEqual(old.reportedBasis, at);
      const stamp = old.rows.filter(
        (r) => r.entityId === root && r.attribute === ":placement/stamp",
      );
      assert.equal(stamp.length, 1);
      const amount = String(Number(stamp[0].value.value) + 1);
      const saved = await comp.transact(
        [
          { op: "retract", id: stamp[0].id },
          {
            op: "assert",
            entityId: root,
            attribute: ":placement/stamp",
            value: { type: "integer", value: amount },
            validFrom: 0,
          },
        ],
        {
          commandId: run + ":during",
          actor: "act2-live",
          preconditions: [{ _tag: "TripleLive", id: stamp[0].id }],
        },
      );
      assert(saved.ok && saved.value.position > cut.position);
      assert.deepEqual(
        saved.value.triples.map((t) => [t.entityId, t.attribute, t.value]),
        [[root, ":placement/stamp", { type: "integer", value: amount }]],
      );
      return [{ subject: target.first, position: saved.value.position }];
    });
  } finally {
    await store.close();
  }
  const verified = await activation.verify(comp, r1, r2);
  assert.deepEqual(
    [r1.evaluators, r2.evaluators, verified.checked, verified.guardComparisons],
    [2, 2, target.people, 2 * target.people],
  );
  assert.equal(observed.at(-1), r2.publicationPosition);
  fs.writeFileSync(
    path.join(raw, "direct.json"),
    canonical({ binding, run, r1, r2, verified }) + "\n",
    { flag: "wx" },
  );
  assert.equal(stamps.size, 2);
  assert(fs.readFileSync(ownerFile).equals(owner));
  assert.equal(sha256(fs.readFileSync(import.meta.filename)), verifier);
  fs.writeFileSync(
    output,
    JSON.stringify({
      binding,
      verifier,
      owner: sha256(owner),
      inputs: inputHashes,
      completeSha256: sha256(bytes(matrixDir, "complete.json")),
      direct: sha256(bytes(raw, "direct.json")),
      checked: positions.size,
      stamps: [...stamps],
    }) + "\n",
    { flag: "wx" },
  );
} finally {
  await comp.close();
}
