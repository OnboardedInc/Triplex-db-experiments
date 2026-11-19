import { networkInterfaces } from "node:os";
import { expect, it } from "vitest";
import { DatomicClient } from "../src/DatomicClient.js";
import { encodeRowText } from "../src/rowText.js";

it("repairs an evicted revision at its requested cut and rejects a different closure", async () => {
  const address = Object.values(networkInterfaces())
    .flat()
    .find((n) => n?.internal && n.family === "IPv4")!.address;
  const client = new DatomicClient("http://" + address, 5000, 1 << 20, {
    entityCacheBytes: 1,
    reachKeyBytes: 0,
  });
  const cuts: number[] = [];
  let invalid = false;
  client.request = async <T>(_method: string, _path: string, body: any) => {
    cuts.push(body.basis.recordedPosition);
    const p = body.basis.recordedPosition;
    const id = "value-" + p;
    const text = encodeRowText({
      id,
      entity_id: "person",
      attribute: "color",
      value_type: "string",
      value_string: p === 1 ? "old" : "new",
      valid_from: 0,
      valid_to: null,
      recorded_at: p,
      recorded_position: p,
      created_by: "user",
      tx_id: "_tx/" + String(p).padStart(26, "0"),
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
    return {
      position: p,
      t: String(p + 100),
      reset: false,
      entities: body.need
        ? [["person", p, [text]]]
        : invalid
          ? [
              ["person", p, [text]],
              ["foreign", 0, []],
            ]
          : [["person", p]],
      closures: [["person", invalid ? ["person", "foreign"] : ["person"]]],
    } as T;
  };
  try {
    for (const p of [1, 2, 1]) {
      const seen = await client.readDemandWorld("scope", "person", {
        recordedPosition: p,
        validAt: 1,
      });
      expect(seen?.requests).toBe(2);
      expect(seen?.triples.map((r) => [r.id, r.value.value])).toEqual([
        ["value-" + p, p === 1 ? "old" : "new"],
      ]);
    }
    expect(cuts).toEqual([1, 1, 2, 2, 1, 1]);
    expect(client.reachCache.bytes).toBe(0);
    expect(client.cacheDiagnostics().reachKeys.bytes).toBe(0);
    invalid = true;
    await expect(
      client.readDemandWorld("scope", "person", { recordedPosition: 1, validAt: 1 }),
    ).rejects.toThrow(/closure/);
  } finally {
    client.close();
  }
});
