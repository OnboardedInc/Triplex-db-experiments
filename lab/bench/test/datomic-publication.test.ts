import assert from "node:assert/strict";
import { test } from "node:test";
import {
  installDatomicPublication,
  observeDatomicPublication,
} from "../lib/datomic-publication.ts";

test("Datomic publication observes a bound result before the caller ACK and refuses mismatches", async () => {
  const order: string[] = [];
  class Client {
    async transact(_db: string, input: any) {
      order.push("result");
      if (input.reject) throw Error("transport");
      return { position: { t: "long", v: String(input.returned ?? input.position) } };
    }
  }
  installDatomicPublication({ DatomicClient: Client });
  installDatomicPublication({ DatomicClient: Client });
  observeDatomicPublication((position, id) => {
    assert.equal(position, 7);
    assert.equal(id, "op");
    order.push("publication");
  });
  try {
    await new Client().transact("db", { position: 7, operationId: "op" });
    order.push("ACK");
    assert.deepEqual(order, ["result", "publication", "ACK"]);
    await assert.rejects(
      new Client().transact("db", { position: 7, returned: 8, operationId: "op" }),
      /binding mismatch/,
    );
    await assert.rejects(
      new Client().transact("db", { position: 7, reject: true, operationId: "op" }),
      /transport/,
    );
    assert.equal(order.filter((s) => s === "publication").length, 1);
  } finally {
    observeDatomicPublication(undefined);
  }
});
