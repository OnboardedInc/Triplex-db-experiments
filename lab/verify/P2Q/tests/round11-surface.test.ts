// [CX-VP2Q-11] Why: compare resolved public keys with real services and apply the original guard to each extension route.
// Rejected: comparing a helper's inferred keys with itself (does not check the public factories).
import fs from "node:fs";
import ts from "typescript";
import { Effect } from "effect";
import { expect, it } from "vitest";
import { DatabaseScope, createReadConstructor, isTriplesRead } from "@triplex-build/triplex/runtime";
import { makeQleverNativeQueries, isQleverNativeRead } from "../../../../packages/qlever/src/native/NativeQueries.js";
import { isQleverBrokerRead } from "../../../../packages/qlever/src/broker/BrokerStorageAdapter.js";
import { isQleverExecutorRead } from "../../../../packages/qlever/src/QleverQueryExecutor.js";
import { graphIri } from "../../../../packages/qlever/src/rdf.js";
import { REPO, ModelReplica, openRt, freshDir, ops, writeJson } from "./harness.js";

const guardBytes = fs.readFileSync(`${REPO}/lab/verify/P2Q/tests/round9-construction.test.ts`, "utf8");
const guardSource = ts.createSourceFile("guard.ts", guardBytes, ts.ScriptTarget.Latest, true);
const declaration = guardSource.statements.filter(ts.isVariableStatement)
  .flatMap(s => [...s.declarationList.declarations]).find(d => d.name.getText(guardSource) === "inspect")!;
const inspect = Function(ts.transpile(`const ${declaration.getText(guardSource)}; return inspect;`))();
const exemptions = {
  triples: ["assert", "assertBatch", "retract", "retractByPattern", "transact", "currentPosition", "explain", "explainPage"],
  adapter: ["withTransaction", "nextCommitPosition", "claimCommand", "insert", "batchInsert", "retract", "initialize", "close", "currentCommitPosition", "resolveQueryBasis"],
  executor: ["explain", "explainPage"], native: [],
};
const validators = { triples: isTriplesRead, adapter: isQleverBrokerRead, executor: isQleverExecutorRead, native: isQleverNativeRead };

it("round11 resolved public keys equal real runtime keys across all four services", async () => {
  const config = ts.getParsedCommandLineOfConfigFile(`${REPO}/lab/verify/P2Q/tsconfig.round10.json`, {}, ts.sys as any)!;
  const program = ts.createProgram(config.fileNames, config.options), checker = program.getTypeChecker();
  const properties = (file: string, name: string, factory = false) => {
    const source = program.getSourceFile(`${REPO}/${file}`)!;
    const node = factory ? source.statements.filter(ts.isVariableStatement).flatMap(s => [...s.declarationList.declarations]).find(d => d.name.getText(source) === name)!
      : source.statements.find(n => ts.isInterfaceDeclaration(n) && n.name.text === name)!;
    expect(program.getSemanticDiagnostics(source)).toEqual([]);
    const type = checker.getTypeAtLocation(node);
    return checker.getPropertiesOfType(factory ? type.getCallSignatures()[0]!.getReturnType() : type);
  };
  const types = {
    triples: properties("packages/core/src/store/Triples.ts", "TriplesService"),
    adapter: properties("packages/qlever/src/broker/BrokerStorageAdapter.ts", "QleverBrokerStorageAdapterService"),
    executor: properties("packages/core/src/storage/QueryExecutor.ts", "QueryExecutorService"),
    native: properties("packages/qlever/src/native/NativeQueries.ts", "makeQleverNativeQueries", true),
  };
  const scope = DatabaseScope.test(`round11-keys:${crypto.randomUUID()}`), replica = new ModelReplica(graphIri(scope));
  const rt = await openRt(freshDir("round11-keys"), scope, replica);
  try {
    const surfaces = { triples: rt.triples, adapter: rt.adapter, executor: rt.executor, native: makeQleverNativeQueries(replica, scope) };
    const observations: unknown[] = [];
    for (const name of Object.keys(surfaces) as (keyof typeof surfaces)[]) {
      const surface = surfaces[name];
      const missing = types[name].filter(p => !Reflect.ownKeys(surface).includes(p.name));
      // [CX-VP2Q-11] Why: the sole absent optional non-read hook is a declared portable-fallback capability.
      // Rejected: silently ignoring every optional key (could hide a new callable read).
      expect(missing.map(p => p.name)).toEqual(name === "adapter" ? ["validateConstraints"] : []);
      for (const p of missing) expect(Boolean(p.flags & ts.SymbolFlags.Optional)).toBe(true);
      const expected = types[name].filter(p => !missing.includes(p)).map(p => p.name);
      expect(new Set(Reflect.ownKeys(surface))).toEqual(new Set(expected));
      const reads = inspect(surface, exemptions[name], validators[name]);
      expect(reads).toHaveLength({ triples: 14, adapter: 6, executor: 2, native: 2 }[name]);
      observations.push({ name, typed: types[name].map(p => p.name), runtime: Reflect.ownKeys(surface), absentOptionalNonReads: missing.map(p => p.name), reads });
    }
    writeJson("round11-public-runtime-keys.json", observations);
  } finally { await rt.dispose(); await rt.broker.close(); }
});

