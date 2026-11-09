import { Effect } from "effect";
import { expect } from "vitest";
import type { ResolvedTemporalBasis } from "@triplex-build/triplex";
import type { DatomicClient } from "../src/DatomicClient.js";
import { makeDatomicQueryExecutor } from "../src/DatomicQueryExecutor.js";

// [EXP-DA01] Why: generate equivalent EDN surfaces and observe the actual classified route and IDs before/after retirement (V-DA01 R2-F1). Rejected: parser-only assertions or comparing counts while executing different clauses.
export async function canonicalQueryProperties(
  client: DatomicClient,
  db: string,
  scope: string,
  phase: string,
  cuts: readonly { name: string; basis: ResolvedTemporalBasis; live: boolean }[],
  record: (entry: unknown) => void,
) {
  let observations = 0;
  for (const cut of cuts) {
    const rows = await client.rows(db, { pattern: { attribute: ":matrix" }, basis: cut.basis });
    const expected = rows.map((r) => r.id).sort();
    const n = (v: number | undefined) => (v === undefined ? "nil" : `${v}.0`);
    for (let seed = 0; seed < 24; seed++)
      for (const live of [false, true]) {
        const f = `?fact${seed}`,
          id = `?id${seed}`,
          attr = live ? ":f/live" : ":f/subject";
        const identity = `[${f} :f/id ${id}]`,
          selection = `[${f} ${attr} _]`;
        const nested = `(or-join [${f}] (and ${selection} (or-join [${f}] ${selection})))`;
        const clauses = [
          identity,
          seed % 2 ? nested : selection,
          `[${f} :f/attr ?attribute${seed}]`,
          `[?attribute${seed} :triplex.attr/key ":matrix"]`,
          `[(triplex.gateway.query/visible $ ${f} ${n(cut.basis.validAt)} ${n(cut.basis.recordedAt)} ${cut.basis.recordedPosition ?? "nil"})]`,
        ];
        if (seed % 3 === 0) [clauses[0], clauses[2]] = [clauses[2]!, clauses[0]!];
        const variants = [
          `[:find ${id} :in $ $rules :where ${clauses.join(" ")}]`,
          `[:find ${id} :in $ $rules :where ${clauses[0]} :where ${clauses.slice(1).join(" ")}]`,
          `[:where ${clauses.join(" ")} :in $ $rules :in $ $rules :find ${id} :find ${id}]`,
          `{:find [${id}] :in [$ $rules] :where [${clauses.join(" ")}]}`,
          `{:where (${clauses.join(" ")}) :in ($ $rules) :find (${id})}`,
          `[:find ${id} :in $ $rules ${clauses.map((c) => `:where ${c}`).join(" ")} :in $ $rules]`,
        ];
        const edn = variants[seed % variants.length]!;
        const eligible = !live || cut.live;
        let outcome: unknown;
        try {
          const response = await client.request<{ route: string; rows: { v: string }[][] }>(
            "POST",
            `/v1/db/${db}/q`,
            { edn, relations: [], basis: cut.basis },
          );
          outcome = response;
          expect(eligible).toBe(true);
          expect(response.route).toBe(live ? "live" : "history");
          expect(response.rows.map((r) => r[0]!.v).sort()).toEqual(expected);
        } catch (error) {
          outcome = { code: (error as { code?: string }).code, message: String(error) };
          if (eligible) throw error;
          expect(error).toMatchObject({ code: "BasisNotAvailable" });
        } finally {
          record({
            kind: "canonical-query-property",
            phase,
            cut: cut.name,
            basis: cut.basis,
            seed,
            live,
            eligible,
            edn,
            expected,
            outcome,
          });
          observations++;
        }
      }
    // [EXP-DA01] Why: nested Triplex rules share the canonical gateway grammar but are evaluated by the existing bounded frontier. Rejected: enabling unbounded native % rules to test parser normalization.
    const q = makeDatomicQueryExecutor(client, scope);
    for (let seed = 0; seed < 4; seed++) {
      const s = `?s${seed}`,
        t = `?t${seed}`,
        m = `?m${seed}`,
        rule = `reach${seed}`;
      const rules = [
        { name: rule, body: [[s, ":matrix", t]] },
        {
          name: rule,
          body: [
            [s, ":matrix", m],
            [rule, m, t],
          ],
        },
      ];
      if (seed % 2) rules.reverse();
      const response = await Effect.runPromise(
        q.execute({ find: [t], where: [[rule, s, t]], rules }, false, cut.basis),
      );
      expect(response.results.map((r) => String(r[t])).sort()).toEqual(expected);
      record({
        kind: "canonical-rule-property",
        phase,
        cut: cut.name,
        basis: cut.basis,
        seed,
        expected,
        response,
      });
      observations++;
    }
    const invalid = [
      "[:find ?id :in $ $rules :where [$rules ?f :f/live _] [$rules ?f :f/id ?id] :in $rules $]",
      "[:find ?f :in $ $rules :where [?f :f/id ?id] :find ?id :where [?f :f/live _]]",
      "[:find ?id :in $ $rules :where [?f :f/id ?id] :rules [[(outer ?f) (inner ?f)] [(inner ?f) [?f :f/live _]]]]",
      "[:find (pull ?f [:f/live {:f/subject [:triplex.entity/id]}]) :in $ $rules :where [?f :f/id ?id]]",
      "[:find ?id :in $ $rules :where [?f :f/id ?id]] [:find ?other]",
    ];
    for (const edn of invalid) {
      let outcome: unknown;
      try {
        await client.request("POST", `/v1/db/${db}/q`, { edn, relations: [], basis: cut.basis });
      } catch (error) {
        outcome = {
          status: (error as { status?: number }).status,
          code: (error as { code?: string }).code,
          message: String(error),
        };
      }
      expect(outcome).toMatchObject({ status: 400, code: "InvalidValue" });
      record({
        kind: "canonical-invalid-property",
        phase,
        cut: cut.name,
        basis: cut.basis,
        edn,
        outcome,
      });
      observations++;
    }
  }
  return observations;
}
