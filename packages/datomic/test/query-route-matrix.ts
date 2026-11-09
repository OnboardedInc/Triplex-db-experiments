import { canonicalQueryProperties } from "./canonical-query-properties.js";
import { Effect } from "effect";
import { expect } from "vitest";
import type { ResolvedTemporalBasis } from "@triplex-build/triplex";
import type { DatomicClient } from "../src/DatomicClient.js";
import { makeDatomicStorageAdapter } from "../src/DatomicStorageAdapter.js";
import { makeDatomicQueryExecutor } from "../src/DatomicQueryExecutor.js";

// [EXP-DA01] Why: execute every basis family through each query boundary before/after retirement, using history rows as the control (V-DA01 F1/RQ01). Rejected: testing only literal EDN or comparing row counts without IDs.
export async function queryRouteMatrix(
  client: DatomicClient,
  db: string,
  scope: string,
  record: (observation: unknown) => void,
) {
  const a = makeDatomicStorageAdapter(client, scope),
    q = makeDatomicQueryExecutor(client, scope);
  let first = 0,
    interior = 0,
    physical = 0;
  await Effect.runPromise(
    a.withTransaction(
      Effect.gen(function* () {
        first = yield* a.nextCommitPosition();
        for (let i = 0; i < 40; i++)
          yield* a.insert(
            {
              entityId: `matrix-${i}`,
              attribute: ":matrix",
              value: { type: "string", value: `matrix-${i}` },
              validFrom: 0,
              validTo: 100,
            },
            "matrix-assert",
            10,
            `matrix-${i}`,
            first,
          );
      }),
    ),
  );
  await Effect.runPromise(
    a.withTransaction(
      Effect.gen(function* () {
        interior = yield* a.nextCommitPosition();
        physical = yield* a.nextCommitPosition();
      }),
    ),
  );
  const subjects = Array.from({ length: 40 }, (_, i) => `matrix-${i}`);
  const bases: { name: string; basis: ResolvedTemporalBasis; live: boolean; future?: boolean }[] = [
    { name: "latest", basis: { validAt: 30 }, live: true },
    { name: "V-start", basis: { validAt: 0 }, live: true },
    { name: "V-expired", basis: { validAt: 150 }, live: true },
    { name: "P-zero", basis: { validAt: 30, recordedPosition: 0 }, live: true },
    { name: "P-old", basis: { validAt: 30, recordedPosition: first }, live: true },
    { name: "P-interior", basis: { validAt: 30, recordedPosition: interior }, live: false },
    { name: "P-physical", basis: { validAt: 30, recordedPosition: physical }, live: true },
    { name: "T", basis: { validAt: 30, recordedAt: 10 }, live: false },
    { name: "TP", basis: { validAt: 30, recordedAt: 10, recordedPosition: physical }, live: false },
    { name: "TP-zero", basis: { validAt: 30, recordedAt: 10, recordedPosition: 0 }, live: false },
    {
      name: "P-future",
      basis: { validAt: 30, recordedPosition: physical + 1000 },
      live: false,
      future: true,
    },
    {
      name: "TP-future",
      basis: { validAt: 30, recordedAt: 10, recordedPosition: physical + 1000 },
      live: false,
      future: true,
    },
  ];
  const number = (n: number | undefined) =>
    n === undefined ? "nil" : Number.isInteger(n) ? `${n}.0` : String(n);
  const native = async (
    selection: string,
    basis: ResolvedTemporalBasis,
    map = false,
    pin: Record<string, unknown> = {},
  ) => {
    const where = `${selection} [?f :f/id ?id] [?f :f/attr ?attr] [?attr :triplex.attr/key ":matrix"] [(triplex.gateway.query/visible $ ?f ${number(basis.validAt)} ${number(basis.recordedAt)} ${basis.recordedPosition ?? "nil"})]`;
    const edn = map
      ? `{:find [?id] :in [$ $rules] :where [${where}]}`
      : `[:find ?id :in $ $rules :where ${where}]`;
    const result = await client.request<{ rows: { t: string; v: string }[][] }>(
      "POST",
      `/v1/db/${db}/q`,
      { edn, relations: [], basis, basisWaitMs: 10, ...pin },
    );
    return result.rows.map((r) => r[0]!.v).sort();
  };
  const liveId = await client.request<{ rows: { v: string }[][] }>("POST", `/v1/db/${db}/q`, {
    edn: "[:find ?a :in $ $rules :where [?a :db/ident :f/live]]",
    relations: [],
    basis: { validAt: 30 },
  });
  expect(liveId.rows).toHaveLength(1);
  expect(liveId.rows[0]![0]!.v).toMatch(/^[0-9]+$/);
  await expect(
    client.request("POST", `/v1/db/${db}/q`, {
      edn: "[:find ?f :in $rules $ :where [$rules ?f ?a _]]",
      relations: [],
      basis: { validAt: 30, recordedAt: 10 },
    }),
  ).rejects.toMatchObject({ status: 400, code: "InvalidValue" });
  type Path = {
    name: string;
    live?: boolean;
    one?: boolean;
    read: (basis: ResolvedTemporalBasis, pin?: Record<string, unknown>) => Promise<string[]>;
  };
  const ids = (rows: readonly { id: string }[]) =>
    rows
      .map((r) => r.id)
      .filter((id) => id.startsWith("matrix-"))
      .sort();
  const paths: Path[] = [
    {
      name: "adapter-pattern",
      read: async (b) => ids(await Effect.runPromise(a.query({ attribute: ":matrix" }, b))),
    },
    {
      name: "adapter-batch",
      read: async (b) =>
        ids(
          [...(await Effect.runPromise(a.getByEntities(subjects, b)))].flatMap(([, rows]) => rows),
        ),
    },
    {
      name: "compiled",
      read: async (b) =>
        (
          await Effect.runPromise(
            q.execute({ find: ["?v"], where: [["?e", ":matrix", "?v"]] }, false, b),
          )
        ).results
          .map((r) => String(r["?v"]))
          .sort(),
    },
    {
      name: "rules",
      read: async (b) =>
        (
          await Effect.runPromise(
            q.execute(
              {
                find: ["?t"],
                where: [["match", "?s", "?t"]],
                rules: [{ name: "match", body: [["?s", ":matrix", "?t"]] }],
              },
              false,
              b,
            ),
          )
        ).results
          .map((r) => String(r["?t"]))
          .sort(),
    },
    {
      name: "optional",
      read: async (b) =>
        (
          await Effect.runPromise(
            q.execute(
              {
                find: ["?v", "?opt"],
                where: [["?e", ":matrix", "?v"]],
                optionalProjection: {
                  rowBinding: "?e",
                  fields: [{ attribute: ":matrix", variable: "?opt" }],
                },
              },
              false,
              b,
            ),
          )
        ).results
          .map((r) => {
            expect(r["?opt"]).toBe(r["?v"]);
            return String(r["?v"]);
          })
          .sort(),
    },
    { name: "native-history", read: (b, pin) => native("[?f :f/subject _]", b, false, pin) },
    ...Object.entries({
      literal: "[?f :f/live _]",
      numeric: `[?f ${liveId.rows[0]![0]!.v} _]`,
      "ground-history": "[(ground :f/subject) ?a] [?f ?a _]",
      ground: "[(ground :f/live) ?a] [?f ?a _]",
      ident: "[?a :db/ident :f/live] [?f ?a _]",
      source: "[(ground :f/live) ?a] [$ ?f ?a _]",
      omitted: "[?f]",
      nested: "(or-join [?f] (and [(ground :f/live) ?a] [?f ?a _]))",
    }).map(([name, selection]) => ({
      name: `native-${name}`,
      live: true,
      read: (b: ResolvedTemporalBasis, pin?: Record<string, unknown>) =>
        native(selection, b, false, pin),
    })),
    {
      name: "native-map-ground",
      live: true,
      read: (b, pin) => native("[(ground :f/live) ?a] [?f ?a _]", b, true, pin),
    },
    ...["batch", "pattern", "id", "all"].map((kind) => ({
      name: `live-pull-${kind}`,
      live: true,
      one: kind === "id",
      read: async (basis: ResolvedTemporalBasis) =>
        ids(
          await client.rows(db, {
            route: "live",
            basis,
            ...(kind === "batch"
              ? { entityIds: subjects }
              : kind === "pattern"
                ? { pattern: { attribute: ":matrix" } }
                : kind === "id"
                  ? { id: "matrix-0" }
                  : {}),
          }),
        ),
    })),
  ];
  for (const base of paths.filter((p) => p.name.startsWith("native-"))) {
    for (const mode of ["held", "staged"])
      paths.push({
        ...base,
        name: `${mode}/${base.name}`,
        read: async (basis) => {
          const snapshot = await client.begin(db);
          try {
            return await base.read(basis, {
              handle: snapshot.handle,
              ...(mode === "staged"
                ? {
                    staged: {
                      sourceK: snapshot.position,
                      position: snapshot.position + 1,
                      operationId: "matrix-overlay",
                      rows: [],
                      newIds: [],
                      claims: [],
                    },
                  }
                : {}),
            });
          } finally {
            await client.release(db, snapshot.handle);
          }
        },
      });
  }
  const pinned = new Map<string, string[]>();
  let propertyObservations = 0;
  let observations = 0,
    refusals = 0;
  for (const phase of ["before", "after"]) {
    if (phase === "after")
      await Effect.runPromise(
        a.withTransaction(
          Effect.gen(function* () {
            const p = yield* a.nextCommitPosition();
            for (let i = 0; i < 10; i++)
              expect(yield* a.retract(`matrix-${i}`, 20, "matrix-retire", p)).toBe(true);
          }),
        ),
      );
    for (const cut of bases) {
      const expected = cut.future
        ? undefined
        : ids(await client.rows(db, { entityIds: subjects, basis: cut.basis }));
      if (!cut.future) {
        const known =
          cut.name === "P-zero" || cut.name === "TP-zero" || cut.name === "V-expired"
            ? []
            : phase === "after" && ["latest", "V-start"].includes(cut.name)
              ? subjects.slice(10)
              : subjects;
        expect(expected, `history control/${phase}/${cut.name}`).toEqual([...known].sort());
      }
      for (const path of paths) {
        const eligible = !cut.future && (!path.live || cut.live);
        let outcome: unknown;
        try {
          const actual = await path.read(cut.basis);
          outcome = { rows: actual };
          expect(eligible, `${path.name}/${cut.name} must refuse`).toBe(true);
          expect(actual, `${path.name}/${cut.name}`).toEqual(
            path.one ? expected!.filter((id) => id === "matrix-0") : expected,
          );
          if (cut.basis.recordedPosition !== undefined || cut.basis.recordedAt !== undefined) {
            const key = `${path.name}/${cut.name}`;
            if (phase === "before") pinned.set(key, actual);
            else expect(actual).toEqual(pinned.get(key));
          }
        } catch (error) {
          outcome = {
            error: error instanceof Error ? error.message : String(error),
            code: (error as { code?: string }).code,
          };
          if (eligible) throw error;
          expect(error).toMatchObject({ code: "BasisNotAvailable" });
          refusals++;
        } finally {
          observations++;
          record({
            kind: "query-route-matrix",
            phase,
            path: path.name,
            cut: cut.name,
            basis: cut.basis,
            eligible,
            expected: expected ?? null,
            outcome,
          });
        }
      }
    }
    propertyObservations += await canonicalQueryProperties(
      client,
      db,
      scope,
      phase,
      bases.filter((c) => ["latest", "T", "TP", "P-physical", "P-interior"].includes(c.name)),
      record,
    );
  }
  return {
    propertyObservations,
    bases: bases.length,
    paths: paths.map((p) => p.name),
    observations,
    refusals,
  };
}
