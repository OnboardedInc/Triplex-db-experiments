// [EXP-P2Q] Why: exercise the exact descriptor guard with foreign constructors and all runtime key kinds.
// Rejected: treating any generic constructor marker as proof of the native service's policies.
import fs from "node:fs";
import { createHash, randomUUID } from "node:crypto";
import ts from "typescript";
import { Effect } from "effect";
import { expect, it } from "vitest";
import {
  DatabaseScope,
  createReadConstructor,
  constructSnapshotReads,
  constructReadDispatch,
  constructReadSurface,
  exactReadService,
} from "@triplex-build/triplex/runtime";
import {
  makeQleverNativeQueries,
  isQleverNativeRead,
} from "../../../../packages/qlever/src/native/NativeQueries.js";
import { graphIri } from "../../../../packages/qlever/src/rdf.js";
import { REPO, ModelReplica, writeJson, openRt, freshDir, ops, at, attempt } from "./harness.js";
const bytes = fs.readFileSync(`${REPO}/lab/verify/P2Q/tests/round9-construction.test.ts`, "utf8");
const source = ts.createSourceFile("guard.ts", bytes, ts.ScriptTarget.Latest, true);
const declaration = source.statements
  .filter(ts.isVariableStatement)
  .flatMap((s) => [...s.declarationList.declarations])
  .find((d) => d.name.getText(source) === "inspect")!;
