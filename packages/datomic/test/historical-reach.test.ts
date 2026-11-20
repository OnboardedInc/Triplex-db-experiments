import { expect, it, vi } from "vitest";
import { DatomicClient } from "../src/DatomicClient.js";
import { encodeRowText } from "../src/rowText.js";

const row = (root: string, p: number, valid_from: number, valid_to: number | null) =>
  encodeRowText({
    id: `${root}-${p}-${valid_from}`,
    entity_id: root,
    attribute: "color",
    value_type: "string",
    value_string: `value-${p}-${valid_from}`,
    valid_from,
    valid_to,
    recorded_at: p,
    recorded_position: p,
    created_by: null,
    tx_id: null,
    schema_version: 1,
    entity_type: null,
    value_number: null,
    value_boolean: null,
    value_datetime: null,
    value_json: null,
    retracted_at: null,
    retracted_position: null,
    retract_tx_id: null,
  });

it("batches one named cut and proves the local reuse interval with full row bounds", async () => {
  const client = new DatomicClient("http://localhost:1");
  const request = vi.spyOn(client, "request").mockResolvedValue({
    position: 1,
    t: "101",
    reset: false,
    closures: [
      ["a", ["a"]],
      ["b", ["b"]],
    ],
    entities: [
      ["a", 1, [row("a", 1, 0, 10), row("a", 1, 10, null)]],
      ["b", 1, [row("b", 1, 2, 4)]],
    ],
  });
  try {
    const basis = { recordedAt: 1, validAt: 3 };
    const result = await client.readHistoricalWorlds("scope", ["a", "b"], basis);
    expect(request.mock.calls[0]?.[1]).toMatch(/\/reach-many$/);
    expect(request.mock.calls[0]?.[2]).toMatchObject({ basis, roots: ["a", "b"] });
    expect(result?.requests).toBe(1);
    expect(result?.worlds.map((w) => [w.root, w.from, w.to, w.triples[0]?.value.value])).toEqual([
      ["a", 0, 10, "value-1-0"],
      ["b", 2, 4, "value-1-2"],
    ]);
    await expect(client.readHistoricalWorlds("scope", ["a", "a"], basis)).rejects.toThrow(/batch/);
  } finally {
    client.close();
  }
});

it("keeps both cut sessions and multiple versions without taking an extra repair request", async () => {
  const client = new DatomicClient("http://localhost:1", 5_000, 1 << 20, {
    historicalRevisionReuse: true,
  });
  const calls: any[] = [];
  vi.spyOn(client, "request").mockImplementation(async (_method, _url, input: any) => {
    calls.push(input);
    const p = input.basis.recordedAt;
    return {
      position: 2,
      t: String(100 + p),
      reset: false,
      closures: [["a", ["a"]]],
      entities: [calls.length <= 2 ? ["a", p, [row("a", p, 0, null)]] : ["a", p]],
    } as any;
  });
  try {
    for (const p of [1, 2, 1, 2]) {
      const result = await client.readHistoricalWorlds("scope", ["a"], {
        recordedAt: p,
        validAt: 5,
      });
      expect(result?.worlds[0]?.triples[0]?.value.value).toBe(`value-${p}-0`);
      expect(result?.requests).toBe(1);
    }
    expect(calls[0].session).toBe(calls[2].session);
    expect(calls[1].session).toBe(calls[3].session);
    expect(calls[0].session).not.toBe(calls[1].session);
    expect(client.reachDiagnostics.needRequests).toBe(0);
    expect(client.reachDiagnostics.decodedRows).toBe(2);
  } finally {
    client.close();
  }
});
