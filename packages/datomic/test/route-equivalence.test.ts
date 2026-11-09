import { queryRouteMatrix } from "./query-route-matrix.js";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import type { ResolvedTemporalBasis } from "@triplex-build/triplex";
import { DatabaseScope, type TripleRow } from "@triplex-build/triplex/runtime";
import {
  makeRouteEquivalenceCases,
  canonicalRouteValue,
  type RouteFixture,
  makeRouteEquivalenceScenario,
  type RouteHistoryCommand,
} from "@triplex-build/triplex-testkit";
import { DatomicClient } from "../src/DatomicClient.js";
import { decodeRow, type WireRow } from "../src/protocol.js";
import { makeDatomicStorageAdapter } from "../src/DatomicStorageAdapter.js";

// [EXP-DA01] Why: compare forced native read routes with independent O-REPLAY, then repeat after history moves (Q89f). Rejected: using backend visibility helpers as the oracle.
describe.skipIf(process.env["DATOMIC_INTEGRATION"] !== "1")("Datomic route equivalence", () => {
  it("matches O-REPLAY across seeded source, held, staged and guarded live routes", async () => {
    const seed = 29;
    const scenario = makeRouteEquivalenceScenario(seed);
    const scope = DatabaseScope.test(`routes-${randomUUID()}`),
      client = new DatomicClient(
        process.env["DATOMIC_GATEWAY_URL"] ?? "http://127.0.0.1:8470",
        35000,
      ),
      a = makeDatomicStorageAdapter(client, scope);
    const created = await client.create(scope);
    console.log(JSON.stringify({ kind: "datomic-test-db-created", scope, ...created }));
    const dir = path.resolve(
      process.env["DATOMIC_ROUTE_EVIDENCE_DIR"] ??
        path.resolve(import.meta.dirname, "../../../lab/experiments/EXP-DA01/round4/oracle"),
      `seed-${seed}-${randomUUID()}`,
    );
    fs.mkdirSync(dir, { recursive: true });
    const subjects = scenario.subjects;
    type Command = RouteHistoryCommand;
    const commands: Command[] = [],
      receipts: object[] = [];
    let head = 0;
    async function apply(plans: Command[]) {
      const first = head;
      await Effect.runPromise(
        a.withTransaction(
          Effect.gen(function* () {
            for (const [offset, command] of plans.entries()) {
              const p = yield* a.nextCommitPosition();
              expect(p).toBe(first + offset + 1);
              for (const op of command.operations)
                if (op.op !== "assert") yield* a.retract(op.target, command.clock, `tx-${p}`, p);
                else
                  yield* a.insert(
                    {
                      entityId: op.entityId,
                      attribute: op.attribute,
                      value: op.value,
                      validFrom: op.validFrom,
                      ...(op.validTo === undefined ? {} : { validTo: op.validTo }),
                    },
                    `tx-${p}`,
                    command.clock,
                    op.ref,
                    p,
                  );
            }
          }),
        ),
      );
      for (const command of plans) {
        const index = commands.length;
        head++;
        commands.push(command);
        receipts.push({
          command: index,
          outcome: "committed",
          txId: `tx-${head}`,
          position: head,
          instant: command.clock,
          assertionIds: command.operations.map((op) => (op.op === "assert" ? op.ref : null)),
        });
      }
    }
    const bases = scenario.bases;
    const oracle = (label: string) => {
      const queries = bases.flatMap((basis, b) =>
        subjects.map((entityId, e) => ({
          id: `${b}-${e}`,
          kind: "history",
          entityId,
          applyValidAt: true,
          cut: {
            validAt: basis.validAt,
            ...(basis.recordedPosition === undefined ? {} : { position: basis.recordedPosition }),
            ...(basis.recordedAt === undefined ? {} : { recordedAt: basis.recordedAt }),
          },
        })),
      );
      const input = path.join(dir, `${label}.case.json`),
        output = path.join(dir, `${label}.expected.json`);
      fs.writeFileSync(
        input,
        JSON.stringify(
          {
            format: "triplex-db-2/o-replay-case/1",
            caseId: `DA01-r3-seed-${seed}`,
            defaultScope: scope,
            adapter: { schemaVersion: 1 },
            commands,
            receipts,
            queries,
          },
          null,
          2,
        ) + "\n",
        { flag: "wx" },
      );
      const result = spawnSync(
        "python3",
        ["-I", "lab/oracles/replay/cli.py", input, "-o", output],
        { cwd: path.resolve(import.meta.dirname, "../../.."), encoding: "utf8" },
      );
      if (result.status !== 0)
        throw new Error(`O-REPLAY failed: ${result.status} ${result.stderr}`);
      const report = JSON.parse(fs.readFileSync(output, "utf8"));
      expect(report.verdict).toBe("PASS");
      return bases.map((_, b) =>
        report.queries
          .filter((q: { id: string }) => q.id.startsWith(`${b}-`))
          .flatMap((q: { result: { asOfSnapshot: Record<string, unknown>[] } }) =>
            q.result.asOfSnapshot
              .filter((r) => r["retractedAt"] === null)
              .map((r) => {
                const value = r["value"] as { value: number };
                return {
                  id: r["id"],
                  entity_id: r["entityId"],
                  attribute: r["attribute"],
                  value_type: "number",
                  value_string: null,
                  value_number: value.value,
                  value_datetime: null,
                  value_boolean: null,
                  value_json: null,
                  valid_from: r["validFrom"],
                  valid_to: r["validTo"],
                  recorded_at: r["recordedAt"],
                  recorded_position: r["recordedPosition"],
                  created_by: r["createdBy"],
                  entity_type: r["entityType"],
                  schema_version: r["schemaVersion"],
                  tx_id: r["txId"],
                  retracted_at: r["retractedAt"],
                  retracted_position: r["retractedPosition"],
                  retract_tx_id: r["retractTxId"],
                } as TripleRow;
              }),
          ),
      );
    };
    const trace: unknown[] = [];
    const readsFile = path.join(dir, "reads.jsonl");
    fs.writeFileSync(readsFile, "", { flag: "wx" });
    try {
      for (const group of scenario.groups) await apply([...group]);
      const expected = oracle("before");
      const read = async (
        id: string,
        basis: ResolvedTemporalBasis,
        extra: Record<string, unknown> = {},
      ) => {
        let response: { rows: WireRow[]; route: string; basis: ResolvedTemporalBasis };
        try {
          response = await client.request<typeof response>("POST", `/v1/db/${created.db}/read`, {
            entityIds: subjects,
            basis,
            ...extra,
          });
          fs.appendFileSync(
            readsFile,
            canonicalRouteValue({ requested: id, basis, response }) + "\n",
          );
        } catch (error) {
          fs.appendFileSync(
            readsFile,
            canonicalRouteValue({
              requested: id,
              basis,
              refusal:
                error && typeof error === "object" && "code" in error ? error.code : String(error),
            }) + "\n",
          );
          throw error;
        }
        const actual =
          id === "source"
            ? basis.recordedPosition !== undefined && basis.recordedPosition < head
              ? "as-of"
              : "source"
            : id;
        expect(response.route).toBe(actual);
        trace.push({ requested: id, actual: response.route, basis });
        return { rows: response.rows.map(decodeRow), route: id, basis: response.basis };
      };
      const routes: RouteFixture<TripleRow, ResolvedTemporalBasis>[] = [
        {
          id: "source",
          eligible: () => true,
          refusals: [],
          read: (basis) => read("source", basis),
        },
        {
          id: "held",
          eligible: () => true,
          refusals: [],
          read: async (basis) => {
            const snapshot = await client.begin(created.db, basis);
            try {
              return await read("held", basis, { handle: snapshot.handle });
            } finally {
              await client.release(created.db, snapshot.handle);
            }
          },
        },
        {
          id: "staged",
          eligible: () => true,
          refusals: [],
          read: async (basis) => {
            let rows: Awaited<ReturnType<typeof read>> | undefined;
            const original = client.request.bind(client);
            client.request = async <A>(
              method: "GET" | "POST",
              url: string,
              input?: unknown,
              timeout?: number,
            ): Promise<A> => {
              const result = await original<A>(method, url, input, timeout);
              if (url.endsWith("/read")) {
                const r = result as { route: string; basis: ResolvedTemporalBasis };
                fs.appendFileSync(
                  readsFile,
                  canonicalRouteValue({ requested: "staged", response: result }) + "\n",
                );
                expect(r.route).toBe("staged");
                trace.push({ requested: "staged", actual: r.route, basis: r.basis });
              }
              return result;
            };
            try {
              await Effect.runPromise(
                a
                  .withTransaction(
                    Effect.gen(function* () {
                      const p = yield* a.nextCommitPosition();
                      yield* a.insert(
                        {
                          entityId: "unselected",
                          attribute: ":value",
                          value: { type: "number", value: 999 },
                          validFrom: 0,
                        },
                        "uncommitted",
                        10000,
                        "uncommitted",
                        p,
                      );
                      const result = yield* a.getByEntities(subjects, basis);
                      rows = { rows: [...result.values()].flat(), route: "staged", basis };
                      return yield* Effect.fail("rollback-fixture");
                    }),
                  )
                  .pipe(Effect.flip),
              );
            } finally {
              client.request = original;
            }
            if (!rows) throw new Error("Staged fixture did not read");
            return rows;
          },
        },
        {
          id: "live",
          eligible: (basis) =>
            basis.recordedAt === undefined &&
            !scenario.interiorPositions.includes(basis.recordedPosition ?? -1),
          refusals: ["BasisNotAvailable"],
          read: (basis) => read("live", basis, { route: "live" }),
        },
      ];
      const cases = makeRouteEquivalenceCases({
        seed,
        bases,
        routes,
        oracle: async (basis) => expected[bases.indexOf(basis)]!,
        advance: () =>
          apply([
            {
              clock: 10000 + head,
              operations: [
                {
                  op: "assert",
                  ref: `advance-${head}`,
                  entityId: "unselected",
                  attribute: ":value",
                  value: { type: "number", value: head },
                  validFrom: 0,
                },
              ],
            },
          ]),
      });
      const outcomes = [];
      for (const test of cases) outcomes.push({ name: test.name, observations: await test.run() });
      const after = oracle("after");
      expect(after.map((r) => r.map(canonicalRouteValue).sort())).toEqual(
        expected.map((r) => r.map(canonicalRouteValue).sort()),
      );
      const queryMatrix = await queryRouteMatrix(client, created.db, scope, (observation) =>
        fs.appendFileSync(readsFile, canonicalRouteValue(observation) + "\n"),
      );
      fs.writeFileSync(
        path.join(dir, "routes.json"),
        JSON.stringify({ seed, head, bases, outcomes, trace, queryMatrix }, null, 2) + "\n",
        { flag: "wx" },
      );
      console.log(
        JSON.stringify({
          kind: "datomic-route-equivalence",
          seed,
          bases: bases.length,
          oracleBefore: 40,
          commitsAfter: head,
          output: dir,
          observations: outcomes.reduce((n, r) => n + r.observations.length, 0),
        }),
      );
    } finally {
      if (!fs.existsSync(path.join(dir, "routes.json")))
        fs.writeFileSync(
          path.join(dir, "routes.json"),
          JSON.stringify({ seed, head, bases, trace, completed: false }, null, 2) + "\n",
          { flag: "wx" },
        );
      const deleted = await client.delete(scope);
      console.log(JSON.stringify({ kind: "datomic-test-db-deleted", scope, ...deleted }));
      client.close();
      expect(deleted.deleted).toBe(true);
    }
  }, 120000);
});
