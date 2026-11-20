import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import { DatomicClient, DatomicHttpError } from "../../../../packages/datomic/dist/index.js";
import type { CompositionHandle } from "../../../bench/lib/composition.ts";
import { SEED_VALID_FROM } from "../../../bench/lib/world.ts";

type Signal = (op: string, data: object) => Promise<unknown>;
const protectedField = ":privacy/field";
const plainField = ":privacy/plain";
const percentile = (samples: number[], p: number) =>
  [...samples].sort((a, b) => a - b)[Math.ceil(samples.length * p) - 1]!;

export async function checkSharedAuthority(
  f: { db: string; scope: string; comp: CompositionHandle },
  nonce: string,
  signal: Signal,
  diag: Signal,
  output: (name: string, value: unknown) => void,
) {
  const peer = new DatomicClient(process.env.DATOMIC_URL!, 15_000);
  let committed = 0;
  const write = async (attribute: string, owner: string, value: string) => {
    const started = performance.now();
    const save = await f.comp.transact(
      [
        {
          op: "assert",
          entityId: owner,
          attribute,
          value: { type: "string", value },
          validFrom: SEED_VALID_FROM,
        },
      ],
      { commandId: `authority-${nonce}-${++committed}`, actor: "protected-save-check" },
    );
    const ms = performance.now() - started;
    assert(save.ok, save.ok ? "" : `${save.tag}: ${String(save.error?.cause ?? save.error)}`);
    assert.equal(save.value.position, committed);
    assert.equal(save.value.triples.length, 1);
    const row = save.value.triples[0]!;
    assert.equal(row.entityId, owner);
    assert.equal(row.attribute, attribute);
    assert.deepEqual(row.value, { type: "string", value });
    return { id: row.id, ms };
  };
  try {
    assert.equal((await peer.erasureFrontier(f.db)).seq, 0);
    const clear = "authority-canary-" + nonce;
    const keep = "authority-control-" + nonce;
    const removed = await write(protectedField, "authority/person-removed", clear);
    const retained = await write(protectedField, "authority/person-retained", keep);
    const before = await peer.basis(f.db);
    const read = async (id: string, recordedPosition?: number) =>
      (
        await peer.rows(f.db, {
          id,
          history: true,
          ...(recordedPosition === undefined
            ? {}
            : {
                basis: { recordedPosition, validAt: SEED_VALID_FROM },
              }),
        })
      )[0];
    const pin = Number(before.position.v);
    assert.equal(pin, 2);
    assert.equal((await read(removed.id, pin))?.value_string, clear);
    assert.equal((await read(retained.id, pin))?.value_string, keep);
    await signal("archive", { scope: f.scope, action: "backup" });
    const erase = await peer.erase(f.db, "authority-removal-" + nonce, [{ id: removed.id }]);
    assert.equal(erase.seq, 1);
    assert.deepEqual(
      erase.identities.map((i) => i.assertionId),
      [removed.id],
    );
    const checkReads = async () => {
      const frontier = await peer.erasureFrontier(f.db);
      assert.equal(frontier.seq, 1);
      for (const selected of [undefined, pin]) {
        const row = await read(removed.id, selected);
        assert.equal(row?.id, removed.id);
        assert.equal(row.value_type, "erased");
        assert.equal(row.value_string, null);
        assert.deepEqual(JSON.parse(row.value_json!), {
          type: "erased",
          valueType: "string",
          erasedAt: erase.erasedAt,
          erasureTxId: erase.txId,
        });
        assert.equal((await read(retained.id, selected))?.value_string, keep);
      }
    };
    await checkReads();
    // [DX-ERASE1] Why: verify the independent key deletion while the exact ciphertext is still in native storage.
    // Rejected: treating a gateway's removal marker as evidence of key revocation.
    for (let attempts = 0; ; attempts++) {
      const native = (await diag("key-state", { scope: f.scope, id: removed.id })) as {
        id: string;
        seq: number;
        bodyPresent: boolean;
        keyPresent: boolean;
      };
      assert.equal(native.id, removed.id);
      assert(native.seq === 1 && native.bodyPresent && typeof native.keyPresent === "boolean");
      if (!native.keyPresent) {
        output("authority-key-absence", native);
        break;
      }
      assert(attempts < 30, "Published key remains in the live store");
      await delay(100);
    }
    const moved = await signal("replace-gateway", { scope: f.scope });
    await checkReads();
    await signal("archive", { scope: f.scope, action: "restore" });
    await assert.rejects(
      read(removed.id, pin),
      (error: unknown) =>
        error instanceof DatomicHttpError && error.code === "ErasureFrontierUnavailable",
    );
    await peer.restoreErasure(f.db);
    await checkReads();
    output("authority-recovery", {
      gateway: moved,
      before,
      command: erase.txId,
      id: removed.id,
      control: retained.id,
      seq: erase.seq,
    });
    await compareSharedAuthoritySaves(f, nonce, diag, output, 64);
  } finally {
    peer.close();
  }
}

