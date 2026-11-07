import { writeFile } from "node:fs/promises";
import { makeXtdbClient } from "../../src/XtdbClient.js";
import { compileXtdb } from "../../src/query/compiler.js";

const client = makeXtdbClient(process.env.XTDB_URL ?? "postgres://xtdb:xtdb@127.0.0.1:5442/xtdb");
try {
  const sources = await client.query<{ scope_key: string }>(
    "SELECT DISTINCT scope_key FROM tx_assertions WHERE attribute = ':conf/dedupe' LIMIT 1",
  );
  const compiled = compileXtdb(
    {
      find: ["?value", "?count"],
      where: [["?entity", ":conf/dedupe", "?value"]],
      aggregate: [["count", "?entity", "?count"]],
    },
    sources[0]!.scope_key,
  );
  const variants = [
    {
      name: "disjunction-instead-of-IN",
      sql: compiled.sql.replace(
        /([A-Za-z_][A-Za-z_0-9]*\.value_type) IN \((('[^']+'(?:, )?)+)\)/g,
        (_match, column: string, values: string) =>
          `(${values
            .split(", ")
            .map((value) => `${column} = ${value}`)
            .join(" OR ")})`,
      ),
    },
    {
      name: "group-projection-aliases",
      sql: compiled.sql.replace(
        /GROUP BY[^\n]+/,
        `GROUP BY ${[...compiled.valueColumnMap.values()].flatMap((columns) => Object.values(columns).map((column) => `"${column}"`)).join(", ")}`,
      ),
    },
  ];
  const observations = await Promise.all(
    variants.map(async ({ name, sql }) => {
      try {
        const rows = await client.query(sql, compiled.params);
        return { name, passed: true, rows, sql };
      } catch (error) {
        return { name, passed: false, error: String(error), sql };
      }
    }),
  );
  const path = new URL(`./group-evidence-${Date.now()}.json`, import.meta.url);
  await writeFile(
    path,
    JSON.stringify({ kind: "parallel-correctness-feasibility", observations }, null, 2) + "\n",
  );
  console.log(JSON.stringify({ evidence: path.pathname, observations }));
} finally {
  await client.close();
}