it("round11 every raw or foreign extension is rejected on each actual public service", async () => {
  const scope = DatabaseScope.test(`round11-extensions:${crypto.randomUUID()}`), replica = new ModelReplica(graphIri(scope));
  const rt = await openRt(freshDir("round11-extensions"), scope, replica);
  try {
    await rt.run(rt.triples.transact(ops("s:r11", 1, "first")));
    const surfaces = { triples: rt.triples, adapter: rt.adapter, executor: rt.executor, native: makeQleverNativeQueries(replica, scope) };
    const symbol = Symbol("round11Read"), raw = () => Effect.succeed([]);
    const foreign = createReadConstructor().dispatch({ read: () => [] }, raw).read;
    const observations: unknown[] = [];
    for (const name of Object.keys(surfaces) as (keyof typeof surfaces)[]) {
      const surface = surfaces[name], valid = validators[name], exempt = exemptions[name];
      const own = () => Object.assign(Object.create(null), surface);
      const inherited = (key: PropertyKey, value: unknown, hidden = false) => Object.defineProperties(Object.create(Object.defineProperty(Object.create(null), key, { value, enumerable: !hidden })), Object.getOwnPropertyDescriptors(surface));
      class Base { round11Read = raw; }
      class Child extends Base { [symbol]() { return raw(); } }
      const variants: Record<string, () => object> = {
        own: () => Object.assign(own(), { round11Read: raw }),
        symbol: () => Object.assign(own(), { [symbol]: raw }),
        hidden: () => Object.defineProperty(own(), "round11Read", { value: raw }),
        hiddenSymbol: () => Object.defineProperty(own(), symbol, { value: raw }),
        inherited: () => inherited("round11Read", raw),
        inheritedSymbol: () => inherited(symbol, raw),
        hiddenInheritedSymbol: () => inherited(symbol, raw, true),
        ownGetter: () => Object.defineProperty(own(), "round11Read", { get: () => raw }),
        symbolGetter: () => Object.defineProperty(own(), symbol, { get: () => raw }),
        inheritedGetter: () => Object.assign(Object.create(Object.defineProperty(Object.create(null), symbol, { get: () => raw })), surface),
        deep: () => Object.assign(Object.create(Object.create({ round11Read: raw })), surface),
        class: () => Object.assign(new Child(), surface),
        foreign: () => Object.assign(own(), { round11Read: foreign }),
        foreignSymbol: () => Object.assign(own(), { [symbol]: foreign }),
      };
      // [CX-VP2Q-11] Why: a legitimate own wrapper must not hide an unconstructed method at the same inherited key.
      // Rejected: deduplicating keys before walking descriptors (round-ten guard did that).
      const readKey = Reflect.ownKeys(surface).find(k => valid((surface as any)[k]))!;
      variants.shadowed = () => inherited(readKey, raw);
      variants.shadowedForeign = () => inherited(readKey, foreign);
      variants.shadowedGetter = () => Object.defineProperties(Object.create(Object.defineProperty(Object.create(null), readKey, { get: () => raw })), Object.getOwnPropertyDescriptors(surface));
      for (const other of Object.keys(surfaces) as (keyof typeof surfaces)[]) {
        if (other === name) continue;
        const method = Reflect.ownKeys(surfaces[other]).map(k => (surfaces[other] as any)[k]).find(validators[other]);
        expect(validators[other](method)).toBe(true);
        expect(valid(method)).toBe(false);
        variants[`crossService-${other}`] = () => Object.assign(own(), { [symbol]: method });
      }
      for (const [route, build] of Object.entries(variants)) {
        expect(() => inspect(build(), exempt, valid), `${name}/${route}`).toThrow(/unconstructed (read|accessor):/);
        observations.push({ name, route, rejected: true });
      }
      for (const change of [() => Object.assign(surface, { round11Read: raw }), () => Object.defineProperty(surface, symbol, { value: raw }), () => Object.setPrototypeOf(surface, { round11Read: raw })]) expect(change).toThrow(TypeError);
    }
    expect(observations).toHaveLength(80);
    writeJson("round11-extension-routes.json", observations);
  } finally { await rt.dispose(); await rt.broker.close(); }
});
