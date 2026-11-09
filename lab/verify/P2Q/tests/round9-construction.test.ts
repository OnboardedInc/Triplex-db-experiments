// [EXP-P2Q] Why: challenge both resolved public types and actual runtime inheritance, using the reviewer's added read.
// Rejected: direct AST member inventories (both heritage and declaration merging escaped them).
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import ts from "typescript";
import { Effect } from "effect";
import { expect, it } from "vitest";
import {
  DatabaseScope,
  constructSnapshotReads,
  isTriplesRead,
} from "@triplex-build/triplex/runtime";
import { makeQleverNativeQueries, isQleverNativeRead } from "../../../../packages/qlever/src/native/NativeQueries.js";
import { graphIri } from "../../../../packages/qlever/src/rdf.js";
import { ModelReplica, openRt, freshDir, ops, attempt, at, REPO, writeJson } from "./harness.js";

import { isQleverBrokerRead } from "../../../../packages/qlever/src/broker/BrokerStorageAdapter.js";
import { isQleverExecutorRead } from "../../../../packages/qlever/src/QleverQueryExecutor.js";

const exemptions = {
  triples: [
    "assert",
    "assertBatch",
    "retract",
    "retractByPattern",
    "transact",
    "currentPosition",
    "explain",
    "explainPage",
  ],
  adapter: [
    "withTransaction",
    "nextCommitPosition",
    "claimCommand",
    "insert",
    "batchInsert",
    "retract",
    "initialize",
    "close",
    "currentCommitPosition",
    "resolveQueryBasis",
  ],
  executor: ["explain", "explainPage"],
  native: [],
};
const inspect = (object: object, exempt: readonly string[], isRead: (value: unknown) => boolean) => {
  const reads: string[] = [];
  for (let current: object | null = object; current; current = Object.getPrototypeOf(current))
    for (const key of Reflect.ownKeys(current)) {
      const descriptor = Object.getOwnPropertyDescriptor(current, key)!;
      if (descriptor.get || descriptor.set)
        throw new Error(`unconstructed accessor: ${String(key)}`);
      if (typeof descriptor.value === "function" && !exempt.includes(String(key))) {
        if (!isRead(descriptor.value))
          throw new Error(`unconstructed read: ${String(key)}`);
        reads.push(String(key));
      }
    }
  return reads.sort();
};

it("round9 actual public surfaces have only table-wrapped reads throughout own properties and the whole prototype chain", async () => {
  const scope = DatabaseScope.test(`round9-construction:${randomUUID()}`),
    replica = new ModelReplica(graphIri(scope));
  const rt = await openRt(
    freshDir("round9-construction"),
    scope,
    replica,
    { autoApply: false },
    { basisWaitMs: 40 },
  );
  try {
    await rt.run(rt.triples.transact(ops("s:round9", 1, "first")));
    const native = makeQleverNativeQueries(replica, scope, { awaitBasisMs: 40 });
    const validators = { triples: isTriplesRead, adapter: isQleverBrokerRead, executor: isQleverExecutorRead, native: isQleverNativeRead };
    const surfaces = { triples: rt.triples, adapter: rt.adapter, executor: rt.executor, native };
    const observations: any[] = [];
    for (const [name, object] of Object.entries(surfaces)) {
      const reads = inspect(object, exemptions[name as keyof typeof exemptions], validators[name as keyof typeof validators]);
      expect(reads.length).toBeGreaterThan(0);
      expect(Object.isFrozen(object)).toBe(true);
      expect(Object.getPrototypeOf(object)).toBeNull();
      // Same runtime body as the reviewer; the addition must never escape the wrapper guard.
      const round9Read = (_basis?: { recordedPosition: number; validAt: number }) =>
        Effect.succeed([]);
      for (const kind of ["own", "inherited"] as const) {
        const probe =
          kind === "own"
            ? Object.assign(Object.create(null), object, { round9Read })
            : Object.assign(Object.create({ round9Read }), object);
        expect(() => inspect(probe, exemptions[name as keyof typeof exemptions], validators[name as keyof typeof validators])).toThrow(
          "unconstructed read: round9Read",
        );
        observations.push({
          name,
          kind,
          requested: rt.broker.head() + 4096,
          observed: rt.broker.head(),
          rejected: true,
          reads,
        });
      }
    }
    const original = (await rt.run(rt.adapter.getByEntity("s:round9")))[0]!;
    const retired = {
      ...original,
      retracted_at: Date.now(),
      retracted_position: rt.broker.head() + 4096,
      retract_tx_id: "later",
    };
    const added = constructSnapshotReads(
      {
        round9Read: {
          run: (_basis: ReturnType<typeof at>) => Effect.succeed([retired]),
          basis: (basis: ReturnType<typeof at>) => basis,
          rawHistory: false,
        },
      },
      rt.adapter.snapshotReadPolicy!,
    );
    const failure = await attempt(rt, added.round9Read(at(rt.broker.head() + 4096)));
    expect(failure.ok).toBe(false);
    expect(failure.error).toMatchObject({
      reason: "basis-not-reached",
      required: rt.broker.head() + 4096,
      observed: rt.broker.durable().lsn * 1024 + 1023,
      replica: "the broker's resolved prefix",
    });
    const masked = await rt.run(added.round9Read(at(rt.broker.head())));
    expect(masked).toEqual([
      { ...retired, retracted_at: null, retracted_position: null, retract_tx_id: null },
    ]);
    expect(retired.retract_tx_id).toBe("later");
    writeJson("round9-construction-policy.json", { failure, retired, masked });
    writeJson("round9-runtime-construction.json", observations);
  } finally {
    await rt.dispose();
    await rt.broker.close();
  }
});

