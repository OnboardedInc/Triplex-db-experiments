import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { DatabaseScope } from "@triplex-build/triplex/runtime";
import { DatomicClient, DatomicHttpError } from "../src/DatomicClient.js";

// [DX-B10] Why: delay actual HTTP arrivals independently of sequence issuance, then compare every durable ACK.
// Rejected: asserting the order of request construction or mocking the transactor's position allocator.
describe.skipIf(process.env.DATOMIC_INTEGRATION !== "1")("strict gateway sequence", () => {
  it("keeps 10,000 commits in sequence with 64 in flight and reordered transport arrivals", async () => {
    const url = process.env.DATOMIC_URL ?? "http://127.0.0.1:8526";
    const client = new DatomicClient(url, 45000);
    const scope = DatabaseScope.test(`dxb10-order-${randomUUID()}`);
    const clientId = randomUUID();
    const layout = process.env.DATOMIC_TEST_LAYOUT === "lean" ? "lean" : "legacy";
    const { db } = await client.create(scope, layout);
    const request = client.request.bind(client);
    const arrivals: number[] = [];
    let random = 0x1d4b9001;
    const delays = Array.from({ length: 10000 }, () => {
      random ^= random << 13;
      random ^= random >>> 17;
      random ^= random << 5;
      return (random >>> 0) % 83;
    });
    client.request = async (method, path, body, timeout) => {
      if (path.endsWith("/transact") && body && typeof body === "object") {
        const sequence = (body as { sendSequence: number }).sendSequence;
        // Seeded delays reorder real arrivals; seq 1 is deliberately the slowest first arrival.
        await new Promise((resolve) =>
          setTimeout(resolve, sequence === 1 ? 100 : delays[sequence - 1]!),
        );
        arrivals.push(sequence);
      }
      return request(method, path, body, timeout);
    };
    let next = 1,
      inFlight = 0,
      peak = 0;
    let failure: unknown;
    const acknowledged = Array.from({ length: 10000 }, () => 0);
    try {
      await Promise.allSettled(
        Array.from({ length: 64 }, async () => {
          while (!failure && next <= 10000) {
            const sequence = next++;
            inFlight++;
            peak = Math.max(peak, inFlight);
            const id = `${clientId}-${sequence}`;
            try {
              const ack: any = await client.transact(db, {
                clientId,
                sendSequence: sequence,
                sourceK: null,
                scopeWide: false,
                span: 1,
                position: 1,
                entities: [],
                live: [],
                operationId: id,
                attemptId: id,
                rows: [
                  {
                    id,
                    entity_id: id,
                    attribute: ":dxb9/order",
                    value_type: "string",
                    value_string: String(sequence),
                    value_number: null,
                    value_boolean: null,
                    value_datetime: null,
                    value_json: null,
                    valid_from: 0,
                    valid_to: null,
                    created_by: null,
                    retracted_at: null,
                    retracted_position: null,
                    retract_tx_id: null,
                    entity_type: null,
                    schema_version: 0,
                    recorded_at: 0,
                    recorded_position: 1,
                    tx_id: id,
                  },
                ],
                newIds: [id],
                claims: [],
              });
              expect(Number(ack.position.v), `ACK for sequence ${sequence}`).toBe(sequence);
              acknowledged[sequence - 1] = Number(ack.position.v);
            } catch (error) {
              failure ??= error;
              throw error;
            } finally {
              inFlight--;
            }
          }
        }),
      );
      if (failure) throw failure;
      expect(peak).toBe(64);
      expect(arrivals[0]).not.toBe(1);
      expect(acknowledged).toEqual(Array.from({ length: 10000 }, (_, i) => i + 1));
      const basis: any = await client.request("GET", `/v1/db/${db}/basis`);
      expect(Number(basis.position.v)).toBe(10000);
    } finally {
      await client.delete(scope);
      client.close();
    }
  }, 180000);
  it("surfaces a typed gap deadline and resends the failed suffix", async () => {
    const client = new DatomicClient(process.env.DATOMIC_URL ?? "http://127.0.0.1:8526", 40000);
    const scope = DatabaseScope.test(`dxb10-gap-${randomUUID()}`);
    const { db } = await client.create(scope);
    const clientId = randomUUID();
    const input = (sendSequence: number) => ({
      clientId,
      sendSequence,
      operationId: `${clientId}-${sendSequence}`,
      attemptId: `${clientId}-${sendSequence}`,
      sourceK: null,
      scopeWide: false,
      span: 1,
      position: 1,
      entities: [],
      live: [],
      rows: [],
      newIds: [],
      claims: [],
    });
    try {
      const responses = await Promise.allSettled([
        client.transact(db, input(2)),
        client.transact(db, input(3)),
      ]);
      for (const response of responses) {
        expect(response.status).toBe("rejected");
        if (response.status === "rejected") {
          expect(response.reason).toBeInstanceOf(DatomicHttpError);
          expect(response.reason.code).toBe("CommitOrderGap");
          expect(response.reason.maximum).toBe(1);
        }
      }
      const later = client.transact(db, input(2));
      const first = await client.transact(db, input(1));
      expect(Number(first.position!.v)).toBe(1);
      expect(Number((await later).position!.v)).toBe(2);
      expect(Number((await client.transact(db, input(3))).position!.v)).toBe(3);
    } finally {
      await client.delete(scope);
      client.close();
    }
  }, 60000);
  // [DX-B10] Why: resolving a duplicate operation must not strand the next valid sequence.
  // Rejected: rejecting duplicates before consuming their ordered turn.
  it("consumes a duplicate-operation sequence without committing it twice", async () => {
    const client = new DatomicClient(process.env.DATOMIC_URL ?? "http://127.0.0.1:8526", 40000);
    const scope = DatabaseScope.test(`dxb10-duplicate-${randomUUID()}`);
    const { db } = await client.create(scope);
    const clientId = randomUUID();
    const input = (sendSequence: number) => ({
      clientId,
      sendSequence,
      operationId: `${clientId}-${sendSequence}`,
      attemptId: `${clientId}-${sendSequence}`,
      sourceK: null,
      scopeWide: false,
      span: 1,
      position: 1,
      entities: [],
      live: [],
      rows: [],
      newIds: [],
      claims: [],
    });
    try {
      const first = input(1);
      expect(Number((await client.transact(db, first)).position!.v)).toBe(1);
      await expect(
        client.transact(db, { ...input(2), operationId: first.operationId }),
      ).rejects.toMatchObject({ code: "OperationDuplicate" });
      expect(Number((await client.transact(db, input(3))).position!.v)).toBe(2);
    } finally {
      await client.delete(scope);
      client.close();
    }
  });
  // [DX-B10] Why: rejecting a malformed command must not strand the following valid sequence.
  // Rejected: leaving preflight failures outside the ordered lane.
  it("consumes a definitively rejected sequence without writing it", async () => {
    const client = new DatomicClient(process.env.DATOMIC_URL ?? "http://127.0.0.1:8526", 40000);
    const scope = DatabaseScope.test(`dxb10-rejected-${randomUUID()}`);
    const { db } = await client.create(scope);
    const clientId = randomUUID();
    const input = (sendSequence: number) => ({
      clientId,
      sendSequence,
      operationId: `${clientId}-${sendSequence}`,
      attemptId: `${clientId}-${sendSequence}`,
      sourceK: null,
      scopeWide: false,
      span: 1,
      position: 1,
      entities: [],
      live: [],
      rows: [],
      newIds: [],
      claims: [],
    });
    try {
      await expect(
        client.request("POST", `/v1/db/${db}/transact`, { ...input(1), span: -1 }),
      ).rejects.toMatchObject({ code: "TransactionRejected" });
      expect(Number((await client.transact(db, input(2))).position!.v)).toBe(1);
    } finally {
      await client.delete(scope);
      client.close();
    }
  });
});
