import { randomUUID } from "node:crypto";
import { Effect, Layer, ManagedRuntime } from "effect";
import { describe, expect, it } from "vitest";
import { Triples, EntityId } from "@triplex-build/triplex";
import {
  Runtime,
  StorageAdapter,
  QueryExecutor,
  DatabaseScope,
  Capabilities,
} from "@triplex-build/triplex/runtime";
import { DatomicClient } from "../src/DatomicClient.js";
import { makeDatomicStorageAdapter } from "../src/DatomicStorageAdapter.js";
import { makeDatomicQueryExecutor } from "../src/DatomicQueryExecutor.js";

// [DX-B6-5] Why: receipt time alone must expose the acknowledged commit on another peer.
// Rejected: position/basisT hints (mask the record-time-only lag).
describe.skipIf(process.env.DATOMIC_INTEGRATION !== "1" || !process.env.DATOMIC_READ_URLS)(
  "record-time peer barrier",
  () => {
    it("immediately sees 5000 commits at distinct receipt times on the other gateway", async () => {
      const scope = DatabaseScope.test(`b6-peer-${randomUUID()}`);
      const writer = new DatomicClient(process.env.DATOMIC_GATEWAY_URL!, 30000);
      const reader = new DatomicClient(process.env.DATOMIC_READ_URLS!.split(",")[0]!, 30000);
      const adapter = makeDatomicStorageAdapter(writer, scope);
      const read = makeDatomicStorageAdapter(reader, scope);
      const runtime = ManagedRuntime.make(
        Runtime.define({
          name: "b6",
          storage: Layer.succeed(StorageAdapter, adapter),
          queries: Layer.succeed(QueryExecutor, makeDatomicQueryExecutor(writer, scope)),
        }).layer({ scope, capabilities: Capabilities.none }),
      );
      try {
        await runtime.runPromise(Triples);
        await Effect.runPromise(read.initialize());
        const triples = await runtime.runPromise(Triples);
        let previous = -Infinity;
        for (let i = 0; i < 5000; i++) {
          const receipt = await runtime.runPromise(
            triples.transact([
              {
                op: "assert",
                entityId: EntityId.make(`subject-${i}`),
                attribute: ":probe" as any,
                value: { type: "string", value: String(i) },
                validFrom: 0,
              },
            ]),
          );
          expect(receipt.instant).toBeGreaterThan(previous);
          previous = receipt.instant;
          const answer = await Effect.runPromise(
            read.getByEntity(`subject-${i}`, {
              validAt: receipt.instant,
              recordedAt: receipt.instant,
            }),
          );
          expect(answer.map((r) => r.value_string)).toEqual([String(i)]);
        }
        console.log(
          JSON.stringify({
            recordTimePeer: 5000,
            stats: await reader.request("GET", "/v2/admin/scan-stats"),
          }),
        );
      } finally {
        await runtime.dispose();
        await writer.delete(scope);
        writer.close();
        reader.close();
      }
    }, 240000);
  },
);