const field =
  "readonly round9Read: (basis?: { readonly recordedPosition: number; readonly validAt: number }) => Effect.Effect<readonly Triple[], ReadError>;";
it.each(["baseline", "direct", "inherited", "merged"])(
  "round9 resolved public type/table equality rejects the reviewer's %s addition",
  (kind) => {
    const configPath = path.join(REPO, "lab/verify/P2Q/tsconfig.round9.json");
    const parsed = ts.getParsedCommandLineOfConfigFile(configPath, {}, ts.sys as any)!;
    const contract = path.join(REPO, "packages/core/src/store/Triples.ts");
    const implementation = path.join(REPO, "packages/core/src/store/TriplesLive.ts");
    let source = fs.readFileSync(contract, "utf8");
    if (kind === "direct")
      source = source.replace(
        "export interface TriplesService {",
        `export interface TriplesService {\n ${field}`,
      );
    if (kind === "inherited")
      source = source.replace(
        "export interface TriplesService {",
        `export interface Round9AdditionalReads { ${field} }\nexport interface TriplesService extends Round9AdditionalReads {`,
      );
    if (kind === "merged") source += `\nexport interface TriplesService { ${field} }\n`;
    const host = ts.createCompilerHost(parsed.options);
    const read = host.readFile.bind(host);
    host.readFile = (file) => {
      if (file === contract) return source;
      if (file === implementation && kind !== "baseline") {
        const original = read(file)!;
        const mutated = original.replace(
          /^(\s*)assert: assert_,/m,
          "$1round9Read: (_basis?: { readonly recordedPosition: number; readonly validAt: number }) => Effect.succeed([]),\n$1assert: assert_,",
        );
        expect(mutated).not.toBe(original);
        return mutated;
      }
      return read(file);
    };
    const program = ts.createProgram(parsed.fileNames, parsed.options, host);
    const checker = program.getTypeChecker();
    const declaration = program
      .getSourceFile(contract)!
      .statements.find(
        (node) => ts.isInterfaceDeclaration(node) && node.name.text === "TriplesService",
      )!;
    const names = checker
      .getPropertiesOfType(checker.getTypeAtLocation(declaration))
      .map((symbol) => symbol.name);
    const typeFile = program.getSourceFile(path.join(REPO, "lab/verify/P2Q/types/round9.ts"))!;
    const implementationSource = program.getSourceFile(implementation)!;
    expect(implementationSource.text.includes("round9Read:")).toBe(kind !== "baseline");
    const implementationDiagnostics = program
      .getSemanticDiagnostics(implementationSource)
      .map((d) => ts.flattenDiagnosticMessageText(d.messageText, "\n"));
    const diagnostics = program
      .getSemanticDiagnostics(typeFile)
      .map((d) => ts.flattenDiagnosticMessageText(d.messageText, "\n"));
    expect(names.includes("round9Read")).toBe(kind !== "baseline");
    if (kind === "baseline") {
      expect(diagnostics).toEqual([]);
      expect(implementationDiagnostics).toEqual([]);
    } else {
      expect(diagnostics.join("\n")).toContain('"round9Read"');
      expect(implementationDiagnostics.join("\n")).toContain("round9Read");
    }
    writeJson(`round9-type-${kind}.json`, {
      kind,
      field,
      names,
      diagnostics,
      implementationDiagnostics,
      implementationSource: implementationSource.text,
      source,
    });
  },
);
