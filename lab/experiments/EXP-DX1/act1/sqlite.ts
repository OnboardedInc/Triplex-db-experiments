import { join } from "node:path";
import { Effect, ManagedRuntime } from "effect";
import { SqlClient } from "effect/sql";
import { Triples } from "../../../../packages/core/dist/index.js";
import { StorageAdapter } from "../../../../packages/core/dist/runtime/index.js";
import { SqliteTriples } from "../../../../packages/sqlite/dist/index.js";
import { portableSweep } from "../../../bench/lib/w0-public.ts";
import type { Outcome } from "../../../bench/lib/composition.ts";
import type { TriplesHandle } from "../../../bench/lib/triplex.ts";
import { publishRecords, type OutboxStore } from "../../../bench/lib/w0-outbox.ts";

export async function sqliteStore(directory: string, scope: string) {
  if (!/^act1-[a-z0-9-]+$/.test(scope)) throw Error("Invalid SQLite fixture scope");
  const rt = ManagedRuntime.make(SqliteTriples.layer({ filename: join(directory, scope + ".db") }));
  const triples = await rt.runPromise(Effect.service(Triples));
  const sql = await rt.runPromise(Effect.service(SqlClient.SqlClient));
  await rt.runPromise(sql`PRAGMA synchronous = FULL`);
  const h: TriplesHandle = {
    scope,
    triples,
    backend: { name: "sqlite", url: "", queryPath: "sqlite" },
    storage: await rt.runPromise(Effect.service(StorageAdapter)),
    run: (effect) => rt.runPromise(effect) as Promise<any>,
    runExit: (effect) => rt.runPromiseExit(effect),
    close: () => rt.dispose(),
  };
  const outcome = async <A>(
    effect: Parameters<TriplesHandle["runExit"]>[0],
  ): Promise<Outcome<A>> => {
    const exit = await h.runExit(effect);
    if (exit._tag === "Success") return { ok: true, value: exit.value };
    const first = exit.cause.reasons[0];
    return { ok: false, tag: first?.error?._tag ?? "Unknown", error: first?.error ?? exit.cause };
  };
  // [DX-ACT1] Why: price an actual durable Triplex commit with checkpoint and reopen on this host. Rejected: treating the memory composition's ACK time as durable service time.
  const store: OutboxStore & { close(): Promise<void> } = {
    currentPosition: () => h.run(triples.currentPosition()),
    sweepPage: portableSweep(h).page,
    transact: (ops, meta) => outcome(h.triples.transact(ops, meta)),
    transactionByCommand: (id) => outcome(triples.transactionByCommand(id)),
    publishOutbox: (records) => publishRecords(store, records),
    close: h.close,
  };
  return store;
}
