import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import type { ackProxy } from "../../ha1/ack-proxy.ts";
import { hash } from "../../ha1/common.ts";
import { Account, errorCode, immutable, type Receipt } from "../../ha1/one-db.ts";
import { DatomicClient, type Input } from "../../../../../packages/datomic/test/ha1-account.ts";
import type { SyncPair } from "../pair.ts";
import { replayEvidence } from "../replay.ts";
import { timeouts, wait } from "../supervisor.ts";

function retireAndReplace(draft: Input, predecessor: Input, pin: Receipt): Input {
  const previous = predecessor.rows[0]!;
  const claim = draft.claims[0]!;
  return {
    ...draft,
    rows: [
      ...draft.rows,
      {
        ...previous,
        recorded_position: Number(pin.position.v),
        retracted_position: draft.position,
        retracted_at: claim.timestamp,
        retract_tx_id: claim.txId,
      },
    ],
  };
}

export async function replacementProbe(pair: SyncPair, shared?: Account) {
  const e = pair.s.e,
    ingress = pair.route!.url;
  const key = e.prefix + "-replace";
  const ac = new Account(key, ingress, pair.reader, key, timeouts.request, shared?.scope);
  try {
    if (shared) {
      const head = await ac.r.basis(ac.db);
      assert.equal(ac.db, shared.db);
      ac.schema = shared.schema;
      ac.cursor = String(BigInt(head.t.v) + 1n);
    } else await ac.open();
    const predecessor = ac.intent("before");
    const old = await ac.send(predecessor);
    await ac.pinned(old);
    const input = retireAndReplace(ac.intent("replace"), predecessor, old);
    const binding = { nonce: e.nonce, source: e.source, slot: e.slot, scope: ac.scope, db: ac.db };
    const authored = { binding, input, sha256: hash(JSON.stringify(input)) };
    e.write("replacement-pending", authored);
    let captured: {
      binding: typeof binding;
      bytes: string;
      sha256: string;
      reply: string;
      original: Receipt;
    };
    let caller: Promise<string | undefined>;
    return {
      acknowledged: old,
      async offer(proxy: Awaited<ReturnType<typeof ackProxy>>, client: DatomicClient) {
        // [DX-HASYNC1] Why: interrupt a real retire-and-replace after its durable receipt. Rejected: replaying an append that never names a stale predecessor.
        caller = client.transact(ac.db, input).then(() => "acknowledged", errorCode);
        await proxy.wait([input.operationId], true);
        const held = proxy.requests.get(input.operationId)!;
        e.write("replacement-original-wire", {
          binding,
          request: held.requestBytes,
          status: held.status,
          reply: held.responseBytes,
        });
        assert.equal(held.status, 200);
        const original = ac.remember(input, held.reply);
        assert(BigInt(original.position.v) > BigInt(old.position.v));
        if (!shared) assert.equal(original.position.v, "2");
        const survivor = await wait("replacement is readable on the standby", 5000, async () => {
          const record = await ac.r.operation(ac.db, input.operationId);
          return record.status === "committed" ? immutable(record) : undefined;
        });
        assert.deepEqual(survivor, original);
        const rows = await ac.r.rows(ac.db, {
          entityIds: [input.rows[0]!.entity_id],
          basisT: original.t.v,
          basis: { recordedPosition: Number(original.position.v), validAt: 10 },
        });
        assert.deepEqual(
          rows.map((r) => [r.id, r.value_string]),
          [[input.newIds[0], input.rows[0]!.value_string]],
        );
        captured = {
          binding,
          bytes: held.requestBytes,
          sha256: hash(Buffer.from(held.requestBytes, "base64")),
          reply: held.responseBytes!,
          original,
        };
        e.write("replacement-withheld", { ...captured, survivor, rows });
      },
      async settle() {
        const first = await caller;
        e.log("replacement-caller", { binding, result: first });
        assert.equal(first, "Transport");
        const pending = JSON.parse(
          fs.readFileSync(path.join(e.dir, "replacement-pending.json"), "utf8"),
        ) as typeof authored;
        const wire = JSON.parse(
          fs.readFileSync(path.join(e.dir, "replacement-withheld.json"), "utf8"),
        ) as typeof captured;
        const bytes = Buffer.from(wire.bytes, "base64");
        assert.deepEqual(pending, authored);
        assert.deepEqual(wire.binding, binding);
        assert.equal(hash(JSON.stringify(pending.input)), pending.sha256);
        assert.equal(hash(bytes), captured.sha256);
        assert.deepEqual(wire.original, captured.original);
        const body = JSON.parse(bytes.toString("utf8"));
        assert.equal(body.operationId, pending.input.operationId);
        assert.deepEqual(body.claims, pending.input.claims);
        const post = async (label: string, data: Buffer | string) => {
          const response = await fetch(new URL(`/v1/db/${ac.db}/transact`, ingress), {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: data,
            signal: AbortSignal.timeout(timeouts.request),
          });
          const reply = await response.text();
          e.log("replacement-post", {
            binding,
            label,
            request: hash(data),
            status: response.status,
            reply,
          });
          return [response.status, (JSON.parse(reply) as { code?: string }).code];
        };
        assert.deepEqual(await post("same bytes", bytes), [409, "OperationDuplicate"]);

        // [DX-HASYNC1] Why: also reach the native command guard after bypassing the peer's original operation check. Rejected: only testing the same operation lookup (it can hide a stale-CAS regression).
        const alias = input.operationId + "/new-envelope";
        assert.deepEqual(
          await post(
            "same command in a new envelope",
            JSON.stringify({ ...body, operationId: alias, attemptId: alias }),
          ),
          [409, "CommandConflict"],
        );
        assert.equal((await ac.r.operation(ac.db, alias)).status, "absent");
        const retryClient = new DatomicClient(ingress, timeouts.request);
        const claim = pending.input.claims[0]!;
        const original = wire.original;
        const expected = {
          commandId: claim.commandId,
          txId: claim.txId,
          operationId: original.operationId,
          position: Number(original.position.v),
          t: original.t.v,
          recordedAt: original.recordedAt.v,
        };
        let receipt: Awaited<ReturnType<DatomicClient["transactCommand"]>>;
        try {
          receipt = await retryClient.transactCommand(ac.db, pending.input);
          e.log("replacement-receipt", { binding, expected, receipt });
          assert.deepEqual(receipt, expected);
          const stale = retireAndReplace(ac.intent("different-command"), predecessor, old);
          await assert.rejects(
            retryClient.transactCommand(ac.db, stale),
            (error) => errorCode(error) === "CasConflict",
          );
          assert.equal((await ac.r.operation(ac.db, stale.operationId)).status, "absent");
        } finally {
          retryClient.close();
        }

        let cursor = ac.cursor;
        const commits = [];
        for (;;) {
          const page = await ac.r.log(ac.db, cursor, 32);
          assert.equal(page.fromT, cursor);
          for (const row of page.rows)
            if (
              row.kind === "commit" &&
              (!shared || row.transaction.operationId.startsWith(key + "-"))
            )
              commits.push(row);
          if (!page.rows.length) break;
          assert(BigInt(page.nextT) > BigInt(cursor));
          cursor = page.nextT;
        }
        const firstCommit = commits[0]!;
        ac.checkEntry(firstCommit);
        const expectedReplacement = {
          t: original.t.v,
          kind: "commit",
          transaction: {
            positions: [original.position.v],
            txIds: [claim.txId],
            commandIds: [claim.commandId],
            operationId: input.operationId,
            stamp: String(claim.timestamp),
            stampStatus: "decided",
            changes: input.rows
              .map((row) => ({
                op: input.newIds.includes(row.id) ? "assert" : "retract",
                entity: row.entity_id,
                attribute: row.attribute,
                assertionId: row.id,
                validFrom: row.valid_from,
                validTo: row.valid_to,
                position: original.position.v,
              }))
              .sort((a, b) =>
                a.assertionId < b.assertionId ? -1 : a.assertionId > b.assertionId ? 1 : 0,
              ),
          },
        };
        e.write("replacement-feed", { binding, expectedReplacement, commits, cursor });
        assert.deepEqual(commits, [firstCommit, expectedReplacement]);
        if (!shared) assert.equal((await ac.r.basis(ac.db)).position.v, original.position.v);
        const oracle = await replayEvidence(e, ac, [predecessor, input], "replacement");
        const result = { binding, request: wire.sha256, first, receipt, oracle, operations: 2 };
        e.write("replacement-settled", result);
        return {
          result,
          extra: [
            { receipt: old, entry: firstCommit },
            { receipt: original, entry: expectedReplacement },
          ],
        };
      },
      close() {
        ac.close();
      },
    };
  } catch (error) {
    ac.close();
    throw error;
  }
}
