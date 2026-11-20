import assert from "node:assert/strict";
import type { ChildProcess } from "node:child_process";
import { once } from "node:events";
import { createInterface } from "node:readline";
import { CompactClient, type CompactTransport, type Save } from "./client.ts";

export async function checkSdk(peer: ChildProcess, binding: { attempt: string; sourceHash: string }) {
  const closing = once(peer, "close");
  const replies = createInterface({ input: peer.stdout! })[Symbol.asyncIterator]();
  let token = 0;
  const request: CompactTransport = async <T>(method: string, args: readonly unknown[]) => {
    peer.stdin!.write(JSON.stringify([++token, method, args]) + "\n");
    for (;;) {
      const next = await replies.next();
      assert(!next.done, "compact gateway closed before replying");
      if (!next.value.startsWith("COMPACT_RPC ")) continue;
      const reply = JSON.parse(next.value.slice(12));
      assert.equal(reply.token, token);
      assert.equal(reply.attempt, binding.attempt);
      assert.equal(reply.source, binding.sourceHash);
      assert.equal(reply.error, undefined);
      return reply.value as T;
    }
  };
  const client = new CompactClient(request);
  const valid = "2026-11-04T12:00:00.000000Z";
  const put = (account: string, root: string, command: string, value: number): Save => ({
    account, root, command, expected: 0, adds: [[root, "weeklyMinutes", value, null, null]], retires: [],
  });
  try {
    const r1 = await client.save(put("sdk-a", "pl:a", "first", 2000));
    assert("position" in r1 && r1.position === 1);
    const edit: Save = {
      ...put("sdk-a", "pl:a", "change", 2600),
      expected: 1, retires: [[1, 0]],
    };
    const [r2, r3, b] = await client.saveGroup([
      edit, put("sdk-a", "pl:b", "second-owner", 3200), put("sdk-b", "pl:a", "change", 900),
    ]);
    assert("position" in r2 && "position" in r3 && "position" in b);
    assert.deepEqual([r2.position, r3.position, b.position], [2, 3, 1]);
    assert.equal(r2.nativeT, r3.nativeT);
    assert.equal(r2.nativeT, b.nativeT);
    assert.deepEqual(await client.save(edit), r2);
    assert.deepEqual(await client.receipt("sdk-a", "change"), r2);
    assert.deepEqual(await client.save({ ...edit, adds: [] }), { error: "IdempotencyConflict" });
    assert.deepEqual((await client.pinned("sdk-a", "pl:a", 1, valid)).facts, [
      { e: "pl:a", a: "weeklyMinutes", v: 2000, tx: 1 },
    ]);
    assert.deepEqual((await client.current("sdk-a", "pl:a", valid)).facts, [
      { e: "pl:a", a: "weeklyMinutes", v: 2600, tx: 2 },
    ]);
    assert.deepEqual((await client.pinned("sdk-a", "pl:b", 2, valid)).facts, []);
    assert.deepEqual((await client.current("sdk-b", "pl:a", valid)).facts, [
      { e: "pl:a", a: "weeklyMinutes", v: 900, tx: 1 },
    ]);
    const page = await client.feed("sdk-a", 1, 1);
    assert.deepEqual(page.map(({ position, command }) => [position, command]), [[2, "change"]]);
    assert.deepEqual(page[0].changes.map(({ op, id }) => [op, id]), [["assert", [2, 0]], ["retire", [1, 0]]]);
    assert.deepEqual((await client.feed("sdk-a", 2, 1)).map((x) => x.position), [3]);
    return { attempt: binding.attempt, source: binding.sourceHash, first: r1, edit: r2, sibling: r3, other: b, requests: token };
  } finally {
    peer.stdin!.end();
    const [code] = await closing;
    assert.equal(code, 0);
  }
}