export async function compareSharedAuthoritySaves(
  f: { db: string; scope: string; comp: CompositionHandle },
  nonce: string,
  diag: Signal,
  output: (name: string, value: unknown) => void,
  count: number,
) {
  const peer = new DatomicClient(process.env.DATOMIC_URL!, 15_000);
  try {
    const authority = await diag("authority-kind", { scope: f.scope });
    assert.deepEqual(authority, { database: f.db, shared: true });
    // [DX-ERASE1] Why: the pool is replenished before the first measured save in both arms.
    // Rejected: charging a cold account's batch key issuance to individual ordinary writes.
    await peer.declareProtection(f.db, [protectedField], true);
    let position = Number((await peer.basis(f.db)).position.v);
    let receiptNumber = 0;
    const samples = {
      plainBefore: [] as number[],
      sealed: [] as number[],
      plainAfter: [] as number[],
    };
    for (const [arm, attribute] of [
      ["plainBefore", plainField],
      ["sealed", protectedField],
      ["plainAfter", plainField],
    ] as const) {
      const current = new Map<string, string>();
      for (let i = -4; i < count; i++) {
        const owner = `authority/${arm}/person-${Math.abs(i % 4)}`;
        const retired = current.get(owner);
        assert.equal(retired !== undefined, i >= 0);
        const value = `protected-cost-${String(i).padStart(4, "0")}-${nonce}`;
        const commandId = `cost-${nonce}-${++receiptNumber}`;
        const start = performance.now();
        const reply = await f.comp.transact(
          [
            ...(retired ? [{ op: "retract" as const, id: retired }] : []),
            {
              op: "assert",
              entityId: owner,
              attribute,
              value: { type: "string", value },
              validFrom: SEED_VALID_FROM,
            },
          ],
          { commandId, actor: "protected-cost" },
        );
        const elapsed = performance.now() - start;
        assert(
          reply.ok,
          reply.ok ? "" : `${reply.tag}: ${String(reply.error?.cause ?? reply.error)}`,
        );
        assert.equal(reply.value.position, ++position);
        assert.equal(reply.value.triples.length, 1);
        const row = reply.value.triples[0]!;
        assert.equal(row.entityId, owner);
        assert.equal(row.attribute, attribute);
        assert.deepEqual(row.value, { type: "string", value });
        assert.notEqual(row.id, retired);
        const [native] = await peer.rows(f.db, { id: row.id });
        assert(native?.id === row.id && native.value_string === value);
        current.set(owner, row.id);
        if (i >= 0) samples[arm].push(elapsed);
      }
    }
    output("authority-saves", {
      authority,
      samples,
      count,
      targetAddedP50Ms: 0.3,
      deltas: [samples.plainBefore, samples.plainAfter].map((control) => ({
        p50ms: percentile(samples.sealed, 0.5) - percentile(control, 0.5),
        p99ms: percentile(samples.sealed, 0.99) - percentile(control, 0.99),
      })),
    });
  } finally {
    peer.close();
  }
}
