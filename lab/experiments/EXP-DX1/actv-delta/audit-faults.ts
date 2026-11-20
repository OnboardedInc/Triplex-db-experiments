import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { openComposition } from "../../../bench/lib/composition.ts";
import { W0 } from "../../../bench/lib/w0-world.ts";
import { Account } from "./account.ts";
import { Objects, hash } from "./store.ts";
import { decodeOwed, openStored, persistPublication } from "./dispatch.ts";
import { CurrentDecisions } from "./service.ts";
import { event, emptyAudit, query } from "./bench-rung.ts";
import { stamp } from "./binding.ts";
import { encodeBig } from "./model.ts";

const source: W0.World = {
  subject: "pl:a",
  facts: [
    { e: "pl:a", a: "payRateCents", v: 1500, tx: 1 },
    { e: "pl:a", a: "location", v: "loc:a", tx: 1 },
    { e: "loc:a", a: "jurisdiction", v: "jur:a", tx: 1 },
    { e: "loc:a", a: "localMinWageCents", v: 1700, tx: 1 },
    { e: "jur:a", a: "stateMinWageCents", v: 1200, tx: 1 },
  ],
};
const validTime = W0.POPULATION_VALID_TIME,
  subject = source.subject;
type Case = { scope: string; binding: string; nonce: string; stamp: string; keys: string };
const args = (caseData: Case) => [
  "--import",
  "tsx",
  import.meta.filename,
  JSON.stringify(caseData),
];
function witness(value: unknown) {
  fs.writeSync(1, JSON.stringify(value) + "\n");
  process.kill(process.pid, "SIGKILL");
}
async function child(c: Case, kind: string, expected: any) {
  assert.equal(stamp(), c.stamp);
  const store = await openComposition("reach", "datomic", c.scope),
    db = new Objects(store, "faults"),
    a = new Account(db, c.binding, c.keys);
  try {
    if (kind === "fence") {
      await a.seal("interrupted", W0.R2, {
        durability: "record",
        afterFence: async () => {
          const p = await store.currentPosition(),
            fence = await db.get("fence", p);
          assert.equal(fence.position, p);
          witness({ cut: p, hash: fence.hash, nonce: c.nonce });
        },
      });
      throw Error("pre-terminal stop did not take effect");
    }
    const oracle = emptyAudit();
    try {
      await query(oracle, "source", [source]);
      await event(oracle, { seq: 0, basis: { tx: 1, validTime }, doc: W0.R1.doc });
      if (kind === "recover") {
        const p = await store.currentPosition(),
          fence = await db.get("fence", p);
        assert.deepEqual({ cut: fence.position, hash: fence.hash, nonce: c.nonce }, expected);
        const no = await store.transactionByCommand(db.entity("cmd:event:interrupted"));
        assert(no.ok && no.value === null);
        const read = await new CurrentDecisions(a, () => validTime).read(subject);
        assert(read.position > p && read.output.release === W0.R2.hash);
        const native = await a.seal("interrupted", W0.R2, { durability: "record" });
        assert(native.retry && native.position === read.position);
        await event(oracle, { seq: 1, basis: { tx: native.position, validTime }, doc: W0.R2.doc });
        const owed = await decodeOwed(a, native.seq, native.position),
          got = [];
        for await (const { chunk } of owed.chunks) got.push(...JSON.parse(chunk.deliveries));
        const [proof] = await query(oracle, "read", { seq: 1, subjects: [subject] });
        assert.equal(hash(JSON.parse(W0.outputJson(read.output))), proof.output);
        assert.equal(got.length, 1);
        assert.deepEqual(
          got.map((d) => ({ ...d, seq: BigInt(d.seq), payload: JSON.parse(d.payload) })),
          proof.deliveries,
        );
        console.log(
          JSON.stringify({
            cut: native.position,
            txId: native.txId,
            owed: owed.owed,
            proof: hash(encodeBig(proof)),
          }),
        );
        return;
      }
      if (kind === "stored") {
        const stopped = new Account(
          new Objects(
            {
              ...store,
              transact: async (ops, meta) => {
                const r = await store.transact(ops, meta);
                if (String(meta.commandId).endsWith(":cmd:put:stored:2")) {
                  assert(r.ok);
                  witness({ cut: r.value.position, txId: r.value.txId, nonce: c.nonce });
                }
                return r;
              },
            },
            "faults",
          ),
          c.binding,
          c.keys,
        );
        const end = await stopped.seal("literal", W0.R1, { durability: "stored" });
        assert.equal(end.seq, 2);
        await persistPublication(stopped, end.seq, end.position);
        throw Error("stored commit stop did not take effect");
      }
      assert.equal(kind, "read-stored");
      const native = await store.transactionByCommand(db.entity("cmd:put:stored:2"));
      assert(
        native.ok &&
          native.value &&
          native.value.position === expected.cut &&
          native.value.txId === expected.txId,
      );
      const first = await store.transactionByCommand(db.entity("cmd:event:interrupted")),
        second = await store.transactionByCommand(db.entity("cmd:event:literal"));
      assert(first.ok && second.ok && first.value && second.value);
      await event(oracle, {
        seq: 1,
        basis: { tx: first.value.position, validTime },
        doc: W0.R2.doc,
      });
      await event(oracle, {
        seq: 2,
        basis: { tx: second.value.position, validTime },
        doc: W0.R1.doc,
      });
      const [want] = await query(oracle, "read", {
          seq: 2,
          subjects: [subject],
          publication: true,
        }),
        reopened = await openStored(a, 2, expected.cut);
      assert.equal(reopened.cut, second.value.position);
      assert(
        reopened.chunks.length &&
          want.rows.length &&
          want.publication[2].some((x: any) => x.retired),
      );
      assert.deepEqual(
        reopened.chunks.flatMap((chunk) => chunk.rows),
        want.rows,
      );
      assert.deepEqual(
        reopened.chunks
          .flatMap((chunk) => JSON.parse(chunk.state!))
          .map((x: any) => [
            x[0],
            x[1].map((s: any) => ({ ...s, basis: { ...s.basis, tx: BigInt(s.basis.tx) } })),
            x[2].map((i: any) => ({ ...i, seq: BigInt(i.seq), payload: JSON.parse(i.payload) })),
          ]),
        [want.publication],
      );
      assert.deepEqual(
        reopened.chunks.flatMap((chunk) => JSON.parse(chunk.deliveries)),
        want.deliveries,
      );
      console.log(
        JSON.stringify({
          cut: expected.cut,
          txId: expected.txId,
          digest: reopened.digest,
          proof: hash(encodeBig(want)),
        }),
      );
    } finally {
      oracle.close();
    }
  } finally {
    await store.close();
  }
}
async function cycle(nonce: string, seq: number) {
  const id = randomUUID();
  assert(process.send);
  return new Promise((ok, fail) => {
    const timer = setTimeout(() => fail(Error("fault supervisor timed out")), 240000);
    function recv(m: any) {
      if (m?.id !== id) return;
      clearTimeout(timer);
      process.off("message", recv);
      if (m.error) fail(Error(m.error));
      else {
        assert(m.recovered.nonce === nonce);
        ok(m.recovered);
      }
    }
    process.on("message", recv);
    process.send!({ type: "power", nonce, seq, id });
  });
}
export async function run(dir: string, attempt: any) {
  const c: Case = {
    scope: attempt.scope + "-audit-faults",
    binding: hash(attempt),
    nonce: attempt.nonce,
    stamp: stamp(),
    keys: path.join(dir, "fault-keys"),
  };
  const store = await openComposition("reach", "datomic", c.scope);
  try {
    assert.equal(await store.currentPosition(), 0);
    await new Account(new Objects(store, "faults"), c.binding, c.keys).bootstrap(
      [subject],
      [source],
      { tx: 1, validTime },
      true,
      "native",
    );
  } finally {
    await store.close();
  }
  for (const [i, what, reopen] of [
    [1, "fence", "recover"],
    [2, "stored", "read-stored"],
  ] as const) {
    const cmd = args(c),
      crashing = spawnSync(process.execPath, [...cmd, what], { encoding: "utf8", timeout: 45000 });
    assert.equal(crashing.signal, "SIGKILL", crashing.stderr);
    const observation = JSON.parse(crashing.stdout);
    assert(observation.nonce === c.nonce);
    const recovered = await cycle(c.nonce, i),
      verified = JSON.parse(
        execFileSync(process.execPath, [...cmd, reopen, JSON.stringify(observation)], {
          encoding: "utf8",
          timeout: 45000,
        }),
      );
    fs.writeFileSync(
      path.join(dir, "power-" + i + ".json"),
      JSON.stringify({ attempt, observation, recovered, verified }) + "\n",
      { flag: "wx" },
    );
  }
}
if (process.argv[1] === import.meta.filename)
  await child(
    JSON.parse(process.argv[2]!),
    process.argv[3]!,
    JSON.parse(process.argv[4] ?? "null"),
  );
