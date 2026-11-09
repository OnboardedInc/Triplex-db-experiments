// [CX-VP2Q-4-R8] Why: include the public entity-page payload and implicit transaction pin in Q89i checks.
// Rejected: adapter-only result comparisons (miss public conversion and no-basis get entry points).
import { randomUUID } from "node:crypto";
import { Effect } from "effect";
import { expect, it } from "vitest";
import { DatabaseScope } from "@triplex-build/triplex/runtime";
import { prepareEntityPage, encodeEntityPageCursor } from "../../../../packages/core/src/EntityPage.js";
import { graphIri } from "../../../../packages/qlever/src/rdf.js";
import { makeFreshConnectionClient } from "../../../../packages/qlever/src/broker/http.js";
import { ModelReplica, openRt, freshDir, ops, writeJson } from "./harness.js";

it.each(process.env["V_P2Q_LIVE"] === "1" ? ["model", "live"] : ["model"])(
  "round8 %s public entity page and implicit get pin preserve full bytes", async kind => {
    const scope = DatabaseScope.test(`round8-page:${randomUUID()}`);
    const client = kind === "model" ? new ModelReplica(graphIri(scope)) : makeFreshConnectionClient("http://127.0.0.1:7070");
    const rt = await openRt(freshDir("round8-pin-page"), scope, client);
    try {
      const first = await rt.run(rt.triples.transact(ops("s:page", 1, "first").map(op => ({ ...op, entityType: "Round8" }))));
      expect(await rt.broker.drain(60_000)).toBe(true);
      const instant = Date.now();
      const row = (await rt.run(rt.adapter.getByEntity("s:page", { validAt: instant, recordedPosition: first.position })))[0]!;
      const cursor = encodeEntityPageCursor(prepareEntityPage({ request: { entityType: "Round8", basis: { validAt: instant, recordedAt: instant } }, now: instant, scope: DatabaseScope.test(scope), recordedPosition: first.position }), "");
      const request = { entityType: "Round8", cursor };
      const before = JSON.stringify(await rt.run(rt.triples.entityPage(request)));
      expect(JSON.parse(before).entities.length).toBe(1);
      const pinRecords: any[] = [];
      await rt.run(rt.adapter.withTransaction(Effect.gen(function* () {
        const a = JSON.stringify(yield* rt.adapter.getById(row.id));
        const b = JSON.stringify(yield* rt.triples.get(row.id as any));
        yield* Effect.promise(() => rt.run(rt.triples.retract(row.id as any)));
        yield* Effect.promise(async () => { expect(await rt.broker.drain(60_000)).toBe(true); });
        for (const [route, prior, effect] of [
          ["getById", a, rt.adapter.getById(row.id)],
          ["get", b, rt.triples.get(row.id as any)],
        ] as const) {
          const after = JSON.stringify(yield* effect);
          pinRecords.push({ route, pin: first.position, before: prior, after, equal: prior === after });
          writeJson(`round8-${kind}-implicit-pin.json`, pinRecords);
          expect.soft(after, `${kind} ${route} pinned payload`).toBe(prior);
        }
        expect(yield* rt.adapter.currentCommitPosition()).toBe(first.position);
        return yield* Effect.fail("rollback-read-review");
      })).pipe(Effect.catch(error => error === "rollback-read-review" ? Effect.void : Effect.fail(error))));
      const after = JSON.stringify(await rt.run(rt.triples.entityPage(request)));
      writeJson(`round8-${kind}-entity-page.json`, { before, after, equal: before === after });
      expect.soft(after, `${kind} public entityPage payload`).toBe(before);
    } finally {
      await rt.dispose(); await rt.broker.close();
      if (kind === "live") { await client.update(`DROP SILENT GRAPH ${graphIri(scope)}`); await client.close(); }
    }
  });
