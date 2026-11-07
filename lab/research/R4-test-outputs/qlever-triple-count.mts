// Stubs fetch so no network is touched; records the SPARQL UPDATE text of each Triplex transact.
import { Effect } from "effect";
import { EntityId, Triples, string, number } from "/Users/sam/projects/triplex-db-2/packages/qlever/node_modules/@triplex-build/triplex/dist/index.js";
import { Capabilities, DatabaseScope } from "/Users/sam/projects/triplex-db-2/packages/qlever/node_modules/@triplex-build/triplex/dist/runtime/index.js";
import { makeQleverRuntime } from "/Users/sam/projects/triplex-db-2/packages/qlever/src/index.ts";

const updates: string[] = [];
(globalThis as any).fetch = async (_url: any, init: any) => {
  const body = String(init?.body ?? "");
  const ct = init?.headers?.["Content-Type"] ?? "";
  const json = (o: unknown) => new Response(JSON.stringify(o), { status: 200 });
  if (ct.endsWith("update")) { updates.push(body); return json({}); }
  if (/SELECT \?attempt WHERE/.test(body)) return json({ results: { bindings: [{ attempt: { type: "literal", value: "x" } }] } });
  return json({ results: { bindings: [] } });
};
const ROW = /\(<urn:triplex:(?:assertion|claim|operation):[^\n]*?> <urn:triplex:field:[a-z_]+> |\(<urn:triplex:meta> <urn:triplex:field:[a-z_]+> /g;
const rowsOf = (u: string) => u.slice(u.indexOf("VALUES (?s ?p ?new)")).match(ROW) ?? [];
const countRows = (u: string) => rowsOf(u).length;
const byPred = (u: string) => { const m = new Map<string, number>(); for (const r of u.match(/^\(<urn:triplex:[^\n]*\)$/gm) ?? []) { const p = /^\(<[^>]*> <urn:triplex:field:([a-z_]+)>/.exec(r)?.[1] ?? "?"; m.set(p, (m.get(p) ?? 0) + 1);} return m; };
const subjectKinds = (u: string) => { const m = new Map<string, number>(); for (const r of rowsOf(u)) { const k = /^\(<urn:triplex:([a-z]+)/.exec(r)?.[1] ?? "?"; m.set(k, (m.get(k) ?? 0) + 1);} return Object.fromEntries(m); };

const program = Effect.gen(function* () {
  const t = yield* Triples;
  const scenarios: [string, any[], any][] = [
    ["1 string assert, no meta", [{ op: "assert", entityId: EntityId.make("e1"), attribute: ":a/b", value: string("x"), entityType: "Thing" }], undefined],
    ["1 string assert + commandId + actor", [{ op: "assert", entityId: EntityId.make("e2"), attribute: ":a/b", value: string("x"), entityType: "Thing" }], { commandId: "c1", actor: "me" }],
    ["5 string asserts on 1 entity, no meta", [1,2,3,4,5].map((i) => ({ op: "assert", entityId: EntityId.make("e3"), attribute: `:a/b${i}`, value: string("x"), entityType: "Thing" })), undefined],
    ["1 number assert, no meta", [{ op: "assert", entityId: EntityId.make("e4"), attribute: ":a/n", value: number(1.5), entityType: "Thing" }], undefined],
  ];
  for (const [name, ops, meta] of scenarios) {
    const before = updates.length;
    yield* t.transact(ops, meta);
    const u = updates.slice(before);
    console.log(name.padEnd(42), "updates:", u.length, "triples in one SPARQL UPDATE (data+journal+claim+operation+meta):", u.map(countRows).join(","), JSON.stringify(subjectKinds(u[0]!)));
  }
});
await Effect.runPromise(program.pipe(Effect.provide(makeQleverRuntime({ url: "http://127.0.0.1:1" }).layer({ scope: DatabaseScope.test("count"), capabilities: Capabilities.none })), Effect.scoped));
