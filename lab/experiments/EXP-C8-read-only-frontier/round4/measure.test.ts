import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { Effect } from "effect";
import { it, expect } from "vitest";
import { makeQleverClient } from "../../../../packages/qlever/src/QleverClient.ts";
import { makeQleverQueryExecutor as baseline } from "./baseline-snapshot/packages/qlever/src/QleverQueryExecutor.ts";
import { makeQleverQueryExecutor as integration } from "./integration-snapshot/packages/qlever/src/QleverQueryExecutor.ts";

// [EXP-C8-R4] Why: reuse retained C8 facts without any fixture write or cleanup of shared data.
// Rejected: creating a new graph (confounds the resident-size hypothesis).
const out = "lab/experiments/EXP-C8-read-only-frontier/round4";
const inventory = JSON.parse(readFileSync(`${out}/inventory.json`, "utf8"));
const graph = inventory.find((r: any) => r.name === "c8-graphs").body.results.bindings[0].g.value;
const scope = Buffer.from(graph.split(":").at(-1), "base64url").toString("utf8");
const iri = `<${graph}>`;
const query = {
  find: ["?ancestor"],
  where: [["c8-ancestor", "c8:a", "?ancestor"]],
  rules: [
    { name: "c8-ancestor", body: [["?child", ":c8/parent", "?parent"]] },
    {
      name: "c8-ancestor",
      body: [
        ["?child", ":c8/parent", "?parent"],
        ["c8-ancestor", "?parent", "?ancestor"],
      ],
    },
  ],
} as any;
const raw = makeQleverClient("http://127.0.0.1:7070");
const events: any[] = [];
const put = (e: any) => {
  events.push(e);
  appendFileSync(`${out}/measure-events.jsonl`, JSON.stringify(e) + "\n");
};
const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const transformed = (text: string, variant: string) => {
  if (variant === "dataset") return text.replace(/\bWHERE\b/, `FROM NAMED ${iri} WHERE`);
  if (variant === "unscoped") return text.replaceAll(`GRAPH ${iri} {`, "{");
  return text;
};
it("measures both source revisions and graph scope variants without changing C8 assertions", async () => {
  writeFileSync(`${out}/measure-events.jsonl`, "");
  writeFileSync(
    `${out}/measurement-context.json`,
    JSON.stringify(
      {
        graph,
        scope,
        query,
        baseline: "514c3b6",
        integration: "ec1a815",
        at: new Date().toISOString(),
      },
      null,
      2,
    ) + "\n",
  );
  const info = await raw.query(`SELECT (COUNT(*) AS ?triples) WHERE { GRAPH ${iri} { ?s ?p ?o } }`);
  put({ event: "graph-size", rows: info });
  for (const variant of ["original", "dataset", "unscoped"])
    for (const [branch, build] of [
      ["baseline", baseline],
      ["integration", integration],
    ] as const) {
      let index = 0;
      const label = `${branch}-${variant}`;
      const client = {
        ...raw,
        query: async (text: string, options: any) => {
          const sent = transformed(text, variant);
          const id = `${label}-${++index}`;
          writeFileSync(`${out}/${id}.rq`, sent);
          const started = performance.now();
          put({ event: "start", id, at: new Date().toISOString(), sha256: sha(sent) });
          try {
            const rows = await raw.query(sent, { ...options, queryId: `c8-r4-${id}` });
            put({ event: "end", id, ms: performance.now() - started, rows: rows.length });
            return rows;
          } catch (error) {
            put({ event: "error", id, ms: performance.now() - started, error: String(error) });
            throw error;
          }
        },
      };
      const started = performance.now();
      try {
        const result = await Effect.runPromise(build(client, scope).execute(query));
        put({ event: "logical-end", label, ms: performance.now() - started, result });
        if (variant !== "unscoped")
          expect(result.results.map((r: any) => r["?ancestor"]).sort()).toEqual([
            "c8:b",
            "c8:c",
            "c8:d",
          ]);
      } catch (error) {
        put({
          event: "logical-error",
          label,
          ms: performance.now() - started,
          error: String(error),
        });
      }
    }
  await raw.close();
});
