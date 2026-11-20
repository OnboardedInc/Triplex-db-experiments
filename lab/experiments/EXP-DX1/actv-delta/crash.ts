import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { openComposition } from "../../../bench/lib/composition.ts";
import { W0 } from "../../../bench/lib/w0-world.ts";
import { parseOutbox } from "../../../bench/lib/w0-outbox-state.ts";
import { Account } from "./account.ts";
import { Objects, hash } from "./store.ts";
import { emptyAudit, event, query } from "./bench-rung.ts";
import { projection } from "./rules.ts";
import { encodeBig, type Recipe } from "./model.ts";
import { width } from "./pages.ts";
import { stamp } from "./binding.ts";

type Case = {
  nonce: string;
  identity: string;
  code: string;
  scope: string;
  binding: string;
  account: string;
  keys: string;
  doc: W0.ReleaseDoc;
  seq: number;
  size: number;
};
const write = (p: string, v: unknown) =>
  fs.writeFileSync(p, JSON.stringify(v) + "\n", { flag: "wx" });
async function writer(r: Case) {
  const c = await openComposition("reach", "datomic", r.scope);
  const a = new Account(
    new Objects(
      {
        ...c,
        transact: async (ops, meta) => {
          const out = await c.transact(ops, meta);
          if (String(meta.commandId) === a.db.entity("cmd:event:crash-" + r.seq)) {
            assert(
              out.ok && out.value.triples.some((t) => t.entityId === a.db.entity("event:" + r.seq)),
            );
            const row = out.value.triples.find(
              (t) => t.entityId === a.db.entity("event:" + r.seq),
            )!;
            fs.writeSync(
              1,
              JSON.stringify({
                nonce: r.nonce,
                seq: r.seq,
                scope: r.scope,
                position: out.value.position,
                txId: out.value.txId,
                event: JSON.parse(row.value.value).hash,
              }) + "\n",
            );
            process.kill(process.pid, "SIGKILL");
          }
          return out;
        },
      },
      r.account,
    ),
    r.binding,
    r.keys,
  );
  await a.seal("crash-" + r.seq, W0.compileRelease(r.doc));
  throw Error("crash injection missed transaction");
}
async function inspectCold(r: Case) {
  const c = await openComposition("reach", "datomic", r.scope),
    a = new Account(new Objects(c, r.account), r.binding, r.keys),
    oracle = emptyAudit();
  try {
    assert.equal(stamp(), r.code);
    const p = await c.currentPosition(),
      h = await a.head(p),
      receipt = await c.transactionByCommand(a.db.entity("cmd:event:crash-" + r.seq));
    assert(receipt.ok && receipt.value?.position === p);
    const admitted = await c.transactionByCommand(a.db.entity("cmd:fence:crash-" + r.seq));
    assert(admitted.ok && admitted.value && admitted.value.position < receipt.value.position);
    const asserted = (tx: { changes: { op: string; entityId: string }[] }) =>
      tx.changes
        .filter((row) => row.op === "assert")
        .map((row) => row.entityId)
        .sort();
    assert.deepEqual(asserted(admitted.value), [a.db.entity("fence")]);
    assert.deepEqual(
      asserted(receipt.value),
      ["head", "event:" + r.seq, "claim:" + hash("crash-" + r.seq)]
        .map((k) => a.db.entity(k))
        .sort(),
    );
    const rec = await a.db.get<Recipe>("event:" + r.seq, p),
      e = rec.value;
    assert.equal(rec.position, p);
    assert.deepEqual(e.next, r.doc);
    const parent = await a.head(e.sourceCut);
    assert(
      r.seq === h.value.seq &&
        parent.hash === e.parentHash &&
        parent.value.seq === r.seq - 1 &&
        e.census === h.value.census,
    );
    const ids = await a.censusAt(h.value, p),
      census = await query(oracle, "population", { n: r.size }),
      seed = await c.transactionByCommand(a.db.entity("cmd:initialize"));
    assert(seed.ok && seed.value);
    assert.deepEqual(census.census, hash(ids));
    assert.equal(ids.length, r.size);
    const basis = (await a.head(seed.value.position)).value.basis;
    assert.equal(census.tx, basis.tx);
    await event(oracle, { seq: 0, doc: W0.R1.doc, basis });
    for (let seq = 1; seq <= r.seq; seq++)
      await event(oracle, {
        seq,
        doc: [W0.R2, W0.R3][seq - 1]!.doc,
        basis: { ...basis, tx: basis.tx + seq },
      });
    const absence = async () => {
      const cut = await c.currentPosition();
      assert.equal(cut, p);
      const keys = [
        "expanded:" + r.seq,
        ...Array.from(
          { length: Math.ceil(ids.length / width) },
          (_, i) => "chunk:" + r.seq + ":" + i,
        ),
      ];
      assert.equal((await a.db.many(keys, cut)).size, 0);
      return keys.length;
    };
    const absent = await absence(),
      selected = await a.selected(e),
      changed: string[] = [],
      rows: string[] = [],
      owed: string[] = [],
      checked: string[] = [];
    for (let i = 0; i < ids.length; i += width) {
      const group = ids.slice(i, i + width),
        [before, after, want] = await Promise.all([
          a.views(group, e.sourceCut),
          a.views(group, p),
          query(oracle, "read", { seq: r.seq, subjects: group }),
        ]);
      assert.deepEqual(
        want.map((v: any) => v.subject),
        group,
      );
      for (const [j, id] of group.entries()) {
        const prev = before.get(id)!,
          v = after.get(id)!,
          x = want[j],
          left = projection(prev.output),
          right = projection(v.output);
        const delta = [...new Set([...left.keys(), ...right.keys()])]
          .sort()
          .filter((k) => left.get(k) !== right.get(k))
          .map((k) => [k, left.get(k) ?? null, right.get(k) ?? null]);
        assert.deepEqual(delta, x.rows);
        assert.equal(
          encodeBig(v.state.pending.slice(0, prev.state.pending.length)),
          encodeBig(prev.state.pending),
        );
        const notices = v.state.pending
          .slice(prev.state.pending.length)
          .map((d) => ({ ...d, payload: JSON.parse(d.payload) }));
        assert.deepEqual(notices, x.deliveries);
        const output = hash(JSON.parse(W0.outputJson(v.output))),
          state = hash(parseOutbox(W0.publishJson({ state: v.state, deliveries: [] })).state);
        assert(output === x.output && state === x.state);
        if (delta.length) changed.push(id);
        rows.push(...delta.map((t) => hash(t)));
        owed.push(...notices.map((t) => hash(encodeBig(t))));
        checked.push(output, state);
      }
    }
    assert.deepEqual(changed, selected.subjects);
    assert.equal(await absence(), absent);
    return {
      nonce: r.nonce,
      identity: r.identity,
      code: r.code,
      scope: r.scope,
      binding: r.binding,
      seq: r.seq,
      p,
      sourceCut: e.sourceCut,
      event: rec.hash,
      txId: receipt.value.txId,
      parent: e.parentHash,
      root: e.root,
      census: e.census,
      release: W0.compileRelease(r.doc).hash,
      people: ids.length,
      changed: changed.length,
      rows: rows.length,
      notices: owed.length,
      checked: hash(checked),
      rowHash: hash(rows),
      owedHash: hash(owed),
      missingChunkKeys: absent,
    };
  } finally {
    oracle.close();
    await c.close();
  }
}
async function power(nonce: string, seq: number) {
  const id = randomUUID();
  assert(process.send);
  return new Promise((ok, fail) => {
    const timeout = setTimeout(() => {
      process.off("message", receive);
      fail(Error("power recovery timeout"));
    }, 240000);
    function receive(m: any) {
      if (m?.id !== id) return;
      clearTimeout(timeout);
      process.off("message", receive);
      if (m.error) fail(Error(m.error));
      else {
        assert(m.recovered.nonce === nonce);
        ok(m.recovered);
      }
    }
    process.on("message", receive);
    process.send!({ type: "power", nonce, seq, id });
  });
}
export async function run(dir: string, attempt: any) {
  const size = 10000,
    scope = attempt.scope + "-power",
    binding = hash([attempt.nonce, attempt.identity, attempt.sources]),
    keys = path.join(dir, "fixture-keys"),
    a = "target",
    c = await openComposition("reach", "datomic", scope);
  try {
    const rung = W0.rung(size),
      raw = [...W0.population(rung)].map((p) => p.world);
    await new Account(new Objects(c, a), binding, keys).bootstrap(
      raw.map((w) => w.subject),
      raw,
      W0.populationBasis(rung),
    );
  } finally {
    await c.close();
  }
  for (const [idx, rel] of [W0.R2, W0.R3].entries()) {
    const seq = idx + 1,
      r: Case = {
        nonce: attempt.nonce,
        identity: attempt.identity,
        code: stamp(),
        scope,
        binding,
        account: a,
        keys,
        doc: rel.doc,
        seq,
        size,
      };
    const child = (op: string) =>
      spawnSync(process.execPath, ["--import", "tsx", import.meta.filename, op], {
        input: JSON.stringify(r),
        encoding: "utf8",
        timeout: 600000,
      });
    const killed = child("writer");
    assert.equal(killed.error, undefined);
    assert.equal(killed.signal, "SIGKILL", killed.stderr);
    const edge = JSON.parse(killed.stdout);
    assert(edge.nonce === r.nonce && edge.seq === seq && edge.scope === scope && edge.position > 0);
    const recovered = await power(attempt.nonce, seq);
    const cold = child("reader");
    assert.equal(cold.status, 0, cold.stderr);
    const proof = JSON.parse(cold.stdout);
    assert(
      proof.seq === seq &&
        proof.identity === attempt.identity &&
        proof.scope === scope &&
        proof.code === r.code &&
        proof.release === rel.hash &&
        proof.people === size,
    );
    assert(edge.event === proof.event && edge.position === proof.p && edge.txId === proof.txId);
    assert.deepEqual([proof.changed, proof.notices], idx ? [38, 0] : [6193, 997]);
    write(path.join(dir, "cold-" + seq + ".json"), { proof, recovered, writerExit: killed.signal });
  }
}
if (process.argv[1] === import.meta.filename) {
  const r = JSON.parse(fs.readFileSync(0, "utf8"));
  assert.equal(r.code, stamp());
  if (process.argv[2] === "writer") await writer(r);
  else {
    assert.equal(process.argv[2], "reader");
    console.log(JSON.stringify(await inspectCold(r)));
  }
}
