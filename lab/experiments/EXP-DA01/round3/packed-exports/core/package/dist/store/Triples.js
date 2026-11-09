import { Context } from "effect";
//#region src/store/Triples.ts
/**
* Triples — the one service of the triple store.
*
* Writes, triple-pattern reads, and Datalog queries share one coherent service:
*
* ```ts
* const person = EntityId.make("p1")
* yield* triples.assert({ entityId: person, attribute: ":name", value: { type: "string", value: "Alice" } })
* const facts = yield* triples.match({ entityId: person })             // triple pattern read
* const { results } = yield* triples.query({ find: ["?n"], where: [["?p", ":name", "?n"]] }) // datalog read
* ```
*
* `SnapshotService`, `SubscriptionManager`, and `DatabaseManager`
* remain separate optional services — they have genuinely independent consumers.
*/
/**
* The `Triples` service tag.
*
* Namespaced so the bare id can't collide with another library's tag when they
* share an Effect context.
*/
var Triples = class extends Context.Service()("triplex/Triples") {};
//#endregion
export { Triples };

//# sourceMappingURL=Triples.js.map