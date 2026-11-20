import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stringifyExact } from "../src/codec.js";
import { test, vi } from "vitest";
import { historyIdentityBounds } from "../src/identityRange.js";

// [DX-W1] Why: independent writers interleave, and legacy/imported IDs may contain any UTF-16 sequence.
// Rejected: a monotonic test generator as the only source of valid and invalid candidate keys.
test("inclusive bounds cover both interleaved writer streams", () => {
  const ids = ["AZ09", "9ZZZ", "AZ10", "A000"].map((s) => "0".repeat(22) + s);
  assert.deepEqual(historyIdentityBounds(ids), [ids[1], ids[2]]);
  assert.deepEqual(historyIdentityBounds(ids.toReversed()), [ids[1], ids[2]]);
});
test("only distinct generated-format groups qualify", () => {
  const id = "Z".repeat(26);
  for (const ids of [
    [],
    [id],
    [id, id],
    [id, "A".repeat(25)],
    [id, "A".repeat(27)],
    [id, "a".repeat(26)],
    [id, "A".repeat(25) + "\n"],
    [id, "A".repeat(25) + "\ud800"],
  ])
    assert.equal(historyIdentityBounds(ids), undefined);
  assert.deepEqual(historyIdentityBounds(["0".repeat(26), id]), ["0".repeat(26), id]);
});

test.each([
  ["", "lean", false],
  ["history-range", "lean", true],
  ["history-range", "legacy", false],
] as const)(
  "sends bounds through the %s client on an observed %s layout",
  async (setting, layout, enabled) => {
    vi.stubEnv("TRIPLEX_DATOMIC_FAST_PATHS", setting);
    vi.resetModules();
    const { DatomicClient } = await import("../src/DatomicClient.js");
    const { createPackedRow } = await import("../src/rows.js");
    const client = new DatomicClient(`http://${crypto.randomUUID()}`);
    const captured: Record<string, unknown>[] = [];
    client.request = async <T>(_method: string, route: string, body?: unknown): Promise<T> => {
      if (route.endsWith("create")) return { db: "db", layout, schemaHash: "fixture" } as T;
      captured.push(body as Record<string, unknown>);
      return { t: { t: "long", v: "1001" }, position: { t: "long", v: "1" }, delta: 0 } as T;
    };
    try {
      const ids = ["Z".repeat(26), "0".repeat(26)];
      await client.create("scope", "lean");
      const rows = ids.map((id) =>
        createPackedRow(
          { entityId: "subject", attribute: ":value", value: { type: "string", value: id } },
          "tx",
          1,
          id,
          1,
        ),
      );
      await client.transact("db", {
        sourceK: 0,
        position: 1,
        operationId: "save",
        attemptId: "attempt",
        rows,
        newIds: ids,
        claims: [],
      });
      assert.equal(captured.length, 1);
      if (enabled)
        assert.equal(
          stringifyExact(captured[0]),
          readFileSync(
            new URL("../gateway/history-range-case.json", import.meta.url),
            "utf8",
          ).trimEnd(),
        );
      assert.deepEqual(captured[0]!.historyIdentityBounds, enabled ? [ids[1], ids[0]] : undefined);
    } finally {
      client.close();
      vi.unstubAllEnvs();
      vi.resetModules();
    }
  },
);

test("fresh-only wire requires an upgraded compact decoder and preserves ordinary fallback", async () => {
  vi.stubEnv("TRIPLEX_DATOMIC_FAST_PATHS", "row,history-range,fresh-texts");
  vi.resetModules();
  const { DatomicClient } = await import("../src/DatomicClient.js");
  const { createPackedRow } = await import("../src/rows.js");
  const client = new DatomicClient(`http://${crypto.randomUUID()}`);
  const requests: Record<string, unknown>[] = [];
  client.request = async <T>(_method: string, route: string, body?: unknown): Promise<T> => {
    if (route.endsWith("create")) return { db: "db", layout: "lean", schemaHash: "fixture" } as T;
    requests.push(body as Record<string, unknown>);
    return { t: { t: "long", v: "1001" }, position: { t: "long", v: "1" }, delta: 0 } as T;
  };
  try {
    await client.create("scope", "lean");
    const ids = Array.from({ length: 32 }, (_, i) =>
      i.toString(36).toUpperCase().padStart(26, "0"),
    );
    const rows = ids.map((id) =>
      createPackedRow(
        { entityId: "subject", attribute: ":value", value: { type: "string", value: "new" } },
        "tx",
        1,
        id,
        1,
      ),
    );
    const input = {
      assignRecordTime: false,
      sourceK: 0,
      position: 1,
      operationId: "new",
      attemptId: "attempt",
      rows,
      newIds: ids,
      claims: [],
    };
    await client.transact("db", input);
    const fresh = requests[0]!;
    assert.equal(fresh.rowMode, "texts");
    for (const legacy of ["rows", "newIds", "rowOrder", "rowTexts"])
      assert(!Object.hasOwn(fresh, legacy));
    assert.equal((fresh.freshTexts as string[]).length, ids.length);
    assert.deepEqual(fresh.historyIdentityBounds, [ids[0], ids.at(-1)]);
    await client.transact("db", { ...input, rows: [...rows, rows[0]!], newIds: [...ids, ids[0]!] });
    const ordinary = requests[1]!;
    assert.equal(ordinary.rowMode, "texts");
    assert(Array.isArray(ordinary.rowOrder));
    assert(!Object.hasOwn(ordinary, "freshTexts"));
  } finally {
    client.close();
    vi.unstubAllEnvs();
    vi.resetModules();
  }
});