const inspect = Function(
  ts.transpile(`const ${declaration.getText(source)}; return inspect;`),
)() as (o: object, exempt: readonly string[], isRead: (value: unknown) => boolean) => string[];
const guardSha256 = createHash("sha256").update(bytes).digest("hex");
const authority = createReadConstructor();
const raw = (_basis?: unknown) => Effect.succeed([]);
const wrapped = authority.snapshot(
  { good: { run: raw, basis: () => undefined, rawHistory: false } },
  { wrap: (e) => e },
);
const sym = Symbol("round10Read");
const routes = [
  {
    name: "subclass",
    build: () => {
      class Base {}
      class Child extends Base {
        round10Read = raw;
      }
      return Object.assign(new Child(), wrapped);
    },
  },
  {
    name: "subclass-prototype",
    build: () => {
      class Base {}
      class Child extends Base {
        round10Read() {
          return raw();
        }
      }
      return Object.assign(new Child(), wrapped);
    },
  },
  {
    name: "mixin",
    build: () => {
      class Base {}
      const M = (B: typeof Base) =>
        class extends B {
          round10Read = raw;
        };
      return Object.assign(new (M(Base))(), wrapped);
    },
  },
  {
    name: "assign",
    build: () => Object.assign(Object.create(null), wrapped, { round10Read: raw }),
  },
  { name: "inherited", build: () => Object.assign(Object.create({ round10Read: raw }), wrapped) },
  {
    name: "deep-inherited",
    build: () => Object.assign(Object.create(Object.create({ round10Read: raw })), wrapped),
  },
  {
    name: "getter-function",
    build: () =>
      Object.defineProperty(Object.assign(Object.create(null), wrapped), "round10Read", {
        get: () => raw,
      }),
  },
  {
    name: "inherited-getter",
    build: () =>
      Object.assign(
        Object.create(
          Object.defineProperty(Object.create(null), "round10Read", { get: () => raw }),
        ),
        wrapped,
      ),
  },
  { name: "symbol", build: () => Object.assign(Object.create(null), wrapped, { [sym]: raw }) },
  { name: "inherited-symbol", build: () => Object.assign(Object.create({ [sym]: raw }), wrapped) },
  {
    name: "hidden-symbol",
    build: () =>
      Object.defineProperty(Object.assign(Object.create(null), wrapped), sym, { value: raw }),
  },
  {
    name: "nonenumerable",
    build: () =>
      Object.defineProperty(Object.assign(Object.create(null), wrapped), "round10Read", {
        value: raw,
      }),
  },
];
it.each(routes)("round10 actual guard rejects $name raw callable", ({ name, build }) => {
  expect(() => inspect(build(), [], authority.isRead)).toThrow(/unconstructed (read|accessor):/);
  writeJson(`round10-route-${name}.json`, { name, guardSha256, rejected: true });
});
it("round10 frozen construction rejects late assignment, define and prototype changes", () => {
  for (const change of [
    () => Object.assign(wrapped, { round10Read: raw }),
    () => Object.defineProperty(wrapped, "round10Read", { value: raw }),
    () => Object.setPrototypeOf(wrapped, { round10Read: raw }),
    () => Object.defineProperty(wrapped, sym, { value: raw }),
  ])
    expect(change).toThrow(TypeError);
  expect(inspect(wrapped, [], authority.isRead)).toEqual(["good"]);
});
it("round10 no other constructor can mint native provenance, including a typed symbol read", async () => {
  const scope = DatabaseScope.test(`round10-foreign:${randomUUID()}`);
  const facade = makeQleverNativeQueries(new ModelReplica(graphIri(scope)), scope, {
    awaitBasisMs: 40,
  });
  const builders = [
    constructReadDispatch({ foreign: (basis: { recordedPosition: number }) => [basis] }, raw)
      .foreign,
    constructReadSurface({ foreign: raw }, (f, args) => f(...args)).foreign,
    constructSnapshotReads(
      { foreign: { run: raw, basis: () => undefined, rawHistory: false } },
      { wrap: (e) => e },
    ).foreign,
    createReadConstructor().dispatch({ foreign: () => [] }, raw).foreign,
  ];
  for (const foreign of builders) {
    const extended = exactReadService<typeof facade & { readonly [sym]: typeof foreign }>()({
      ...facade,
      [sym]: foreign,
    });
    expect(isQleverNativeRead(foreign)).toBe(false);
    expect(() => inspect(extended, [], isQleverNativeRead)).toThrow(
      "unconstructed read: Symbol(round10Read)",
    );
  }
  writeJson("round10-foreign-provenance.json", {
    constructorsRejected: builders.length,
    guardSha256,
    symbol: String(sym),
  });
});
it.each(["surface", "dispatch", "snapshot"] as const)(
  "round10 %s carries every string, symbol and hidden table key",
  (kind) => {
    const table = { read: raw, [sym]: raw };
    Object.defineProperty(table, "hidden", { value: raw });
    const ops = Object.fromEntries(
      Reflect.ownKeys(table).map((k) => [
        k,
        { run: (table as any)[k], basis: () => undefined, rawHistory: false },
      ]),
    );
    const actual =
      kind === "surface"
        ? constructReadSurface(table, (f, args) => f(...args))
        : kind === "dispatch"
          ? constructReadDispatch(
              Object.fromEntries(Reflect.ownKeys(table).map((k) => [k, () => []])),
              raw,
            )
          : constructSnapshotReads(ops, { wrap: (e) => e });
    expect(new Set(Reflect.ownKeys(actual))).toEqual(new Set(Reflect.ownKeys(table)));
    for (const key of Reflect.ownKeys(table)) expect(typeof (actual as any)[key]).toBe("function");
    writeJson(`round10-${kind}-keys.json`, { keys: Reflect.ownKeys(actual).map(String) });
  },
);
it("round10 unsupported inherited, accessor and numeric tables are refused before construction", () => {
  for (const build of [
    (t: any) => constructReadSurface(t, (f, args) => f(...args)),
    (t: any) => constructReadDispatch(t, raw),
    (t: any) => constructSnapshotReads(t, { wrap: (e) => e }),
  ]) {
    for (const table of [
      Object.create({ bad: raw }),
      Object.defineProperty({}, "bad", { get: () => raw }),
      { 1: raw },
    ])
      expect(() => build(table)).toThrow(TypeError);
  }
});
it("round10 native public inferred keys equal its actual runtime keys", () => {
  const file = `${REPO}/packages/qlever/src/native/NativeQueries.ts`;
  const config = ts.getParsedCommandLineOfConfigFile(
    `${REPO}/lab/verify/P2Q/tsconfig.round9-final.json`,
    {},
    ts.sys as any,
  )!;
  const program = ts.createProgram(config.fileNames, config.options),
    checker = program.getTypeChecker();
  const source = program.getSourceFile(file)!;
  const factory = source.statements
    .filter(ts.isVariableStatement)
    .flatMap((s) => [...s.declarationList.declarations])
    .find((d) => d.name.getText(source) === "makeQleverNativeQueries")!;
  expect(program.getSemanticDiagnostics(source)).toEqual([]);
  const keys = checker
    .getPropertiesOfType(checker.getTypeAtLocation(factory).getCallSignatures()[0]!.getReturnType())
    .map((p) => p.name);
  const scope = DatabaseScope.test(`round10-keys:${randomUUID()}`),
    facade = makeQleverNativeQueries(new ModelReplica(graphIri(scope)), scope);
  expect(new Set(Reflect.ownKeys(facade))).toEqual(new Set(keys));
  inspect(facade, [], isQleverNativeRead);
  writeJson("round10-native-public-keys.json", { typed: keys, runtime: Reflect.ownKeys(facade) });
});
it("round10 symbol snapshot entry enforces exact basis and retirement mask", async () => {
  const scope = DatabaseScope.test(`round10-symbol:${randomUUID()}`),
    replica = new ModelReplica(graphIri(scope));
  const rt = await openRt(
    freshDir("round10-symbol"),
    scope,
    replica,
    { autoApply: false },
    { basisWaitMs: 40 },
  );
  try {
    await rt.run(rt.triples.transact(ops("s:r10", 1, "first")));
    const row = (await rt.run(rt.adapter.getByEntity("s:r10")))[0]!;
    const retired = {
      ...row,
      retracted_position: 6144,
      retracted_at: Date.now(),
      retract_tx_id: "later",
    };
    const reads = authority.snapshot(
      {
        [sym]: {
          run: (_b: ReturnType<typeof at>) => Effect.succeed([retired]),
          basis: (b: ReturnType<typeof at>) => b,
          rawHistory: false,
        },
      },
      rt.adapter.snapshotReadPolicy!,
    );
    expect(Reflect.ownKeys(reads)).toEqual([sym]);
    expect(authority.isRead(reads[sym])).toBe(true);
    const future = await attempt(rt, reads[sym](at(6144)));
    expect(future.ok).toBe(false);
    expect(future.error).toMatchObject({
      reason: "basis-not-reached",
      required: 6144,
      observed: 3071,
      replica: "the broker's resolved prefix",
    });
    const rows = await rt.run(reads[sym](at(2048)));
    expect(rows).toEqual([
      { ...retired, retracted_at: null, retracted_position: null, retract_tx_id: null },
    ]);
    writeJson("round10-symbol-policy.json", { future, retired, masked: rows });
  } finally {
    await rt.dispose();
    await rt.broker.close();
  }
});
