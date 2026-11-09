import { it, expect } from "vitest";
import { Effect } from "effect";
import { EntityId, string } from "@triplex-build/triplex";
import { makeQleverStorageAdapter } from "../src/QleverStorageAdapter.js";
import type { QleverClient } from "../src/QleverClient.js";
import { metaIri, fieldIri as f, integerOrderKey, literal } from "../src/rdf.js";

for (const commitEncoding of ["a0", "compact"] as const)
  it(`actual QLever ${commitEncoding} stamp guards and exact operation marker (offline SPARQL transport)`, async () => {
    let head = 0,
      stamp = integerOrderKey("0"),
      updates = 0;
    const records = new Map<string, Map<string, string>>();
    const term = (value: string) => ({ type: "literal", value });
    const client: QleverClient = {
      query: async (query) => {
        if (query.startsWith("SELECT ?position"))
          return head ? [{ position: term(String(head)), stamp: term(stamp) }] : [];
        const operation = /(<urn:triplex:operation:[^>]+>)/.exec(query)?.[1];
        if (!operation) throw new Error(`Unsupported offline query: ${query}`);
        const row = records.get(operation);
        if (!row) return [];
        return [
          {
            attempt: term(row.get("attempt_id")!),
            position: term(row.get("position")!),
            stamp: term(row.get("stamp")!),
          },
        ];
      },
      update: async (update) => {
        updates++;
        const guard = update.split("VALUES (?s ?p ?new)")[0]!;
        if (head === 0) {
          expect(guard).toContain(`FILTER NOT EXISTS { GRAPH`);
          expect(guard).toContain(`${metaIri} ${f("stamp")} ?sourceStamp`);
        } else {
          expect(guard).toContain(
            `${metaIri} ${f("position")} ${literal(String(head))} ; ${f("stamp")} ${literal(stamp)}`,
          );
        }
        // [EXP-RT01] Why: decode actual emitted VALUES and return its exact receipt fields. Rejected: synthesizing a success marker from the caller's expected result.
        for (const match of update.matchAll(
          /\((<urn:triplex:[^>]+>) <urn:triplex:field:([^>]+)> ("(?:[^"\\]|\\.)*")\)/g,
        )) {
          const fields = records.get(match[1]!) ?? new Map<string, string>();
          fields.set(match[2]!, JSON.parse(match[3]!));
          records.set(match[1]!, fields);
        }
        head = Number(records.get(metaIri)!.get("position"));
        stamp = records.get(metaIri)!.get("stamp")!;
      },
      command: async () => {},
      cancel: async () => {},
      close: async () => {},
    };
    const adapter = makeQleverStorageAdapter(client, "offline", { commitEncoding });
    const write = (clock: number) =>
      adapter.withTransaction(
        Effect.gen(function* () {
          const stamp = yield* adapter.commitStamp!(clock),
            position = yield* adapter.nextCommitPosition();
          const row = yield* adapter.insert(
            {
              entityId: EntityId.make("subject"),
              attribute: ":value",
              value: string("value"),
              validFrom: clock,
            },
            `tx:${position}`,
            stamp.instant,
            `row:${position}`,
            position,
          );
          return { stamp, row };
        }),
      );
    const a = await Effect.runPromise(write(1000)),
      b = await Effect.runPromise(write(1000)),
      c = await Effect.runPromise(write(900));
    expect([a.stamp.instant, b.stamp.instant, c.stamp.instant]).toEqual([1000, 1000.001, 1000.002]);
    expect(c.row.recorded_at).toBe(c.stamp.instant);
    expect(c.row.valid_from).toBe(900);
    expect(updates).toBe(3);
    expect(await Effect.runPromise(adapter.currentCut!())).toEqual({
      position: 3,
      recordedAt: 1000.002,
    });
  });
